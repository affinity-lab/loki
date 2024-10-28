import sharp from "sharp";
import type {ImgFocus} from "./types";


export type ImgParams = {
	width: number,
	height: number,
	density: number,
	focus: ImgFocus
}
/**
 * Parses the given image parameters string and returns an ImgParams object if the string matches the expected format.
 *
 * @param {string} img - the image parameter string to parse
 * @return {ImgParams | undefined} the parsed ImgParams object, or undefined if the string does not match the expected format
 */
export function parseImgParams(img: string): ImgParams | undefined {
	const regex = /^(?:(\d+)x(\d+)|(\d+)x|x(\d+))~?(\d)?x?\.?(centre|center|top|left|bottom|right|entropy|attention|box)?$/;
	const match = regex.exec(img);
	if (match) {
		const width: number = parseInt(match[1] || match[3] || "0");
		const height: number = parseInt(match[2] || match[4] || "0");
		const density: number = parseInt(match[5] || "1");
		let focus: ImgFocus = (match[6] || 'entropy') as ImgFocus;
		if (width === 0 && height === 0) return;
		return {width, height, density, focus};
	}
}

/**
 * Generate a thumbnail image based on the input source image with specified parameters.
 *
 * @param {string} source - The path to the source image.
 * @param {string} output - The path where the thumbnail image will be saved.
 * @param {ImgParams} imgParams - Object containing parameters for generating the thumbnail.
 * @return {Promise<void>} A Promise that resolves when the thumbnail image is successfully created.
 */
export async function createThumbnail(source: string, output: string, imgParams: ImgParams) {
	sharp.cache({files: 0});
	let meta = await sharp(source).metadata();
	const oWidth: number = meta.width!;
	const oHeight: number = meta.height!;
	const oAspect = oWidth / oHeight;

	const focus = meta.pages! > 1 ? "centre" : imgParams.focus;

	let width = imgParams.width === 0 ? imgParams.height * oAspect : imgParams.width;
	let height = imgParams.height === 0 ? imgParams.width / oAspect : imgParams.height;

	if (focus as string === "box") {
		const aspect = width / height;
		if (oAspect > aspect) {
			height = Math.floor(width / oAspect);
		} else {
			width = Math.floor(height * oAspect);
		}

		await sharp(source, {animated: true})
			.resize(width * imgParams.density, height * imgParams.density, {
				kernel: sharp.kernel.lanczos3,
				fit: "contain",
				withoutEnlargement: true
			})
			.toFile(output);
	} else {
		if (oWidth < width) {
			height = Math.floor(height * oWidth / width);
			width = oWidth;
		}
		if (oHeight < height) {
			width = Math.floor(width * oHeight / height);
			height = oHeight;
		}

		await sharp(source, {animated: true})
			.resize(width * imgParams.density, height * imgParams.density, {
				kernel: sharp.kernel.lanczos3,
				fit: "cover",
				position: focus,
				withoutEnlargement: true
			})
			.toFile(output);
	}
}