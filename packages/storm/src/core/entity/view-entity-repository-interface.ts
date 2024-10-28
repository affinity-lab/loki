import {type MaybeUndefined, type MaybeUnset, ProcessPipeline, type T_Class} from "@affinity-lab/loki.util";
import {MySqlTable, MySqlView} from "drizzle-orm/mysql-core";
import type {MySql2Database} from "drizzle-orm/mysql2";
import type {ViewDto} from "../types";
import {ViewEntity} from "./view-entity";


export interface ViewEntityRepositoryInterface<
	SCHEMA extends MySqlTable<any> | MySqlView<any, any, any> = any,
	ITEM extends ViewEntity = any,
	ENTITY extends T_Class<ITEM, typeof ViewEntity> = any,
	DTO extends ViewDto<SCHEMA> = any
> {
	readonly db: MySql2Database<any>
	readonly schema: SCHEMA,
	readonly entity: ENTITY

	fields: string[];
	pipelines: {
		getAll: ProcessPipeline<"prepare" | "action" | "finalize">;
		getOne: ProcessPipeline<"prepare" | "action" | "finalize">;
		getArray: ProcessPipeline<"prepare" | "action" | "finalize">
	};
	instantiate: {
		all: (dtoSet: Array<DTO>) => Promise<Array<ITEM>>;
		one: (dto: (DTO | undefined)) => Promise<undefined | ITEM>;
		first: (dtoSet: Array<DTO>) => Promise<MaybeUndefined<ITEM>>
	};
	addPlugin(plugin: (repository: ViewEntityRepositoryInterface) => any): this;
	getRawDTO(id: MaybeUnset<number>): Promise<MaybeUndefined<DTO>>;

	get(): Promise<Array<ITEM>>;
	get(ids: Array<number>): Promise<Array<ITEM>>;
	get(id: MaybeUnset<number>): Promise<ITEM | undefined>;

	create(): Promise<ITEM>;
	reload(item: any): Promise<void>;
}