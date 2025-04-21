import * as OS from "node:os";

import {
  BadRequestError,
  ConflictError,
  InternalServerError,
  ResourceNotFoundError,
} from "@myapp/shared-universal/errors/index.js";
import { sha512_256 } from "@myapp/shared-universal/utils/cryptography.js";
import { stopwatch } from "@myapp/shared-universal/utils/logging.js";
import { type Zxcvbn } from "@myapp/shared-universal/utils/zxcvbn.js";
import * as Argon2 from "argon2";
import * as Paseto from "paseto";
import { type Logger } from "pino";
import { type StaleWhileRevalidate } from "stale-while-revalidate-cache";

import { type InsecureOptionsConfig } from "../../_config/types.js";
import {
  type DBUserEmailVerificationToken,
  type DBUser,
} from "../../_db/models.js";
import {
  USER_EMAIL_VERIFICATION_TOKENS,
  USER_LOCAL_CREDENTIALS,
  USERS,
} from "../../_db/schema/index.js";
import {
  eq,
  and,
  type ExecutorRO,
  type Drizzle,
  type DrizzleRO,
  type Executor,
  sql,
} from "../../lib/datastores/postgres/types.server.js";

import { type UsersServiceConfig } from "./config.js";
import { PASETO_PUBLIC_PREFIX, USER_TOKEN_PREFIX } from "./constants.js";
import {
  type AuthTokenPayload,
  AuthTokenPayloadChecker,
  type BumpTokenSaltRequest,
  type ChangePasswordRequest,
  type CreateUserRequest,
  type CreateUserResult,
  type CredentialLoginRequest,
} from "./schemas.js";

const AUTH_TOKEN_TTL = "30d";

export type GetUserByTokenInput = {
  providedToken: string;
};

export type ValidateEmailInput = {
  userId: string;
  token: string;
};

export class UsersService {
  private readonly logger: Logger;

  constructor(
    logger: Logger,
    private readonly config: UsersServiceConfig,
    private readonly insecureOptionsConfig: InsecureOptionsConfig,
    private readonly memorySwr: StaleWhileRevalidate,
    private readonly db: Drizzle,
    private readonly dbRO: DrizzleRO,
    private readonly zxcvbn: Zxcvbn,
  ) {
    this.logger = logger.child({ context: this.constructor.name });
  }

  async getUserById(id: string, executor?: ExecutorRO): Promise<DBUser | null> {
    executor = executor ?? this.dbRO;
    const logger = this.logger.child({ fn: this.getUserById.name });

    const result = (
      await executor.select().from(USERS).where(eq(USERS.userId, id)).limit(1)
    )[0];

    if (!result) {
      logger.info({ userId: id }, "User not found.");
    }

    return result ?? null;
  }

  async getUserByEmailAddress(
    email: string,
    executor?: ExecutorRO,
  ): Promise<DBUser | null> {
    executor = executor ?? this.dbRO;
    const logger = this.logger.child({ fn: this.getUserByEmailAddress.name });

    const result = (
      await executor.select().from(USERS).where(eq(USERS.email, email)).limit(1)
    )[0];

    if (!result) {
      logger.info({ email }, "User not found.");
    }

    return result ?? null;
  }

  async getUserByToken(
    input: GetUserByTokenInput,
    executor?: DrizzleRO,
  ): Promise<DBUser | null> {
    const logger = this.logger.child({ fn: this.getUserByToken.name });
    executor = executor ?? this.dbRO;

    const tokenCiphertext =
      PASETO_PUBLIC_PREFIX +
      input.providedToken.substring(USER_TOKEN_PREFIX.length);

    const tokenBody = await Paseto.V4.verify(
      tokenCiphertext,
      this.config.auth.accessTokenKeyPair.publicKey,
    );

    if (!AuthTokenPayloadChecker.Check(tokenBody)) {
      logger.warn(
        { validationErrors: AuthTokenPayloadChecker.Errors(tokenBody) },
        "Invalid token payload; denying access.",
      );
      return null;
    }

    const user = await this.getUserById(tokenBody.userId, executor);

    if (!user) {
      logger.warn(
        { userId: tokenBody.userId },
        "User not found for legitimate token.",
      );
      return null;
    }

    if (user.tokenSalt !== tokenBody.salt) {
      logger.warn(
        { userId: user.userId },
        "User token counter mismatch; this token has been invalidated.",
      );
      return null;
    }

    if (!user.active) {
      logger.warn({ userId: user.userId }, "User is not active.");
      return null;
    }

    return user;
  }

  async validateUserCredentials(
    payload: CredentialLoginRequest,
    executor?: ExecutorRO,
  ): Promise<DBUser | null> {
    const logger = this.logger.child({
      fn: this.validateUserCredentials.name,
    });

    executor = executor ?? this.dbRO;

    const user = await this.getUserByEmailAddress(payload.email, executor);

    if (!user) {
      logger.debug(
        { emailHash: sha512_256(payload.email) },
        "User not found by email or username.",
      );
      return null;
    }

    const localCredentials = (
      await executor
        .select()
        .from(USER_LOCAL_CREDENTIALS)
        .where(eq(USER_LOCAL_CREDENTIALS.userId, user.userId))
        .limit(1)
    )[0];

    if (!localCredentials) {
      logger.debug(
        { email: sha512_256(payload.email) },
        "User has no local credentials.",
      );
      return null;
    }

    switch (localCredentials.algorithm) {
      case "argon2":
        if (
          await Argon2.verify(localCredentials.hash, payload.passwordCleartext)
        ) {
          logger.info({ userId: user.userId }, "User credentials validated.");
          return user;
        }
        break;
      default:
        logger.debug(
          { algorithm: localCredentials.algorithm },
          "Unsupported algorithm.",
        );
        return null;
    }

    logger.debug({ userId: user.userId }, "User credentials invalid.");
    return null;
  }

  async makeLoginTokenForUser(
    user: DBUser,
  ): Promise<{ userTokenId: string; tokenCiphertext: string }> {
    const tokenBody: AuthTokenPayload = {
      userId: user.userId,
      salt: user.tokenSalt,
    };

    const userTokenId = crypto.randomUUID();
    const tokenCiphertext = (
      await Paseto.V4.sign(
        tokenBody,
        this.config.auth.accessTokenKeyPair.secretKey,
        {
          jti: userTokenId,
          issuer: OS.hostname(),
          expiresIn: AUTH_TOKEN_TTL,
        },
      )
    ).replace(PASETO_PUBLIC_PREFIX, USER_TOKEN_PREFIX);

    return { userTokenId, tokenCiphertext };
  }

  async TX_createUserWithCredentials(
    payload: CreateUserRequest,
  ): Promise<CreateUserResult> {
    const logger = this.logger.child({
      fn: this.TX_createUserWithCredentials.name,
    });
    const ret = await this.db.transaction(async (tx) => {
      const existingUser = await this.getUserByEmailAddress(payload.email, tx);
      if (existingUser) {
        throw new ConflictError("User already exists.");
      }

      const newUserResult = await this._createUserWithLocalCredentials(
        payload,
        tx,
      );
      logger.info(
        { userId: newUserResult.user.userId },
        "Created new user with local credentials.",
      );

      return newUserResult;
    });

    // TODO:  kick off new user tasks
    // const handle = await this.temporal.start("core", newUserTasks, [
    //   { userId: ret.userId },
    // ]);
    // logger.info(
    //   { userId: ret.userId, workflowId: handle.workflowId },
    //   "Kicked off new user tasks.",
    // );

    return ret;
  }

  async changeUserPassword(
    userId: string,
    input: ChangePasswordRequest,
    executor?: Executor,
  ): Promise<DBUser> {
    executor = executor ?? this.db;
    const logger = this.logger.child({ fn: this.changeUserPassword.name });

    // First validate current password
    const user = await this.getUserById(userId, executor);
    if (!user) {
      throw new ResourceNotFoundError("user", "id", userId);
    }

    const validCredentials = await this.validateUserCredentials(
      {
        email: user.email,
        passwordCleartext: input.currentPassword,
      },
      executor,
    );

    if (!validCredentials) {
      throw new BadRequestError("Current password is incorrect");
    }

    // Attach new credentials
    await this._attachCredentialsToUser(userId, input.newPassword, executor);

    // Bump token salt to invalidate all existing sessions
    return await this.bumpTokenSalt({ userId }, executor);
  }

  private async _createUserWithLocalCredentials(
    { email, passwordCleartext, displayName: username }: CreateUserRequest,
    executor?: Executor,
  ): Promise<CreateUserResult> {
    executor = executor ?? this.db;
    const logger = this.logger.child({
      fn: this._createUserWithLocalCredentials.name,
      emailHash: sha512_256(email),
      username,
    });
    logger.info({ username }, "Creating user with local credentials.");

    return await stopwatch(
      this.logger,
      [this.constructor.name, this._createUserWithLocalCredentials.name].join(
        ".",
      ),
      async () => {
        const { user, emailToken } = await this._createBaseUser(
          email,
          username,
          executor,
        );
        const credential = await this._attachCredentialsToUser(
          user.userId,
          passwordCleartext,
          executor,
        );

        if (credential === null) {
          throw new InternalServerError(
            "User not found after credential attachment.",
          );
        }

        return { user, emailToken };
      },
    );
  }

  private async _createBaseUser(
    email: string,
    displayName: string,
    executor?: Executor,
  ): Promise<CreateUserResult> {
    executor = executor ?? this.db;
    const logger = this.logger.child({ fn: this._createBaseUser.name });
    logger.info("Creating base user.");

    const user = await stopwatch(
      this.logger,
      [this.constructor.name, this._createBaseUser.name].join("."),
      async () => {
        const newUser = (
          await executor
            .insert(USERS)
            .values({
              email: email.toLowerCase().trim(),
              displayName: displayName.trim(),
            })
            .returning()
        )[0];

        if (!newUser) {
          throw new InternalServerError("Failed to create user.");
        }

        return newUser;
      },
    );

    const emailToken = await this._invalidateUserEmail(user.userId, executor);

    return { user, emailToken };
  }

  private async _invalidateUserEmail(
    userId: string,
    executor?: Executor,
  ): Promise<DBUserEmailVerificationToken> {
    executor = executor ?? this.db;
    const logger = this.logger.child({
      fn: this._invalidateUserEmail.name,
      userId,
    });
    logger.info("Invalidating user email.");

    const deletedRows = await executor
      .delete(USER_EMAIL_VERIFICATION_TOKENS)
      .where(eq(USER_EMAIL_VERIFICATION_TOKENS.userId, userId));

    logger.info(
      { deletedRows },
      "Deleted existing user email verification tokens.",
    );

    const inserted = (
      await executor
        .insert(USER_EMAIL_VERIFICATION_TOKENS)
        .values({
          userId,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        })
        .returning()
    )[0];

    if (!inserted) {
      throw new InternalServerError(
        "Failed to save new email verification token.",
      );
    }

    // TODO:  start temporal workflow to send email

    return inserted;
  }

  async validateUserEmail(
    { userId, token }: ValidateEmailInput,
    executor?: Executor,
  ): Promise<DBUser> {
    executor = executor ?? this.db;
    const logger = this.logger.child({
      fn: this.validateUserEmail.name,
      userId,
    });
    logger.info("Validating user email.");

    const user = await executor
      .select()
      .from(USERS)
      .where(eq(USERS.userId, userId))
      .limit(1);

    if (!user) {
      throw new ResourceNotFoundError("user", "id", userId);
    }

    const tokenRow = await executor
      .select()
      .from(USER_EMAIL_VERIFICATION_TOKENS)
      .where(
        and(
          eq(USER_EMAIL_VERIFICATION_TOKENS.userId, userId),
          eq(USER_EMAIL_VERIFICATION_TOKENS.token, token),
        ),
      );

    if (tokenRow.length === 0) {
      throw new BadRequestError("Invalid token.");
    }

    // update emailVerifiedAt
    const retUser = (
      await executor
        .update(USERS)
        .set({ emailVerifiedAt: new Date() })
        .where(eq(USERS.userId, userId))
        .returning()
    )[0];

    if (!retUser) {
      throw new InternalServerError("Failed to verify user email.");
    }

    // delete used verification token
    await executor
      .delete(USER_EMAIL_VERIFICATION_TOKENS)
      .where(
        and(
          eq(USER_EMAIL_VERIFICATION_TOKENS.userId, userId),
          eq(USER_EMAIL_VERIFICATION_TOKENS.token, token),
        ),
      );

    return retUser;
  }

  private async _attachCredentialsToUser(
    userId: string,
    passwordCleartext: string,
    executor?: Executor,
  ) {
    executor = executor ?? this.db;
    const logger = this.logger.child({
      fn: this._attachCredentialsToUser.name,
      userId,
    });

    const passwordStrength = await this.zxcvbn(passwordCleartext);
    if (passwordStrength.score < 2) {
      if (this.insecureOptionsConfig.skipPasswordStrengthCheck) {
        logger.warn(
          { passwordStrength },
          "Password is too weak, but we're skipping the check.",
        );
      } else {
        throw new BadRequestError("Password is too weak.");
      }
    }

    logger.info("Attaching credentials to user.");

    const passwordHash = await Argon2.hash(passwordCleartext);

    const newCredentials = (
      await executor
        .insert(USER_LOCAL_CREDENTIALS)
        .values({
          userId,
          algorithm: "argon2",
          hash: passwordHash,
        })
        .onConflictDoUpdate({
          target: USER_LOCAL_CREDENTIALS.userId,
          set: {
            algorithm: "argon2",
            hash: passwordHash,
          },
        })
        .returning()
    )[0];

    if (!newCredentials) {
      throw new InternalServerError("Failed to attach credentials to user.");
    }

    logger.info({ userId }, "Created new credential.");

    return newCredentials;
  }

  async bumpTokenSalt(
    input: BumpTokenSaltRequest,
    executor?: Executor,
  ): Promise<DBUser> {
    executor = executor ?? this.db;
    const logger = this.logger.child({ fn: this.bumpTokenSalt.name });

    logger.info(
      { userId: input.userId },
      "Bumping token salt to invalidate all tokens",
    );

    const user = (
      await executor
        .update(USERS)
        .set({
          tokenSalt: sql`${USERS.tokenSalt} + 1`,
        })
        .where(eq(USERS.userId, input.userId))
        .returning()
    )[0];

    if (!user) {
      throw new ResourceNotFoundError("user", "id", input.userId);
    }

    return user;
  }
}
