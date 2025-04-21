import { getSiteIdentitiesActivity } from "./get-site-identities.js";
import { getSitesByTierActivity } from "./get-sites-by-tier.js";

export const SITE_IDENTITY_ACTIVITIES = [
  getSiteIdentitiesActivity,
  getSitesByTierActivity,
];
