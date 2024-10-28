import {firstOrUndefined, MaterializeIt, type MaybePromise, type MaybeUndefined, type MaybeUnset, ProcessPipeline, type State, type T_Class} from "@laborci/util";
import {sql} from "drizzle-orm";
import {MySqlTable, MySqlView} from "drizzle-orm/mysql-core";
import type {MySql2Database} from "drizzle-orm/mysql2";
import {stmt} from "../helper";
import type {ViewDto, WithId, WithIds} from "../types";

import {ViewEntity} from "./view-entity";
import {type ViewEntityRepositoryInterface} from "./view-entity-repository-interface";


/**
 * A generic repository class for handling Read operations for storm entity in a MySQL database view.
 * @template SCHEMA - The type of the database schema representing the entity's view.
 * @template ITEM - The type of the entity class.
 */
export class ViewEntityRepository<
	SCHEMA extends MySqlTable<any> | MySqlView<any, any, any>,
	ITEM extends ViewEntity,
	ENTITY extends T_Class<ITEM, typeof ViewEntity> = T_Class<ITEM, typeof ViewEntity>,
	DTO extends ViewDto<SCHEMA> = ViewDto<SCHEMA>
>
	implements ViewEntityRepositoryInterface<SCHEMA, ITEM, ENTITY, DTO> {
	readonly fields: string[];
	pipelines;
	instantiate;
	protected exec;

	constructor(readonly db: MySql2Database<any>, readonly schema: SCHEMA, readonly entity: ENTITY) {
		this.fields = Object.keys(schema as Record<string, any>);
		entity.repository = this;
		this.pipelines = this.pipelineFactory();
		this.instantiate = this.instantiateFactory();
		this.exec = this.pipelineExecFactory();
		this.initialize();
	}

	addPlugin(plugin: (repository: ViewEntityRepositoryInterface) => any) {
		plugin(this);
		return this;
	}

	protected initialize() {}

	@MaterializeIt
	protected get stmt_all() { return stmt<undefined,Array<DTO>>(this.db.select().from(this.schema))}
	@MaterializeIt
	protected get stmt_get_array() { return stmt<WithIds, Array<DTO>>(this.db.select().from(this.schema).where(sql`id IN (${sql.placeholder("ids")})`))}
	@MaterializeIt
	protected get stmt_get() { return stmt<WithId, MaybeUndefined<DTO>>(this.db.select().from(this.schema).where(sql`id = ${sql.placeholder("id")}`).limit(1), firstOrUndefined)}

	protected pipelineFactory() {
		return {
			getOne: new ProcessPipeline("prepare", "action", "finalize").setup({
				action: (async (state: State) => {
					if (state.dto === undefined) state.dto = await this.stmt_get({id: state.id})
				}),
				finalize: (async (state: State) => {
					if (state.dto !== undefined) state.item = await this.instantiate.one(state.dto)
				})
			}),
			getArray: new ProcessPipeline("prepare", "action", "finalize").setup({
				action: (async (state: State) => {
					if (state.dtos === undefined) state.dtos = [];
					state.dtos.push(...await this.stmt_get_array({ids: state.ids}));
				}),
				finalize: (async (state: State) => {
					state.items = await this.instantiate.all(state.dtos)
				})
			}),
			getAll: new ProcessPipeline("prepare", "action", "finalize").setup({
				action: (async (state: State) => {
					if (state.dtos === undefined) state.dtos = [];
					state.dtos.push(...await this.stmt_all(undefined));
				}),
				finalize: (async (state: State) => {
					state.items = await this.instantiate.all(state.dtos)
				})
			}),
		}
	}
	protected pipelineExecFactory() {
		return {
			getOne: async (id: number) => {return await this.pipelines.getOne.run(this, {id}).then(state => state.item)},
			getArray: async (ids: Array<number>) => { return this.pipelines.getArray.run(this, {ids}).then(state => state.items)},
			getAll: async () => { return this.pipelines.getAll.run(this, {}).then(state => state.items)},
		}
	}
	protected instantiateFactory() {
		return {
			/**
			 * Instantiates multiple items from an array of DTOs.
			 * @param dtoSet
			 * @returns An array of instantiated items.
			 */
			all: async (dtoSet: Array<DTO>): Promise<Array<ITEM>> => {
				const instances: Array<ITEM> = [];
				for (let dto of dtoSet) {
					let instance = await this.instantiate.one(dto as DTO) as ITEM | undefined;
					if (instance !== undefined) instances.push(instance)
				}
				return instances;
			},
			/**
			 * Instantiates the first item from an array of DTOs.
			 * @param dtoSet
			 * @returns The instantiated item, or undefined if the array is blank.
			 */
			first: async (dtoSet: Array<DTO>): Promise<MaybeUndefined<ITEM>> => { return await this.instantiate.one(firstOrUndefined(dtoSet)) as ITEM | undefined;},
			/**
			 * Instantiates an item from a DTO.
			 * @param dto
			 * @returns The instantiated item, or undefined if the DTO is undefined.
			 */
			one: async (dto: DTO | undefined) => {
				if (dto === undefined) return undefined;
				let item = await this.create();
				await this.applyItemDTO(item, dto);
				return item;
			}
		}
	}


	/**
	 * Prepares the item DTO. This is a hook method intended for subclass overrides.
	 * @param dto The DTO to prepare.
	 */
	protected transformItemDTO(dto: DTO): MaybePromise<void> {}
	/**
	 * Applies the DTO to the item.
	 * @param item The item to apply the DTO to.
	 * @param dto The data transfer object (DTO) containing the data to be applied to the item.
	 */
	protected async applyItemDTO(item: ITEM, dto: DTO) {
		this.transformItemDTO(dto);
		Object.assign(item, dto);
	}


	/**
	 * Retrieves the raw data of an entity by its ID.
	 * @param id - The ID of the entity.
	 * @returns A promise resolving to the raw data of the entity, or undefined if not found.
	 */
	async getRawDTO(id: MaybeUnset<number>): Promise<MaybeUndefined<DTO>> { return id ? this.stmt_get({id: id!}) : undefined}

	/**
	 * Retrieves all items
	 * @returns A promise resolving to all items.
	 */
	get(): Promise<Array<ITEM>>
	/**
	 * Retrieves one or multiple items by their IDs.
	 * @param ids
	 * @returns A promise resolving to one or multiple items, or undefined if not found.
	 */
	get(ids: Array<number>): Promise<Array<ITEM>>
	/**
	 * Retrieves one item by the provided ID.
	 * @param id
	 * @returns A promise resolving to the item, or undefined if not found.
	 */
	get(id: MaybeUnset<number>): Promise<ITEM | undefined>
	async get(id?: Array<number> | number | undefined | null) {
		if (arguments.length === 0) return this.exec.getAll();
		if (Array.isArray(id)) {
			if (id.length === 0) return [];
			id = [...new Set(id)];
			return this.exec.getArray(id)
		} else {
			if (id === undefined || id === null) return undefined;
			return this.exec.getOne(id)
		}
	}

	/**
	 * Creates a new item.
	 * @param importData - initial data to import into the new item.
	 * @returns A promise that resolves to the new item.
	 */
	async create(): Promise<ITEM> {
		// @ts-ignore
		return new this.entity(this);
	}

	/**
	 * Reloads an item from the database.
	 * @param item - The item to reload.
	 * @returns A promise that resolves once the item has been reloaded.
	 */
	async reload(item: ITEM) { await this.getRawDTO(item.id).then(dto => { dto && this.applyItemDTO(item, dto!)})};
}