import type {MaybeArray, State, T_Class} from "@laborci/util";
import {MaterializeIt} from "@laborci/util";
import {and, not, sql} from "drizzle-orm";
import {MySqlTable} from "drizzle-orm/mysql-core";
import {type Dto, Entity, EntityRepository, type EntityRepositoryInterface, Export, Import, prevDto, stmt} from "../../core";

import {tagError} from "./helper/error";

export type Usage = {
	repo: EntityRepositoryInterface,
	field: string
}

export class TagEntity extends Entity {
	@Export @Import declare name: string
}

export class TagRepository<
	SCHEMA extends MySqlTable,
	ITEM extends TagEntity,
	DTO extends Dto<SCHEMA> & { name: string } = Dto<SCHEMA> & { name: string },
	ENTITY extends T_Class<ITEM, typeof TagEntity> = T_Class<ITEM, typeof TagEntity>,
> extends EntityRepository<SCHEMA, ITEM> {

	protected usages: Array<Usage> = []

	protected initialize(addPipelines: boolean = true) {
		super.initialize();
		if(addPipelines) {
			this.pipelines.delete.blocks.finalize.append(async (state: State) => await this.deleteInUsages(state.item.name));
			this.pipelines.update.blocks.prepare.append(async (state: State) => await prevDto(state, this))
										.finalize.append(async (state: State) => await this.selfRename(state.dto, state.prevDto));
		}
	}

	@MaterializeIt
	protected get stmt_getByName() {
		return stmt<{ names: Array<string> }, Array<ITEM>>(
			this.db.select().from(this.schema).where(sql`name IN (${sql.placeholder("names")})`),
			this.instantiate.all
		)
	}

	/**
	 * Get tags by name
	 * @param names
	 */
	public async getByName(names: Array<string>): Promise<Array<ITEM>>
	public async getByName(name: string): Promise<ITEM | undefined>
	public async getByName(names: Array<string> | string): Promise<ITEM | undefined | Array<ITEM>> {
		let isArray = Array.isArray(names);
		if (typeof names === "string") names = [names];
		if (names.length === 0) return isArray ? [] : undefined;
		let tags = await this.stmt_getByName({names});
		return !isArray ? tags[0] : tags;
	}

	/**
	 * Rename the tag
	 * @param oldName
	 * @param newName
	 */
	public async rename(oldName: string, newName: string): Promise<void> {
		oldName = oldName.replace(',', "").trim();
		newName = newName.replace(',', "").trim();
		if (oldName === newName) return
		let o = await this.getByName(oldName);
		if (!o) return
		let n = await this.getByName(newName);

		if (!n) {
			o.name = newName
			await this.update(o)
		} else {
			await this.delete(o);
		}
		await this.doRename(oldName, newName);
	}


	/**
	 * Delete a tag from all usages
	 * @param name
	 */
	public async deleteInUsages(name: string): Promise<void> {
		name = name.trim();
		let helper = `,${name},`;
		for (let usage of this.usages) {
			let set: Record<string, any> = {}
			set[usage.field] = sql`trim(both ',' from replace(concat(',', ${usage.repo.schema[usage.field]} , ','), ${helper}, ','))`;
			await usage.repo.db.update(usage.repo.schema).set(set).where(sql`FIND_IN_SET(${name}, ${usage.repo.schema[usage.field]})`);
		}
	}


	// ------------------------------------------ PIPELINE HELPERS


	/**
	 * Add a usage to the tag
	 * @param usage
	 */
	protected addUsage(usage: MaybeArray<Usage>) {
		this.usages.push(...(Array.isArray(usage) ? usage : [usage]));
	}


	/**
	 * Rename the tag
	 * @param dto
	 * @param prevDto
	 */
	protected async selfRename(dto: DTO, prevDto: DTO) {
		if (dto.name && dto.name !== prevDto.name) {
			await this.doRename(prevDto.name, dto.name);
		}
	}


	/**
	 * Update the tag
	 * @param repository
	 * @param dto
	 * @param prevDto
	 */
	protected async updateTag(repository: EntityRepositoryInterface, dto: DTO | {}, prevDto: DTO) {
		let {prev, curr} = this.changes(repository, dto, prevDto);
		await this.addTag(curr.filter(x => !prev.includes(x)));
		await this.deleteTag(prev.filter(x => !curr.includes(x)));
	}


	/**
	 * Normalize the tag values
	 * @param repository
	 * @param dto
	 */
	protected prepare(repository: EntityRepositoryInterface, dto: Record<string, any>) {
		for (let usage of this.usages) {
			if (usage.repo === repository) {
				if (!dto[usage.field]) dto[usage.field] = "";
				dto[usage.field] = [...new Set((dto[usage.field] as string).trim().split(',').map(x => x.trim()).filter(x => !!x))].join(',');
			}
		}
	}


	// ------------------------------------------ INTERNAL HELPERS

	protected changes(repository: EntityRepositoryInterface, dto: Record<string, any>, prevDto: Record<string, any>): { prev: Array<string>, curr: Array<string> } {
		if (!prevDto) throw tagError.itemNotFound(repository.constructor.name);
		let prev: Array<string> = [];
		let curr: Array<string> = []
		for (let usage of this.usages) {
			if (usage.repo === repository) {
				prev.push(...(prevDto[usage.field] ? prevDto[usage.field].split(',') : []));
				curr.push(...(dto[usage.field] ? (dto[usage.field] as string).split(',') : []));
			}
		}
		prev = [...new Set(prev)];
		curr = [...new Set(curr)];
		return {prev, curr};
	}


	protected async deleteTag(names: Array<string>): Promise<void> {
		let items = await this.getByName(names)
		if (items.length === 0) return;
		await this.deleteItems(items);
	}

	protected async deleteItems(items: Array<ITEM>) {
		for (let item of items) {
			let usageFound = false;
			for (let usage of this.usages) {
				let res = await usage.repo.db.select().from(usage.repo.schema).where(sql`FIND_IN_SET(${item.name}, ${usage.repo.schema[usage.field]})`).limit(1).execute();
				if (res.length !== 0) {
					usageFound = true;
					break;
				}
			}
			if (!usageFound) await this.delete(item);
		}
	}

	protected async addTag(names: Array<string>): Promise<void> {
		let items: string[] = await this.getByName(names).then(r => r.map(i => i.name))
		let toAdd: string[] = names.filter(x => !items.includes(x));
		for (let tag of toAdd) {
			let item = await this.create()
			item.name = tag;
			await this.insert(item);
		}
	}

	protected async doRename(oldName: string, newName: string) {
		for (let usage of this.usages) {
			let set: Record<string, any> = {};
			set[usage.field] = sql`trim(both ',' from replace(concat(',', ${usage.field} , ','), ',${oldName},', ',${newName},'))`;
			await usage.repo.db.update(usage.repo.schema).set(set).where(and(sql`FIND_IN_SET("${oldName}", ${usage.field})`, not(sql`FIND_IN_SET("${newName}", ${usage.field})`)));
			set[usage.field] = sql`trim(both ',' from replace(concat(',', ${usage.field} , ','), ',${oldName},', ','))`;
			await usage.repo.db.update(usage.repo.schema).set(set).where(and(sql`FIND_IN_SET("${oldName}", ${usage.field})`, sql`FIND_IN_SET("${newName}", ${usage.field})`));
		}
	}

	// ------------------------------------------ PIPELINE PLUGIN

	plugin(field: string) {
		return (repository: EntityRepositoryInterface) => {

			let usage: Usage = {repo: repository, field}
			this.addUsage(usage);

			repository.pipelines.update.blocks
				.prepare.append(async (state: State) => {
				await prevDto(state, repository);
				this.prepare(repository, state.dto);
			})
				.finalize.append(async (state: State) => {
					await this.selfRename(state.dto, state.prevDto);
					await this.updateTag(repository, state.dto, state.prevDto);
				}
			)

			repository.pipelines.delete.blocks
				.prepare.append(async (state: State) => await prevDto(state, repository))
				.finalize.append(async (state: State) => await this.deleteTag(state.prevDto[usage.field].split(','))
			)

			repository.pipelines.insert.blocks
				.prepare.append(async (state: State) => this.prepare(repository, state.dto))

			repository.pipelines.overwrite.blocks
				.prepare.append(async (state: State) => await prevDto(state, repository))
				.finalize.append(async (state: State) => {

					await this.selfRename(state.dto, await prevDto(state, repository));
					await this.updateTag(repository, state.dto, await prevDto(state, repository));
				}
			)
		}
	}
}
