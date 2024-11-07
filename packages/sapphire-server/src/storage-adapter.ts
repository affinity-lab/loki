import {Attachment, Collection, type EntityRepositoryInterface, Storage} from "@nano-forge/storm";
import {type TmpFile, type TmpFileCreator} from "@nano-forge/util.oss";

import {getTableName} from "drizzle-orm";
import {type MySqlTableWithColumns} from "drizzle-orm/mysql-core";
import {sapphireError} from "./error";


export class StorageAdapter<SCHEMA extends MySqlTableWithColumns<any>> {
	protected type: string;

	constructor(public schema: SCHEMA,
		protected repository: EntityRepositoryInterface,
		protected storage: Storage,
		readonly tmpFileFactory: TmpFileCreator,
		protected allowedCollections?: string[]
	) {
		this.type = getTableName(this.schema);
	}

	/**
	 * API method
	 *
	 * @param id
	 * @param env
	 */
	public async get(id: number, env: Record<string, any>) {
		let collectionNames = this.getAllowedCollections(env)
		let collections = [];
		for (let key in this.storage.groups) {
			let group = this.storage.groups[key];
			if (group.repository === this.repository) {
				for (let key in group.collections) {
					let collection = group.collections[key];
					if (collectionNames === undefined || collectionNames.includes(collection.name)) {
						let files = await collection.get(id);
						collections.push({
							id,
							collection: collection.name,
							files,
							rules: collection.rules,
						});
					}
				}
			}
		}
		return collections;
	}

	/**
	 * API method
	 *
	 * @param id
	 * @param collectionName
	 * @param files
	 */
	public async upload(id: number, collectionName: string, files: Array<TmpFile>) {
		let item = await this.repository.get(id);
		let collection: Collection<any> | undefined = this.storage.collections[collectionName];
		if (!collection) throw sapphireError.collectionNotExist(collectionName);
		if (files) for (let file of files) await collection.handler(item)?.add(file);
		else throw sapphireError.fileNotProvided();
		return true;
	}

	/**
	 * API method
	 *
	 * @param id
	 * @param collectionName
	 * @param fileName
	 */
	public async delete(id: number, collectionName: string, fileName: string) {
		let file = await this.findFile(id, collectionName, fileName);
		await file.delete();
		return true;
	}

	/**
	 * API method
	 *
	 * @param id
	 * @param collectionName
	 * @param fileName
	 * @param newMetaData
	 * @param newName
	 */
	public async updateFileData(id: number, collectionName: string, fileName: string, newMetaData?: Record<string, any>, newName?: string) {
		let collection: Collection<any> | undefined = this.storage.collections[collectionName];
		if (!collection) throw sapphireError.collectionNotExist(collectionName);
		let file = await this.findFile(id, collectionName, fileName);
		if (newMetaData) {
			Object.keys(newMetaData).forEach(key => file.metadata[key] = newMetaData[key])
			await file.saveMetaData();
		}
		if (newName && newName.trim() !== fileName.trim()) await file.rename(newName);
		return true;
	}

	/**
	 * API method
	 *
	 * @param id
	 * @param collectionName
	 * @param fileName
	 * @param position
	 */
	public async changeFilePosition(id: number, collectionName: string, fileName: string, position: number) {
		let file = await this.findFile(id, collectionName, fileName);
		await file.setPositions(position);
		return true;
	}

	/**
	 * Although you can specify the list of allowed collections in the constructor, you can also implement them here for more complex cases.
	 *
	 * @param env
	 * @protected
	 */
	protected getAllowedCollections(env: Record<string, any>): undefined | string[] { return this.allowedCollections}

	protected async findFile(id: number, collectionName: string, fileName: string): Promise<Attachment<any>> {
		let collection: Collection<any> | undefined = this.storage.collections[collectionName];
		if (!collection) throw sapphireError.collectionNotExist(collectionName);
		let item = await this.repository.get(id);
		let handler = collection.handler(item);
		if (!handler) throw sapphireError.notFound({type: "handler"});
		await handler.load();
		let file = handler.findFile(fileName);
		if (!file) throw sapphireError.notFound({type: "file"});
		return file;
	}
}
