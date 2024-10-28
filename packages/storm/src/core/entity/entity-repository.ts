import {omitFieldsIP, pickFieldsIP, ProcessPipeline, type State, type MaybePromise, type T_Class} from "@affinity-lab/loki.util";
import {sql} from "drizzle-orm";
import {type MySqlTableWithColumns} from "drizzle-orm/mysql-core";
import type {MySql2Database, MySqlRawQueryResult} from "drizzle-orm/mysql2";
import {entityError} from "../error";
import type {Dto, ViewDto} from "../types";
import {Entity} from "./entity";
import type {EntityRepositoryInterface} from "./entity-repository-interface";
import {ViewEntityRepository} from "./view-entity-repository";


/**
 * A generic repository class for handling CRUD operations for storm entity in a MySQL database.
 * @template SCHEMA - The type of the database schema representing the entity's table.
 * @template ITEM - The type of the entity class.
 **/
export class EntityRepository<
	SCHEMA extends MySqlTableWithColumns<any>,
	ITEM extends Entity,
	ENTITY extends T_Class<ITEM, typeof Entity> = T_Class<ITEM, typeof Entity>,
	DTO extends Dto<SCHEMA> = Dto<SCHEMA>
>
	extends ViewEntityRepository<SCHEMA, ITEM, ENTITY, ViewDto<SCHEMA>>
	implements EntityRepositoryInterface<SCHEMA, ITEM, ENTITY> {


	protected pipelineFactory() {
		return {
			...super.pipelineFactory(),
			insert: new ProcessPipeline("prepare", "action", "finalize").setup({
				prepare: (async (state: State<{ item: ITEM }>) => {
					state.dto = await this.getInsertDTO(state.item)
				}),
				action: (async (state: State) => {
					await this.db.insert(this.schema).values(state.dto).execute().then((res: MySqlRawQueryResult) => state.insertId = res[0].insertId)
				}),
				finalize: (async (state: State) => {
					state.item.id = state.insertId
					await this.reload(state.item)
				})
			}),
			update: new ProcessPipeline("prepare", "action", "finalize").setup({
				prepare: (async (state: State) => {
					state.dto = await this.getUpdateDTO(state.item)
				}),
				action: (async (state: State) => {
					await this.db.update(this.schema).set(state.dto).where(sql`id = ${sql.placeholder("id")}`).execute({id: state.item.id})
				}),
				finalize: (async (state: State) => {
					await this.reload(state.item)
				})
			}),

			delete: new ProcessPipeline("prepare", "action", "finalize").setup({
				action: (async (state: State) => {
					await this.db.delete(this.schema).where(sql`id = (${sql.placeholder("id")})`).execute({id: state.item.id})
				}),
				finalize: ((state: State) => {
					state.item.id = undefined
				})
			}),
			overwrite: new ProcessPipeline("prepare", "action", "finalize").setup({
				action: async (state: State) => {
					await this.db.update(this.schema).set(state.values as DTO).where(sql`id = ${sql.placeholder("id")}`).execute({id: state.item.id})
				},
				finalize: async (state: State) => {
					state.reload && await this.reload(state.item)
				}
			})
		};
	};

	protected pipelineExecFactory() {
		return {
			...super.pipelineExecFactory(),
			delete: async (item: ITEM) => {
				return await this.pipelines.delete.run(this, {item});
			},
			insert: async (item: ITEM) => {
				await this.pipelines.insert.run(this, {item}).then(res => res.insertId as number);
				return item;
			},
			update: async (item: ITEM) => {
				await this.pipelines.update.run(this, {item});
				return item;
			},
			overwrite: async (item: ITEM, values: Record<string, any>, reload: boolean = true) => {
				await this.pipelines.overwrite.run(this, {item, values, reload});
				return item;
			}
		}
	}

	public readonly pipelines;
	protected readonly exec;

	constructor(db: MySql2Database<any>, schema: SCHEMA, entity: ENTITY) {
		super(db, schema, entity);
		this.pipelines = this.pipelineFactory();
		this.exec = this.pipelineExecFactory();
		this.instantiate = this.instantiateFactory();
		this.initialize();
	}

	protected initialize() {
	}

	addPlugin(plugin: (repository: EntityRepositoryInterface) => any) {
		plugin(this);
		return this;
	}


	/**
	 * Retrieves the data transfer object (DTO) from the item.
	 * @param item The item from which to retrieve the DTO.
	 * @returns The DTO representing the item.
	 */
	protected extractItemDTO(item: ITEM): DTO {
		return Object.assign({}, item) as unknown as DTO;
	}

	protected async getInsertDTO(item: ITEM): Promise<DTO> {
		let dto = this.extractItemDTO(item);
		await this.transformInsertDTO(dto);
		return dto;
	}

	protected async getUpdateDTO(item: ITEM): Promise<DTO> {
		let dto = this.extractItemDTO(item);
		await this.transformUpdateDTO(dto);
		return dto;
	}

	/**
	 * Prepares the DTO for saving by filtering and omitting specified fields.
	 * @param dto The DTO to prepare for saving.
	 */
	protected transformSaveDTO(dto: DTO): MaybePromise<void> {
		pickFieldsIP(dto, ...this.fields);
		omitFieldsIP(dto, "id");
	}

	/**
	 * Prepares the DTO for insertion by filtering and omitting specified fields.
	 * @param dto The DTO to prepare for insertion.
	 */
	protected transformInsertDTO(dto: DTO): MaybePromise<void> {
		this.transformSaveDTO(dto);
	}

	/**
	 * Prepares the DTO for updating by filtering and omitting specified fields.
	 * @param dto The DTO to prepare for updating.
	 */
	protected transformUpdateDTO(dto: DTO): MaybePromise<void> {
		this.transformSaveDTO(dto);
	}

	/**
	 * Prepares the item DTO. This is a hook method intended for subclass overrides.
	 * @param dto The DTO to prepare.
	 */
	protected transformItemDTO(dto: Dto<SCHEMA>): MaybePromise<void> {}
	/**
	 * Applies the DTO to the item.
	 * @param item The item to apply the DTO to.
	 * @param dto The data transfer object (DTO) containing the data to be applied to the item.
	 */
	protected async applyItemDTO(item: ITEM, dto: Dto<SCHEMA>) {
		this.transformItemDTO(dto);
		Object.assign(item, dto);
	}

	/**
	 * Creates a new item.
	 * @param importData - initial data to import into the new item.
	 * @param onlyDecoratedProperties the properties doesn't have to be decorated if this is false (default true)
	 * @returns A promise that resolves to the new item.
	 */
	public async create(importData?: Record<string, any>, onlyDecoratedProperties = true): Promise<ITEM> {
		// @ts-ignore
		let item = new this.entity(this);
		if (importData) item.$import(importData, onlyDecoratedProperties);
		return item;

	}

	/**
	 * Saves an item by either updating it if it already exists or inserting it if it's new.
	 * @param item - The item to save.
	 * @returns A promise that resolves once the save operation is completed.
	 */
	public async save(item: ITEM | undefined) {
		try {
			if (item) return item.id ? await this.update(item) : await this.insert(item)
		} catch (e) {
			if ((e as any).errno === 1062) throw entityError.duplicateEntry(e);
			else throw e;
		}
	}

	/**
	 * Updates an existing item.
	 * @param item - The item to update.
	 * @returns A promise that resolves once the update operation is completed.
	 */
	public async update(item: ITEM | undefined) {
		if (item) return this.exec.update(item);
	}

	/**
	 * Inserts a new item.
	 * @param item - The item to insert.
	 * @returns A promise that resolves once the insert operation is completed.
	 */
	public async insert(item: ITEM | undefined) {
		if (item) return this.exec.insert(item);
	}

	/**
	 * Overwrites an item with new values.
	 * @param item - The item to overwrite.
	 * @param values - The new values to overwrite the item with.
	 * @param [reload=true] - Whether to reload the item after overwriting.
	 * @returns A promise that resolves once the overwrite operation is completed.
	 */
	public async overwrite(item: ITEM | undefined, values: Record<string, any>, reload: boolean = true) {
		if (item) return this.exec.overwrite(item, values, reload);
	}

	/**
	 * Deletes an item.
	 * @param item - The item to delete.
	 * @returns A promise that resolves once the delete operation is completed.
	 */
	public async delete(item: ITEM | undefined) {
		if (item) return this.exec.delete(item);
	}
}

