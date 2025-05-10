import { type Actions, fail } from "@sveltejs/kit";

import { validateTiptapJson } from "$lib/server/utils/tiptap-validation"; // Import the new utility
import type { TipTapPresetKind } from "$lib/shared/tiptap-presets";

export const actions: Actions = {
  validateContent: async ({ request, locals }) => {
    const logger = locals.logger.child({ action: "/dev/editor-test:validateContent" });

    const formData = await request.formData();
    const jsonContentString = formData.get("editor_content_json") as string | null;
    const presetKind: TipTapPresetKind = "comment"; // Assuming 'comment' mode for this test

    if (!jsonContentString) {
      logger.error("No JSON content received for validation.");
      return fail(400, { error: "No JSON content provided." });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let tiptapJsonInput: Record<string, any>; // Keep as any for JSON.parse initially
    try {
      tiptapJsonInput = JSON.parse(jsonContentString);
    } catch (parseError) {
      logger.error({ err: parseError }, "Failed to parse JSON content string.");
      return fail(400, { error: "Invalid JSON content provided.", details: (parseError as Error).message });
    }

    // Use the validation utility
    const validationResult = validateTiptapJson(logger, tiptapJsonInput, presetKind);

    if (validationResult.isValid) {
      logger.info("Schema validation successful!");
      logger.info("Validated ProseMirror Document (JSON):", JSON.stringify(validationResult.validatedJson, null, 2));
      return {
        success: true,
        message: "Content validated successfully against the schema.",
        validatedJson: validationResult.validatedJson,
      };
    } else {
      logger.error({ validationError: validationResult }, "Schema validation failed.");
      return fail(400, {
        error: validationResult.error,
        details: validationResult.details,
        originalJsonString: jsonContentString,
      });
    }
  }
};