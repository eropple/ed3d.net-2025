import ms from "ms";
import type { Logger } from "pino";

import type { SocialOAuth2ProviderKind } from "../../../db/schema/index.js";
import type { FetchFn } from "../../../utils/fetch.js";

import { OAuth2Provider, type NormalizedUserInfo, type OAuth2ProviderScope } from "./base.js";

// Discord specific user info response structure (partial)
// See: https://discord.com/developers/docs/resources/user#user-object
interface DiscordUserInfoResponse {
  id: string;
  username: string;
  discriminator: string; // Legacy username system, might be "0" for new usernames
  global_name?: string | null; // Preferred display name for newer username system
  avatar: string | null;
  email?: string | null; // Requires 'email' scope
  verified?: boolean; // Email verification status, requires 'email' scope
  mfa_enabled?: boolean;
}

export class DiscordProvider extends OAuth2Provider {
  readonly kind: SocialOAuth2ProviderKind = "discord";
  readonly authorizationUrl = "https://discord.com/api/oauth2/authorize";
  readonly tokenUrl = "https://discord.com/api/oauth2/token";
  readonly userInfoUrl = "https://discord.com/api/users/@me";
  readonly scopeDelimiter = " ";
  readonly scopes: OAuth2ProviderScope[] = [
    { id: "identify", description: "Access the user's id, username, and avatar." },
    { id: "email", description: "Access the user's email address." },
    { id: "guilds", description: "Access the list of guilds the user is in." },
    { id: "guilds.join", description: "Allows your app to add the user to a guild." },
  ];
  readonly extraAuthParams: Record<string, string> = {};

  constructor(
    logger: Logger,
    private readonly fetch: FetchFn,
  ) {
    super(logger.child({ provider: "discord" }));
  }

  async getUserInfo(accessToken: string): Promise<NormalizedUserInfo> {
    this.logger.debug("Fetching user info from Discord");

    const response = await this.fetch(this.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      let errorData = {};
      try {
        errorData = await response.json();
      } catch (e) { /* ignore */ }
      this.logger.error({ status: response.status, error: errorData }, "Failed to fetch user info from Discord");
      throw new Error(`Failed to fetch user info: ${response.status}`);
    }

    const userInfo: DiscordUserInfoResponse = await response.json();

    // Determine the best display name
    const displayName = userInfo.global_name || userInfo.username;

    // Construct avatar URL if avatar hash is present
    // See: https://discord.com/developers/docs/reference#image-formatting
    const avatarUrl = userInfo.avatar
      ? `https://cdn.discordapp.com/avatars/${userInfo.id}/${userInfo.avatar}.png`
      : undefined;

    // IMPORTANT: Check if Discord has verified the user's email
    const isEmailVerified = userInfo.verified === true;
    if (userInfo.email && !isEmailVerified) {
      this.logger.warn({ userId: userInfo.id }, "Discord email is present but not verified by Discord.");
    }

    const normalized: NormalizedUserInfo = {
      id: userInfo.id,
      username: userInfo.username,
      displayName: displayName,
      email: userInfo.email || undefined,
      emailVerified: isEmailVerified && !!userInfo.email,
      avatarUrl: avatarUrl,
      profileUrl: undefined,
    };

    this.logger.debug({ userId: normalized.id }, "Successfully fetched and normalized user info");
    return normalized;
  }

  getProfileUrl(username: string): string | undefined {
    return undefined;
  }

  getRefreshTimeAgo(): Date {
    // Define how far back to look for refreshable tokens.
    // Let's use a common value, e.g., 7 days. Adjust as needed.
    return new Date(Date.now() - ms("7d"));
  }
}