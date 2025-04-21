import { type FetchFn } from "@myapp/shared-universal/utils/fetch.js";
import { type Logger } from "pino";

import {
  type SocialNormalizedUserInfo,
  GitLabUserResponseChecker,
} from "../../schemas.js";

import { type OAuth2Provider } from "./base.js";

export class GitLabProvider implements OAuth2Provider {
  async fetchUserInfo(
    logger: Logger,
    fetch: FetchFn,
    accessToken: string,
    insecurelyLogOAuth2Payloads?: boolean,
  ): Promise<SocialNormalizedUserInfo | null> {
    const response = await fetch("https://gitlab.com/api/v4/user", {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      logger.info(
        { status: response.status, error: await response.json() },
        "Failed to fetch user info ((not necessarily fatal)",
      );
      return null;
    }

    const data = await response.json();

    if (insecurelyLogOAuth2Payloads) {
      logger.fatal({ data }, "INSECURE: GitLab user response");
    }

    if (!GitLabUserResponseChecker.Check(data)) {
      logger.error(
        { validationErrors: [...GitLabUserResponseChecker.Errors(data)] },
        "Invalid GitLab user response",
      );
      throw new Error("Invalid GitLab user response");
    }

    return {
      id: data.id.toString(),
      username: data.username,
      email: data.email,
      displayName: data.name,
      avatarUrl: data.avatar_url,
      profileUrl: data.web_url,
    };
  }
}
