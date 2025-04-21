import { type FetchFn } from "@myapp/shared-universal/utils/fetch.js";
import { type Logger } from "pino";

import {
  type SocialOAuth2TokenResponse,
  ThreadsUserResponseChecker,
  type SocialNormalizedUserInfo,
  SocialOAuth2TokenResponseChecker,
  ThreadsLongLivedResponseChecker,
} from "../../schemas.js";

import { type OAuth2Provider } from "./base.js";

/**
 * Threads OAuth2 Provider Implementation
 *
 * Token Management Rules:
 * - Initial tokens are short-lived (1 hour)
 * - Must be exchanged for long-lived tokens (60 days) immediately
 * - Long-lived tokens can only be refreshed if:
 *   1. Token is at least 24 hours old
 *   2. Token has not expired
 * - Refreshed tokens are valid for 60 days from refresh date
 * - Tokens not refreshed within 60 days expire permanently
 */
export class ThreadsProvider implements OAuth2Provider {
  async fetchUserInfo(
    logger: Logger,
    fetch: FetchFn,
    accessToken: string,
    insecurelyLogOAuth2Payloads?: boolean,
  ): Promise<SocialNormalizedUserInfo | null> {
    const response = await fetch(
      "https://graph.threads.net/me?fields=id,username,name,threads_profile_picture_url,threads_biography",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      logger.info(
        { status: response.status, error: await response.json() },
        "Failed to fetch Threads user info (not necessarily fatal)",
      );
      return null;
    }

    const data = await response.json();

    if (insecurelyLogOAuth2Payloads) {
      logger.fatal({ data }, "INSECURE: Threads user response");
    }

    if (!ThreadsUserResponseChecker.Check(data)) {
      logger.error(
        {
          data,
          validationErrors: [...ThreadsUserResponseChecker.Errors(data)],
        },
        "Invalid Threads user response",
      );
      throw new Error("Invalid user info response from Threads");
    }

    return {
      id: data.id.toString(),
      username: data.username,
      // threads doesn't provide email
      displayName: data.name ?? data.username,
      avatarUrl: data.threads_profile_picture_url,
      profileUrl: `https://threads.net/@${data.username}`,
    };
  }

  async exchangeForLongLivedToken(
    logger: Logger,
    fetch: FetchFn,
    shortLivedToken: string,
    clientId: string,
    clientSecret: string,
    insecurelyLogOAuth2Payloads?: boolean,
  ): Promise<SocialOAuth2TokenResponse | null> {
    logger = logger.child({ fn: this.exchangeForLongLivedToken.name });

    const params = new URLSearchParams({
      client_secret: clientSecret,
      grant_type: "th_exchange_token",
      access_token: shortLivedToken,
    });
    const url = `https://graph.threads.net/access_token?${params.toString()}`;

    logger.fatal(
      { url },
      "Exchanging short-lived Threads token for long-lived token",
    );

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!response.ok) {
      logger.warn(
        { status: response.status, body: await response.text() },
        "Failed to exchange short-lived Threads token for long-lived token",
      );
      return null;
    }

    const data = await response.json();
    if (insecurelyLogOAuth2Payloads) {
      logger.fatal(
        { status: response.status, data },
        "INSECURE: Threads long-lived token exchange response",
      );
    }

    if (!ThreadsLongLivedResponseChecker.Check(data)) {
      logger.error(
        {
          data,
          validationErrors: [...ThreadsLongLivedResponseChecker.Errors(data)],
        },
        "Invalid Threads token response",
      );
      throw new Error("Invalid token response from Threads");
    }
    if (data.token_type.toLowerCase() !== "bearer") {
      logger.warn(
        { tokenType: data.token_type },
        "Unexpected token type from Threads",
      );
    }

    return {
      access_token: data.access_token,
      token_type: "bearer",
      scope: "threads_basic",
      expires_in: data.expires_in,
    };
  }
}
