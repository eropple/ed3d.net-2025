import { BadRequestError } from "@myapp/shared-universal/errors/index.js";
import { Type } from "@sinclair/typebox";
import fp from "fastify-plugin";

import { type ImageUsage } from "../../../domain/images/schemas.js";
import { StringUUID } from "../../../lib/ext/typebox.js";
import { EmptyObject } from "../../http/schemas.js";
import { USER_TOKEN_SECURITY, withSite } from "../../http/security/index.js";
import { type AppFastify } from "../../http/type-providers.js";

import {
  CreateUploadUrlResponse,
  CompleteUploadResponse,
  CreateUploadUrlRequest,
} from "./schemas.js";

async function imageRoutes(fastify: AppFastify) {
  fastify.post<{
    Params: { siteId: string };
    Body: { usage: ImageUsage };
  }>(
    "/sites/:siteId/images/create-upload-url",
    {
      schema: {
        params: Type.Object({
          siteId: StringUUID,
        }),
        body: CreateUploadUrlRequest,
        response: {
          200: CreateUploadUrlResponse,
        },
      },
      oas: {
        tags: ["images"],
        security: USER_TOKEN_SECURITY,
      },
    },
    withSite(async (user, site, request) => {
      const { images } = request.deps;
      return await images.createUploadUrl(
        user.userId,
        site.siteId,
        request.body.usage,
      );
    }),
  );

  // fastify.post<{
  //   Params: { siteId: string; imageUploadId: string };
  // }>(
  //   "/sites/:siteId/images/uploads/:imageUploadId/complete",
  //   {
  //     schema: {
  //       params: Type.Object({
  //         siteId: StringUUID,
  //         imageUploadId: StringUUID,
  //       }),
  //       body: EmptyObject,
  //       response: {
  //         200: CompleteUploadResponse,
  //       },
  //     },
  //     oas: {
  //       tags: ["images"],
  //       security: USER_TOKEN_SECURITY,
  //     },
  //   },
  //   withSite(async (user, site, request) => {
  //     const { images } = request.deps;
  //     return await images.completeUpload(
  //       user.userId,
  //       site.siteId,
  //       request.params.imageUploadId,
  //     );
  //   }),
  // );
}

export const IMAGE_ROUTES = fp(imageRoutes, {
  name: "IMAGE_ROUTES",
  fastify: ">= 4",
});
