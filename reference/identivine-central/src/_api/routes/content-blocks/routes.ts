import { ResourceNotFoundError } from "@myapp/shared-universal/errors/index.js";
import { Type } from "@sinclair/typebox";
import fp from "fastify-plugin";

import { StringUUID } from "../../../lib/ext/typebox.js";
import { OKResponse, RedirectResponse } from "../../http/schemas.js";
import {
  USER_TOKEN_SECURITY,
  uH,
  withSite,
} from "../../http/security/index.js";
import { type AppFastify } from "../../http/type-providers.js";

import { withBlock, withContainer } from "./_helpers.js";
import {
  BlockResponse,
  ContainerResponse,
  CreateBlockRequest,
  CreateContainerRequest,
  MoveBlockRequest,
  MoveContainerRequest,
  UpdateBlockRequest,
  UpdateContainerRequest,
} from "./schemas.js";

async function contentBlockRoutes(fastify: AppFastify) {
  // Get containers for site
  fastify.get<{
    Params: { siteId: string };
  }>(
    "/sites/:siteId/content-containers",
    {
      schema: {
        params: Type.Object({
          siteId: StringUUID,
        }),
        response: {
          200: Type.Array(ContainerResponse),
        },
      },
      oas: {
        operationId: "getSiteContainers",
        summary: "Get containers for a site",
        tags: ["content-blocks"],
        security: USER_TOKEN_SECURITY,
      },
    },
    withSite(async (user, site, request) => {
      const { contentBlocks } = request.deps;
      return await contentBlocks.getSiteContainers(site.siteId);
    }),
  );

  // Create container
  fastify.post<{
    Params: { siteId: string };
    Body: CreateContainerRequest;
  }>(
    "/sites/:siteId/content-containers",
    {
      schema: {
        params: Type.Object({
          siteId: StringUUID,
        }),
        body: CreateContainerRequest,
        response: {
          200: ContainerResponse,
        },
      },
      oas: {
        operationId: "createContentContainer",
        summary: "Create a new content container",
        tags: ["content-blocks"],
        security: USER_TOKEN_SECURITY,
      },
    },
    withSite(async (user, site, request) => {
      const { contentBlocks } = request.deps;
      return await contentBlocks.createContainer(
        site.siteId,
        request.body.title,
      );
    }),
  );

  // Update container
  fastify.patch<{
    Params: { siteId: string; containerId: string };
    Body: UpdateContainerRequest;
  }>(
    "/sites/:siteId/content-containers/:containerId",
    {
      schema: {
        params: Type.Object({
          siteId: StringUUID,
          containerId: Type.String(),
        }),
        body: UpdateContainerRequest,
        response: {
          200: ContainerResponse,
        },
      },
      oas: {
        operationId: "updateContentContainer",
        summary: "Update a content container",
        tags: ["content-blocks"],
        security: USER_TOKEN_SECURITY,
      },
    },
    withContainer(async (user, site, container, request) => {
      const { contentBlocks } = request.deps;
      return await contentBlocks.updateContainer(
        container.siteContentContainerId,
        request.body.title,
      );
    }),
  );

  // Delete container
  fastify.delete<{
    Params: { siteId: string; containerId: string };
  }>(
    "/sites/:siteId/content-containers/:containerId",
    {
      schema: {
        params: Type.Object({
          siteId: StringUUID,
          containerId: Type.String(),
        }),
        response: {
          200: OKResponse,
        },
      },
      oas: {
        operationId: "deleteContentContainer",
        summary: "Delete a content container and its blocks",
        tags: ["content-blocks"],
        security: USER_TOKEN_SECURITY,
      },
    },
    withContainer(async (user, site, container, request) => {
      const { contentBlocks } = request.deps;
      await contentBlocks.deleteContainer(container.siteContentContainerId);
      return { ok: true } satisfies OKResponse;
    }),
  );

  // Move container
  fastify.post<{
    Params: { siteId: string; containerId: string };
    Body: MoveContainerRequest;
  }>(
    "/sites/:siteId/content-containers/:containerId/move",
    {
      schema: {
        params: Type.Object({
          siteId: StringUUID,
          containerId: Type.String(),
        }),
        body: MoveContainerRequest,
        response: {
          200: ContainerResponse,
        },
      },
      oas: {
        operationId: "moveContentContainer",
        summary: "Move a content container",
        tags: ["content-blocks"],
        security: USER_TOKEN_SECURITY,
      },
    },
    withContainer(async (user, site, container, request) => {
      const { contentBlocks } = request.deps;
      return await contentBlocks.moveContainer(
        container.siteContentContainerId,
        request.body.targetContainerId,
      );
    }),
  );

  // Get blocks for container
  fastify.get<{
    Params: { siteId: string; containerId: string };
  }>(
    "/sites/:siteId/content-containers/:containerId/blocks",
    {
      schema: {
        params: Type.Object({
          siteId: StringUUID,
          containerId: Type.String(),
        }),
        response: {
          200: Type.Array(BlockResponse),
        },
      },
      oas: {
        operationId: "getContainerBlocks",
        summary: "Get blocks for a container",
        tags: ["content-blocks"],
        security: USER_TOKEN_SECURITY,
      },
    },
    withContainer(async (user, site, container, request) => {
      const { contentBlocks } = request.deps;
      return await contentBlocks.getBlocksForContainerId(
        container.siteContentContainerId,
      );
    }),
  );

  // Add block to container
  fastify.post<{
    Params: { containerId: string };
    Body: CreateBlockRequest;
  }>(
    "/sites/:siteId/content-containers/:containerId/blocks",
    {
      schema: {
        params: Type.Object({
          siteId: StringUUID,
          containerId: Type.String(),
        }),
        body: CreateBlockRequest,
        response: {
          200: BlockResponse,
        },
      },
      oas: {
        operationId: "createContentBlock",
        summary: "Create a new content block",
        tags: ["content-blocks"],
        security: USER_TOKEN_SECURITY,
      },
    },
    withContainer(async (user, site, container, request) => {
      const { contentBlocks } = request.deps;
      return await contentBlocks.addBlock(
        container.siteContentContainerId,
        request.body.settings,
      );
    }),
  );

  // Update block
  fastify.patch<{
    Params: { blockId: string };
    Body: UpdateBlockRequest;
  }>(
    "/sites/:siteId/content-blocks/:blockId",
    {
      schema: {
        params: Type.Object({
          siteId: StringUUID,
          blockId: Type.String(),
        }),
        body: UpdateBlockRequest,
        response: {
          200: BlockResponse,
        },
      },
      oas: {
        operationId: "updateContentBlock",
        summary: "Update a content block",
        tags: ["content-blocks"],
        security: USER_TOKEN_SECURITY,
      },
    },
    withBlock(async (user, site, block, request) => {
      const { contentBlocks } = request.deps;
      return await contentBlocks.updateBlock(
        block.siteContentBlockId,
        request.body.settings,
      );
    }),
  );

  // Move block
  fastify.post<{
    Params: { blockId: string };
    Body: MoveBlockRequest;
  }>(
    "/sites/:siteId/content-blocks/:blockId/move",
    {
      schema: {
        params: Type.Object({
          siteId: StringUUID,
          blockId: Type.String(),
        }),
        body: MoveBlockRequest,
        response: {
          200: BlockResponse,
        },
      },
      oas: {
        operationId: "moveContentBlock",
        summary: "Move a content block",
        tags: ["content-blocks"],
        security: USER_TOKEN_SECURITY,
      },
    },
    withBlock(async (user, site, block, request) => {
      const { contentBlocks } = request.deps;
      return await contentBlocks.moveBlock(
        block.siteContentBlockId,
        request.body.targetContainerId,
        request.body.targetBlockId,
      );
    }),
  );

  // Delete block
  fastify.delete<{
    Params: { blockId: string };
  }>(
    "/sites/:siteId/content-blocks/:blockId",
    {
      schema: {
        params: Type.Object({
          siteId: StringUUID,
          blockId: Type.String(),
        }),
        response: {
          200: OKResponse,
        },
      },
      oas: {
        operationId: "deleteContentBlock",
        summary: "Delete a content block",
        tags: ["content-blocks"],
        security: USER_TOKEN_SECURITY,
      },
    },
    withBlock(async (user, site, block, request) => {
      const { contentBlocks } = request.deps;
      await contentBlocks.deleteBlock(block.siteContentBlockId);
      return { ok: true } satisfies OKResponse;
    }),
  );

  // Link redirect
  fastify.get<{
    Params: { blockId: string };
  }>(
    "/content-blocks/:blockId/redirect",
    {
      schema: {
        params: Type.Object({
          blockId: Type.String(),
        }),
        response: {
          302: RedirectResponse,
        },
      },
      oas: {
        operationId: "redirectContentBlock",
        summary: "Redirect to block target URL",
        tags: ["content-blocks"],
        security: {},
      },
    },
    async (request, reply) => {
      const { contentBlocks } = request.deps;
      const block = await contentBlocks.getBlockById(request.params.blockId);

      if (
        !block ||
        block.renderSettings.t !== "cr" ||
        block.renderSettings.kind !== "link"
      ) {
        throw new ResourceNotFoundError(
          "block",
          "blockId",
          request.params.blockId,
        );
      }

      const url = block.renderSettings.url;
      return reply.code(302).header("Location", url).send({ redirect: url });
    },
  );
}

export const CONTENT_BLOCK_ROUTES = fp(contentBlockRoutes, {
  name: "CONTENT_BLOCK_ROUTES",
  fastify: ">= 4",
});
