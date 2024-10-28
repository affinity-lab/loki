import Path from "path";
import {fileExists} from "./file-exists";

/**
 * @deprecated use fse.name.findUnique() instead
 * Generates a unique filename by appending a numerical suffix to the filename if it already exists in the specified directory.
 *
 * @param {string} inDir - The directory path where the filename should be unique.
 * @param {string} filename - The original filename.
 * @returns {Promise<string>} A Promise that resolves to a unique filename that does not exist in the specified directory.
 */
export async function getUniqueFilename(inDir: string, filename: string): Promise<string> {
	const baseName = Path.basename(filename, Path.extname(filename));
	const extName = Path.extname(filename);
	let newName = filename;
	let count = 1;
	while (await fileExists(Path.resolve(inDir, newName))) newName = `${baseName}(${count++})${extName}`;
	return newName;
}

