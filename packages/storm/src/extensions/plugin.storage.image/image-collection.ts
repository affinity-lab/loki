import {FileDescriptor} from "@affinity-lab/loki.util";
import type {EntityRepositoryInterface} from "../../core";
import {Collection} from "../storage/collection";
import type {CollectionOptions, ITmpFile, MetaField} from "../storage/helper/types";
import type {Storage} from "../storage/storage";
import {type ImgFocus, imgFocusOptions, type ImgRGB} from "./types";

export type ImageAttachmentMetadata = {
	title?: string
	focus: ImgFocus
	readonly width?: number
	readonly height?: number
	readonly color?: ImgRGB
	readonly animated: boolean
}

/**
 * Collection for image attachments
 */
export class ImageCollection extends Collection<ImageAttachmentMetadata> {
	public readonly writableMetaFields: Record<string, MetaField> = {
		title: {type: "string"},
		focus: {type: "enum", options: imgFocusOptions}
	}
	constructor(
		name: string,
		groupDefinition: {
			storage: Storage,
			group: string,
			entityRepository: EntityRepositoryInterface,
		},
		rules: CollectionOptions,
		private defaultFocus: ImgFocus = "attention"
	) {
		super(name, groupDefinition, rules);
		if (this.rules.ext === undefined) this.rules.ext = [".png", ".webp", ".gif", ".jpg", ".jpeg", ".tiff"];
	}

	protected async prepareFile(file: ITmpFile): Promise<{ file: ITmpFile; metadata: ImageAttachmentMetadata }> {
		const descriptor = new FileDescriptor(file.file);
		let img = await descriptor.image;

		return {
			file, metadata: {
				width: img?.meta.width,
				height: img?.meta.height,
				color: img?.stats.dominant,
				animated: (img?.meta.pages) ? img.meta.pages > 1 : false,
				focus: this.defaultFocus,
			}
		};
	}
}
