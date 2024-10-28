import type {FileSizeWithUnit, NumericString} from "@laborci/util";


export type AttachmentObject = {
	name: string
	size: number
	id: string
	metadata: Record<string, any>
}

export type AttachmentObjects = Array<AttachmentObject>;

export type AttachmentRecord = {
	id: number
	name: string
	itemId: number
	data: string
}

export type ITmpFile = {
	file: string
	filename: string
	release: () => void | Promise<void>
}

export type CollectionOptions = {
	limit?: {
		size?: number | NumericString | FileSizeWithUnit,
		count?: number | NumericString
	}
	mime?: string | Array<string>
	ext?: string | Array<string>
}

export type Rules = {
	limit: {
		size: number
		count: number
	},
	mime: undefined | Array<string>
	ext: undefined | Array<string>
}

export type MetaField = { label?: string } & ({ type: "string" } | { type: "enum", options: Array<string> });
