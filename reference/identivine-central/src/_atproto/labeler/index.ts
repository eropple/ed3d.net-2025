import { getCurrentGitCommit } from "@myapp/shared-universal/utils/app-version.js";
import sleep from "sleep-promise";

import { loadLabelerAppConfigFromEnv } from "./config/env-loader.js";
import { LabelerServer } from "./server.js";

export async function labelerMain() {
  const config = loadLabelerAppConfigFromEnv();

  const server = await LabelerServer.create(config);
  const currentCommit = await getCurrentGitCommit();

  server.logger.info(
    { currentCommit },
    `Server (release ${currentCommit}) constructed; starting up on port ${config.http.port}.`,
  );

  const serverAwaiter = server.start();

  let close: boolean = false;

  const signals = ["SIGINT", "SIGTERM", "SIGQUIT", "SIGUSR2"];
  for (const signal of signals) {
    process.on(signal, () => {
      server.logger.info(`Received ${signal}; shutting down.`);
      server.stop();
      server.logger.info(`Server shut down.`);

      close = true;
    });
  }

  while (!close) {
    await sleep(1000);
  }

  return;
}
