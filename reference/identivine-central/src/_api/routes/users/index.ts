import { BadRequestError } from "@myapp/shared-universal/errors/index.js";
import fp from "fastify-plugin";

import { ChangePasswordRequest } from "../../../domain/users/schemas.js";
import { USER_TOKEN_SECURITY, uH } from "../../http/security/index.js";
import { type AppFastify } from "../../http/type-providers.js";

import { UserPrivateDTO, UserSiteIdList } from "./schemas.js";

async function userRoutes(fastify: AppFastify) {
  fastify.get("/users/me", {
    schema: {
      response: {
        200: UserPrivateDTO,
      },
    },
    oas: {
      tags: ["users"],
      security: USER_TOKEN_SECURITY,
    },
    handler: uH(async (user) => {
      return {
        userId: user.userId,
        email: user.email,
        displayName: user.displayName,
      };
    }),
  });

  fastify.get("/users/me/sites", {
    schema: {
      response: {
        200: UserSiteIdList,
      },
    },
    oas: {
      tags: ["users"],
      security: USER_TOKEN_SECURITY,
    },
    handler: uH(async (user, request) => {
      const { sites } = request.deps;

      const site = await sites.getSiteByUserId(user.userId);
      if (!site) {
        throw new BadRequestError("User is not associated with a site");
      }

      return {
        siteIds: [site.siteId],
      };
    }),
  });
}

export const USER_ROUTES = fp(userRoutes, {
  name: "USER_ROUTES",
  fastify: ">= 4",
});
