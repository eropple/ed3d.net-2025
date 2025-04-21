import { type At, type ComAtprotoLabelDefs } from "@atcute/client/lexicons";

import { type DBLabel } from "../../../_db/models.js";

import { type SignedLabel } from "./label-formatting.js";

export function dbLabelRowToOutputRow(row: DBLabel): [number, SignedLabel] {
  const hexSig = row.sig;
  const buffer = Buffer.from(hexSig, "base64");

  return [
    row.id,
    {
      ver: 1,
      uri: row.uri,
      val: row.val,
      neg: Boolean(row.neg),
      src: row.src as `did:${string}`,
      cid: row.cid ?? undefined,
      cts: row.cts.toISOString(),
      exp: row.exp?.toISOString(),
      // `At.Bytes` is a { $bytes: string } that includes a base64 string,
      // which we insert as a string in `saveLabel`.
      sig: buffer,
    },
  ];
}
