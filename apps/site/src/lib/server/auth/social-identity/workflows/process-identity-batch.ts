import * as workflow from "@temporalio/workflow";
import ms from "ms";

import type { StringUUID } from "../../../../ext/typebox/index.js";
import { type refreshSingleIdentityTokenActivity } from "../activities/refresh-single-identity.js";

// Proxy the activity with retry options
const { refreshSingleIdentityToken } = workflow.proxyActivities<{
  refreshSingleIdentityToken: typeof refreshSingleIdentityTokenActivity.activity;
}>({
  startToCloseTimeout: "2 minutes",
  retry: {
    initialInterval: ms("5s"),
    backoffCoefficient: 2,
    maximumInterval: ms("1m"),
    maximumAttempts: 3, // Retry up to 3 times
    nonRetryableErrorTypes: [], // Define errors that shouldn't be retried if needed
  },
});

type ProcessIdentityBatchArgs = {
  identityUuids: Array<StringUUID>;
};

export async function processIdentityBatchWorkflow(
  { identityUuids }: ProcessIdentityBatchArgs,
): Promise<void> {
  const logger = workflow.log;
  logger.info(
    "Starting child workflow to process identity batch",
    { workflowId: workflow.workflowInfo().workflowId, batchSize: identityUuids.length },
  );

  const promises: Promise<void>[] = [];
  for (const identityUuid of identityUuids) {
    // Start activity for each UUID, don't await yet
    promises.push(
      refreshSingleIdentityToken({ identityUuid })
        .catch((err) => {
          // This catch block executes *after* all retries have failed
          logger.error(
            "Final failure refreshing identity token after all retries",
            { workflowId: workflow.workflowInfo().workflowId, identityUuid, error: err.message },
          );
          // We swallow the error here so one failed refresh doesn't fail the whole batch workflow
        }),
    );
  }

  // Wait for all activity calls in the batch to settle (complete or finally fail)
  await Promise.allSettled(promises);

  logger.info(
    "Finished processing identity batch",
    { workflowId: workflow.workflowInfo().workflowId, batchSize: identityUuids.length },
  );
}
