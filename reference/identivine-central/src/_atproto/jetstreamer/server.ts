import { type AppBskyFeedPost } from "@atproto/api";
import {
  type CommitCreateEvent,
  type CommitUpdateEvent,
  Jetstream,
} from "@skyware/jetstream";
import { type Logger } from "pino";
import sleep from "sleep-promise";

import { JETSTREAM_CURSOR_SINGLE } from "../../_db/schema/jetstreamer.js";
import { type Drizzle } from "../../lib/datastores/postgres/types.server.js";

import { type JetstreamerConfig } from "./config/types.js";

export class JetstreamerServer {
  private readonly logger: Logger;

  private hasStarted: boolean = false;

  private jetstream: Jetstream | undefined;

  private cursorCommitInterval: NodeJS.Timeout | undefined;

  private workingSet: Set<string> = new Set();

  constructor(
    logger: Logger,
    private readonly jetstreamerConfig: JetstreamerConfig,
    private readonly db: Drizzle,
  ) {
    this.logger = logger.child({
      component: this.constructor.name,
    });

    this.logger.info("Jetstreamer server constructed.");
  }

  async start() {
    const logger = this.logger.child({ fn: this.start.name });
    if (this.hasStarted) {
      throw new Error("Already started; not re-entrant");
    }

    this.hasStarted = true;

    logger.info("Jetstreamer server starting.");

    const lastCursor = await this.getCursor();

    this.jetstream = new Jetstream({
      wantedCollections: this.jetstreamerConfig.collections,
      cursor: lastCursor === -1 ? undefined : lastCursor,
    });

    this.cursorCommitInterval = setInterval(
      this.commitCursor.bind(this),
      this.jetstreamerConfig.cursorCommitFrequencyMs,
    );
    logger.debug("Initialized cursor commit setInterval.");

    if (this.jetstreamerConfig.collections.includes("app.bsky.feed.post")) {
      logger.info("Subscribing to app.bsky.feed.post events.");
      this.jetstream.onCreate(
        "app.bsky.feed.post",
        this.onCreatePost.bind(this),
      );
      this.jetstream.onUpdate(
        "app.bsky.feed.post",
        this.onUpdatePost.bind(this),
      );
    }

    if (this.jetstreamerConfig.collections.includes("app.bsky.actor.profile")) {
      logger.info("Subscribing to app.bsky.actor.profile events.");

      // we don't need onCreate for profiles because those profiles
      // don't have anything yet. they'll just be empty and nothing for
      // us to react to.
      this.jetstream.onUpdate(
        "app.bsky.actor.profile",
        this.onUpdateProfile.bind(this),
      );
    }

    this.jetstream.start();
  }

  async stop() {
    const logger = this.logger.child({ phase: "shutdown" });

    this.jetstream?.close();
    if (this.cursorCommitInterval) {
      clearInterval(this.cursorCommitInterval);

      logger.info(
        "Cleared cursor commit interval. Performing last cursor save.",
      );
      await this.commitCursor();
    }

    let waitTime = 0;
    while (
      this.workingSet.size > 0 &&
      waitTime < this.jetstreamerConfig.shutdownWaitMs
    ) {
      this.logger.info(
        {
          workingSetSize: this.workingSet.size,
          waitTimeMs: waitTime,
        },
        "Waiting for working set to empty.",
      );
      await sleep(100);
      waitTime += 100;
    }

    logger.info(
      { workingSetSize: this.workingSet.size },
      "Jetstreamer server stopped.",
    );
  }

  private async getCursor(): Promise<number> {
    try {
      const [row] = await this.db
        .select()
        .from(JETSTREAM_CURSOR_SINGLE)
        .limit(1);

      if (!row) {
        await this.db.insert(JETSTREAM_CURSOR_SINGLE).values({
          value: -1,
        });
      }

      const cursor = row?.value ?? 0;
      this.logger.info({ cursor }, "Resuming at cursor from datastore.");

      return cursor;
    } catch (err) {
      this.logger.error(
        { err },
        "Error getting cursor from datastore. Defaulting to 'start now'.",
      );
      return -1;
    }
  }

  private async commitCursor() {
    const cursor = this.jetstream?.cursor;

    if (!cursor) {
      this.logger.warn(
        { cursor },
        "No cursor to commit. Skipping cursor commit.",
      );
      return;
    }

    this.logger.debug(
      { fn: this.commitCursor.name, cursor },
      "Updating cursor in datastore.",
    );

    await this.db.update(JETSTREAM_CURSOR_SINGLE).set({ value: cursor });
  }

  private async onCreatePost(event: CommitCreateEvent<"app.bsky.feed.post">) {
    const logger = this.logger.child({
      fn: this.onCreatePost.name,
    });

    const setKey = [event.did, event.commit.rkey, event.commit.operation].join(
      "_",
    );
    this.workingSet.add(setKey);

    try {
      logger.trace({ event }, "Post created.");
    } catch (err) {
      logger.error({ err, event }, "Error processing post.");
    } finally {
      this.workingSet.delete(setKey);
    }
  }

  private async onUpdatePost(event: CommitUpdateEvent<"app.bsky.feed.post">) {
    // right now, bsky doesn't let you update posts, but we're going to implement
    // this as if it did so that if they ever add it, we're covered.
    const logger = this.logger.child({
      fn: this.onUpdatePost.name,
    });
    const setKey = [event.did, event.commit.rkey, event.commit.operation].join(
      "_",
    );
    this.workingSet.add(setKey);

    try {
      logger.trace({ event }, "Post updated.");
    } catch (err) {
      logger.error({ err, event }, "Error processing post.");
    } finally {
      this.workingSet.delete(setKey);
    }
  }

  private async onUpdateProfile(
    event: CommitUpdateEvent<"app.bsky.actor.profile">,
  ) {
    const logger = this.logger.child({
      fn: this.onUpdateProfile.name,
    });
    const setKey = [event.did, event.commit.rkey, event.commit.operation].join(
      "_",
    );
    this.workingSet.add(setKey);

    try {
      logger.trace({ event }, "Profile updated.");
    } catch (err) {
      logger.error({ err, event }, "Error processing profile.");
    } finally {
      this.workingSet.delete(setKey);
    }
  }
}
