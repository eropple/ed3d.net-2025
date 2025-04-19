import {
  allowInsecureRequests,
  customFetch,
  discovery,
  type Configuration as OIDCClientConfiguration
} from "openid-client";
import type { Logger } from "pino";

import type { FetchFn } from "../../../utils/fetch.js";
import type { AuthConfig } from "../config.js";

export {
  type Configuration as OIDCClientConfiguration,
} from "openid-client";

export async function fetchOpenIDConfiguration(
  logger: Logger,
  fetch: FetchFn,
  authConfig: AuthConfig,
  allowInsecureOpenIDProviders: boolean,
): Promise<OIDCClientConfiguration> {
  logger = logger.child({
    fn: fetchOpenIDConfiguration.name,
  });

  const oidcConfigUrl = authConfig.oidcUrl;

  logger.info({ oidcConfigUrl }, "Fetching OpenID configuration");

  const oidcConfig: OIDCClientConfiguration = await discovery(
    new URL(oidcConfigUrl),
    authConfig.clientId,
    {
      client_secret: authConfig.clientSecret,
    },
    undefined,
    {
      [customFetch]: fetch,
      execute: allowInsecureOpenIDProviders
        ? [allowInsecureRequests]
        : [],
    },
  );

  return oidcConfig;
}