import {int, MySqlColumn, mysqlTable, varchar} from "drizzle-orm/mysql-core";
import {type MySqlIntBuilderInitial} from "drizzle-orm/mysql-core/columns/int";

export let stormTagSchemaHelpers = {
	tagTableFactory: function (name: string, id: () => MySqlIntBuilderInitial<any>) {
		let columns = this.tagCols(id);
		return mysqlTable(name, columns);
	},
	groupTagTableFactory: function (name: string, id: () => MySqlIntBuilderInitial<any>, groupColReference: () => MySqlColumn) {
		let columns = this.groupTagCols(id, groupColReference);
		return mysqlTable(name, columns);
	},
	tagCols: function (id: () => MySqlIntBuilderInitial<any>) {
		return {id: id(), name: varchar("name", {length: 255}).notNull().unique()};
	},
	groupTagCols: function (id: () => MySqlIntBuilderInitial<any>, groupColReference: () => MySqlColumn) {
		return {id: id(), name: varchar("name", {length: 255}).notNull(), groupId: int("groupId").references(groupColReference)};
	}
}