import { Type } from "@sinclair/typebox";
import fp from "fastify-plugin";

import { transformMastodonIdentityToAPIResponse } from "../../../domain/mastodon/helpers.js";
import { StringDomainName, StringUUID } from "../../../lib/ext/typebox.js";
import { RedirectResponse } from "../../http/schemas.js";
import { USER_TOKEN_SECURITY, withSite } from "../../http/security/index.js";
import { type AppFastify } from "../../http/type-providers.js";

import {
  ListMastodonIdentitiesResponse,
  MastodonAuthorizationResponse,
  MastodonCallbackQuerystring,
  UpdateIdentityDisplayRequest,
} from "./schemas.js";

async function mastodonRoutes(fastify: AppFastify) {
  fastify.get<{
    Params: {
      siteId: string;
      instanceDomain: string;
    };
  }>(
    "/sites/:siteId/mastodon/authorize/:instanceDomain",
    {
      schema: {
        params: Type.Object({
          siteId: StringUUID,
          instanceDomain: StringDomainName,
        }),
        response: {
          200: MastodonAuthorizationResponse,
        },
      },
      oas: {
        tags: ["mastodon"],
        security: USER_TOKEN_SECURITY,
      },
    },
    withSite(async (_user, site, request) => {
      const { mastodonIdentity: mastodon } = request.deps;

      const instanceUrl = "https://" + request.params.instanceDomain;

      const authUrl = await mastodon.getAuthorizationUrl(site, instanceUrl);
      return { authUrl };
    }),
  );

  fastify.get<{
    Querystring: MastodonCallbackQuerystring;
  }>(
    "/mastodon/oauth/callback",
    {
      schema: {
        querystring: MastodonCallbackQuerystring,
        response: {
          302: RedirectResponse,
        },
      },
      oas: {
        tags: ["mastodon"],
        security: {},
      },
    },
    async (request, reply) => {
      const { mastodonIdentity: mastodon, config } = request.deps;

      let result: string;
      let redirect: string;

      try {
        const { app, identity } = await mastodon.handleOAuth2Callback(
          request.query.code,
          request.query.state,
        );

        result = "success";
        redirect = `${config.urls.panelBaseUrl}/panel/sites/${identity.siteId}/mastodon?result=${result}`;
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

  fastify.get<{
    Params: {
      siteId: string;
    };
  }>(
    "/sites/:siteId/mastodon",
    {
      schema: {
        params: Type.Object({
          siteId: StringUUID,
        }),
        response: {
          200: ListMastodonIdentitiesResponse,
        },
      },
      oas: {
        tags: ["mastodon"],
        security: USER_TOKEN_SECURITY,
      },
    },
    withSite(async (_user, site, request) => {
      const { mastodonIdentity: mastodon } = request.deps;
      const identities = (await mastodon.listIdentities(site.siteId)).map(
        transformMastodonIdentityToAPIResponse,
      );
      return { identities };
    }),
  );

  fastify.delete<{
    Params: {
      siteId: string;
      identityId: string;
    };
  }>(
    "/sites/:siteId/mastodon/:identityId",
    {
      schema: {
        params: Type.Object({
          siteId: StringUUID,
          identityId: Type.String(),
        }),
        response: {
          200: ListMastodonIdentitiesResponse,
        },
      },
      oas: {
        tags: ["mastodon"],
        security: USER_TOKEN_SECURITY,
      },
    },
    withSite(async (_user, site, request) => {
      const { mastodonIdentity: mastodon } = request.deps;
      await mastodon.deleteIdentity(site.siteId, request.params.identityId);
      const identities = (await mastodon.listIdentities(site.siteId)).map(
        transformMastodonIdentityToAPIResponse,
      );
      return { identities };
    }),
  );

  fastify.patch<{
    Params: { siteId: string; identityId: string };
    Body: UpdateIdentityDisplayRequest;
  }>(
    "/sites/:siteId/mastodon/:identityId/display",
    {
      schema: {
        params: Type.Object({
          siteId: StringUUID,
          identityId: Type.String(),
        }),
        body: UpdateIdentityDisplayRequest,
        response: {
          200: ListMastodonIdentitiesResponse,
        },
      },
      oas: {
        tags: ["mastodon"],
        security: USER_TOKEN_SECURITY,
      },
    },
    withSite(async (_user, site, request) => {
      const { mastodonIdentity: mastodon } = request.deps;
      await mastodon.updateIdentityDisplay(
        site.siteId,
        request.params.identityId,
        request.body.displayOnSite,
      );
      const identities = (await mastodon.listIdentities(site.siteId)).map(
        transformMastodonIdentityToAPIResponse,
      );
      return { identities };
    }),
  );
}

export const MASTODON_ROUTES = fp(mastodonRoutes, {
  name: "MASTODON_ROUTES",
  fastify: ">= 4",
});
