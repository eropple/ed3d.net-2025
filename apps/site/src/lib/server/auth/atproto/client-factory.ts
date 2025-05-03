// src/lib/server/_deps/factories/atproto-oauth-client.ts
import { JoseKey } from "@atproto/jwk-jose";
import { NodeOAuthClient, type NodeSavedSession, type NodeSavedSessionStore, type NodeSavedState, type NodeSavedStateStore, type OAuthClientMetadata, type StateStore } from "@atproto/oauth-client-node";
import { eq } from "drizzle-orm";
import type { Logger } from "pino";

import { SITE_NAME } from "../../../constants.js";
import type { UrlsConfig } from "../../_config/types/index.js";
import type { ATProtoConfig } from "../../auth/atproto/config.js";
import { ATPROTO_SESSIONS, ATPROTO_STATES } from "../../db/schema/index.js";
import type { Drizzle } from "../../db/types.js";
import type { VaultService } from "../../vault/service.js";

export async function createATProtoOAuthClient(
  logger: Logger,
  db: Drizzle,
  vault: VaultService,
  fetch: FetchFn,
  atprotoConfig: ATProtoConfig,
  urlsConfig: UrlsConfig
): Promise<NodeOAuthClient> {
  const clientLogger = logger.child({ component: "ATProtoOAuthClient" });

  // Convert the private JWKS to JoseKey instances
  const keyset = await Promise.all(
    atprotoConfig.privateJwks.keys.map(key => JoseKey.fromJWK(key).catch(err => {
      clientLogger.error({ err, kid: key.kid }, "Error parsing JWK");
      throw err;
    }))
  );

  const frontendBaseUrl = urlsConfig.frontendBaseUrl;
  const clientId = `${frontendBaseUrl}/auth/atproto/client-metadata.json`;
  const redirectUriPrimary = `${frontendBaseUrl}/auth/atproto/callback`;

  // creating this is annoying because atproto's client library is overly
  // tightly typed and wants template strings for URLs.
  // TODO: figure this one out
  const clientMetadata: OAuthClientMetadata = {
    client_id: clientId,
    client_name: SITE_NAME,

    client_uri: frontendBaseUrl as `https://${string}`,
    // logo_uri: `${frontendBaseUrl}/favicon.png` as any,
    tos_uri: `${frontendBaseUrl}/boilerplate/terms-of-service` as `https://${string}`,
    policy_uri: `${frontendBaseUrl}/boilerplate/privacy-policy` as `https://${string}`,
    redirect_uris: [`${frontendBaseUrl}/auth/atproto/callback` as `https://${string}`] ,
    application_type: "web",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "private_key_jwt",
    token_endpoint_auth_signing_alg: "ES256",
    dpop_bound_access_tokens: true,
    scope: "atproto",
    jwks_uri: `${frontendBaseUrl}/auth/atproto/jwks.json` as `https://${string}`,
  } as const;

  // Session and state store handlers
  const sessionStoreLogger = clientLogger.child({ component: "ATProtoOAuthClient.SessionStore" });
  const sessionStore: NodeSavedSessionStore = {
    async get(key: string): Promise<NodeSavedSession | undefined> {
      sessionStoreLogger.debug({ key }, "Getting session");
      const [session] = await db
        .select()
        .from(ATPROTO_SESSIONS)
        .where(eq(ATPROTO_SESSIONS.key, key))
        .limit(1);

      if (!session) {
        return undefined;
      }

      return vault.decrypt(session.sessionData);
    },

    async set(key: string, data: NodeSavedSession): Promise<void> {
      sessionStoreLogger.debug({ key }, "Setting session");
      const encrypted = await vault.encrypt(JSON.stringify(data));

      await db
        .insert(ATPROTO_SESSIONS)
        .values({
          key,
          sessionData: encrypted,
        })
        .onConflictDoUpdate({
          target: ATPROTO_SESSIONS.key,
          set: { sessionData: encrypted, updatedAt: new Date() },
        });
    },

    async del(key: string): Promise<void> {
      sessionStoreLogger.debug({ key }, "Deleting session");
      await db
        .delete(ATPROTO_SESSIONS)
        .where(eq(ATPROTO_SESSIONS.key, key));
    }
  };

  const stateStoreLogger = clientLogger.child({ component: "ATProtoOAuthClient.StateStore" });
  const stateStore: NodeSavedStateStore = {
    async get(key: string): Promise<NodeSavedState | undefined> {
      stateStoreLogger.debug({ key }, "Getting state");
      const [state] = await db
        .select()
        .from(ATPROTO_STATES)
        .where(eq(ATPROTO_STATES.key, key))
        .limit(1);

      if (!state) {
        return undefined;
      }

      return vault.decrypt(state.stateData);
    },

    async set(key: string, data: NodeSavedState): Promise<void> {
      stateStoreLogger.debug({ key }, "Setting state");
      const encrypted = await vault.encrypt(JSON.stringify(data));

      await db
        .insert(ATPROTO_STATES)
        .values({
          key,
          stateData: encrypted,
        })
        .onConflictDoUpdate({
          target: ATPROTO_STATES.key,
          set: { stateData: encrypted, updatedAt: new Date() },
        });
    },

    async del(key: string): Promise<void> {
      stateStoreLogger.debug({ key }, "Deleting state");
      await db
        .delete(ATPROTO_STATES)
        .where(eq(ATPROTO_STATES.key, key));
    }
  };

  // Create and return the client
  return new NodeOAuthClient({
    fetch,
    sessionStore,
    stateStore,
    clientMetadata,
    keyset,
  });
}