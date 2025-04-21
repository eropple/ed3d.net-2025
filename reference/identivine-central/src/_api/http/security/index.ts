import {
  type BearerSecurityScheme,
  type ApiKeySecurityScheme,
} from "@eropple/fastify-openapi3";
import {
  InternalServerError,
  UnauthorizedError,
} from "@myapp/shared-universal/errors/index.js";
import { sha512_256 } from "@myapp/shared-universal/utils/cryptography.js";
import { type FastifyReply, type FastifyRequest } from "fastify";

import { type AppConfig } from "../../../_config/types.js";
import { type DBSite, type DBUser } from "../../../_db/models.js";
import { type ApiAppConfig } from "../../config/types.js";
import { type SiteIdParams } from "../../routes/social-identities/schemas.js";

export const TENANT_SITE_PSK_HEADER = "X-Tenant-Site-PSK";
export const PANEL_SITE_PSK_HEADER = "X-Panel-PSK";

export const PANEL_SITE_SECURITY = { PanelSitePSK: [] };
export const TENANT_SITE_SECURITY = { TenantSitePSK: [] };
export const USER_TOKEN_SECURITY = { UserBearer: [] };

export function buildTenantSitePSKSecurityScheme(
  config: ApiAppConfig,
): ApiKeySecurityScheme {
  const pskBase = config.interop.tenantPreSharedKey;
  const psk = sha512_256(sha512_256(pskBase));

  return {
    type: "apiKey",
    name: TENANT_SITE_PSK_HEADER,
    in: "header",
    description: "Tenant site public access key",
    fn: (value, request) => {
      if (value !== psk) {
        return { ok: false, code: 401 };
      }

      return { ok: true };
    },
  };
}

export function buildPanelSitePSKSecurityScheme(
  config: ApiAppConfig,
): ApiKeySecurityScheme {
  const pskBase = config.interop.panelPreSharedKey;
  const psk = sha512_256(sha512_256(pskBase));

  return {
    type: "apiKey",
    name: PANEL_SITE_PSK_HEADER,
    in: "header",
    description: "Panel site public access key",
    fn: (value, request) => {
      if (value !== psk) {
        return { ok: false, code: 401 };
      }

      return { ok: true };
    },
  };
}

export function buildUserBearerSecurityScheme(
  config: AppConfig,
): BearerSecurityScheme {
  return {
    type: "http",
    scheme: "bearer",
    fn: async (value, request) => {
      const { memorySWR, logger } = request.deps;

      const user = await memorySWR(
        sha512_256(value),
        async () => {
          const { users } = request.deps;
          return await users.getUserByToken({ providedToken: value });
        },
        {
          maxTimeToLive: 1000,
          minTimeToStale: 500,
        },
      );

      if (!user || !user.value) {
        logger.debug("Invalid token received for user bearer security.");
        return { ok: false, code: 401 };
      }

      // @ts-expect-error this is where we set this "readonly" property
      request.user = user.value;
      logger.debug(
        { userId: user.value.userId },
        "User authenticated via token.",
      );
      return { ok: true };
    },
  };
}

/**
 * user handler wrapper
 */
export function uH<
  TRet,
  TRequest extends FastifyRequest,
  TReply extends FastifyReply,
>(
  fn: (user: DBUser, request: TRequest, reply: TReply) => TRet | Promise<TRet>,
) {
  return async (request: TRequest, reply: TReply) => {
    if (request.user) {
      return fn(request.user, request, reply);
    }

    throw new UnauthorizedError("Not authenticated");
  };
}

export function withSite<
  TRet,
  TRequest extends FastifyRequest,
  TReply extends FastifyReply,
>(
  fn: (
    user: DBUser,
    site: DBSite,
    request: TRequest,
    reply: TReply,
  ) => TRet | Promise<TRet>,
) {
  return async (request: TRequest, reply: TReply) => {
    const { user } = request;
    if (!user) {
      throw new UnauthorizedError("Not authenticated");
    }

    const siteId = (request.params as SiteIdParams).siteId;
    if (!siteId) {
      throw new InternalServerError(
        "No site ID provided, but should be in route params.",
      );
    }

    const { sites } = request.deps;
    const site = await sites.ensureUserCanManageSite(user.userId, siteId);

    return fn(user, site, request, reply);
  };
}
