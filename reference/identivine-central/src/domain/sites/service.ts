import {
  BadRequestError,
  ForbiddenError,
  InternalServerError,
  ResourceNotFoundError,
} from "@myapp/shared-universal/errors/index.js";
import { type Logger } from "pino";
import { type StaleWhileRevalidate } from "stale-while-revalidate-cache";

import {
  type ReorderIdentityRequest,
  type SiteBasicInfoUpdate,
} from "../../_api/routes/sites/schemas.js";
import { type SiteTier, type DBSite } from "../../_db/models.js";
import {
  SITE_ATPROTO_IDENTITIES,
  SITE_AVATARS,
  SITE_DOMAINS,
  SITE_HEADER_IMAGES,
  SITE_MASTODON_IDENTITIES,
  SITE_SOCIAL_OAUTH2_IDENTITIES,
  SITE_WEB_IDENTITIES,
  SITES,
} from "../../_db/schema/index.js";
import {
  eq,
  desc,
  type Drizzle,
  type DrizzleRO,
  sql,
  and,
  gt,
} from "../../lib/datastores/postgres/types.server.js";
import { type ATProtoIdentityService } from "../atproto/service.js";
import { type ImageLinkSet } from "../images/schemas.js";
import { type ImagesService } from "../images/service.js";
import { type MastodonIdentityService } from "../mastodon/service.js";
import { type SocialIdentityService } from "../social-identity/service.js";
import { type WebIdentityService } from "../web-identity/service.js";

import { type SitesServiceConfig } from "./config.js";
import { fetchPrivateSite } from "./private-sites.js";
import { fetchPublicSite } from "./public-sites.js";
import { type SitePrivateInfo, type SitePublicInfo } from "./schemas/index.js";
import {
  type SiteSettings,
  SiteSettingsChecker,
  type SiteSettingsPatchInput,
} from "./schemas/site-settings.js";

export class SitesService {
  private readonly logger: Logger;

  constructor(
    logger: Logger,
    private readonly sitesServiceConfig: SitesServiceConfig,
    private readonly db: Drizzle,
    private readonly dbRO: DrizzleRO,
    private readonly redisSwr: StaleWhileRevalidate,
    private readonly socialIdentityService: SocialIdentityService,
    private readonly mastodonService: MastodonIdentityService,
    private readonly atprotoService: ATProtoIdentityService,
    private readonly webIdentityService: WebIdentityService,
    private readonly imagesService: ImagesService,
  ) {
    this.logger = logger.child({ context: this.constructor.name });
  }

  async ensureUserCanManageSite(
    userId: string,
    siteId: string,
    executor?: DrizzleRO,
  ): Promise<DBSite> {
    const logger = this.logger.child({ fn: this.ensureUserCanManageSite.name });
    executor = executor ?? this.dbRO;

    const [site] = await executor
      .select()
      .from(SITES)
      .where(eq(SITES.siteId, siteId))
      .limit(1);

    if (!site) {
      throw new ResourceNotFoundError("site", "siteId", siteId);
    }

    if (site.userId !== userId) {
      throw new ForbiddenError("User may not manage this site");
    }

    return site;
  }

  async getPublicSiteByFQDN(
    fqdn: string,
    executor?: DrizzleRO,
    skipCache?: boolean,
  ): Promise<SitePublicInfo | null> {
    const logger = this.logger.child({ fn: this.getPublicSiteByFQDN.name });
    executor = executor ?? this.dbRO;

    const impl = async () =>
      fetchPublicSite(
        logger.child({ fqdn }),
        executor,
        this,
        this.socialIdentityService,
        this.mastodonService,
        this.atprotoService,
        this.webIdentityService,
        eq(SITE_DOMAINS.fqdn, fqdn),
      );

    if (skipCache) {
      return impl();
    } else {
      const key = `site:${fqdn}`;
      const ret = await this.redisSwr(key, impl, {
        minTimeToStale: this.sitesServiceConfig.publicSiteStaleTimeMs,
        maxTimeToLive: this.sitesServiceConfig.publicSiteCacheTTLMs,
      });

      if (!ret.value) {
        await this.redisSwr.delete(key);
      }

      return ret.value;
    }
  }

  async getPublicSiteById(
    siteId: string,
    executor?: DrizzleRO,
    skipCache?: boolean,
  ): Promise<SitePublicInfo | null> {
    const logger = this.logger.child({ fn: this.getPublicSiteById.name });
    executor = executor ?? this.dbRO;

    const impl = async () =>
      fetchPublicSite(
        logger.child({ siteId }),
        executor,
        this,
        this.socialIdentityService,
        this.mastodonService,
        this.atprotoService,
        this.webIdentityService,
        eq(SITES.siteId, siteId),
      );

    if (skipCache) {
      return impl();
    } else {
      const key = `site:${siteId}`;
      const ret = await this.redisSwr(key, impl, {
        minTimeToStale: this.sitesServiceConfig.publicSiteStaleTimeMs,
        maxTimeToLive: this.sitesServiceConfig.publicSiteCacheTTLMs,
      });

      if (!ret.value) {
        await this.redisSwr.delete(key);
      }
      return ret.value;
    }
  }

  async getPrivateSiteById(
    siteId: string,
    executor?: DrizzleRO,
  ): Promise<SitePrivateInfo | null> {
    const logger = this.logger.child({ fn: this.getPrivateSiteById.name });
    executor = executor ?? this.dbRO;

    return await fetchPrivateSite(
      logger.child({ siteId }),
      executor,
      this,
      this.socialIdentityService,
      this.mastodonService,
      this.atprotoService,
      this.webIdentityService,
      eq(SITES.siteId, siteId),
    );
  }

  async getFQDNFromSiteId(
    siteId: string,
    executor?: DrizzleRO,
  ): Promise<string> {
    const logger = this.logger.child({ fn: this.getFQDNFromSiteId.name });
    executor = executor ?? this.dbRO;

    const [site] = await executor
      .select({
        fqdn: SITE_DOMAINS.fqdn,
      })
      .from(SITES)
      .innerJoin(SITE_DOMAINS, eq(SITE_DOMAINS.siteId, SITES.siteId))
      .where(eq(SITES.siteId, siteId))
      .limit(1);

    if (!site) {
      throw new ResourceNotFoundError("site", "siteId", siteId);
    }

    return site.fqdn;
  }

  async getSiteById(
    siteId: string,
    executor?: DrizzleRO,
  ): Promise<DBSite | null> {
    const logger = this.logger.child({ fn: this.getSiteById.name, siteId });
    executor = executor ?? this.dbRO;

    const site = await executor
      .select()
      .from(SITES)
      .where(eq(SITES.siteId, siteId))
      .limit(1);

    return site[0] ?? null;
  }

  async getSiteByUserId(
    userId: string | { userId: string },
    executor?: DrizzleRO,
  ): Promise<DBSite> {
    const logger = this.logger.child({ fn: this.getSiteByUserId.name });
    executor = executor ?? this.dbRO;

    const id = typeof userId === "string" ? userId : userId.userId;

    const site = await executor
      .select()
      .from(SITES)
      .where(eq(SITES.userId, id))
      .limit(1);

    if (!site[0]) {
      throw new ResourceNotFoundError("site", "userId", id);
    }

    return site[0];
  }

  async getSiteIdsByTier(
    tier: SiteTier,
    limit: number,
    offset: number,
  ): Promise<{ siteIds: string[] }> {
    const logger = this.logger.child({ fn: this.getSiteIdsByTier.name });

    const sites = await this.dbRO
      .select({ siteId: SITES.siteId })
      .from(SITES)
      .where(eq(SITES.tier, tier))
      .orderBy(SITES.siteId)
      .limit(limit)
      .offset(offset);

    return {
      siteIds: sites.map((s) => s.siteId),
    };
  }

  async getLatestAvatarImageId(
    siteId: string,
    executor?: DrizzleRO,
  ): Promise<string | null> {
    executor = executor ?? this.dbRO;
    const [latest] = await executor
      .select({ imageId: SITE_AVATARS.imageId })
      .from(SITE_AVATARS)
      .where(eq(SITE_AVATARS.siteId, siteId))
      .orderBy(desc(SITE_AVATARS.createdAt))
      .limit(1);

    return latest?.imageId ?? null;
  }

  async getLatestAvatarLinkSet(
    siteId: string,
    executor?: DrizzleRO,
  ): Promise<ImageLinkSet | null> {
    const key = `site:${siteId}:avatar`;
    const result = await this.redisSwr(
      key,
      async () => {
        const imageId = await this.getLatestAvatarImageId(siteId, executor);
        if (!imageId) return null;

        return this.imagesService.getImageLinkSetById(imageId, executor);
      },
      {
        minTimeToStale: this.sitesServiceConfig.publicSiteStaleTimeMs,
        maxTimeToLive: this.sitesServiceConfig.publicSiteCacheTTLMs,
      },
    );

    return result.value;
  }

  async updateAvatar(
    userId: string,
    siteId: string,
    imageUploadId: string,
  ): Promise<void> {
    const logger = this.logger.child({ fn: this.updateAvatar.name });

    const { imageId } = await this.imagesService.completeUpload(
      userId,
      siteId,
      imageUploadId,
    );

    const image = await this.imagesService.getImageById(imageId);
    if (
      !image ||
      image.siteId !== siteId ||
      image.bucket !== "user-public-content"
    ) {
      throw new BadRequestError("Invalid image for avatar update");
    }

    await this.db.insert(SITE_AVATARS).values({
      siteId,
      imageId,
    });

    logger.info({ siteId, imageId }, "Updated site avatar");
    await this.invalidateCache(siteId);
  }

  async getLatestHeaderImageId(
    siteId: string,
    executor?: DrizzleRO,
  ): Promise<string | null> {
    executor = executor ?? this.dbRO;
    const [latest] = await executor
      .select({ imageId: SITE_HEADER_IMAGES.imageId })
      .from(SITE_HEADER_IMAGES)
      .where(eq(SITE_HEADER_IMAGES.siteId, siteId))
      .orderBy(desc(SITE_HEADER_IMAGES.createdAt))
      .limit(1);

    return latest?.imageId ?? null;
  }

  async getLatestHeaderLinkSet(
    siteId: string,
    executor?: DrizzleRO,
  ): Promise<ImageLinkSet | null> {
    const key = `site:${siteId}:header`;
    const result = await this.redisSwr(
      key,
      async () => {
        const imageId = await this.getLatestHeaderImageId(siteId, executor);
        if (!imageId) return null;

        return this.imagesService.getImageLinkSetById(imageId, executor);
      },
      {
        minTimeToStale: this.sitesServiceConfig.publicSiteStaleTimeMs,
        maxTimeToLive: this.sitesServiceConfig.publicSiteCacheTTLMs,
      },
    );

    return result.value;
  }

  async invalidateCache(siteId: string): Promise<void> {
    const logger = this.logger.child({ fn: this.invalidateCache.name });
    const fqdn = await this.getFQDNFromSiteId(siteId);
    await this.redisSwr.delete(`site:${siteId}`);
    await this.redisSwr.delete(`site:${siteId}:avatar`);
    await this.redisSwr.delete(`site:${fqdn}`);
    logger.info({ fqdn }, "invalidated cache");
  }

  async updateBasicInfo(
    siteId: string,
    update: SiteBasicInfoUpdate,
    executor?: Drizzle,
  ) {
    const logger = this.logger.child({ fn: "updateBasicInfo", siteId });
    executor = executor ?? this.db;

    const [site] = await executor
      .update(SITES)
      .set({
        title: update.title,
      })
      .where(eq(SITES.siteId, siteId))
      .returning();

    if (!site) {
      throw new ResourceNotFoundError("site", "siteId", siteId);
    }

    logger.info({ title: site.title }, "Updated site basic info");
    return site;
  }

  async updateSiteSettings(
    siteId: string,
    patchInput: SiteSettingsPatchInput,
    executor?: Drizzle,
  ): Promise<DBSite> {
    const logger = this.logger.child({ fn: "updateSiteSettings", siteId });
    executor = executor ?? this.db;

    const existingSite = await this.getSiteById(siteId, executor);
    if (!existingSite) {
      throw new ResourceNotFoundError("site", "siteId", siteId);
    }

    const newSettings: SiteSettings = {
      ...existingSite.settings,
      ...patchInput,
    };

    if (!SiteSettingsChecker.Check(newSettings)) {
      logger.error(
        { attemptedNewSettings: newSettings },
        "Invalid site settings",
      );
      throw new BadRequestError(
        "Invalid site settings: " +
          JSON.stringify([...SiteSettingsChecker.Errors(newSettings)]),
      );
    }

    const [site] = await executor
      .update(SITES)
      .set({
        settings: newSettings,
      })
      .where(eq(SITES.siteId, siteId))
      .returning();

    if (!site) {
      throw new ResourceNotFoundError("site", "siteId", siteId);
    }

    logger.info({ settings: site.settings }, "Updated site settings");
    return site;
  }

  async reorderIdentity(
    siteId: string,
    {
      kind,
      identityId,
      afterIdentityId,
      afterIdentityKind,
    }: ReorderIdentityRequest,
  ): Promise<void> {
    const logger = this.logger.child({ fn: this.reorderIdentity.name });

    logger.info(
      {
        kind,
        identityId,
        afterIdentityId,
        afterIdentityKind,
      },
      "Reordering identities.",
    );

    // Get all identities with their orders
    const [
      atprotoIdentities,
      mastodonIdentities,
      socialIdentities,
      webIdentities,
    ] = await Promise.all([
      this.atprotoService.listIdentities(siteId),
      this.mastodonService.listIdentities(siteId),
      this.socialIdentityService.listIdentities(siteId),
      this.webIdentityService.listIdentities(siteId),
    ]);

    // Combine all identities for order calculation
    const allIdentities = [
      ...atprotoIdentities.map((i) => ({
        type: "atproto" as const,
        id: i.atprotoIdentityId,
        order: i.order,
      })),
      ...mastodonIdentities.map((i) => ({
        type: "mastodon" as const,
        id: i.identity.mastodonIdentityId,
        order: i.identity.order,
      })),
      ...socialIdentities.map((i) => ({
        type: "social" as const,
        id: i.socialOAuth2IdentityId,
        order: i.order,
      })),
      ...webIdentities.map((i) => ({
        type: "web" as const,
        id: i.webIdentityId,
        order: i.order,
      })),
    ].sort((a, b) => a.order - b.order);

    const identityIndex = allIdentities.findIndex((i) => i.id === identityId);
    if (identityIndex === -1) {
      logger.fatal(
        { searchedIdentityId: identityId, items: allIdentities },
        "Could not find identity post-ordering",
      );
      throw new Error(`After sort, could not find identity ${identityId}`);
    }
    const originalOrder = allIdentities[identityIndex]!.order;

    // Calculate new order value
    let newOrder: number;
    if (!afterIdentityId) {
      newOrder = (allIdentities[0]?.order ?? 0) - 1;
    } else {
      const afterIndex = allIdentities.findIndex(
        (i) => i.id === afterIdentityId,
      );
      if (afterIndex === -1) {
        throw new Error(`Could not find after-identity ${afterIdentityId}`);
      }

      const afterItem = allIdentities[afterIndex];
      const nextItem = allIdentities[afterIndex + 1];

      const afterOrder = afterItem?.order ?? 0;
      const nextOrder = nextItem?.order ?? afterOrder + 1;

      newOrder = (afterOrder + nextOrder) / 2;
    }

    logger.info(
      {
        reorderedIdentityId: identityId,
        reorderedIdentityKind: kind,
        afterIdentityId,
        afterIdentityKind,
        originalOrder,
        newOrder,
      },
      "Order established for identities.",
    );

    switch (kind) {
      case "atproto":
        await this.db
          .update(SITE_ATPROTO_IDENTITIES)
          .set({ order: newOrder })
          .where(eq(SITE_ATPROTO_IDENTITIES.atprotoIdentityId, identityId));
        break;
      case "mastodon":
        await this.db
          .update(SITE_MASTODON_IDENTITIES)
          .set({ order: newOrder })
          .where(eq(SITE_MASTODON_IDENTITIES.mastodonIdentityId, identityId));
        break;
      case "social":
        await this.db
          .update(SITE_SOCIAL_OAUTH2_IDENTITIES)
          .set({ order: newOrder })
          .where(
            eq(
              SITE_SOCIAL_OAUTH2_IDENTITIES.socialOAuth2IdentityId,
              identityId,
            ),
          );
        break;
      case "web":
        await this.db
          .update(SITE_WEB_IDENTITIES)
          .set({ order: newOrder })
          .where(eq(SITE_WEB_IDENTITIES.webIdentityId, identityId));
        break;
    }

    logger.info({ type: kind, identityId, newOrder }, "Reordered identity");
    await this.normalizeIdentityOrder(siteId);
  }

  async normalizeIdentityOrder(siteId: string): Promise<void> {
    const logger = this.logger.child({ fn: this.normalizeIdentityOrder.name });

    const [
      atprotoIdentities,
      mastodonIdentities,
      socialIdentities,
      webIdentities,
    ] = await Promise.all([
      this.atprotoService.listIdentities(siteId),
      this.mastodonService.listIdentities(siteId),
      this.socialIdentityService.listIdentities(siteId),
      this.webIdentityService.listIdentities(siteId),
    ]);

    // Combine all identities with their type info for updating
    const allIdentities = [
      ...atprotoIdentities.map((i) => ({
        type: "atproto" as const,
        id: i.atprotoIdentityId,
        order: i.order,
        date: i.statusLastCheckedAt,
      })),
      ...mastodonIdentities.map((i) => ({
        type: "mastodon" as const,
        id: i.identity.mastodonIdentityId,
        order: i.identity.order,
        date: i.identity.statusLastCheckedAt,
      })),
      ...socialIdentities.map((i) => ({
        type: "social" as const,
        id: i.socialOAuth2IdentityId,
        order: i.order,
        date: i.statusLastCheckedAt,
      })),
      ...webIdentities.map((i) => ({
        type: "web" as const,
        id: i.webIdentityId,
        order: i.order,
        date: i.statusLastCheckedAt,
      })),
    ].sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      return a.date.getTime() - b.date.getTime();
    });

    // Reassign orders in increments of 1000
    const updates = allIdentities.map((identity, index) => ({
      ...identity,
      newOrder: (index + 1) * 1000,
    }));

    // Batch update all identity types
    await Promise.all([
      // Update ATProto identities
      ...updates
        .filter((u) => u.type === "atproto")
        .map((u) =>
          this.db
            .update(SITE_ATPROTO_IDENTITIES)
            .set({ order: u.newOrder })
            .where(eq(SITE_ATPROTO_IDENTITIES.atprotoIdentityId, u.id)),
        ),
      // Update Mastodon identities
      ...updates
        .filter((u) => u.type === "mastodon")
        .map((u) =>
          this.db
            .update(SITE_MASTODON_IDENTITIES)
            .set({ order: u.newOrder })
            .where(eq(SITE_MASTODON_IDENTITIES.mastodonIdentityId, u.id)),
        ),
      // Update Social OAuth2 identities
      ...updates
        .filter((u) => u.type === "social")
        .map((u) =>
          this.db
            .update(SITE_SOCIAL_OAUTH2_IDENTITIES)
            .set({ order: u.newOrder })
            .where(
              eq(SITE_SOCIAL_OAUTH2_IDENTITIES.socialOAuth2IdentityId, u.id),
            ),
        ),
      // Update Web identities
      ...updates
        .filter((u) => u.type === "web")
        .map((u) =>
          this.db
            .update(SITE_WEB_IDENTITIES)
            .set({ order: u.newOrder })
            .where(eq(SITE_WEB_IDENTITIES.webIdentityId, u.id)),
        ),
    ]);

    logger.info(
      { identityCount: allIdentities.length },
      "Normalized identity orders",
    );
    await this.invalidateCache(siteId);
  }
}
