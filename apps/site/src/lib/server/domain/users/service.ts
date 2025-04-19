import { Type, type Static } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { eq } from "drizzle-orm";
import gravatarUrl from "gravatar-url";
import { type Logger } from "pino";

import { type StringUUID } from "../../../ext/typebox/index.js";
import { type DBUser, users } from "../../db/schema/index.js";
import { type DrizzleRO, type Drizzle } from "../../db/types.js";

import { UserIds, type UserId } from "./ids.js";
import { type UserPrivate, type UserPublic } from "./types.js";

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
      .from(users)
      .where(eq(users.userUuid, userId))
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
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const dbUser = result[0] || null;

    if (!dbUser) {
      return null;
    }

    return this._dbUserToUserPrivate(dbUser);
  }

  /**
   * Get a user by their OIDC subject identifier
   */
  async getByOidcSub(oidcSub: string, executor: DrizzleRO = this.dbRO): Promise<UserPrivate | null> {
    this.logger.debug({ oidcSub }, "Getting user by OIDC subject");

    const result = await executor
      .select()
      .from(users)
      .where(eq(users.oidcSub, oidcSub))
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
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    const dbUser = result[0] || null;

    if (!dbUser) {
      return null;
    }

    return this._dbUserToUserPublic(dbUser);
  }

  /**
   * Create a new user from OIDC identity data
   */
  async createUserFromOIDC(
    email: string,
    username: string,
    oidcSub: string,
    oidcIdentity: NonNullable<DBUser["oidcIdentity"]>,
    executor: Drizzle = this.db,
  ): Promise<UserPrivate> {
    this.logger.info({ email, username, oidcSub }, "Creating new user from OIDC");

    const [dbUser] = await executor
      .insert(users)
      .values({
        email,
        username,
        oidcSub,
        oidcIdentity,
        emailVerified: oidcIdentity.email_verified ?? false,
      })
      .returning();

    if (!dbUser) {
      throw new Error("Failed to create user");
    }

    return this._dbUserToUserPrivate(dbUser);
  }

  /**
   * Update a user's OIDC identity
   */
  async updateOIDCIdentity(
    userId: UserId,
    oidcIdentity: NonNullable<DBUser["oidcIdentity"]>,
    executor: Drizzle = this.db,
  ): Promise<UserPrivate> {
    this.logger.debug({ userId }, "Updating user OIDC identity (re-login)");

    const uuid = UserIds.toUUID(userId);

    const currentDbUser = await this.getByUserUUID(uuid);

    if (!currentDbUser) {
      throw new Error("User not found");
    }

    const [dbUser] = await executor
      .update(users)
      .set({
        oidcIdentity,
        email: oidcIdentity.email as string,
        emailVerified: oidcIdentity.email_verified ?? false,
        lastAccessedAt: new Date(),
      })
      .where(eq(users.userUuid, uuid))
      .returning();

    if (!dbUser) {
      throw new Error("Failed to update user");
    }

    return this._dbUserToUserPrivate(dbUser);
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
      emailVerified: dbUser.emailVerified ?? false,
      grants: {
        __type: "SiteGrants",
        isStaff: dbUser.oidcIdentity.ed3dsite?.is_staff ?? false,
        isAdmin: dbUser.oidcIdentity.ed3dsite?.is_admin ?? false,

        comments: {
          moderate: dbUser.oidcIdentity.comments?.moderate ?? false,
          post: !!dbUser.emailVerified && !dbUser.oidcIdentity.comments?.no_post,
        },
      },
      lastAccessedAt: dbUser.lastAccessedAt ? dbUser.lastAccessedAt.getTime() : undefined,
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
}
