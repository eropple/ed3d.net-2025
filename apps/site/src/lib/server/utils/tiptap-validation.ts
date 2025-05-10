import { getSchema, type AnyExtension } from "@tiptap/core";
import type { Logger } from "pino";
import { Node as ProseMirrorNode } from "prosemirror-model";

import { getPresetExtensions, type TipTapPresetKind } from "$lib/shared/tiptap-presets";

interface ValidationSuccess {
  isValid: true;
  validatedJson: Record<string, unknown>;
}

interface ValidationError {
  isValid: false;
  error: string;
  details?: string; // For ProseMirrorError messages or other details
}

export type TipTapValidationResult = ValidationSuccess | ValidationError;

/**
 * Validates a Tiptap JSON object against a specified preset's schema.
 *
 * @param tiptapJson The Tiptap JSON content (as a JavaScript object).
 * @param presetKind The kind of preset to validate against.
 * @returns A ValidationSuccess object with the validated JSON, or a ValidationError object.
 */
export function validateTiptapJson(
  logger: Logger,
  tiptapJson: Record<string, unknown>,
  presetKind: TipTapPresetKind
): TipTapValidationResult {
  logger = logger.child({fn: "validateTiptapJson", presetKind, tiptapJsonCount: Object.keys(tiptapJson).length});

  logger.debug("Validating Tiptap JSON.");

  try {
    const extensions: AnyExtension[] = getPresetExtensions(presetKind);
    if (!extensions || extensions.length === 0) {
      logger.error("No extensions found for preset.");
      return {
        isValid: false,
        error: `Validation_Preset_Error: No extensions found for preset: ${presetKind}`
      };
    }

    const schema = getSchema(extensions);
    const prosemirrorDoc = ProseMirrorNode.fromJSON(schema, tiptapJson);

    return {
      isValid: true,
      validatedJson: prosemirrorDoc.toJSON() as Record<string, unknown>
    };
  } catch (err) {
    const error = err as Error;

    logger.error({ err }, "Tiptap JSON validation failed.");

    return {
      isValid: false,
      error: "Validation_Schema_Error: Tiptap JSON does not conform to the schema.",
      details: error.message || "Unknown schema validation error"
    };
  }
}