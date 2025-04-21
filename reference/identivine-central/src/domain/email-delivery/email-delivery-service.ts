import { type TemporalClientService } from "@myapp/temporal-client";
import { type Logger } from "pino";

import {
  type Drizzle,
  type DrizzleRO,
} from "../../lib/datastores/postgres/types.server.js";

import { type EmailDeliveryConfig } from "./config.js";
import { type EnqueueEmailInput } from "./types.js";

export class EmailDeliveryService {
  private readonly logger: Logger;

  constructor(
    logger: Logger,
    private readonly config: EmailDeliveryConfig,
    private readonly dbRO: DrizzleRO,
    private readonly db: Drizzle,
    private readonly temporal: TemporalClientService,
  ) {
    this.logger = logger.child({ context: this.constructor.name });
  }

  async enqueueEmail(input: EnqueueEmailInput): Promise<void> {
    // TODO:  implement email templating
    //        can we find a way to do mustachey things but keep types?
    //        we should
    throw new Error("TODO: implement");
  }
}
