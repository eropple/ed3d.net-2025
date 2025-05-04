import type { Logger } from "pino";

import type { SocialOAuth2ProviderKind } from "../../../db/schema/index.js";
import type { Sensitive } from "../../../vault/types.js";

export interface OAuth2ProviderScope {
  id: string;
  description: string;
}

export interface OAuth2TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

export interface NormalizedUserInfo {
  id: string;
  username: string;
  displayName?: string;
  email?: string;
  emailVerified?: boolean;
  avatarUrl?: string;
  profileUrl?: string;
}

export abstract class OAuth2Provider {
  constructor(protected readonly logger: Logger) {}

  abstract readonly kind: SocialOAuth2ProviderKind;
  abstract readonly scopes: OAuth2ProviderScope[];
  abstract readonly scopeDelimiter: string;
  abstract readonly authorizationUrl: string;
  abstract readonly tokenUrl: string;
  abstract readonly extraAuthParams?: Record<string, string>;

  abstract getUserInfo(
    accessToken: string,
  ): Promise<NormalizedUserInfo>;

  abstract getProfileUrl(username: string): string | undefined;

  abstract getRefreshTimeAgo(): Date;
}

// Provider-specific metadata types
export type GitHubMetadata = {
  plan?: {
    name: string;
  };
};

export type GoogleMetadata = {
  picture?: string;
  verified_email?: boolean;
};

// Discriminated union for provider metadata
export type OAuth2ProviderMetadata =
  | { kind: "github"; metadata: GitHubMetadata }
  | { kind: "google"; metadata: GoogleMetadata };

// Type for storing in database
export type OAuth2MetadataEnvelope = Sensitive<OAuth2ProviderMetadata>;