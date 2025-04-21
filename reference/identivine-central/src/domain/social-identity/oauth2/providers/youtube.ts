import { type FetchFn } from "@myapp/shared-universal/utils/fetch.js";
import { type Logger } from "pino";

import {
  type SocialNormalizedUserInfo,
  GoogleUserResponseChecker,
  YouTubeChannelResponseChecker,
} from "../../schemas.js";

import { type OAuth2Provider } from "./base.js";

export class YoutubeGoogleProvider implements OAuth2Provider {
  async fetchUserInfo(
    logger: Logger,
    fetch: FetchFn,
    accessToken: string,
    insecurelyLogOAuth2Payloads?: boolean,
  ): Promise<SocialNormalizedUserInfo | null> {
    const response = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      logger.info(
        { status: response.status, error: await response.text() },
        "Failed to fetch Google user info (not necessarily fatal)",
      );
      return null;
    }

    const data = await response.json();

    if (insecurelyLogOAuth2Payloads) {
      logger.fatal({ data }, "INSECURE: Google user response");
    }
    if (!GoogleUserResponseChecker.Check(data)) {
      logger.error(
        { data, validationErrors: [...GoogleUserResponseChecker.Errors(data)] },
        "Invalid Google user response",
      );
      throw new Error("Invalid user info response from Google");
    }

    // Now get the YouTube channel info
    const ytResponse = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&mine=true",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      },
    );

    if (!ytResponse.ok) {
      logger.error(
        { status: ytResponse.status, error: await ytResponse.text() },
        "Failed to fetch YouTube channel info",
      );
      throw new Error("Failed to fetch YouTube channel info");
    }

    const ytData = await ytResponse.json();
    if (insecurelyLogOAuth2Payloads) {
      logger.fatal({ data: ytData }, "INSECURE: YouTube channel response");
    }

    if (!YouTubeChannelResponseChecker.Check(ytData)) {
      logger.error(
        {
          data: ytData,
          validationErrors: [...YouTubeChannelResponseChecker.Errors(ytData)],
        },
        "Invalid YouTube channel response",
      );
      throw new Error("Invalid YouTube channel response");
    }

    const channel = ytData.items[0];
    if (!channel) {
      logger.error(
        { data: ytData },
        "No YouTube channel found in channel response",
      );
      throw new Error("Failed to fetch YouTube channel info");
    }

    return {
      id: channel.id,
      username: channel.snippet.customUrl ?? channel.id,
      displayName: channel.snippet.title,
      avatarUrl: channel.snippet.thumbnails.high.url,
      profileUrl: `https://myaccount.google.com/`,
    };
  }
}
