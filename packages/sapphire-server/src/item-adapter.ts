import {type Dto, Entity, type EntityRepositoryInterface} from "@affinity-lab/loki.storm";
import {type MaybeUnset} from "@affinity-lab/loki.util";
import {Column, getTableName} from "drizzle-orm";
import {type MySqlTableWithColumns} from "drizzle-orm/mysql-core";
import {sapphireError} from "./error";


export class ItemAdapter<
	SCHEMA extends MySqlTableWithColumns<any>,
	ITEM extends Entity,
	DTO extends Dto<SCHEMA> = Dto<SCHEMA>
> {
	protected type: string;

	constructor(
		public readonly schema: SCHEMA,
		public readonly repository: EntityRepositoryInterface) {
		this.type = getTableName(this.schema);
	}

	/**
	 * API method
	 *
	 * @param id
	 * @param preset
	 * @param env
	 */
	public async get(id: number | null, preset: undefined | Record<string, any>, env: Record<string, any>) {
		let u = await this.repository.get(id);
		if (!u) throw sapphireError.notFound({location: "getItem", id});
		return id ? await this.export(u, preset, env) : await this.new(preset, env);
	}

	/**
	 * API method
	 *
	 * @param id
	 * @param values
	 * @param env
	 */
	public async save(id: number | null, values: Record<string, any> = {}, env: Record<string, any>): Promise<MaybeUnset<number>> {
		values = await this.import(id, values, env);
		let item: ITEM | undefined;
		if (!id) item = await this.repository.create();
		else item = await this.repository.get(id);
		if (!item) throw sapphireError.notFound({location: "saveItem", id});
		item.$import(values as Record<keyof ITEM, any>);
		await item.$save();
		return item.id;
	}

	/**
	 * API method
	 *
	 * @param id
	 * @param env
	 */
	public async delete(id: number, env: Record<string, any>) {
		await this.repository.delete(await this.repository.get(id));
		return true;
	}

	/**
	 * You can process the incoming data here if you need to modify it.
	 * By default, it handles date type fields.
	 *
	 * @param id
	 * @param values
	 * @param env
	 * @protected
	 */
	protected async import(id: number | null, values: Record<string, any>, env: Record<string, any>): Promise<Record<string, any>> {
		for (let key of Object.keys(this.schema)) {
			let field = this.schema[key] as Column;
			if (field.dataType === "date") values[key] = values[key] ? new Date(values[key]) : null;
		}
		return values;
	}

	/**
	 * In this method, you can finalize how you want to represent an Item towards the frontend.
	 *
	 * @param item
	 * @param preset
	 * @param env
	 * @protected
	 */
	protected async export(
		item: ITEM,
		preset: undefined | Record<string, any>,
		env: Record<string, any>
	): Promise<{ data: Partial<DTO>, type: any }> {
		let data = item ? (item.$export as Function)() : {};
		if (preset) data = {...data, ...preset};
		return {type: item?.constructor.name, data};
	}

	/**
	 * In this method, you can define how a newly created element should look for the frontend.
	 *
	 * @param preset
	 * @param env
	 * @protected
	 */
	protected async new(
		preset: undefined | Record<string, any>,
		env: Record<string, any>
	): Promise<{ type: string, data: Partial<DTO> & Record<string, any> }> {
		let item = await this.repository.create();
		return this.export(item, preset, env)
	};
}
