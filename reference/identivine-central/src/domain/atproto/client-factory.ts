import { JoseKey } from "@atproto/jwk-jose";
import {
  NodeOAuthClient,
  type RuntimeLock,
  type NodeSavedSession,
} from "@atproto/oauth-client-node";
import { type FetchFn } from "@myapp/shared-universal/utils/fetch.js";
import { type Redis } from "ioredis";
import { type Logger } from "pino";
import Redlock from "redlock";
import { type DeepReadonly } from "utility-types";

import {
  ATPROTO_CALLBACK_PATH,
  ATPROTO_JWKS_WELL_KNOWN_PATH,
  ATPROTO_METADATA_PATH,
} from "../../_api/routes/atproto/routes.js";
import { type UrlsConfig } from "../../_config/types.js";
import { ATPROTO_SESSIONS } from "../../_db/schema/index.js";
import {
  eq,
  type Drizzle,
} from "../../lib/datastores/postgres/types.server.js";
import { type VaultService } from "../vault/service.js";

import { type ATProtoIdentityConfig } from "./config.js";

export const ATPROTO_MAX_SCOPES = ["atproto", "transition:generic"].sort();
export const ATPROTO_CLIENT_SCOPES = ["atproto", "transition:generic"].sort();

export async function createATProtoClient(
  logger: Logger,
  fetch: FetchFn,
  atprotoIdentityConfig: DeepReadonly<ATProtoIdentityConfig>,
  urls: DeepReadonly<UrlsConfig>,
  redis: Redis,
  vault: VaultService,
  db: Drizzle,
): Promise<NodeOAuthClient> {
  logger = logger.child({ fn: createATProtoClient.name });

  const currentKey = atprotoIdentityConfig.jwks.keys.find(
    (k) => k.kid === atprotoIdentityConfig.currentKid,
  );
  if (!currentKey) {
    throw new Error("Current key ID not found in JWKS");
  }

  const redlock = new Redlock([redis], {
    driftFactor: 0.01,
    retryCount: 10,
    retryDelay: 200,
    retryJitter: 200,
  });

  const requestLock: RuntimeLock = async (key, fn) => {
    const lockName = `atproto:lock:${key}`;
    // 30 seconds should be enough. Since we will be using one lock per user id
    // we can be quite liberal with the lock duration here.
    const lock = await redlock.acquire([lockName], 45000);
    try {
      return await fn();
    } finally {
      await lock.release();
    }
  };

  const ret = new NodeOAuthClient({
    fetch,

    clientMetadata: {
      client_name: atprotoIdentityConfig.clientName,
      client_uri: urls.apiBaseUrl,
      client_id: urls.apiBaseUrl + ATPROTO_METADATA_PATH,
      redirect_uris: [urls.apiBaseUrl + ATPROTO_CALLBACK_PATH],
      jwks_uri: urls.apiBaseUrl + ATPROTO_JWKS_WELL_KNOWN_PATH,
      scope: ATPROTO_MAX_SCOPES.join(" "),

      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_signing_alg: "ES256",
      token_endpoint_auth_method: "private_key_jwt",
      dpop_bound_access_tokens: true,
    },
    requestLock,
    stateStore: {
      get: async (key: string) => {
        const value = await redis.get(`atproto:state:${key}`);
        return value ? JSON.parse(value) : null;
      },
      set: async (key: string, value: unknown) => {
        await redis.set(`atproto:state:${key}`, JSON.stringify(value));
      },
      del: async (key: string) => {
        await redis.del(`atproto:state:${key}`);
      },
    },
    sessionStore: {
      // this INTENTIONALLY reads from the readwrite database
      // because we can't control how fast writes have to propagate out
      // to be useful.
      get: async (key: string) => {
        const [result] = await db
          .select()
          .from(ATPROTO_SESSIONS)
          .where(eq(ATPROTO_SESSIONS.key, key))
          .limit(1);

        if (!result) {
          return undefined;
        }

        const decrypted = await vault.decrypt(result.sessionData);
        return decrypted as NodeSavedSession;
      },
      set: async (key: string, value: unknown) => {
        await db
          .insert(ATPROTO_SESSIONS)
          .values({
            key,
            sessionData: await vault.encrypt(value),
          })
          .onConflictDoUpdate({
            target: ATPROTO_SESSIONS.key,
            set: {
              sessionData: await vault.encrypt(value),
            },
          });
      },
      del: async (key: string) => {
        await db.delete(ATPROTO_SESSIONS).where(eq(ATPROTO_SESSIONS.key, key));
      },
    },
    keyset: await Promise.all(
      atprotoIdentityConfig.jwks.keys.map((k) => JoseKey.fromJWK(k)),
    ),
  });

  logger.debug(
    { clientMetadata: ret.clientMetadata },
    "Created ATProto client",
  );

  return ret;
}
