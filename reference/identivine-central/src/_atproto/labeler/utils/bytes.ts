import { encode as cborEncode } from "@atcute/cbor";
import { concat as ui8Concat } from "uint8arrays";

export function frameToBytes(type: "error", body: unknown): Uint8Array;
export function frameToBytes(
  type: "message",
  body: unknown,
  t: string,
): Uint8Array;
export function frameToBytes(
  type: "error" | "message",
  body: unknown,
  t?: string,
): Uint8Array {
  const header = type === "error" ? { op: -1 } : { op: 1, t };
  return ui8Concat([cborEncode(header), cborEncode(body)]);
}
