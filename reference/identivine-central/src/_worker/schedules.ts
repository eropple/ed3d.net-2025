import { type TemporalQueueConfig } from "@myapp/temporal-client/config.js";
import { type CompiledScheduleOptions } from "@temporalio/client";

import { vacuumUploadsWorkflow } from "../domain/images/workflows/vacuum-uploads.js";
import {
  runPlusBatchesWorkflow,
  runStandardBatchesWorkflow,
} from "../domain/sites/workflows/identity/index.js";

export type WorkerSchedule = Omit<
  CompiledScheduleOptions,
  "scheduleId" | "action"
> & {
  action: Omit<CompiledScheduleOptions["action"], "taskQueue"> & {
    taskQueue: keyof TemporalQueueConfig;
  };
};
export const TEMPORAL_SCHEDULED_WORKFLOWS: Record<
  keyof TemporalQueueConfig,
  Record<string, WorkerSchedule | null>
> = {
  core: {
    "one-minute-ping": null,
    // "one-minute-ping": {
    //   action: {
    //     type: "startWorkflow",
    //     workflowId: "ping-1min",
    //     workflowType: ping.name,
    //     taskQueue: "### REPLACE ###",
    //     args: [],
    //   },
    //   spec: {
    //     calendars: [],
    //     intervals: [{ every: ms("1 minute"), offset: 0 }],
    //   },
    // },
  },
  identity: {
    "cron-reverify-standard": {
      action: {
        type: "startWorkflow",
        workflowType: runStandardBatchesWorkflow.name,
        workflowId: "cron-reverify-standard",
        taskQueue: "identity",
        args: [],
      },
      spec: {
        intervals: [{ every: "36 hours", offset: 0 }],
      },
    },
    "cron-reverify-plus": {
      action: {
        type: "startWorkflow",
        workflowType: runPlusBatchesWorkflow.name,
        workflowId: "cron-reverify-plus",
        taskQueue: "identity",
        args: [],
      },
      spec: {
        intervals: [{ every: "12 hours", offset: 0 }],
      },
    },
    "cron-reverify-professional": {
      action: {
        type: "startWorkflow",
        workflowType: runPlusBatchesWorkflow.name,
        workflowId: "cron-reverify-professional",
        taskQueue: "identity",
        args: [],
      },
      spec: {
        intervals: [{ every: "4 hours", offset: 0 }],
      },
    },
    "standard-reverify": null,
  },
  atproto: {
    "one-minute-ping": null,
  },
  media: {
    "one-minute-ping": null,
    "vacuum-uploads": {
      action: {
        type: "startWorkflow",
        workflowType: vacuumUploadsWorkflow.name,
        workflowId: "vacuum-uploads",
        taskQueue: "media",
        args: [],
      },
      spec: {
        intervals: [{ every: "4 hours", offset: 0 }],
        jitter: "15 minutes",
      },
    },
  },
};
