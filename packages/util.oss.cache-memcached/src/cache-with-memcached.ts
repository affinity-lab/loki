import {Cache, type KeyValue} from "@nano-forge/util.oss";
import Memcached from 'memcached';

/**
 * CacheWithMemcached is a class that extends the Cache class and provides caching functionality using Memcached.
 *
 * @template T - The type of the cached items.
 */
export class CacheWithMemcached<T = any> extends Cache<T> {

	constructor(private cache: Memcached, ttl: number, prefix?: string) {
		super(ttl, prefix);
	}

	/**
	 * Retrieves cached item(s) by key(s) from the cache.
	 * @param key - The key or array of keys to retrieve from the cache.
	 * @returns A Promise resolving to the cached item(s) or undefined.
	 */
	get(key: string | number): Promise<T | undefined>;
	get(keys: Array<string | number>): Promise<Array<T>>;
	get(key: string | number | Array<string | number>): Promise<T | undefined | Array<T>> {
		return new Promise((resolve, reject) => {
			if (Array.isArray(key)) {
				this.cache.getMulti(this.key(key), (err, data) => {
					if (err) return reject(err);
					resolve(Object.values(data) as Array<T>);
				});
			} else {
				this.cache.get(this.key(key), (err, data) => {
					if (err) return reject(err);
					resolve(data as T);
				});
			}
		});
	}

	/**
	 * Sets item(s) in the cache with an optional TTL.
	 * @param item - The key-value pair or array of key-value pairs to set in the cache.
	 * @param ttl - Optional time-to-live value for the cached item(s).
	 * @returns A Promise indicating the success of the operation.
	 */
	set(item: KeyValue<T>, ttl?: number): Promise<void>;
	set(items: Array<KeyValue<T>>, ttl?: number): Promise<void>;
	set(items: KeyValue<T> | Array<KeyValue<T>>, ttl?: number): Promise<void> {
		return new Promise((resolve, reject) => {
			if (ttl === undefined) ttl = this.ttl;
			if (Array.isArray(items)) {
				const operations = items.map(item => {
					return new Promise<void>((res, rej) => {
						this.cache.set(this.key(item.key), item.value, ttl as number, err => {
							if (err) return rej(err);
							res();
						});
					});
				});
				Promise.all(operations)
					.then(() => resolve())
					.catch(reject);
			} else {
				const item = items;
				this.cache.set(this.key(item.key), item.value, ttl, err => {
					if (err) return reject(err);
					resolve();
				});
			}
		});
	}

	/**
	 * Deletes item(s) from the cache by key(s).
	 * @param keys - The key or array of keys to delete from the cache.
	 * @returns A Promise indicating the success of the operation.
	 */
	del(keys: Array<string | number>): Promise<void>;
	del(key: string | number): Promise<void>;
	del(key: string | number | Array<string | number>): Promise<void> {
		return new Promise((resolve, reject) => {
			if (Array.isArray(key)) {
				const operations = key.map(k => {
					return new Promise<void>((res, rej) => {
						this.cache.del(this.key(k), err => {
							if (err) return rej(err);
							res();
						});
					});
				});
				Promise.all(operations)
					.then(() => resolve())
					.catch(reject);
			} else {
				this.cache.del(this.key(key), err => {
					if (err) return reject(err);
					resolve();
				});
			}
		});
	}

	/**
	 * Clears all items from the cache.
	 * @returns A Promise indicating the success of the operation.
	 */
	clear(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.cache.flush(err => {
				if (err) return reject(err);
				resolve();
			});
		});
	}
}
