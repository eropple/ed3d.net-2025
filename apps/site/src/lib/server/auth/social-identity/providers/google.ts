import type { Logger } from "pino";

import { type SocialOAuth2ProviderKind } from "../../../db/schema/index.js";
import type { FetchFn } from "../../../utils/fetch.js";

import { OAuth2Provider, type NormalizedUserInfo, type OAuth2ProviderScope } from "./base.js";

// Google user response type
interface GoogleUserResponse {
  id: string;
  email: string;
  verified_email?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
}

export class GoogleProvider extends OAuth2Provider {
  readonly kind = "google" as const satisfies SocialOAuth2ProviderKind;
  readonly scopes: OAuth2ProviderScope[] = [
    { id: "openid", description: "Verify your identity" },
    { id: "profile", description: "See your personal info, including name and picture" },
    { id: "email", description: "View your email address" }
  ];
  readonly scopeDelimiter = " ";
  readonly authorizationUrl = "https://accounts.google.com/o/oauth2/v2/auth";
  readonly tokenUrl = "https://oauth2.googleapis.com/token";
  readonly extraAuthParams = {
    access_type: "offline",
    prompt: "consent" // Force prompt to always get refresh token
  };

  constructor(
    logger: Logger,
    private readonly fetch: FetchFn
  ) {
    super(logger);
  }

  async getUserInfo(accessToken: string): Promise<NormalizedUserInfo> {
    const logger = this.logger.child({ provider: this.kind, fn: "getUserInfo" });

    try {
      const response = await this.fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error(
          { status: response.status, error: errorData },
          "Failed to fetch Google user info"
        );
        throw new Error(`Google API error: ${response.status}`);
      }

      const data = await response.json() as GoogleUserResponse;

      logger.debug({ userId: data.id }, "Successfully fetched Google user info");

      // Extract username from email for consistency
      const username = data.email.split("@")[0];

      return {
        id: data.id,
        username,
        displayName: data.name,
        email: data.email,
        avatarUrl: data.picture,
        profileUrl: `https://myaccount.google.com/`,
      };
    } catch (error) {
      logger.error({ error }, "Error fetching Google user info");
      throw new Error("Failed to fetch user information from Google");
    }
  }

  getProfileUrl(username: string): string {
    // Google doesn't have an easy way to link to a user profile by username alone
    return "https://myaccount.google.com/";
  }

  getRefreshTimeAgo(): Date {
    // Refresh tokens that are more than 3 days old
    return new Date(Date.now() - 1000 * 60 * 60 * 24 * 3);
  }
}