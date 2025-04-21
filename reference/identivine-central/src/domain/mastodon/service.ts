import {
  InternalServerError,
  ResourceNotFoundError,
} from "@myapp/shared-universal/errors/index.js";
import { type FetchFn } from "@myapp/shared-universal/utils/fetch.js";
import * as Paseto from "paseto";
import { type Logger } from "pino";

import { type UrlsConfig } from "../../_config/types.js";
import {
  type DBMastodonApp,
  type DBSiteMastodonIdentity,
} from "../../_db/models.js";
import {
  MASTODON_APPS,
  SITE_MASTODON_IDENTITIES,
} from "../../_db/schema/index.js";
import {
  type DrizzleRO,
  type Drizzle,
  and,
  eq,
} from "../../lib/datastores/postgres/types.server.js";
import { SocialOAuth2TokenResponseChecker } from "../social-identity/schemas.js";
import { type Sensitive } from "../vault/schemas.js";
import { type VaultService } from "../vault/service.js";

import { type MastodonIdentityConfig } from "./config.js";
import {
  MastodonAppResponseChecker,
  type MastodonUserInfo,
  MastodonUserInfoChecker,
} from "./schemas.js";
import { type MastodonIdentityWithApp } from "./types.js";

const DEFAULT_OAUTH2_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7;

export const APP_MASTODON_SCOPES = ["read"].sort();
export const USER_MASTODON_SCOPES = ["read"].sort();

export class MastodonIdentityService {
  private readonly logger: Logger;

  constructor(
    logger: Logger,
    private readonly fetch: FetchFn,
    private readonly urlsConfig: UrlsConfig,
    private readonly mastodonConfig: MastodonIdentityConfig,
    private readonly vault: VaultService,
    private readonly db: Drizzle,
    private readonly dbRO: DrizzleRO,
  ) {
    this.logger = logger.child({ context: this.constructor.name });
  }

  private _baseSelect(executor: DrizzleRO) {
    return executor
      .select({
        app: MASTODON_APPS,
        identity: SITE_MASTODON_IDENTITIES,
      })
      .from(SITE_MASTODON_IDENTITIES)
      .innerJoin(
        MASTODON_APPS,
        eq(MASTODON_APPS.mastodonAppId, SITE_MASTODON_IDENTITIES.mastodonAppId),
      );
  }

  async getOrCreateApp(instanceUrl: string): Promise<DBMastodonApp> {
    const logger = this.logger.child({
      fn: this.getOrCreateApp.name,
      instanceUrl,
    });

    const appScopesJoined = APP_MASTODON_SCOPES.join(" ");
    const existingApp = await this.dbRO
      .select()
      .from(MASTODON_APPS)
      .where(
        and(
          eq(MASTODON_APPS.instanceUrl, instanceUrl),
          eq(MASTODON_APPS.scopes, appScopesJoined),
          eq(MASTODON_APPS.revoked, false),
        ),
      )
      .limit(1);

    if (existingApp[0]) {
      return existingApp[0];
    }

    logger.info("No existing app found, creating new one");

    const response = await this.fetch(`${instanceUrl}/api/v1/apps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_name: this.mastodonConfig.appName,
        redirect_uris: `${this.urlsConfig.apiBaseUrl}/mastodon/oauth/callback`,
        scopes: APP_MASTODON_SCOPES,
        website: this.urlsConfig.apiBaseUrl,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create Mastodon app: ${response.statusText}`);
    }

    const appData = (await response.json()) as unknown;
    if (!MastodonAppResponseChecker.Check(appData)) {
      const errors = [...MastodonAppResponseChecker.Errors(appData)];
      logger.error(
        { errors },
        "Invalid app registration response from Mastodon server",
      );
      throw new Error("Invalid app registration response from Mastodon server");
    }

    const app = (
      await this.db
        .insert(MASTODON_APPS)
        .values({
          instanceUrl,
          clientId: await this.vault.encrypt(appData.client_id),
          clientSecret: await this.vault.encrypt(appData.client_secret),
          scopes: appScopesJoined,
        })
        .returning()
    )[0];

    if (!app) {
      throw new Error("Failed to create Mastodon app record");
    }

    return app;
  }

  async getIdentity(
    mastodonIdentityId: string,
    executor?: DrizzleRO,
  ): Promise<MastodonIdentityWithApp | null> {
    executor = executor ?? this.dbRO;
    const [identityAndApp] = await executor
      .select({
        app: {
          ...MASTODON_APPS,
        },
        identity: {
          ...SITE_MASTODON_IDENTITIES,
        },
      })
      .from(SITE_MASTODON_IDENTITIES)
      .innerJoin(
        MASTODON_APPS,
        eq(SITE_MASTODON_IDENTITIES.mastodonAppId, MASTODON_APPS.mastodonAppId),
      )
      .where(
        and(
          eq(SITE_MASTODON_IDENTITIES.mastodonIdentityId, mastodonIdentityId),
        ),
      );

    return identityAndApp ?? null;
  }

  async getAuthorizationUrl(
    site: { siteId: string },
    instanceUrl: string,
  ): Promise<string> {
    const logger = this.logger.child({
      fn: this.getAuthorizationUrl.name,
      siteId: site.siteId,
      instanceUrl,
    });

    const app = await this.getOrCreateApp(instanceUrl);
    const clientId = await this.vault.decrypt(app.clientId);

    const state = await Paseto.V3.encrypt(
      { siteId: site.siteId, instanceUrl, appId: app.mastodonAppId },
      this.mastodonConfig.stateKeyPair.key,
      { expiresIn: "5m" },
    );

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${this.urlsConfig.apiBaseUrl}/mastodon/oauth/callback`,
      scope: USER_MASTODON_SCOPES.join(" "),
      response_type: "code",
      state,
    });

    const authUrl = `${instanceUrl}/oauth/authorize?${params.toString()}`;
    logger.info({ authUrl }, "Generated Mastodon authorization URL");

    return authUrl;
  }

  async handleOAuth2Callback(
    code: string,
    state: string,
  ): Promise<MastodonIdentityWithApp> {
    const logger = this.logger.child({ fn: this.handleOAuth2Callback.name });

    const stateData = (await Paseto.V3.decrypt(
      state,
      this.mastodonConfig.stateKeyPair.key,
    )) as { siteId: string; instanceUrl: string; appId: string };

    logger.info(
      { siteId: stateData.siteId, instanceUrl: stateData.instanceUrl },
      "Validated Mastodon state token",
    );

    const app = await this.dbRO
      .select()
      .from(MASTODON_APPS)
      .where(eq(MASTODON_APPS.mastodonAppId, stateData.appId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!app) {
      throw new Error("Invalid app ID in state token");
    }

    const clientId = await this.vault.decrypt(app.clientId);
    const clientSecret = await this.vault.decrypt(app.clientSecret);

    const tokenResponse = await this.fetch(
      `${stateData.instanceUrl}/oauth/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: `${this.urlsConfig.apiBaseUrl}/mastodon/oauth/callback`,
          grant_type: "authorization_code",
          code,
          scope: USER_MASTODON_SCOPES.join(" "),
        }),
      },
    );

    if (!tokenResponse.ok) {
      logger.error(
        { status: tokenResponse.status, err: await tokenResponse.json() },
        "Failed to exchange code for token",
      );
      throw new Error("Failed to exchange code for token");
    }

    const tokenData = (await tokenResponse.json()) as unknown;
    if (!SocialOAuth2TokenResponseChecker.Check(tokenData)) {
      const errors = [...SocialOAuth2TokenResponseChecker.Errors(tokenData)];
      logger.error({ errors }, "Invalid token response from Mastodon server");
      throw new Error("Invalid token response from Mastodon server");
    }

    const userData = await this.getUserData(
      tokenData.access_token,
      app.instanceUrl,
    );

    if (!userData) {
      throw new InternalServerError(
        "Failed to get Mastodon user data with fresh token. Were the right scopes granted?",
      );
    }

    const identity = (
      await this.db
        .insert(SITE_MASTODON_IDENTITIES)
        .values({
          mastodonAppId: app.mastodonAppId,
          siteId: stateData.siteId,
          providerId: userData.id,
          username: userData.username,
          email: userData.email,
          status: "verified",
          statusLastCheckedAt: new Date(),
          accessToken: await this.vault.encrypt(tokenData.access_token),
          refreshToken: tokenData.refresh_token
            ? await this.vault.encrypt(tokenData.refresh_token)
            : null,
          lastRefreshedAt: new Date(),
          expiresAt: new Date(
            Date.now() +
              (tokenData.expires_in ?? DEFAULT_OAUTH2_EXPIRES_IN_SECONDS) *
                1000,
          ),
          scopes: USER_MASTODON_SCOPES,
          providerMetadata: await this.vault.encrypt(userData),
          order: 25001,
        })
        .returning()
    )[0];

    if (!identity) {
      throw new Error("Failed to create Mastodon identity");
    }

    return { app, identity };
  }

  async listIdentities(
    siteId: string,
  ): Promise<Array<MastodonIdentityWithApp>> {
    const logger = this.logger.child({
      fn: this.listIdentities.name,
      siteId,
    });

    const results = await this._baseSelect(this.dbRO).where(
      eq(SITE_MASTODON_IDENTITIES.siteId, siteId),
    );

    logger.debug({ count: results.length }, "Retrieved Mastodon identities");

    return results;
  }

  async deleteIdentity(siteId: string, identityId: string): Promise<void> {
    const logger = this.logger.child({
      fn: this.deleteIdentity.name,
      siteId,
      identityId,
    });

    await this.db
      .delete(SITE_MASTODON_IDENTITIES)
      .where(
        and(
          eq(SITE_MASTODON_IDENTITIES.siteId, siteId),
          eq(SITE_MASTODON_IDENTITIES.mastodonIdentityId, identityId),
        ),
      );

    logger.info("Deleted Mastodon identity");
  }

  async updateIdentityDisplay(
    siteId: string,
    identityId: string,
    displayOnSite: boolean,
  ): Promise<MastodonIdentityWithApp> {
    const logger = this.logger.child({
      fn: this.updateIdentityDisplay.name,
      siteId,
      identityId,
    });

    logger.info({ displayOnSite }, "Updating identity display setting");

    const [result] = await this._baseSelect(this.dbRO)
      .where(
        and(
          eq(SITE_MASTODON_IDENTITIES.siteId, siteId),
          eq(SITE_MASTODON_IDENTITIES.mastodonIdentityId, identityId),
        ),
      )
      .limit(1);

    if (!result) {
      throw new ResourceNotFoundError(
        "identity",
        "mastodonIdentityId",
        identityId,
      );
    }

    const updatedIdentity = (
      await this.db
        .update(SITE_MASTODON_IDENTITIES)
        .set({ displayOnSite })
        .where(eq(SITE_MASTODON_IDENTITIES.mastodonIdentityId, identityId))
        .returning()
    )[0];

    if (!updatedIdentity) {
      throw new Error("Failed to update identity display setting");
    }

    logger.info({ displayOnSite }, "Updated identity display setting");
    return { app: result.app, identity: updatedIdentity };
  }

  async refreshToken(
    identity: DBSiteMastodonIdentity,
  ): Promise<MastodonIdentityWithApp | false> {
    const logger = this.logger.child({
      fn: this.refreshToken.name,
      siteId: identity.siteId,
      identityId: identity.mastodonIdentityId,
    });

    const decryptedRefreshToken = identity.refreshToken
      ? await this.vault.decrypt(identity.refreshToken)
      : null;
    if (!decryptedRefreshToken) {
      logger.warn("No refresh token available");
      throw new Error("No refresh token available");
    }

    const app = await this.dbRO
      .select()
      .from(MASTODON_APPS)
      .where(eq(MASTODON_APPS.mastodonAppId, identity.mastodonAppId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!app) {
      throw new Error("Associated Mastodon app not found");
    }

    const clientId = await this.vault.decrypt(app.clientId);
    const clientSecret = await this.vault.decrypt(app.clientSecret);

    const response = await this.fetch(`${app.instanceUrl}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: decryptedRefreshToken,
        scope: USER_MASTODON_SCOPES.join(" "),
      }),
    });

    if (!response.ok) {
      logger.error(
        { status: response.status, body: await response.text() },
        "Failed to refresh token",
      );

      return false;
    }

    const tokenData = (await response.json()) as unknown;
    if (!SocialOAuth2TokenResponseChecker.Check(tokenData)) {
      const errors = [...SocialOAuth2TokenResponseChecker.Errors(tokenData)];
      logger.error({ errors }, "Invalid token response from Mastodon server");
      throw new Error("Invalid token response from Mastodon server");
    }

    const updatedIdentity = (
      await this.db
        .update(SITE_MASTODON_IDENTITIES)
        .set({
          accessToken: await this.vault.encrypt(tokenData.access_token),
          refreshToken: tokenData.refresh_token
            ? await this.vault.encrypt(tokenData.refresh_token)
            : identity.refreshToken,
          lastRefreshedAt: new Date(),
          expiresAt: new Date(
            Date.now() +
              (tokenData.expires_in ?? DEFAULT_OAUTH2_EXPIRES_IN_SECONDS) *
                1000,
          ),
        })
        .where(
          eq(
            SITE_MASTODON_IDENTITIES.mastodonIdentityId,
            identity.mastodonIdentityId,
          ),
        )
        .returning()
    )[0];

    if (!updatedIdentity) {
      throw new Error("Failed to update Mastodon identity");
    }

    logger.info("Successfully refreshed Mastodon token");
    return { app, identity: updatedIdentity };
  }

  async verifyIdentity(
    mastodonIdentityId: string,
  ): Promise<MastodonIdentityWithApp> {
    const logger = this.logger.child({ fn: this.verifyIdentity.name });

    const identityAndApp = await this.getIdentity(mastodonIdentityId);

    if (!identityAndApp) {
      throw new ResourceNotFoundError(
        "identity",
        "mastodonIdentityId",
        mastodonIdentityId,
      );
    }

    let { app, identity } = identityAndApp;

    if (identity.refreshToken && identity.lastRefreshedAt) {
      const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);
      if (identity.lastRefreshedAt < threeDaysAgo) {
        logger.info(
          "Identity last refreshed more than 3 days ago. Attempting to refresh before verifying fully.",
        );

        const refreshAttempt = await this.refreshToken(identity);
        if (!refreshAttempt) {
          logger.error(
            "Failed to refresh token. Might be revoked, but we'll continue to userdata to be sure.",
          );
        } else {
          logger.info("Successfully refreshed token (proactively).");
          app = refreshAttempt.app;
          identity = refreshAttempt.identity;
        }
      }
    }

    let userData: false | MastodonUserInfo = await this.getUserData(
      await this.vault.decrypt(identity.accessToken),
      app.instanceUrl,
    );

    if (userData) {
      logger.info("Successful user-info fetch from Mastodon server.");
    } else {
      logger.info(
        "Failed to fetch user data from cached access token. Need to attempt a refresh.",
      );

      const refreshAttempt = await this.refreshToken(identity);
      if (!refreshAttempt) {
        logger.error("Failed to refresh token. Probably revoked.");
      } else {
        userData = await this.getUserData(
          await this.vault.decrypt(refreshAttempt.identity.accessToken),
          refreshAttempt.app.instanceUrl,
        );
      }
    }

    if (!userData) {
      logger.info(
        "Failed to fetch user data from Mastodon server. Marking as unverified.",
      );
      await this.db
        .update(SITE_MASTODON_IDENTITIES)
        .set({
          status: "unverified",
          statusLastCheckedAt: new Date(),
        })
        .where(
          eq(
            SITE_MASTODON_IDENTITIES.mastodonIdentityId,
            identity.mastodonIdentityId,
          ),
        );
    } else {
      logger.info(
        "Successful user-info fetch from Mastodon server. Marking as verified.",
      );
      await this.db
        .update(SITE_MASTODON_IDENTITIES)
        .set({
          username: userData.username,
          status: "verified",
          statusLastCheckedAt: new Date(),
        })
        .where(
          eq(
            SITE_MASTODON_IDENTITIES.mastodonIdentityId,
            identity.mastodonIdentityId,
          ),
        );
    }

    const resultIdentity = await this.getIdentity(mastodonIdentityId);
    if (!resultIdentity) {
      throw new Error("Failed to get identity after verification");
    }

    return resultIdentity;
  }

  private async getUserData(
    accessToken: string,
    instanceUrl: string,
  ): Promise<false | MastodonUserInfo> {
    const logger = this.logger.child({
      fn: this.getUserData.name,
      instanceUrl,
    });
    const userResponse = await this.fetch(
      `${instanceUrl}/api/v1/accounts/verify_credentials`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!userResponse.ok) {
      logger.error(
        { status: userResponse.status, err: await userResponse.json() },
        "Failed to fetch user info",
      );
      return false;
    }

    const userData = (await userResponse.json()) as unknown;
    if (!MastodonUserInfoChecker.Check(userData)) {
      const errors = [...MastodonUserInfoChecker.Errors(userData)];
      logger.error(
        { errors },
        "Invalid user info response from Mastodon server",
      );
      throw new Error("Invalid user info response from Mastodon server");
    }

    return userData;
  }
}
