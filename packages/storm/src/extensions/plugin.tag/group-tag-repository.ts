import {MaterializeIt, type State, type T_Class} from "@affinity-lab/loki.util";
import {and, eq, not, sql} from "drizzle-orm";
import {type MySqlTable} from "drizzle-orm/mysql-core";
import {type MySql2Database} from "drizzle-orm/mysql2";
import {tagError} from "./helper/error";
import {TagEntity, TagRepository} from "./tag-repository";
import {type Dto, Entity, EntityRepository, type EntityRepositoryInterface, Export, Import, prevDto, stmt} from "../../core";

export type GroupUsage = {
	repo: EntityRepositoryInterface,
	field: string,
	groupField: string,
	mode?: "JSON" | "LIST"
}

export class GroupTagEntity extends TagEntity {
	@Export @Import declare groupId: number | string
}

export class GroupTagRepository<
	SCHEMA extends MySqlTable,
	ITEM extends GroupTagEntity,
	DTO extends Dto<SCHEMA> & { name: string } = Dto<SCHEMA> & { name: string },
	ENTITY extends T_Class<ITEM, typeof GroupTagEntity> = T_Class<ITEM, typeof GroupTagEntity>,
> extends TagRepository<SCHEMA, ITEM> {

	protected usages: Array<GroupUsage> = []

	constructor(readonly db: MySql2Database<any>, readonly schema: SCHEMA, readonly entity: ENTITY) {super(db, schema, entity)}

	protected initialize() {
		super.initialize(false);
		this.pipelines.delete.blocks.finalize.append(async (state: State) => await this.deleteInUsages(state.item.name, state.item.groupId));
		this.pipelines.update.blocks.prepare.append(async (state: State) => await prevDto(state, this))
			.finalize.append(async (state: State) => await this.selfRename(state.dto, state.prevDto));
	}

	@MaterializeIt
	protected get stmt_groupGetByName() {
		return stmt<{ names: Array<string>, groupId: number | string }, Array<ITEM>>(
			this.db.select().from(this.schema).where(sql`name IN (${sql.placeholder("names")}) AND groupId = ${sql.placeholder("groupId")}`),
			this.instantiate.all
		)
	}

	@MaterializeIt
	protected get stmt_getByGroup() {
		return stmt<{groupId: number | string }, Array<ITEM>>(
			this.db.select().from(this.schema).where(sql`groupId = ${sql.placeholder("groupId")}`),
			this.instantiate.all
		)
	}

	/***
	 * returns all tags to a group
	 * @param groupId group's identifier
	 */
	public async getToGroup(groupId: number) {
		return this.stmt_getByGroup({groupId});
	}

	/**
	 * Get tags by name and groupId
	 * @param names
	 * @param groupId
	 */
	public async getByName(names: Array<string>, groupId?: number | string): Promise<Array<ITEM>>;
	public async getByName(name: string, groupId?: number | string): Promise<ITEM | undefined>;
	public async getByName(names: Array<string> | string, groupId?: number | string): Promise<ITEM | undefined | Array<ITEM>> {
		if (!groupId) throw tagError.groupId({where: "GETBYNAME", groupId: groupId});
		let isArray = Array.isArray(names);
		if (typeof names === "string") names = [names];
		if (names.length === 0) return isArray ? [] : undefined;
		let tags = await this.stmt_groupGetByName({names, groupId: groupId!});
		return !isArray ? tags[0] : tags;
	}

	/**
	 * Delete a tag from all usages, called when a tag is deleted manually
	 * @param name
	 * @param groupId
	 */
	public async deleteInUsages(name: string, groupId?: number | string): Promise<void> {
		if (!groupId) throw tagError.groupId({where: "DELETE IN USAGES", groupId: groupId});
		name = name.trim();
		let listNameHelper = `,${name},`;
		let jsonNameHelper = `$.${name}`;
		for (let usage of this.usages) {
			let set: Record<string, any> = {}
			if(usage.mode === "LIST") {
				set[usage.field] = sql`trim(both ',' from replace(concat(',', ${usage.repo.schema[usage.field]} , ','), ${listNameHelper}, ','))`;
				await usage.repo.db.update(usage.repo.schema).set(set).where(and(sql`FIND_IN_SET(${name}, ${usage.repo.schema[usage.field]})`, eq(usage.repo.schema[usage.groupField], groupId)));
			} else {
				set[usage.field] = sql`JSON_REMOVE(${usage.repo.schema[usage.field]}, ${jsonNameHelper})`;
				await usage.repo.db.update(usage.repo.schema).set(set).where(and(sql`JSON_EXTRACT(${usage.repo.schema[usage.field]}, ${jsonNameHelper}) IS NOT NULL`, eq(usage.repo.schema[usage.groupField], groupId)));
			}
		}
	}

	/**
	 * Rename a tag
	 * @param oldName
	 * @param newName
	 * @param groupId
	 */
	public async rename(oldName: string, newName: string, groupId?: number | string): Promise<void> {
		oldName = oldName.replace(',', "").trim(); // normalize the names
		newName = newName.replace(',', "").trim();
		if (oldName === newName) return
		let oldItem = await this.getByName(oldName, groupId); // item with oldName
		if (!oldItem) return
		let newItem = await this.getByName(newName, groupId); // item with newName
		let item = Array.isArray(oldItem) ? oldItem[0] : oldItem;
		if (!newItem) {
			item.name = newName
			await this.update(item); // updates the tag
		} else await this.delete(item); // deletes the tag
		await this.doRename(oldName, newName, groupId); // updates the tag in all usages
	}

	// ------------------------------------------ PIPELINE HELPERS
	/***
	 * Called by the tag's pipeline, checks for changes, adds and deletes the tags according to them.
	 * @param repository changed entity's repository
	 * @param item changed entity
	 * @param prevDto changed entity's previous state
	 * @param fieldName name of the tag field
	 */
	protected async updateTag<ITEM extends Entity, FIELD_NAME extends keyof ITEM & string>(repository: EntityRepositoryInterface, item: ITEM, prevDto: Record<string, any>, fieldName?: FIELD_NAME) {
		if (!fieldName) throw tagError.selfRename();
		let groupId = item[fieldName] as string | number;
		if (!groupId) throw tagError.groupId({where: "UPDATE TAG", groupId: groupId})
		let {prev, curr} = this.changes(repository, item, prevDto);
		await this.addTag(curr.filter(x => !prev.includes(x)), groupId);
		await this.deleteTag(prev.filter(x => !curr.includes(x)), groupId);
	}

	/***
	 * creates 2 arrays of strings, one for the current tags on the changed entity, and one for the tags before the change.
	 * @param repository changed entity's repository
	 * @param item changed entity
	 * @param prevDto changed entity's previous state
	 * @protected
	 */
	protected changes(repository: EntityRepositoryInterface, item: Record<string, any>, prevDto: Record<string, any>): { prev: Array<string>; curr: Array<string> } {
		if (!prevDto) throw tagError.itemNotFound(repository.constructor.name);
		let curr: Array<string> = [];
		let prev: Array<string> = [];
		for (let usage of this.usages) {
			if (usage.repo === repository) {
				if(usage.mode === "JSON") {
					prev.push(...Object.keys(prevDto[usage.field]));
					curr.push(...Object.keys(item[usage.field]));
				}
				else {
					prev.push(...(prevDto[usage.field] ? prevDto[usage.field].split(',') : []));
					curr.push(...(item[usage.field] ? (item[usage.field] as string).split(',') : []));
				}

			}
		}
		prev = [...new Set(prev)];
		curr = [...new Set(curr)];
		return {prev, curr};
	}


	/***
	 * update pipeline calls this (manual name update)
	 * @param dto tag's dto
	 * @param prevDto tag's prevDto
	 */
	public async selfRename(dto: Record<string, any>, prevDto: Record<string, any>) {
		if (dto.name && dto.name !== prevDto.name) await this.doRename(prevDto.name, dto.name, dto.groupId);
	}

	// ------------------------------------------ INTERNAL HELPERS

	/***
	 * Called by updateTag, checks if any item needs to be added.
	 * @param names all tag names that was added to the entity
	 * @param groupId
	 */
	protected async addTag(names: Array<string>, groupId?: number | string): Promise<void> {
		if (!groupId) throw tagError.groupId({where: "ADD TAG", groupId: groupId})
		let items = await this.getByName(names, groupId).then(r => (r).map(i => i.name))
		let toAdd = names.filter(x => !items.includes(x));
		for (let tag of toAdd) {
			let item = await this.create({groupId: groupId, name: tag});
			await this.insert(item);
		}
	}

	/***
	 * Called by updateTag, checks if any item needs to be deleted.
	 * @param names all tag names that was removed from the entity
	 * @param groupId
	 */
	protected async deleteTag(names: Array<string>, groupId?: number | string): Promise<void> {
		if (!groupId) throw tagError.groupId({where: "DELETE TAG", groupId: groupId})
		let items = await this.getByName(names, groupId)
		if (items.length === 0) return;
		await this.deleteItems(items, groupId);
	}


	/***
	 * Runs when a tag is removed from an entity's usage. It checks if the tag is associated with any other entities within the usages, and if not, the tag is deleted.
	 */
	protected async deleteItems(items: Array<ITEM>, groupId?: number | string) {
		for (let item of items) {
			let doDelete = true;
			for (let usage of this.usages) {
				let res = await usage.repo.db.select().from(usage.repo.schema).where(and(sql`FIND_IN_SET(${item.name}, ${usage.repo.schema[usage.field]})`, eq(usage.repo.schema[usage.groupField], groupId))).limit(1).execute();
				if (res.length !== 0) {
					doDelete = false;
					break;
				}
			}
			if (doDelete) {
				await this.delete(item);
			}
		}
	}


	/***
	 * Updates the renamed tag in all of its usages.
	 */
	protected async doRename(oldName: string, newName: string, groupId?: number | string) {
		if (!groupId) throw tagError.groupId({where: "DO RENAME", groupId: groupId});
		let nN = `$.${newName}`; // helper for newName in JSOM mode (where)
		let oN = `$.${oldName}`; // helper for oldName in JSOM mode (where + set)
		let eN = `"${newName}"`; // helper for newName in JSOM mode (set)
		let eO = `"${oldName}"`; // helper for oldName in JSOM mode (set)
		let oldN = `,${oldName},`; // helper for newName in LIST mode (set)
		let newN = `,${newName},`; // helper for oldName in LIST mode (set)
		// NOTE: LIST mode uses oldName and newName in it's "where" section
		for (let usage of this.usages) {
			let set: Record<string, any> = {};
			if (usage.mode && usage.mode === "JSON") {
				let w = and(sql`json_extract(${usage.repo.schema[usage.field]}, ${oN}) > 0`, sql`json_extract(${usage.repo.schema[usage.field]}, ${nN}) is NULL`, eq(usage.repo.schema[usage.groupField], groupId))
				set[usage.field] = sql`replace(${usage.repo.schema[usage.field]}, ${eO}, ${eN})`;
				await usage.repo.db.update(usage.repo.schema).set(set).where(w);
				w = and(sql`json_extract(${usage.repo.schema[usage.field]}, ${oN}) > 0`, sql`json_extract(${usage.repo.schema[usage.field]}, ${nN}) > 0`)
				// set[usage.field] = sql`json_remove(json_replace(${usage.repo.schema[usage.field]}, ${nN}, json_value(${usage.repo.schema[usage.field]}, ${nN}) + json_value(${usage.repo.schema[usage.field]}, ${oN})), ${oN})`;
				set[usage.field] = sql`json_remove(${usage.repo.schema[usage.field]}, ${oN})`; // replace this line with the one above, to add the values together
				await usage.repo.db.update(usage.repo.schema).set(set).where(w);
			} else {
				set[usage.field] = sql`trim(both ',' from replace(concat(',', ${usage.repo.schema[usage.field]} , ','), ${oldN}, ${newN}))`;
				await usage.repo.db.update(usage.repo.schema).set(set).where(and(sql`FIND_IN_SET(${oldName}, ${usage.repo.schema[usage.field]})`, not(sql`FIND_IN_SET(${newName}, ${usage.repo.schema[usage.field]})`), eq(usage.repo.schema[usage.groupField], groupId)));
				set[usage.field] = sql`trim(both ',' from replace(concat(',', ${usage.repo.schema[usage.field]} , ','), ${oldN}, ','))`;
				await usage.repo.db.update(usage.repo.schema).set(set).where(and(sql`FIND_IN_SET(${oldName}, ${usage.repo.schema[usage.field]})`, sql`FIND_IN_SET(${newName}, ${usage.repo.schema[usage.field]})`, eq(usage.repo.schema[usage.groupField], groupId)));
			}
		}
	}


	protected prepare(repository: EntityRepositoryInterface, dto: Record<string, any>) {
		for (let usage of this.usages) {
			if (usage.repo === repository && usage.mode === "LIST") {
				dto[usage.field] = [...new Set((dto[usage.field] as string || "").trim().split(',').map(x => x.trim()).filter(x => !!x))].join(',');
			}
		}
	}


	// ------------------------------------------ PIPELINE PLUGIN

	plugin(field: string, groupField?: string, mode: "JSON" | "LIST" = "LIST") {
		if (!groupField) throw new Error("GROUPID MUST BE DEFINED !!!!!!!");
		return (repository: EntityRepositoryInterface) => {

			let usage: GroupUsage = {repo: repository, field, groupField, mode}
			this.addUsage(usage)

			repository.pipelines.update.blocks
				.prepare.append(async (state: State) => await prevDto(state, repository))
				.prepare.append(async (state: State) => this.prepare(repository, state.dto))
				.finalize.append(async (state: State) => {
					await this.updateTag(repository, state.item, state.prevDto, groupField);
				}
			)

			repository.pipelines.delete.blocks
				.prepare.append(async (state: State) => await prevDto(state, repository))
				.finalize.append(async (state: State) => {
					await this.deleteTag(state.prevDto[usage.field].split(','), state.prevDto[groupField])
				}
			)

			repository.pipelines.insert.blocks
				.prepare.append(async (state: State) => this.prepare(repository, state.dto))

			repository.pipelines.overwrite.blocks
				.prepare.append(async (state: State) => await prevDto(state, repository))
				.finalize.append(async (state: State) => {
					await this.updateTag(repository, state.item, await prevDto(state, repository), groupField);
				}
			)
		}
	}
}