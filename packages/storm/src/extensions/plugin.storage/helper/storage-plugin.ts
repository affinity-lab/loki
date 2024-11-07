import type {State} from "@nano-forge/util";
import type {EntityRepositoryInterface} from "../../../core";
import {Storage} from "../storage";

/**
 * Storage plugin
 * @param repository
 * @param storage
 */
export function storagePlugin(repository: EntityRepositoryInterface, storage: Storage) {
	repository.pipelines.delete.blocks
		.finalize.append(async (state: State<{ item: { id: number } }>) => {
			storage.destroy(repository, state.item.id);
		}
	)
}