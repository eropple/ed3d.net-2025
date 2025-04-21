import { type FetchFn } from "@myapp/shared-universal/utils/fetch.js";
import { type Logger } from "pino";

import {
  TikTokUserResponseChecker,
  type SocialNormalizedUserInfo,
} from "../../schemas.js";

import { type OAuth2Provider } from "./base.js";

export class TikTokProvider implements OAuth2Provider {
  async fetchUserInfo(
    logger: Logger,
    fetch: FetchFn,
    accessToken: string,
    insecurelyLogOAuth2Payloads?: boolean,
  ): Promise<SocialNormalizedUserInfo | null> {
    const response = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,username,display_name,avatar_url",
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
        "Failed to fetch TikTok user info (not necessarily fatal)",
      );
      return null;
    }

    const data = await response.json();

    if (insecurelyLogOAuth2Payloads) {
      logger.fatal({ data }, "INSECURE: TikTok user response");
    }
    if (!TikTokUserResponseChecker.Check(data)) {
      logger.error(
        { validationErrors: [...TikTokUserResponseChecker.Errors(data)] },
        "Invalid TikTok user response",
      );
      throw new Error("Invalid user info response from TikTok");
    }

    return {
      id: data.data.user.open_id,
      username: data.data.user.username,
      displayName: data.data.user.display_name,
      avatarUrl: data.data.user.avatar_url,
      profileUrl: `https://www.tiktok.com/@${data.data.user.username}`,
    };
  }
}
