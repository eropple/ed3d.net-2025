import OAS3Plugin, { type OAS3PluginOptions } from "@eropple/fastify-openapi3";
import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import {
  ApplicationError,
  ForbiddenError,
  InternalServerError,
  UnauthorizedError,
} from "@myapp/shared-universal/errors/index.js";
import { AJV } from "@myapp/shared-universal/utils/ajv.js";
import { buildRequestIdGenerator } from "@myapp/shared-universal/utils/request-id-builder.js";
import Fastify, { type FastifyError, type FastifyBaseLogger } from "fastify";
import type * as pino from "pino";
import { type NonUndefined } from "utility-types";

import type { AppConfig } from "../../_config/types.js";
import { type ApiAppConfig } from "../config/types.js";
import { API_ROUTES } from "../routes/index.js";

import { registerDependencyInjection } from "./deps.js";
import { requestIdPlugin } from "./request-id-plugin.js";
import { type ErrorResponse } from "./schemas.js";
import {
  buildPanelSitePSKSecurityScheme,
  buildTenantSitePSKSecurityScheme,
  buildUserBearerSecurityScheme,
} from "./security/index.js";
import { type RootContainer } from "./type-extensions.js";
import type { AppFastify } from "./type-providers.js";

function registerErrorHandler(config: ApiAppConfig, fastify: AppFastify) {
  fastify.setErrorHandler((err, request, reply) => {
    const stack = config.http.emitStackOnErrors ? err.stack : undefined;

    let resp: ErrorResponse;
    if (err instanceof ApplicationError) {
      if (err.httpStatusCode > 499) {
        request.log.error({ err }, "Server error.");
      } else {
        request.log.debug({ err }, "Client error.");
      }

      reply.code(err.httpStatusCode);
      resp = {
        name: err.friendlyName,
        message: err.message,
        reqId: request.id,
        stack,
      };
    } else if ((err as FastifyError).validation) {
      request.log.debug({ err }, "Validation error.");
      reply.code(400);
      resp = {
        name: "ValidationError",
        message: "Invalid request: " + err.message,
        reqId: request.id,
        stack,
      };
    } else if (
      err instanceof TypeError &&
      err.message.includes("does not match schema definition")
    ) {
      request.log.debug(
        { err },
        "Validation error, but probably on response; hiding as 500. THIS IS A BUG.",
      );
      reply.code(500);
      resp = {
        name: "InternalServerError",
        message: "An internal server error occurred.",
        reqId: request.id,
        stack,
      };
    } else {
      request.log.error(
        { err },
        "Error is not an ApplicationError or Fastify validation; this is a bug.",
      );
      reply.code(500);

      resp = {
        name: "InternalServerError",
        message: "An internal server error occurred.",
        reqId: request.id,
        stack,
      };
    }

    request.log.debug({ resp }, "Sending error response.");
    reply.send(resp);
  });
}

export async function buildServer(
  config: ApiAppConfig,
  rootLogger: pino.Logger,
  rootContainer: RootContainer,
) {
  const idGenerator = buildRequestIdGenerator("API");
  const fastify: AppFastify = Fastify({
    exposeHeadRoutes: false,
    logger: rootLogger.child({
      context: "fastify",
    }) as FastifyBaseLogger,
    ajv: {},
    genReqId: (req) => idGenerator([req.headers["x-correlation-id"]].flat()[0]),
  }).withTypeProvider<TypeBoxTypeProvider>();
  await registerDependencyInjection(config, fastify, rootContainer);

  fastify.register(fastifyHelmet, {
    global: true,
    hidePoweredBy: true,
    hsts: false,

    contentSecurityPolicy: false,
  });

  fastify.register(fastifyCors, {
    origin: "*",
    credentials: true,
  });

  // this is necessary because typebox adds some custom keywords to the schema
  fastify.setValidatorCompiler(({ schema }) => AJV.compile(schema));

  await fastify.register(requestIdPlugin);

  await fastify.register(fastifyCookie);
  let openapiDocument:
    | Parameters<NonUndefined<OAS3PluginOptions["postParse"]>>[0]["rootDoc"]
    | null = null;
  await fastify.register(OAS3Plugin, {
    openapiInfo: {
      title: "Central API",
      version: "0.0.1",
    },
    exitOnInvalidDocument: true,
    includeUnconfiguredOperations: false,
    publish: {
      json: config.env !== "production",
      yaml: config.env !== "production",
      ui: config.env !== "production" ? "scalar" : null,
    },
    autowiredSecurity: {
      allowEmptySecurityWithNoRoot: false,
      securitySchemes: {
        TenantSitePSK: buildTenantSitePSKSecurityScheme(config),
        PanelSitePSK: buildPanelSitePSKSecurityScheme(config),
        UserBearer: buildUserBearerSecurityScheme(config),
      },
      onRequestFailed: (result) => {
        if (result.code === 401) {
          throw new UnauthorizedError(
            "You are not identified. Please use an API key or OAuth2 token.",
          );
        }

        if (result.code === 403) {
          throw new ForbiddenError(
            "You do not have permission to perform this action.",
          );
        }

        throw new InternalServerError("An internal server error occurred.");
      },
    },
    preParse: (oas) => {
      oas.rootDoc.servers = [{ url: config.urls.apiBaseUrl }];

      return oas;
    },
    postParse: (oas) => {
      const logger = fastify.log.child({
        plugin: "OAS3Plugin",
        phase: "postParse",
      });
      openapiDocument = oas.rootDoc;

      const schemas = oas.rootDoc.components?.schemas ?? {};

      oas.rootDoc.components = oas.rootDoc.components ?? {};
      oas.rootDoc.components.schemas = schemas;
    },
  });

  fastify.decorate("openapiDocument", openapiDocument);
  registerErrorHandler(config, fastify);

  fastify.addHook("onRoute", (route) => {
    fastify.log.debug(
      { method: route.method, path: route.path },
      "Route registered.",
    );
  });

  await fastify.register(API_ROUTES, { prefix: "/api" });

  return fastify;
}
