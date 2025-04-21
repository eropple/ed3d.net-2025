import { type FetchFn } from "@myapp/shared-universal/utils/fetch.js";
import { type Logger } from "pino";

import { type SocialOAuth2ProviderKind } from "../../../_db/models.js";
import { OAUTH2_PROVIDER_METADATA } from "../providers.js";
import {
  type SocialOAuth2TokenResponse,
  SocialOAuth2TokenResponseChecker,
} from "../schemas.js";

export async function exchangeCodeForToken(
  logger: Logger,
  fetch: FetchFn,
  provider: SocialOAuth2ProviderKind,
  apiBaseUrl: string,
  code: string,
  clientId: string,
  clientSecret: string,
): Promise<SocialOAuth2TokenResponse> {
  const metadata = OAUTH2_PROVIDER_METADATA[provider];

  const params = new URLSearchParams({
    [metadata.clientIdParamName ?? "client_id"]: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: `${apiBaseUrl}/social-identities/oauth2/${provider}/callback`,
    grant_type: "authorization_code",
  });

  const response = await fetch(metadata.tokenUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": metadata.tokenContentType ?? "application/json",
    },
    body:
      metadata.tokenContentType === "application/x-www-form-urlencoded"
        ? params
        : JSON.stringify(Object.fromEntries(params)),
  });

  if (!response.ok) {
    logger.error(
      { status: response.status, error: await response.text() },
      "Failed to exchange code for token",
    );
    throw new Error("Failed to exchange code for token");
  }

  const data = await response.json();

  // Special case for Threads' non-standard response
  if (provider === "threads") {
    (data as SocialOAuth2TokenResponse).scope = "threads_basic";
    (data as SocialOAuth2TokenResponse).token_type = "bearer";
  }

  if (!SocialOAuth2TokenResponseChecker.Check(data)) {
    logger.error(
      {
        data,
        validationErrors: [...SocialOAuth2TokenResponseChecker.Errors(data)],
      },
      "Invalid token response",
    );
    throw new Error("Invalid token response");
  }

  return data;
}

export async function refreshAccessToken(
  logger: Logger,
  fetch: FetchFn,
  provider: SocialOAuth2ProviderKind,
  refreshToken: string,
  clientId: string,
  clientSecret: string,
  insecurelyLogOAuth2Payloads?: boolean,
): Promise<SocialOAuth2TokenResponse> {
  const metadata = OAUTH2_PROVIDER_METADATA[provider];

  const params = new URLSearchParams({
    [metadata.clientIdParamName ?? "client_id"]: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(metadata.tokenUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": metadata.tokenContentType ?? "application/json",
    },
    body:
      metadata.tokenContentType === "application/x-www-form-urlencoded"
        ? params
        : JSON.stringify(Object.fromEntries(params)),
  });

  if (!response.ok) {
    logger.error(
      { status: response.status, error: await response.text() },
      "Failed to refresh token",
    );
    throw new Error("Failed to refresh token");
  }

  const data = await response.json();
  if (insecurelyLogOAuth2Payloads) {
    logger.fatal({ data }, "INSECURE: OAuth2 token refresh response");
  }

  if (!SocialOAuth2TokenResponseChecker.Check(data)) {
    logger.error(
      { validationErrors: [...SocialOAuth2TokenResponseChecker.Errors(data)] },
      "Invalid token refresh response",
    );
    throw new Error("Invalid token refresh response");
  }

  return data;
}
