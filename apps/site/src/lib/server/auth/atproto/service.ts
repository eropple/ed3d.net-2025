import { Agent } from "@atproto/api";
import type { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs.js";
import { JoseKey } from "@atproto/jwk-jose";
import { type NodeOAuthClient, type NodeSavedSession, type NodeSavedState } from "@atproto/oauth-client-node";
import { eq } from "drizzle-orm";
import type { Logger } from "pino";

import type { StringUUID } from "../../../ext/typebox/index.js";
import { ATPROTO_SESSIONS, ATPROTO_STATES, USER_ATPROTO_IDENTITIES } from "../../db/schema/index.js";
import type { Drizzle, DrizzleRO } from "../../db/types.js";
import type { FetchFn } from "../../utils/fetch.js";
import type { VaultService } from "../../vault/service.js";
import type { PrivateKey } from "../jwks.js";

import type { ATProtoConfig } from "./config.js";


export interface ATProtoAuthState {
  userUuid: StringUUID;
  handle: string;
}

export class ATProtoService {
  private readonly logger: Logger;

  constructor(
    logger: Logger,
    private readonly db: Drizzle,
    private readonly dbRO: DrizzleRO,
    private readonly vault: VaultService,
    private readonly fetch: FetchFn,
    private readonly oauthClient: Promise<NodeOAuthClient>
  ) {
    this.logger = logger.child({ context: this.constructor.name });
  }

  /**
   * Generate an authorization URL for ATProto
   */
  async getAuthorizationUrl(userUuid: StringUUID, handle: string): Promise<string> {
    const logger = this.logger.child({ fn: "getAuthorizationUrl", userUuid, handle });
    logger.debug("Generating ATProto authorization URL");

    // Generate and encrypt state with user info
    const stateData: ATProtoAuthState = { userUuid, handle };
    const stateToken = await this.generateStateToken(stateData);

    try {
      // Wait for the client to be ready
      const client = await this.oauthClient;

      // Generate the authorization URL with the ATProto client
      const authUrl = await client.authorize(handle, {
        state: stateToken,
        scope: "openid profile email com.atproto.label:feedback",
      });

      logger.debug({ authUrl }, "Generated ATProto authorization URL");
      return authUrl.toString();
    } catch (err) {
      logger.error({ err }, "Error generating ATProto authorization URL");
      throw new Error("Failed to generate ATProto authorization URL");
    }
  }

  /**
   * Handle ATProto callback
   */
  async handleCallback(params: URLSearchParams): Promise<{ userUuid: StringUUID }> {
    const logger = this.logger.child({ fn: "handleCallback" });
    logger.debug("Handling ATProto callback");

    try {
      // Wait for the client to be ready
      const client = await this.oauthClient;

      // Process the callback with the ATProto client
      const callbackResult = await client.callback(params);
      const { session, state } = callbackResult;

      if (!state) {
        throw new Error("No state found in ATProto callback");
      }

      // Verify state and extract user info
      const stateData = await this.verifyStateToken(state);

      // Create agent with the session from the callback
      const agent = new Agent(session);

      // Get profile data
      const profile = await agent.getProfile({ actor: session.did });

      // Store identity
      await this.upsertATProtoIdentity(
        stateData.userUuid,
        session.did,
        profile.data.handle,
        { ...profile.data }
      );

      return { userUuid: stateData.userUuid };
    } catch (error) {
      logger.error({ error }, "Error handling ATProto callback");
      throw new Error("ATProto authentication failed");
    }
  }

  /**
   * Store or update an ATProto identity
   */
  private async upsertATProtoIdentity(
    userUuid: StringUUID,
    did: string,
    handle: string,
    profileData: Record<string, unknown>
  ) {
    const logger = this.logger.child({
      fn: "upsertATProtoIdentity",
      userUuid,
      did,
      handle
    });

    // Encrypt profile data
    const encryptedProfileData = await this.vault.encrypt(JSON.stringify(profileData));

    // Check if identity already exists
    const [existingIdentity] = await this.db.select().from(USER_ATPROTO_IDENTITIES).where(eq(USER_ATPROTO_IDENTITIES.userUuid, userUuid)).limit(1);

    if (existingIdentity) {
      // Update existing identity
      logger.debug("Updating existing ATProto identity");

      const [updatedIdentity] = await this.db
        .update(USER_ATPROTO_IDENTITIES)
        .set({
          did,
          handle,
          profileData: encryptedProfileData,
        })
        .where(eq(USER_ATPROTO_IDENTITIES.userAtprotoIdentityUuid, existingIdentity.userAtprotoIdentityUuid))
        .returning();

      return updatedIdentity;
    } else {
      // Create new identity
      logger.debug("Creating new ATProto identity");

      const [newIdentity] = await this.db
        .insert(USER_ATPROTO_IDENTITIES)
        .values({
          userUuid,
          did,
          handle,
          profileData: encryptedProfileData,
          // Since this is coming from an active auth flow, we have valid tokens in the session
          accessToken: await this.vault.encrypt("stored-in-session"),
          providerMetadata: await this.vault.encrypt(profileData)
        })
        .returning();

      return newIdentity;
    }
  }

  /**
   * Get ATProto identity for a user
   */
  async getATProtoIdentity(userUuid: StringUUID) {
    const [identity] = await this.db.select().from(USER_ATPROTO_IDENTITIES).where(eq(USER_ATPROTO_IDENTITIES.userUuid, userUuid)).limit(1);

    return identity;
  }

  /**
   * Delete ATProto identity
   */
  async deleteATProtoIdentity(userUuid: StringUUID): Promise<void> {
    await this.db
      .delete(USER_ATPROTO_IDENTITIES)
      .where(eq(USER_ATPROTO_IDENTITIES.userUuid, userUuid));
  }

  /**
   * Generate a state token for authorization
   */
  private async generateStateToken(stateData: ATProtoAuthState): Promise<string> {
    const stateDataString = JSON.stringify(stateData);
    const encryptedStateData = await this.vault.encrypt(stateDataString);
    const serializedEncryptedData = JSON.stringify(encryptedStateData);
    return Buffer.from(serializedEncryptedData).toString("base64url");
  }

  /**
   * Verify a state token from callback
   */
  private async verifyStateToken(stateToken: string): Promise<ATProtoAuthState> {
    try {
      const serializedEncryptedData = Buffer.from(stateToken, "base64url").toString();
      const encryptedStateData = JSON.parse(serializedEncryptedData);
      const stateData = await this.vault.decrypt<ATProtoAuthState>(encryptedStateData);

      if (!stateData || !stateData.userUuid || !stateData.handle) {
        throw new Error("Invalid ATProto state data");
      }

      return stateData;
    } catch (error) {
      this.logger.error({ error }, "Failed to verify ATProto state token");
      throw new Error("Invalid or expired ATProto authorization state");
    }
  }

  /**
   * Get JWKS
   */
  async getJWKS() {
    const client = await this.oauthClient;
    return client.jwks;
  }

  /**
   * Get client metadata
   */
  async getClientMetadata() {
    const client = await this.oauthClient;
    return client.clientMetadata;
  }
}