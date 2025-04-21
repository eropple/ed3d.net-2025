import { ResourceNotFoundError } from "@myapp/shared-universal/errors/index.js";
import { type Static, Type } from "@sinclair/typebox";
import fp from "fastify-plugin";

import {
  type DBSiteSocialOAuth2Identity,
  SocialOAuth2ProviderKind,
} from "../../../_db/models.js";
import { transformSocialIdentityToAPIResponse as transformSocialIdentityToAPIResponse } from "../../../domain/social-identity/helpers.js";
import { UpdateIdentityDisplayRequest } from "../../../domain/social-identity/schemas.js";
import { StringUUID } from "../../../lib/ext/typebox.js";
import { RedirectResponse } from "../../http/schemas.js";
import {
  USER_TOKEN_SECURITY,
  uH,
  withSite,
} from "../../http/security/index.js";
import { type AppFastify } from "../../http/type-providers.js";

import {
  ListOAuth2IdentitiesResponse,
  OAuth2AuthorizationResponse,
  OAuth2CallbackQuerystring,
  OAuth2ProviderPathParams,
  SiteIdParams,
} from "./schemas.js";

async function socialIdentityRoutes(fastify: AppFastify) {
  fastify.get<{
    Params: {
      siteId: string;
      provider: SocialOAuth2ProviderKind;
    };
  }>(
    "/sites/:siteId/social-identities/oauth2/:provider/authorize",
    {
      schema: {
        params: Type.Object({
          siteId: StringUUID,
          provider: SocialOAuth2ProviderKind,
        }),
        response: {
          200: OAuth2AuthorizationResponse,
        },
      },
      oas: {
        tags: ["social-identities"],
        security: USER_TOKEN_SECURITY,
      },
    },
    withSite(async (_user, site, request) => {
      const { socialIdentity } = request.deps;
      const authUrl = await socialIdentity.getAuthorizationUrl(
        site,
        request.params.provider,
      );
      return { authUrl };
    }),
  );
  fastify.get<{
    Params: { provider: SocialOAuth2ProviderKind };
    Querystring: OAuth2CallbackQuerystring;
  }>(
    "/social-identities/oauth2/:provider/callback",
    {
      schema: {
        params: Type.Object({
          provider: SocialOAuth2ProviderKind,
        }),
        querystring: OAuth2CallbackQuerystring,
        response: {
          302: RedirectResponse,
        },
      },
      oas: {
        tags: ["social-identities"],
        security: {},
      },
    },
    async (request, reply) => {
      const { socialIdentity, config } = request.deps;

      let result: string;

      let identity: DBSiteSocialOAuth2Identity;
      let redirect: string;
      try {
        identity = await socialIdentity.handleOAuth2Callback({
          provider: request.params.provider,
          code: request.query.code,
          state: request.query.state,
        });

        result = "success";
        redirect = `${config.urls.panelBaseUrl}/panel/sites/${identity.siteId}/social-identities?result=${result}`;
      } catch (err) {
        request.log.error(
          { err },
          "Failed to handle OAuth2 callback. Returning as failure.",
        );
        result = "failure";
        redirect = `${config.urls.panelBaseUrl}/panel`;
      }

      return reply
        .code(302)
        .header("Location", redirect)
        .send({ redirect } satisfies RedirectResponse);
    },
  );

  fastify.get(
    "/sites/:siteId/social-identities",
    {
      schema: {
        params: SiteIdParams,
        response: {
          200: ListOAuth2IdentitiesResponse,
        },
      },
      oas: {
        tags: ["social-identities"],
        security: USER_TOKEN_SECURITY,
      },
    },
    withSite(
      async (_user, site, request): Promise<ListOAuth2IdentitiesResponse> => {
        const { socialIdentity } = request.deps;

        request.log.debug(
          { siteId: site.siteId },
          "Listing OAuth2 identities for site",
        );
        const identities = await socialIdentity.listIdentities(site.siteId);

        return {
          identities: identities.map(transformSocialIdentityToAPIResponse),
        };
      },
    ),
  );

  fastify.delete<{
    Params: { identityId: string };
  }>(
    "/sites/:siteId/social-identities/:identityId",
    {
      schema: {
        params: Type.Object({
          siteId: StringUUID,
          identityId: Type.String(),
        }),
        response: {
          200: ListOAuth2IdentitiesResponse,
        },
      },
      oas: {
        tags: ["social-identities"],
        security: USER_TOKEN_SECURITY,
      },
    },
    withSite(async (user, site, request) => {
      const { socialIdentity } = request.deps;

      request.log.info(
        { identityId: request.params.identityId },
        "Deleting OAuth2 identity",
      );

      await socialIdentity.deleteIdentity(
        site.siteId,
        request.params.identityId,
      );

      const identities = await socialIdentity.listIdentities(site.siteId);

      return {
        identities: identities.map(transformSocialIdentityToAPIResponse),
      };
    }),
  );

  fastify.patch<{
    Params: { identityId: string; siteId: string };
    Body: UpdateIdentityDisplayRequest;
  }>(
    "/sites/:siteId/social-identities/:identityId/display",
    {
      schema: {
        params: Type.Object({
          siteId: StringUUID,
          identityId: Type.String(),
        }),
        body: UpdateIdentityDisplayRequest,
        response: {
          200: ListOAuth2IdentitiesResponse,
        },
      },
      oas: {
        tags: ["social-identities"],
        security: USER_TOKEN_SECURITY,
      },
    },
    withSite(async (user, site, request) => {
      const { socialIdentity } = request.deps;

      request.log.info(
        { identityId: request.params.identityId, body: request.body },
        "Updating identity display",
      );

      await socialIdentity.updateIdentityDisplay(
        site.siteId,
        request.params.identityId,
        request.body.displayOnSite,
      );

      const identities = await socialIdentity.listIdentities(site.siteId);
      return {
        identities: identities.map(transformSocialIdentityToAPIResponse),
      };
    }),
  );
}

export const SOCIAL_IDENTITY_ROUTES = fp(socialIdentityRoutes, {
  name: "SOCIAL_IDENTITY_ROUTES",
  fastify: ">= 4",
});
