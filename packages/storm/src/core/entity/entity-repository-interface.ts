import {type MaybeUndefined, ProcessPipeline, type T_Class} from "@affinity-lab/loki.util";
import {MySqlTable, type MySqlTableWithColumns} from "drizzle-orm/mysql-core";
import type {Dto} from "../types";
import {Entity} from "./entity";
import {type ViewEntityRepositoryInterface} from "./view-entity-repository-interface";


export interface EntityRepositoryInterface<
	SCHEMA extends MySqlTableWithColumns<any> = any,
	ITEM extends Entity = any,
	ENTITY extends T_Class<ITEM, typeof Entity> = any,
	DTO extends Dto<SCHEMA> = any
> extends ViewEntityRepositoryInterface <SCHEMA, ITEM, ENTITY> {
	pipelines: {
		getAll: ProcessPipeline<"prepare" | "action" | "finalize">;
		getOne: ProcessPipeline<"prepare" | "action" | "finalize">;
		getArray: ProcessPipeline<"prepare" | "action" | "finalize">;
		insert: ProcessPipeline<"prepare" | "action" | "finalize">;
		update: ProcessPipeline<"prepare" | "action" | "finalize">;
		delete: ProcessPipeline<"prepare" | "action" | "finalize">;
		overwrite: ProcessPipeline<"prepare" | "action" | "finalize">;
	};
	instantiate: {
		all: (dtoSet: Array<DTO>) => Promise<Array<ITEM>>;
		one: (dto: (DTO | undefined)) => Promise<undefined | ITEM>;
		first: (dtoSet: Array<DTO>) => Promise<MaybeUndefined<ITEM>>
	};
	addPlugin(plugin: (repository: EntityRepositoryInterface) => any): this;
	save(item: ITEM | undefined): Promise<any>;
	update(item: ITEM | undefined): Promise<any>;
	insert(item: ITEM | undefined): Promise<any>;
	overwrite(item: ITEM | undefined, values: Record<string, any>, reload?: boolean): Promise<any>;
	delete(item: ITEM | undefined): Promise<any>;
	create(importData?: Dto<MySqlTable>): Promise<ITEM>;
}