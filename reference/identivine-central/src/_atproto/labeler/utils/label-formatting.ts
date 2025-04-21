import { BytesWrapper, encode as cborEncode, toBytes } from "@atcute/cbor";
import {} from "@atcute/cbor";
import type { At, ComAtprotoLabelDefs } from "@atcute/client/lexicons";
import { excludeNullish } from "@myapp/shared-universal/utils/data-structures.js";
import { type Static, Type } from "@sinclair/typebox";
import { type Logger } from "pino";

import { ISODateTime } from "../../../lib/ext/typebox.js";

import { k256Sign } from "./atproto-crypto.js";

export const CreateLabelData = Type.Object({
  val: Type.String({
    description: "The label value.",
  }),
  uri: Type.String({
    description:
      "The subject of the label. If labeling an account, this should be a string beginning with `did:`.",
  }),
  cid: Type.Optional(
    Type.String({
      description:
        "Optionally, a CID specifying the version of `uri` to label.",
    }),
  ),
  neg: Type.Optional(
    Type.Boolean({
      description:
        "Whether this label is negating a previous instance of this label applied to the same subject.",
    }),
  ),
  src: Type.Optional(
    Type.String({
      description:
        "The DID of the actor who created this label, if different from the labeler.",
    }),
  ),
  cts: ISODateTime,
  exp: Type.Optional(ISODateTime),
});
export type CreateLabelData = Static<typeof CreateLabelData>;

export type UnsignedLabel = Omit<ComAtprotoLabelDefs.Label, "sig">;
export type SignedLabel = UnsignedLabel & { sig: Uint8Array };
export type FormattedLabel = UnsignedLabel & { sig?: At.Bytes };
export type SavedLabel = UnsignedLabel & { sig: ArrayBuffer; id: number };

const LABEL_VERSION = 1;

function formatLabelCbor(label: UnsignedLabel): UnsignedLabel {
  return excludeNullish({ ...label, ver: LABEL_VERSION, neg: !!label.neg });
}

export function formatLabel(
  logger: Logger,
  label: UnsignedLabel & { sig?: ArrayBuffer | Uint8Array | At.Bytes },
): FormattedLabel {
  logger = logger.child({ fn: formatLabel.name });

  let ret: FormattedLabel;

  if (Buffer.isBuffer(label.sig)) {
    logger.debug("Label sig is a Buffer; must convert out");
    ret = excludeNullish({
      ...label,
      ver: LABEL_VERSION,
      neg: !!label.neg,
      sig: new BytesWrapper(label.sig),
    });
  } else if (label.sig && "$bytes" in label.sig) {
    logger.debug("Label is already formatted");
    ret = excludeNullish({
      ...label,
      ver: LABEL_VERSION,
      neg: !!label.neg,
      sig: label.sig,
    });
  } else if (typeof label.sig === "string") {
    logger.debug("Label is a base64 string, converting to At.Bytes");
    ret = excludeNullish({
      ...label,
      ver: LABEL_VERSION,
      neg: !!label.neg,
      sig: { $bytes: label.sig },
    });
  } else {
    throw new Error(
      "Expected sig to be an object with base64 $bytes or a base64 string, got " +
        label.sig,
    );
  }

  logger.info({ sig: ret.sig }, "Formatted label");
  return ret;
}

export function signLabel(
  label: UnsignedLabel,
  signingKey: Uint8Array,
): SignedLabel {
  const toSign = formatLabelCbor(label);
  const bytes = cborEncode(toSign);
  const sig = k256Sign(signingKey, bytes);
  return { ...toSign, sig };
}

export function labelIsSigned<T extends UnsignedLabel>(
  label: T,
): label is T & SignedLabel {
  return "sig" in label && label.sig !== undefined;
}
