import {Buffer} from "buffer";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import {mimeTypeMap} from "./fs-extended.mime-type-map";
import type {NonEmptyArray} from "./types";

export let fse = {
	isExists: (path: string) => fs.promises.access(path).then(() => true).catch(() => false),
	isFile: (path: string) => fse.stat(path).then(stats => stats.isFile()).catch(() => false),
	isDir: (path: string) => fse.stat(path).then(stats => stats.isDirectory()).catch(() => false),
	isImage: (path: string) => fse.mimeType.lookup(path).startsWith("image/"),
	stat: (path: string) => fs.promises.stat(path),
	fileSize: (file: string) => fse.stat(file).then((stat: fs.Stats | null): number => stat !== null ? stat.size : 0),
	name: {
		findUnique: async (inDir: string, name: string): Promise<string> => {
			const baseName = path.basename(name, path.extname(name));
			const extName = path.extname(name);
			let newName = name;
			let count = 1;
			while (await fse.isExists(path.resolve(inDir, newName))) newName = `${baseName}(${count++})${extName}`;
			return newName;
		},
		sanitize: (name: string) => name
			.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
			.replace(/[^a-zA-Z0-9_.]/g, '-')
			.replace(/(^[-.]+)|([-._]+)$/g, '')
			.replace(/-+/g, '-')
			.replace(/\.[-]/g, '.')
			.replace(/[-.]\./g, '.'),
	},
	path: {
		join: (...args: NonEmptyArray<string>) => path.join(...args).replaceAll("\\", "/"),
		resolve: (...args: NonEmptyArray<string>) => path.resolve(...args).replaceAll("\\", "/"),
	},
	mimeType: {
		map: mimeTypeMap,
		lookup: (filename: string): string => {
			let ext = path.parse(filename).ext;
			return mimeTypeMap[ext] === undefined ? "application/octet-stream" : mimeTypeMap[ext];
		}
	},
	rmEmptyParents: (dir: string) => {
		const parent = path.parse(dir).dir;
		fs.promises.readdir(dir)
			.then(list => list.length === 0 ? fs.promises.rmdir(dir).then(() => fse.rmEmptyParents(parent)) : null)
			.catch(error => console.error(`Error removing directory: ${dir}`, error));
	},
	tmpFileCreatorFactory: (tmp: string) => new TmpFileCreator(tmp)
}

class TmpFile {
	get filename() {return path.basename(this.file);}
	constructor(public file: string) {}
	async release(): Promise<void> {
		if (await fse.isFile(this.file)) fs.promises.unlink(this.file).then(() => fs.promises.rmdir(path.dirname(this.file)));
	}
}

class TmpFileCreator {
	constructor(private path: string) {}
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
