import { schemaType } from "@eropple/fastify-openapi3";
import { type Static, Type } from "@sinclair/typebox";

import { ImageUsage } from "../../../domain/images/schemas.js";
import { StringUUID } from "../../../lib/ext/typebox.js";

export const CreateUploadUrlRequest = schemaType(
  "CreateUploadUrlRequest",
  Type.Object({
    usage: ImageUsage,
  }),
);
export type CreateUploadUrlRequest = Static<typeof CreateUploadUrlRequest>;

export const CreateUploadUrlResponse = schemaType(
  "CreateUploadUrlResponse",
  Type.Object({
    uploadUrl: Type.String(),
    imageUploadId: StringUUID,
  }),
);
export type CreateUploadUrlResponse = Static<typeof CreateUploadUrlResponse>;

export const CompleteUploadResponse = schemaType(
  "CompleteUploadResponse",
  Type.Object({
    imageId: StringUUID,
  }),
);
export type CompleteUploadResponse = Static<typeof CompleteUploadResponse>;
