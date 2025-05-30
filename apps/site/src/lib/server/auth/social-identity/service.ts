import { Type, type Static } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import cryptoRandomString from "crypto-random-string";
import { and, eq } from "drizzle-orm";
import * as oauth from "oauth4webapi";
import type { Logger } from "pino";

import { UserIds, type UserId } from "../../../domain/users/ids.js";
import type { UserPrivate } from "../../../domain/users/types.js";
import { StringUUID } from "../../../ext/typebox/index.js";
import {
  SOCIAL_OAUTH2_PROVIDER_KIND,
  USER_SOCIAL_OAUTH2_IDENTITIES,
  type DBUserSocialOAuth2Identity,
  type SocialOAuth2ProviderKind
} from "../../db/schema/index.js";
import type { Drizzle } from "../../db/types.js";
import type { UserService } from "../../domain/users/service.js";
import type { FetchFn } from "../../utils/fetch.js";
import type { VaultService } from "../../vault/service.js";
import type { Sensitive } from "../../vault/types.js";

import type { SocialIdentityConfig } from "./config.js";
import type { NormalizedUserInfo, OAuth2Provider } from "./providers/base.js";
import { DiscordProvider } from "./providers/discord.js";
import { GitHubProvider } from "./providers/github.js";
import { GoogleProvider } from "./providers/google.js";

// TypeBox schema for authorization data
export const AuthorizationDataSchema = Type.Object({
  userUuid: Type.Optional(StringUUID),
  provider: Type.Union([
    ...SOCIAL_OAUTH2_PROVIDER_KIND.enumValues.map(provider => Type.Literal(provider))
  ]),
  redirectPath: Type.Optional(Type.String({ minLength: 1 }))
});

export type AuthorizationData = Static<typeof AuthorizationDataSchema>;
export const AuthorizationDataChecker = TypeCompiler.Compile(AuthorizationDataSchema);

/**
 * Standard OAuth2 token response structure
 */
export interface OAuth2TokenData {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

export class SocialIdentityService {
  private readonly providers: Record<SocialOAuth2ProviderKind, OAuth2Provider>;

  constructor(
    private readonly logger: Logger,
    private readonly db: Drizzle,
    private readonly vault: VaultService,
    private readonly userService: UserService,
    private readonly config: SocialIdentityConfig,
    private readonly fetch: FetchFn,
    private readonly frontendBaseUrl: string
  ) {
    this.logger = logger.child({ context: this.constructor.name });

    // Initialize providers
    this.providers = {
      github: new GitHubProvider(this.logger, this.fetch),
      google: new GoogleProvider(this.logger, this.fetch),
      discord: new DiscordProvider(this.logger, this.fetch),
    };
  }

// src/lib/server/auth/social-identity/service.ts
/**
 * Generate a secure state value for OAuth2 flow
 */
private async generateStateToken(stateData: AuthorizationData): Promise<string> {
  const encryptedStateData = await this.vault.encrypt(stateData);
  // Convert the Sensitive<string> to a serializable format before base64 encoding
  const serializedEncryptedData = JSON.stringify(encryptedStateData);
  return Buffer.from(serializedEncryptedData).toString("base64url");
}

/**
 * Decode and verify a state token from OAuth callback
 */
private async verifyStateToken(stateToken: string): Promise<AuthorizationData> {
  try {
    // Decode the base64url string back to the serialized Sensitive<string>
    const serializedEncryptedData = Buffer.from(stateToken, "base64url").toString();
    // Parse the serialized data back to the Sensitive<string> object
    const encryptedStateData = JSON.parse(serializedEncryptedData);
    // Decrypt using the vault service
    const stateData = await this.vault.decrypt<AuthorizationData>(encryptedStateData);

    if (!AuthorizationDataChecker.Check(stateData)) {
      const errors = [...AuthorizationDataChecker.Errors(stateData)];
      this.logger.error({ errors }, "Invalid state data structure");
      throw new Error("Invalid authorization state format");
    }

    return stateData;
  } catch (err) {
    this.logger.error({ err }, "Failed to verify OAuth state token");
    throw err;
  }
}

  /**
   * Generate an authorization URL for a specific provider
   */
  async getAuthorizationUrl(
    userId: UserId | undefined,
    provider: SocialOAuth2ProviderKind,
    redirectPath?: string
  ): Promise<string> {
    const logger = this.logger.child({ fn: "getAuthorizationUrl", userId, provider, redirectPath });
    logger.debug("Generating authorization URL");

    const providerInstance = this.providers[provider];
    if (!providerInstance) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    const providerConfig = this.config.providers[provider];
    if (!providerConfig) {
      throw new Error(`Missing configuration for provider: ${provider}`);
    }

    // Validate redirectPath (basic check for starting with '/')
    if (redirectPath && !redirectPath.startsWith("/")) {
      logger.warn({ redirectPath }, "Invalid redirectPath provided, must be a relative path.");
      redirectPath = undefined; // Clear invalid path
    }

    // Generate secure state with provider info and user info if available
    const stateData: AuthorizationData = {
      provider,
      // Only include userUuid if userId is provided
      ...(userId ? { userUuid: UserIds.toUUID(userId) } : {}),
      // Include redirectPath if provided and valid
      ...(redirectPath ? { redirectPath } : {})
    };

    const stateToken = await this.generateStateToken(stateData);

    // Build callback URL from frontendBaseUrl
    const callbackUrl = `${this.frontendBaseUrl}/auth/social/${provider}/callback`;

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: providerConfig.clientId,
      redirect_uri: callbackUrl,
      response_type: "code",
      scope: providerInstance.scopes.map(s => s.id).join(providerInstance.scopeDelimiter),
      state: stateToken,
    });

    // Add any provider-specific params
    if (providerInstance.extraAuthParams) {
      for (const [key, value] of Object.entries(providerInstance.extraAuthParams)) {
        params.append(key, value);
      }
    }

    const authUrl = `${providerInstance.authorizationUrl}?${params.toString()}`;
    logger.debug({ authUrl }, "Generated authorization URL");

    return authUrl;
  }

  /**
   * Handle OAuth2 callback and create/update user identity
   * Returns the user, the verified state data, and whether email verification is needed.
   */
  async handleCallback(
    provider: SocialOAuth2ProviderKind,
    code: string,
    stateToken: string
  ): Promise<{ user: UserPrivate; state: AuthorizationData; needsVerification: boolean }> {
    const logger = this.logger.child({ fn: "handleCallback", provider });
    logger.debug("Processing OAuth callback");

    // Verify the state token
    const stateData = await this.verifyStateToken(stateToken);

    // Ensure the provider in the state matches the callback provider
    if (stateData.provider !== provider) {
      logger.error(
        { stateProvider: stateData.provider, callbackProvider: provider },
        "Provider mismatch in OAuth callback"
      );
      throw new Error("Invalid authorization state: provider mismatch");
    }

    const providerInstance = this.providers[provider];
    const providerConfig = this.config.providers[provider];

    if (!providerInstance || !providerConfig) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    try {
      // Exchange authorization code for tokens
      const tokenResponse = await this.exchangeCodeForToken(
        code,
        provider,
        providerConfig.clientId,
        providerConfig.clientSecret
      );

      if (!tokenResponse.access_token) {
        throw new Error("No access token received from provider");
      }

      // Fetch user information from the provider
      const userInfo = await providerInstance.getUserInfo(tokenResponse.access_token);

      // Use a transaction for the database operations
      // Now returns { finalUser, needsVerification }
      const { finalUser, needsVerification } = await this.db.transaction(async (tx) => {
        let userUuid: StringUUID;
        let userId: UserId;
        let isNewUser = false;
        let wasAlreadyVerified = false; // Track initial verification state

        if (stateData.userUuid) {
          // --- Linking Flow ---
          userUuid = stateData.userUuid;
          logger.debug({ userUuid }, "Linking identity to existing user");

          const user = await this.userService.getByUserUUID(userUuid, tx);
          if (!user) {
            logger.error({ userUuid }, "User not found during social identity linking.");
            throw new Error("User not found");
          }
          userId = user.userId;
          wasAlreadyVerified = !!user.emailVerified; // Check if user was already verified
        } else {
          // --- Login/Signup Flow ---
          logger.debug({ providerId: userInfo.id, provider }, "Processing login/signup via social identity");

          const [existingIdentity] = await tx
            .select()
            .from(USER_SOCIAL_OAUTH2_IDENTITIES)
            .where(
              and(
                eq(USER_SOCIAL_OAUTH2_IDENTITIES.provider, provider),
                eq(USER_SOCIAL_OAUTH2_IDENTITIES.providerId, userInfo.id)
              )
            )
            .limit(1);

          if (existingIdentity) {
            userUuid = existingIdentity.userUuid;
            logger.debug({ userUuid, provider, providerId: userInfo.id }, "Found existing user via social identity");

            const existingUser = await this.userService.getByUserUUID(userUuid, tx);
            if (!existingUser) {
              logger.error({ userUuid }, "User account not found for existing social identity!");
              throw new Error("Associated user account not found.");
            }
            userId = existingUser.userId;
            wasAlreadyVerified = !!existingUser.emailVerified; // Check if user was already verified
          } else {
            logger.debug("Social identity not found, checking by email or creating new user.");
            let user = null;
            if (userInfo.email) {
              user = await this.userService.getByEmail(userInfo.email, tx);
            }

            if (user) {
              userUuid = UserIds.toUUID(user.userId);
              userId = user.userId;
              wasAlreadyVerified = !!user.emailVerified; // Check if user was already verified
              logger.debug({ userUuid, email: userInfo.email, wasAlreadyVerified }, "Found existing user by email, linking new social identity");
            } else {
              const baseUsername = userInfo.displayName || userInfo.username || "user";
              const username = await this.userService.generateUniqueUsername(baseUsername, tx);

              // Create new user, noting email verification status from provider
              const newUser = await this.userService.createUser({
                email: userInfo.email || `${userInfo.id}@${provider}.placeholder.com`,
                username,
                emailVerified: userInfo.emailVerified === true // Use provider status here
              }, tx);

              userId = newUser.userId;
              userUuid = UserIds.toUUID(userId);
              isNewUser = true;
              wasAlreadyVerified = userInfo.emailVerified === true; // Initial state for new user
              logger.info({ userUuid, emailVerified: wasAlreadyVerified }, "Created new user from social login");
            }
          }
        } // End Login/Signup Flow

        // Upsert the social identity
        await this.upsertSocialIdentity(
          userUuid,
          provider,
          userInfo,
          tokenResponse,
          tx
        );

        // Get the final user details
        const retrievedUser = await this.userService.getById(userId, tx);
        if (!retrievedUser) {
          logger.error({ userId, userUuid }, "Failed to retrieve final user details after social callback.");
          throw new Error("Could not retrieve user information.");
        }

        // Determine if verification email is needed
        // Needed if:
        // 1. User was NOT already verified (either new or existing unverified)
        // 2. AND the provider did NOT verify the email during this login
        const shouldSendVerification = !wasAlreadyVerified && userInfo.emailVerified !== true;

        logger.info({ userId: retrievedUser.userId, provider, needsVerification: shouldSendVerification }, "Social callback processed successfully in transaction.");
        return { finalUser: retrievedUser, needsVerification: shouldSendVerification }; // Return flag
      }); // End transaction

      // Return user, state, and verification flag
      logger.info({ userId: finalUser.userId, provider, needsVerification }, "Social callback processed successfully by service.");
      return { user: finalUser, state: stateData, needsVerification }; // Return flag here
    } catch (err) {
      logger.error({ err }, "Error handling OAuth callback in service");
      throw err;
    }
  }

  /**
   * Exchange authorization code for access and refresh tokens
   */
  private async exchangeCodeForToken(
    code: string,
    provider: SocialOAuth2ProviderKind,
    clientId: string,
    clientSecret: string
  ): Promise<OAuth2TokenData> {
    const logger = this.logger.child({ fn: "exchangeCodeForToken", provider });
    const providerInstance = this.providers[provider];

    // Build callback URL from frontendBaseUrl
    const callbackUrl = `${this.frontendBaseUrl}/auth/social/${provider}/callback`;

    // Prepare token request
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: callbackUrl,
    });

    logger.debug("Exchanging code for token");

    const response = await this.fetch(providerInstance.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      let errorData = {};
      try {
        errorData = await response.json();
      } catch (e) {
        // Ignore JSON parsing errors
      }

      logger.error({
        status: response.status,
        error: errorData
      }, "Failed to exchange code for token");

      throw new Error(`Token exchange failed: ${response.status}`);
    }

    const tokenData = await response.json();
    logger.debug("Successfully exchanged code for token");

    return {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      token_type: tokenData.token_type,
      scope: tokenData.scope,
    };
  }

  /**
   * Create or update a user's social identity
   */
  private async upsertSocialIdentity(
    userUuid: StringUUID,
    provider: SocialOAuth2ProviderKind,
    userInfo: NormalizedUserInfo,
    tokenData: OAuth2TokenData,
    executor: Drizzle = this.db
  ): Promise<typeof USER_SOCIAL_OAUTH2_IDENTITIES.$inferSelect> {
    const logger = this.logger.child({
      fn: "upsertSocialIdentity",
      userUuid,
      provider,
      providerId: userInfo.id
    });

    const providerInstance = this.providers[provider];

    // Calculate token expiration date if expires_in is provided
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : undefined;

    // Create provider-specific metadata object
    // For now, we won't store Discord-specific metadata beyond what's in NormalizedUserInfo
    // We would need to update OAuth2ProviderMetadata in base.ts if we added specific fields
    const providerMetadata = {
      kind: provider,
      metadata: {
        // Common fields derived from NormalizedUserInfo
        displayName: userInfo.displayName,
        avatarUrl: userInfo.avatarUrl,
        profileUrl: userInfo.profileUrl,
      }
      // Example: If we defined DiscordMetadata in base.ts:
      // ...(provider === "discord" ? { /* discord-specific fields */ } : {})
    };

    // Encrypt sensitive token data
    const accessToken = await this.vault.encrypt(tokenData.access_token);
    let refreshToken = undefined;
    if (tokenData.refresh_token) {
      refreshToken = await this.vault.encrypt(tokenData.refresh_token);
    }

    // Encrypt the combined metadata
    const encryptedMetadata = await this.vault.encrypt(JSON.stringify(providerMetadata)); // Storing the generic structure

    // Check if identity already exists FOR THIS USER
    // Note: The unique constraint (provider, providerId) prevents linking the *same*
    // social account to *multiple* users. This query checks if *this specific user*
    // already has an identity for *this provider*.
    const [existingIdentityForUser] = await executor.select().from(USER_SOCIAL_OAUTH2_IDENTITIES).where(and(
      eq(USER_SOCIAL_OAUTH2_IDENTITIES.userUuid, userUuid),
      eq(USER_SOCIAL_OAUTH2_IDENTITIES.provider, provider)
    )).limit(1);

    // Parse scope string into array if present
    const scopes = tokenData.scope && providerInstance?.scopeDelimiter
      ? tokenData.scope.split(providerInstance.scopeDelimiter)
      : [];

    if (existingIdentityForUser) {
      // Update existing identity for this user
      logger.debug("Updating existing social identity for this user");

      const [updatedIdentity] = await executor
        .update(USER_SOCIAL_OAUTH2_IDENTITIES)
        .set({
          providerId: userInfo.id,
          providerUsername: userInfo.username,
          accessToken,
          refreshToken, // Update refresh token if provided
          lastRefreshedAt: new Date(),
          providerMetadata: encryptedMetadata,
          expiresAt,
          // Keep existing scopes if no new ones provided, otherwise update
          scopes: scopes.length > 0 ? scopes : existingIdentityForUser.scopes,
        })
        .where(eq(USER_SOCIAL_OAUTH2_IDENTITIES.userSocialOAuth2IdentityUuid, existingIdentityForUser.userSocialOAuth2IdentityUuid))
        .returning();

      if (!updatedIdentity) {
        // Should not happen if the select found an identity
        throw new Error("Failed to update existing social identity.");
      }
      return updatedIdentity;
    } else {
      // Create new identity for this user
      logger.debug("Creating new social identity for this user");

      // The INSERT operation relies on the DB unique constraint (provider, providerId)
      // to fail if this social account is already linked to *another* user.
      // The handleCallback logic now handles this specific constraint violation error.
      const [newIdentity] = await executor
        .insert(USER_SOCIAL_OAUTH2_IDENTITIES)
        .values({
          userUuid,
          provider,
          providerId: userInfo.id,
          providerUsername: userInfo.username,
          accessToken,
          refreshToken,
          lastRefreshedAt: new Date(),
          providerMetadata: encryptedMetadata,
          expiresAt,
          scopes,
        })
        .returning();

      if (!newIdentity) {
        // Should not happen unless insert failed for other reasons
        throw new Error("Failed to create new social identity.");
      }
      return newIdentity;
    }
  }

  /**
   * Get all social identities for a user
   */
  async getSocialIdentities(userOrUserId: UserPrivate | UserId): Promise<DBUserSocialOAuth2Identity[]> {
    const userUuid = UserIds.toUUID(typeof userOrUserId === "string" ? userOrUserId : userOrUserId.userId);
    const logger = this.logger.child({ fn: "getSocialIdentities", userUuid });

    const identities = await this.db.select().from(USER_SOCIAL_OAUTH2_IDENTITIES).where(eq(USER_SOCIAL_OAUTH2_IDENTITIES.userUuid, userUuid));

    logger.debug({ count: identities.length }, "Retrieved social identities");
    return identities;
  }

  /**
   * Delete a social identity
   */
  async deleteSocialIdentity(
    userId: UserId,
    identityUuid: StringUUID
  ): Promise<void> {
    const logger = this.logger.child({ fn: "deleteSocialIdentity", userId, identityUuid });

    await this.db
      .delete(USER_SOCIAL_OAUTH2_IDENTITIES)
      .where(
        and(
          eq(USER_SOCIAL_OAUTH2_IDENTITIES.userUuid, UserIds.toUUID(userId)),
          eq(USER_SOCIAL_OAUTH2_IDENTITIES.userSocialOAuth2IdentityUuid, identityUuid)
        )
      );

    logger.info("Social identity deleted"); // Changed to info for clarity
  }

  /**
   * Check if the Discord server ID is configured.
   */
  isDiscordGuildConfigured(): boolean {
    return !!this.config.discordServerId; // True if the ID is set and not empty
  }

  /**
   * Check if a user is a member of the configured Discord guild using their OAuth token.
   * Requires the 'guilds.members.read' scope.
   * @param encryptedAccessToken The encrypted access token retrieved from the database.
   */
  async checkDiscordGuildMembership(encryptedAccessToken: Sensitive<string>): Promise<boolean> {
    const logger = this.logger.child({ fn: "checkDiscordGuildMembership" });

    if (!this.isDiscordGuildConfigured()) {
      logger.warn("Attempted to check Discord guild membership but no server ID is configured.");
      return false; // Cannot check if not configured
    }

    const serverId = this.config.discordServerId!; // We know it's defined due to the check above

    try {
      // Decrypt using the Sensitive<string> type directly
      const accessToken = await this.vault.decrypt<string>(encryptedAccessToken);
      const url = `https://discord.com/api/users/@me/guilds/${serverId}/member`;

      logger.debug({ url }, "Checking Discord guild membership");

      const response = await this.fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) { // Status 200-299
        logger.debug("User is a member of the configured Discord guild.");
        return true;
      }

      if (response.status === 404) {
        logger.debug("User is not a member of the configured Discord guild.");
        return false;
      }

      // Handle other potential errors (401, 403, rate limits, etc.)
      logger.warn({ status: response.status, body: await response.text() }, "Received non-OK, non-404 status checking Discord guild membership.");
      return false; // Treat other errors as "not a member" or "check failed"

    } catch (error) {
      logger.error({ err: error, serverId }, "Error checking Discord guild membership");
      return false; // Treat fetch errors as "check failed"
    }
  }

  /**
   * Refresh an expired access token
   */
  async refreshAccessToken(
    identityUuid: StringUUID
  ): Promise<typeof USER_SOCIAL_OAUTH2_IDENTITIES.$inferSelect> {
    const logger = this.logger.child({ fn: "refreshAccessToken", identityUuid });

    // Find the identity
    const [identity] = await this.db.select().from(USER_SOCIAL_OAUTH2_IDENTITIES).where(eq(USER_SOCIAL_OAUTH2_IDENTITIES.userSocialOAuth2IdentityUuid, identityUuid)).limit(1);

    if (!identity) {
      throw new Error("Social identity not found");
    }

    // Check if refresh token exists
    if (!identity.refreshToken) {
      throw new Error("No refresh token available");
    }

    const provider = this.providers[identity.provider];
    const providerConfig = this.config.providers[identity.provider];

    if (!provider || !providerConfig) {
      throw new Error(`Unsupported provider: ${identity.provider}`);
    }

    // Decrypt refresh token
    const refreshToken = await this.vault.decrypt<string>(identity.refreshToken);

    // Build refresh token request
    const params = new URLSearchParams({
      client_id: providerConfig.clientId,
      client_secret: providerConfig.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });

    logger.debug("Refreshing access token");

    const response = await this.fetch(provider.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      logger.error({
        status: response.status,
        provider: identity.provider
      }, "Failed to refresh token");
      throw new Error("Failed to refresh access token");
    }

    const tokenData: OAuth2TokenData = await response.json();

    // Calculate new expiration time
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : undefined;

    // Encrypt new tokens
    const accessToken = await this.vault.encrypt(tokenData.access_token);
    let newRefreshToken = identity.refreshToken; // Default to old one
    if (tokenData.refresh_token) {
      logger.debug("Received new refresh token during refresh");
      newRefreshToken = await this.vault.encrypt(tokenData.refresh_token);
    }

    // Parse scope string into array if present
    const scopes = tokenData.scope && provider?.scopeDelimiter
      ? tokenData.scope.split(provider.scopeDelimiter)
      : identity.scopes;

    // Update identity with new tokens
    const [updatedIdentity] = await this.db
      .update(USER_SOCIAL_OAUTH2_IDENTITIES)
      .set({
        accessToken,
        refreshToken: newRefreshToken,
        lastRefreshedAt: new Date(),
        expiresAt,
        scopes,
      })
      .where(eq(USER_SOCIAL_OAUTH2_IDENTITIES.userSocialOAuth2IdentityUuid, identityUuid))
      .returning();

    if (!updatedIdentity) {
      throw new Error("Failed to update identity after token refresh.");
    }

    logger.info("Successfully refreshed access token");
    return updatedIdentity;
  }
}