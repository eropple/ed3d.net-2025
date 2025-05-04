import { type CompiledScheduleOptions } from "@temporalio/client";
import ms from "ms";

import type { TemporalQueueConfig } from "../temporal/config.js";

import * as coreWorkflows from "./workflows/core/index.js";
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
    "social-github-token-refresh": {
      action: {
        type: "startWorkflow",
        workflowId: "social-github-token-refresh",
        workflowType: coreWorkflows.refreshGitHubTokensWorkflow.name,
        taskQueue: "core",
        args: [],
      },
      spec: {
        intervals: [{ every: ms("6 hours"), offset: ms("5m") }],
        calendars: [],
      },
      state: {
        paused: true,
        note: "Refreshes GitHub OAuth tokens periodically.",
      }
    },
    "social-google-token-refresh": {
      action: {
        type: "startWorkflow",
        workflowId: "social-google-token-refresh",
        workflowType: coreWorkflows.refreshGoogleTokensWorkflow.name,
        taskQueue: "core",
        args: [],
      },
      spec: {
        intervals: [{ every: ms("6 hours"), offset: ms("10m") }],
        calendars: [],
      },
       state: {
        paused: true,
        note: "Refreshes Google OAuth tokens periodically.",
      }
    },
    "social-discord-token-refresh": {
      action: {
        type: "startWorkflow",
        workflowId: "social-discord-token-refresh",
        workflowType: coreWorkflows.refreshDiscordTokensWorkflow.name,
        taskQueue: "core",
        args: [],
      },
      spec: {
        intervals: [{ every: ms("6 hours"), offset: ms("15m") }],
        calendars: [],
      },
       state: {
        paused: true,
        note: "Refreshes Discord OAuth tokens periodically.",
      }
    },
  },
};
