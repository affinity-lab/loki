import {minimatch} from "minimatch";
import type {WithIdOptional} from "../../core";
import type {Attachment} from "./attachment";
import {Collection} from "./collection";
import type {ITmpFile} from "./helper/types";
import type {Storage} from "./storage";

export class CollectionHandler<METADATA extends Record<string, any>> extends Array<Attachment<METADATA>> {
	readonly #collection: Collection<METADATA>
	readonly #entity: WithIdOptional<Record<string, any>>

	protected loaded = false;

	/**
	 * Get the entity owning the collection
	 */
	get entity() {return this.#entity}
	/**
	 * Get the id of the entity owning the collection
	 */
	get id(): number {return this.#entity.id!}
	/**
	 * Get the collection
	 */
	get collection(): Collection<METADATA> {return this.#collection}
	/**
	 * Get the storage of the collection
	 */
	get storage(): Storage {return this.#collection.storage}

	constructor(collection: Collection<METADATA>, entity: WithIdOptional<Record<string, any>>) {
		super();
		this.#collection = collection;
		this.#entity = entity;
	}

	push(...args: any[]): never { throw Error(`can not push into collection handler ${this.collection.name}`);}
	unshift(...args: any[]): never { throw Error(`can not unshift collection handler ${this.collection.name}`);}
	pop(): never { throw Error(`can not pop from collection handler ${this.collection.name}`);}
	shift(): never { throw Error(`can not shift from collection handler ${this.collection.name}`);}

	/**
	 * Load the collection
	 */
	public async load(): Promise<this> {
		// todo: make proper update instead of this
		this.loaded = true;
		this.length = 0;
		super.push(...(await this.collection.get(this.entity.id!)));
		return this;
	}

	/**
	 * Add a file to the collection
	 * @param file
	 */
	async add(file: ITmpFile) {
		await this.load();
		const prepared = await this.collection.prepare(this, file);
		await this.collection.storage.add(
			this.collection.name,
			this.entity.id!,
			prepared.file,
			prepared.metadata
		);
		await prepared.file.release();
		await this.load();
	}

	toJSON(): {
		collection: string, id: number, files: Array<{
			metadata: Record<string, any>,
			name: string,
			id: string,
			size: number,
		}> | null,
		rules: Record<string, any>
	} {
		return {
			collection: this.collection.name,
			rules: this.collection.rules,
			id: this.id,
			files: this.loaded ? [...this] : null
		}
	}

	/**
	 * Get the first file in the collection
	 */
	first(): Attachment<METADATA> | undefined {return this.at(0);}

	/**
	 * Get the last file in the collection
	 */
	last(): Attachment<METADATA> | undefined {return this.at(-1)}

	/**
	 * Get a file by name
	 * @param filename
	 */
	findFile(filename: string): Attachment<METADATA> | undefined { return this.find(obj => filename === obj.name)}

	/**
	 * Get files by a glob pattern
	 * @param glob
	 */
	findFiles(glob: string): Array<Attachment<METADATA>> { return this.filter(obj => minimatch(obj.name, glob))}
}