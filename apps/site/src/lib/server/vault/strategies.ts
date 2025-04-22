export const ENCRYPTION_STRATEGIES = {
  "aes256-gcm": {
    algorithm: "AES-GCM",
    keyLength: 32, // 256 bits
    ivLength: 12,  // 96 bits for GCM
    authTagLength: 16 // 128 bits
  }
} as const;

export type EncryptionStrategy = keyof typeof ENCRYPTION_STRATEGIES;