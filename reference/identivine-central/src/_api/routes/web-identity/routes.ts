import { Type } from "@sinclair/typebox";
import fp from "fastify-plugin";

import { transformWebIdentityToAPIResponse } from "../../../domain/web-identity/helpers.js";
import { StringUUID } from "../../../lib/ext/typebox.js";
import { EmptyObject } from "../../http/schemas.js";
import { USER_TOKEN_SECURITY, withSite } from "../../http/security/index.js";
import { type AppFastify } from "../../http/type-providers.js";

import {
  ListWebIdentitiesResponse,
  CreateWebIdentityRequest,
  UpdateIdentityDisplayRequest,
  GetVerificationInstructionsResponse,
} from "./schemas.js";

async function webIdentityRoutes(fastify: AppFastify) {
  fastify.get<{
    Params: {
      siteId: string;
    };
  }>(
    "/sites/:siteId/web-identities",
    {
      schema: {
        params: Type.Object({
          siteId: StringUUID,
        }),
        response: {
          200: ListWebIdentitiesResponse,
        },
      },
      oas: {
        tags: ["web-identity"],
        security: USER_TOKEN_SECURITY,
      },
    },
    withSite(async (_user, site, request) => {
      const { webIdentity } = request.deps;
      const identities = (await webIdentity.listIdentities(site.siteId)).map(
        transformWebIdentityToAPIResponse,
      );
      return { identities };
    }),
  );

  fastify.post<{
    Params: {
      siteId: string;
    };
    Body: CreateWebIdentityRequest;
  }>(
    "/sites/:siteId/web-identities",
    {
      schema: {
        params: Type.Object({
          siteId: StringUUID,
        }),
        body: CreateWebIdentityRequest,
        response: {
          200: ListWebIdentitiesResponse,
        },
      },
      oas: {
        tags: ["web-identity"],
        security: USER_TOKEN_SECURITY,
      },
    },
    withSite(async (_user, site, request) => {
      const { webIdentity } = request.deps;
      await webIdentity.createIdentity(site.siteId, request.body.url);
      const identities = (await webIdentity.listIdentities(site.siteId)).map(
        transformWebIdentityToAPIResponse,
      );
      return { identities };
    }),
  );

  fastify.get<{
    Params: {
      siteId: string;
    };
    Querystring: {
      url: string;
    };
  }>(
    "/sites/:siteId/web-identities/verification-instructions",
    {
      schema: {
        params: Type.Object({
          siteId: StringUUID,
        }),
        querystring: Type.Object({
          url: Type.String(),
        }),
        response: {
          200: GetVerificationInstructionsResponse,
        },
      },
      oas: {
        tags: ["web-identity"],
        security: USER_TOKEN_SECURITY,
      },
    },
    withSite(async (_user, site, request) => {
      const { webIdentity } = request.deps;
      return webIdentity.getVerificationInstructions(
        site.siteId,
        request.query.url,
      );
    }),
  );

  fastify.delete<{
    Params: {
      siteId: string;
      identityId: string;
    };
  }>(
    "/sites/:siteId/web-identities/:identityId",
    {
      schema: {
        params: Type.Object({
          siteId: StringUUID,
          identityId: StringUUID,
        }),
        response: {
          200: ListWebIdentitiesResponse,
        },
      },
      oas: {
        tags: ["web-identity"],
        security: USER_TOKEN_SECURITY,
      },
    },
    withSite(async (_user, site, request) => {
      const { webIdentity } = request.deps;
      await webIdentity.deleteIdentity(site.siteId, request.params.identityId);
      const identities = (await webIdentity.listIdentities(site.siteId)).map(
        transformWebIdentityToAPIResponse,
      );
      return { identities };
    }),
  );

  fastify.patch<{
    Params: {
      siteId: string;
      identityId: string;
    };
    Body: UpdateIdentityDisplayRequest;
  }>(
    "/sites/:siteId/web-identities/:identityId/display",
    {
      schema: {
        params: Type.Object({
          siteId: StringUUID,
          identityId: StringUUID,
        }),
        body: UpdateIdentityDisplayRequest,
        response: {
          200: ListWebIdentitiesResponse,
        },
      },
      oas: {
        tags: ["web-identity"],
        security: USER_TOKEN_SECURITY,
      },
    },
    withSite(async (_user, site, request) => {
      const { webIdentity } = request.deps;
      await webIdentity.updateIdentityDisplay(
        site.siteId,
        request.params.identityId,
        request.body.displayOnSite,
      );
      const identities = (await webIdentity.listIdentities(site.siteId)).map(
        transformWebIdentityToAPIResponse,
      );
      return { identities };
    }),
  );

  fastify.post<{
    Params: {
      siteId: string;
      identityId: string;
    };
  }>(
    "/sites/:siteId/web-identities/:identityId/verify",
    {
      schema: {
        params: Type.Object({
          siteId: StringUUID,
          identityId: StringUUID,
        }),
        body: EmptyObject,
        response: {
          200: ListWebIdentitiesResponse,
        },
      },
      oas: {
        tags: ["web-identity"],
        security: USER_TOKEN_SECURITY,
      },
    },
    withSite(async (_user, site, request) => {
      const { webIdentity } = request.deps;
      await webIdentity.requestVerification(
        site.siteId,
        request.params.identityId,
        process.env.NODE_ENV === "development",
      );
      const identities = (await webIdentity.listIdentities(site.siteId)).map(
        transformWebIdentityToAPIResponse,
      );
      return { identities };
    }),
  );
}

export const WEB_IDENTITY_ROUTES = fp(webIdentityRoutes, {
  name: "WEB_IDENTITY_ROUTES",
  fastify: ">= 4",
});
