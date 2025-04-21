import * as workflow from "@temporalio/workflow";

import { type SiteTier } from "../../../../_db/models.js";

import { runAllSiteBatches } from "./run-all-site-batches.js";
import { PROFESSIONAL_TOTAL_REVERIFICATION_TIME_IN_SECONDS } from "./workflow-constants.js";

export async function runProfessionalBatchesWorkflow(): Promise<void> {
  workflow.log.info("Starting reverification workflow for standard sites.");

  const tier: SiteTier = "professional";
  const totalSecondsForAllBatches =
    PROFESSIONAL_TOTAL_REVERIFICATION_TIME_IN_SECONDS;

  const date = workflow.workflowInfo().startTime;
  const formatted = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}_${String(date.getHours()).padStart(2, "0")}-${String(date.getMinutes()).padStart(2, "0")}`;
  const child = await workflow.startChild(runAllSiteBatches, {
    args: [
      {
        tier,
        batchSize: 100,
        totalSecondsForAllBatches,
      },
    ],
    workflowId: `reverification-${tier}-${formatted}-batch`,
  });

  await child.result();
  workflow.log.info("Standard reverification workflow finished.");
}
