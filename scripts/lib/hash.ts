import {createHash} from "crypto";
import * as fs from "node:fs";
import * as path from "node:path";

export function hashFile(filePath: string): string {
	const fileBuffer = fs.readFileSync(filePath).toString();
	const hash = createHash('md5');
	hash.update(fileBuffer);
	return hash.digest('hex');
}

export function hashDirectory(directory: string): string {
	const files = fs.readdirSync(directory);
	const hash = createHash('md5');
	for (const file of files) {
		const fileBuffer = fs.readFileSync(path.resolve(directory, file)).toString();
		hash.update(fileBuffer);
	}
	return hash.digest('hex');
}