import type {State} from "@laborci/util";
import type {EntityRepositoryInterface} from "../../core";
import {type ResultCache} from "./result-cache-factory";


export function cachePlugin(resultCache: ResultCache) {
	return (repository: EntityRepositoryInterface) => {

		repository.pipelines.getOne.blocks
			.prepare.append(async (state: Record<string, any>) => state.dto = await resultCache.get(state.id))
			.finalize.prepend(async (state: Record<string, any>) => state.dto !== undefined && await resultCache.set(state.dto)
		)

		repository.pipelines.getArray.blocks
			.prepare.append(async (state: State<{ ids: Array<number>, dtos: Array<{ id: number }> }>) => {
				state.dtos = await resultCache.get(state.ids);
				let dtoIds = state.dtos.map(dto => dto.id);
				state.ids = state.ids.filter(num => !dtoIds.includes(num));
			})
			.finalize.prepend(async (state: State<{ dtos: Array<{ id: number }> }>) => await resultCache.set(state.dtos)
		)

		repository.pipelines.update.blocks
			.finalize.append(async (state: State<{ item: { id: number } }>) => await resultCache.del(state.item.id))
		repository.pipelines.delete.blocks
			.finalize.prepend(async (state: State<{ item: { id: number } }>) => await resultCache.del(state.item.id))
		repository.pipelines.overwrite.blocks
			.finalize.append(async (state: State<{ item: { id: number } }>) => await resultCache.del(state.item.id))

	}
}