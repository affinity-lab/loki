import type {State} from "@laborci/util";
import type {EntityRepositoryInterface} from "../../core";

type ZodLike = {
	parse: (arg: any) => {
		success: boolean,
		data: any,
		error: {
			issues: any
		}
	}
}

export function validatorPlugin(upsert: ZodLike): (repository: EntityRepositoryInterface) => void;
export function validatorPlugin(insert: ZodLike, update?: ZodLike): (repository: EntityRepositoryInterface) => void;
export function validatorPlugin(insert: ZodLike, update?: ZodLike) {
	return (repository: EntityRepositoryInterface) => {
		repository.pipelines.insert.blocks.prepare.append(async (state: State<{ dto: Record<string, any> }>) => {insert.parse(state.dto);})
		repository.pipelines.update.blocks.prepare.append(async (state: State<{ dto: Record<string, any> }>) => {(update ?? insert).parse(state.dto);})
	}
}