import "@eropple/fastify-openapi3";
import "@fastify/cookie";

import { type AwilixContainer } from "awilix";

import { type DBUser } from "../../_db/models.js";
import {
  type AppRequestCradle,
  type AppSingletonCradle,
} from "../../_deps/index.js";

export type RootContainer = AwilixContainer<AppSingletonCradle>;
export type RequestContainer = AwilixContainer<AppRequestCradle>;

declare module "fastify" {
  interface FastifyRequest {
    readonly diScope: RequestContainer;
    deps: AppRequestCradle;

    readonly user: DBUser | undefined;
  }

  interface FastifyInstance {
    readonly diContainer: RootContainer;
    deps(): AppSingletonCradle;
  }
}
