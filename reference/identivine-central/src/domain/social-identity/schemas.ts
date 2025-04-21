import { schemaType } from "@eropple/fastify-openapi3";
import { type Static, Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

export const SocialOAuth2TokenResponse = Type.Object({
  access_token: Type.String(),
  refresh_token: Type.Optional(Type.String()),
  id_token: Type.Optional(Type.String()),
  expires_in: Type.Optional(Type.Number()),
  scope: Type.Union([Type.String(), Type.Array(Type.String())]),
  token_type: Type.String(),
});
export type SocialOAuth2TokenResponse = Static<
  typeof SocialOAuth2TokenResponse
>;
export const SocialOAuth2TokenResponseChecker = TypeCompiler.Compile(
  SocialOAuth2TokenResponse,
);

export const SocialNormalizedUserInfo = schemaType(
  "SocialNormalizedUserInfo",
  Type.Object({
    id: Type.String(),
    username: Type.String(),
    email: Type.Optional(Type.String()),
    displayName: Type.Optional(Type.String()),
    avatarUrl: Type.Optional(Type.String()),
    profileUrl: Type.Optional(Type.String()),
  }),
);
export type SocialNormalizedUserInfo = Static<typeof SocialNormalizedUserInfo>;
export const SocialNormalizedUserInfoChecker = TypeCompiler.Compile(
  SocialNormalizedUserInfo,
);

export const GitHubUserResponse = schemaType(
  "GitHubUserResponse",
  Type.Object({
    id: Type.Number(),
    login: Type.String(),
    email: Type.String(),
    name: Type.Optional(Type.String()),
    avatar_url: Type.String(),
    html_url: Type.String(),
  }),
);
export type GitHubUserResponse = Static<typeof GitHubUserResponse>;
export const GitHubUserResponseChecker =
  TypeCompiler.Compile(GitHubUserResponse);

export const GitLabUserResponse = schemaType(
  "GitLabUserResponse",
  Type.Object({
    id: Type.Number(),
    username: Type.String(),
    email: Type.String(),
    name: Type.Optional(Type.String()),
    avatar_url: Type.String(),
    web_url: Type.String(),
  }),
);
export type GitLabUserResponse = Static<typeof GitLabUserResponse>;
export const GitLabUserResponseChecker =
  TypeCompiler.Compile(GitLabUserResponse);

export const UpdateIdentityDisplayRequest = schemaType(
  "UpdateIdentityDisplayRequest",
  Type.Object({
    displayOnSite: Type.Boolean(),
  }),
);
export type UpdateIdentityDisplayRequest = Static<
  typeof UpdateIdentityDisplayRequest
>;

export const ThreadsUserResponse = schemaType(
  "ThreadsUserResponse",
  Type.Object({
    id: Type.String(),
    username: Type.String(),
    name: Type.Optional(Type.String()),
    threads_profile_picture_url: Type.String(),
    threads_biography: Type.Optional(Type.String()),
  }),
);
export type ThreadsUserResponse = Static<typeof ThreadsUserResponse>;
export const ThreadsUserResponseChecker =
  TypeCompiler.Compile(ThreadsUserResponse);

export const ThreadsLongLivedResponse = Type.Object({
  access_token: Type.String(),
  token_type: Type.String(),
  expires_in: Type.Number(),
});
export type ThreadsLongLivedResponse = Static<typeof ThreadsLongLivedResponse>;
export const ThreadsLongLivedResponseChecker = TypeCompiler.Compile(
  ThreadsLongLivedResponse,
);

export const TikTokUserResponse = schemaType(
  "TikTokUserResponse",
  Type.Object({
    data: Type.Object({
      user: Type.Object({
        open_id: Type.String(),
        username: Type.String(),
        display_name: Type.String(),
        avatar_url: Type.String(),
      }),
    }),
    error: Type.Object({
      code: Type.String(),
      message: Type.String(),
      log_id: Type.String(),
    }),
  }),
);
export type TikTokUserResponse = Static<typeof TikTokUserResponse>;
export const TikTokUserResponseChecker =
  TypeCompiler.Compile(TikTokUserResponse);

export const GoogleUserResponse = schemaType(
  "GoogleUserResponse",
  Type.Object({
    sub: Type.String(),
    name: Type.String(),
    picture: Type.String(),
  }),
);
export type GoogleUserResponse = Static<typeof GoogleUserResponse>;
export const GoogleUserResponseChecker =
  TypeCompiler.Compile(GoogleUserResponse);

export const YouTubeChannelResponse = schemaType(
  "YouTubeChannelResponse",
  Type.Object({
    items: Type.Array(
      Type.Object({
        id: Type.String(),
        snippet: Type.Object({
          title: Type.String(),
          customUrl: Type.Optional(Type.String()),
          thumbnails: Type.Object({
            high: Type.Object({
              url: Type.String(),
            }),
          }),
        }),
      }),
    ),
  }),
);
export type YouTubeChannelResponse = Static<typeof YouTubeChannelResponse>;
export const YouTubeChannelResponseChecker = TypeCompiler.Compile(
  YouTubeChannelResponse,
);

export const TwitchUserResponse = schemaType(
  "TwitchUserResponse",
  Type.Object({
    aud: Type.String(),
    sub: Type.String(),
    iss: Type.String(),
    preferred_username: Type.String(),
    picture: Type.String(),
  }),
);
export type TwitchUserResponse = Static<typeof TwitchUserResponse>;
export const TwitchUserResponseChecker =
  TypeCompiler.Compile(TwitchUserResponse);
