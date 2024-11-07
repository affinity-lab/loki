import type {MaybeNull} from "@nano-forge/util";
import type {InferSelectModel} from "drizzle-orm";
import type {MySqlTable, MySqlView} from "drizzle-orm/mysql-core";


export type WithIdOptional<TYPE = {}> = { id: MaybeNull<number> } & TYPE;
export type WithId<TYPE = {}> = { id: number } & TYPE;
export type WithIds<TYPE = {}> = { ids: Array<number> } & TYPE;

/**
 * The data transfer object type.
 * @template SCHEMA - The type of the database schema representing the entity's view.
 */
export type Dto<SCHEMA extends MySqlTable> = WithIdOptional<InferSelectModel<SCHEMA>>;
export type ViewDto<SCHEMA extends MySqlTable | MySqlView<any, any, any>> = WithIdOptional<SCHEMA extends MySqlTable ? InferSelectModel<SCHEMA>: MySqlView<any, any, any>>;

/**
 * The fields of an entity that can be used.
 * @template SCHEMA - The type of the database schema representing the entity's view.
 */
export type EntityFields<SCHEMA extends MySqlTable> = Partial<WithIdOptional<Omit<InferSelectModel<SCHEMA>, "id">>>;

