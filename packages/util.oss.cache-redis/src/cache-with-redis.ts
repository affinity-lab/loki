import {createClient, type RedisClientType} from 'redis';
import {Cache, type KeyValue} from "@nano-forge/util.oss"

//NOTE: untested
export class CacheWithRedis<T = any> extends Cache<T> {
	private redisClient: RedisClientType;

	constructor(redisUrl: string, ttl: number, prefix?: string) {
		super(ttl, prefix);
		this.redisClient = createClient({ url: redisUrl });
		this.redisClient.connect();
	}

	async get(key: string | number): Promise<T | undefined>;
	async get(keys: Array<string | number>): Promise<Array<T>>;
	async get(key: string | number | Array<string | number>): Promise<T | undefined | Array<T>> {
		if (Array.isArray(key)) {
			const keys = key.map(k => this.key(k));
			const values = await this.redisClient.mGet(keys);
			return values.map((val: any) => (val !== null ? JSON.parse(val) : undefined)) as Array<T>;
		} else {
			const value = await this.redisClient.get(this.key(key));
			return value !== null ? JSON.parse(value) as T : undefined;
		}
	}

	async set(item: KeyValue<T>, ttl?: number): Promise<void>;
	async set(items: Array<KeyValue<T>>, ttl?: number): Promise<void>;
	async set(items: KeyValue<T> | Array<KeyValue<T>>, ttl?: number): Promise<void> {
		if (ttl === undefined) ttl = this.ttl;
		if (Array.isArray(items)) {
			const pipeline = this.redisClient.multi();
			items.forEach(item => {
				pipeline.set(this.key(item.key), JSON.stringify(item.value), { EX: ttl });
			});
			await pipeline.exec();
		} else {
			const item = items;
			await this.redisClient.set(this.key(item.key), JSON.stringify(item.value), { EX: ttl });
		}
	}

	async del(keys: Array<string | number>): Promise<void>;
	async del(key: string | number): Promise<void>;
	async del(key: string | number | Array<string | number>): Promise<void> {
		if (Array.isArray(key)) {
			const keys = key.map(k => this.key(k));
			await this.redisClient.del(keys);
		} else {
			await this.redisClient.del(this.key(key));
		}
	}

	async clear(): Promise<void> {
		await this.redisClient.flushAll();
	}
}
