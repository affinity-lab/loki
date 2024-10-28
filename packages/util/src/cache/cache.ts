import * as crypto from "crypto";


export type KeyValue<T> = {
	key: string | number,
	value: T
}
/**
 * Cache is an abstract class that provides caching functionality.
 *
 * @template T - The type of the cached items.
 */
export abstract class Cache<T = any> {
	protected constructor(protected ttl: number, protected prefix?: string) {
		if (this.prefix === undefined) this.prefix = crypto.randomUUID();
	}

	/**
	 * Returns a function that reads a cached item if available; otherwise, retrieves it using the provided handler and caches it.
	 * @param ttl - Optional time-to-live value for the cached item.
	 * @returns A function that reads and caches items.
	 */
	getReader(ttl?: number) {
		const _ttl = ttl === undefined ? this.ttl : ttl;
		return (handler: () => any, key: string | number, ttl: number = _ttl): Promise<any> => {
			return this.read(handler, key, ttl);
		};
	}

	/**
	 * Returns a function that deletes an item from the cache by key.
	 * @returns A function that deletes items from the cache.
	 */
	getInvalidator() {
		return (key: string | number) => this.del(key);
	}

	/**
	 * Reads a cached item by key or retrieves it using the provided handler and caches it.
	 * @param handler - The function to retrieve the item if not cached.
	 * @param key - The key of the item to read or retrieve.
	 * @param ttl - Optional time-to-live value for the cached item.
	 * @returns A Promise resolving to the retrieved item.
	 */
	async read(handler: () => any, key: string | number, ttl?: number): Promise<any> {
		ttl = ttl === undefined ? this.ttl : ttl;
		const cached = await this.get(key);
		if (cached !== undefined) return cached;
		const value = await handler();
		await this.set({key, value}, ttl);
		return value;
	}

	/**
	 * Generates a cache key based on the provided key(s) and prefix.
	 * @param keys - The key or array of keys to generate the cache key(s) from.
	 * @returns The generated cache key(s).
	 */
	key(keys: Array<string | number>): Array<string>;
	key(key: string | number): string;
	key(key: string | number | Array<string | number>): string | Array<string>;
	key(key: string | number | Array<string | number>): string | Array<string> {
		return Array.isArray(key) ? key.map(k => this.prefix + "." + k.toString()) : this.prefix + "." + key.toString();
	}

	/**
	 * Abstract method to set item(s) in the cache with an optional TTL.
	 * @param item - The key-value pair or array of key-value pairs to set in the cache.
	 * @param ttl - Optional time-to-live value for the cached item(s).
	 * @returns A Promise indicating the success of the operation.
	 */
	abstract set(item: KeyValue<T>, ttl?: number): Promise<void>;
	abstract set(items: Array<KeyValue<T>>, ttl?: number): Promise<void>;

	/**
	 * Abstract method to get a cached item by key.
	 * @param key - The key of the item to retrieve from the cache.
	 * @returns A Promise resolving to the cached item or undefined.
	 */
	abstract get(key: string | number): Promise<T | undefined>;
	abstract get(keys: Array<string | number>): Promise<Array<T>>;

	/**
	 * Abstract method to delete an item from the cache by key.
	 * @param key - The key of the item to delete from the cache.
	 * @returns A Promise indicating the success of the operation.
	 */
	abstract del(key: string | number): Promise<void>;
	abstract del(keys: Array<string | number>): Promise<void>;

	/**
	 * Abstract method to clear all items from the cache.
	 * @returns A Promise indicating the success of the operation.
	 */
	abstract clear(): Promise<void>;
}