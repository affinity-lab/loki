import fs from "fs";
import path from "path";
import {type Collection} from "./collection";
import {mimeTypeMap} from "@affinity-lab/loki.util";
import type {AttachmentObject} from "./helper/types";

export class Attachment<METADATA extends Record<string, any>> implements AttachmentObject {

	#collection: Collection<METADATA>;
	#entityId: number;
	#name: string;
	#id: string;
	#size: number;
	#metadata: METADATA;
	/**
	 * The metadata of the attachment
	 */
	public metadata: METADATA;
	/**
	 * The file size of the attachment
	 */
	get size(): number {return this.#size;}
	/**
	 * The id of the attachment
	 */
	get id(): string {return this.#id;}
	/**
	 * The filename of the attachment
	 */
	get name(): string {return this.#name;}
	/**
	 * The collection of the attachment
	 */
	get collection(): Collection<METADATA> {return this.#collection;}
	/**
	 * The entity id of the attachment
	 */
	get entityId(): number {return this.#entityId;}

	/**
	 * returns the path to the attachment
	 * */
	get path() {return this.collection.getPath(this.#entityId);}

	async base64() {
		let filePath = path.join(this.path, this.name);
		let buffer = await fs.promises.readFile(filePath);
		return buffer.toString('base64');
	}

	async dataUrl(): Promise<string> {
		let filePath = path.join(this.path, this.name);
		let buffer = await fs.promises.readFile(filePath);
		return "data:" + mimeTypeMap[path.extname(this.name)] + ';base64,' + buffer.toString('base64');
	}

	constructor(attachmentObject: AttachmentObject, collection: Collection<METADATA>, entityId: number) {
		this.#entityId = entityId;
		this.#collection = collection;
		this.#name = attachmentObject.name;
		this.#id = attachmentObject.id;
		this.#size = attachmentObject.size;
		this.#metadata = attachmentObject.metadata as METADATA;
		this.metadata = new Proxy<METADATA>(this.#metadata, {
			get: (target, prop) => target[prop.toString()],
			set: (target, prop, value) => {
				let p = prop.toString() as keyof METADATA;
				if (collection.writableMetaFields.hasOwnProperty(p)) {
					target[p] = value;
					return true;
				}
				return false;
			}
		})
	}

	toJSON() {
		return {
			metadata: this.metadata,
			name: this.name,
			id: this.id,
			size: this.#size,
		}
	}


	/**
	 * Save the metadata of the attachment
	 */
	async saveMetaData() {
		await this.collection.storage.updateMetadata(this.collection.name, this.entityId, this.name, this.#metadata)
	}

	/**
	 * Set the position of the attachment
	 * @param position
	 */
	async setPositions(position: number) {
		await this.collection.storage.setPosition(this.collection.name, this.entityId, this.name, position);
	}

	/**
	 * Delete the attachment
	 */
	async delete() {
		await this.collection.storage.delete(this.collection.name, this.entityId, this.name)
	}

	/**
	 * Rename the attachment
	 * @param name
	 */
	async rename(name: string) {
		await this.collection.storage.rename(this.collection.name, this.entityId, this.name, name)
	}
}

