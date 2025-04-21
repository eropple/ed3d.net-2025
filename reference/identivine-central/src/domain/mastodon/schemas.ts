import { schemaType } from "@eropple/fastify-openapi3";
import { type Static, Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

// Internal types for Mastodon API responses
const MastodonAppResponse = Type.Object({
  id: Type.String(),
  name: Type.String(),
  website: Type.Optional(Type.String()),
  redirect_uri: Type.String(),
  client_id: Type.String(),
  client_secret: Type.String(),
  vapid_key: Type.Optional(Type.String()),
});
export type MastodonAppResponse = Static<typeof MastodonAppResponse>;
export const MastodonAppResponseChecker =
  TypeCompiler.Compile(MastodonAppResponse);

const MastodonUserInfo = Type.Object({
  id: Type.String(),
  username: Type.String(),
  acct: Type.String(),
  display_name: Type.String(),
  email: Type.Optional(Type.String()),
  url: Type.String(),
});
export type MastodonUserInfo = Static<typeof MastodonUserInfo>;
export const MastodonUserInfoChecker = TypeCompiler.Compile(MastodonUserInfo);

// Our API schemas
export const MastodonIdentityResponse = schemaType(
  "MastodonIdentityResponse",
  Type.Object({
    mastodonIdentityId: Type.String(),
    instanceUrl: Type.String(),
    username: Type.String(),
    displayName: Type.String(),
    status: Type.String(),
    displayOnSite: Type.Boolean(),
    statusLastCheckedAt: Type.String(),
    profileUrl: Type.String(),
  }),
);
export type MastodonIdentityResponse = Static<typeof MastodonIdentityResponse>;

export const UpdateIdentityDisplayRequest = schemaType(
  "UpdateMastodonIdentityDisplayRequest",
  Type.Object({
    displayOnSite: Type.Boolean(),
  }),
);
export type UpdateIdentityDisplayRequest = Static<
  typeof UpdateIdentityDisplayRequest
>;
