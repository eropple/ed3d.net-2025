// apps/site/src/lib/server/auth/session/service.ts
import crypto from "crypto";

import { eq } from "drizzle-orm";
import ms from "ms";
import type { Logger } from "pino";
import type { DeepReadonly } from "utility-types";

import { UserIds, type UserId } from "../../../domain/users/ids.js";
import type { UserPrivate } from "../../../domain/users/types.js";
import { USER_SESSIONS, USERS } from "../../db/schema/index.js";
import type { Drizzle, DrizzleRO } from "../../db/types.js";
import type { UserService } from "../../domain/users/service.js";
import type { AuthConfig } from "../config.js";

export class SessionService {
  private readonly logger: Logger;

  constructor(
    logger: Logger,
    private readonly db: Drizzle,
    private readonly dbRO: DrizzleRO,
    private readonly config: DeepReadonly<AuthConfig>,
    private readonly userService: UserService
  ) {
    this.logger = logger.child({ context: this.constructor.name });
  }

  /**
   * Create a new session for a user
   */
  async createSession(userId: UserId, executor: Drizzle = this.db): Promise<{ token: string; expiresAt: Date }> {
    const logger = this.logger.child({ fn: "createSession", userId });
    const userUuid = UserIds.toUUID(userId);

    // Generate a secure random session token
    const token = crypto.randomBytes(32).toString("hex");
    // Hash the token to store it securely
    const tokenHash = await this.hashToken(token);

    // Calculate expiration time based on the configured default duration
    const durationMs = ms(this.config.session.defaultDuration);
    const expiresAt = new Date(Date.now() + durationMs);

    // Create a session record in the database
    await executor.insert(USER_SESSIONS).values({
      userUuid,
      tokenHash,
      expiresAt,
      lastAccessedAt: new Date(),
    });

    logger.info("Created new session");
    return { token, expiresAt };
  }

  /**
   * Validate a session token and return the associated user
   */
  async validateSession(token: string, executor: Drizzle = this.db): Promise<UserPrivate | null> {
    if (!token) return null;

    const logger = this.logger.child({ fn: "validateSession" });
    const tokenHash = await this.hashToken(token);

    try {
      // Find the session by token hash and join with users table
      const result = await executor
        .select({
          session: USER_SESSIONS,
          user: USERS
        })
        .from(USER_SESSIONS)
        .innerJoin(USERS, eq(USER_SESSIONS.userUuid, USERS.userUuid))
        .where(eq(USER_SESSIONS.tokenHash, tokenHash))
        .limit(1)
        .then(rows => rows[0]);

      if (!result) {
        logger.debug("Session not found");
        return null;
      }

      const { session, user } = result;

      // Check if session is revoked or expired
      if (session.revokedAt || (session.expiresAt && session.expiresAt < new Date())) {
        logger.debug({
          revokedAt: session.revokedAt,
          expiresAt: session.expiresAt
        }, "Session is revoked or expired");
        return null;
      }

      // Check if user is deactivated/disabled
      if (user.disabledAt) {
        logger.debug({ userUuid: user.userUuid }, "User account is disabled");
        return null;
      }

      // Update last accessed timestamp
      await executor
        .update(USER_SESSIONS)
        .set({ lastAccessedAt: new Date() })
        .where(eq(USER_SESSIONS.sessionUuid, session.sessionUuid));

      // Convert database user to UserPrivate object
      const userId = UserIds.toRichId(user.userUuid);
      const userPrivate = await this.userService.getById(userId);

      if (!userPrivate) {
        logger.warn({ userUuid: user.userUuid }, "Could not convert DB user to UserPrivate");
        return null;
      }

      logger.debug({ userId: userPrivate.userId }, "Session validated");
      return userPrivate;
    } catch (error) {
      logger.error({ error }, "Error validating session");
      return null;
    }
  }

  /**
   * Revoke a session by token
   */
  async revokeSession(token: string, executor: Drizzle = this.db): Promise<boolean> {
    if (!token) return false;

    const logger = this.logger.child({ fn: "revokeSession" });
    const tokenHash = await this.hashToken(token);

    try {
      // Find and revoke the session
      await executor
        .update(USER_SESSIONS)
        .set({ revokedAt: new Date() })
        .where(eq(USER_SESSIONS.tokenHash, tokenHash));

      logger.info("Session revoked");
      return true;
    } catch (error) {
      logger.error({ error }, "Error revoking session");
      return false;
    }
  }

  /**
   * Revoke all sessions for a user
   */
  async revokeAllUserSessions(userId: UserId, executor: Drizzle = this.db): Promise<boolean> {
    const logger = this.logger.child({ fn: "revokeAllUserSessions", userId });
    const userUuid = UserIds.toUUID(userId);

    try {
      // Revoke all sessions for the user
      await executor
        .update(USER_SESSIONS)
        .set({ revokedAt: new Date() })
        .where(eq(USER_SESSIONS.userUuid, userUuid));

      logger.info("All user sessions revoked");
      return true;
    } catch (error) {
      logger.error({ error }, "Error revoking all user sessions");
      return false;
    }
  }

  /**
   * Hash a token for secure storage
   */
  private async hashToken(token: string): Promise<string> {
    // Create a SHA-256 hash of the token
    return crypto.createHash("sha256").update(token).digest("hex");
  }
}