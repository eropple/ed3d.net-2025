import { type FetchFn } from "@myapp/shared-universal/utils/fetch.js";
import { type Logger } from "pino";

import {
  type SocialNormalizedUserInfo,
  GitHubUserResponseChecker,
} from "../../schemas.js";

import { type OAuth2Provider } from "./base.js";

export class GitHubProvider implements OAuth2Provider {
  async fetchUserInfo(
    logger: Logger,
    fetch: FetchFn,
    accessToken: string,
    insecurelyLogOAuth2Payloads?: boolean,
  ): Promise<SocialNormalizedUserInfo | null> {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      logger.info(
        { status: response.status, error: await response.json() },
        "Failed to fetch user info (not necessarily fatal)",
      );
      return null;
    }

    const data = await response.json();

    if (insecurelyLogOAuth2Payloads) {
      logger.fatal({ data }, "INSECURE: GitHub user response");
    }

    if (!GitHubUserResponseChecker.Check(data)) {
      logger.error(
        { validationErrors: [...GitHubUserResponseChecker.Errors(data)] },
        "Invalid GitHub user response",
      );
      // this indicates a provider problem, so definitely throw.
      throw new Error("Invalid user info response from GitHub");
    }

    return {
      id: data.id.toString(),
      username: data.login,
      email: data.email,
      displayName: data.name,
      avatarUrl: data.avatar_url,
      profileUrl: data.html_url,
    };
  }
}
