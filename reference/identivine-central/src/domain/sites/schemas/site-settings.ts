import { schemaType } from "@eropple/fastify-openapi3";
import { type Static, Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

import { UnionOneOf } from "../../../lib/ext/typebox.js";

export const SiteSettingsV1 = schemaType(
  "SiteSettingsV1",
  Type.Object({
    version: Type.Literal(1),

    showContainerTitles: Type.Boolean(),
  }),
);
export type SiteSettingsV1 = Static<typeof SiteSettingsV1>;

export const SiteSettings = schemaType(
  "SiteSettings",
  UnionOneOf([SiteSettingsV1]),
);
export type SiteSettings = Static<typeof SiteSettings>;
// WARN:  if we have to rev SiteSettings to V2, this will blow up, because
//        the `UnionOneOf` seems to break something here. Might have to move
//        to AJV.
export const SiteSettingsChecker = TypeCompiler.Compile(SiteSettingsV1);

export const SiteSettingsPatchInput = schemaType(
  "SiteSettingsPatchInput",
  Type.Partial(Type.Omit(SiteSettingsV1, ["version"])),
);
export type SiteSettingsPatchInput = Static<typeof SiteSettingsPatchInput>;
