import FastGlob from "fast-glob";
import fs from "fs";
import Path from "path";

/**
 * Generates a function that cleans up image files based on the provided parameters.
 *
 * @param {string} name - the name to be used in the image file
 * @param {number} id - the id to be used in the image file
 * @param {string} file - the file extension to be used in the image file
 * @return {Promise<void>} a Promise that resolves when the image files are successfully deleted
 */
export function imgCleanupFactory(imgPath: string) {
	return async (name: string, id: number, file: string) => {
		let files = await FastGlob.glob(Path.join(imgPath, `${name}.${id.toString(36).padStart(6, "0")}.*.${file}.*`))
		files.map(file => fs.promises.unlink(file));
	}
}

