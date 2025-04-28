import { isRedirect, type Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { asValue } from "awilix";
import { ulid } from "ulidx";

import { configureScope } from "./lib/server/_deps/scopes/request.js";
import { bootstrapSvelte } from "./lib/server/bootstrap/svelte.js";

import { env } from "$env/dynamic/private";

const { APP_CONFIG, ROOT_LOGGER, SINGLETON_CONTAINER } = await bootstrapSvelte("site");

ROOT_LOGGER.info({ csrfOrigin: env.ORIGIN ?? "NOT SET!!" }, "Initializing hooks.server.ts.");

const SESSION_COOKIE_NAME = APP_CONFIG.auth.session.cookieName;

export const handle: Handle = sequence(async ({ event, resolve }) => {
  const startTimestamp = Date.now();
  const requestId = event.request.headers.get("x-request-id") ?? `REQ-${ulid()}`;

  let logger = ROOT_LOGGER.child({ reqId: requestId });
  const requestContainer = await configureScope(SINGLETON_CONTAINER, requestId);

  const rawHost = event.request.headers.get("host");

  logger.info(
    {
      fn: handle.name,
      request: {
        ip: event.getClientAddress(),
        host: rawHost,
        method: event.request.method,
        url: event.url,
      },
    },
    "Request started."
  );

  // Resolve the session cookie
  const sessionCookie = event.cookies.get(SESSION_COOKIE_NAME);
  const user = sessionCookie
    ? await requestContainer.cradle.sessionService.validateSession(sessionCookie)
    : null;

  // @ts-expect-error this is where we set a readonly value
  event.locals.user = user;

  if (event.locals.user) {
    logger = logger.child({ userId: event.locals.user.userId });
    logger.info("Session authenticated.");

    requestContainer.register( { logger: asValue(logger) });
  }

  // @ts-expect-error this is where we set a readonly value
  event.locals.config = APP_CONFIG;
  // @ts-expect-error this is where we set a readonly value
  event.locals.deps = requestContainer.cradle;
  // @ts-expect-error this is where we set a readonly value
  event.locals.logger = logger;

  let ret: Response;
  try {
    ret = await resolve(event);

    if (ret.status > 499) {
      logger.info({ status: ret.status }, "Request returned a handled error.");
    }

    ret.headers.append("Access-Control-Allow-Origin", APP_CONFIG.urls.frontendBaseUrl);
    ret.headers.append("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    ret.headers.append("Access-Control-Allow-Credentials", "true");
  } catch (err) {
    if (isRedirect(err)) {
      logger.info({ err }, "Redirecting.");
      throw err;
    }

    const duration = Date.now() - startTimestamp;
    logger.error({ fn: handle.name, err, duration }, "Request threw an unhandled error.");
    throw err;
  }

  const duration = Date.now() - startTimestamp;

  logger.info(
    {
      fn: handle.name,
      response: {
        status: ret.status,
        duration,
      },
    },
    "Request completed."
  );

  ret.headers.set("x-request-id", requestId);
  return ret;
});
