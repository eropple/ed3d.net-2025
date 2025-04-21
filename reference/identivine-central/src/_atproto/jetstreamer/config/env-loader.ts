import { AJV } from "@myapp/shared-universal/utils/ajv.js";

import {
  loadBaseConfigFromEnv,
  loadInsecureOptionsConfigFromEnv,
  loadPostgresConfigFromEnv,
  loadTemporalConfigFromEnv,
} from "../../../_config/env-loader.js";
import { getNum, getStr } from "../../../_config/env-prefix.js";

import {
  JetstreamerAppConfig,
  WANTED_COLLECTIONS_ALL,
  type WantedCollection,
} from "./types.js";

function loadJetstreamerConfigFromEnv() {
  return {
    jetstreamer: {
      // this `as` may be a lie, but we validate in the loader anyway.
      collections: getStr(
        "JETSTREAMER__COLLECTIONS",
        WANTED_COLLECTIONS_ALL.join(","),
      ).split(",") as Array<WantedCollection>,
      cursorCommitFrequencyMs: getNum(
        "JETSTREAMER__CURSOR_COMMIT_FREQUENCY_MS",
        1000,
      ),
      shutdownWaitMs: getNum("JETSTREAMER__SHUTDOWN_WAIT_MS", 10000),
    },
  };
}

export function loadJetstreamerAppConfigFromEnv(): JetstreamerAppConfig {
  const ret: JetstreamerAppConfig = {
    ...loadBaseConfigFromEnv(),
    ...loadInsecureOptionsConfigFromEnv(),
    ...loadJetstreamerConfigFromEnv(),

    ...loadTemporalConfigFromEnv(),

    ...loadPostgresConfigFromEnv(),
  };

  const validate = AJV.compile(JetstreamerAppConfig);
  if (validate(ret)) {
    return ret as JetstreamerAppConfig;
  } else {
    // eslint-disable-next-line no-restricted-globals
    console.error(validate.errors);
    throw new Error("Bad startup config.");
  }
}
