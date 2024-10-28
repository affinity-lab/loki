import fs from "fs";

/**
 * @deprecated use fse.fileExists() instead
 */
export async function fileExists(path: string): Promise<boolean> {
	try {
		await fs.promises.access(path);
		return true;
	} catch (error) {
		return false;
	}
}