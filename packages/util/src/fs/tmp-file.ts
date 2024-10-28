import {Buffer} from "buffer";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import {fileExists} from "./file-exists";

export class TmpFile {
	get filename() {return path.basename(this.file);}
	constructor(public file: string) {}
	async release(): Promise<void> {
		if (await fileExists(this.file)) await fs.promises.unlink(this.file).then(() => fs.promises.rmdir(path.dirname(this.file)));
	}
}

/**
 * @deprecated use fs.tmpFileCreatorFactory instead
 * Factory class for creating temporary files.
 */
export class TmpFileFactory {
	constructor(private path: string) {
		// new FinalizationRegistry((del) => {console.log("DELETED", del)})
	}

	get targetDir() {
		let targetDir = path.join(this.path, crypto.randomUUID());
		return fs.promises.mkdir(targetDir).then(() => targetDir);
	}
	async createFromFile(file: File, removeOriginal: boolean = true) {
		return this.createFromBuffer(file.name, Buffer.from(await file.arrayBuffer()))
	}
	async createFromBuffer(filename: string, buffer: Buffer) {
		let target = path.join(await this.targetDir, path.basename(filename))
		await fs.promises.writeFile(target, buffer as unknown as Uint8Array); // TODO this is a "bit" forced
		return new TmpFile(target);
	}
	async createFromFilePath(file: string, removeOriginal: boolean = true) {
		let target = path.join(await this.targetDir, path.basename(file))
		if (removeOriginal) await fs.promises.rename(file, target)
		else await fs.promises.copyFile(file, target)
		return new TmpFile(target);
	}
}

