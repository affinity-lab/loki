import * as fs from 'fs';
import * as path from 'path';

/**
 * @deprecated use fse.rmEmptyParents instead
 * Recursively removes empty directories in the directory structure.
 * Starts from the specified directory and moves upwards,
 * removing empty directories until it encounters a non-empty directory.
 * @param {string} dir - The directory to start removing empty directories from.
 * @returns {Promise<void>} A Promise that resolves when the operation completes.
 */
export async function removeEmptyParentDirectories(dir: string): Promise<void> {
	try {
		const parent = path.parse(dir).dir;
		const list = await fs.promises.readdir(dir);
		if (list.length === 0) {
			await fs.promises.rmdir(dir);
			await removeEmptyParentDirectories(parent);
		}
	} catch (error) {
		console.error(`Error removing directory: ${dir}`, error);
	}
}
