import { Type, type Static } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { eq } from "drizzle-orm";
import gravatarUrl from "gravatar-url";
import { type Logger } from "pino";

import { UserIds, type UserId } from "../../../domain/users/ids.js";
import type { UserPrivate, UserPublic } from "../../../domain/users/types.js";
import { type StringUUID } from "../../../ext/typebox/index.js";
import { USERS, type DBUser } from "../../db/schema/index.js";
import { type DrizzleRO, type Drizzle } from "../../db/types.js";


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
    return {
      __type: "UserPrivate",
      userId: UserIds.toRichId(dbUser.userUuid),
      username: dbUser.username,
      avatarUrl: UserService.getGravatarUrl(dbUser.email),
      email: dbUser.email,
      emailVerified: !!dbUser.emailVerifiedAt,
      grants: {
        __type: "SiteGrants",
        isStaff: false,
        isAdmin: false,

        comments: {
          moderate: true,
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
}
