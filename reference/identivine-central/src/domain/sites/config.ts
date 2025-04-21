import { type Static, Type } from "@sinclair/typebox";

export const SitesServiceConfig = Type.Object({
  publicSiteStaleTimeMs: Type.Number(),
  publicSiteCacheTTLMs: Type.Number(),
});
export type SitesServiceConfig = Static<typeof SitesServiceConfig>;
