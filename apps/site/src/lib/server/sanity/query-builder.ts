import { createGroqBuilder, type QueryRunnerFunction } from "groqd";

import type { AllSanitySchemaTypes, internalGroqTypeReferenceTo } from "./sanity-content-types.js";

type SchemaConfig = {
  schemaTypes: AllSanitySchemaTypes;
  referenceSymbol: typeof internalGroqTypeReferenceTo;
};
export const q = createGroqBuilder<SchemaConfig>();

export type QueryRunner = QueryRunnerFunction<object>;