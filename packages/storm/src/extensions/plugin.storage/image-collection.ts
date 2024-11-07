import type {CropMode, ImgInfo, ImgInterface} from "@nano-forge/util.oss";
import type {EntityRepositoryInterface} from "../../core";
import {Collection} from "./collection";
import type {CollectionOptions, ITmpFile} from "./helper/types";
import type {Storage} from "./storage";

export type ImageAttachmentMetadata = ImgInfo

/**
 * Collection for image attachments
 */
export class ImageCollection extends Collection<ImageAttachmentMetadata> {

	static imgFactory: (file:string)=>ImgInterface;
	private readonly defaultCropMode: CropMode;
	private readonly faceDetect: boolean;

	constructor(
		name: string,
		groupDefinition: {
			storage: Storage,
			group: string,
			entityRepository: EntityRepositoryInterface,
		},
		rules: CollectionOptions,
		options: {
			cropMode?: CropMode,
			faceDetect?:boolean
		}
	) {
		super(name, groupDefinition, rules);
		if (this.rules.ext === undefined) this.rules.ext = [".png", ".webp", ".gif", ".jpg", ".jpeg", ".tiff"];
		this.defaultCropMode = options.cropMode ?? "centre";
		this.faceDetect = options.faceDetect ?? false;
	}

	protected async prepareFile(file: ITmpFile): Promise<{ file: ITmpFile; metadata: ImageAttachmentMetadata }> {
		let metadata = await ImageCollection.imgFactory(file.file).getInfo(this.faceDetect)
		metadata.crop = this.defaultCropMode
		return {file, metadata};
	}
}
