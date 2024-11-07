import {MaterializeIt, type MaybeNull, omitFieldsIP, pickFieldsIP} from "@nano-forge/util";
import {entityError} from "../error";
import {Export} from "../helper";
import {type ViewEntityRepositoryInterface} from "./view-entity-repository-interface";


/**
 * Class representing a storm view entity.
 */
export abstract class ViewEntity {

	static repository: ViewEntityRepositoryInterface;
	get $repository() { return (this.constructor as typeof ViewEntity).repository; }

	@Export id: MaybeNull<number> = null;

	get $id(): number {
		if (this.id) return this.id;
		throw entityError.itemNotExists()
	}

	constructor() {}

	@MaterializeIt
	private static get exportFields(): Array<string> | undefined { return Export.read(this.constructor);}

	/**
	 * Exports the entity to a plain object for exporting.
	 * @returns A plain object representation of the entity.
	 */
	$export() {
		const e: Record<string, any> = {}
		let a = Export.read(this.constructor);


		if (a) for (const key of a) {
			e[key] = (
				typeof this[key as keyof this] === 'object' &&
				this[key as keyof this] !== null &&
				typeof (this[key as keyof this] as { toJSON: () => any }).toJSON === "function"
			)
				? (this[key as keyof this] as { toJSON: () => any }).toJSON()
				: this[key as keyof this];
		}
		return e
	}

	/**
	 * Picks specified fields from export.
	 * @param fields
	 */
	$pick(...fields: string[]) {
		let res = this.$export();
		pickFieldsIP(res, ...fields);
		return res;
	}

	/**
	 * Omits specified fields from export.
	 * @param fields
	 */
	$omit(...fields: string[]) {
		let res = this.$export();
		omitFieldsIP(res, ...fields);
		return res;
	}

	/**
	 * Returns a JSON representation of the entity.
	 * @returns A JSON representation of the entity.
	 */
	toJSON() { return this.$export(); }

	/**
	 * Returns a string representation of the entity.
	 * @returns A string representation of the entity.
	 */
	toString() { return `${this.constructor.name}(${this.id})`; }
}