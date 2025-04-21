import { AJV } from "@myapp/shared-universal/utils/ajv.js";

import { loadHttpConfigFromEnv } from "../../../_api/config/env-loader.js";
import {
  loadBaseConfigFromEnv,
  loadInsecureOptionsConfigFromEnv,
  loadPostgresConfigFromEnv,
  loadRedisConfigFromEnv,
  loadTemporalConfigFromEnv,
} from "../../../_config/env-loader.js";
import { requireStr } from "../../../_config/env-prefix.js";

import { LabelerAppConfig } from "./types.js";

function loadAtprotoLabelerConfigFromEnv() {
  return {
    atprotoLabeler: {
      labelerName: requireStr("ATPROTO_LABELER__LABELER_NAME"),
      labelPrefix: requireStr("ATPROTO_LABELER__LABEL_PREFIX"),
      did: requireStr("ATPROTO_LABELER__DID"),
      domain: requireStr("ATPROTO_LABELER__DOMAIN"),
      signingKey: requireStr("ATPROTO_LABELER__SIGNING_KEY"),
      preSharedKey: requireStr("ATPROTO_LABELER__PRE_SHARED_KEY"),
    },
  };
}

export function loadLabelerAppConfigFromEnv(): LabelerAppConfig {
  const ret: LabelerAppConfig = {
    ...loadBaseConfigFromEnv(),
    ...loadInsecureOptionsConfigFromEnv(),

    ...loadHttpConfigFromEnv("LABELER"),

    ...loadRedisConfigFromEnv(),
    ...loadTemporalConfigFromEnv(),

    ...loadPostgresConfigFromEnv(),

    ...loadAtprotoLabelerConfigFromEnv(),
  };

  const validate = AJV.compile(LabelerAppConfig);
  if (validate(ret)) {
    return ret as LabelerAppConfig;
  } else {
    // eslint-disable-next-line no-restricted-globals
    console.error(validate.errors);
    throw new Error("Bad startup config.");
  }
}
