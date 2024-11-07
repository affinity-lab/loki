import type {Dto} from "@nano-forge/storm";
import {type MaybeUnset} from "@nano-forge/util";
import {Cmd} from "@nano-forge/comet";
import {sapphireError} from "./error";
import type {ItemAdapter} from "./item-adapter";
import type {ListAdapter} from "./list-adapter";
import type {StorageAdapter} from "./storage-adapter";

export class SapphireApi {
	constructor(
		protected readonly itemAdapter?: ItemAdapter<any, any> | undefined,
		protected readonly listAdapter?: ListAdapter,
		protected readonly storageAdapter?: StorageAdapter<any>,
	) {
	}

	// LIST METHODS

	@Cmd("list.get")
	async list_get(@Cmd.Arg args: { page: number, pageSize: number, quickSearch?: string, order?: string, search?: Record<string, any> }, @Cmd.Env env: any): Promise<{ count: number; page: number; items: any[] }> | never {
		if (!this.listAdapter) throw sapphireError.forbidden();
		return this.listAdapter.get(args.page, args.pageSize, args.quickSearch, args.order, args.search, env);
	}

	// ITEM METHODS

	@Cmd("item.get")
	async item_get(@Cmd.Arg args: { id: string | null, preset?: Record<string, any> }, @Cmd.Env env: any): Promise<{ data: Partial<Dto<any>> | undefined; type: any }> | never {
		if (!this.itemAdapter) throw sapphireError.forbidden();
		return this.itemAdapter.get(args.id ? parseInt(args.id) : null, args.preset, env);
	}

	@Cmd("item.save")
	async item_save(@Cmd.Arg args: { id: number | null, values: Record<string, any> }, @Cmd.Env env: any): Promise<MaybeUnset<number>> | never {
		if (!this.itemAdapter) throw sapphireError.forbidden();
		return this.itemAdapter.save(args.id, args.values, env);
	}

	@Cmd("item.delete")
	async item_delete(@Cmd.Arg args: { id: number }, @Cmd.Env env: any): Promise<boolean> | never {
		if (!this.itemAdapter) throw sapphireError.forbidden();
		return await this.itemAdapter.delete(args.id, env);
	}

	// ATTACHMENT METHODS

	@Cmd("attachment.get")
	async attachment_get(@Cmd.Arg args: { id: string }, @Cmd.Env env: any): Promise<any[]> | never {
		if (!this.storageAdapter) throw sapphireError.forbidden();
		return this.storageAdapter.get(parseInt(args.id), env);
	}

	@Cmd("attachment.upload")
	async attachment_upload(@Cmd.Arg args: { id: string, collectionName: string }, @Cmd.File {files}: { files: Array<File> }, @Cmd.Env env: any): Promise<boolean> | never {
		if (!this.storageAdapter) throw sapphireError.forbidden();
		if (!files) throw "File not found";
		return this.storageAdapter.upload(parseInt(args.id), args.collectionName, await Promise.all(files.map(f => this.storageAdapter!.tmpFileFactory.createFromFile(f))));
	}

	@Cmd("attachment.delete")
	async attachment_delete(@Cmd.Arg args: { id: string, collectionName: string, fileName: string }, @Cmd.Env env: any): Promise<boolean> | never {
		if (!this.storageAdapter) throw sapphireError.forbidden();
		return this.storageAdapter.delete(parseInt(args.id), args.collectionName, args.fileName);
	}

	@Cmd("attachment.update-file-data")
	async attachment_updateFileData(@Cmd.Arg args: { id: string, collectionName: string, fileName: string, newMetaData?: Record<string, any>, newName?: string }, @Cmd.Env env: any): Promise<boolean> | never {
		if (!this.storageAdapter) throw sapphireError.forbidden();
		return this.storageAdapter.updateFileData(parseInt(args.id), args.collectionName, args.fileName, args.newMetaData, args.newName);
	}

	@Cmd("attachment.change-file-position")
	async attachment_changeFilePosition(@Cmd.Arg args: { id: string, collectionName: string, fileName: string, position: string }, @Cmd.Env env: any): Promise<boolean> | never {
		if (!this.storageAdapter) throw sapphireError.forbidden();
		return this.storageAdapter.changeFilePosition(parseInt(args.id), args.collectionName, args.fileName, parseInt(args.position));
	}
}