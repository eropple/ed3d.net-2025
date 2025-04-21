import { type SanityClient, createClient } from "@sanity/client";
import { makeSafeQueryRunner } from "groqd";
import { createGroqBuilder } from "groqd";

import { CONFIG } from "../config";

import {
  type AllSanitySchemaTypes,
  type internalGroqTypeReferenceTo,
} from "./types";

let sanityDirect: SanityClient | null = null;
let sanityCDN: SanityClient | null = null;

export function SanityDirect() {
  if (!sanityDirect) {
    sanityDirect = createClient({
      projectId: CONFIG().SANITY_PROJECT_ID,
      dataset: CONFIG().SANITY_DATASET,
      useCdn: false,
      apiVersion: "2021-03-25",
    });
  }

  return sanityDirect;
}

export function SanityCDN() {
  if (!sanityCDN) {
    sanityCDN = createClient({
      projectId: CONFIG().SANITY_PROJECT_ID,
      dataset: CONFIG().SANITY_DATASET,
      useCdn: true,
      apiVersion: "2021-03-25",
    });
  }

  return sanityCDN;
}

export const sanityQueryDirect = makeSafeQueryRunner(
  (query, { parameters }) => {
    return SanityDirect().fetch(query, parameters);
  },
);
export const sanityQueryCDN = makeSafeQueryRunner((query, { parameters }) => {
  return SanityCDN().fetch(query, parameters);
});

type SchemaConfig = {
  schemaTypes: AllSanitySchemaTypes;
  referenceSymbol: typeof internalGroqTypeReferenceTo;
};
export const q = createGroqBuilder<SchemaConfig>();
