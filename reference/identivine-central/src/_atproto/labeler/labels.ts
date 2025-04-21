import {
  type ComAtprotoLabelDefs,
  type AppBskyLabelerService,
} from "@atproto/api";
import { type Static, Type } from "@sinclair/typebox";

import { LABEL_KIND_VALUES } from "../../_db/schema/labeler.js";
import { StringEnum } from "../../lib/ext/typebox.js";

import { type AtprotoLabelerConfig } from "./config/types.js";

export const LabelKind = StringEnum([...LABEL_KIND_VALUES]);
export type LabelKind = Static<typeof LabelKind>;

export function buildLabels(
  atprotoLabelerConfig: AtprotoLabelerConfig,
): Record<LabelKind, ComAtprotoLabelDefs.LabelValueDefinition> {
  return {
    connected: {
      identifier: `connected`,
      severity: "inform",
      adultOnly: false,
      blurs: "none",
      defaultSetting: "ignore",
      locales: [
        {
          lang: "en",
          name: `${atprotoLabelerConfig.labelerName}`,
          description:
            `This account is recognized as being connected to ${atprotoLabelerConfig.labelerName}. ` +
            `A user with access to this account has created an Identivine account and linked it to this Bluesky identity. ` +
            `This does NOT mean that the user is "verified" or "official" in any way. Other labels created by ${atprotoLabelerConfig.labelerName} ` +
            `can provide additional information about the account, which you can use to make your own decisions about whether to trust the account.`,
        },
      ],
    } satisfies ComAtprotoLabelDefs.LabelValueDefinition,
    linked: {
      identifier: `linked`,
      severity: "inform",
      adultOnly: false,
      blurs: "none",
      defaultSetting: "warn",
      locales: [
        {
          lang: "en",
          name: `${atprotoLabelerConfig.labelerName} Linked`,
          description:
            `In addition to being connected to ${atprotoLabelerConfig.labelerName}, this account has a link in bio that points back ` +
            `to their Identivine site. This improves the likelihood that the account is legitimate, but does not guarantee it, and you ` +
            `should use your own judgement when deciding whether to trust the account.`,
        },
      ],
    } satisfies ComAtprotoLabelDefs.LabelValueDefinition,
    irl: {
      identifier: `irl`,
      severity: "inform",
      adultOnly: false,
      blurs: "none",
      defaultSetting: "warn",
      locales: [
        {
          lang: "en",
          name: `${atprotoLabelerConfig.labelerName} IRL`,
          description:
            `This account has been linked by ${atprotoLabelerConfig.labelerName} to an IRL identity. This means that Identivine has worked ` +
            `with a third-party identity verification service to verify that the account is owned by a real person. This real-world name ` +
            `can (and, optionally, geographic data) be found on their Identivine profile, and you can use that information to make sure that ` +
            `the account is operated by the person you think it is.`,
        },
      ],
    } satisfies ComAtprotoLabelDefs.LabelValueDefinition,
    fishy: {
      identifier: `fishy`,
      severity: "alert",
      adultOnly: false,
      blurs: "none",
      defaultSetting: "hide",
      locales: [
        {
          lang: "en",
          name: `${atprotoLabelerConfig.labelerName} Fishy`,
          description:
            `This account or post is referencing an Identivine site linked to a Bluesky account that is NOT ` +
            `this account. This can in some cases be a sign of impersonation (especially if it's in an account bio), ` +
            `but it can also just be somebody linking to someone else's site. Please use caution if you're unsure ` +
            `whether this account actually owns the Identivine site they're linking to.`,
        },
      ],
    } satisfies ComAtprotoLabelDefs.LabelValueDefinition,
  } as const;
}

export function buildLabelDefinitions(
  atprotoLabelerConfig: AtprotoLabelerConfig,
): AppBskyLabelerService.Record {
  const labelValueDefinitions = Object.values(
    buildLabels(atprotoLabelerConfig),
  );
  const ret: AppBskyLabelerService.Record = {
    $type: "app.bsky.labeler.service",
    createdAt: new Date().toISOString(),
    policies: {
      labelValues: labelValueDefinitions.map(({ identifier }) => identifier),
      labelValueDefinitions,
    },
  };

  return ret;
}
