import crypto from "crypto";

import { eq, and, isNull } from "drizzle-orm";
import ms from "ms";
import type { Logger } from "pino";
import type { DeepReadonly } from "utility-types";

import { UserIds, type UserId } from "../../domain/users/ids.js";
import type { UserPrivate, UserPublic } from "../../domain/users/types.js";
import type { StringUUID } from "../../ext/typebox/index.js";
import type { UrlsConfig } from "../_config/types/index.js";
import { MAGIC_LINKS, SOCIAL_OAUTH2_PROVIDER_KIND, USERS } from "../db/schema/index.js";
import type { SocialOAuth2ProviderKind } from "../db/schema/index.js";
import type { Drizzle, DrizzleRO } from "../db/types.js";
import { type UserService } from "../domain/users/service.js";
import { type EmailService } from "../email/service.js";

import { type ATProtoService } from "./atproto/service.js";
import type { AuthConfig } from "./config.js";
import type { SessionService } from "./session/service.js";
import type { AuthorizationData } from "./social-identity/service";
import { type SocialIdentityService } from "./social-identity/service.js";

export class AuthService {
  private readonly logger: Logger;

  constructor(
    logger: Logger,
    private readonly db: Drizzle,
    private readonly userService: UserService,
    private readonly socialIdentityService: SocialIdentityService,
    private readonly atprotoService: ATProtoService,
    private readonly sessionService: SessionService,
    private readonly emailService: EmailService,
    private readonly authConfig: DeepReadonly<AuthConfig>,
    private readonly urlsConfig: DeepReadonly<UrlsConfig>,
  ) {
    this.logger = logger.child({ context: this.constructor.name });
  }

  /**
   * Start social authentication flow for both new and existing users
   */
  async startSocialAuth(
    userId: UserId | null,
    provider: SocialOAuth2ProviderKind,
    redirectPath?: string
  ): Promise<string> {
    const logger = this.logger.child({ fn: "startSocialAuth", userId, provider, redirectPath });

    // If userId is provided, ensure the user exists
    if (userId) {
      const user = await this.userService.getById(userId);
      if (!user) {
        logger.error({ userUuid: userId }, "User not found for social auth");
        throw new Error("User not found");
      }
    }

    const userUuid = userId ? userId : undefined;

    // Generate authorization URL, passing redirectPath
    return this.socialIdentityService.getAuthorizationUrl(userUuid, provider, redirectPath);
  }

  /**
   * Handle social auth callback
   * Returns user and the verified state data.
   */
  async handleSocialCallback(
    provider: SocialOAuth2ProviderKind,
    code: string,
    stateToken: string
  ): Promise<{ user: UserPrivate; state: AuthorizationData }> {
    const logger = this.logger.child({ fn: "handleSocialCallback", provider });

    try {
      // Process the callback - this now returns { user, state }
      const { user, state } = await this.socialIdentityService.handleCallback(
        provider,
        code,
        stateToken
      );

      // Optionally mark email as verified if coming from trusted provider
      if (provider === "google" && user.email && !user.emailVerified) {
        await this.verifyUserEmail(user.userId);
      }

      return { user, state };
    } catch (err) {
      logger.error({ err, provider }, "Error handling social callback in auth service");
      throw err;
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
  private async verifyUserEmail(userIdOrUuid: UserId | StringUUID): Promise<void> {
    await this.db
      .update(USERS)
      .set({ emailVerifiedAt: new Date() })
      .where(eq(USERS.userUuid, UserIds.toUUID(userIdOrUuid)));
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
    } catch (err) {
      logger.error({ err }, "Error handling ATProto callback");
      throw err;
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

  /**
   * Get all available OAuth providers
   */
  async getAvailableAuthMethods(): Promise<{
    social: Array<{
      id: SocialOAuth2ProviderKind;
      name: string;
    }>;
    atproto: boolean;
    magicLink: boolean;
  }> {
    // List all supported social providers
    const socialProviders = SOCIAL_OAUTH2_PROVIDER_KIND.enumValues.map(id => ({
      id,
      name: this.getProviderDisplayName(id)
    }));

    return {
      social: socialProviders,
      atproto: true, // ATProto is always available
      magicLink: true // Magic link is always available
    };
  }

  /**
   * Get display name for OAuth provider
   */
  private getProviderDisplayName(provider: SocialOAuth2ProviderKind): string {
    const displayNames: Record<SocialOAuth2ProviderKind, string> = {
      github: "GitHub",
      google: "Google"
    };

    return displayNames[provider] || provider;
  }

  /**
   * Get all OAuth connections for a user
   */
  async getUserConnections(
    userOrUserId: UserPrivate | UserId
  ): Promise<{
    social: Array<{
      provider: SocialOAuth2ProviderKind;
      providerName: string;
      username: string;
      identityUuid: StringUUID;
      connectedAt: number;
    }>;
    atproto: {
      handle: string;
      did: string;
      connectedAt: number;
    } | null;
  }> {
    const userId = userOrUserId instanceof Object ? userOrUserId.userId : userOrUserId;

    // Get social identities
    const socialIdentities = await this.getUserSocialIdentities(userId);
    const socialConnections = socialIdentities.map(identity => ({
      provider: identity.provider,
      providerName: this.getProviderDisplayName(identity.provider),
      username: identity.providerUsername,
      identityUuid: identity.userSocialOAuth2IdentityUuid,
      connectedAt: identity.createdAt.getTime()
    }));

    // Get ATProto identity if exists
    const atprotoIdentity = await this.getUserATProtoIdentity(userId);
    const atprotoConnection = atprotoIdentity ? {
      handle: atprotoIdentity.handle,
      did: atprotoIdentity.did,
      connectedAt: atprotoIdentity.createdAt.getTime()
    } : null;

    return {
      social: socialConnections,
      atproto: atprotoConnection
    };
  }

  /**
   * Get missing OAuth connections for a user
   * Returns providers that the user hasn't connected yet
   */
  async getMissingConnections(
    userOrUserId: UserPrivate | UserId
  ): Promise<{
    social: SocialOAuth2ProviderKind[];
    atproto: boolean;
  }> {
    const userId = userOrUserId instanceof Object ? userOrUserId.userId : userOrUserId;

    // Get user's current connections
    const connections = await this.getUserConnections(userId);

    // Get all available providers
    const availableProviders = SOCIAL_OAUTH2_PROVIDER_KIND.enumValues;

    // Filter out providers the user has already connected
    const connectedSocialIds = connections.social.map(conn => conn.provider);
    const missingSocial = availableProviders.filter(
      provider => !connectedSocialIds.includes(provider)
    );

    return {
      social: missingSocial,
      atproto: !connections.atproto
    };
  }

  /**
   * Private method to create a magic link and send the email
   */
  private async _createMagicLink(
    email: string,
    type: "login" | "verify",
    userUuid: StringUUID | null,
    redirectPath: string | undefined,
    executor: Drizzle
  ): Promise<string> {
    const logger = this.logger.child({ fn: "_createMagicLink", emailHash: crypto.createHash("sha512").update(email).digest("hex"), type, redirectPath });

    const expirationMs = ms(this.authConfig.magicLink.expirationTime);
    const expiresAt = new Date(Date.now() + expirationMs);

    // Validate and prepare redirectPath for DB insertion
    let dbRedirectPath: string | null = null;
    if (redirectPath && redirectPath.startsWith("/") && redirectPath.length > 0) {
        dbRedirectPath = redirectPath;
    } else if (redirectPath) {
        logger.warn({ redirectPath }, "Ignoring invalid redirectPath for magic link DB record.");
    }

    // Create a magic link record, including redirectPath
    const [magicLink] = await executor.insert(MAGIC_LINKS).values({
      email,
      type,
      userUuid,
      expiresAt,
      redirectPath: dbRedirectPath // Insert the validated path or null
    }).returning();

    if (!magicLink) {
      throw new Error("Failed to create magic link");
    }

    // Generate the base magic link URL (token only)
    const magicLinkUrl = new URL(`/auth/magic-link/callback`, this.urlsConfig.frontendBaseUrl);
    magicLinkUrl.searchParams.set("token", magicLink.token);

    // Generate email content (using the cleaner URL)
    const subject = type === "login"
      ? "Sign in to ed3d.net"
      : "Verify your email address for ed3d.net";

    const text = type === "login"
      ? `Click the link below to sign in to ed3d.net:\n\n${magicLinkUrl.toString()}\n\nThis link will expire in ${this.authConfig.magicLink.expirationTime}.`
      : `Click the link below to verify your email address for ed3d.net:\n\n${magicLinkUrl.toString()}\n\nThis link will expire in ${this.authConfig.magicLink.expirationTime}.`;

    const html = type === "login"
      ? `<p>Click the link below to sign in to ed3d.net:</p><p><a href="${magicLinkUrl.toString()}">${magicLinkUrl.toString()}</a></p><p>This link will expire in ${this.authConfig.magicLink.expirationTime}.</p>`
      : `<p>Click the link below to verify your email address for ed3d.net:</p><p><a href="${magicLinkUrl.toString()}">${magicLinkUrl.toString()}</a></p><p>This link will expire in ${this.authConfig.magicLink.expirationTime}.</p>`;

    await this.emailService.sendEmail({
      to: email,
      subject,
      text,
      html,
    });

    logger.info({ magicLinkUuid: magicLink.magicLinkUuid }, "Magic link created and email sent");
    return magicLink.token; // Return only the token
  }

  /**
   * Request a login magic link
   * @param email The email address to send the login link to
   * @param redirectPath Optional path to redirect to after login
   * @returns The token that was generated
   */
  async requestLoginLink(email: string, redirectPath?: string): Promise<string> {
    const logger = this.logger.child({ fn: "requestLoginLink", emailHash: crypto.createHash("sha512").update(email).digest("hex"), redirectPath });

    return await this.db.transaction(async (tx) => {
      // Check if a user with the email exists, but don't require it
      const user = await this.userService.getByEmail(email, tx);
      const userUuid = user ? UserIds.toUUID(user.userId) : null;

      return this._createMagicLink(email, "login", userUuid, redirectPath, tx);
    });
  }

  /**
   * Request a verification magic link
   * @param userOrUserId The user or user ID that needs email verification
   * @param email Optional new email to verify (if not provided, uses user's current email)
   * @returns The token that was generated
   */
  async requestVerifyLink(
    userOrUserId: UserPrivate | UserId,
    email?: string
  ): Promise<string> {
    const userId = typeof userOrUserId === "string" ? userOrUserId : userOrUserId.userId;
    const logger = this.logger.child({ fn: "requestVerifyLink", userId });

    return await this.db.transaction(async (tx) => {
      // Get the user
      const user = await this.userService.getById(userId, tx);
      if (!user) {
        logger.error("User not found");
        throw new Error("User not found");
      }

      // Determine which email to verify
      const verifyEmail = email || user.email;

      // If a new email is provided, check if it's already in use by another user
      if (email && email !== user.email) {
        const existingUser = await this.userService.getByEmail(email, tx);
        if (existingUser && existingUser.userId !== userId) {
          logger.info({ existingUserId: existingUser.userId }, "Email address is already in use");
          throw new Error("Email address is already in use");
        }
      }

      const userUuid = UserIds.toUUID(userId);
      return this._createMagicLink(verifyEmail, "verify", userUuid, undefined, tx);
    });
  }

  /**
   * Verify a magic link and perform the associated action (login or email verification)
   * @param token The token from the magic link
   * @returns The result of the verification, or null if the link is invalid
   */
  async verifyMagicLink(
    token: string
  ): Promise<{
    type: "login" | "verify";
    user: UserPrivate;
    redirectPath: string;
    session?: { token: string; expiresAt: Date };
  } | null> {
    const logger = this.logger.child({ fn: "verifyMagicLink" });
    const fallbackRedirectPath = "/profile";

    return await this.db.transaction(async (tx) => {
      // Find the magic link and select redirectPath
      const magicLinks = await tx.select()
        .from(MAGIC_LINKS)
        .where(
          and(
            eq(MAGIC_LINKS.token, token),
            isNull(MAGIC_LINKS.usedAt)
          )
        )
        .limit(1);

      if (magicLinks.length === 0) {
        logger.debug("Magic link not found or already used");
        return null;
      }

      const magicLink = magicLinks[0];

      // Check if expired
      if (magicLink.expiresAt < new Date()) {
        logger.debug({ expiresAt: magicLink.expiresAt }, "Magic link is expired");
        return null;
      }

      // Validate the retrieved redirectPath
      let validatedRedirectPath = fallbackRedirectPath;
      if (magicLink.redirectPath && magicLink.redirectPath.startsWith("/")) {
        validatedRedirectPath = magicLink.redirectPath;
      } else if (magicLink.redirectPath) {
        logger.warn({ dbRedirectPath: magicLink.redirectPath }, "Invalid redirect path found in magic link record, using fallback.");
      }

      // Mark the link as used immediately
      await tx.update(MAGIC_LINKS)
        .set({ usedAt: new Date() })
        .where(eq(MAGIC_LINKS.magicLinkUuid, magicLink.magicLinkUuid));

      // Handle different scenarios based on whether we have a user and the link type
      let userId: UserId;

      if (magicLink.userUuid) {
        // We have an existing user
        logger.debug({ userUuid: magicLink.userUuid }, "Magic link is for an existing user");
        userId = UserIds.toRichId(magicLink.userUuid);

        // If it's a verification link, verify the email
        if (magicLink.type === "verify") {
          // Check if the user's current email matches the link's email
          const user = await this.userService.getById(userId, tx);
          if (!user) {
            logger.error({ userUuid: magicLink.userUuid }, "User not found");
            return null;
          }

          // If emails don't match, update the user's email and mark as verified
          if (user.email !== magicLink.email) {
            await tx.update(USERS)
              .set({
                email: magicLink.email,
                emailVerifiedAt: new Date(),
                updatedAt: new Date()
              })
              .where(eq(USERS.userUuid, magicLink.userUuid));

            logger.info({ userId, newEmail: magicLink.email }, "Updated user email and marked as verified");
          } else {
            // Just mark the current email as verified
            await tx.update(USERS)
              .set({ emailVerifiedAt: new Date() })
              .where(eq(USERS.userUuid, magicLink.userUuid));

            logger.info({ userId }, "Marked user email as verified");
          }
        }
      } else {
        // No user UUID - this must be a new user login
        logger.debug({ email: magicLink.email }, "Magic link is for a new user");

        // Check if a user with this email now exists (could have been created after the link)
        const existingUser = await this.userService.getByEmail(magicLink.email, tx);

        if (existingUser) {
          // User was created after the link was generated
          userId = existingUser.userId;
          logger.debug({ userId }, "Found existing user by email");
        } else {
          // Create a new user
          // Generate username from email
          const baseUsername = magicLink.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
          const username = await this.userService.generateUniqueUsername(baseUsername, tx);

          // Create the user
          const newUser = await this.userService.createUser({
            email: magicLink.email,
            username,
            emailVerified: true // Mark as verified since they clicked the link
          }, tx);

          userId = newUser.userId;
          logger.info({ userId }, "Created new user from magic link");
        }
      }

      // Get the updated user
      const user = await this.userService.getById(userId, tx);
      if (!user) {
        logger.error({ userId }, "User not found after processing magic link");
        return null;
      }

      // If this is a login link, create a session
      if (magicLink.type === "login") {
        const session = await this.sessionService.createSession(userId, tx);
        logger.info({ userId, redirectPath: validatedRedirectPath }, "Created session for user from magic link");

        return {
          type: magicLink.type,
          user,
          session,
          redirectPath: validatedRedirectPath
        };
      }

      // For verification links, just return the user
      logger.info({ userId, redirectPath: validatedRedirectPath }, "Processed email verification link");
      return {
        type: magicLink.type,
        user,
        redirectPath: validatedRedirectPath
      };
    });
  }

  /**
   * Start email change verification process
   * Sends a verification link to the new email address
   */
  async startEmailChangeVerification(
    userId: UserId,
    newEmail: string
  ): Promise<void> {
    const logger = this.logger.child({ fn: "startEmailChangeVerification", userId, newEmailHash: crypto.createHash("sha512").update(newEmail).digest("hex") });

    // Request a verification link for the new email
    await this.requestVerifyLink(userId, newEmail);

    logger.info("Email change verification started");
  }
}
