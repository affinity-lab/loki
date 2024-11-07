import { err, errorGroup} from "@nano-forge/util";


export const entityError = {
	itemNotFound: (repository: string, id: number | undefined | null) => err("Item not found", {repository, id}, 404),
	itemNotExists: () => err("Entity doesn't exist yet!", undefined, 404),
	duplicateEntry: (args: any) => err("Duplicate Entry", {originalError: args}, 409)
};

errorGroup(entityError, "STORM_ENTITY");
