import {type ExcludeFunctions, MaterializeIt} from "@laborci/util";
import {Import} from "../helper";
import {type EntityRepositoryInterface} from "./entity-repository-interface";
import {ViewEntity} from "./view-entity";


/**
 * Class representing a storm entity.
 */
export abstract class Entity extends ViewEntity {

	static repository: EntityRepositoryInterface;
	get $repository() { return (this.constructor as typeof Entity).repository; }

	@MaterializeIt
	private static get importFields(): Array<string> | undefined { return Import.read(this.constructor) }

	/**
	 * Imports data into the entity.
	 * @param importData record of the properties to copy onto the entity.
	 * @param onlyDecoratedProperties the properties doesn't have to be decorated if this is false (default true)
	 */
	$import<DATA extends { [P in keyof ExcludeFunctions<this>]: ExcludeFunctions<this>[P] }>(importData: DATA, onlyDecoratedProperties = true) {
		let importFields = Import.read(this.constructor);
		// @ts-ignore
		// this[key] is actually a key, type just forgot how to type if you can fix it pls do :)
		for (const key in importData) if (importFields?.includes(key) || (!onlyDecoratedProperties)) this[key] = importData[key];
		return this;
	}

	/**
	 * Saves the entity to the database.
	 * @param saveData: properties of Entity
	 * @param onlyDecoratedProperties sets if @Import decorator is required or not for the properties you save this way, false by default
	 */
	$save<DATA extends { [P in keyof ExcludeFunctions<this>]: ExcludeFunctions<this>[P] }>(saveData?: DATA, onlyDecoratedProperties = false) {return (saveData ? this.$import(saveData, onlyDecoratedProperties) : this).$repository.save(this);}

	/**
	 * Deletes the entity from the database.
	 */
	$delete() { return this.$repository.delete(this);}

	/**
	 * Overwrites the entity with the provided data, without validation.
	 * @param data
	 */
	$overwrite<KEY extends keyof this>(data: Record<KEY, typeof this[KEY]>) { return this.$repository.overwrite(this, data);}
}