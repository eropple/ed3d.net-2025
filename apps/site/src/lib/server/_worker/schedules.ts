import { type CompiledScheduleOptions } from "@temporalio/client";
import ms from "ms";

import type { TemporalQueueConfig } from "../temporal/config.js";

import { ping } from "./workflows/ping.js";


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
    // "one-minute-ping": null,
    "one-minute-ping": {
      action: {
        type: "startWorkflow",
        workflowId: "ping-1min",
        workflowType: ping.name,
        taskQueue: "core",
        args: [],
      },
      spec: {
        calendars: [],
        intervals: [{ every: ms("1 minute"), offset: 0 }],
      },
    },
  },
};
