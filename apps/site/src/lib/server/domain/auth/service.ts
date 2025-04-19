import { randomUUID } from "crypto";

import { Type, type Static } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import cryptoRandomString from "crypto-random-string";
import { eq, and, isNull, gt } from "drizzle-orm";
import { type Redis } from "ioredis";
import {
  type Configuration as OIDCClientConfiguration,
  authorizationCodeGrant,
  buildAuthorizationUrl,
  calculatePKCECodeChallenge,
  fetchUserInfo,
  randomPKCECodeVerifier,
} from "openid-client";
import { type Logger } from "pino";


import { type StringUUID } from "../../../ext/typebox/index.js";
import { type UrlsConfig } from "../../_config/types/index.js";
import { type DBUser, type DBUserSession, users, userSessions } from "../../db/schema/index.js";
import { type Drizzle } from "../../db/types.js";
import { type FetchFn } from "../../utils/fetch.js";
import { sha512_256 } from "../../utils/hashing.js";
import { UserIds, type UserId } from "../users/ids.js";
import { type UserService } from "../users/service.js";
import type { UserPrivate } from "../users/types.js";

import type { AuthConfig } from "./config.js";
import { UserSessionIds, type UserSessionId } from "./ids.js";
import { RawOIDCIdentityChecker, type RawOIDCIdentity } from "./types.js";

// Session token expiration in milliseconds
const TOKEN_EXPIRES_AFTER_MS = 1000 * 60 * 60 * 24 * 14; // 14 days
const TOKEN_HASH_ROUNDS = 4;

// State interface
export const OIDCState = Type.Object({
  nonce: Type.String(),
  redirectUri: Type.String(),
  pkceVerifier: Type.String(),
});
export type OIDCState = Static<typeof OIDCState>;
export const OIDCStateChecker = TypeCompiler.Compile(OIDCState);

export class AuthService {
  private readonly logger: Logger;

  constructor(
    logger: Logger,
    private readonly db: Drizzle,
    private readonly redis: Redis,
    private readonly fetch: FetchFn,
    private readonly authConfig: AuthConfig,
    private readonly urlsConfig: UrlsConfig,
    private readonly users: UserService,
    private readonly oidcConfig: Promise<OIDCClientConfiguration>
  ) {
    this.logger = logger.child({ component: this.constructor.name });
  }

  /**
   * Initialize the OIDC authentication flow
   */
  async initiateOIDCFlow(redirectUri: URL): Promise<URL> {
    const logger = this.logger.child({ fn: this.initiateOIDCFlow.name });
    logger.debug({ redirectUri }, "Initiating OIDC flow");

    // Generate a nonce for state verification
    const nonce = randomUUID();

    // Use PKCE for added security
    const pkceVerifier = randomPKCECodeVerifier();
    const codeChallenge = await calculatePKCECodeChallenge(pkceVerifier);

    // Store the state in Redis with an expiration time
    const state: OIDCState = {
      nonce,
      redirectUri: redirectUri.toString(),
      pkceVerifier,
    };

    // Create a random state token (we're using the nonce as key in Redis)
    const stateToken = cryptoRandomString({ length: 32, type: "url-safe" });

    // Store state in Redis with expiration (5 minutes)
    await this.redis.set(
      `oidc:state:${stateToken}`,
      JSON.stringify(state),
      "EX",
      300 // 5 minutes
    );

    // Build the authorization URL with PKCE
    const params = new URLSearchParams({
      redirect_uri: new URL("/auth/callback", this.urlsConfig.frontendBaseUrl).toString(),
      response_type: "code",
      scope: "openid profile email",
      state: stateToken,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    // Return the full authorization URL for redirect
    return buildAuthorizationUrl(await this.oidcConfig, params);
  }

  /**
   * Verify the OIDC state token
   */
  private async verifyOIDCState(stateToken: string): Promise<OIDCState> {
    const logger = this.logger.child({ fn: this.verifyOIDCState.name });

    // Get state from Redis
    const stateJson = await this.redis.get(`oidc:state:${stateToken}`);
    if (!stateJson) {
      logger.warn({ stateToken }, "OIDC state not found");
      throw new Error("Invalid or expired OIDC state");
    }

    // Delete state from Redis to prevent reuse
    await this.redis.del(`oidc:state:${stateToken}`);

    // Parse state
    const parsedState: unknown = JSON.parse(stateJson);
    if (OIDCStateChecker.Check(parsedState)) {
      return parsedState;
    }

    logger.warn({ stateToken, parsedState, parseErrors: [...OIDCStateChecker.Errors(parsedState)] }, "Invalid OIDC state");
    throw new Error("Invalid OIDC state");
  }

  /**
   * Create a session for an authenticated user
   */
  async createSession(
    userId: UserId,
    executor: Drizzle = this.db
  ): Promise<{ sessionId: UserSessionId; sessionToken: string }> {
    const logger = this.logger.child({ fn: this.createSession.name, userId });
    logger.debug("Creating session");

    // Generate a secure random token
    const token =
      "ED3D_V1_" + cryptoRandomString({ length: 32, type: "distinguishable" });

    // Hash token for storage
    const tokenHash = sha512_256(token, TOKEN_HASH_ROUNDS);

    // Insert session record
    const [session] = await executor
      .insert(userSessions)
      .values({
        userUuid: UserIds.toUUID(userId),
        tokenHash,
      })
      .returning();

    if (!session) {
      logger.error("Failed to create session");
      throw new Error("Failed to create session");
    }

    return {
      sessionId: UserSessionIds.toRichId(session.sessionUuid),
      sessionToken: token
    };
  }

  /**
   * Resolve a session token to a user
   */
  async resolveSessionToken(
    token: string,
    executor: Drizzle = this.db
  ): Promise<UserPrivate | null> {
    const logger = this.logger.child({ fn: this.resolveSessionToken.name });
    logger.debug("Resolving session token");

    // Hash the token for comparison
    const tokenHash = sha512_256(token, TOKEN_HASH_ROUNDS);

    // Calculate expiration date
    const now = new Date();
    const expiredBefore = new Date(now.getTime() - TOKEN_EXPIRES_AFTER_MS);

    return executor.transaction(async (tx) => {
      // Find valid session
      const [session] = await tx
        .select()
        .from(userSessions)
        .where(
          and(
            eq(userSessions.tokenHash, tokenHash),
            isNull(userSessions.revokedAt),
            gt(userSessions.lastAccessedAt, expiredBefore)
          )
        )
        .limit(1);

      if (!session) {
        logger.debug("No active session found for token");
        return null;
      }

      // Get user for session
      const user = await this.users.getByUserUUID(session.userUuid, tx);

      if (!user) {
        logger.warn(
          { sessionId: session.sessionUuid },
          "User not found for valid session"
        );
        return null;
      }

      // Check if user is disabled
      if (user.disabledAt) {
        logger.warn(
          { sessionId: session.sessionUuid, userId: session.userUuid },
          "User is disabled"
        );
        return null;
      }

      // Update session and user access times
      await tx
        .update(userSessions)
        .set({ lastAccessedAt: now })
        .where(eq(userSessions.sessionUuid, session.sessionUuid));

      await tx
        .update(users)
        .set({ lastAccessedAt: now })
        .where(eq(users.userUuid, UserIds.toUUID(user.userId)));

      return user;
    });
  }

  /**
   * Revoke a session by token
   */
  async revokeSession(
    token: string,
    executor: Drizzle = this.db
  ): Promise<boolean> {
    const logger = this.logger.child({ fn: this.revokeSession.name });
    logger.debug("Revoking session");

    // Hash the token for comparison
    const tokenHash = sha512_256(token, TOKEN_HASH_ROUNDS);

    // Update session to mark as revoked
    const result = await executor
      .update(userSessions)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(userSessions.tokenHash, tokenHash),
          isNull(userSessions.revokedAt)
        )
      );

    return !!result.rowCount && result.rowCount > 0;
  }

  /**
   * Handle the OIDC callback
   */
    /**
   * Handle the OIDC callback
   */
    async TX_handleOIDCCallback(
      state: string,
      originalUrl: URL
    ): Promise<{
      user: UserPrivate;
      sessionToken: string;
      sessionId: UserSessionId;
      redirectTo: string;
    }> {
      const logger = this.logger.child({ fn: this.TX_handleOIDCCallback.name });
      logger.debug({ url: originalUrl.toString() }, "Handling OIDC callback");

      // Verify the state token
      const verifiedState = await this.verifyOIDCState(state);

      // NOTE: Remove state from URL as openid-client doesn't like it there
      // This follows the pattern from the reference code
      originalUrl.searchParams.delete("state");

      // Exchange the authorization code for tokens
      const tokenSet = await authorizationCodeGrant(
        await this.oidcConfig,
        originalUrl,
        {
          idTokenExpected: true,
          pkceCodeVerifier: verifiedState.pkceVerifier,
        }
      );

      // Extract claims from the ID token
      const claims = tokenSet.claims();
      if (!claims || !claims.sub) {
        logger.error("No valid claims in ID token");
        throw new Error("Invalid ID token");
      }

      // Get additional user info
      const userInfo = await fetchUserInfo(
        await this.oidcConfig,
        tokenSet.access_token!,
        claims.sub
      );

      // Get or create the user
      return this.db.transaction(async (tx) => {
        // All necessary user info
        const email = userInfo.email as string;
        const sub = claims.sub;
        if (!email) {
          logger.error("No email in user info");
          throw new Error("Email is required but not provided by identity provider");
        }
        if (!sub) {
          logger.error("No sub in user info");
          throw new Error("Sub is required but not provided by identity provider");
        }

        // Store as OIDC identity
        const oidcIdentity: unknown = {
          ...userInfo,
          sub,
        };

        if (!RawOIDCIdentityChecker.Check(oidcIdentity)) {
          logger.error({ errors: [...RawOIDCIdentityChecker.Errors(oidcIdentity)] }, "Invalid OIDC identity");
          throw new Error("Invalid OIDC identity");
        }

        let user = await this.users.getByOidcSub(sub, tx);

        if (user) {
          logger.info({ email, userId: user.userId }, "Existing user logged in");
          user = await this.users.updateOIDCIdentity(
            user.userId,
            oidcIdentity,
            tx
          );
        } else {
          // Create a new user - now returns UserPrivate
          const username = userInfo.preferred_username || email.split("@")[0];

          logger.info({ email, username, sub }, "Creating new user from OIDC login");
          user = await this.users.createUserFromOIDC(
            email,
            username,
            sub,
            oidcIdentity,
            tx
          );
        }

        // Create a session
        const { sessionId, sessionToken } = await this.createSession(
          user.userId,
          tx
        );

        return {
          user,
          sessionId,
          sessionToken,
          redirectTo: verifiedState.redirectUri || this.urlsConfig.frontendBaseUrl,
        };
      });
    }

  /**
   * Resolve a session cookie to a UserPrivate object
   */
  async resolveSessionCookie(
    cookieValue: string | undefined | null,
    executor: Drizzle = this.db
  ): Promise<UserPrivate | null> {
    if (!cookieValue) {
      return null;
    }

    const logger = this.logger.child({ fn: this.resolveSessionCookie.name });
    logger.debug("Resolving session cookie");

    try {
      // Hash the token for comparison
      const tokenHash = sha512_256(cookieValue, TOKEN_HASH_ROUNDS);

      // Calculate expiration date
      const now = new Date();
      const expiredBefore = new Date(now.getTime() - TOKEN_EXPIRES_AFTER_MS);

      return executor.transaction(async (tx) => {
        // Find valid session
        const [session] = await tx
          .select()
          .from(userSessions)
          .where(
            and(
              eq(userSessions.tokenHash, tokenHash),
              isNull(userSessions.revokedAt),
              gt(userSessions.lastAccessedAt, expiredBefore)
            )
          )
          .limit(1);

        if (!session) {
          logger.debug("No active session found for token");
          return null;
        }

        // Get user for session - the UserService now returns UserPrivate directly
        const user = await this.users.getById(
          UserIds.toRichId(session.userUuid),
          tx
        );

        if (!user) {
          logger.warn(
            { sessionId: session.sessionUuid },
            "User not found for valid session"
          );
          return null;
        }

        // Update session access time
        await tx
          .update(userSessions)
          .set({ lastAccessedAt: now })
          .where(eq(userSessions.sessionUuid, session.sessionUuid));

        // Update user access time in DB
        await tx
          .update(users)
          .set({ lastAccessedAt: now })
          .where(eq(users.userUuid, UserIds.toUUID(user.userId)));

        return user;
      });
    } catch (err) {
      logger.error({ err }, "Error resolving session cookie");
      return null;
    }
  }
}
