// apps/site/src/lib/server/vault/keystore.ts
import type { Logger } from "pino";

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
  private readonly logger: Logger;
  private initialized = false;

  private keys: Map<string, ParsedKey> = new Map();
  private primaryKey: ParsedKey | null = null;

  constructor(logger: Logger, private readonly config: VaultConfig) {
    this.logger = logger.child({
      component: "VaultKeyStore",
    });
  }

  /**
   * Initialize the keystore by parsing all keys and importing them as CryptoKey objects
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.logger.debug("Initializing keystore");

    // Parse and import the primary key
    const [primaryKey, ...legacyKeys] = [
      this.config.primaryKey,
      ...(this.config.legacyKeys || [])
    ];

    // Initialize the primary key
    this.logger.debug("Initializing primary key");
    this.primaryKey = await this.parseAndImportKey(primaryKey);
    this.keys.set(this.primaryKey.version, this.primaryKey);

    // Initialize legacy keys if any
    let legacyKeyCount = 0;
    for (const legacyKeyStr of legacyKeys) {
      this.logger.debug({ legacyKeyCount }, "Initializing legacy key");
      const legacyKey = await this.parseAndImportKey(legacyKeyStr);
      this.keys.set(legacyKey.version, legacyKey);
      legacyKeyCount++;
    }

    this.logger.debug({ legacyKeyCount }, "Initialized legacy keys");

    this.initialized = true;
  }

  /**
   * Parse a key string in the format "strategy:version:base64key" and import it as a CryptoKey
   */
  private async parseAndImportKey(keyStr: string): Promise<ParsedKey> {
    const [strategy, version, base64Key] = keyStr.split(":");
    const logger = this.logger.child({ strategy, version });

    logger.debug("Parsing key");

    if (!strategy || !version || !base64Key) {
      throw new Error("Invalid key format. Expected strategy:version:base64key");
    }

    if (!Object.keys(ENCRYPTION_STRATEGIES).includes(strategy)) {
      throw new Error(`Unsupported encryption strategy: ${strategy}`);
    }


    let keyData: Uint8Array;
    try {
      keyData = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));
    } catch (err) {
      logger.error({ err }, "Failed to parse key");
      throw err;
    }

    let cryptoKey: CryptoKey;
    try {
      cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: ENCRYPTION_STRATEGIES[strategy as EncryptionStrategy].algorithm },
        true, // not extractable
        ["encrypt", "decrypt"]
      );
    } catch (err) {
      logger.error({ err }, "Failed to import key");
      throw err;
    }

    logger.debug("Imported key");

    return {
      strategy: strategy as EncryptionStrategy,
      version,
      key: cryptoKey
    };
  }

  /**
   * Get the primary key and its version
   */
  async getPrimaryKey(): Promise<[string, ParsedKey]> {
    await this.initialize();

    if (!this.primaryKey) {
      throw new Error("Keystore not initialized");
    }
    return [this.primaryKey.version, this.primaryKey];
  }

  /**
   * Get a key by version
   */
  async getKey(version: string): Promise<ParsedKey | undefined> {
    await this.initialize();

    return this.keys.get(version);
  }
}