import path from "path";
import type {Middleware, MiddlewareFn} from "../util/pipeline.ts";
import type {CometRequest} from "../request.ts";
import {CometResult} from "../result.ts";
import type {CometState} from "../state.ts";
import {PrefixApi} from "./prefix-api.ts";

export class FileServerApi extends PrefixApi {

	constructor(prefix: string, readonly path: string, middlewares: Array<Middleware | MiddlewareFn> = []) {
		super(prefix, middlewares);
	}

	protected async handle(state: CometState): Promise<CometResult> {
		return new CometResult(path.join(this.path, this.getSubPath(state)), 200, "file");
	}

	protected checkMethod(request: CometRequest): boolean { return request.method === "GET";}
}