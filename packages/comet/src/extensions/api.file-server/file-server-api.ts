import * as path from "path";
import type {CometMiddlewareKind, CometRequest, CometState} from "../../core";
import {CometResult} from "../../core";
import {PrefixApi} from "../api.prefix";

export class FileServerApi extends PrefixApi {

	constructor(prefix: string, readonly path: string, middlewares: Array<CometMiddlewareKind> = []) {
		super(prefix, middlewares);
	}

	protected async handle(state: CometState): Promise<CometResult> {
		return new CometResult(path.join(this.path, this.getSubPath(state)), 200, "file");
	}

	protected checkMethod(request: CometRequest): boolean { return request.method === "GET";}
}