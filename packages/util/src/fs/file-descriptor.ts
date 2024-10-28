import * as fs from "fs";
import * as path from "path";
import {MaterializeIt} from "../materialize-it";
import {mimeTypeLookup} from "./mimetype-map";

/**
 * @deprecated use fse methods
 * Represents a file descriptor.
 */
export class FileDescriptor {
	public readonly file: string;

	constructor(file: string) {this.file = fs.realpathSync(file);};

	/**
	 * Retrieves the file stats asynchronously.
	 */
	@MaterializeIt get stat(): Promise<fs.Stats | null> { return fs.promises.stat(this.file).catch((): null => null);};

	/**
	 * Retrieves the size of the file asynchronously.
	 */
	get size(): Promise<number> { return this.stat.then((stat: fs.Stats | null): number => stat !== null ? stat.size : 0);};

	/**
	 * Checks if the file exists asynchronously.
	 */
	get exists(): Promise<boolean> {return this.stat.then((stat: fs.Stats | null): boolean => stat !== null);};

	/**
	 * Retrieves the base name of the file.
	 */
	get name(): string {return this.parsedPath.base;};

	/**
	 * Parses the path of the file.
	 */
	@MaterializeIt get parsedPath(): path.ParsedPath {return path.parse(this.file);};

	/**
	 * Retrieves the MIME type of the file.
	 */
	@MaterializeIt get mimeType(): string | false {return mimeTypeLookup(this.file);};

	/**
	 * Checks if the file is an image.
	 */
	@MaterializeIt get isImage(): boolean { return this.mimeType.toString().substring(0, 6) === "image/";};

	/**
	 * Retrieves image metadata and stats if the file is an image.
	 */
	// @MaterializeIt get image(): Promise<{
	// 	meta: sharp.Metadata,
	// 	stats: sharp.Stats
	// } | null> {
	// 	sharp.cache({files: 0});
	// 	if (!this.isImage) {
	// 		return Promise.resolve(null);
	// 	}
	// 	let img: sharp.Sharp = sharp(this.file);
	// 	return Promise.all([img.metadata(), img.stats()])
	// 		.then((res: [sharp.Metadata, sharp.Stats]) => ({meta: res[0], stats: res[1]}));
	// };
}