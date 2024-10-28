import {MetadataLibrary, type State} from "@laborci/util";
import {eq, Placeholder, sql} from "drizzle-orm";
import {int, MySqlColumn} from "drizzle-orm/mysql-core";
import type {MySqlSelectWithout} from "drizzle-orm/mysql-core/query-builders/select.types";
import {type EntityRepositoryInterface} from "./entity/entity-repository-interface";
import {ViewEntity} from "./entity/view-entity";
import {type ViewEntityRepositoryInterface} from "./entity/view-entity-repository-interface";

let metal = new MetadataLibrary();

/**
 * Creates an SQL expression for checking if a column's value is in a list of IDs.
 * @param col - The column to check.
 * @param ids - The list of IDs.
 * @returns An SQL expression.
 */
export function In(col: MySqlColumn, ids: string) {
	return sql`${col}
   in (
   ${sql.placeholder(ids)}
   )`;
}

/**
 * Executes a MySQL SELECT statement asynchronously, applying multiple processing functions to the result.
 * @template ARGS - Type of the arguments accepted by the MySQL SELECT statement.
 * @template RES - Type of the result returned by the processing functions.
 * @param stmt - The MySQL SELECT statement object.
 * @param processes - Processing functions to be applied to the result sequentially.
 * @returns A promise that resolves with a function accepting arguments of type ARGS and returning a result of type RES.
 */
export function stmt<RES>(stmt: MySqlSelectWithout<any, any, any>, ...processes: ((res: any) => any)[]): () => Promise<RES>;
export function stmt<ARGS, RES>(stmt: MySqlSelectWithout<any, any, any>, ...processes: ((res: any) => any)[]): (args: ARGS) => Promise<RES>;
export function stmt<ARGS, RES>(stmt: MySqlSelectWithout<any, any, any>, ...processes: ((res: any) => any)[]): (args: ARGS) => Promise<RES> {
	let prepared = stmt.prepare();
	return async (args: ARGS) => {
		let result = await prepared.execute(args);
		for (const process of processes) result = await process(result);
		return result as RES;
	};
}
/**
 * Set of utility functions to generate SQL LIKE query patterns for string matching.
 */
export const likeString = {
	/**
	 * Generates a SQL LIKE query pattern to match strings that start with the specified search string.
	 * @param search - The string to match within.
	 * @returns A SQL LIKE query pattern.
	 */
	startsWith: (search: string) => search + "%",
	/**
	 * Generates a SQL LIKE query pattern to match strings that end with the specified search string.
	 * @param search - The string to match within.
	 * @returns A SQL LIKE query pattern.
	 */
	endWith: (search: string) => "%" + search,
	/**
	 * Generates a SQL LIKE query pattern to match strings that contain the specified search string.
	 * @param search - The string to match within.
	 * @returns A SQL LIKE query pattern.
	 */
	contains: (search: string) => "%" + search + "%",
};

/**
 * Retrieves a single item from a repository by a specified field.
 * @param repo
 * @param fieldName
 * @returns A function that retrieves the previous DTO of an item.
 */
export function getByFactory<T extends string | number, R extends ViewEntity>(repo: ViewEntityRepositoryInterface, fieldName: Extract<keyof R, T>): (search: T) => Promise<R | undefined> {
	let field = repo.schema[fieldName];
	let stmt = repo.db.select().from(repo.schema).where(eq(field, sql.placeholder("search"))).limit(1).prepare();
	let fn = async (search: T) => {
		let data = await stmt.execute({search})
		if (data.length === 0) return undefined;
		else return await repo.instantiate.one(data[0]);
	};
	(fn as unknown as { stmt: any }).stmt = stmt;
	return fn;
}

export function getAllByFactory<T extends string | number, R extends ViewEntity>(repo: ViewEntityRepositoryInterface, fieldName: Extract<keyof R, T>): (search: T) => Promise<Array<R>> {
	let field = repo.schema[fieldName];
	let stmt = repo.db.select().from(repo.schema).where(eq(field, sql.placeholder("search"))).prepare();
	let fn = async (search: T) => {
		let data = await stmt.execute({search})
		if (data.length === 0) return [];
		else return await repo.instantiate.all(data);
	};
	(fn as unknown as { stmt: any }).stmt = stmt;
	return fn;
}

/**
 * Retrieves the previous data transfer object (DTO) of an item.
 * Use it in pipeline functions to access the previous DTO of the item.
 * @param state
 * @param repository
 */
export async function prevDto(state: State, repository: EntityRepositoryInterface) {
	if (!state.prevDto) state.prevDto = await repository.getRawDTO(state.item.id);
	return state.prevDto;
}

/**
 * Export decorator. Marks an entity property as exportable.
 */
let EXPORT_KEY = Symbol("EXPORT");
export function Export(t: any, p: string): void { metal.add(EXPORT_KEY, p, t); }
Export.read = (t: any): string[] => metal.get(EXPORT_KEY, t) || []

/**
 * Import decorator. Marks an entity property as importable.
 */
let IMPORT_KEY = Symbol("IMPORT");
export function Import(t: any, p: string): void { metal.add(IMPORT_KEY, p, t); }
Import.read = (t: any): string[] => metal.get(IMPORT_KEY, t) || []


export let stormSchemaHelpers = {
	id: function () {
		return int("id").autoincrement().primaryKey();
	},

	reference: function (name: string, field: () => MySqlColumn, nullable: boolean = false) {
		return nullable
			? int(name).references(field)
			: int(name).notNull().references(field);
	}
}

export let stormSqlHelpers = {
	like: function (col: MySqlColumn, key: string) {
		return sql`LOWER(
      ${col}
      )
      like
      LOWER
      (
      ${likeString.contains(key)}
      )`;
	},

	in: function (col: MySqlColumn, array: Array<any> | Placeholder) {
		return sql`${col}
      in (
      ${array}
      )`;
	},
}