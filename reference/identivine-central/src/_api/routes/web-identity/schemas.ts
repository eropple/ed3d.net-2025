import { schemaType } from "@eropple/fastify-openapi3";
import { type Static, Type } from "@sinclair/typebox";

import { SiteWebIdentityVerificationMethod } from "../../../domain/sites/schemas/index.js";
import { StringUUID } from "../../../lib/ext/typebox.js";

export const WebIdentityResponse = schemaType(
  "WebIdentityResponse",
  Type.Object({
    kind: Type.Literal("web"),
    webIdentityId: StringUUID,
    url: Type.String(),
    status: Type.String(),
    verificationMethod: Type.Union([
      SiteWebIdentityVerificationMethod,
      Type.Null(),
    ]),
    displayOnSite: Type.Boolean(),
    statusLastCheckedAt: Type.String(),
    order: Type.Number(),
  }),
);
export type WebIdentityResponse = Static<typeof WebIdentityResponse>;

export const ListWebIdentitiesResponse = schemaType(
  "ListWebIdentitiesResponse",
  Type.Object({
    identities: Type.Array(WebIdentityResponse),
  }),
);

export type ListWebIdentitiesResponse = Static<
  typeof ListWebIdentitiesResponse
>;

export const CreateWebIdentityRequest = schemaType(
  "CreateWebIdentityRequest",
  Type.Object({
    url: Type.String(),
  }),
);
export type CreateWebIdentityRequest = Static<typeof CreateWebIdentityRequest>;

export const UpdateIdentityDisplayRequest = schemaType(
  "UpdateWebIdentityDisplayRequest",
  Type.Object({
    displayOnSite: Type.Boolean(),
  }),
);
export type UpdateIdentityDisplayRequest = Static<
  typeof UpdateIdentityDisplayRequest
>;

export const GetVerificationInstructionsResponse = schemaType(
  "GetVerificationInstructionsResponse",
  Type.Object({
    metaTag: Type.String(),
    relMeLink: Type.String(),
    wellKnownJson: Type.String(),
    dnsTxtRecord: Type.String(),
  }),
);
export type GetVerificationInstructionsResponse = Static<
  typeof GetVerificationInstructionsResponse
>;
