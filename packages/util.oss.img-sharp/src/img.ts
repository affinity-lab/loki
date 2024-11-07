import type {CropMode, CropParams, ImgInfo, ImgInterface} from "@nano-forge/util.oss";
import sharp from "sharp";

export class Img implements ImgInterface {
	constructor(readonly file: string) {}

	async getInfo(setFace: boolean = false): Promise<ImgInfo> {
		sharp.cache({files: 0});
		let img: sharp.Sharp = sharp(this.file);
		let metadata = await img.metadata();
		let stats = await img.stats();

		return {
			dim: {
				width: metadata.width!,
				height: metadata.height!,
			},
			dominant: stats.dominant,
			isAnimated: metadata.pages ? metadata.pages > 1 : false,
			crop: "centre",
			focus: {
				point: {
					x: Math.ceil(metadata.width! / 2),
					y: Math.ceil(metadata.height! / 2)
				},
				area: {
					x: 0,
					y: 0,
					width: metadata.width!,
					height: metadata.height!
				},
				face: null
			},
		}
	}


	async crop(
		output: string,
		cropParams: CropParams,
		imgInfo: ImgInfo
	) {
		sharp.cache({files: 0});

		const oWidth: number = imgInfo.dim.width;
		const oHeight: number = imgInfo.dim.height;
		const oAspect = oWidth / oHeight;

		if (cropParams.mode === undefined) cropParams.mode = imgInfo.crop;
		if (cropParams.density === undefined) cropParams.density = 1;

		const cropMode: CropMode = imgInfo.isAnimated ? "centre" : cropParams.mode;

		let width = cropParams.width === 0 ? Math.floor(cropParams.height * oAspect * cropParams.density) : cropParams.width * cropParams.density;
		let height = cropParams.height === 0 ? Math.floor(cropParams.width / oAspect * cropParams.density) : cropParams.height * cropParams.density;

		if (cropMode === "box") {
			const aspect = width / height;
			if (oAspect > aspect) height = Math.floor(width / oAspect);
			if (oAspect < aspect) width = Math.floor(height * oAspect);

			await sharp(this.file, {animated: true})
				.resize(width, height, {
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

			await sharp(this.file, {animated: true})
				.resize(width, height, {
					kernel: sharp.kernel.lanczos3,
					fit: "cover",
					position: cropMode,
					withoutEnlargement: true
				})
				.toFile(output);
		}
	}
}

