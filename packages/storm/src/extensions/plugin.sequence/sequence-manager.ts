import {omitFieldsIP, type State} from "@nano-forge/util";
import {and, eq, gt, gte, sql} from "drizzle-orm";
import {Entity, type EntityRepositoryInterface} from "../../core";

export class SequenceManager {
	constructor(private repo: EntityRepositoryInterface, private sequenceField: string, private parentField: string) {
		repo.pipelines.update.blocks.action.prepend(async (state: State) => {
			omitFieldsIP(state.dto, this.sequenceField, this.parentField);
		})
		repo.pipelines.insert.blocks.prepare.append(async (state: State) => {
			state.dto[this.sequenceField] = await this.next(state.dto[this.parentField]);
		})
		repo.pipelines.delete.blocks.finalize.append(async (state: State) => {
			let set: Record<string, any> = {};
			set[this.sequenceField] = sql`${this.repo.schema[this.sequenceField]} - 1`;
			await this.repo.db.update(this.repo.schema).set(set).where(and(eq(this.repo.schema[this.parentField], state.item[this.parentField]), gt(this.repo.schema[this.sequenceField], state.item[this.sequenceField])));
		})
	}

	protected async max(parent: string | number): Promise<number> {
		let res = await this.repo.db.select({max: sql<number>`Max(${this.repo.schema[this.sequenceField]})`})
			.from(this.repo.schema)
			.where(eq(this.repo.schema[this.parentField], parent)).execute();
		return res[0].max;
	}

	protected async next(parent: string | number): Promise<number> {
		let r = await this.max(parent).then(r=>r+1);
		console.log("ASD", r)
		return r
	}

	public async move(entity: Entity, nextEntity: Entity): Promise<void>;
	public async move(entity: Entity, parentId: number | string): Promise<void>;
	public async move<ENTITY extends Entity>(entity: ENTITY, param: ENTITY | number | string): Promise<void> {
		let set: Record<string, any> = {};
		set[this.sequenceField] = sql`${this.repo.schema[this.sequenceField]} - 1`;
		await this.repo.db.update(this.repo.schema).set(set).where(and(eq(this.repo.schema[this.parentField], entity[this.parentField as keyof ENTITY]), gt(this.repo.schema[this.sequenceField], entity[this.sequenceField as keyof ENTITY])));
		let values: Record<string, any> = {};
		if (typeof param === "number" || typeof param === "string") {
			values[this.sequenceField] = await this.next(param);
			values[this.parentField] = param;
			await this.repo.overwrite(entity, values);
		} else {
			values[this.parentField] = param[this.parentField as keyof ENTITY];
			values[this.sequenceField] = param[this.sequenceField as keyof ENTITY];
			set[this.sequenceField] = sql`${this.repo.schema[this.sequenceField]} + 1`;
			await this.repo.db.update(this.repo.schema).set(set).where(and(eq(this.repo.schema[this.parentField], param[this.parentField as keyof ENTITY]), gte(this.repo.schema[this.sequenceField], param[this.sequenceField as keyof ENTITY])));
			await this.repo.overwrite(entity, values);
		}
	}
}