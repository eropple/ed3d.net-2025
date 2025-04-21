import * as workflow from "@temporalio/workflow";

import { type verifyATProtoIdentityActivity } from "../../../atproto/activities/verify-atproto-identity.js";
import { type verifyMastodonIdentityActivity } from "../../../mastodon/activities/verify-mastodon-identity.js";
import { type verifySocialIdentityActivity } from "../../../social-identity/activities/identity/verify-social-identity.js";
import { type verifyWebIdentityActivity } from "../../../web-identity/activities/verify-web-identity.js";
import { type getSiteIdentitiesActivity } from "../../activities/identity/get-site-identities.js";

const {
  getSiteIdentities,
  verifyATProtoIdentity,
  verifyMastodonIdentity,
  verifySocialIdentity,
  verifyWebIdentity,
} = workflow.proxyActivities<{
  getSiteIdentities: (typeof getSiteIdentitiesActivity)["activity"];
  verifyATProtoIdentity: (typeof verifyATProtoIdentityActivity)["activity"];
  verifyMastodonIdentity: (typeof verifyMastodonIdentityActivity)["activity"];
  verifySocialIdentity: (typeof verifySocialIdentityActivity)["activity"];
  verifyWebIdentity: (typeof verifyWebIdentityActivity)["activity"];
}>({
  startToCloseTimeout: "10 minutes",
});

export interface VerifySiteIdentitiesInput {
  siteId: string;
}

export type VerifySiteIdentitiesOutput = {
  successCount: number;
  failureCount: number;
};

export async function verifySiteIdentitiesWorkflow(
  input: VerifySiteIdentitiesInput,
): Promise<VerifySiteIdentitiesOutput> {
  workflow.log.info("Starting site identity verification workflow", {
    siteId: input.siteId,
  });

  const identities = await getSiteIdentities({ siteId: input.siteId });
  workflow.log.info("Identities found for reverification.", {
    identityCount:
      Object.keys(identities.social).length +
      Object.keys(identities.mastodon).length +
      Object.keys(identities.atproto).length +
      Object.keys(identities.web).length,
  });

  const verificationTasks = [
    ...identities.social.map((id) =>
      verifySocialIdentity({ identityId: id.id }),
    ),
    ...identities.mastodon.map((id) =>
      verifyMastodonIdentity({ identityId: id.id }),
    ),
    ...identities.atproto.map((id) =>
      verifyATProtoIdentity({ identityId: id.id }),
    ),
    ...identities.web.map((id) =>
      verifyWebIdentity({ siteId: id.siteId, identityId: id.id }),
    ),
  ];

  let successCount: number = 0;
  let failureCount: number = 0;

  for (const verificationTask of verificationTasks) {
    try {
      const result = await verificationTask;

      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    } catch (err) {
      workflow.log.error(
        "Error verifying identity. Swallowing as we should have " +
          "already set to unverified, but we need to fix whatever " +
          "bubbled this up.",
        {
          err,
        },
      );
    }
  }

  workflow.log.info("Finished site identity verification workflow", {
    siteId: input.siteId,
  });

  return {
    successCount,
    failureCount,
  };
}
