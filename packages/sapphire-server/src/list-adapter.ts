import {likeString} from "@laborci/storm";
import type {MaybeArray} from "@laborci/util";
import {and, asc, desc, getTableName, or, sql, SQL, type SQLWrapper} from "drizzle-orm";
import {type AnyMySqlSelectQueryBuilder, MySqlColumn, type MySqlJoin, type MySqlSelectWithout, type MySqlTableWithColumns} from "drizzle-orm/mysql-core";
import {type MySql2Database} from "drizzle-orm/mysql2";

type Order = { by: MySqlColumn, reverse: boolean | undefined };
export type Orders = Record<string, Array<Order>>;
export type Search = SQLWrapper | SQL | undefined;
export type BaseSelect<A extends AnyMySqlSelectQueryBuilder = any, B extends boolean = any, C extends keyof A & string = any> = MySqlSelectWithout<A, B, C>;

export class JoinedQuickSearch<T extends MySqlTableWithColumns<any> = any> {
	constructor(readonly table: T, readonly field: MaybeArray<keyof T>, readonly connection: SQL) {
	}
}

export class ListAdapter<SCHEMA extends MySqlTableWithColumns<any> = any> {
	constructor(
		protected schema: SCHEMA,
		protected db: MySql2Database<any>,
		protected quickSearchFields: MaybeArray<MySqlColumn | JoinedQuickSearch> | undefined,
		protected sorting: Orders = {}
	) {
	}

	/**
	 * API method
	 *
	 * @param page
	 * @param pageSize
	 * @param quickSearch
	 * @param order
	 * @param search
	 * @param env
	 */
	public async get(page: number, pageSize: number, quickSearch?: string, order?: string, search?: Record<string, any>, env?: Record<string, any>) {

		let where = await this.where(quickSearch, search, env)
		let select = this.select(where);
		select = this.orderBy(select, order);

		let count = await this.count(where);
		let pageIndex = this.calcPageIndex(page, pageSize, count);
		if (pageSize) select = this.pagination(select, pageIndex, pageSize);

		const res = await select.execute();

		let items = [];
		for (let item of res) items.push({
			data: await this.export(item),
			type: getTableName(this.schema)
		});

		return {items, page: pageIndex, count: count}
	}

	/**
	 * In this method, you can finalize how you want to represent an Item towards the frontend.
	 * @param item
	 * @protected
	 */
	protected export(item: any) { return item;}

	/**
	 * Although you can specify the possible sorting options for your list in the constructor,
	 * you can also implement them here for more complex cases.
	 *
	 * @protected
	 */
	protected get orders(): Orders {return this.sorting}

	/**
	 * The filter method will run for each query, and you can build basic filters into it.
	 * It receives the environmental variables as parameters.
	 *
	 * @param env
	 * @protected
	 */
	protected async filter(env: Record<string, any> | undefined): Promise<Search> {return undefined;}

	/**
	 * This method implements the custom search. If you need a custom search, override this method.
	 * It receives the environmental variables and search parameters as arguments.
	 *
	 * @param search
	 * @param env
	 * @protected
	 */
	protected async search(search: Record<string, any> | undefined, env: Record<string, any> | undefined): Promise<Search> {return undefined;}

	/**
	 * This method implements the quick search. In most cases, you don’t need to override it!
	 * @param search
	 * @protected
	 */
	protected async quickSearch(search?: string): Promise<Search> {
		if (typeof search === "undefined" || search.trim().length === 0) return or()!;
		let likes: Array<SQL> = [];
		for (let col of Array.isArray(this.quickSearchFields) ? this.quickSearchFields : [this.quickSearchFields]) {
			if (col instanceof MySqlColumn) {
				likes.push(sql`LOWER(${col}) like LOWER(${likeString.contains(search)})`);
			} else {
				if (Array.isArray(col!.field)) for (let f of col!.field) likes.push(sql`LOWER(${col!.table[f as string]}) like LOWER(${likeString.contains(search)})`);
				else likes.push(sql`LOWER(${col!.table[col!.field as string]}) like LOWER(${likeString.contains(search)})`);
			}
		}
		return or(...likes)!;
	}


	protected orderBy(base: BaseSelect, name: string | undefined): BaseSelect {
		// THIS FUNCTION CANNOT BE ASYNC !!!!!!!!!!!!!!!!!!!!
		if (!name) name = Object.keys(this.orders)[0];
		if (Object.keys(this.orders).length === 0 || !Object.keys(this.orders).includes(name)) return base;
		let orderSQL: Array<SQL> = [];
		for (let order of this.orders[name]) orderSQL.push(order.reverse ? desc(order.by) : asc(order.by));
		return base.orderBy(...orderSQL);
	}


	private select(where: SQL | undefined, count: boolean = false): MySqlSelectWithout<any, any, any> {
		let selectBuilder = count ? this.db.select({amount: sql<number>`count('*')`}) : this.db.select();
		let select = selectBuilder.from(this.schema);
		let joinedS: MySqlJoin<any, any, any, any>;
		for (let j of this.joinQuickSearch()) joinedS = (joinedS || select).innerJoin(j.table, j.connection);
		return (joinedS || select).where(where);
	}

	private joinQuickSearch() {
		let r: Array<{ table: MySqlTableWithColumns<any>, connection: SQL }> = [];
		if (this.quickSearchFields){
			(Array.isArray(this.quickSearchFields) ? this.quickSearchFields : [this.quickSearchFields])
				.forEach((i: MySqlColumn | JoinedQuickSearch) => {
					if (i instanceof JoinedQuickSearch && !r.includes({table: i.table, connection: i.connection})) {
						r.push({table: i.table, connection: i.connection});
					}
				});
		}
		return r;
	}

	private pagination(base: BaseSelect, pageIndex: number, pageSize: number): BaseSelect {
		return base
			.limit(pageSize)
			.offset(pageIndex * pageSize)
	}

	private async where(quickSearch?: string, search?: Record<string, any>, env?: Record<string, any>): Promise<SQL | undefined> {
		const where: Array<Search> = [
			await this.filter(env),
			await this.search(search, env),
			await this.quickSearch(quickSearch)
		].filter(filters => !!filters);
		return and(...where);
	}

	private calcPageIndex(pageIndex: number, pageSize: number, count: number): number {
		if (pageIndex < 0 || !pageSize) return 0;
		let max = Math.floor(count / pageSize);
		return pageIndex <= max ? pageIndex : max;
	}

	private async count(where: SQL | undefined): Promise<number> { return (await this.select(where, true).execute())[0].amount }

}

