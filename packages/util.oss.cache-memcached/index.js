// @bun
// packages/util.oss.cache-memcached/src/cache-with-memcached.ts
import { Cache } from "@nano-forge/util.oss";

class CacheWithMemcached extends Cache {
  cache;
  constructor(cache, ttl, prefix) {
    super(ttl, prefix);
    this.cache = cache;
  }
  get(key) {
    return new Promise((resolve, reject) => {
      if (Array.isArray(key)) {
        this.cache.getMulti(this.key(key), (err, data) => {
          if (err)
            return reject(err);
          resolve(Object.values(data));
        });
      } else {
        this.cache.get(this.key(key), (err, data) => {
          if (err)
            return reject(err);
          resolve(data);
        });
      }
    });
  }
  set(items, ttl) {
    return new Promise((resolve, reject) => {
      if (ttl === undefined)
        ttl = this.ttl;
      if (Array.isArray(items)) {
        const operations = items.map((item) => {
          return new Promise((res, rej) => {
            this.cache.set(this.key(item.key), item.value, ttl, (err) => {
              if (err)
                return rej(err);
              res();
            });
          });
        });
        Promise.all(operations).then(() => resolve()).catch(reject);
      } else {
        const item = items;
        this.cache.set(this.key(item.key), item.value, ttl, (err) => {
          if (err)
            return reject(err);
          resolve();
        });
      }
    });
  }
  del(key) {
    return new Promise((resolve, reject) => {
      if (Array.isArray(key)) {
        const operations = key.map((k) => {
          return new Promise((res, rej) => {
            this.cache.del(this.key(k), (err) => {
              if (err)
                return rej(err);
              res();
            });
          });
        });
        Promise.all(operations).then(() => resolve()).catch(reject);
      } else {
        this.cache.del(this.key(key), (err) => {
          if (err)
            return reject(err);
          resolve();
        });
      }
    });
  }
  clear() {
    return new Promise((resolve, reject) => {
      this.cache.flush((err) => {
        if (err)
          return reject(err);
        resolve();
      });
    });
  }
}
export {
  CacheWithMemcached
};
