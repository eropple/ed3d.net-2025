// apps/site/src/lib/server/vault/helpers.ts
import { randomBytes } from "crypto";

import { type VaultService } from "./service.js";
import { ENCRYPTION_STRATEGIES, type EncryptionStrategy } from "./strategies.js";
import { type Sensitive } from "./types.js";

/**
 * Helper function to encrypt a value
 */
export async function encrypt<T>(
  vault: VaultService,
  value: T
): Promise<Sensitive<T>> {
  return vault.encrypt(value);
}

/**
 * Helper function to decrypt a value
 */
export async function decrypt<T>(
  vault: VaultService,
  envelope: Sensitive<T>
): Promise<T> {
  return vault.decrypt(envelope);
}

/**
 * Generate a new vault key
 * Format: strategy:version:base64key
 */
export function generateVaultKey(
  strategy: EncryptionStrategy = "aes256-gcm",
  version: string = Date.now().toString()
): string {
  const keyLength = ENCRYPTION_STRATEGIES[strategy].keyLength;
  const keyBytes = randomBytes(keyLength);
  const keyBase64 = keyBytes.toString("base64");

  return `${strategy}:${version}:${keyBase64}`;
}