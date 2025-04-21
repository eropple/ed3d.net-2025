import { type Static, Type } from "@sinclair/typebox";
import ms from "ms";
import {
  type StaleWhileRevalidate,
  createStaleWhileRevalidateCache,
} from "stale-while-revalidate-cache";

class InMemoryStorage {
  private storage: Map<string, string>;

  constructor() {
    this.storage = new Map();
  }

  async get(key: string): Promise<string | null> {
    return this.storage.get(key) || null;
  }

  async set(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }

  async del(key: string): Promise<number> {
    return this.storage.delete(key) ? 1 : 0;
  }
}

export function buildMemorySwrCache(): StaleWhileRevalidate {
  const memoryStorage = new InMemoryStorage();

  const getItem = async (cacheKey: string) => {
    const ret = await memoryStorage.get(cacheKey);

    return ret;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setItem = async (cacheKey: string, cacheValue: any) => {
    if (cacheValue) {
      await memoryStorage.set(cacheKey, cacheValue);
    }
  };

  const removeItem = async (cacheKey: string) => {
    const ret = await memoryStorage.del(cacheKey);

    return ret;
  };

  const storage = {
    getItem,
    setItem,
    removeItem,
  };

  const swr = createStaleWhileRevalidateCache({
    storage,
    maxTimeToLive: ms("30m"),
    retry: 3,
    retryDelay: (i) => 250 * 2 ** i,
    serialize: JSON.stringify,
    deserialize: JSON.parse,
  });

  return swr;
}
