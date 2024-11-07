import NodeCache, {type ValueSetItem} from "node-cache";
import {Cache, type KeyValue} from "@nano-forge/util.oss";


/**
 * CacheWithNodeCache is a class that extends the Cache class and provides caching functionality using NodeCache.
 *
 * @template T - The type of the cached items.
 */
export class CacheWithNodeCache<T = any> extends Cache<T> {
	constructor(private cache: NodeCache, ttl: number, prefix?: string) {
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
		return Promise.resolve(
			Array.isArray(key)
				? Object.values(this.cache.mget(this.key(key))) as Array<T>
				: this.cache.get(this.key(key)) as T
		);
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
		if (ttl === undefined) ttl = this.ttl;
		if (Array.isArray(items)) {
			const setWithTTL: Array<ValueSetItem<T>> = items.map(item => {return {key: this.key(item.key), val: item.value, ttl};});
			this.cache.mset(setWithTTL);
		} else {
			const item = items;
			this.cache.set(this.key(item.key), item.value, ttl);
		}
		return Promise.resolve();
	}

	/**
	 * Deletes item(s) from the cache by key(s).
	 * @param keys - The key or array of keys to delete from the cache.
	 * @returns A Promise indicating the success of the operation.
	 */
	del(keys: Array<string | number>): Promise<void>;
	del(key: string | number): Promise<void>;
	del(key: string | number | Array<string | number>): Promise<void> {
		this.cache.del(this.key(key));
		return Promise.resolve();
	}

	/**
	 * Clears all items from the cache.
	 * @returns A Promise indicating the success of the operation.
	 */
	clear(): Promise<void> {
		this.cache.flushAll();
		return Promise.resolve();
	}
}