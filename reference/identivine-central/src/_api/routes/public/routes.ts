import { NotFoundError } from "@myapp/shared-universal/errors/index.js";
import { Type } from "@sinclair/typebox";
import fp from "fastify-plugin";

import { fetchPublicSite } from "../../../domain/sites/public-sites.js";
import { SitePublicInfo } from "../../../domain/sites/schemas/index.js";
import { ErrorResponse } from "../../http/schemas.js";
import { TENANT_SITE_SECURITY } from "../../http/security/index.js";
import { type AppFastify } from "../../http/type-providers.js";

async function publicRoutes(fastify: AppFastify) {
  fastify.get("/public/site-info/:siteFqdn", {
    schema: {
      params: Type.Object({
        siteFqdn: Type.String(),
      }),
      response: {
        200: SitePublicInfo,
        404: ErrorResponse,
      },
    },
    oas: {
      operationId: "getPublicSiteInfo",
      summary: "Fetch public site info",
      tags: ["public-info"],
      security: TENANT_SITE_SECURITY,
    },
    handler: async (request, reply) => {
      const { sites } = request.deps;

      const siteInfo = await sites.getPublicSiteByFQDN(request.params.siteFqdn);

      if (!siteInfo) {
        throw new NotFoundError(
          `Could not find site: ${request.params.siteFqdn}`,
        );
      }

      return siteInfo;
    },
  });
}

export const PUBLIC_ROUTES = fp(publicRoutes, {
  name: "PUBLIC_ROUTES",
  fastify: ">= 4",
});
