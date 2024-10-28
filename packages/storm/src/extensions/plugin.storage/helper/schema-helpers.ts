import {int, json, mysqlTable, serial, unique, varchar} from "drizzle-orm/mysql-core";

export let stormStorageSchemaHelpers = {
	storageSchemaFactory: function (name: string = "_storage") {
		return mysqlTable(name, {
				id: serial("id").primaryKey(),
				name: varchar("name", {length: 255}).notNull(),
				itemId: int("itemId").notNull(),
				data: json("data").default("{}")
			},
			(t: any) => ({
				unq: unique().on(t.name, t.itemId)
			})
		);
	}
}