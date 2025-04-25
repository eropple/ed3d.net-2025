// src/lib/server/auth/service.ts
import crypto from "crypto";

import { eq } from "drizzle-orm";
import type { Logger } from "pino";

import { UserIds, type UserId } from "../../domain/users/ids.js";
import type { UserPrivate, UserPublic } from "../../domain/users/types.js";
import type { StringUUID } from "../../ext/typebox/index.js";
import { USERS } from "../db/schema/index.js";
import type { SocialOAuth2ProviderKind } from "../db/schema/index.js";
import type { Drizzle, DrizzleRO } from "../db/types.js";
import { type UserService } from "../domain/users/service.js";
import type { VaultService } from "../vault/service.js";

import { type ATProtoService } from "./atproto/service.js";
import { type SocialIdentityService } from "./social-identity/service.js";

export class AuthService {
  private readonly logger: Logger;

  constructor(
    logger: Logger,
    private readonly db: Drizzle,
    private readonly dbRO: DrizzleRO,
    private readonly userService: UserService,
    private readonly socialIdentityService: SocialIdentityService,
    private readonly atprotoService: ATProtoService,
    private readonly vault: VaultService
  ) {
    this.logger = logger.child({ context: this.constructor.name });
  }

  /**
   * Start social authentication flow for both new and existing users
   */
  async startSocialAuth(
    userId: UserId | null,
    provider: SocialOAuth2ProviderKind
  ): Promise<string> {
    const logger = this.logger.child({ fn: "startSocialAuth", userId, provider });

    // If userId is provided, ensure the user exists
    if (userId) {
      const user = await this.userService.getById(userId);
      if (!user) {
        logger.error({ userUuid: userId }, "User not found for social auth");
        throw new Error("User not found");
      }
    }

    // Create temporary user UUID for the auth flow if userId is null
    const userUuid = userId ? userId : UserIds.toRichId(crypto.randomUUID());

    // Generate authorization URL
    return this.socialIdentityService.getAuthorizationUrl(userUuid, provider);
  }

  /**
   * Handle social auth callback
   */
  async handleSocialCallback(
    provider: SocialOAuth2ProviderKind,
    code: string,
    state: string
  ): Promise<{ userId: UserId }> {
    const logger = this.logger.child({ fn: "handleSocialCallback", provider });

    try {
      // Process the callback in the social identity service
      const { userId } = await this.socialIdentityService.handleCallback(provider, code, state);

      // Get the user to return the rich ID
      const user = await this.userService.getById(userId);
      if (!user) {
        throw new Error("User not found after social auth callback");
      }

      // Optionally mark email as verified if coming from trusted provider
      if (provider === "google" && !user.emailVerified) {
        await this.verifyUserEmail(userId);
      }

      return { userId: user.userId };
    } catch (error) {
      logger.error({ error, provider }, "Error handling social callback");
      throw new Error(`Authentication failed during social callback`);
    }
  }

  /**
   * Create user from social auth if they don't exist
   */
  async createOrUpdateUserFromSocial(
    provider: SocialOAuth2ProviderKind,
    email: string,
    displayName: string
  ): Promise<{ userId: UserId; isNewUser: boolean }> {
    const logger = this.logger.child({ fn: "createOrUpdateUserFromSocial", provider, email });

    // Check if user already exists
    const existingUser = await this.userService.getByEmail(email);

    if (existingUser) {
      logger.debug({ userId: existingUser.userId }, "User already exists");
      return { userId: existingUser.userId, isNewUser: false };
    }

    // Generate username from display name
    const baseUsername = displayName.toLowerCase().replace(/[^a-z0-9]/g, "");
    let username = baseUsername;
    let userWithUsername: UserPublic | null = null;

    do {
      // Check if username exists, and if so, add random suffix
      userWithUsername = await this.userService.getByUsername(username);
      if (userWithUsername) {
        const randomSuffix = crypto.randomInt(9999).toString().padStart(4, "0");
        username = `${baseUsername}${randomSuffix}`;
      }
    } while (userWithUsername);

    // Create new user
    const [newUser] = await this.db
      .insert(USERS)
      .values({
        email,
        username,
        // If coming from trusted provider like Google, mark as verified
        emailVerifiedAt: provider === "google" ? new Date() : null,
      })
      .returning();

    if (!newUser) {
      throw new Error("Failed to create user");
    }

    const userId = UserIds.toRichId(newUser.userUuid);

    logger.info({ userId }, "Created new user from social auth");
    return { userId, isNewUser: true };
  }

  /**
   * Mark a user's email as verified
   */
  private async verifyUserEmail(userUuid: UserId): Promise<void> {
    await this.db
      .update(USERS)
      .set({ emailVerifiedAt: new Date() })
      .where(eq(USERS.userUuid, UserIds.toUUID(userUuid)));
  }

  /**
   * Get all social identities for a user
   */
  async getUserSocialIdentities(userId: UserId) {
    const userUuid = UserIds.toUUID(userId);
    return this.socialIdentityService.getSocialIdentities(userUuid);
  }

  /**
   * Remove a social identity from a user
   */
  async removeSocialIdentity(userId: UserId, identityUuid: StringUUID): Promise<void> {
    await this.socialIdentityService.deleteSocialIdentity(userId, identityUuid);
  }

  /**
   * Start ATProto authentication flow for both new and existing users
   */
  async startATProtoAuth(
    userId: UserId | undefined,
    handle: string
  ): Promise<string> {
    const logger = this.logger.child({ fn: "startATProtoAuth", userId, handle });

    // If userId is provided, ensure the user exists
    if (userId) {
      const user = await this.userService.getById(userId);
      if (!user) {
        logger.error({ userId }, "User not found for ATProto auth");
        throw new Error("User not found");
      }
    }

    // Use the user UUID if provided, otherwise it will be undefined to indicate new user flow
    const userUuid = userId ? UserIds.toUUID(userId) : undefined;

    // Generate authorization URL
    return this.atprotoService.getAuthorizationUrl(userUuid, handle);
  }

  /**
   * Handle ATProto callback
   */
  async handleATProtoCallback(
    params: URLSearchParams
  ): Promise<{ userId: UserId }> {
    const logger = this.logger.child({ fn: "handleATProtoCallback" });

    try {
      // Process the callback in the ATProto service
      const { userUuid } = await this.atprotoService.handleCallback(params);

      // Get the user to return the rich ID
      const user = await this.userService.getByUserUUID(userUuid);
      if (!user) {
        throw new Error("User not found after ATProto callback");
      }

      return { userId: user.userId };
    } catch (error) {
      logger.error({ error }, "Error handling ATProto callback");
      throw new Error("Authentication failed during ATProto callback");
    }
  }

  /**
   * Get ATProto identity for a user
   */
  async getUserATProtoIdentity(userId: UserId) {
    const userUuid = UserIds.toUUID(userId);
    return this.atprotoService.getATProtoIdentity(userUuid);
  }

  /**
   * Remove ATProto identity from a user
   */
  async removeATProtoIdentity(userId: UserId): Promise<void> {
    const userUuid = UserIds.toUUID(userId);
    await this.atprotoService.deleteATProtoIdentity(userUuid);
  }
}
