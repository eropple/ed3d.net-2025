import gravatarUrl from "gravatar-url";
import { type Logger } from "pino";

import {
  type SiteTier,
  type DBSiteSocialOAuth2Identity,
  type DBSiteATProtoIdentity,
  type DBSiteWebIdentity,
} from "../../_db/models.js";
import {
  SITES,
  SITE_AVATARS,
  SITE_CONTENT_BLOCKS,
  SITE_CONTENT_CONTAINERS,
  SITE_DOMAINS,
  SITE_HEADER_IMAGES,
} from "../../_db/schema/index.js";
import {
  and,
  eq,
  type SQL,
  type DrizzleRO,
} from "../../lib/datastores/postgres/types.server.js";
import { type StringUUID } from "../../lib/ext/typebox.js";
import { type ATProtoIdentityService } from "../atproto/service.js";
import { type ImageLinkSet } from "../images/schemas.js";
import { type MastodonIdentityService } from "../mastodon/service.js";
import { type MastodonIdentityWithApp } from "../mastodon/types.js";
import { OAUTH2_PROVIDER_METADATA } from "../social-identity/providers.js";
import { type SocialIdentityService } from "../social-identity/service.js";
import { type WebIdentityService } from "../web-identity/service.js";

import {
  type SiteMastodonIdentity,
  type SiteSocialOAuth2Identity,
  type SiteWebIdentity,
  type SiteATProtoIdentity,
  type SitePublicInfo,
} from "./schemas/index.js";
import { type SitesService } from "./service.js";

async function fetchSiteBasicInfo(executor: DrizzleRO, where: SQL<unknown>) {
  return executor
    .select({
      siteId: SITES.siteId,
      fqdn: SITE_DOMAINS.fqdn,
      title: SITES.title,
      blurb: SITES.blurb,

      tier: SITES.tier,
      customCapabilities: SITES.customCapabilities,
      settings: SITES.settings,
      customCss: SITES.customCss,
      publishedAt: SITES.publishedAt,
    })
    .from(SITE_DOMAINS)
    .innerJoin(SITES, eq(SITES.siteId, SITE_DOMAINS.siteId))
    .leftJoin(SITE_HEADER_IMAGES, eq(SITE_HEADER_IMAGES.siteId, SITES.siteId))
    .leftJoin(SITE_AVATARS, eq(SITE_AVATARS.siteId, SITES.siteId))
    .where(where);
}

async function fetchContainers(executor: DrizzleRO, siteId: string) {
  return executor
    .select({
      siteContentContainerId: SITE_CONTENT_CONTAINERS.siteContentContainerId,
      title: SITE_CONTENT_CONTAINERS.title,
      order: SITE_CONTENT_CONTAINERS.order,
    })
    .from(SITE_CONTENT_CONTAINERS)
    .where(eq(SITE_CONTENT_CONTAINERS.siteId, siteId))
    .orderBy(SITE_CONTENT_CONTAINERS.order);
}

async function fetchContainerBlocks(executor: DrizzleRO, containerId: string) {
  return executor
    .select()
    .from(SITE_CONTENT_BLOCKS)
    .where(
      and(
        eq(SITE_CONTENT_BLOCKS.siteContentContainerId, containerId),
        eq(SITE_CONTENT_BLOCKS.active, true),
      ),
    )
    .orderBy(SITE_CONTENT_BLOCKS.order);
}

function makeGravatarLinkSet(siteId: StringUUID): ImageLinkSet {
  return {
    fallback: gravatarUrl(siteId, {
      default: "retro",
      rating: "pg",
      size: 256,
    }),
    renditions: {},
  };
}

export async function fetchPublicSite(
  baseLogger: Logger,
  executor: DrizzleRO,
  sitesService: SitesService,
  socialIdentityService: SocialIdentityService,
  mastodonService: MastodonIdentityService,
  atprotoService: ATProtoIdentityService,
  webIdentityService: WebIdentityService,
  where: SQL<unknown>,
): Promise<SitePublicInfo | null> {
  const logger = baseLogger.child({ fn: fetchPublicSite.name });
  logger.debug("Fetching public site info.");

  const siteResult = await fetchSiteBasicInfo(executor, where);
  const site = siteResult[0];
  if (!site) {
    logger.info("Site not found.");
    return null;
  }

  const [avatarImageLinkSet, headerImageLinkSet] = await Promise.all([
    sitesService.getLatestAvatarLinkSet(site.siteId, executor),
    sitesService.getLatestHeaderLinkSet(site.siteId, executor),
  ]);

  const containers = await fetchContainers(executor, site.siteId);
  const containerData = await Promise.all(
    containers.map(async (container) => {
      const blocks = await fetchContainerBlocks(
        executor,
        container.siteContentContainerId,
      );
      return {
        ...container,
        blocks: blocks.map((block) => ({
          siteContentBlockId: block.siteContentBlockId,
          kind: block.blockKind!,
          version: block.blockVersion!,
          settings: block.renderSettings,
        })),
      };
    }),
  );

  const socialIdentities = (
    await socialIdentityService.listIdentities(site.siteId)
  )
    .filter((i) => i.displayOnSite)
    .map(socialIdentityToPublic);

  const mastodonIdentities = (await mastodonService.listIdentities(site.siteId))
    .filter(({ identity }) => identity.displayOnSite)
    .map(mastodonIdentityToPublic);

  const atprotoIdentities = (await atprotoService.listIdentities(site.siteId))
    .filter((i) => i.displayOnSite)
    .map(atprotoIdentityToPublic);

  const webIdentities = (await webIdentityService.listIdentities(site.siteId))
    .filter((i) => i.displayOnSite)
    .map(webIdentityToPublic);

  return {
    ...site,
    bskyDid: atprotoIdentities[0]?.did ?? null,
    publishedAt: site.publishedAt?.toISOString() ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    blurb: site.blurb as any,
    avatarImageLinkSet: avatarImageLinkSet ?? makeGravatarLinkSet(site.siteId),
    headerImageLinkSet: headerImageLinkSet,
    identities: [
      ...socialIdentities,
      ...mastodonIdentities,
      ...atprotoIdentities,
      ...webIdentities,
    ].sort((a, b) => a.order - b.order),
    contentContainers: containerData,
    hidePoweredBy: false,
  };
}

function atprotoIdentityToPublic(
  identity: DBSiteATProtoIdentity,
): SiteATProtoIdentity {
  return {
    kind: "atproto",
    order: identity.order,
    status: identity.status,
    did: identity.did,
    handle: identity.handle,
    directionality: "one-way",
    displayProvider: "Bluesky",
    displayUsername: "@" + identity.handle,
    url: `https://bsky.app/profile/${identity.handle}`,
  } satisfies SiteATProtoIdentity;
}

function socialIdentityToPublic(
  identity: DBSiteSocialOAuth2Identity,
): SiteSocialOAuth2Identity {
  let ret: SiteSocialOAuth2Identity;

  const provider = identity.provider;
  const providerMetadata = OAUTH2_PROVIDER_METADATA[provider];
  let missed: never;
  switch (provider) {
    case "github":
      ret = {
        kind: "social-oauth2",
        order: identity.order,
        provider,
        status: identity.status,
        displayProvider: "GitHub",
        displayUsername: identity.providerUsername,
        directionality: "one-way",
        url: providerMetadata.profileUrl(identity),
      };
      break;
    case "gitlab":
      ret = {
        kind: "social-oauth2",
        order: identity.order,
        provider,
        status: identity.status,
        displayProvider: "GitLab",
        displayUsername: identity.providerUsername,
        directionality: "one-way",
        url: providerMetadata.profileUrl(identity),
      };
      break;
    case "threads":
      ret = {
        kind: "social-oauth2",
        order: identity.order,
        provider,
        status: identity.status,
        displayProvider: "Threads",
        displayUsername: identity.providerUsername,
        directionality: "one-way",
        url: providerMetadata.profileUrl(identity),
      };
      break;
    case "tiktok":
      ret = {
        kind: "social-oauth2",
        order: identity.order,
        provider,
        status: identity.status,
        displayProvider: "TikTok",
        displayUsername: identity.providerUsername,
        directionality: "one-way",
        url: providerMetadata.profileUrl(identity),
      };
      break;
    case "youtube":
      ret = {
        kind: "social-oauth2",
        order: identity.order,
        provider,
        status: identity.status,
        displayProvider: "YouTube",
        displayUsername: identity.providerUsername,
        directionality: "one-way",
        url: providerMetadata.profileUrl(identity),
      };
      break;
    case "twitch":
      ret = {
        kind: "social-oauth2",
        order: identity.order,
        provider,
        status: identity.status,
        displayProvider: "Twitch",
        displayUsername: identity.providerUsername,
        directionality: "one-way",
        url: providerMetadata.profileUrl(identity),
      };
      break;
    default:
      missed = provider;
      throw new Error(`Unknown provider: ${provider}`);
  }

  return ret;
}

function mastodonIdentityToPublic({
  app,
  identity,
}: MastodonIdentityWithApp): SiteMastodonIdentity {
  return {
    kind: "mastodon",
    order: identity.order,
    status: identity.status,
    directionality: "one-way",
    displayProvider: "Mastodon",
    displayUsername: `@${identity.username}@${app.instanceUrl.replace(/^https?:\/\//, "")}`,
    url: `${app.instanceUrl}/@${identity.username}`,
  };
}

function webIdentityToPublic(identity: DBSiteWebIdentity): SiteWebIdentity {
  return {
    kind: "web",
    order: identity.order,
    status: identity.status,
    url: identity.url,
    directionality: "two-way",
    displayProvider: "Website",
    displayUsername: identity.url,
    verificationMethod: identity.verificationMethod,
  };
}
