import { type FetchFn } from "@myapp/shared-universal/utils/fetch.js";
import { type Logger } from "pino";

import {
  type SocialNormalizedUserInfo,
  TwitchUserResponseChecker,
} from "../../schemas.js";

import { type OAuth2Provider } from "./base.js";

export class TwitchProvider implements OAuth2Provider {
  getAuthorizationUrlParams(): Record<string, string> {
    return {
      claims: JSON.stringify({
        userinfo: {
          preferred_username: null,
          email_verified: null,
          picture: null,
        },
      }),
    };
  }

  async fetchUserInfo(
    logger: Logger,
    fetch: FetchFn,
    accessToken: string,
    insecurelyLogOAuth2Payloads?: boolean,
  ): Promise<SocialNormalizedUserInfo | null> {
    const response = await fetch("https://id.twitch.tv/oauth2/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      logger.info(
        { status: response.status, error: await response.text() },
        "Failed to fetch Twitch user info (not necessarily fatal)",
      );
      return null;
    }

    const data = await response.json();

    if (insecurelyLogOAuth2Payloads) {
      logger.fatal({ data }, "INSECURE: Twitch user response");
    }
    if (!TwitchUserResponseChecker.Check(data)) {
      logger.error(
        { data, validationErrors: [...TwitchUserResponseChecker.Errors(data)] },
        "Invalid Twitch user response",
      );
      throw new Error("Invalid user info response from Twitch");
    }

    return {
      id: data.sub,
      username: data.preferred_username,
      displayName: data.preferred_username,
      avatarUrl: data.picture,
      profileUrl: `https://twitch.tv/${data.preferred_username}`,
    };
  }
}
