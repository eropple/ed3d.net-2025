import { schemaType } from "@eropple/fastify-openapi3";
import { type Static, Type } from "@sinclair/typebox";

import { ContentBlockRenderSettings } from "../../../domain/content-blocks/schemas/content-block-rendering/index.js";

export const ContainerName = Type.String({ minLength: 1 });
export type ContainerName = Static<typeof ContainerName>;

export const CreateContainerRequest = schemaType(
  "CreateContainerRequest",
  Type.Object({
    title: Type.Union([ContainerName, Type.Null()]),
  }),
);
export type CreateContainerRequest = Static<typeof CreateContainerRequest>;

export const UpdateContainerRequest = schemaType(
  "UpdateContainerRequest",
  Type.Object({
    title: Type.Union([ContainerName, Type.Null()]),
  }),
);
export type UpdateContainerRequest = Static<typeof UpdateContainerRequest>;

export const MoveContainerRequest = schemaType(
  "MoveContainerRequest",
  Type.Object({
    targetContainerId: Type.Union([Type.String(), Type.Null()]),
  }),
);
export type MoveContainerRequest = Static<typeof MoveContainerRequest>;

export const CreateBlockRequest = schemaType(
  "CreateBlockRequest",
  Type.Object({
    settings: ContentBlockRenderSettings,
  }),
);
export type CreateBlockRequest = Static<typeof CreateBlockRequest>;

export const UpdateBlockRequest = schemaType(
  "UpdateBlockRequest",
  Type.Object({
    settings: ContentBlockRenderSettings,
  }),
);
export type UpdateBlockRequest = Static<typeof UpdateBlockRequest>;

export const MoveBlockRequest = schemaType(
  "MoveBlockRequest",
  Type.Object({
    targetContainerId: Type.String(),
    targetBlockId: Type.Union([Type.String(), Type.Null()]),
  }),
);
export type MoveBlockRequest = Static<typeof MoveBlockRequest>;

export const ContainerResponse = schemaType(
  "ContainerResponse",
  Type.Object({
    siteContentContainerId: Type.String(),
    title: Type.Union([Type.String(), Type.Null()]),
    order: Type.Number(),
  }),
);
export type ContainerResponse = Static<typeof ContainerResponse>;

export const BlockResponse = schemaType(
  "BlockResponse",
  Type.Object({
    siteContentBlockId: Type.String(),
    siteContentContainerId: Type.String(),
    order: Type.Number(),
    active: Type.Boolean(),
    renderSettings: ContentBlockRenderSettings,
  }),
);
export type BlockResponse = Static<typeof BlockResponse>;
