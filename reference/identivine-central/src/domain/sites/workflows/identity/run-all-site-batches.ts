import * as workflow from "@temporalio/workflow";

import { type SiteTier } from "../../../../_db/models.js";
import {
  type GetSitesByTierOutput,
  type getSitesByTierActivity,
} from "../../activities/identity/get-sites-by-tier.js";

import {
  runSiteBatch,
  type RunSiteBatchInput,
  type RunSiteBatchOutput,
} from "./run-site-batch.js";
import { STANDARD_TOTAL_REVERIFICATION_TIME_IN_SECONDS } from "./workflow-constants.js";

const { getSitesByTier } = workflow.proxyActivities<{
  getSitesByTier: (typeof getSitesByTierActivity)["activity"];
}>({
  scheduleToCloseTimeout: "12 hours",
});

export type RunAllSiteBatchesInput = {
  tier: SiteTier;
  batchSize: number;
  totalSecondsForAllBatches: number;
};

export type RunAllSiteBatchesOutput = {
  successCount: number;
  failureCount: number;
  successfulIdentitiesInSuccessfulRuns: number;
  failedIdentitiesInSuccessfulRuns: number;
};

export async function runAllSiteBatches({
  tier,
  batchSize,
  totalSecondsForAllBatches,
}: RunAllSiteBatchesInput): Promise<RunAllSiteBatchesOutput> {
  workflow.log.info("Starting reverification workflow for tier.", {
    tier,
  });

  const siteIdBatches: Array<Array<string>> = [];

  let offset = 0;
  while (true) {
    const batch: GetSitesByTierOutput = await getSitesByTier({
      tier,
      limit: batchSize,
      offset,
    });

    offset += batch.siteIds.length;

    if (batch.siteIds.length === 0) {
      workflow.log.info("No more sites to process.");
      break;
    }

    siteIdBatches.push(batch.siteIds);
  }

  const siteIds = siteIdBatches.flat();
  workflow.log.info("Site batches pulled.", { siteIdCount: siteIds.length });

  const timespanForBatch = totalSecondsForAllBatches / siteIds.length;
  workflow.log.info("Spreading batches out over the reverification time.", {
    timespanForBatch,
  });

  const children: Array<
    workflow.ChildWorkflowHandle<
      (i: RunSiteBatchInput) => Promise<RunSiteBatchOutput>
    >
  > = [];

  for (let i = 0; i < siteIds.length; i++) {
    const startDelay = i * timespanForBatch;
    const siteIdBatch = siteIdBatches[i];

    if (!siteIdBatch) {
      workflow.log.warn("No sites in batch.", { batchIndex: i });
      continue;
    }

    workflow.log.info("Enqueueing batch.", { startDelay });

    const child = await workflow.startChild(runSiteBatch, {
      workflowId: `${workflow.workflowInfo().workflowId}.${i.toString().padStart(3, "0")}`,
      args: [
        {
          tier,
          siteIds: siteIdBatch,
          timespanForBatch,
        },
      ],
      workflowRunTimeout: `${timespanForBatch * 2} seconds`,
    });

    children.push(child);
  }

  let successCount = 0;
  let failureCount = 0;
  let successfulIdentitiesInSuccessfulRuns = 0;
  let failedIdentitiesInSuccessfulRuns = 0;

  for (const child of children) {
    const result = await child.result();
    successCount += result.successCount;
    failureCount += result.failureCount;
    successfulIdentitiesInSuccessfulRuns +=
      result.successfulIdentitiesInSuccessfulRuns;
    failedIdentitiesInSuccessfulRuns += result.failedIdentitiesInSuccessfulRuns;
  }

  workflow.log.info("All reverification workflows completed.", {
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
