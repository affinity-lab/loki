import {getByFactory, ViewEntity, type ViewEntityRepositoryInterface, type WithId} from "../../core";
import {ResultCacheWithMaps} from "./result-cache-factory";


/**
 * Returns a function that will get an item by a field name and cache the result.
 * @param repo
 * @param fieldName
 * @param resultCache
 * @param mapCache
 */
export function cachedGetByFactory<T extends string | number, R extends ViewEntity>(
	repo: ViewEntityRepositoryInterface,
	fieldName: Extract<keyof R, T>,
	resultCache: ResultCacheWithMaps
): (search: T) => Promise<R | undefined> {

	let getBy = getByFactory(repo, fieldName);

	return async (search: T) => {
		let key = `<${fieldName}>:${search}`;
		let id = await resultCache.mapCache.get(key);
		if (id) {
			let state = await repo.pipelines.getOne.run(repo, {id});
			if (state.dto[fieldName] === search) return state.item;
			await resultCache.mapCache.del(key);
		}
		let res = await (getBy as unknown as { stmt: any }).stmt.execute({search});
		await resultCache.set(res)
		let item = await repo.instantiate.first(res) as R;
		if (item) await resultCache.mapCache.set({key, value: (item as unknown as WithId).id!});
		return item;
	}
}