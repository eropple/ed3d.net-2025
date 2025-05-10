import { desc, eq } from "drizzle-orm";
import type { Logger } from "pino";
import type { Node } from "prosemirror-model";

import { TextIds, TextRevisionIds, type TextId } from "$lib/domain/texts/ids.js";
import { type TextContentType as TextContentTypeDTO } from "$lib/domain/texts/types.js";
import { TEXTS, type DBText } from "$lib/server/db/schema/index.js";
import { type Drizzle, type DrizzleRO } from "$lib/server/db/types.js";
import type { TipTapPresetKind } from "$lib/shared/tiptap-presets.js";


export class TextService {
  private readonly logger: Logger;

  constructor(
    logger: Logger,
    private readonly db: Drizzle,
    private readonly dbRO: DrizzleRO,
  ) {
    this.logger = logger.child({ component: TextService.name });
  }

  private static _toTextContentDTO(dbText: DBText): TextContentTypeDTO {
    return {
      __type: "TextContent",
      textId: TextIds.toRichId(dbText.textUuid),
      revisionId: TextRevisionIds.toRichId(dbText.revisionUuid),
      kind: dbText.kind as TipTapPresetKind,
      contentJson: dbText.contentJson as Node,
      createdAt: dbText.createdAt,
    };
  }

  /**
   * Creates a new text entry with its first revision.
   */
  async createText(
    params: {
      presetKind: TipTapPresetKind;
      jsonContent: Node;
    },
    executor: Drizzle = this.db
  ): Promise<TextContentTypeDTO> {
    const logger = this.logger.child({ fn: "createText", kind: params.presetKind });
    logger.debug("Attempting to create new text content.");

    const [dbText] = await executor
      .insert(TEXTS)
      .values({
        kind: params.presetKind,
        contentJson: params.jsonContent,
      })
      .returning();

    if (!dbText) {
      logger.error("Failed to insert new text content into database.");
      throw new Error("Failed to create text content.");
    }

    logger.info({ textId: dbText.textUuid, revisionId: dbText.revisionUuid }, "Successfully created new text content.");
    return TextService._toTextContentDTO(dbText);
  }

  /**
   * Adds a new revision to an existing text entry.
   */
  async addRevision(
    params: {
      textId: TextId;
      contentJson: Node;
    },
    executor: Drizzle = this.db
  ): Promise<TextContentTypeDTO> {
    const logger = this.logger.child({ fn: "addRevision", textId: params.textId });
    logger.debug("Attempting to add new revision to text content.");

    const textUuidString = TextIds.toUUID(params.textId);

    const latestExistingRevision = await executor
      .select({ kind: TEXTS.kind })
      .from(TEXTS)
      .where(eq(TEXTS.textUuid, textUuidString))
      .orderBy(desc(TEXTS.createdAt))
      .limit(1)
      .then(res => res[0]);

    if (!latestExistingRevision) {
      logger.error({ textId: params.textId }, "Cannot add revision, original text not found.");
      throw new Error(`Text content with ID ${params.textId} not found.`);
    }

    const [dbText] = await executor
      .insert(TEXTS)
      .values({
        textUuid: textUuidString,
        kind: latestExistingRevision.kind,
        contentJson: params.contentJson,
      })
      .returning();

    if (!dbText) {
      logger.error({ textId: params.textId }, "Failed to insert new text revision into database.");
      throw new Error("Failed to add text revision.");
    }

    logger.info({ textId: params.textId, newRevisionId: dbText.revisionUuid }, "Successfully added new text revision.");
    return TextService._toTextContentDTO(dbText);
  }

  /**
   * Retrieves the latest revision of a specific text entry.
   */
  async getLatestTextById(
    textId: TextId,
    executor: DrizzleRO = this.dbRO
  ): Promise<TextContentTypeDTO | null> {
    const logger = this.logger.child({ fn: "getLatestTextById", textId });
    logger.debug("Attempting to retrieve latest text content by ID.");

    const result = await executor
      .select()
      .from(TEXTS)
      .where(eq(TEXTS.textUuid, TextIds.toUUID(textId)))
      .orderBy(desc(TEXTS.createdAt))
      .limit(1);

    const dbText = result[0] || null;

    if (!dbText) {
      logger.warn("Text content not found.");
      return null;
    }

    logger.debug("Successfully retrieved latest text content.");
    return TextService._toTextContentDTO(dbText);
  }
}
