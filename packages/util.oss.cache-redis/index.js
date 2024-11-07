// @bun
// packages/util.oss.cache-redis/src/cache-with-redis.ts
import { createClient } from "redis";
import { Cache } from "@nano-forge/util.oss";

class CacheWithRedis extends Cache {
  redisClient;
  constructor(redisUrl, ttl, prefix) {
    super(ttl, prefix);
    this.redisClient = createClient({ url: redisUrl });
    this.redisClient.connect();
  }
  async get(key) {
    if (Array.isArray(key)) {
      const keys = key.map((k) => this.key(k));
      const values = await this.redisClient.mGet(keys);
      return values.map((val) => val !== null ? JSON.parse(val) : undefined);
    } else {
      const value = await this.redisClient.get(this.key(key));
      return value !== null ? JSON.parse(value) : undefined;
    }
  }
  async set(items, ttl) {
    if (ttl === undefined)
      ttl = this.ttl;
    if (Array.isArray(items)) {
      const pipeline = this.redisClient.multi();
      items.forEach((item) => {
        pipeline.set(this.key(item.key), JSON.stringify(item.value), { EX: ttl });
      });
      await pipeline.exec();
    } else {
      const item = items;
      await this.redisClient.set(this.key(item.key), JSON.stringify(item.value), { EX: ttl });
    }
  }
  async del(key) {
    if (Array.isArray(key)) {
      const keys = key.map((k) => this.key(k));
      await this.redisClient.del(keys);
    } else {
      await this.redisClient.del(this.key(key));
    }
  }
  async clear() {
    await this.redisClient.flushAll();
  }
}
export {
  CacheWithRedis
};
