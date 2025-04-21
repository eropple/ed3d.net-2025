import { Type } from "@sinclair/typebox";
import fp from "fastify-plugin";

import { transformATProtoIdentityToAPIResponse } from "../../../domain/atproto/helpers.js";
import { StringDomainName, StringUUID } from "../../../lib/ext/typebox.js";
import { RedirectResponse } from "../../http/schemas.js";
import { USER_TOKEN_SECURITY, withSite } from "../../http/security/index.js";
import { type AppFastify } from "../../http/type-providers.js";

import {
  ATProtoAuthorizationResponse,
  ListATProtoIdentitiesResponse,
  UpdateIdentityDisplayRequest,
} from "./schemas.js";

export const ATPROTO_METADATA_PATH = "/atproto/client-metadata.json";
export const ATPROTO_JWKS_WELL_KNOWN_PATH = "/atproto/client-jwks.json";
export const ATPROTO_CALLBACK_PATH = "/atproto/oauth/callback";

async function atprotoRoutes(fastify: AppFastify) {
  fastify.get(
    ATPROTO_JWKS_WELL_KNOWN_PATH,
    {
      oas: {
        omit: true,
        security: {},
      },
    },
    async (request) => {
      const { memorySWR } = request.deps;

      const ret = await memorySWR(
        "atproto-public-jwks",
        () => {
          const { atprotoIdentity: atproto } = request.deps;
          return atproto.getClientJWKS();
        },
        {
          // technically we don't need this to be
          maxTimeToLive: 1000 * 60 * 60 * 12,
          minTimeToStale: 1000 * 60 * 60 * 9,
        },
      );

      return ret.value;
    },
  );

  fastify.get(ATPROTO_METADATA_PATH, {
    oas: {
      omit: true,
      security: {},
    },
    handler: async (request) => {
      const { memorySWR } = request.deps;

      const ret = await memorySWR(
        "atproto-client-metadata",
        () => {
          const { atprotoIdentity: atproto } = request.deps;
          return atproto.getClientMetadata();
        },
        {
          // technically we don't need this to be
          // maxTimeToLive: 1000 * 60 * 60 * 12,
          // minTimeToStale: 1000 * 60 * 60 * 9,
        },
      );

      return ret.value;
    },
  });

  fastify.get<{
    Params: { siteId: string; handle: string };
  }>(
    "/sites/:siteId/atproto/authorize/:handle",
    {
      schema: {
        params: Type.Object({
          siteId: StringUUID,
          handle: StringDomainName,
        }),
        response: {
          200: ATProtoAuthorizationResponse,
        },
      },
      oas: {
        security: USER_TOKEN_SECURITY,
      },
    },
    withSite(async (_user, site, request) => {
      const { atprotoIdentity: atproto } = request.deps;
      const ret = await atproto.getAuthorizationUrl(
        site,
        request.params.handle,
      );
      return ret;
    }),
  );

  fastify.get(
    ATPROTO_CALLBACK_PATH,
    {
      schema: {
        querystring: Type.Any(),
        response: {
          302: RedirectResponse,
        },
      },
      oas: {
        tags: ["atproto"],
        security: {},
      },
    },
    async (request, reply) => {
      const { atprotoIdentity: atproto } = request.deps;
      const urlSearchParams = new URLSearchParams(
        request.query as Record<string, string>,
      );
      const response = await atproto.handleCallbackFromRequest(urlSearchParams);
      return reply.redirect(response.redirect);
    },
  );

  fastify.get<{
    Params: { siteId: string };
  }>(
    "/sites/:siteId/atproto",
    {
      schema: {
        params: Type.Object({
          siteId: StringUUID,
        }),
        response: {
          200: ListATProtoIdentitiesResponse,
        },
      },
      oas: {
        tags: ["atproto"],
        security: USER_TOKEN_SECURITY,
      },
    },
    withSite(async (_user, site, request) => {
      const { atprotoIdentity: atproto } = request.deps;
      const identities = (await atproto.listIdentities(site.siteId)).map(
        transformATProtoIdentityToAPIResponse,
      );
      return { identities };
    }),
  );

  fastify.delete<{
    Params: { siteId: string; identityId: string };
  }>(
    "/sites/:siteId/atproto/:identityId",
    {
      schema: {
        params: Type.Object({
          siteId: StringUUID,
          identityId: Type.String(),
        }),
        response: {
          200: ListATProtoIdentitiesResponse,
        },
      },
      oas: {
        tags: ["atproto"],
        security: USER_TOKEN_SECURITY,
      },
    },
    withSite(async (_user, site, request) => {
      const { atprotoIdentity: atproto } = request.deps;
      await atproto.deleteIdentity(site.siteId, request.params.identityId);
      const identities = (await atproto.listIdentities(site.siteId)).map(
        transformATProtoIdentityToAPIResponse,
      );
      return { identities };
    }),
  );

  fastify.patch<{
    Params: { siteId: string; identityId: string };
    Body: UpdateIdentityDisplayRequest;
  }>(
    "/sites/:siteId/atproto/:identityId/display",
    {
      schema: {
        params: Type.Object({
          siteId: StringUUID,
          identityId: Type.String(),
        }),
        body: UpdateIdentityDisplayRequest,
        response: {
          200: ListATProtoIdentitiesResponse,
        },
      },
      oas: {
        tags: ["atproto"],
        security: USER_TOKEN_SECURITY,
      },
    },
    withSite(async (_user, site, request) => {
      const { atprotoIdentity: atproto } = request.deps;
      await atproto.updateIdentityDisplay(
        site.siteId,
        request.params.identityId,
        request.body.displayOnSite,
      );
      const identities = (await atproto.listIdentities(site.siteId)).map(
        transformATProtoIdentityToAPIResponse,
      );
      return { identities };
    }),
  );
}

export const ATPROTO_ROUTES = fp(atprotoRoutes, {
  name: "ATPROTO_ROUTES",
  fastify: ">= 4",
});
