import { Type, type Static } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { eq, and, ne } from "drizzle-orm";
import gravatarUrl from "gravatar-url";
import { type Logger } from "pino";

import { UserIds, type UserId } from "../../../domain/users/ids.js";
import type { UserPrivate, UserPublic } from "../../../domain/users/types.js";
import { type StringUUID } from "../../../ext/typebox/index.js";
import { USERS, type DBUser } from "../../db/schema/index.js";
import { type DrizzleRO, type Drizzle } from "../../db/types.js";
import { sha512_256 } from "../../utils/hashing.js";


export class UserService {
  private readonly logger: Logger;

  constructor(
    logger: Logger,
    private readonly db: Drizzle,
    private readonly dbRO: DrizzleRO,
  ) {
    this.logger = logger.child({ component: this.constructor.name });
  }

  /**
   * Get a user by their rich ID
   */
  async getById(userId: UserId, executor: DrizzleRO = this.dbRO): Promise<UserPrivate | null> {
    this.logger.debug({ userId }, "Getting user by ID");

    const uuid = UserIds.toUUID(userId);
    return this.getByUserUUID(uuid, executor);
  }

  /**
   * Get a user by their UUID - hack method for auth service
   */
  async getByUserUUID(userId: StringUUID, executor: DrizzleRO = this.dbRO): Promise<UserPrivate | null> {
    this.logger.debug({ userId }, "Getting user by UUID");

    const result = await executor
      .select()
      .from(USERS)
      .where(eq(USERS.userUuid, userId))
      .limit(1);

      const dbUser = result[0] || null;

      if (!dbUser) {
        return null;
      }

      return this._dbUserToUserPrivate(dbUser);
  }

  /**
   * Get a user by their email address
   */
  async getByEmail(email: string, executor: DrizzleRO = this.dbRO): Promise<UserPrivate | null> {
    this.logger.debug({ email }, "Getting user by email");

    const result = await executor
      .select()
      .from(USERS)
      .where(eq(USERS.email, email))
      .limit(1);

    const dbUser = result[0] || null;

    if (!dbUser) {
      return null;
    }

    return this._dbUserToUserPrivate(dbUser);
  }

  /**
   * Get a user by their username
   */
  async getByUsername(username: string, executor: DrizzleRO = this.dbRO): Promise<UserPublic | null> {
    this.logger.debug({ username }, "Getting user by username");

    const result = await executor
      .select()
      .from(USERS)
      .where(eq(USERS.username, username))
      .limit(1);

    const dbUser = result[0] || null;

    if (!dbUser) {
      return null;
    }

    return this._dbUserToUserPublic(dbUser);
  }

  /**
   * Convert a UserPrivate to UserPublic
   */
  static toPublic(userPrivate: UserPrivate): UserPublic {
    return {
      __type: "UserPublic",
      userId: userPrivate.userId,
      username: userPrivate.username,
      avatarUrl: userPrivate.avatarUrl,
    };
  }

  /**
   * Generate a Gravatar URL from an email
   */
  static getGravatarUrl(email: string): string {
    return gravatarUrl(email, {
      size: 512,
      default: "retro",
      rating: "pg",
    });
  }

  /**
   * Convert a DBUser to UserPrivate
   */
  private _dbUserToUserPrivate(dbUser: DBUser): UserPrivate {
    const isUserStaff = dbUser.isStaff;

    return {
      __type: "UserPrivate",
      userId: UserIds.toRichId(dbUser.userUuid),
      username: dbUser.username,
      avatarUrl: UserService.getGravatarUrl(dbUser.email),
      email: dbUser.email,
      emailVerified: !!dbUser.emailVerifiedAt,
      grants: {
        __type: "SiteGrants",
        isStaff: isUserStaff,
        comments: {
          moderate: isUserStaff,
          post: !!dbUser.emailVerifiedAt,
        },
      },
      createdAt: dbUser.createdAt.getTime(),
      disabledAt: dbUser.disabledAt ? dbUser.disabledAt.getTime() : undefined,
    };
  }

  /**
   * Convert a DBUser to UserPublic
   */
  private _dbUserToUserPublic(dbUser: DBUser): UserPublic {
    return {
      __type: "UserPublic",
      userId: UserIds.toRichId(dbUser.userUuid),
      username: dbUser.username,
      avatarUrl: UserService.getGravatarUrl(dbUser.email),
    };
  }

  /**
   * Create a new user
   */
  async createUser(userData: {
    email: string;
    username: string;
    emailVerified?: boolean;
  }, executor: Drizzle = this.db): Promise<UserPrivate> {
    this.logger.debug({ ...userData }, "Creating new user");

    const [dbUser] = await executor
      .insert(USERS)
      .values({
        email: userData.email,
        username: userData.username,
        emailVerifiedAt: userData.emailVerified ? new Date() : null,
      })
      .returning();

    if (!dbUser) {
      throw new Error("Failed to create user");
    }

    return this._dbUserToUserPrivate(dbUser);
  }

  /**
   * Generate a unique username from a display name
   */
  async generateUniqueUsername(
    baseUsername: string,
    executor: DrizzleRO = this.dbRO
  ): Promise<string> {
    // Clean up the username - remove special chars and convert to lowercase
    let username = baseUsername.toLowerCase().replace(/[^a-z0-9]/g, "");

    // Check if username exists
    let userWithUsername = await this.getByUsername(username, executor);

    // If username exists, add a random suffix until we find a unique one
    if (userWithUsername) {
      const maxAttempts = 5;
      let attempts = 0;

      while (userWithUsername && attempts < maxAttempts) {
        const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
        username = `${baseUsername}${randomSuffix}`;
        userWithUsername = await this.getByUsername(username, executor);
        attempts++;
      }

      // If we still couldn't find a unique username after max attempts
      if (userWithUsername) {
        username = `${baseUsername}${Date.now().toString().slice(-8)}`;
      }
    }

    return username;
  }

  /**
   * Update a user's email address
   * This will mark the email as unverified
   */
  async updateEmail(
    userOrUserId: UserPrivate | UserId,
    newEmail: string,
    executor: Drizzle = this.db
  ): Promise<UserPrivate> {

    const userId = typeof userOrUserId === "string" ? userOrUserId : userOrUserId.userId;
    const logger = this.logger.child({ fn: "updateEmail", userId, newEmailHash: sha512_256(newEmail) });

    // Check if email is already in use by another user
    const existingUser = await this.getByEmail(newEmail, executor);
    if (existingUser && existingUser.userId !== userOrUserId) {
      logger.info({ existingUserId: existingUser.userId }, "Email address is already in use");
      throw new Error("Email address is already in use");
    }

    const userUuid = UserIds.toUUID(userId);

    // Update the user's email and mark as unverified
    const [updatedUser] = await executor
      .update(USERS)
      .set({
        email: newEmail,
        emailVerifiedAt: null, // Mark as unverified
        updatedAt: new Date()
      })
      .where(eq(USERS.userUuid, userUuid))
      .returning();

    if (!updatedUser) {
      throw new Error("Failed to update user email");
    }

    logger.info({ updatedUser }, "Updated user email");

    return this._dbUserToUserPrivate(updatedUser);
  }

  /**
   * Update a user's username.
   */
  async updateUsername(
    userOrUserId: UserPrivate | UserId,
    newUsername: string,
    executor: Drizzle = this.db
  ): Promise<UserPrivate> {
    const userId = typeof userOrUserId === "string" ? userOrUserId : userOrUserId.userId;
    const userUuid = UserIds.toUUID(userId);
    const logger = this.logger.child({ fn: "updateUsername", userId });

    const trimmedUsername = newUsername.trim();

    // 1. Validation (Simple: non-empty and length)
    if (!trimmedUsername) {
        logger.warn("Attempted to update username to an empty string.");
        throw new Error("Username cannot be empty.");
    }
    // Example length check (adjust as needed, e.g., based on DB column limit)
    if (trimmedUsername.length < 2 || trimmedUsername.length > 50) {
        logger.warn({ usernameLength: trimmedUsername.length }, "Attempted to update username with invalid length.");
        throw new Error("Username must be between 2 and 50 characters.");
    }
    // Add more specific format validation if required later

    // 2. Check if Unchanged
    // Fetch current user using getById which handles the UUID conversion and returns UserPrivate or null
    const currentUser = await this.getById(userId, executor);
    if (!currentUser) {
        // This case should ideally not happen if userOrUserId is valid, but handle defensively
        logger.error({ userUuid }, "User not found when attempting username update.");
        throw new Error("User not found.");
    }
    if (currentUser.username === trimmedUsername) {
        logger.debug({ username: trimmedUsername }, "Username is unchanged, no update needed.");
        return currentUser; // Return the existing user object
    }

    logger.debug({ newUsername: trimmedUsername }, "Attempting to update username.");


    // 3. Check Availability
    const existingUserWithUsername = await this.getByUsername(trimmedUsername, executor);
    if (existingUserWithUsername && existingUserWithUsername.userId !== userId) {
      logger.info({ existingUserId: existingUserWithUsername.userId, requestedUsername: trimmedUsername }, "Username is already in use by another user.");
      throw new Error("Username is already taken.");
    }

    // 4. Perform Update
    const [updatedDbUser] = await executor
      .update(USERS)
      .set({
        username: trimmedUsername,
        updatedAt: new Date()
      })
      .where(eq(USERS.userUuid, userUuid))
      .returning();

    if (!updatedDbUser) {
        // Should not happen if currentUser was found, but check again.
      logger.error({ userUuid }, "Failed to update user username in database, user might have been deleted concurrently.");
      throw new Error("Failed to update username.");
    }

    logger.info({ userId }, "Updated user username successfully.");

    // 5. Return updated UserPrivate object
    return this._dbUserToUserPrivate(updatedDbUser);
  }
}
