import { Agent } from "@atproto/api";
import { type ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs.js";
import {
  type OAuthSession,
  type NodeOAuthClient,
} from "@atproto/oauth-client-node";
import {
  InternalServerError,
  ResourceNotFoundError,
} from "@myapp/shared-universal/errors/index.js";
import * as Paseto from "paseto";
import { type Logger } from "pino";
import { type DeepReadonly } from "utility-types";

import { type RedirectResponse } from "../../_api/http/schemas.js";
import { type ATProtoAuthorizationResponse } from "../../_api/routes/atproto/schemas.js";
import { type LabelKind } from "../../_atproto/labeler/labels.js";
import { type UrlsConfig } from "../../_config/types.js";
import { type DBSiteATProtoIdentity } from "../../_db/models.js";
import {
  SITE_ATPROTO_IDENTITIES,
  SITE_DOMAINS,
  SITES,
} from "../../_db/schema/index.js";
import {
  LABEL_KIND_VALUES,
  OUTBOUND_LABELS,
} from "../../_db/schema/labeler.js";
import {
  type DrizzleRO,
  type Drizzle,
  and,
  eq,
  inArray,
} from "../../lib/datastores/postgres/types.server.js";
import { type VaultService } from "../vault/service.js";

import { ATPROTO_CLIENT_SCOPES } from "./client-factory.js";
import { type ATProtoIdentityConfig } from "./config.js";
import {
  type ATProtoOAuthClientPublicJWKS,
  type ATProtoOAuthClientMetadata,
} from "./types.js";

export class ATProtoIdentityService {
  private readonly logger: Logger;

  constructor(
    logger: Logger,
    private readonly oauthClient: Promise<NodeOAuthClient>,
    private readonly atprotoIdentityConfig: DeepReadonly<ATProtoIdentityConfig>,
    private readonly urlsConfig: DeepReadonly<UrlsConfig>,
    private readonly vault: VaultService,
    private readonly db: Drizzle,
    private readonly dbRO: DrizzleRO,
  ) {
    this.logger = logger.child({ context: this.constructor.name });
  }

  async getClientMetadata(): Promise<ATProtoOAuthClientMetadata> {
    const client = await this.oauthClient;
    return client.clientMetadata;
  }

  async getClientJWKS(): Promise<ATProtoOAuthClientPublicJWKS> {
    const client = await this.oauthClient;
    return client.jwks;
  }

  async getAuthorizationUrl(
    site: { siteId: string },
    handle: string,
  ): Promise<ATProtoAuthorizationResponse> {
    const logger = this.logger.child({
      fn: this.getAuthorizationUrl.name,
      siteId: site.siteId,
      handle,
    });
    logger.info("Generating ATProto authorization URL");

    const state = await Paseto.V3.encrypt(
      { siteId: site.siteId, handle },
      this.atprotoIdentityConfig.stateKeyPair.key,
      { expiresIn: "15m" },
    );

    const client = await this.oauthClient;
    try {
      const url = await client.authorize(handle, {
        state,
        scope: ATPROTO_CLIENT_SCOPES.join(" "),
      });

      return { authUrl: url.toString() };
    } catch (err) {
      logger.error({ err }, "error in generating authorization URL.");
      throw new InternalServerError("Error generating authorization URL");
    }
  }

  async handleCallbackFromRequest(
    params: URLSearchParams,
  ): Promise<RedirectResponse> {
    const logger = this.logger.child({
      fn: this.handleCallbackFromRequest.name,
    });
    logger.info("Handling ATProto callback");

    const client = await this.oauthClient;

    let session: OAuthSession;
    let state: string | null;

    try {
      const callbackResponse = await client.callback(params);
      session = callbackResponse.session;
      state = callbackResponse.state;
    } catch (err) {
      logger.error({ err }, "error in handling authorization callback.");
      throw new InternalServerError("Error handling authorization callback");
    }

    if (!state) {
      throw new InternalServerError(
        "No state parameter returned from callback",
      );
    }

    const stateData = (await Paseto.V3.decrypt(
      state,
      this.atprotoIdentityConfig.stateKeyPair.key,
    )) as { siteId: string; handle: string };

    logger.info(
      {
        siteId: stateData.siteId,
        handle: stateData.handle,
        sessionDid: session.did,
      },
      "Validated ATProto state token; session is live.",
    );

    const profile = await this.getProfile(session);
    await this.upsertProfile(stateData.siteId, profile);

    return {
      redirect: `${this.urlsConfig.panelBaseUrl}/panel/sites/${stateData.siteId}/bluesky?result=success`,
    };
  }

  async getIdentityFromId(
    atprotoIdentityId: string,
  ): Promise<DBSiteATProtoIdentity | null> {
    const [identity] = await this.db
      .select()
      .from(SITE_ATPROTO_IDENTITIES)
      .where(eq(SITE_ATPROTO_IDENTITIES.atprotoIdentityId, atprotoIdentityId))
      .limit(1);

    if (!identity) {
      return null;
    }

    return identity;
  }

  async getIdentityFromDid(did: string): Promise<DBSiteATProtoIdentity | null> {
    const [identity] = await this.db
      .select()
      .from(SITE_ATPROTO_IDENTITIES)
      .where(eq(SITE_ATPROTO_IDENTITIES.did, did))
      .limit(1);

    if (!identity) {
      return null;
    }

    return identity;
  }

  async listIdentities(siteId: string): Promise<DBSiteATProtoIdentity[]> {
    const logger = this.logger.child({
      fn: this.listIdentities.name,
      siteId,
    });

    const results = await this.dbRO
      .select()
      .from(SITE_ATPROTO_IDENTITIES)
      .where(eq(SITE_ATPROTO_IDENTITIES.siteId, siteId));

    logger.debug({ count: results.length }, "Retrieved ATProto identities");
    return results;
  }

  async deleteIdentity(siteId: string, identityId: string): Promise<void> {
    const logger = this.logger.child({
      fn: this.deleteIdentity.name,
      siteId,
      identityId,
    });

    await this.db.transaction(async (tx) => {
      const identity = await this.getIdentityFromId(identityId);
      if (!identity) {
        throw new ResourceNotFoundError(
          "atprotoIdentity",
          "atprotoIdentityId",
          identityId,
        );
      }

      await this.db
        .delete(SITE_ATPROTO_IDENTITIES)
        .where(
          and(
            eq(SITE_ATPROTO_IDENTITIES.siteId, siteId),
            eq(SITE_ATPROTO_IDENTITIES.atprotoIdentityId, identityId),
          ),
        )
        .execute();

      await this.db
        .insert(OUTBOUND_LABELS)
        .values(
          (["connected", "linked", "irl"] as const).map((kind) => ({
            kind,
            uri: identity.did,
            neg: true,
          })),
        )
        .execute();
    });

    logger.info("Deleted ATProto identity and cleared non-fishy labels.");
  }

  async updateIdentityDisplay(
    siteId: string,
    identityId: string,
    displayOnSite: boolean,
  ): Promise<DBSiteATProtoIdentity> {
    const logger = this.logger.child({
      fn: this.updateIdentityDisplay.name,
      siteId,
      identityId,
    });

    logger.info({ displayOnSite }, "Updating identity display setting");

    const [identity] = await this.db
      .update(SITE_ATPROTO_IDENTITIES)
      .set({ displayOnSite })
      .where(
        and(
          eq(SITE_ATPROTO_IDENTITIES.siteId, siteId),
          eq(SITE_ATPROTO_IDENTITIES.atprotoIdentityId, identityId),
        ),
      )
      .returning();

    if (!identity) {
      throw new ResourceNotFoundError(
        "identity",
        "atprotoIdentityId",
        identityId,
      );
    }

    logger.info({ displayOnSite }, "Updated identity display setting");
    return identity;
  }

  private async upsertProfile(
    siteId: string,
    profile: ProfileViewDetailed,
  ): Promise<DBSiteATProtoIdentity> {
    const logger = this.logger.child({
      fn: this.upsertProfile.name,
      siteId,
      did: profile.did,
    });

    const identity = (
      await this.db
        .insert(SITE_ATPROTO_IDENTITIES)
        .values({
          siteId,
          did: profile.did,
          handle: profile.handle,
          profileData: await this.vault.encrypt(profile),
          status: "verified",
          statusLastCheckedAt: new Date(),
          order: -1000,
        })
        .onConflictDoUpdate({
          target: SITE_ATPROTO_IDENTITIES.siteId,
          set: {
            handle: profile.handle,
            profileData: await this.vault.encrypt(profile),
            status: "verified",
            statusLastCheckedAt: new Date(),
          },
        })
        .returning()
    )[0];

    if (!identity) {
      throw new Error("Failed to upsert ATProto identity");
    }

    logger.info({ handle: profile.handle }, "Upserted ATProto identity");
    return identity;
  }

  async verifyIdentity(
    atprotoIdentityId: string,
    skipLabeling: boolean = false,
  ): Promise<DBSiteATProtoIdentity> {
    const logger = this.logger.child({ fn: this.verifyIdentity.name });

    const ret = await this.db.transaction(async (tx) => {
      const [identityRow] = await tx
        .select({
          identity: SITE_ATPROTO_IDENTITIES,
          site: SITES,
        })
        .from(SITE_ATPROTO_IDENTITIES)
        .innerJoin(SITES, eq(SITES.siteId, SITE_ATPROTO_IDENTITIES.siteId))
        .where(eq(SITE_ATPROTO_IDENTITIES.atprotoIdentityId, atprotoIdentityId))
        .limit(1);

      if (!identityRow) {
        throw new ResourceNotFoundError(
          "atproto identity",
          "id",
          atprotoIdentityId,
        );
      }

      const { identity, site } = identityRow;

      logger.info({ did: identity.did }, "Verifying ATProto identity");

      try {
        const client = await this.oauthClient;
        const session = await client.restore(identity.did);
        if (!session) {
          throw new Error("No session found");
        }

        const profile = await this.getProfile(session);

        // Update the identity with current status
        const [updated] = await tx
          .update(SITE_ATPROTO_IDENTITIES)
          .set({
            handle: profile.handle,
            profileData: await this.vault.encrypt(profile),
            status: "verified",
            statusLastCheckedAt: new Date(),
          })
          .where(
            eq(SITE_ATPROTO_IDENTITIES.atprotoIdentityId, atprotoIdentityId),
          )
          .returning();

        if (!updated) {
          throw new InternalServerError("Failed to update identity status");
        }

        const posLabels: LabelKind[] = ["connected"];
        const negLabels: LabelKind[] = [];

        if (profile.description !== null) {
          const checkResult = await this.findLinksInATProtoProfile(
            {
              did: profile.did,
              handle: profile.handle,
              description: profile.description ?? "",
            },
            tx,
          );

          if (checkResult.linked) {
            posLabels.push("linked");
          } else {
            negLabels.push("linked");
          }

          if (checkResult.crossLinked) {
            posLabels.push("fishy");
          } else {
            negLabels.push("fishy");
          }
        }
        // TODO: check for IRL, add "irl"

        // register new labels with proper expiry
        if (!skipLabeling) {
          try {
            if (posLabels.length > 0) {
              logger.info(
                { labelsToAdd: posLabels },
                "Adding positive labels to bsky identity",
              );
              const posLabelsRet = await tx
                .insert(OUTBOUND_LABELS)
                .values(
                  posLabels.map((kind) => ({
                    kind,
                    neg: false,
                    uri: identity.did,
                  })),
                )
                .execute();

              if (posLabelsRet.rowCount !== posLabels.length) {
                throw new Error("Failed to insert positive labels");
              }
            }

            if (negLabels.length > 0) {
              logger.info(
                { negLabels },
                "Adding negative labels to bsky identity",
              );
              const negLabelsRet = await tx
                .insert(OUTBOUND_LABELS)
                .values(
                  negLabels.map((kind) => ({
                    kind,
                    neg: true,
                    uri: identity.did,
                  })),
                )
                .execute();

              if (negLabelsRet.rowCount !== negLabels.length) {
                throw new Error("Failed to insert negative labels");
              }
            }
          } catch (err) {
            logger.error(err, "Failed to insert labels for verified identity.");
            throw err;
          }
        }

        return updated;
      } catch (err) {
        logger.warn({ err }, "Failed to verify ATProto identity");

        const [updated] = await tx
          .update(SITE_ATPROTO_IDENTITIES)
          .set({
            status: "unverified",
            statusLastCheckedAt: new Date(),
          })
          .where(
            eq(SITE_ATPROTO_IDENTITIES.atprotoIdentityId, atprotoIdentityId),
          )
          .returning();

        if (!skipLabeling) {
          // un-label anybody we no longer recognize
          try {
            const negLabels = await tx
              .insert(OUTBOUND_LABELS)
              .values(
                (["connected", "linked", "irl"] as const).map((kind) => ({
                  kind,
                  neg: true,
                  uri: identity.did,
                })),
              )
              .execute();

            if ((negLabels?.rowCount ?? 0) < 3) {
              throw new Error("Failed to insert negative labels");
            }
          } catch (err) {
            logger.error(err, "Failed to insert negative labels");
            throw err;
          }
        }

        if (!updated) {
          throw new InternalServerError("Failed to update identity status");
        }

        return updated;
      }
    });

    return ret;
  }

  async findLinksInATProtoProfile(
    input: { did: string; handle: string; description: string },
    executorRO?: DrizzleRO,
  ): Promise<{ linked: boolean; crossLinked: boolean }> {
    executorRO = executorRO ?? this.dbRO;
    const logger = this.logger.child({
      fn: this.findLinksInATProtoProfile.name,
      did: input.did,
    });
    const { did, description } = input;

    let linked = false;
    let crossLinked = false;

    if (!description.includes("http")) {
      logger.debug("No links found in description; bailing.");
      return { linked, crossLinked };
    }

    const identity = await this.getIdentityFromDid(did);

    const candidates = (description.match(/https?:\/\/[^\s]+/gi) ?? []).map(
      (link) => new URL(link.trim()).hostname,
    );

    const domains = await executorRO
      .select()
      .from(SITE_DOMAINS)
      .where(inArray(SITE_DOMAINS.fqdn, candidates))
      .execute();

    // so by the time we're here, we know:
    // - whether or not the identity is one we have that's connected
    // - whether we recognize the domains
    //
    // therefore:
    // - if the identity is one we recognize AND they are verified AND it's their domain, linked is true.
    // - if the identity is one we recognize AND it's not their domain, crosslinked is true.
    // - if the identity is not one we recognize and we recognize the domain, crosslinked is true.

    for (const domain of domains) {
      if (identity !== null) {
        if (identity.siteId === domain.siteId) {
          logger.info(
            {
              did,
              atprotoIdentityId: identity.atprotoIdentityId,
              fqdn: domain.fqdn,
            },
            "Profile contains their domain; setting linked to true.",
          );
          linked = true;
        } else {
          logger.info(
            {
              did,
              atprotoIdentityId: identity.atprotoIdentityId,
              fqdn: domain.fqdn,
            },
            "Profile contains a domain we recognize but the wrong atproto identity in our system; setting crosslinked to true.",
          );
          crossLinked = true;
        }
      } else {
        logger.info(
          {
            did,
            fqdn: domain.fqdn,
          },
          "Profile contains a domain we recognize but we don't have an identity for; setting crosslinked to true.",
        );
        crossLinked = true;
      }
    }

    return { linked, crossLinked };
  }

  private async getAgent(session: OAuthSession) {
    this.logger.info(
      { fn: this.getAgent.name, sessionDid: session.did },
      "Getting ATProto agent for DID.",
    );

    return new Agent(session);
  }

  private async getProfile(
    session: OAuthSession,
  ): Promise<ProfileViewDetailed> {
    const agent = await this.getAgent(session);

    let profileResponse: Awaited<ReturnType<typeof agent.getProfile>>;
    try {
      profileResponse = await agent.getProfile({
        actor: session.did,
      });
    } catch (err) {
      this.logger.error(
        { fn: this.getProfile.name, err },
        "error getting ATProto profile.",
      );
      throw new InternalServerError("Error getting ATProto profile");
    }

    if (!profileResponse.success) {
      throw new InternalServerError("Error getting ATProto profile");
    }

    return profileResponse.data;
  }
}
