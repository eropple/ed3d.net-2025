import {
  BadRequestError,
  ResourceNotFoundError,
} from "@myapp/shared-universal/errors/index.js";
import { type FastifyReply, type FastifyRequest } from "fastify";

import {
  type DBUser,
  type DBSite,
  type DBSiteContentContainer,
  type DBSiteContentBlock,
} from "../../../_db/models.js";
import { withSite } from "../../http/security/index.js";

export type ExpectedContainerParams = {
  siteId: string;
  containerId: string;
};

export type ExpectedBlockParams = {
  siteId: string;
  blockId: string;
};

export async function resolveContainer(
  request: FastifyRequest,
  containerId: string,
) {
  const { contentBlocks } = request.deps;
  if (!containerId) {
    throw new BadRequestError("containerId is required");
  }

  const container = await contentBlocks.getContainerById(containerId);

  if (!container) {
    throw new ResourceNotFoundError("container", "containerId", containerId);
  }

  return container;
}

export async function resolveBlock(request: FastifyRequest, blockId: string) {
  const { contentBlocks } = request.deps;
  if (!blockId) {
    throw new BadRequestError("blockId is required");
  }

  const block = await contentBlocks.getBlockById(blockId);

  if (!block) {
    throw new ResourceNotFoundError("block", "blockId", blockId);
  }

  return block;
}

export function withContainer<
  TRet,
  TRequest extends FastifyRequest,
  TReply extends FastifyReply,
>(
  fn: (
    user: DBUser,
    site: DBSite,
    container: DBSiteContentContainer,
    request: TRequest,
    reply: TReply,
  ) => TRet | Promise<TRet>,
) {
  return withSite<TRet, TRequest, TReply>(
    async (user, site, request, reply) => {
      const containerId = (request.params as ExpectedContainerParams)
        .containerId;
      const container = await resolveContainer(request, containerId);

      if (container.siteId !== site.siteId) {
        request.log.warn(
          {
            siteId: site.siteId,
            containerSiteId: container.siteId,
          },
          "Container does not belong to site",
        );
        throw new ResourceNotFoundError(
          "container",
          "containerId",
          containerId,
        );
      }

      return fn(user, site, container, request, reply);
    },
  );
}

export function withBlock<
  TRet,
  TRequest extends FastifyRequest,
  TReply extends FastifyReply,
>(
  fn: (
    user: DBUser,
    site: DBSite,
    block: DBSiteContentBlock,
    request: TRequest,
    reply: TReply,
  ) => TRet | Promise<TRet>,
) {
  return withSite<TRet, TRequest, TReply>(
    async (user, site, request, reply) => {
      const blockId = (request.params as ExpectedBlockParams).blockId;
      const block = await resolveBlock(request, blockId);

      // Get container to verify site ownership
      const container = await resolveContainer(
        request,
        block.siteContentContainerId,
      );
      if (container.siteId !== site.siteId) {
        request.log.warn(
          {
            siteId: site.siteId,
            containerSiteId: container.siteId,
            blockId: blockId,
          },
          "Container does not belong to site (requested via block)",
        );
        throw new ResourceNotFoundError("block", "blockId", blockId);
      }

      return fn(user, site, block, request, reply);
    },
  );
}
