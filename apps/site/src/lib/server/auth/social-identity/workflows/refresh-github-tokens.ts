import * as workflow from "@temporalio/workflow";
import ms from "ms";

import type { getBatchedRefreshableIdentitiesActivity } from "../activities/get-batched-identities.js";

import { processIdentityBatchWorkflow } from "./process-identity-batch.js";

// Proxy the batch fetching activity (using simpler type)
const { getBatchedRefreshableIdentities } = workflow.proxyActivities<{
  getBatchedRefreshableIdentities: typeof getBatchedRefreshableIdentitiesActivity.activity;
}>({
  startToCloseTimeout: "5 minutes", // Allow ample time to query and batch potentially many IDs
});

const BATCH_SIZE = 100;
const PROVIDER = "github";

export async function refreshGitHubTokensWorkflow(): Promise<void> {
  const logger = workflow.log;
  logger.info("Starting main token refresh workflow", { provider: PROVIDER });

  const batches = await getBatchedRefreshableIdentities({
    provider: PROVIDER,
    batchSize: BATCH_SIZE,
  });

  if (batches.length === 0) {
    logger.info("No identities found needing refresh.", { provider: PROVIDER });
    return;
  }

  logger.info("Starting child workflows for batches", { provider: PROVIDER, batchCount: batches.length });

  // Store handles returned by startChild
  const childHandles: workflow.ChildWorkflowHandle<typeof processIdentityBatchWorkflow>[] = [];
  const parentWorkflowId = workflow.workflowInfo().workflowId;
  const taskQueue = workflow.workflowInfo().taskQueue;

  for (const batch of batches) {
    const childWorkflowId = `${parentWorkflowId}/batch-${PROVIDER}-${workflow.uuid4()}`;
    // Use startChild directly with the imported workflow function
    const handle = await workflow.startChild(processIdentityBatchWorkflow, {
      args: [{ identityUuids: batch }],
      workflowId: childWorkflowId,
      taskQueue: taskQueue,
      parentClosePolicy: workflow.ParentClosePolicy.TERMINATE,
      cancellationType: workflow.ChildWorkflowCancellationType.WAIT_CANCELLATION_COMPLETED,
    });
    childHandles.push(handle);
    logger.debug("Started child workflow", { provider: PROVIDER, childWorkflowId: handle.workflowId, batchSize: batch.length });
  }

  // Wait for all child workflows to complete by awaiting their results
  logger.info("Waiting for child workflows to complete", { provider: PROVIDER, count: childHandles.length });
  await Promise.all(childHandles.map(h => h.result()));
  logger.info("All child workflows completed", { provider: PROVIDER, count: childHandles.length });

  logger.info("Finished refresh workflow", { provider: PROVIDER, batchCount: batches.length });
}
