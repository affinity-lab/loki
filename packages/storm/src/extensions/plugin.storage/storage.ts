import {fileExists, firstOrUndefined, getUniqueFilename, MaterializeIt, removeEmptyParentDirectories, sanitizeFilename, type Cache, type State} from "@affinity-lab/loki.util";
import {and, eq, sql} from "drizzle-orm";
import {MySqlTable} from "drizzle-orm/mysql-core";
import type {MySql2Database} from "drizzle-orm/mysql2";
import fs from "fs";
import Path from "path";
import {type EntityRepositoryInterface, stmt} from "../../core";
import {Collection} from "./collection";
import {storageError} from "./helper/error";
import type {AttachmentObjects, AttachmentRecord, ITmpFile} from "./helper/types";

export type GroupDefinition = { storage: Storage, group: string, entityRepository: EntityRepositoryInterface };
type Collections = Record<string, Collection>

export class Storage {
	constructor(
		readonly path: string,
		readonly db: MySql2Database<any>,
		readonly schema: MySqlTable,
		readonly cache?: Cache,
		readonly cleanup?: (name: string, id: number, file: string) => Promise<void>
	) {

	}

	collections: Collections = {};
	groups: Record<string, {collections: Collections, repository: EntityRepositoryInterface}> = {};

	/**
	 * Add a collection to the storage
	 * @param collection
	 */
	addCollection(collection: any) {
		if (this.collections[collection.name] !== undefined) throw new Error(`collection name must be unique! ${collection.name}`);
		this.collections[collection.name] = collection;
		if(this.groups[collection.group] === undefined) this.groups[collection.group] = {repository: collection.entityRepository, collections: {}};
		this.groups[collection.group].collections[collection.name] = collection;
	}

	/**
	 * Get a collection from the storage
	 * @param name
	 * @param entityRepository
	 */
	getGroupDefinition(name: string, entityRepository: EntityRepositoryInterface): GroupDefinition {
		return {
			storage: this,
			group: name,
			entityRepository
		}
	}

	@MaterializeIt
	private get stmt_get() {
		return stmt<{ name: string, id: number }, AttachmentRecord | undefined>(
			this.db.select().from(this.schema).where(and(
				sql`name = ${sql.placeholder("name")}`,
				sql`itemId = ${sql.placeholder("id")}`
			)).limit(1),
			firstOrUndefined
		)
	}

	@MaterializeIt
	private get stmt_all() {
		return stmt<{ name: string, ids: Array<number> }, Array<AttachmentRecord>>(
			this.db.select().from(this.schema).where(and(
				sql`itemId IN (${sql.placeholder("ids")})`,
				sql`name = ${sql.placeholder("name")}`
			))
		)
	}

	@MaterializeIt
	private get stmt_del() {
		return stmt<{ name: string, id: number }, AttachmentRecord>(
			this.db.delete(this.schema).where(and(
				sql`itemId = (${sql.placeholder("id")})`,
				sql`name = ${sql.placeholder("name")}`
			))
		)
	}

	public getPath(name: string, id: number) { return Path.resolve(this.path, name, id.toString(36).padStart(6, "0").match(/.{1,2}/g)!.join("/"));}

	protected getCacheKey(name: string, id: number): string {return `${name}-${id}`;}

	/**
	 * Get all attachments for a given name and id
	 * @param name
	 * @param id
	 * @param res
	 */
	async get(name: string, id: number, res: { found?: "db" | "cache" | false } = {}): Promise<AttachmentObjects> {
		let record: AttachmentRecord | undefined = await this.cache?.get(this.getCacheKey(name, id));
		if (record) {
			res.found = "cache"
			return JSON.parse(record.data);
		}
		record = await this.stmt_get({name, id});
		if (record) {
			res.found = "db"
			this.cache?.set({key: this.getCacheKey(name, id), value: record});
			return JSON.parse(record.data);
		}
		return []
	}

	protected async getIndexOfAttachments(name: string, id: number, filename: string, fail: boolean = false) {
		const attachments = await this.get(name, id);
		const idx = attachments.findIndex(a => a.name === filename);
		if (idx === -1 && fail) throw storageError.attachedFileNotFound(name, id, filename);
		return {attachments, index: idx};
	}

	/**
	 * Delete all attachments for a given id
	 * @param repository
	 * @param id
	 */
	async destroy(repository: EntityRepositoryInterface, id: number) {
		for (const collectionsKey in this.collections) {
			await this.destroyFiles(collectionsKey, id);
		}
	}

	protected async destroyFiles(name: string, id: number) {
		this.cache?.del(this.getCacheKey(name, id));
		await this.stmt_del({name, id});
		const path = this.getPath(name, id);
		if (await fileExists(path)) {
			const files = await fs.promises.readdir(path);
			files.map(async (file) => {
				await fs.promises.unlink(Path.join(path, file))
				if (this.cleanup !== undefined) await this.cleanup(name, id, file);
			});
			await removeEmptyParentDirectories(path);
		}
	}

	protected async updateRecord(name: string, id: number, attachments: AttachmentObjects) {
		this.cache?.del(this.getCacheKey(name, id));
		await this.db.update(this.schema)
			.set({data: JSON.stringify(attachments)})
			.where(
				and(
					eq(sql`itemId`, sql.placeholder("id")),
					eq(sql`name`, sql.placeholder("name"))
				)
			)
			.execute({name, id});
	}

	/**
	 * Add an attachment to the storage
	 * @param name
	 * @param id
	 * @param file
	 * @param metadata
	 */
	async add(name: string, id: number, file: ITmpFile, metadata: Record<string, any>) {
		let path = this.getPath(name, id);
		let filename = Path.basename(file.filename);
		filename = sanitizeFilename(filename);
		filename = await getUniqueFilename(path, filename);
		await fs.promises.mkdir(path, {recursive: true});
		await fs.promises.copyFile(file.file, Path.join(path, filename));
		let res: { found?: "db" | "cache" | false } = {found: false};
		const attachments: AttachmentObjects = await this.get(name, id, res);
		attachments.push({
			name: filename,
			size: (await fs.promises.stat(file.file)).size,
			id: crypto.randomUUID(),
			metadata
		});
		if (res.found === false) {
			await this.db.insert(this.schema).values({name, itemId: id, data: JSON.stringify(attachments)}).execute();
		} else {
			await this.db.update(this.schema).set({data: JSON.stringify(attachments)}).where(and(
				sql`name = ${sql.placeholder("name")}`,
				sql`itemId = ${sql.placeholder("id")}`
			)).execute({name, id});
			this.cache?.del(this.getCacheKey(name, id));
		}
		await file.release();
	}

	/**
	 * Delete an attachment from the storage
	 * @param name
	 * @param id
	 * @param filename
	 */
	async delete(name: string, id: number, filename: string) {
		let {attachments, index} = await this.getIndexOfAttachments(name, id, filename, true);
		attachments.splice(index, 1);
		await this.updateRecord(name, id, attachments);
		const path = this.getPath(name, id);
		await fs.promises.unlink(Path.resolve(path, filename));
		await removeEmptyParentDirectories(path);
	}

	/**
	 * Set the position of an attachment
	 * @param name
	 * @param id
	 * @param filename
	 * @param position
	 */
	async setPosition(name: string, id: number, filename: string, position: number) {
		const attachments = await this.get(name, id);
		const idx = attachments.findIndex(a => a.name === filename);
		if (idx === -1) throw storageError.attachedFileNotFound(name, id, filename);
		if (idx === position) return;
		attachments.splice(position, 0, ...attachments.splice(idx, 1));
		await this.updateRecord(name, id, attachments);
	}

	/**
	 * Update the metadata of an attachment
	 * @param name
	 * @param id
	 * @param filename
	 * @param metadata
	 */
	async updateMetadata(name: string, id: number, filename: string, metadata: Record<string, any>) {
		const attachments = await this.get(name, id);
		const idx = attachments.findIndex(a => a.name === filename);
		if (idx === -1) throw storageError.attachedFileNotFound(name, id, filename);
		attachments[idx].metadata = {...attachments[idx].metadata, ...metadata};
		await this.updateRecord(name, id, attachments);
	}

	/**
	 * Rename an attachment
	 * @param name
	 * @param id
	 * @param filename
	 * @param newName
	 */
	async rename(name: string, id: number, filename: string, newName: string) {
		const attachments = await this.get(name, id);
		const idx = attachments.findIndex(a => a.name === filename);
		if (idx === -1) throw storageError.attachedFileNotFound(name, id, filename);
		let path = this.getPath(name, id);
		newName = sanitizeFilename(newName);
		newName = await getUniqueFilename(path, newName);
		attachments[idx].name = newName;
		await fs.promises.rename(Path.join(path, filename), Path.join(path, newName));
		await this.updateRecord(name, id, attachments);
	}

	plugin() {
		return (repository: EntityRepositoryInterface) => {
			repository.pipelines.delete.blocks
				.finalize.prepend(async (state: State<{ item: { id: number } }>) => this.destroy(repository, state.item.id)
			)
		}
	}
}