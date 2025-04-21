import { AJV } from "@myapp/shared-universal/utils/ajv.js";
import { Type } from "@sinclair/typebox";
import fp from "fastify-plugin";
import sleep from "sleep-promise";

import { transformATProtoIdentityToAPIResponse } from "../../../domain/atproto/helpers.js";
import { transformMastodonIdentityToAPIResponse } from "../../../domain/mastodon/helpers.js";
import {
  SitePrivateInfo,
  SitePublicInfo,
} from "../../../domain/sites/schemas/index.js";
import { SiteSettingsPatchInput } from "../../../domain/sites/schemas/site-settings.js";
import { transformSocialIdentityToAPIResponse } from "../../../domain/social-identity/helpers.js";
import { transformWebIdentityToAPIResponse } from "../../../domain/web-identity/helpers.js";
import { StringUUID } from "../../../lib/ext/typebox.js";
import { OKResponse } from "../../http/schemas.js";
import { USER_TOKEN_SECURITY, withSite } from "../../http/security/index.js";
import { type AppFastify } from "../../http/type-providers.js";

import {
  AvatarUploadCompleteRequest,
  ListAllIdentitiesResponse,
  ReorderIdentityRequest,
  SiteBasicInfoUpdate,
} from "./schemas.js";

async function siteRoutes(fastify: AppFastify) {
  fastify.get<{
    Params: { siteId: string };
  }>(
    "/sites/:siteId",
    {
      schema: {
        params: Type.Object({
          siteId: StringUUID,
        }),
        response: {
          200: SitePrivateInfo,
        },
      },
      oas: {
        operationId: "getSiteById",
        summary: "Get site by ID",
        tags: ["sites"],
        security: USER_TOKEN_SECURITY,
      },
    },
    withSite(async (_user, site, request) => {
      const { sites } = request.deps;

      return await sites.getPrivateSiteById(site.siteId);
    }),
  );

  fastify.patch<{
    Params: { siteId: string };
    Body: SiteBasicInfoUpdate;
  }>(
    "/sites/:siteId",
    {
      schema: {
        params: Type.Object({
          siteId: StringUUID,
        }),
        body: SiteBasicInfoUpdate,
        response: {
          200: SitePrivateInfo,
        },
      },
      oas: {
        operationId: "updateSiteBasicInfo",
        summary: "Update site basic info",
        tags: ["sites"],
        security: USER_TOKEN_SECURITY,
      },
    },
    withSite(async (user, site, request) => {
      const { sites } = request.deps;
      const newSite = await sites.updateBasicInfo(site.siteId, request.body);

      const ret = await sites.getPrivateSiteById(newSite.siteId);
      return ret;
    }),
  );

  fastify.patch<{
    Params: { siteId: string };
    Body: SiteSettingsPatchInput;
  }>(
    "/sites/:siteId/settings",
    {
      schema: {
        params: Type.Object({
          siteId: StringUUID,
        }),
        body: SiteSettingsPatchInput,
        response: {
          200: SitePrivateInfo,
        },
      },
      oas: {
        operationId: "updateSiteSettings",
        summary: "Update site settings",
        tags: ["sites"],
        security: USER_TOKEN_SECURITY,
      },
    },
    withSite(async (user, site, request) => {
      const { sites } = request.deps;
      const newSite = await sites.updateSiteSettings(site.siteId, request.body);

      const ret = await sites.getPrivateSiteById(newSite.siteId);
      return ret;
    }),
  );

  fastify.post<{
    Params: { siteId: string };
    Body: AvatarUploadCompleteRequest;
  }>(
    "/sites/:siteId/avatar/upload-complete",
    {
      schema: {
        params: Type.Object({
          siteId: StringUUID,
        }),
        body: AvatarUploadCompleteRequest,
        response: {
          200: SitePrivateInfo,
        },
      },
      oas: {
        operationId: "updateSiteAvatar",
        summary: "Update site avatar with uploaded image",
        tags: ["sites"],
        security: USER_TOKEN_SECURITY,
      },
    },
    withSite(async (user, site, request) => {
      const { sites } = request.deps;
      await sites.updateAvatar(
        user.userId,
        site.siteId,
        request.body.imageUploadId,
      );

      await sleep(2000);
      return await sites.getPrivateSiteById(site.siteId);
    }),
  );

  fastify.get<{
    Params: { siteId: string };
  }>(
    "/sites/:siteId/identities",
    {
      schema: {
        params: Type.Object({
          siteId: StringUUID,
        }),
        response: {
          200: ListAllIdentitiesResponse,
        },
      },
      oas: {
        operationId: "listAllIdentities",
        summary: "List all identities for a site",
        tags: ["identities"],
        security: USER_TOKEN_SECURITY,
      },
    },
    withSite(async (_user, site, request) => {
      const {
        atprotoIdentity: atproto,
        mastodonIdentity: mastodon,
        socialIdentity,
        webIdentity,
      } = request.deps;

      const [
        atprotoIdentities,
        mastodonIdentities,
        socialIdentities,
        webIdentities,
      ] = await Promise.all([
        atproto.listIdentities(site.siteId),
        mastodon.listIdentities(site.siteId),
        socialIdentity.listIdentities(site.siteId),
        webIdentity.listIdentities(site.siteId),
      ]);

      const ret: ListAllIdentitiesResponse = {
        atproto: atprotoIdentities.map(transformATProtoIdentityToAPIResponse),
        mastodon: mastodonIdentities.map(
          transformMastodonIdentityToAPIResponse,
        ),
        social: socialIdentities.map(transformSocialIdentityToAPIResponse),
        web: webIdentities.map(transformWebIdentityToAPIResponse),
      };

      return ret;
    }),
  );

  fastify.post<{
    Params: { siteId: string };
    Body: ReorderIdentityRequest;
  }>(
    "/sites/:siteId/identities/reorder",
    {
      schema: {
        params: Type.Object({
          siteId: StringUUID,
        }),
        body: ReorderIdentityRequest,
        response: {
          200: ListAllIdentitiesResponse,
        },
      },
      oas: {
        operationId: "reorderIdentity",
        summary: "Reorder a site identity",
        tags: ["identities"],
        security: USER_TOKEN_SECURITY,
      },
    },
    withSite(async (_user, site, request) => {
      const { sites } = request.deps;
      await sites.reorderIdentity(site.siteId, request.body);

      const {
        atprotoIdentity: atproto,
        mastodonIdentity: mastodon,
        socialIdentity,
        webIdentity,
      } = request.deps;

      const [
        atprotoIdentities,
        mastodonIdentities,
        socialIdentities,
        webIdentities,
      ] = await Promise.all([
        atproto.listIdentities(site.siteId),
        mastodon.listIdentities(site.siteId),
        socialIdentity.listIdentities(site.siteId),
        webIdentity.listIdentities(site.siteId),
      ]);

      const ret: ListAllIdentitiesResponse = {
        atproto: atprotoIdentities.map(transformATProtoIdentityToAPIResponse),
        mastodon: mastodonIdentities.map(
          transformMastodonIdentityToAPIResponse,
        ),
        social: socialIdentities.map(transformSocialIdentityToAPIResponse),
        web: webIdentities.map(transformWebIdentityToAPIResponse),
      };

      return ret;
    }),
  );
}

export const SITE_ROUTES = fp(siteRoutes, {
  name: "SITE_ROUTES",
  fastify: ">= 4",
});
