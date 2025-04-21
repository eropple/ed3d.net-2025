import {
  BadRequestError,
  InternalServerError,
  ResourceNotFoundError,
} from "@myapp/shared-universal/errors/index.js";
import { type Logger } from "pino";

import {
  type DBSiteContentBlock,
  type DBSiteContentContainer,
} from "../../_db/models.js";
import {
  SITE_CONTENT_CONTAINERS,
  SITE_CONTENT_BLOCKS,
} from "../../_db/schema/index.js";
import {
  eq,
  and,
  gt,
  type Drizzle,
  type DrizzleRO,
} from "../../lib/datastores/postgres/types.server.js";

import { type ContentBlockRenderSettings } from "./schemas/content-block-rendering/index.js";

export class ContentBlocksService {
  private readonly logger: Logger;

  constructor(
    logger: Logger,
    private readonly db: Drizzle,
    private readonly dbRO: DrizzleRO,
  ) {
    this.logger = logger.child({ context: this.constructor.name });
  }

  async getBlocksForContainerId(containerId: string, executor?: DrizzleRO) {
    executor = executor ?? this.dbRO;
    return executor
      .select()
      .from(SITE_CONTENT_BLOCKS)
      .where(
        and(
          eq(SITE_CONTENT_BLOCKS.siteContentContainerId, containerId),
          eq(SITE_CONTENT_BLOCKS.active, true),
        ),
      )
      .orderBy(SITE_CONTENT_BLOCKS.order);
  }

  async getBlockById(
    blockId: string,
    executor?: DrizzleRO,
  ): Promise<DBSiteContentBlock | null> {
    const logger = this.logger.child({ fn: "getBlockById", blockId });
    executor = executor ?? this.dbRO;

    const block = await executor
      .select()
      .from(SITE_CONTENT_BLOCKS)
      .where(eq(SITE_CONTENT_BLOCKS.siteContentBlockId, blockId))
      .limit(1);

    return block[0] ?? null;
  }

  async getSiteContainers(
    siteId: string,
    executor?: DrizzleRO,
  ): Promise<Array<DBSiteContentContainer>> {
    executor = executor ?? this.dbRO;
    return executor
      .select()
      .from(SITE_CONTENT_CONTAINERS)
      .where(eq(SITE_CONTENT_CONTAINERS.siteId, siteId))
      .orderBy(SITE_CONTENT_CONTAINERS.order);
  }

  async getContainerById(
    containerId: string,
    executor?: DrizzleRO,
  ): Promise<DBSiteContentContainer | null> {
    executor = executor ?? this.dbRO;
    const container = await executor
      .select()
      .from(SITE_CONTENT_CONTAINERS)
      .where(eq(SITE_CONTENT_CONTAINERS.siteContentContainerId, containerId))
      .limit(1);

    return container[0] ?? null;
  }

  async createContainer(
    siteId: string,
    title: string | null,
    executor?: Drizzle,
  ) {
    const logger = this.logger.child({ fn: "createContainer", siteId, title });
    logger.info("Creating new container");
    executor = executor ?? this.db;

    // Get max order and increment
    const maxOrder = await this.dbRO
      .select({ order: SITE_CONTENT_CONTAINERS.order })
      .from(SITE_CONTENT_CONTAINERS)
      .where(eq(SITE_CONTENT_CONTAINERS.siteId, siteId))
      .orderBy(SITE_CONTENT_CONTAINERS.order)
      .limit(1);

    const order = (maxOrder[0]?.order ?? 0) + 1;

    const [container] = await executor
      .insert(SITE_CONTENT_CONTAINERS)
      .values({
        siteId,
        title,
        order,
      })
      .returning();

    if (!container) {
      throw new InternalServerError("Failed to create container");
    }

    logger.info(
      { containerId: container.siteContentContainerId, order: container.order },
      "Created container",
    );
    return container;
  }

  async updateContainer(
    containerId: string,
    title: string | null,
    executor?: Drizzle,
  ) {
    const logger = this.logger.child({ fn: "updateContainer", containerId });
    executor = executor ?? this.db;

    const [container] = await executor
      .update(SITE_CONTENT_CONTAINERS)
      .set({ title })
      .where(eq(SITE_CONTENT_CONTAINERS.siteContentContainerId, containerId))
      .returning();

    if (!container) {
      throw new ResourceNotFoundError("container", "containerId", containerId);
    }

    logger.info({ title }, "Updated container");
    return container;
  }

  async moveContainer(containerId: string, targetContainerId: string | null) {
    const logger = this.logger.child({ fn: "moveContainer", containerId });

    // Get the container we're moving
    const container = await this.dbRO
      .select()
      .from(SITE_CONTENT_CONTAINERS)
      .where(eq(SITE_CONTENT_CONTAINERS.siteContentContainerId, containerId))
      .limit(1);

    if (!container[0]) {
      throw new ResourceNotFoundError("container", "containerId", containerId);
    }

    // Calculate new order
    let newOrder: number;
    if (targetContainerId) {
      const targetContainer = await this.dbRO
        .select()
        .from(SITE_CONTENT_CONTAINERS)
        .where(
          eq(SITE_CONTENT_CONTAINERS.siteContentContainerId, targetContainerId),
        )
        .limit(1);

      if (!targetContainer[0]) {
        throw new ResourceNotFoundError(
          "container",
          "targetContainerId",
          targetContainerId,
        );
      }

      // Get the next container to calculate midpoint
      const nextContainer = await this.dbRO
        .select()
        .from(SITE_CONTENT_CONTAINERS)
        .where(
          and(
            eq(SITE_CONTENT_CONTAINERS.siteId, container[0].siteId),
            gt(SITE_CONTENT_CONTAINERS.order, targetContainer[0].order),
          ),
        )
        .orderBy(SITE_CONTENT_CONTAINERS.order)
        .limit(1);

      newOrder = nextContainer[0]
        ? (targetContainer[0].order + nextContainer[0].order) / 2
        : targetContainer[0].order + 1;
    } else {
      // Get first container in site
      const firstContainer = await this.dbRO
        .select()
        .from(SITE_CONTENT_CONTAINERS)
        .where(eq(SITE_CONTENT_CONTAINERS.siteId, container[0].siteId))
        .orderBy(SITE_CONTENT_CONTAINERS.order)
        .limit(1);

      newOrder = firstContainer[0] ? firstContainer[0].order - 1 : 1;
    }

    // Update the container
    const [updatedContainer] = await this.db
      .update(SITE_CONTENT_CONTAINERS)
      .set({ order: newOrder })
      .where(eq(SITE_CONTENT_CONTAINERS.siteContentContainerId, containerId))
      .returning();

    logger.info({ newOrder }, "Moved container");
    return updatedContainer;
  }

  async deleteContainer(containerId: string, executor?: Drizzle) {
    const logger = this.logger.child({ fn: "deleteContainer", containerId });
    executor = executor ?? this.db;

    // Delete all blocks in the container first
    await executor
      .delete(SITE_CONTENT_BLOCKS)
      .where(eq(SITE_CONTENT_BLOCKS.siteContentContainerId, containerId));

    // Delete the container
    await executor
      .delete(SITE_CONTENT_CONTAINERS)
      .where(eq(SITE_CONTENT_CONTAINERS.siteContentContainerId, containerId));

    logger.info("Deleted container and its blocks");
  }

  async addBlock(
    containerId: string,
    settings: ContentBlockRenderSettings,
    executor?: Drizzle,
  ) {
    const logger = this.logger.child({
      fn: "addBlock",
      containerId,
      blockKind: settings.kind,
      blockVersion: settings.version,
    });
    logger.info("Creating new block");
    executor = executor ?? this.db;

    // Get max order and increment
    const maxOrder = await this.dbRO
      .select({ order: SITE_CONTENT_BLOCKS.order })
      .from(SITE_CONTENT_BLOCKS)
      .where(eq(SITE_CONTENT_BLOCKS.siteContentContainerId, containerId))
      .orderBy(SITE_CONTENT_BLOCKS.order)
      .limit(1);

    const order = (maxOrder[0]?.order ?? 0) + 1;

    const [block] = await executor
      .insert(SITE_CONTENT_BLOCKS)
      .values({
        siteContentContainerId: containerId,
        renderSettings: settings,
        order,
      })
      .returning();

    if (!block) {
      throw new InternalServerError("Failed to create block");
    }

    logger.info(
      { blockId: block.siteContentBlockId, order: block.order },
      "Created block",
    );
    return block;
  }

  async updateBlock(
    blockId: string,
    settings: ContentBlockRenderSettings,
    executor?: Drizzle,
  ) {
    const logger = this.logger.child({
      fn: "updateBlock",
      blockId,
      blockKind: settings.kind,
      blockVersion: settings.version,
    });
    logger.info("Updating block");
    executor = executor ?? this.db;

    const [currentBlock] = await executor
      .select()
      .from(SITE_CONTENT_BLOCKS)
      .where(eq(SITE_CONTENT_BLOCKS.siteContentBlockId, blockId))
      .limit(1);
    if (!currentBlock) {
      throw new ResourceNotFoundError("block", "blockId", blockId);
    }

    if (currentBlock.renderSettings.kind !== settings.kind) {
      throw new BadRequestError("Cannot change block kind after creation");
    }

    if (currentBlock.renderSettings.version !== settings.version) {
      throw new BadRequestError("Cannot change block version after creation");
    }

    const [block] = await executor
      .update(SITE_CONTENT_BLOCKS)
      .set({
        renderSettings: settings,
      })
      .where(eq(SITE_CONTENT_BLOCKS.siteContentBlockId, blockId))
      .returning();

    if (!block) {
      throw new ResourceNotFoundError("block", "blockId", blockId);
    }

    logger.info(
      { blockId: block.siteContentBlockId },
      "Updated block settings",
    );
    return block;
  }

  async deleteBlock(blockId: string, executor?: Drizzle) {
    const logger = this.logger.child({ fn: "deleteBlock", blockId });
    logger.info("Deleting block");
    executor = executor ?? this.db;

    await executor
      .delete(SITE_CONTENT_BLOCKS)
      .where(eq(SITE_CONTENT_BLOCKS.siteContentBlockId, blockId));

    logger.info({ blockId }, "Deleted block");
  }

  async moveBlock(
    blockId: string,
    targetContainerId: string,
    targetBlockId: string | null,
    executor?: Drizzle,
  ) {
    const logger = this.logger.child({
      fn: "moveBlock",
      blockId,
      targetContainerId,
    });
    executor = executor ?? this.db;

    const block = await this.getBlockById(blockId, executor);
    if (!block) {
      throw new ResourceNotFoundError("block", "blockId", blockId);
    }

    // Verify containers are in same site
    const containers = await executor
      .select({
        siteId: SITE_CONTENT_CONTAINERS.siteId,
        containerId: SITE_CONTENT_CONTAINERS.siteContentContainerId,
      })
      .from(SITE_CONTENT_CONTAINERS)
      .where(
        eq(SITE_CONTENT_CONTAINERS.siteContentContainerId, targetContainerId),
      );

    if (!containers[0]) {
      throw new ResourceNotFoundError(
        "container",
        "containerId",
        targetContainerId,
      );
    }

    // Calculate new order
    let newOrder: number;
    if (targetBlockId) {
      const targetBlock = await this.getBlockById(targetBlockId, executor);
      if (!targetBlock) {
        throw new ResourceNotFoundError(
          "block",
          "targetBlockId",
          targetBlockId,
        );
      }

      logger.info(
        {
          blockId,
          targetBlockId,
          targetContainerId,
        },
        "Moving block.",
      );

      // Get the next block to calculate midpoint
      const nextBlock = await executor
        .select()
        .from(SITE_CONTENT_BLOCKS)
        .where(
          and(
            eq(SITE_CONTENT_BLOCKS.siteContentContainerId, targetContainerId),
            gt(SITE_CONTENT_BLOCKS.order, targetBlock.order),
          ),
        )
        .orderBy(SITE_CONTENT_BLOCKS.order)
        .limit(1);

      newOrder = nextBlock[0]
        ? (targetBlock.order + nextBlock[0].order) / 2
        : targetBlock.order + 1;
    } else {
      // Get first block in target container
      const firstBlock = await executor
        .select()
        .from(SITE_CONTENT_BLOCKS)
        .where(
          eq(SITE_CONTENT_BLOCKS.siteContentContainerId, targetContainerId),
        )
        .orderBy(SITE_CONTENT_BLOCKS.order)
        .limit(1);

      newOrder = firstBlock[0] ? firstBlock[0].order - 1 : 1;
    }

    // Update the block
    const [updatedBlock] = await executor
      .update(SITE_CONTENT_BLOCKS)
      .set({
        siteContentContainerId: targetContainerId,
        order: newOrder,
      })
      .where(eq(SITE_CONTENT_BLOCKS.siteContentBlockId, blockId))
      .returning();

    logger.info(
      {
        newContainerId: targetContainerId,
        newOrder,
      },
      "Moved block",
    );

    return updatedBlock;
  }
}
