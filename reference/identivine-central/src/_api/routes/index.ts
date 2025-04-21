import fp from "fastify-plugin";

import { type AppFastify } from "../http/type-providers.js";

import { ATPROTO_ROUTES } from "./atproto/routes.js";
import { AUTH_ROUTES } from "./auth/routes.js";
import { CONTENT_BLOCK_ROUTES } from "./content-blocks/routes.js";
import { IMAGE_ROUTES } from "./images/routes.js";
import { MASTODON_ROUTES } from "./mastodon/routes.js";
import { META_ROUTES } from "./meta/routes.js";
import { PUBLIC_ROUTES } from "./public/routes.js";
import { SITE_ROUTES } from "./sites/routes.js";
import { SOCIAL_IDENTITY_ROUTES } from "./social-identities/routes.js";
import { USER_ROUTES } from "./users/index.js";
import { WEB_IDENTITY_ROUTES } from "./web-identity/routes.js";

async function apiRoutes(fastify: AppFastify) {
  await fastify.register(META_ROUTES);
  await fastify.register(PUBLIC_ROUTES);
  await fastify.register(AUTH_ROUTES);
  await fastify.register(USER_ROUTES);
  await fastify.register(SOCIAL_IDENTITY_ROUTES);
  await fastify.register(CONTENT_BLOCK_ROUTES);
  await fastify.register(SITE_ROUTES);
  await fastify.register(MASTODON_ROUTES);
  await fastify.register(ATPROTO_ROUTES);
  await fastify.register(WEB_IDENTITY_ROUTES);
  await fastify.register(IMAGE_ROUTES);
}
export const API_ROUTES = fp(apiRoutes, {
  name: "API_ROUTES",
  fastify: ">= 4",
});
