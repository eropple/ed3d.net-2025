import { createHash } from "node:crypto";

export function sha512_256(input: string, rounds: number = 1) {
  let ret = createHash("sha512-256").update(input).digest("hex");
  for (let i = 1; i < rounds; i++) {
    ret = createHash("sha512-256").update(ret).digest("hex");
  }

  return ret;
}
