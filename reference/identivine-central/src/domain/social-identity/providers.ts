import {
  type DBSiteSocialOAuth2Identity,
  type SocialOAuth2ProviderKind,
} from "../../_db/models.js";

export type OAuth2ProviderMetadata = {
  scopes: string[];
  authorizationUrl: string;
  tokenUrl: string;
  profileUrl: (identity: DBSiteSocialOAuth2Identity) => string;
  clientIdParamName?: string;
  scopeDelimiter?: string;
  tokenContentType?: string;
  extraAuthParams?: Record<string, string>;
  tokenStrategy: "standard" | "threads-long-lived";
  refreshTokenTimeAgo?: () => Date;
};

export const OAUTH2_PROVIDER_METADATA: Readonly<
  Record<SocialOAuth2ProviderKind, OAuth2ProviderMetadata>
> = {
  github: {
    scopes: ["read:user", "user:email"],
    authorizationUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    tokenStrategy: "standard",
    profileUrl: (identity) => `https://github.com/${identity.providerUsername}`,
    refreshTokenTimeAgo: () => new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
  },
  gitlab: {
    scopes: ["profile", "read_user"],
    authorizationUrl: "https://gitlab.com/oauth/authorize",
    tokenUrl: "https://gitlab.com/oauth/token",
    tokenStrategy: "standard",
    profileUrl: (identity) => `https://gitlab.com/${identity.providerUsername}`,
    refreshTokenTimeAgo: () => new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
  },
  threads: {
    scopes: ["threads_basic"],
    authorizationUrl: "https://threads.net/oauth/authorize",
    tokenUrl: "https://graph.threads.net/oauth/access_token",
    tokenStrategy: "threads-long-lived",
    profileUrl: (identity) =>
      `https://threads.net/@${identity.providerUsername}`,
    refreshTokenTimeAgo: () => new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
  },
  tiktok: {
    scopes: ["user.info.basic", "user.info.profile"],
    authorizationUrl: "https://www.tiktok.com/v2/auth/authorize/",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    tokenStrategy: "standard",
    profileUrl: (identity) =>
      `https://www.tiktok.com/@${identity.providerUsername}`,
    clientIdParamName: "client_key",
    scopeDelimiter: ",",
    tokenContentType: "application/x-www-form-urlencoded",
    refreshTokenTimeAgo: () => new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
  },
  youtube: {
    scopes: [
      "openid",
      "profile",
      "https://www.googleapis.com/auth/youtube.readonly",
    ],
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    tokenStrategy: "standard",
    profileUrl: (identity) =>
      identity.providerUsername.startsWith("@")
        ? `https://www.youtube.com/${identity.providerUsername}`
        : `https://www.youtube.com/channel/${identity.providerId}`,
    extraAuthParams: {
      access_type: "offline",
      prompt: "consent",
    },
    refreshTokenTimeAgo: () => new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
  },
  twitch: {
    scopes: ["openid"],
    authorizationUrl: "https://id.twitch.tv/oauth2/authorize",
    tokenUrl: "https://id.twitch.tv/oauth2/token",
    tokenStrategy: "standard",
    profileUrl: (identity) => `https://twitch.tv/${identity.providerUsername}`,
    extraAuthParams: {
      claims: JSON.stringify({
        userinfo: {
          preferred_username: null,
          email_verified: null,
          picture: null,
        },
      }),
    },
    refreshTokenTimeAgo: () => new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
  } as const satisfies OAuth2ProviderMetadata,
} as const;
