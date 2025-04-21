import {
  InternalServerError,
  RateLimitExceededError,
  ResourceNotFoundError,
} from "@myapp/shared-universal/errors/index.js";
import { type FetchFn } from "@myapp/shared-universal/utils/fetch.js";
import { type Logger } from "pino";

import { type UrlsConfig } from "../../_config/types.js";
import { type DBSiteWebIdentity } from "../../_db/models.js";
import { SITE_WEB_IDENTITIES, SITE_DOMAINS } from "../../_db/schema/index.js";
import {
  type DrizzleRO,
  type Drizzle,
  and,
  eq,
} from "../../lib/datastores/postgres/types.server.js";

import { verifyUrl, generateDnsTxtValue } from "./verification.js";

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export class WebIdentityService {
  private readonly logger: Logger;

  constructor(
    logger: Logger,
    private readonly fetch: FetchFn,
    private readonly urlsConfig: UrlsConfig,
    private readonly db: Drizzle,
    private readonly dbRO: DrizzleRO,
  ) {
    this.logger = logger.child({ context: this.constructor.name });
  }

  private async getSiteDomain(siteId: string): Promise<string> {
    const siteDomain = await this.dbRO
      .select()
      .from(SITE_DOMAINS)
      .where(eq(SITE_DOMAINS.siteId, siteId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!siteDomain) {
      throw new Error("Site has no domain configured");
    }

    return `https://${siteDomain.fqdn}`;
  }

  async createIdentity(
    siteId: string,
    url: string,
  ): Promise<DBSiteWebIdentity> {
    const normalizedUrl = normalizeUrl(url);
    const logger = this.logger.child({
      fn: this.createIdentity.name,
      siteId,
      normalizedUrl,
    });

    const identivineUrl = await this.getSiteDomain(siteId);
    const verificationResult = await verifyUrl(
      logger,
      this.fetch,
      normalizedUrl,
      identivineUrl,
      siteId,
    );

    const identity = (
      await this.db
        .insert(SITE_WEB_IDENTITIES)
        .values({
          siteId,
          url: normalizedUrl,
          verificationMethod: verificationResult.method,
          status: verificationResult.success ? "verified" : "unverified",
          displayOnSite: verificationResult.success,
          statusLastCheckedAt: new Date(),
          lastVerificationAttempt: new Date(),
          order: 25000,
        })
        .returning()
    )[0];

    if (!identity) {
      throw new InternalServerError("Failed to create web identity");
    }

    return identity;
  }

  async listIdentities(siteId: string): Promise<Array<DBSiteWebIdentity>> {
    return this.dbRO
      .select()
      .from(SITE_WEB_IDENTITIES)
      .where(eq(SITE_WEB_IDENTITIES.siteId, siteId));
  }

  async deleteIdentity(siteId: string, identityId: string): Promise<void> {
    await this.db
      .delete(SITE_WEB_IDENTITIES)
      .where(
        and(
          eq(SITE_WEB_IDENTITIES.siteId, siteId),
          eq(SITE_WEB_IDENTITIES.webIdentityId, identityId),
        ),
      );
  }

  async updateIdentityDisplay(
    siteId: string,
    identityId: string,
    displayOnSite: boolean,
  ): Promise<DBSiteWebIdentity> {
    const [identity] = await this.db
      .update(SITE_WEB_IDENTITIES)
      .set({ displayOnSite })
      .where(
        and(
          eq(SITE_WEB_IDENTITIES.siteId, siteId),
          eq(SITE_WEB_IDENTITIES.webIdentityId, identityId),
        ),
      )
      .returning();

    if (!identity) {
      throw new ResourceNotFoundError("identity", "webIdentityId", identityId);
    }

    return identity;
  }

  async requestVerification(
    siteId: string,
    identityId: string,
    overrideWaitTime?: boolean,
  ): Promise<DBSiteWebIdentity> {
    const identity = await this.dbRO
      .select()
      .from(SITE_WEB_IDENTITIES)
      .where(
        and(
          eq(SITE_WEB_IDENTITIES.siteId, siteId),
          eq(SITE_WEB_IDENTITIES.webIdentityId, identityId),
        ),
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (!identity) {
      throw new ResourceNotFoundError("identity", "webIdentityId", identityId);
    }

    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    if (
      !overrideWaitTime &&
      identity.lastVerificationAttempt &&
      identity.lastVerificationAttempt > twoMinutesAgo
    ) {
      throw new RateLimitExceededError(
        "Please wait at least 2 minutes between verification attempts",
      );
    }

    const identivineUrl = await this.getSiteDomain(siteId);
    const verificationResult = await verifyUrl(
      this.logger,
      this.fetch,
      identity.url,
      identivineUrl,
      siteId,
    );

    const [updatedIdentity] = await this.db
      .update(SITE_WEB_IDENTITIES)
      .set({
        verificationMethod: verificationResult.method,
        status: verificationResult.success ? "verified" : "unverified",
        statusLastCheckedAt: new Date(),
        lastVerificationAttempt: new Date(),
      })
      .where(eq(SITE_WEB_IDENTITIES.webIdentityId, identityId))
      .returning();

    if (!updatedIdentity) {
      throw new InternalServerError(
        "Failed to update identity after verification",
      );
    }

    return updatedIdentity;
  }

  async getVerificationInstructions(
    siteId: string,
    url: string,
  ): Promise<{
    metaTag: string;
    relMeLink: string;
    wellKnownJson: string;
    dnsTxtRecord: string;
  }> {
    const identivineUrl = await this.getSiteDomain(siteId);
    const pathname = new URL(url).pathname || "/";
    const dnsTxtRecord = generateDnsTxtValue(url, identivineUrl, siteId);

    return {
      metaTag: `<meta name="identivine" content="${identivineUrl}" data-identivine-site-id="${siteId}" />`,
      relMeLink: `<a rel="me" href="${identivineUrl}#${siteId}">My Identivine</a>`,
      wellKnownJson: JSON.stringify(
        {
          [pathname]: {
            siteId,
            domain: identivineUrl,
          },
        },
        null,
        2,
      ),
      dnsTxtRecord,
    };
  }
}
