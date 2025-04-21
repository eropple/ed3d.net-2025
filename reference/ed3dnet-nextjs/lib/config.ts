import "server-only";
import * as GetEnv from "node-getenv";

function z(name: string) {
  return `ED3D_SITE_${name.toUpperCase()}`;
}

export type SiteConfig = {
  SKIP_SANITY_CACHE: boolean;
  SANITY_TOKEN: string;
  SANITY_PROJECT_ID: string;
  SANITY_DATASET: string;
  SANITY_CONTENT_STAGE: string;
  SANITY_WEBHOOK_SECRET: string | null;
  // Auth configuration
  NEXTAUTH_SECRET: string;
  NEXTAUTH_URL: string;
  // PostgreSQL configuration
  POSTGRES_URL: string;
};
let cachedConfig: SiteConfig | null = null;
export function CONFIG() {
  if (!cachedConfig) {
    if (GetEnv.getNum("NEXT_BUILD") === 1) {
      // nextjs insists on executing this code at build time even when we explicitly
      // tell it that all pages are fully dynamic, so we need stub values even though
      // they're not used
      cachedConfig = {
        SKIP_SANITY_CACHE: true,
        SANITY_TOKEN: "",
        SANITY_PROJECT_ID: "",
        SANITY_DATASET: "",
        SANITY_CONTENT_STAGE: "",
        SANITY_WEBHOOK_SECRET: null,
        // Auth configuration
        NEXTAUTH_SECRET: "",
        NEXTAUTH_URL: "",
        // PostgreSQL configuration
        POSTGRES_URL: "",
      };
    } else {
      cachedConfig = {
        SKIP_SANITY_CACHE: GetEnv.getBool(
          z("SKIP_SANITY_CACHE"),
          process.env.NODE_ENV === "development",
        ),
        SANITY_TOKEN: GetEnv.requireStr(z("SANITY_TOKEN")),
        SANITY_PROJECT_ID: GetEnv.requireStr(z("SANITY_PROJECT_ID")),
        SANITY_DATASET: GetEnv.requireStr(z("SANITY_DATASET")),
        SANITY_CONTENT_STAGE: GetEnv.requireStr(z("SANITY_CONTENT_STAGE")),
        SANITY_WEBHOOK_SECRET:
          GetEnv.getStr(z("SANITY_WEBHOOK_SECRET")) ?? null,
        // Auth configuration
        NEXTAUTH_SECRET: GetEnv.requireStr(z("NEXTAUTH_SECRET")),
        NEXTAUTH_URL: GetEnv.requireStr(z("NEXTAUTH_URL")),
        // PostgreSQL configuration
        POSTGRES_URL: GetEnv.requireStr("POSTGRES__READWRITE__URL"),
      };
    }
  }

  return cachedConfig;
}
