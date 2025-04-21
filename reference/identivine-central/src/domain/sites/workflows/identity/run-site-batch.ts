import * as workflow from "@temporalio/workflow";

import { type SiteTier } from "../../../../_db/models.js";

import {
  type VerifySiteIdentitiesInput,
  type VerifySiteIdentitiesOutput,
  verifySiteIdentitiesWorkflow,
} from "./verify-site-identities.js";

export type RunSiteBatchInput = {
  tier: SiteTier;
  siteIds: Array<string>;
  timespanForBatch: number;
};

export type RunSiteBatchOutput = {
  successCount: number;
  failureCount: number;
  successfulIdentitiesInSuccessfulRuns: number;
  failedIdentitiesInSuccessfulRuns: number;
};

export async function runSiteBatch({
  tier,
  siteIds,
}: RunSiteBatchInput): Promise<RunSiteBatchOutput> {
  workflow.log.info("Starting reverification workflow for batch.", {
    tier,
    firstSiteId: siteIds[0],
  });

  if (siteIds.length === 0) {
    workflow.log.info("No sites to reverify.");
    return {
      successCount: 0,
      failureCount: 0,
      successfulIdentitiesInSuccessfulRuns: 0,
      failedIdentitiesInSuccessfulRuns: 0,
    };
  }

  const children: Array<
    workflow.ChildWorkflowHandle<
      (input: VerifySiteIdentitiesInput) => Promise<VerifySiteIdentitiesOutput>
    >
  > = [];

  for (let i = 0; i < siteIds.length; i++) {
    const siteId = siteIds[i];
    if (!siteId) {
      workflow.log.warn("Skipping site with no id; how'd this happen?", { i });
      continue;
    }

    const child = await workflow.startChild(verifySiteIdentitiesWorkflow, {
      args: [{ siteId }],
      workflowRunTimeout: "10 minutes",
      workflowId: `${workflow.workflowInfo().workflowId}.${siteId}`,
    });

    children.push(child);
  }

  let successCount = 0;
  let failureCount = 0;
  let successfulIdentitiesInSuccessfulRuns = 0;
  let failedIdentitiesInSuccessfulRuns = 0;
  for (const child of children) {
    try {
      const result = await child.result();
      successCount++;
      successfulIdentitiesInSuccessfulRuns += result.successCount;
      failedIdentitiesInSuccessfulRuns += result.failureCount;
    } catch (err) {
      workflow.log.error("Child workflow threw an error.", {
        childWorkflowId: child.workflowId,
        err,
      });
      failureCount++;
    }
  }

  workflow.log.info("Finished reverification workflow for batch.", {
    tier,
    successCount,
    failureCount,
    successfulIdentitiesInSuccessfulRuns,
    failedIdentitiesInSuccessfulRuns,
  });

  return {
    successCount,
    failureCount,
    successfulIdentitiesInSuccessfulRuns,
    failedIdentitiesInSuccessfulRuns,
  };
}
