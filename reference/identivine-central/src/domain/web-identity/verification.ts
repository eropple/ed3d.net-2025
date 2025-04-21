import * as DNS from "node:dns/promises";

import { type FetchFn } from "@myapp/shared-universal/utils/fetch.js";
import { parse as parseHtml } from "node-html-parser";
import { type Logger } from "pino";

import { VERIFICATION_BROWSER_USER_AGENTS } from "./verification-browsers.js";

function getRandomUserAgent(): string {
  return (
    VERIFICATION_BROWSER_USER_AGENTS[
      Math.floor(Math.random() * VERIFICATION_BROWSER_USER_AGENTS.length)
    ] ?? getRandomUserAgent()
  );
}

const commonFetchOptions = {
  headers: {
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
    "User-Agent": getRandomUserAgent(),
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "cross-site",
  },
};

type VerificationFn = (
  logger: Logger,
  fetch: FetchFn,
  url: string,
  identivineUrl: string,
  siteId: string,
) => Promise<boolean>;

export async function verifyMetaTag(
  logger: Logger,
  fetch: FetchFn,
  url: string,
  identivineUrl: string,
  siteId: string,
): Promise<boolean> {
  logger = logger.child({ fn: verifyMetaTag.name });
  const response = await fetch(url, {
    ...commonFetchOptions,
    headers: {
      ...commonFetchOptions.headers,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9",
    },
  });

  if (!response.ok && response.status > 299) {
    logger.info({ status: response.status }, "Failed to fetch URL");
    return false;
  }

  const html = await response.text();
  const root = parseHtml(html);
  const head = root.querySelector("head");
  if (!head) return false;

  const metaTags = head.querySelectorAll('meta[name="identivine"]');
  return Array.from(metaTags).some(
    (tag) =>
      tag.getAttribute("content") === identivineUrl &&
      tag.getAttribute("data-identivine-site-id") === siteId,
  );
}

export async function verifyRelMe(
  logger: Logger,
  fetch: FetchFn,
  url: string,
  identivineUrl: string,
  siteId: string,
): Promise<boolean> {
  logger = logger.child({ fn: verifyRelMe.name });
  const response = await fetch(url, {
    ...commonFetchOptions,
    headers: {
      ...commonFetchOptions.headers,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9",
    },
  });

  if (!response.ok && response.status > 299) {
    logger.info({ status: response.status }, "Failed to fetch URL");
    return false;
  }

  const html = await response.text();
  const root = parseHtml(html);
  const relMeLinks = root.querySelectorAll('a[rel~="me"]');

  return relMeLinks.some(
    (link) => link.getAttribute("href") === `${identivineUrl}#${siteId}`,
  );
}

export async function verifyWellKnown(
  logger: Logger,
  fetch: FetchFn,
  url: string,
  identivineUrl: string,
  siteId: string,
): Promise<boolean> {
  logger = logger.child({ fn: verifyWellKnown.name });

  const wellKnownUrl = new URL("/.well-known/identivine.json", url).toString();
  const response = await fetch(wellKnownUrl, {
    ...commonFetchOptions,
    headers: {
      ...commonFetchOptions.headers,
      Accept: "application/json",
    },
  });

  if (!response.ok && response.status > 299) {
    logger.info({ status: response.status }, "Failed to fetch URL");
    return false;
  }

  try {
    const json = (await response.json()) as Record<
      string,
      { siteId: string; domain: string }
    >;
    const pathname = new URL(url).pathname || "/";
    const entry = json[pathname];
    return entry?.siteId === siteId && entry?.domain === identivineUrl;
  } catch {
    return false;
  }
}

export function generateDnsTxtValue(
  url: string,
  identivineUrl: string,
  siteId: string,
): string {
  const pathname = new URL(url).pathname || "/";
  const value = JSON.stringify({ p: pathname, siteId, domain: identivineUrl });
  return `identivine:${Buffer.from(value).toString("base64url")}`;
}

export async function verifyDnsTxt(
  logger: Logger,
  fetch: FetchFn,
  url: string,
  identivineUrl: string,
  siteId: string,
): Promise<boolean> {
  const domain = new URL(url).hostname;

  try {
    const txtRecords = await DNS.resolveTxt(domain);
    const expectedValue = generateDnsTxtValue(url, identivineUrl, siteId);

    return txtRecords.some(([txt]) => txt === expectedValue);
  } catch (err) {
    logger.warn({ err }, "DNS lookup failed");
    return false;
  }
}

export type VerificationResult = {
  success: boolean;
  method: "meta-tag" | "rel-me" | "well-known" | "dns-txt" | null;
};

export async function verifyUrl(
  logger: Logger,
  fetch: FetchFn,
  url: string,
  identivineUrl: string,
  siteId: string,
): Promise<VerificationResult> {
  const verificationMethods = [
    { method: "meta-tag" as const, fn: verifyMetaTag satisfies VerificationFn },
    { method: "rel-me" as const, fn: verifyRelMe satisfies VerificationFn },
    {
      method: "well-known" as const,
      fn: verifyWellKnown satisfies VerificationFn,
    },
    { method: "dns-txt" as const, fn: verifyDnsTxt satisfies VerificationFn },
  ];

  for (const { method, fn } of verificationMethods) {
    try {
      logger.info({ method }, "Trying verification method...");
      const success = await fn(logger, fetch, url, identivineUrl, siteId);
      if (success) {
        logger.info({ method }, "Verification successful with method");
        return { success: true, method };
      }
    } catch (err) {
      logger.error({ err, method }, "Verification method failed");
    }
  }

  return { success: false, method: null };
}
