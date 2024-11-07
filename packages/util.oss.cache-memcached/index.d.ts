// Generated by dts-bundle-generator v9.5.1

import Memcached from 'memcached';

export type KeyValue<T> = {
	key: string | number;
	value: T;
};
declare abstract class Cache$1<T = any> {
	protected ttl: number;
	protected prefix?: string | undefined;
	protected constructor(ttl: number, prefix?: string | undefined);
	/**
	 * Returns a function that reads a cached item if available; otherwise, retrieves it using the provided handler and caches it.
	 * @param ttl - Optional time-to-live value for the cached item.
	 * @returns A function that reads and caches items.
	 */
	getReader(ttl?: number): (handler: () => any, key: string | number, ttl?: number) => Promise<any>;
	/**
	 * Returns a function that deletes an item from the cache by key.
	 * @returns A function that deletes items from the cache.
	 */
	getInvalidator(): (key: string | number) => Promise<void>;
	/**
	 * Reads a cached item by key or retrieves it using the provided handler and caches it.
	 * @param handler - The function to retrieve the item if not cached.
	 * @param key - The key of the item to read or retrieve.
	 * @param ttl - Optional time-to-live value for the cached item.
	 * @returns A Promise resolving to the retrieved item.
	 */
	read(handler: () => any, key: string | number, ttl?: number): Promise<any>;
	/**
	 * Generates a cache key based on the provided key(s) and prefix.
	 * @param keys - The key or array of keys to generate the cache key(s) from.
	 * @returns The generated cache key(s).
	 */
	key(keys: Array<string | number>): Array<string>;
	key(key: string | number): string;
	key(key: string | number | Array<string | number>): string | Array<string>;
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
/**
 * CacheWithMemcached is a class that extends the Cache class and provides caching functionality using Memcached.
 *
 * @template T - The type of the cached items.
 */
export declare class CacheWithMemcached<T = any> extends Cache$1<T> {
	private cache;
	constructor(cache: Memcached, ttl: number, prefix?: string);
	/**
	 * Retrieves cached item(s) by key(s) from the cache.
	 * @param key - The key or array of keys to retrieve from the cache.
	 * @returns A Promise resolving to the cached item(s) or undefined.
	 */
	get(key: string | number): Promise<T | undefined>;
	get(keys: Array<string | number>): Promise<Array<T>>;
	/**
	 * Sets item(s) in the cache with an optional TTL.
	 * @param item - The key-value pair or array of key-value pairs to set in the cache.
	 * @param ttl - Optional time-to-live value for the cached item(s).
	 * @returns A Promise indicating the success of the operation.
	 */
	set(item: KeyValue<T>, ttl?: number): Promise<void>;
	set(items: Array<KeyValue<T>>, ttl?: number): Promise<void>;
	/**
	 * Deletes item(s) from the cache by key(s).
	 * @param keys - The key or array of keys to delete from the cache.
	 * @returns A Promise indicating the success of the operation.
	 */
	del(keys: Array<string | number>): Promise<void>;
	del(key: string | number): Promise<void>;
	/**
	 * Clears all items from the cache.
	 * @returns A Promise indicating the success of the operation.
	 */
	clear(): Promise<void>;
}

export {};
