import * as path from "path";
import type {Middleware, MiddlewareFn} from "../util/pipeline";
import type {CometRequest} from "../request";
import {CometResult} from "../result";
import type {CometState} from "../state";
import {PrefixApi} from "./prefix-api";

export class FileServerApi extends PrefixApi {

	constructor(prefix: string, readonly path: string, middlewares: Array<Middleware | MiddlewareFn> = []) {
		super(prefix, middlewares);
	}

	protected async handle(state: CometState): Promise<CometResult> {
		return new CometResult(path.join(this.path, this.getSubPath(state)), 200, "file");
	}

	protected checkMethod(request: CometRequest): boolean { return request.method === "GET";}
}