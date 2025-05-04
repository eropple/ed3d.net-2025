import type { Logger } from "pino";

import { type SocialOAuth2ProviderKind } from "../../../db/schema/index.js";
import type { FetchFn } from "../../../utils/fetch.js";

import { OAuth2Provider, type NormalizedUserInfo, type OAuth2ProviderScope } from "./base.js";

// GitHub user response type
interface GitHubUserResponse {
  id: number;
  login: string;
  name?: string;
  email?: string;
  avatar_url?: string;
  html_url: string;
}

export class GitHubProvider extends OAuth2Provider {
  readonly kind = "github" as const satisfies SocialOAuth2ProviderKind;
  readonly scopes: OAuth2ProviderScope[] = [
    { id: "read:user", description: "Read user profile information" },
    { id: "user:email", description: "Access user email addresses" }
  ];
  readonly scopeDelimiter = " ";
  readonly authorizationUrl = "https://github.com/login/oauth/authorize";
  readonly tokenUrl = "https://github.com/login/oauth/access_token";
  readonly extraAuthParams = {};

  constructor(
    logger: Logger,
    private readonly fetch: FetchFn
  ) {
    super(logger);
  }

  async getUserInfo(accessToken: string): Promise<NormalizedUserInfo> {
    const logger = this.logger.child({ provider: this.kind, fn: "getUserInfo" });

    try {
      const response = await this.fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error(
          { status: response.status, error: errorData },
          "Failed to fetch GitHub user info"
        );
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json() as GitHubUserResponse;

      logger.debug({ userId: data.id }, "Successfully fetched GitHub user info");

      return {
        id: data.id.toString(),
        username: data.login,
        displayName: data.name,
        email: data.email,
        avatarUrl: data.avatar_url,
        profileUrl: data.html_url,
      };
    } catch (error) {
      logger.error({ error }, "Error fetching GitHub user info");
      throw new Error("Failed to fetch user information from GitHub");
    }
  }

  getProfileUrl(username: string): string | undefined {
    return `https://github.com/${username}`;
  }

  getRefreshTimeAgo(): Date {
    // Refresh tokens that are more than 3 days old
    return new Date(Date.now() - 1000 * 60 * 60 * 24 * 3);
  }
}