import { activity } from "../../../../_worker/activity-helpers.js";

export interface GetSiteIdentitiesInput {
  siteId: string;
}

export interface GetSiteIdentitiesOutput {
  social: Array<{ id: string }>;
  mastodon: Array<{ id: string }>;
  atproto: Array<{ id: string }>;
  web: Array<{ id: string; siteId: string }>;
}

export const getSiteIdentitiesActivity = activity("getSiteIdentities", {
  fn: async (
    _context,
    logger,
    deps,
    input: GetSiteIdentitiesInput,
  ): Promise<GetSiteIdentitiesOutput> => {
    const {
      socialIdentity,
      mastodonIdentity: mastodon,
      atprotoIdentity: atproto,
      webIdentity,
    } = deps;

    const [social, mastodonIds, atprotoIds, web] = await Promise.all([
      socialIdentity.listIdentities(input.siteId),
      mastodon.listIdentities(input.siteId),
      atproto.listIdentities(input.siteId),
      webIdentity.listIdentities(input.siteId),
    ]);

    return {
      social: social.map((id) => ({ id: id.socialOAuth2IdentityId })),
      mastodon: mastodonIds.map((id) => ({
        id: id.identity.mastodonIdentityId,
      })),
      atproto: atprotoIds.map((id) => ({ id: id.atprotoIdentityId })),
      web: web.map((id) => ({ id: id.webIdentityId, siteId: input.siteId })),
    };
  },
});
