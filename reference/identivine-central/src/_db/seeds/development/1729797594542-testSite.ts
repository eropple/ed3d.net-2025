/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from "fs";
import path from "path";

import * as YAML from "js-yaml";
import { type Logger } from "pino";

import { type AppSingletonCradle } from "../../../_deps/singleton.js";
import { type ContentBlockRenderSettings } from "../../../domain/content-blocks/schemas/content-block-rendering/index.js";
import { type RichTextTipTapV1 } from "../../../domain/rich-text/schemas.js";
import { type SeedFn } from "../../../lib/seeder/index.js";
import {
  SITE_CONTENT_BLOCKS,
  SITE_CONTENT_CONTAINERS,
  SITE_DOMAINS,
  SITES,
} from "../../schema/index.js";

async function seedStandardSite(
  hostedSiteDomain: string,
  deps: AppSingletonCradle,
  logger: Logger,
) {
  if (!hostedSiteDomain) {
    throw new Error("Failed to find hosted site domain.");
  }

  logger.info({ hostedSiteDomain }, "Inserting 'standard' site.");

  const { db, users } = deps;

  const { user: ourHostedUser, emailToken: ourHostedEmail } =
    await users.TX_createUserWithCredentials({
      displayName: "Hosted Test User",
      email: "h@example.com",
      passwordCleartext: "password",
    });

  if (!ourHostedUser) {
    throw new Error("Failed to insert user.");
  }

  const validatedHostedUser = await users.validateUserEmail({
    userId: ourHostedUser.userId,
    token: ourHostedEmail.token,
  });

  if (!validatedHostedUser || !validatedHostedUser.emailVerifiedAt) {
    throw new Error("Failed to validate user email.");
  }

  const [ourHostedSite] = await db
    .insert(SITES)
    .values({
      userId: ourHostedUser.userId,
      title: "A Standard Test Site That We Host",
      blurb: {
        kind: "tt",
        version: 2,
        content: {},
      } satisfies RichTextTipTapV1,
      publishedAt: new Date(),
      tier: "standard",
    })
    .returning();

  if (!ourHostedSite) {
    throw new Error("Failed to insert site.");
  }

  const [ourHostedSiteDomain] = await db
    .insert(SITE_DOMAINS)
    .values({
      siteId: ourHostedSite.siteId,
      // @ts-expect-error JSON spelunking
      fqdn: hostedSiteDomain.hostname,
      controlSource: "subdomain",
    })
    .returning();

  if (!ourHostedSiteDomain) {
    throw new Error("Failed to insert site domain.");
  }

  const [ourHostedSiteContainerA, ourHostedSiteContainerB] = await db
    .insert(SITE_CONTENT_CONTAINERS)
    .values([
      {
        siteId: ourHostedSite.siteId,
        order: 0,
      },
      {
        siteId: ourHostedSite.siteId,
        title: "Container B",
        order: 1,
      },
    ])
    .returning();

  if (!ourHostedSiteContainerA || !ourHostedSiteContainerB) {
    throw new Error("Failed to insert site content containers.");
  }

  const contentBlocksA: ContentBlockRenderSettings[] = [
    {
      t: "cr",
      kind: "link",
      version: 1,
      title: "Home",
      url: "https://myblog.example",
      icon: "house",
    },
    {
      t: "cr",
      kind: "link",
      version: 1,
      title: "Disabled Link",
      url: "https://nopenopenope.example",
      icon: "warn",
    },
  ];

  const contentBlocksB: ContentBlockRenderSettings[] = [
    {
      t: "cr",
      kind: "link",
      version: 1,
      title: "Instagram",
      url: "https://www.instagram.com",
      icon: "instagram",
    },
    {
      t: "cr",
      kind: "link",
      version: 1,
      title: "Bluesky",
      url: "https://bsky.app",
      icon: "bluesky",
    },
  ];

  const ourHostedContentBlocksA = await db
    .insert(SITE_CONTENT_BLOCKS)
    .values([
      {
        siteContentContainerId: ourHostedSiteContainerA.siteContentContainerId,
        order: 0,
        renderSettings: contentBlocksA[0]!,
      },
      {
        siteContentContainerId: ourHostedSiteContainerA.siteContentContainerId,
        order: 1,
        renderSettings: contentBlocksA[1]!,
      },
      {
        siteContentContainerId: ourHostedSiteContainerB.siteContentContainerId,
        order: 1,
        renderSettings: contentBlocksB[0]!,
      },
      {
        siteContentContainerId: ourHostedSiteContainerB.siteContentContainerId,
        order: 0,
        renderSettings: contentBlocksB[1]!,
      },
    ])
    .returning();

  if (ourHostedContentBlocksA.length !== 4) {
    throw new Error("Failed to insert site content blocks.");
  }
}

async function seedPlusSite(
  hostedSiteDomain: string,
  deps: AppSingletonCradle,
  logger: Logger,
) {
  logger.info({ hostedSiteDomain }, "Inserting 'plus' site.");

  const { db, users } = deps;

  const { user: ourHostedPlusUser, emailToken: ourHostedPlusEmail } =
    await users.TX_createUserWithCredentials({
      displayName: "Hosted Plus Test User",
      email: "hplus@example.com",
      passwordCleartext: "password",
    });

  if (!ourHostedPlusUser) {
    throw new Error("Failed to insert user.");
  }

  const validatedHostedPlusUser = await users.validateUserEmail({
    userId: ourHostedPlusUser.userId,
    token: ourHostedPlusEmail.token,
  });

  if (!validatedHostedPlusUser || !validatedHostedPlusUser.emailVerifiedAt) {
    throw new Error("Failed to validate user email.");
  }

  const [ourHostedPlusSite] = await db
    .insert(SITES)
    .values({
      userId: ourHostedPlusUser.userId,
      title: "A Plus Test Site That We Host",
      blurb: {
        kind: "tt",
        version: 2,
        content: {},
      } satisfies RichTextTipTapV1,
      publishedAt: new Date(),
      tier: "plus",
    })
    .returning();

  if (!ourHostedPlusSite) {
    throw new Error("Failed to insert site.");
  }

  const [ourHostedPlusSiteDomain] = await db
    .insert(SITE_DOMAINS)
    .values({
      siteId: ourHostedPlusSite.siteId,
      // @ts-expect-error JSON spelunking
      fqdn: hostedSiteDomain.hostname,
      controlSource: "subdomain",
    })
    .returning();

  if (!ourHostedPlusSiteDomain) {
    throw new Error("Failed to insert site domain.");
  }

  const [ourHostedPlusSiteContainerA, ourHostedPlusSiteContainerB] = await db
    .insert(SITE_CONTENT_CONTAINERS)
    .values([
      {
        siteId: ourHostedPlusSite.siteId,
        order: 0,
      },
      {
        siteId: ourHostedPlusSite.siteId,
        title: "Container B",
        order: 1,
      },
    ])
    .returning();

  if (!ourHostedPlusSiteContainerA || !ourHostedPlusSiteContainerB) {
    throw new Error("Failed to insert site content containers.");
  }

  const contentBlocksA: ContentBlockRenderSettings[] = [
    {
      t: "cr",
      kind: "link",
      version: 1,
      title: "Pro Blog",
      url: "https://blog.example",
      icon: "blog",
    },
    {
      t: "cr",
      kind: "link",
      version: 1,
      title: "Pro Store",
      url: "https://store.example",
      icon: "store",
    },
  ];

  const contentBlocksB: ContentBlockRenderSettings[] = [
    {
      t: "cr",
      kind: "link",
      version: 1,
      title: "YouTube",
      url: "https://youtube.com",
      icon: "youtube",
    },
    {
      t: "cr",
      kind: "link",
      version: 1,
      title: "Twitch",
      url: "https://twitch.tv",
      icon: "twitch",
    },
  ];

  const ourHostedPlusContentBlocks = await db
    .insert(SITE_CONTENT_BLOCKS)
    .values([
      {
        siteContentContainerId:
          ourHostedPlusSiteContainerA.siteContentContainerId,
        order: 0,
        renderSettings: contentBlocksA[0]!,
      },
      {
        siteContentContainerId:
          ourHostedPlusSiteContainerA.siteContentContainerId,
        order: 1,
        renderSettings: contentBlocksA[1]!,
      },
      {
        siteContentContainerId:
          ourHostedPlusSiteContainerB.siteContentContainerId,
        order: 1,
        renderSettings: contentBlocksB[0]!,
      },
      {
        siteContentContainerId:
          ourHostedPlusSiteContainerB.siteContentContainerId,
        order: 0,
        renderSettings: contentBlocksB[1]!,
      },
    ])
    .returning();

  if (ourHostedPlusContentBlocks.length !== 4) {
    throw new Error("Failed to insert site content blocks.");
  }
}

export const seed: SeedFn = async (deps, logger) => {
  logger.info({ file: import.meta.url }, "Seeding.");

  const domainFilePath = path.join(
    import.meta.dirname,
    "../../../../../..",
    "_dev-env/cloudflared/config.yaml",
  );

  const domains: any = YAML.load(
    await fs.promises.readFile(domainFilePath, "utf-8"),
  );

  const hostedSiteDomain = domains.ingress.find((item: any) =>
    item.hostname.includes("-hosted."),
  );
  const hostedPlusSiteDomain = domains.ingress.find((item: any) =>
    item.hostname.includes("-hostedplus."),
  );

  if (!hostedSiteDomain || !hostedPlusSiteDomain) {
    throw new Error("Failed to find domains.");
  }

  await seedStandardSite(hostedSiteDomain, deps, logger);
  await seedPlusSite(hostedPlusSiteDomain, deps, logger);
};
