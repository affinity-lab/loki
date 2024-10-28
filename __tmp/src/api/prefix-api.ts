import type {CometRequest} from "../request";
import type {CometResult} from "../result";
import type {CometState} from "../state";
import {type Middleware, type MiddlewareFn, Pipeline} from "../util/pipeline";
import {API_NOT_FOUND, type CometApi} from "./api";

let SUB_PATH_KEY = Symbol("SUB_PATH_KEY");

export abstract class PrefixApi implements CometApi {

	private readonly pipeline: Pipeline | undefined;

	protected constructor(private readonly prefix: string, private middlewares: Array<Middleware | MiddlewareFn> = []) {
		this.prefix = `/${prefix.replace(/^\/+|\/+$/g, '')}`;
		this.pipeline = middlewares.length ? new Pipeline(...this.middlewares, this.handle.bind(this)) : undefined;
	}

	protected getSubPath(state: CometState): string {
		return state.env[SUB_PATH_KEY]
	}
	private setSubPath(state: CometState): void {
		state.env[SUB_PATH_KEY] = state.url.pathname.substring(this.prefix.length).replace(/^\/+|\/+$/g, '')
	}

	protected check(request: CometRequest): boolean {
		return (
			this.checkMethod(request) &&
			this.checkContentType(request) &&
			this.checkUrl(request) &&
			this.checkAccess(request)
		)
	}
	protected checkUrl(request: CometRequest): boolean { return RegExp(`https?:\/\/[^\/]+${this.prefix}.*$`).test(request.url.toString())}
	protected checkMethod(request: CometRequest): boolean {return true;}
	protected checkContentType(request: CometRequest): boolean {return true;}
	protected checkAccess(request: CometRequest): boolean {return true;}

	async handleRequest(request: CometRequest): Promise<CometResult | typeof API_NOT_FOUND> {
		if (!this.check(request)) return API_NOT_FOUND;
		let state: CometState = {...request, env: {}, id: crypto.randomUUID(), api: this};
		this.setSubPath(state);
		return this.pipeline ? this.pipeline.run(state) : this.handle(state);
	}

	protected abstract handle(state: CometState): Promise<CometResult>;
}