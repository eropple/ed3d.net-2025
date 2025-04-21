import { UnauthorizedError } from "@myapp/shared-universal/errors/index.js";
import fp from "fastify-plugin";

import {
  BumpTokenSaltRequest,
  CredentialLoginRequest,
} from "../../../domain/users/schemas.js";
import {
  PANEL_SITE_SECURITY,
  uH,
  USER_TOKEN_SECURITY,
} from "../../http/security/index.js";
import { type AppFastify } from "../../http/type-providers.js";

import { AuthTokenResponse, InvalidateAllTokensResponse } from "./schemas.js";
import { validateAndGetRedirectUrl } from "./utils.js";

async function authRoutes(fastify: AppFastify) {
  fastify.post("/auth/login", {
    schema: {
      body: CredentialLoginRequest,
      response: {
        200: AuthTokenResponse,
      },
    },
    oas: {
      tags: ["auth"],
      security: PANEL_SITE_SECURITY,
    },
    handler: async (request): Promise<AuthTokenResponse> => {
      const { users, logger, config } = request.deps;
      const user = await users.validateUserCredentials(request.body);

      if (!user) {
        throw new UnauthorizedError("Invalid credentials");
      }

      const { tokenCiphertext } = await users.makeLoginTokenForUser(user);
      const redirectTo = validateAndGetRedirectUrl(
        logger,
        config.env,
        config.urls.panelBaseUrl,
        request.body.redirectTo,
      );

      return {
        token: tokenCiphertext,
        redirectTo,
      };
    },
  });

  fastify.post("/auth/invalidate-all", {
    schema: {
      body: BumpTokenSaltRequest,
      response: {
        200: InvalidateAllTokensResponse,
      },
    },
    oas: {
      tags: ["auth"],
      security: USER_TOKEN_SECURITY,
    },
    handler: uH(async (user, request): Promise<InvalidateAllTokensResponse> => {
      const { users, logger } = request.deps;

      await users.bumpTokenSalt({ userId: user.userId });

      return { success: true };
    }),
  });
}

export const AUTH_ROUTES = fp(authRoutes, {
  name: "AUTH_ROUTES",
  fastify: ">= 4",
});
