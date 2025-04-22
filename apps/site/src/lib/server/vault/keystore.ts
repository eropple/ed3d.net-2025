// apps/site/src/lib/server/vault/keystore.ts
import { ENCRYPTION_STRATEGIES, type EncryptionStrategy } from "./strategies.js";

export type VaultConfig = {
  primaryKey: string;
  legacyKeys?: string[];
};

type ParsedKey = {
  strategy: EncryptionStrategy;
  version: string;
  key: CryptoKey;
};

export class VaultKeyStore {
  private keys: Map<string, ParsedKey> = new Map();
  private primaryKey: ParsedKey | null = null;

  constructor(private readonly config: VaultConfig) {}

  /**
   * Initialize the keystore by parsing all keys and importing them as CryptoKey objects
   */
  async initialize(): Promise<void> {
    // Parse and import the primary key
    const [primaryKey, ...legacyKeys] = [
      this.config.primaryKey,
      ...(this.config.legacyKeys || [])
    ];

    // Initialize the primary key
    this.primaryKey = await this.parseAndImportKey(primaryKey);
    this.keys.set(this.primaryKey.version, this.primaryKey);

    // Initialize legacy keys if any
    for (const legacyKeyStr of legacyKeys) {
      const legacyKey = await this.parseAndImportKey(legacyKeyStr);
      this.keys.set(legacyKey.version, legacyKey);
    }
  }

  /**
   * Parse a key string in the format "strategy:version:base64key" and import it as a CryptoKey
   */
  private async parseAndImportKey(keyStr: string): Promise<ParsedKey> {
    const [strategy, version, base64Key] = keyStr.split(":");

    if (!strategy || !version || !base64Key) {
      throw new Error("Invalid key format. Expected strategy:version:base64key");
    }

    if (!Object.keys(ENCRYPTION_STRATEGIES).includes(strategy)) {
      throw new Error(`Unsupported encryption strategy: ${strategy}`);
    }

    const keyData = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: ENCRYPTION_STRATEGIES[strategy as EncryptionStrategy].algorithm },
      false, // not extractable
      ["encrypt", "decrypt"]
    );

    return {
      strategy: strategy as EncryptionStrategy,
      version,
      key: cryptoKey
    };
  }

  /**
   * Get the primary key and its version
   */
  getPrimaryKey(): [string, ParsedKey] {
    if (!this.primaryKey) {
      throw new Error("Keystore not initialized");
    }
    return [this.primaryKey.version, this.primaryKey];
  }

  /**
   * Get a key by version
   */
  getKey(version: string): ParsedKey | undefined {
    return this.keys.get(version);
  }
}