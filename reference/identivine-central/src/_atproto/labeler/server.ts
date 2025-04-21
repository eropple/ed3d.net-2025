import { XRPCError } from "@atcute/client";
import {
  type At,
  type ComAtprotoLabelQueryLabels,
} from "@atcute/client/lexicons";
import { type ComAtprotoLabelDefs } from "@atproto/api";
import { type TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { fastifyWebsocket } from "@fastify/websocket";
import { AJV } from "@myapp/shared-universal/utils/ajv.js";
import { sha512_256 } from "@myapp/shared-universal/utils/cryptography.js";
import {
  type FetchFn,
  loggedFetch,
} from "@myapp/shared-universal/utils/fetch.js";
import {
  buildStandardLogger,
  loggerWithLevel,
} from "@myapp/shared-universal/utils/logging.js";
import { buildRequestIdGenerator } from "@myapp/shared-universal/utils/request-id-builder.js";
import { Type } from "@sinclair/typebox";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  default as Fastify,
  type FastifyBaseLogger,
  type FastifyInstance,
  type FastifyRequest,
} from "fastify";
import _ from "lodash";
import { type Logger } from "pino";

import { type HttpConfig } from "../../_api/config/http-types.js";
import { type DBLabel } from "../../_db/models.js";
import { LABELS, OUTBOUND_LABELS } from "../../_db/schema/labeler.js";
import { buildDbPoolFromConfig } from "../../lib/datastores/postgres/builder.server.js";
import { buildDrizzleLogger } from "../../lib/datastores/postgres/query-logger.server.js";
import {
  gt,
  ilike,
  inArray,
  max,
  type Drizzle,
  type DrizzleRO,
} from "../../lib/datastores/postgres/types.server.js";

import {
  type LabelerAppConfig,
  type AtprotoLabelerConfig,
} from "./config/types.js";
import { buildLabels, type LabelKind } from "./labels.js";
import { parsePrivateKey, verifyJwt } from "./utils/atproto-crypto.js";
import { frameToBytes } from "./utils/bytes.js";
import { dbLabelRowToOutputRow } from "./utils/db-rows.js";
import {
  type QueryHandler,
  type SubscriptionHandler,
} from "./utils/handlers.js";
import {
  CreateLabelData,
  formatLabel,
  labelIsSigned,
  type SignedLabel,
  signLabel,
  type UnsignedLabel,
} from "./utils/label-formatting.js";

const REPLAY_LIMIT = 50;

/**
 * This is a class largely in case we ever want to wrap this up for the
 * dependency injector used by the rest of the system, but for now it's
 * isolated due to throughput concerns.
 *
 * Originates in part from @skywatch/labeler.
 */
export class LabelerServer {
  readonly logger: Logger;

  private readonly labels: Record<
    LabelKind,
    ComAtprotoLabelDefs.LabelValueDefinition
  >;

  readonly signingKey: Uint8Array;

  /**
   * the config's PSK, hashed twice
   */
  readonly preSharedKeyDoubleHash: string;

  readonly connections = new Map<string, Set<WebSocket>>();

  private labelPollerInterval: NodeJS.Timeout | undefined;

  hasStarted = false;

  constructor(
    logger: Logger,
    private readonly httpConfig: HttpConfig,
    private readonly atprotoLabelerConfig: AtprotoLabelerConfig,
    private readonly db: Drizzle,
    private readonly dbRO: DrizzleRO,
    private readonly fastify: FastifyInstance,
    private readonly fetch: FetchFn,
  ) {
    this.logger = logger.child({ component: this.constructor.name });
    this.db = db;
    this.dbRO = dbRO;
    this.fastify = fastify;
    this.fetch = fetch;

    this.labels = buildLabels(atprotoLabelerConfig);

    this.preSharedKeyDoubleHash = sha512_256(
      sha512_256(this.atprotoLabelerConfig.preSharedKey),
    );

    this.signingKey = parsePrivateKey(atprotoLabelerConfig.signingKey);
    if (this.signingKey.byteLength !== 32) {
      throw new Error("signing key must be 32 bytes after parsing");
    }
  }

  async start() {
    if (this.hasStarted) {
      throw new Error("Server already started; not re-entrant.");
    }

    this.hasStarted = true;
    this.labelPollerInterval = setInterval(
      this.pollLabelTable.bind(this),
      1000,
    );

    await this.fastify.register(fastifyWebsocket);

    await this.fastify.register(async (fastify) => {
      fastify.get(
        "/xrpc/com.atproto.label.queryLabels",
        this.queryLabelsHandler,
      );
      // fastify.post(
      //   "/xrpc/tools.ozone.moderation.emitEvent",
      //   this.emitEventHandler,
      // );
      fastify.get(
        "/xrpc/com.atproto.label.subscribeLabels",
        { websocket: true },
        this.subscribeLabelsHandler,
      );
      fastify.get("/xrpc/_health", this.healthHandler);
      fastify.get("/xrpc/*", this.unknownMethodHandler);
      fastify.get("/hello", () => ({ hello: "world" }));
      fastify.post<{
        Headers: {
          "X-Labeler-PSK": string;
        };
        Body: {
          labels: Array<CreateLabelData>;
        };
      }>(
        "/create-labels",
        {
          schema: {
            headers: Type.Object({
              "X-Labeler-PSK": Type.String(),
            }),
            body: Type.Object({
              labels: Type.Array(CreateLabelData),
            }),
          },
        },
        async (req, res) => {
          const rawPsk = req.headers["x-labeler-psk"];
          if (!rawPsk) {
            res.status(401);
            return { error: "missing PSK" };
          }

          const psk = sha512_256(sha512_256(rawPsk));
          if (psk !== this.preSharedKeyDoubleHash) {
            res.status(401);
            return { error: "invalid PSK" };
          }

          const ret = await this.saveLabel(
            req.body.labels as Array<UnsignedLabel>,
          );

          return { count: ret.length, maxId: _.maxBy(ret, (l) => l.id) };
        },
      );
      fastify.setErrorHandler(this.errorHandler);
    });

    return this.fastify.listen({
      port: this.httpConfig.port,
      host: "0.0.0.0",
    });
  }

  async stop() {
    if (this.labelPollerInterval) {
      clearInterval(this.labelPollerInterval);
    }
    await this.fastify.close();
  }

  private async pollLabelTable() {
    const logger = this.logger.child({
      fn: this.pollLabelTable.name,
    });

    logger.trace("Beginning to poll label table.");

    while (true) {
      await this.db.transaction(async (tx) => {
        logger.trace("Entered transaction; querying for outbound labels.");
        const queuedLabels = await tx
          .select()
          .from(OUTBOUND_LABELS)
          .for("update", { skipLocked: true })
          .limit(20);
        if (queuedLabels.length === 0) {
          logger.trace("Queue empty, exiting");
          return;
        }

        logger.info(
          { queuedLabelsCount: queuedLabels.length },
          "Found queued labels",
        );

        // TODO: create labels and enqueue

        const now = new Date();
        const creatableLabels: Array<CreateLabelData> = queuedLabels
          .map((ql) => {
            const labelDefinition = this.labels[ql.kind];
            if (!labelDefinition) {
              logger.warn(
                { kind: ql.kind },
                "Unknown label kind, skipping (will delete as it's invalid)",
              );
              return null;
            }

            return {
              uri: ql.uri,
              val: labelDefinition.identifier,
              neg: ql.neg,
              cts: now.toISOString(),
              exp: ql.exp?.toISOString() ?? undefined,
            } satisfies CreateLabelData;
          })
          .filter((i) => i !== null);

        const createdLabels = await this.createLabel(creatableLabels, tx);
        if (createdLabels.length !== creatableLabels.length) {
          logger.warn(
            {
              createdLabelCount: createdLabels.length,
              creatableLabelCount: creatableLabels.length,
            },
            "Created fewer labels than expected",
          );
        }

        const deleted = await tx.delete(OUTBOUND_LABELS).where(
          inArray(
            OUTBOUND_LABELS.id,
            queuedLabels.map((l) => l.id),
          ),
        );

        if (deleted.rowCount !== queuedLabels.length) {
          logger.warn(
            {
              deletedCount: deleted.rowCount,
              queuedLabelsCount: queuedLabels.length,
            },
            "Deleted fewer labels than expected",
          );
        }
      });
    }
  }

  /**
   * Insert a label into the database, emitting it to subscribers.
   * @param label The label to insert.
   * @returns The inserted label.
   */
  private async saveLabel(
    labels: Array<UnsignedLabel>,
    executor?: Drizzle,
  ): Promise<Array<DBLabel>> {
    executor = executor ?? this.db;
    const signedLabels: Array<SignedLabel> = labels.map((label) => {
      if (labelIsSigned(label)) {
        return label;
      }
      return signLabel(label, this.signingKey);
    });

    const inserted = await executor
      .insert(LABELS)
      .values(
        signedLabels.map((label) => ({
          src: label.src,
          uri: label.uri,
          cid: label.cid,
          val: label.val,
          neg: label.neg,
          cts: new Date(label.cts),
          exp: label.exp ? new Date(label.exp) : null,
          // had a real weird issue with this as base64
          sig: Buffer.from(label.sig).toString("base64"),
        })),
      )
      .returning()
      .execute();

    if (!inserted || inserted.length !== signedLabels.length) {
      throw new Error("Failed to insert labels into the database.");
    }

    for (const label of inserted) {
      const [id, signedLabel] = dbLabelRowToOutputRow(label);

      this.emitLabel(id, signedLabel);
    }

    return inserted;
  }

  /**
   * Create and insert a label into the database, emitting it to subscribers.
   * @param input The label to create.
   * @returns The created label.
   */
  async createLabel(
    input: Array<CreateLabelData>,
    executor?: Drizzle,
  ): Promise<Array<DBLabel>> {
    executor = executor ?? this.db;
    const labels = input.map((label) => ({
      ...label,
      src: (label.src ?? this.atprotoLabelerConfig.did) as At.DID,
      cts: label.cts ?? new Date().toISOString(),
    }));

    return await this.saveLabel(labels, executor);
  }

  queryLabelsHandler: QueryHandler<ComAtprotoLabelQueryLabels.Params> = async (
    req,
    res,
  ) => {
    let uriPatterns: Array<string>;
    if (!req.query.uriPatterns) {
      uriPatterns = [];
    } else if (typeof req.query.uriPatterns === "string") {
      uriPatterns = [req.query.uriPatterns];
    } else {
      uriPatterns = req.query.uriPatterns || [];
    }

    let sources: Array<string>;
    if (!req.query.sources) {
      sources = [];
    } else if (typeof req.query.sources === "string") {
      sources = [req.query.sources];
    } else {
      sources = req.query.sources || [];
    }

    const cursor = parseInt(`${req.query.cursor || 0}`, 10);
    if (cursor !== undefined && Number.isNaN(cursor)) {
      throw new XRPCError(400, {
        kind: "InvalidRequest",
        description: "Cursor must be an integer",
      });
    }

    const limit = parseInt(`${req.query.limit || 50}`, 10);
    if (Number.isNaN(limit) || limit < 1 || limit > 250) {
      throw new XRPCError(400, {
        kind: "InvalidRequest",
        description: "Limit must be an integer between 1 and 250",
      });
    }

    const patterns = uriPatterns.includes("*")
      ? []
      : uriPatterns.map((pattern) => {
          pattern = pattern.replaceAll(/%/g, "").replaceAll(/_/g, "\\_");

          const starIndex = pattern.indexOf("*");
          if (starIndex === -1) return pattern;

          if (starIndex !== pattern.length - 1) {
            throw new XRPCError(400, {
              kind: "InvalidRequest",
              description:
                "Only trailing wildcards are supported in uriPatterns",
            });
          }
          return pattern.slice(0, -1) + "%";
        });

    let sql = this.dbRO.select().from(LABELS).$dynamic();

    if (cursor) {
      sql = sql.where(gt(LABELS.id, cursor));
    }

    for (const pattern of patterns) {
      sql = sql.where(ilike(LABELS.uri, pattern));
    }

    if (sources.length > 0) {
      sql = sql.where(inArray(LABELS.src, sources));
    }

    const labelsWithIds = (await sql.limit(limit).execute()).map(
      dbLabelRowToOutputRow,
    );

    if (labelsWithIds.length === 0) {
      await res.send({
        cursor: "0",
        labels: [],
      } satisfies ComAtprotoLabelQueryLabels.Output);
      return;
    }

    const nextCursor = (
      _.maxBy(labelsWithIds, (label) => label[0])?.[0] ?? 0
    ).toString(10);

    await res.send({
      cursor: nextCursor,
      labels: labelsWithIds.map(([id, label]) =>
        formatLabel(this.logger, label),
      ),
    } satisfies ComAtprotoLabelQueryLabels.Output);
  };

  /**
   * Handler for [com.atproto.label.subscribeLabels](https://github.com/bluesky-social/atproto/blob/main/lexicons/com/atproto/label/subscribeLabels.json).
   */
  subscribeLabelsHandler: SubscriptionHandler<{ cursor?: string }> = async (
    ws,
    req,
  ) => {
    const logger = req.log.child({ fn: this.subscribeLabelsHandler.name });
    const cursor = parseInt(req.query.cursor ?? "0", 10);

    if (Number.isNaN(cursor)) {
      throw new XRPCError(400, {
        kind: "InvalidRequest",
        description: "Cursor must be an integer",
      });
    }

    logger.info({ cursor }, "New connection, subscribing to labels.");

    ws.on("close", () => {
      this.removeSubscription("com.atproto.label.subscribeLabels", ws);
    });

    this.addSubscription("com.atproto.label.subscribeLabels", ws);

    const latestRow = await this.dbRO
      .select({
        value: max(LABELS.id),
      })
      .from(LABELS)
      .execute();

    const latest = latestRow[0]?.value ?? 0;

    if (cursor > latest) {
      const errorBytes = frameToBytes("error", {
        error: "FutureCursor",
        message: "Cursor is in the future",
      });
      ws.send(errorBytes);
      ws.terminate();
    }

    req.log.info(
      { startCursor: cursor, latest },
      "Starting replay to subscriber.",
    );

    try {
      let playbackCursor = cursor - 1;
      while (true) {
        const result = await this.dbRO
          .select()
          .from(LABELS)
          .where(gt(LABELS.id, playbackCursor))
          .limit(REPLAY_LIMIT)
          .execute();

        if (result.length === 0) {
          break;
        }

        const labelsWithIds = result.map(dbLabelRowToOutputRow);

        for (const [id, label] of labelsWithIds) {
          logger.info({ id }, "Emitting label to subscriber.");

          this.emitLabel(Number(id), label, [ws]);
        }

        const r = result[result.length - 1]?.id;
        if (!r) {
          break;
        }

        playbackCursor = r;
      }
    } catch (err) {
      req.log.warn({ err }, "Error while streaming labels to new subscriber.");
      const errorBytes = frameToBytes("error", {
        error: "InternalServerError",
        message: "An unknown error occurred",
      });
      ws.send(errorBytes);
      ws.terminate();
    }
  };

  /**
   * Handler for the health check endpoint.
   */
  healthHandler: QueryHandler = async (_req, res) => {
    const VERSION = "0.0.69";
    try {
      return res.send({ version: VERSION });
    } catch (e) {
      return res
        .status(503)
        .send({ version: VERSION, error: "Service Unavailable" });
    }
  };

  /**
   * Catch-all handler for unknown XRPC methods.
   */
  unknownMethodHandler: QueryHandler = async (_req, res) =>
    res.status(501).send({
      error: "MethodNotImplemented",
      message: "Method Not Implemented",
    });

  /**
   * Default error handler.
   */
  errorHandler: FastifyInstance["errorHandler"] = async (err, req, res) => {
    if (err instanceof XRPCError) {
      return res
        .status(err.status)
        .send({ error: err.kind, message: err.description });
    } else {
      req.log.error({ err }, "Unhandled error.");
      return res.status(500).send({
        error: "InternalServerError",
        message: "An unknown error occurred",
      });
    }
  };

  private async parseAuthHeaderDid(req: FastifyRequest): Promise<string> {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new XRPCError(401, {
        kind: "AuthRequired",
        description: "Authorization header is required",
      });
    }

    const [type, token] = authHeader.split(" ");
    if (type !== "Bearer" || !token) {
      throw new XRPCError(400, {
        kind: "MissingJwt",
        description: "Missing or invalid bearer token",
      });
    }

    const nsid =
      (req.originalUrl ?? req.url ?? "")
        .split("?")[0]
        ?.replace("/xrpc/", "")
        ?.replace(/\/$/, "") ?? null;

    const payload = await verifyJwt(
      this.logger,
      this.fetch,
      token,
      this.atprotoLabelerConfig.did,
      nsid,
    );

    return payload.iss;
  }

  static async create(config: LabelerAppConfig) {
    const rootLogger = buildStandardLogger("labeler", config.logLevel, {
      useStdout: false,
      prettyPrint: config.prettyLogs,
    });

    const idGenerator = buildRequestIdGenerator("LBL");
    const fastify = Fastify({
      exposeHeadRoutes: false,
      logger: rootLogger.child({
        context: "fastify",
      }) as FastifyBaseLogger,
      ajv: {},
      genReqId: (req) =>
        idGenerator([req.headers["x-correlation-id"]].flat()[0]),
    }).withTypeProvider<TypeBoxTypeProvider>();
    // this is necessary because typebox adds some custom keywords to the schema
    fastify.setValidatorCompiler(({ schema }) => AJV.compile(schema));

    const fetchLogger = rootLogger.child({ component: "fetch" });
    fetchLogger.level = "debug";

    const wrappedFetch = loggedFetch(
      fetchLogger,
      // eslint-disable-next-line no-restricted-globals
      fetch,
    );

    const dbPool = buildDbPoolFromConfig(
      "labeler",
      rootLogger,
      config.postgres.readwrite,
    );
    const dbROPool = buildDbPoolFromConfig(
      "labeler_ro",
      rootLogger,
      config.postgres.readonly,
    );

    const db = drizzle(dbPool, {
      logger: buildDrizzleLogger(
        loggerWithLevel(rootLogger, config.postgres.readwrite.logLevel, {
          component: "drizzle",
        }),
      ),
      casing: "snake_case",
    });
    const dbRO = drizzle(dbROPool, {
      logger: buildDrizzleLogger(
        loggerWithLevel(rootLogger, config.postgres.readwrite.logLevel, {
          component: "drizzle-ro",
        }),
      ),
      casing: "snake_case",
    });

    return new LabelerServer(
      rootLogger,
      config.http,
      config.atprotoLabeler,
      db,
      dbRO,
      fastify,
      wrappedFetch,
    );
  }

  /**
   * Emit a label to specific subscribers, or to all subscribers.
   * @param seq The label's id.
   * @param label The label to emit.
   * @param connections An optional list of WebSocket connections to emit to.
   */
  private emitLabel(
    seq: number,
    label: SignedLabel,
    connections?: Iterable<WebSocket>,
  ) {
    const bytes = frameToBytes(
      "message",
      { seq, labels: [formatLabel(this.logger, label)] },
      "#labels",
    );

    connections =
      connections ??
      this.connections.get("com.atproto.label.subscribeLabels") ??
      [];

    for (const ws of connections) {
      ws.send(bytes);
    }
  }

  /**
   * Add a WebSocket connection to the list of subscribers for a given lexicon.
   * @param nsid The NSID of the lexicon to subscribe to.
   * @param ws The WebSocket connection to add.
   */
  private addSubscription(nsid: string, ws: WebSocket) {
    this.logger.info({ nsid }, "Subscriber added.");
    const subs = this.connections.get(nsid) ?? new Set();
    subs.add(ws);
    this.connections.set(nsid, subs);
  }

  /**
   * Remove a WebSocket connection from the list of subscribers for a given lexicon.
   * @param nsid The NSID of the lexicon to unsubscribe from.
   * @param ws The WebSocket connection to remove.
   */
  private removeSubscription(nsid: string, ws: WebSocket) {
    this.logger.info({ nsid }, "Subscriber removed.");
    const subs = this.connections.get(nsid);
    if (subs) {
      subs.delete(ws);
      if (!subs.size) this.connections.delete(nsid);
    }
  }
}

// !!! we aren't implementing this until we absolutely have to
// /**
//  * Handler for [tools.ozone.moderation.emitEvent](https://github.com/bluesky-social/atproto/blob/main/lexicons/tools/ozone/moderation/emitEvent.json).
//  */
// emitEventHandler: ProcedureHandler<ToolsOzoneModerationEmitEvent.Input> =
//   async (req, res) => {
//     const actorDid = await this.parseAuthHeaderDid(req);
//     const authed = await this.auth(actorDid);
//     if (!authed) {
//       throw new XRPCError(401, {
//         kind: "AuthRequired",
//         description: "Unauthorized",
//       });
//     }

//     const { event, subject, subjectBlobCids = [], createdBy } = req.body;
//     if (!event || !subject || !createdBy) {
//       throw new XRPCError(400, {
//         kind: "InvalidRequest",
//         description: "Missing required field(s)",
//       });
//     }

//     if (event.$type !== "tools.ozone.moderation.defs#modEventLabel") {
//       throw new XRPCError(400, {
//         kind: "InvalidRequest",
//         description: "Unsupported event type",
//       });
//     }

//     if (!event.createLabelVals?.length && !event.negateLabelVals?.length) {
//       throw new XRPCError(400, {
//         kind: "InvalidRequest",
//         description: "Must provide at least one label value",
//       });
//     }

//     const uri =
//       subject.$type === "com.atproto.admin.defs#repoRef"
//         ? subject.did
//         : subject.$type === "com.atproto.repo.strongRef"
//           ? subject.uri
//           : null;
//     const cid =
//       subject.$type === "com.atproto.repo.strongRef"
//         ? subject.cid
//         : undefined;

//     if (!uri) {
//       throw new XRPCError(400, {
//         kind: "InvalidRequest",
//         description: "Invalid subject",
//       });
//     }

//     const labels = await this.createLabels(
//       { uri, cid },
//       {
//         create: event.createLabelVals,
//         negate: event.negateLabelVals,
//       },
//     );

//     if (!labels.length || !labels[0]?.id) {
//       throw new Error(
//         `No labels were created\nEvent:\n${JSON.stringify(event, null, 2)}`,
//       );
//     }

//     await res.send({
//       id: labels[0].id,
//       event,
//       subject,
//       subjectBlobCids,
//       createdBy,
//       createdAt: new Date().toISOString(),
//     } satisfies ToolsOzoneModerationEmitEvent.Output);
//   };
