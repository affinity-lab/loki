export type Dimension = {
	width: number
	height: number
}

export type RGB = {
	r: number
	g: number
	b: number
}

export type CropMode = "centre" | "top" | "left" | "bottom" | "right" | "entropy" | "attention" | "manual" | "face" | "box"

export type Point = {
	x: number,
	y: number
}

export type Rect = Point & Dimension

export type ImgInfo = {
	dim: Dimension
	dominant: RGB
	isAnimated: boolean,
	crop: CropMode
	focus: {
		point: Point
		area: Rect
		face: null | Rect
	}
}

export type CropParams = {
	width: number,
	height: number,
	density: undefined | number,
	mode: undefined | CropMode
}

export interface ImgInterface {
	readonly file: string;
	getInfo(setFace: boolean): Promise<ImgInfo>;
	crop(
		output: string,
		cropParams: CropParams,
		imgInfo: ImgInfo
	): Promise<void>;
}