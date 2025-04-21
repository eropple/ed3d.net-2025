import { ResourceNotFoundError } from "@myapp/shared-universal/errors/index.js";
import { type Logger } from "pino";

import { SITES } from "../../_db/schema/index.js";
import {
  type DrizzleRO,
  type SQL,
} from "../../lib/datastores/postgres/types.server.js";
import { eq } from "../../lib/datastores/postgres/types.server.js";
import { type ATProtoIdentityService } from "../atproto/service.js";
import { type MastodonIdentityService } from "../mastodon/service.js";
import { type SocialIdentityService } from "../social-identity/service.js";
import { type WebIdentityService } from "../web-identity/service.js";

import { fetchPublicSite } from "./public-sites.js";
import { type SitePrivateInfo } from "./schemas/index.js";
import { type SitesService } from "./service.js";
import {
  SITE_ABILITIES_BY_TIER,
  type SiteCapability,
  type SiteAbilitiesForTier,
} from "./tiers.js";

export async function fetchPrivateSite(
  baseLogger: Logger,
  executor: DrizzleRO,
  sitesService: SitesService,
  socialIdentityService: SocialIdentityService,
  mastodonService: MastodonIdentityService,
  atprotoService: ATProtoIdentityService,
  webIdentityService: WebIdentityService,
  where: SQL<unknown>,
): Promise<SitePrivateInfo | null> {
  const logger = baseLogger.child({ fn: fetchPrivateSite.name });
  logger.debug("Fetching private site info.");

  const publicSite = await fetchPublicSite(
    logger,
    executor,
    sitesService,
    socialIdentityService,
    mastodonService,
    atprotoService,
    webIdentityService,
    where,
  );

  if (!publicSite) {
    return null;
  }

  const [site] = await executor
    .select({
      tier: SITES.tier,
      customCapabilities: SITES.customCapabilities,
      ownerUserId: SITES.userId,
      createdAt: SITES.createdAt,
      updatedAt: SITES.updatedAt,
    })
    .from(SITES)
    .where(eq(SITES.siteId, publicSite.siteId));

  if (!site) {
    throw new ResourceNotFoundError("site", "siteId", publicSite.siteId);
  }

  const abilities = SITE_ABILITIES_BY_TIER[site.tier];
  const retAbilities: SiteAbilitiesForTier = {
    ...abilities,
    capabilityFlags: [
      ...abilities.capabilityFlags,
      // TODO: go deal with this later
      ...(site.customCapabilities as SiteCapability[]),
    ],
  };

  return {
    ...publicSite,
    ownerUserId: site.ownerUserId,
    abilities: retAbilities,
    createdAt: site.createdAt.toISOString(),
  };
}
