import { schemaType } from "@eropple/fastify-openapi3";
import { type Static, Type } from "@sinclair/typebox";

import { SitePublicInfo } from "../../../domain/sites/schemas/index.js";

export const UserPrivateDTO = schemaType(
  "UserPrivateDTO",
  Type.Object({
    userId: Type.String({ format: "uuid" }),
    email: Type.String({ format: "email" }),
    displayName: Type.String(),
  }),
);

export type UserPrivateDTO = Static<typeof UserPrivateDTO>;

export const UserSiteIdList = schemaType(
  "UserSiteIdList",
  Type.Object({
    siteIds: Type.Array(Type.String()),
  }),
);
export type UserSiteIdList = Static<typeof UserSiteIdList>;
