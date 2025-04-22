// apps/site/src/lib/server/vault/service.ts
import { type VaultKeyStore } from "./keystore.js";
import { ENCRYPTION_STRATEGIES } from "./strategies.js";
import { type Sensitive } from "./types.js";

export class VaultService {
  constructor(private readonly keyStore: VaultKeyStore) {}

  /**
   * Encrypt a value using the primary key
   */
  async encrypt<T>(value: T): Promise<Sensitive<T>> {
    const [primaryVersion, key] = this.keyStore.getPrimaryKey();
    const strategy = ENCRYPTION_STRATEGIES[key.strategy];

    // Generate a random IV
    const iv = crypto.getRandomValues(new Uint8Array(strategy.ivLength));

    // Convert value to JSON string and then to Uint8Array
    const jsonData = JSON.stringify(value);
    const encodedData = new TextEncoder().encode(jsonData);

    // Encrypt the data
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: strategy.algorithm,
        iv
      },
      key.key,
      encodedData
    );

    // Convert to base64 strings
    const ivBase64 = btoa(String.fromCharCode(...new Uint8Array(iv)));
    const dataBase64 = btoa(String.fromCharCode(...new Uint8Array(encryptedData)));

    // Generate HMAC (using a separate key derived from the main key)
    const hmacKey = await this.deriveHmacKey(key.key);
    const combinedData = new Uint8Array([
      ...iv,
      ...new Uint8Array(encryptedData)
    ]);

    const hmac = await crypto.subtle.sign(
      "HMAC",
      hmacKey,
      combinedData
    );

    const hmacBase64 = btoa(String.fromCharCode(...new Uint8Array(hmac)));

    return {
      v: 1,
      s: key.strategy,
      k: primaryVersion,
      iv: ivBase64,
      d: dataBase64,
      h: hmacBase64
    };
  }

  /**
   * Decrypt an encrypted envelope
   */
  async decrypt<T>(envelope: Sensitive<T>): Promise<T> {
    const key = this.keyStore.getKey(envelope.k);
    if (!key) {
      throw new Error("No matching key found for decryption");
    }

    const strategy = ENCRYPTION_STRATEGIES[key.strategy];

    // Convert base64 strings back to Uint8Array
    const iv = Uint8Array.from(atob(envelope.iv), c => c.charCodeAt(0));
    const encryptedData = Uint8Array.from(atob(envelope.d), c => c.charCodeAt(0));
    const providedHmac = Uint8Array.from(atob(envelope.h), c => c.charCodeAt(0));

    if (iv.length !== strategy.ivLength) {
      throw new Error("Invalid IV length");
    }

    // Verify the HMAC first
    const hmacKey = await this.deriveHmacKey(key.key);
    const combinedData = new Uint8Array([...iv, ...encryptedData]);

    const computedHmac = await crypto.subtle.sign(
      "HMAC",
      hmacKey,
      combinedData
    );

    // Compare HMACs
    if (!this.compareUint8Arrays(new Uint8Array(computedHmac), providedHmac)) {
      throw new Error("Invalid HMAC");
    }

    try {
      // Decrypt the data
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: strategy.algorithm,
          iv
        },
        key.key,
        encryptedData
      );

      // Convert the decrypted data back to the original value
      const jsonString = new TextDecoder().decode(decryptedData);
      return JSON.parse(jsonString);
    } catch (err) {
      throw new Error("Decryption failed - corrupted data or wrong key");
    }
  }

  /**
   * Derive an HMAC key from an encryption key
   */
  private async deriveHmacKey(key: CryptoKey): Promise<CryptoKey> {
    // This is a simplification - ideally we would derive a separate key using HKDF
    // or another proper key derivation function
    const keyMaterial = await crypto.subtle.exportKey("raw", key);

    return crypto.subtle.importKey(
      "raw",
      keyMaterial,
      {
        name: "HMAC",
        hash: "SHA-256"
      },
      false,
      ["sign"]
    );
  }

  /**
   * Compare two Uint8Arrays in constant time
   */
  private compareUint8Arrays(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a[i] ^ b[i];
    }

    return result === 0;
  }
}