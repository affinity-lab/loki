import {Cache, type KeyValue} from "./cache";


export class CacheWithNoCache<T = any> extends Cache<T> {
	constructor(ttl: number, prefix?: string) {
		super(ttl, prefix);
	}

	get(key: string | number): Promise<T | undefined>;
	get(keys: Array<string | number>): Promise<Array<T>>;
	get(key: string | number | Array<string | number>): Promise<T | undefined | Array<T>> {
		return Promise.resolve(Array.isArray(key) ? [] : undefined);
	}

	set(item: KeyValue<T>, ttl?: number): Promise<void>;
	set(items: Array<KeyValue<T>>, ttl?: number): Promise<void>;
	set(items: KeyValue<T> | Array<KeyValue<T>>, ttl?: number): Promise<void> {
		return Promise.resolve();
	}

	del(keys: Array<string | number>): Promise<void>;
	del(key: string | number): Promise<void>;
	del(key: string | number | Array<string | number>): Promise<void> {
		return Promise.resolve();
	}

	clear(): Promise<void> {
		return Promise.resolve();
	}
}