import { schemaType } from "@eropple/fastify-openapi3";
import { type Static, Type } from "@sinclair/typebox";

import { SiteTier } from "../../_db/models.js";
import { StringEnum, UnionOneOf } from "../../lib/ext/typebox.js";

export const SiteCapability = schemaType(
  "SiteCapability",
  StringEnum(["base", "full-icon-picker", "irl-verify"]),
);
export type SiteCapability = Static<typeof SiteCapability>;

export const SiteLimits = schemaType(
  "SiteLimits",
  Type.Object({
    maxContentBlocks: Type.Number(),
    maxSocialIdentities: Type.Number(),
    maxWebIdentities: Type.Number(),
    maxMastodonIdentities: Type.Number(),
  }),
);
export type SiteLimits = Static<typeof SiteLimits>;

export const SiteAbilitiesForTier = schemaType(
  "SiteAbilitiesForTier",
  Type.Object({
    tier: SiteTier,
    capabilityFlags: Type.Array(SiteCapability),
    limits: SiteLimits,
  }),
);
export type SiteAbilitiesForTier = Static<typeof SiteAbilitiesForTier>;

const STANDARD_CAPS: SiteCapability[] = ["base"] as const;
const PLUS_CAPS: SiteCapability[] = [
  ...STANDARD_CAPS,
  "full-icon-picker",
] as const;
const PROFESSIONAL_CAPS: SiteCapability[] = [
  ...PLUS_CAPS,
  "irl-verify",
] as const;
export const SITE_ABILITIES_BY_TIER: Record<SiteTier, SiteAbilitiesForTier> = {
  standard: {
    tier: "standard",
    capabilityFlags: STANDARD_CAPS,
    limits: {
      maxContentBlocks: 3,
      maxSocialIdentities: 3,
      maxWebIdentities: 1,
      maxMastodonIdentities: 1,
    },
  },
  plus: {
    tier: "plus",
    capabilityFlags: PLUS_CAPS,
    limits: {
      maxContentBlocks: 6,
      maxSocialIdentities: 5,
      maxWebIdentities: 3,
      maxMastodonIdentities: 2,
    },
  },
  professional: {
    tier: "professional",
    capabilityFlags: PROFESSIONAL_CAPS,
    limits: {
      maxContentBlocks: 20,
      maxSocialIdentities: 20,
      maxWebIdentities: 5,
      maxMastodonIdentities: 5,
    },
  },
} as const;
