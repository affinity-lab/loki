import {bytes} from "@nano-forge/util";
import {fse} from "@nano-forge/util.oss";
import * as fs from "fs";
import {minimatch} from "minimatch";
import * as path from "path";
import type {EntityRepositoryInterface, WithIdOptional} from "../../core";
import {Attachment} from "./attachment";
import {CollectionHandler} from "./collection-handler";
import {storageError} from "./helper/error";
import type {CollectionOptions, ITmpFile, Rules} from "./helper/types";
import type {Storage} from "./storage";

export abstract class Collection<METADATA extends Record<string, any> = {}> {


	readonly entityRepository: EntityRepositoryInterface
	readonly group: string
	private readonly _storage: Storage;

	/**
	 * The storage of the collection
	 */
	get storage() { return this._storage}

	getPath(entityId: number) {return this.storage.getPath(this.name, entityId);}

	/**
	 * The rules for the collection
	 */
	readonly rules: Rules

	constructor(
		readonly name: string,
		readonly groupDefinition: {
			storage: Storage,
			group: string,
			entityRepository: EntityRepositoryInterface
		},
		rules: CollectionOptions
	) {
		this._storage = groupDefinition.storage;

		this.group = groupDefinition.group;
		this.name = `${this.group}.${this.name}`
		this.entityRepository = groupDefinition.entityRepository
		// if it was a string cast it to array
		if (typeof rules.ext === "string") rules.ext = [rules.ext];
		if (typeof rules.mime === "string") rules.mime = [rules.mime];
		if (typeof rules.limit === "undefined") rules.limit = {}
		if (typeof rules.limit.count === "undefined") rules.limit.count = 1
		if (typeof rules.limit.size === "undefined") rules.limit.size = '1mb'
		rules.limit.size = bytes(rules.limit.size);
		this.rules = rules as Rules;

		if (this.rules.mime !== undefined) {
			if (!Array.isArray(this.rules.ext)) this.rules.ext = [];
			for (const mime of this.rules.mime) {
				for (const ext in fse.mimeType.map) {
					if (minimatch(fse.mimeType.map[ext], mime)) this.rules.ext.push(ext);
				}
			}
			if (rules.ext?.length === 0) rules.ext = undefined;
		}

		this._storage.addCollection(this);
	}


	/**
	 * Get a collection handler
	 * @param entity
	 */
	handler(entity: WithIdOptional<Record<string, any>>): CollectionHandler<METADATA> | undefined { return entity.id ? new CollectionHandler<METADATA>(this, entity) : undefined;}

	protected async updateMetadata(id: number, filename: string, metadata: Partial<METADATA>) { await this._storage.updateMetadata(this.name, id, filename, metadata)}

	protected async prepareFile(file: ITmpFile): Promise<{ file: ITmpFile, metadata: Record<string, any> }> { return {file, metadata: {}};}

	/**
	 * Prepare the file for storage
	 * @param collectionHandler
	 * @param file
	 */
	async prepare(collectionHandler: CollectionHandler<METADATA>, file: ITmpFile) {
		let metadata: Record<string, any>;
		const ext = path.extname(file.filename);
		const filename = path.basename(file.filename);
		const stat = await fs.promises.stat(file.file);
		let id = collectionHandler.id;

		// check if entity exists
		if (await this.entityRepository.get(id) === undefined) throw storageError.ownerNotExists(this.name, id);

		// check limit
		if (collectionHandler.length >= this.rules.limit.count) throw storageError.tooManyFiles(this.name, id, filename, this.rules.limit.count);

		// check extension
		if (this.rules.ext !== undefined && !this.rules.ext.includes(ext)) throw storageError.extensionNotAllowed(this.name, id, filename, this.rules.ext);

		// prepare (modify, replace, whatever) the file
		({file, metadata} = await this.prepareFile(file));

		// check size
		let size = stat.size;
		if (size > this.rules.limit!.size!) throw storageError.fileTooLarge(this.name, id, filename, this.rules.limit!.size!);

		return {file, metadata};
	}

	/**
	 * Hook for when an attachment is removed
	 */
	async onDelete() {}

	/**
	 * Hook for when an attachment is modified
	 */
	async onModify() {}

	/**
	 * Get attachments for an entity
	 * @param id
	 */
	public async get(id: number): Promise<Array<Attachment<METADATA>>> {
		let attachmentObjects = await this._storage.get(this.name, id);
		return attachmentObjects.map(attachmentObject => new Attachment<METADATA>(attachmentObject, this, id))
	}
}

