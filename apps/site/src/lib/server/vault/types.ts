/**
 * Type for encrypted data. This envelope contains all necessary
 * information to decrypt the data when provided with the right key.
 */
export type Sensitive<T> = {
  v: number; // version
  s: string; // strategy
  k: string; // key version
  iv: string; // initialization vector (base64)
  d: string; // encrypted data (base64)
  h: string; // HMAC (base64)
};