import {
  type TemporalClient,
  type TemporalClientService,
} from "@myapp/temporal-client";
import { type TemporalQueueConfig } from "@myapp/temporal-client/config.js";
import {
  ScheduleOverlapPolicy,
  type WorkflowHandleWithFirstExecutionRunId,
} from "@temporalio/client";

import { type TEMPORAL_SCHEDULED_WORKFLOWS } from "../../_worker/schedules.js";
import type * as AtprotoWorkflows from "../../_worker/workflows/atproto/index.js";
import type * as CoreWorkflows from "../../_worker/workflows/core/index.js";
import type * as IdentityWorkflows from "../../_worker/workflows/identity/index.js";
import type * as MediaWorkflows from "../../_worker/workflows/media/index.js";

export type AtprotoWorkflowType =
  (typeof AtprotoWorkflows)[keyof typeof AtprotoWorkflows];
export type CoreWorkflowType =
  (typeof CoreWorkflows)[keyof typeof CoreWorkflows];
export type IdentityWorkflowType =
  (typeof IdentityWorkflows)[keyof typeof IdentityWorkflows];
export type MediaWorkflowType =
  (typeof MediaWorkflows)[keyof typeof MediaWorkflows];

export class TemporalDispatcher {
  constructor(
    private readonly temporalClient: TemporalClient,
    private readonly temporal: TemporalClientService,
  ) {}

  startCore<W extends CoreWorkflowType>(
    workflowFunc: W,
    args: Parameters<W>,
  ): Promise<WorkflowHandleWithFirstExecutionRunId<W>> {
    return this.temporal.start("core", workflowFunc, args);
  }

  startAtproto<W extends AtprotoWorkflowType>(
    workflowFunc: W,
    args: Parameters<W>,
  ): Promise<WorkflowHandleWithFirstExecutionRunId<W>> {
    return this.temporal.start("atproto", workflowFunc, args);
  }

  startIdentity<W extends IdentityWorkflowType>(
    workflowFunc: W,
    args: Parameters<W>,
  ): Promise<WorkflowHandleWithFirstExecutionRunId<W>> {
    return this.temporal.start("identity", workflowFunc, args);
  }

  startMedia<W extends MediaWorkflowType>(
    workflowFunc: W,
    args: Parameters<W>,
  ): Promise<WorkflowHandleWithFirstExecutionRunId<W>> {
    return this.temporal.start("media", workflowFunc, args);
  }

  async triggerWorkflow(
    queue: keyof TemporalQueueConfig,
    name: keyof (typeof TEMPORAL_SCHEDULED_WORKFLOWS)[typeof queue],
    overlapPolicy: ScheduleOverlapPolicy = ScheduleOverlapPolicy.SKIP,
  ) {
    const handle = await this.temporalClient.schedule.getHandle(name);

    if (!handle) {
      throw new Error(`Schedule ${name} not found.`);
    }

    await handle.trigger(overlapPolicy);
    return;
  }
}
