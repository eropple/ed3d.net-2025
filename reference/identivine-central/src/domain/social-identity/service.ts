import {
  InternalServerError,
  ResourceNotFoundError,
} from "@myapp/shared-universal/errors/index.js";
import { type FetchFn } from "@myapp/shared-universal/utils/fetch.js";
import * as Paseto from "paseto";
import { type Logger } from "pino";

import {
  type InsecureOptionsConfig,
  type UrlsConfig,
} from "../../_config/types.js";
import {
  type SocialOAuth2ProviderKind,
  type DBSite,
  type DBSiteSocialOAuth2Identity,
} from "../../_db/models.js";
import { SITE_SOCIAL_OAUTH2_IDENTITIES } from "../../_db/schema/index.js";
import {
  type DrizzleRO,
  type Drizzle,
  and,
  eq,
} from "../../lib/datastores/postgres/types.server.js";
import { type VaultService } from "../vault/service.js";

import { type SocialIdentityConfig } from "./config.js";
import { type OAuth2Provider } from "./oauth2/providers/base.js";
import { GitHubProvider } from "./oauth2/providers/github.js";
import { GitLabProvider } from "./oauth2/providers/gitlab.js";
import { ThreadsProvider } from "./oauth2/providers/threads.js";
import { TikTokProvider } from "./oauth2/providers/tiktok.js";
import { TwitchProvider } from "./oauth2/providers/twitch.js";
import { YoutubeGoogleProvider } from "./oauth2/providers/youtube.js";
import { exchangeCodeForToken, refreshAccessToken } from "./oauth2/token.js";
import {
  OAUTH2_PROVIDER_METADATA,
  type OAuth2ProviderMetadata,
} from "./providers.js";
import {
  type SocialOAuth2TokenResponse,
  type SocialNormalizedUserInfo,
} from "./schemas.js";

const DEFAULT_OAUTH2_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7;

const PROVIDERS: Record<SocialOAuth2ProviderKind, OAuth2Provider> = {
  github: new GitHubProvider(),
  gitlab: new GitLabProvider(),
  threads: new ThreadsProvider(),
  tiktok: new TikTokProvider(),
  youtube: new YoutubeGoogleProvider(),
  twitch: new TwitchProvider(),
} as const;

export type OAuth2CallbackParams = {
  provider: SocialOAuth2ProviderKind;
  code: string;
  state: string;
};

export class SocialIdentityService {
  private readonly logger: Logger;

  constructor(
    logger: Logger,
    private readonly fetch: FetchFn,
    private readonly urlsConfig: UrlsConfig,
    private readonly socialIdentityConfig: SocialIdentityConfig,
    private readonly insecureConfig: InsecureOptionsConfig,
    private readonly vault: VaultService,
    private readonly db: Drizzle,
    private readonly dbRO: DrizzleRO,
  ) {
    this.logger = logger.child({ context: this.constructor.name });
  }

  async getAuthorizationUrl(
    site: DBSite | { siteId: string },
    provider: SocialOAuth2ProviderKind,
  ): Promise<string> {
    const siteId = typeof site === "string" ? site : site.siteId;
    const logger = this.logger.child({
      fn: this.getAuthorizationUrl.name,
      siteId,
      provider,
    });

    const metadata = OAUTH2_PROVIDER_METADATA[provider];
    const state = await Paseto.V3.encrypt(
      { siteId, provider },
      this.socialIdentityConfig.stateKeyPair.key,
      {
        expiresIn: "5m",
      },
    );

    const params = new URLSearchParams({
      [metadata.clientIdParamName ?? "client_id"]:
        this.socialIdentityConfig.providers[provider].clientId,
      redirect_uri: `${this.urlsConfig.apiBaseUrl}/social-identities/oauth2/${provider}/callback`,
      scope: metadata.scopes.join(metadata.scopeDelimiter ?? " "),
      state,
      response_type: "code",
      ...metadata.extraAuthParams,
    });

    const authUrl = `${metadata.authorizationUrl}?${params.toString()}`;
    logger.info({ siteId }, "Generated OAuth2 authorization URL");

    if (this.insecureConfig.insecurelyLogOAuth2Payloads) {
      logger.fatal(
        { siteId, provider, params, authUrl },
        "INSECURE: OAuth2 authorization url",
      );
    }

    return authUrl;
  }

  async handleOAuth2Callback(
    params: OAuth2CallbackParams,
  ): Promise<DBSiteSocialOAuth2Identity> {
    const logger = this.logger.child({ fn: this.handleOAuth2Callback.name });

    const stateData = (await Paseto.V3.decrypt(
      params.state,
      this.socialIdentityConfig.stateKeyPair.key,
    )) as { siteId: string; provider: SocialOAuth2ProviderKind };

    if (stateData.provider !== params.provider) {
      throw new Error(
        "Invalid OAuth2 state token; state and params provider mismatch",
      );
    }

    logger.info(
      { siteId: stateData.siteId, provider: stateData.provider },
      "Validated OAuth2 state token",
    );

    if (this.insecureConfig.insecurelyLogOAuth2Payloads) {
      logger.fatal(
        { siteId: stateData.siteId, provider: stateData.provider, params },
        "INSECURE: OAuth2 callback payload",
      );
    }

    const metadata = OAUTH2_PROVIDER_METADATA[stateData.provider];
    const providerConfig =
      this.socialIdentityConfig.providers[stateData.provider];

    let tokenData = await exchangeCodeForToken(
      logger,
      this.fetch,
      stateData.provider,
      this.urlsConfig.apiBaseUrl,
      params.code,
      providerConfig.clientId,
      providerConfig.clientSecret,
    );

    if (this.insecureConfig.insecurelyLogOAuth2Payloads) {
      logger.fatal(
        {
          siteId: stateData.siteId,
          provider: stateData.provider,
          tokenData,
        },
        "INSECURE: OAuth2 token response",
      );
    }

    // Special case for Threads: exchange short-lived token for long-lived token
    if (stateData.provider === "threads") {
      const provider = PROVIDERS[stateData.provider] as ThreadsProvider;
      const threadsTokenData = await provider.exchangeForLongLivedToken(
        logger,
        this.fetch,
        tokenData.access_token,
        providerConfig.clientId,
        providerConfig.clientSecret,
        this.insecureConfig.insecurelyLogOAuth2Payloads,
      );

      if (!threadsTokenData) {
        throw new InternalServerError(
          "Threads issue: failed to exchange short-lived token for long-lived token",
        );
      }

      tokenData = {
        ...tokenData,
        ...threadsTokenData,
      };
    }

    await this.db
      .delete(SITE_SOCIAL_OAUTH2_IDENTITIES)
      .where(
        and(
          eq(SITE_SOCIAL_OAUTH2_IDENTITIES.siteId, stateData.siteId),
          eq(SITE_SOCIAL_OAUTH2_IDENTITIES.provider, stateData.provider),
          eq(SITE_SOCIAL_OAUTH2_IDENTITIES.status, "revoked"),
        ),
      );

    const provider = PROVIDERS[stateData.provider];
    const userInfo = await provider.fetchUserInfo(
      logger,
      this.fetch,
      tokenData.access_token,
      this.insecureConfig.insecurelyLogOAuth2Payloads,
    );

    if (!userInfo) {
      logger.error(
        { siteId: stateData.siteId, provider: stateData.provider },
        "Failed to fetch user info",
      );
      throw new Error("Failed to fetch user info");
    }

    if (this.insecureConfig.insecurelyLogOAuth2Payloads) {
      logger.fatal(
        { siteId: stateData.siteId, provider: stateData.provider, userInfo },
        "INSECURE: OAuth2 user info",
      );
    }

    const identity = (
      await this.db
        .insert(SITE_SOCIAL_OAUTH2_IDENTITIES)
        .values({
          siteId: stateData.siteId,
          provider: stateData.provider,
          providerId: userInfo.id,
          providerUsername: userInfo.username,
          status: "verified",
          statusLastCheckedAt: new Date(),
          accessToken: await this.vault.encrypt(tokenData.access_token),
          refreshToken: tokenData.refresh_token
            ? await this.vault.encrypt(tokenData.refresh_token)
            : null,
          lastRefreshedAt: tokenData.refresh_token ? new Date() : null,
          expiresAt: new Date(
            Date.now() +
              (tokenData.expires_in ?? DEFAULT_OAUTH2_EXPIRES_IN_SECONDS) *
                1000,
          ),
          scopes: metadata.scopes,
          providerMetadata: await this.vault.encrypt(userInfo),
          order: 0,
        })
        .returning()
    )[0];

    if (!identity) {
      logger.error(
        { siteId: stateData.siteId, provider: stateData.provider },
        "Failed to create OAuth2 identity",
      );
      throw new Error("Failed to create OAuth2 identity");
    }

    logger.info(
      {
        siteId: identity.siteId,
        provider: identity.provider,
        identityId: identity.socialOAuth2IdentityId,
      },
      "Created new OAuth2 identity",
    );

    return identity;
  }

  async refreshOAuth2Token(
    identity: DBSiteSocialOAuth2Identity,
  ): Promise<DBSiteSocialOAuth2Identity> {
    const logger = this.logger.child({
      fn: this.refreshOAuth2Token.name,
      siteId: identity.siteId,
      provider: identity.provider,
      identityId: identity.socialOAuth2IdentityId,
    });

    const decryptedRefreshToken: string | null = identity.refreshToken
      ? await this.vault.decrypt(identity.refreshToken)
      : null;
    if (!decryptedRefreshToken) {
      logger.warn("No refresh token available");
      throw new Error("No refresh token available");
    }

    const providerConfig =
      this.socialIdentityConfig.providers[identity.provider];
    const tokenData = await refreshAccessToken(
      logger,
      this.fetch,
      identity.provider,
      decryptedRefreshToken,
      providerConfig.clientId,
      providerConfig.clientSecret,
      this.insecureConfig.insecurelyLogOAuth2Payloads,
    );

    const updatedIdentity = (
      await this.db
        .update(SITE_SOCIAL_OAUTH2_IDENTITIES)
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
          statusLastCheckedAt: new Date(),
        })
        .where(
          eq(
            SITE_SOCIAL_OAUTH2_IDENTITIES.socialOAuth2IdentityId,
            identity.socialOAuth2IdentityId,
          ),
        )
        .returning()
    )[0];

    if (!updatedIdentity) {
      logger.error(
        { siteId: identity.siteId, provider: identity.provider },
        "Failed to update OAuth2 identity",
      );
      throw new Error("Failed to update OAuth2 identity");
    }

    logger.info("Successfully refreshed OAuth2 token");
    return updatedIdentity;
  }

  async listIdentities(siteId: string): Promise<DBSiteSocialOAuth2Identity[]> {
    const logger = this.logger.child({
      fn: this.listIdentities.name,
      siteId,
    });

    const identities = await this.dbRO
      .select()
      .from(SITE_SOCIAL_OAUTH2_IDENTITIES)
      .where(eq(SITE_SOCIAL_OAUTH2_IDENTITIES.siteId, siteId));

    logger.debug({ count: identities.length }, "Retrieved OAuth2 identities");

    return identities;
  }

  async deleteIdentity(siteId: string, identityId: string): Promise<void> {
    const logger = this.logger.child({
      fn: this.deleteIdentity.name,
      siteId,
      identityId,
    });

    await this.db
      .delete(SITE_SOCIAL_OAUTH2_IDENTITIES)
      .where(
        and(
          eq(SITE_SOCIAL_OAUTH2_IDENTITIES.siteId, siteId),
          eq(SITE_SOCIAL_OAUTH2_IDENTITIES.socialOAuth2IdentityId, identityId),
        ),
      );

    logger.info("Deleted OAuth2 identity");
  }

  async updateIdentityDisplay(
    siteId: string,
    identityId: string,
    displayOnSite: boolean,
  ): Promise<DBSiteSocialOAuth2Identity> {
    const logger = this.logger.child({
      fn: this.updateIdentityDisplay.name,
      siteId,
      identityId,
    });

    logger.info({ displayOnSite }, "Updating identity display setting");

    const identity = (
      await this.db
        .update(SITE_SOCIAL_OAUTH2_IDENTITIES)
        .set({ displayOnSite })
        .where(
          and(
            eq(SITE_SOCIAL_OAUTH2_IDENTITIES.siteId, siteId),
            eq(
              SITE_SOCIAL_OAUTH2_IDENTITIES.socialOAuth2IdentityId,
              identityId,
            ),
          ),
        )
        .returning()
    )[0];

    if (!identity) {
      throw new ResourceNotFoundError(
        "identity",
        "oauth2IdentityId",
        identityId,
      );
    }

    logger.info({ displayOnSite }, "Updated identity display setting");
    return identity;
  }

  async verifyIdentity(
    identityId: string,
  ): Promise<DBSiteSocialOAuth2Identity> {
    const logger = this.logger.child({ fn: this.verifyIdentity.name });

    const [identity] = await this.dbRO
      .select()
      .from(SITE_SOCIAL_OAUTH2_IDENTITIES)
      .where(
        eq(SITE_SOCIAL_OAUTH2_IDENTITIES.socialOAuth2IdentityId, identityId),
      )
      .limit(1);

    if (!identity) {
      throw new ResourceNotFoundError(
        "identity",
        "oauth2IdentityId",
        identityId,
      );
    }

    const metadata =
      OAUTH2_PROVIDER_METADATA[identity.provider as SocialOAuth2ProviderKind];
    if (!metadata) {
      throw new Error(`Unknown provider: ${identity.provider}`);
    }

    let missed: never;
    switch (metadata.tokenStrategy) {
      case "standard":
        return await this.verifyIdentityStandard(logger, identity, metadata);
      case "threads-long-lived":
        return await this.verifyIdentityThreads(logger, identity);
      default:
        missed = metadata.tokenStrategy;
        throw new Error(`Unknown token strategy: ${missed}`);
    }
  }

  private async verifyIdentityStandard(
    logger: Logger,
    identity: DBSiteSocialOAuth2Identity,
    providerConfig: OAuth2ProviderMetadata,
  ): Promise<DBSiteSocialOAuth2Identity> {
    const provider = PROVIDERS[identity.provider];

    if (identity.refreshToken) {
      const { refreshTokenTimeAgo } = providerConfig;
      if (!refreshTokenTimeAgo || !identity.lastRefreshedAt) {
        throw new Error(
          `Provider ${identity.provider} does not support refresh tokens, but has one somehow?`,
        );
      }

      const cutoff = refreshTokenTimeAgo();

      if (identity.lastRefreshedAt < cutoff) {
        logger.info(
          "Identity last refreshed more than 3 days ago. Attempting to refresh before verifying fully.",
        );

        const refreshAttempt = await this.refreshOAuth2Token(identity);
        if (!refreshAttempt) {
          logger.error(
            "Failed to refresh token. Might be revoked, but we'll continue to userdata to be sure.",
          );
        } else {
          logger.info("Successfully refreshed token (proactively).");
          identity = refreshAttempt;
        }
      }
    }

    try {
      // Try current access token
      let userInfo: SocialNormalizedUserInfo | null =
        await provider.fetchUserInfo(
          logger,
          this.fetch,
          await this.vault.decrypt(identity.accessToken),
          this.insecureConfig.insecurelyLogOAuth2Payloads,
        );

      let tokenData: SocialOAuth2TokenResponse | null = null;

      if (!userInfo) {
        // Token might be expired, try refresh if we have one
        if (identity.refreshToken) {
          const providerConfig =
            this.socialIdentityConfig.providers[identity.provider];
          tokenData = await refreshAccessToken(
            logger,
            this.fetch,
            identity.provider,
            await this.vault.decrypt(identity.refreshToken),
            providerConfig.clientId,
            providerConfig.clientSecret,
            this.insecureConfig.insecurelyLogOAuth2Payloads,
          );

          // Try user info again with new token
          userInfo = await provider.fetchUserInfo(
            logger,
            this.fetch,
            tokenData.access_token,
            this.insecureConfig.insecurelyLogOAuth2Payloads,
          );
        }
      }

      if (userInfo) {
        logger.info("Verified OAuth2 identity; marking as verified");
        // Update tokens and mark verified
        const [newIdentity] = await this.db
          .update(SITE_SOCIAL_OAUTH2_IDENTITIES)
          .set({
            accessToken: tokenData?.access_token
              ? await this.vault.encrypt(tokenData.access_token)
              : undefined,
            refreshToken: tokenData?.refresh_token
              ? await this.vault.encrypt(tokenData.refresh_token)
              : undefined,
            status: "verified",
            statusLastCheckedAt: new Date(),
            providerUsername: userInfo.username,
            providerMetadata: await this.vault.encrypt(userInfo),
          })
          .where(
            eq(
              SITE_SOCIAL_OAUTH2_IDENTITIES.socialOAuth2IdentityId,
              identity.socialOAuth2IdentityId,
            ),
          )
          .returning();

        if (!newIdentity) {
          throw new Error("Failed to update identity");
        }

        return newIdentity;
      } else {
        // If we get here, both access and refresh failed
        logger.warn(
          { identityId: identity.socialOAuth2IdentityId },
          "Failed to verify social identity (soft fail); marking as unverified",
        );
        return await this.markIdentityUnverified(identity);
      }
    } catch (err) {
      logger.error(
        { err, identityId: identity.socialOAuth2IdentityId },
        "Failed to verify social identity (hard fail); marking as unverified",
      );

      return await this.markIdentityUnverified(identity);
    }
  }

  private async verifyIdentityThreads(
    logger: Logger,
    identity: DBSiteSocialOAuth2Identity,
  ): Promise<DBSiteSocialOAuth2Identity> {
    const provider = PROVIDERS[identity.provider] as ThreadsProvider;
    const providerConfig =
      this.socialIdentityConfig.providers[identity.provider];

    try {
      // Check if token is eligible for refresh (>2d old)
      const twoDaysAgo = new Date(Date.now() - 24 * 60 * 60 * 1000 * 2);
      if (identity.lastRefreshedAt && identity.lastRefreshedAt < twoDaysAgo) {
        // Attempt to refresh the long-lived token
        const tokenData = await provider.exchangeForLongLivedToken(
          logger,
          this.fetch,
          await this.vault.decrypt(identity.accessToken),
          providerConfig.clientId,
          providerConfig.clientSecret,
          this.insecureConfig.insecurelyLogOAuth2Payloads,
        );

        if (tokenData) {
          identity = await this.db
            .update(SITE_SOCIAL_OAUTH2_IDENTITIES)
            .set({
              accessToken: await this.vault.encrypt(tokenData.access_token),
              lastRefreshedAt: new Date(),
            })
            .where(
              eq(
                SITE_SOCIAL_OAUTH2_IDENTITIES.socialOAuth2IdentityId,
                identity.socialOAuth2IdentityId,
              ),
            )
            .returning()
            .then((rows) => rows[0]!);
        }
      }

      // Verify user info with current token
      const userInfo = await provider.fetchUserInfo(
        logger,
        this.fetch,
        await this.vault.decrypt(identity.accessToken),
        this.insecureConfig.insecurelyLogOAuth2Payloads,
      );

      if (!userInfo) {
        return this.markIdentityUnverified(identity);
      }

      // Update identity with latest user info
      return await this.db
        .update(SITE_SOCIAL_OAUTH2_IDENTITIES)
        .set({
          status: "verified",
          statusLastCheckedAt: new Date(),
          providerUsername: userInfo.username,
          providerMetadata: await this.vault.encrypt(userInfo),
        })
        .where(
          eq(
            SITE_SOCIAL_OAUTH2_IDENTITIES.socialOAuth2IdentityId,
            identity.socialOAuth2IdentityId,
          ),
        )
        .returning()
        .then((rows) => rows[0]!);
    } catch (err) {
      logger.error(
        { err, identityId: identity.socialOAuth2IdentityId },
        "Failed to verify Threads identity",
      );
      return this.markIdentityUnverified(identity);
    }
  }

  private async markIdentityUnverified(
    identity: DBSiteSocialOAuth2Identity,
  ): Promise<DBSiteSocialOAuth2Identity> {
    const [newIdentity] = await this.db
      .update(SITE_SOCIAL_OAUTH2_IDENTITIES)
      .set({
        status: "unverified",
        statusLastCheckedAt: new Date(),
      })
      .where(
        eq(
          SITE_SOCIAL_OAUTH2_IDENTITIES.socialOAuth2IdentityId,
          identity.socialOAuth2IdentityId,
        ),
      )
      .returning();

    if (!newIdentity) {
      throw new Error("Failed to update identity status");
    }

    return newIdentity;
  }
}
