export type ImgDimension = {
	width: number
	height: number
}

export type ImgRGB = {
	r: number
	g: number
	b: number
}

export type ImgFocus = "centre" | "top" | "left" | "bottom" | "right" | "entropy" | "attention"
export const imgFocusOptions: Array<string> = ["centre", "top", "left", "bottom", "right", "entropy", "attention"]