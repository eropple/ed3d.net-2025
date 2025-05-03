import { Agent } from "@atproto/api";
import type { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs.js";
import { JoseKey } from "@atproto/jwk-jose";
import { type NodeOAuthClient, type NodeSavedSession, type NodeSavedState } from "@atproto/oauth-client-node";
import { Type, type Static } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { eq } from "drizzle-orm";
import type { Logger } from "pino";

import { UserIds } from "../../../domain/users/ids.js";
import { StringUUID } from "../../../ext/typebox/index.js";
import { ATPROTO_SESSIONS, ATPROTO_STATES, USER_ATPROTO_IDENTITIES } from "../../db/schema/index.js";
import type { Drizzle, DrizzleRO } from "../../db/types.js";
import type { UserService } from "../../domain/users/service.js";
import type { FetchFn } from "../../utils/fetch.js";
import type { VaultService } from "../../vault/service.js";
import type { PrivateKey } from "../jwks.js";

import type { ATProtoConfig } from "./config.js";

// Instead of interface, use TypeBox for validation
export const ATProtoAuthStateSchema = Type.Object({
  userUuid: Type.Optional(StringUUID),
  handle: Type.String()
});

export type ATProtoAuthState = Static<typeof ATProtoAuthStateSchema>;
export const ATProtoAuthStateChecker = TypeCompiler.Compile(ATProtoAuthStateSchema);

export class ATProtoService {
  private readonly logger: Logger;

  constructor(
    logger: Logger,
    private readonly db: Drizzle,
    private readonly dbRO: DrizzleRO,
    private readonly vault: VaultService,
    private readonly userService: UserService,
    private readonly fetch: FetchFn,
    private readonly oauthClient: Promise<NodeOAuthClient>
  ) {
    this.logger = logger.child({ context: this.constructor.name });
  }

  /**
   * Generate an authorization URL for ATProto
   */
  async getAuthorizationUrl(userUuid: StringUUID | undefined, handle: string): Promise<string> {
    const logger = this.logger.child({ fn: "getAuthorizationUrl", userUuid, handle });
    logger.debug("Generating ATProto authorization URL");

    // Generate and encrypt state with user info
    const stateData: ATProtoAuthState = {
      handle,
      // Only include userUuid if it's defined
      ...(userUuid ? { userUuid } : {})
    };
    const stateToken = await this.generateStateToken(stateData);

    try {
      // Wait for the client to be ready
      const client = await this.oauthClient;

      // Generate the authorization URL with the ATProto client
      const authUrl = await client.authorize(handle, {
        state: stateToken,
        scope: "atproto",
      });

      logger.debug({ authUrl }, "Generated ATProto authorization URL");
      return authUrl.toString();
    } catch (err) {
      logger.error({ err }, "Error generating ATProto authorization URL");
      throw err;
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

      // Use a transaction for database operations
      return await this.db.transaction(async (tx) => {
        let userUuid: StringUUID;

        if (stateData.userUuid) {
          // Linking to existing user
          userUuid = stateData.userUuid;
          logger.debug({ userUuid }, "Linking ATProto identity to existing user");

          // Verify the user exists
          const user = await this.userService.getByUserUUID(userUuid, tx);
          if (!user) {
            throw new Error("User not found");
          }
        } else {
          // This is a new user flow
          logger.debug({ handle: profile.data.handle, did: session.did }, "Creating new user from ATProto");

          // Check if user with the handle email already exists
          const email = `${profile.data.handle}@atproto.user`;
          const user = await this.userService.getByEmail(email, tx);

          if (user) {
            // User exists, use their UUID
            userUuid = UserIds.toUUID(user.userId);
            logger.debug({ userUuid }, "Found existing user by ATProto email");
          } else {
            // Generate username from handle
            const baseUsername = profile.data.handle.replace(/\./g, "");
            const username = await this.userService.generateUniqueUsername(baseUsername, tx);

            // Create new user
            const newUser = await this.userService.createUser({
              email,
              username,
              emailVerified: false // ATProto doesn't necessarily verify email
            }, tx);

            userUuid = UserIds.toUUID(newUser.userId);
            logger.debug({ userUuid }, "Created new user from ATProto identity");
          }
        }

        // Store identity using transaction
        await this.upsertATProtoIdentity(
          userUuid,
          session.did,
          profile.data.handle,
          { ...profile.data },
          tx
        );

        return { userUuid };
      });
    } catch (err) {
      logger.error({ err }, "Error handling ATProto callback");
      throw err;
    }
  }

  /**
   * Store or update an ATProto identity
   */
  private async upsertATProtoIdentity(
    userUuid: StringUUID,
    did: string,
    handle: string,
    profileData: Record<string, unknown>,
    executor: Drizzle = this.db
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
    const [existingIdentity] = await executor.select().from(USER_ATPROTO_IDENTITIES).where(eq(USER_ATPROTO_IDENTITIES.userUuid, userUuid)).limit(1);

    if (existingIdentity) {
      // Update existing identity
      logger.debug("Updating existing ATProto identity");

      const [updatedIdentity] = await executor
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

      const [newIdentity] = await executor
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
    const encryptedStateData = await this.vault.encrypt(stateData);
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

      if (!ATProtoAuthStateChecker.Check(stateData)) {
        const errors = [...ATProtoAuthStateChecker.Errors(stateData)];
        this.logger.error({ errors }, "Invalid ATProto state data structure");
        throw new Error("Invalid ATProto state format");
      }

      return stateData;
    } catch (err) {
      this.logger.error({ error: err }, "Failed to verify ATProto state token");
      throw err;
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