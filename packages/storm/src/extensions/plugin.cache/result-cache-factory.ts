import {Cache, type NonEmptyArray} from "@laborci/util";

export class ResultCache {
	constructor(readonly cache: Cache) {
	}
	async set(res: Record<string, any> | Array<Record<string, any>>) {
		if (Array.isArray(res))
			await this.cache.set(res.map(dto => {return {key: dto.id, value: dto} }));
		else
			await this.cache.set({key: res.id, value: res});
		return res;
	}

	get get() { return this.cache.get.bind(this.cache) }
	get del() { return this.cache.del.bind(this.cache) }
	get setter() { return this.set.bind(this) }
}

export class ResultCacheWithMaps extends ResultCache {
	constructor(readonly cache: Cache, readonly mapCache: Cache, readonly mappedFields: NonEmptyArray<string>) {
		super(cache)
	}
	async set(res: Record<string, any> | Array<Record<string, any>>) {
		await super.set(res);
		if (Array.isArray(res))
			for (const item of res) for (const field of this.mappedFields)
				await this.mapCache.set({key: `<${field}>:${item[field]}`, value: item.id})
		else
			for (const field of this.mappedFields)
				await this.mapCache.set({key: `<${field}>:${res[field]}`, value: res.id})

		return res;
	}
}
