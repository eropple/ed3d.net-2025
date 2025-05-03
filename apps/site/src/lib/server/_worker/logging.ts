import { type Logger as TemporalLogger } from "@temporalio/worker";
import { type Logger } from "pino";

export class TemporalPinoLogger implements TemporalLogger {
  constructor(public readonly logger: Logger) {}

  debug(message: string, meta?: object) {
    this.logger.debug(meta, message);
  }

  error(message: string, meta?: object) {
    this.logger.error(meta, message);
  }

  info(message: string, meta?: object) {
    this.logger.info(meta, message);
  }

  trace(message: string, meta?: object) {
    this.logger.trace(meta, message);
  }

  warn(message: string, meta?: object) {
    this.logger.warn(meta, message);
  }

  log(level: string, message: string, meta?: object) {
    const tags = { ...meta };
    // @ts-expect-error there's a taskToken here, I promise
    delete tags.taskToken;

    switch (level) {
      case "DEBUG":
        this.logger.debug(tags, message);
        break;
      case "ERROR":
        this.logger.error(tags, message);
        break;
      case "INFO":
        this.logger.info(tags, message);
        break;
      case "TRACE":
        this.logger.trace(tags, message);
        break;
      case "WARN":
        this.logger.warn(tags, message);
        break;
    }
  }
}
