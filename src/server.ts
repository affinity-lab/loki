import type {CometAdapter} from "./adapter";
import {API_NOT_FOUND, type CometApi} from "./api/api";
import type {CometResult} from "./result";

export class CometServer {
	constructor(
		private adapter: CometAdapter,
		private apis: CometApi[] = []
	) {}
	async serve(request: any): Promise<any | undefined> {
		let cometRequest = await this.adapter.requestParser(request);
		console.log(`${cometRequest.method} ${cometRequest.url} ${cometRequest.contentType}`);
		for (const api of this.apis) {
			let result = await api.handleRequest(cometRequest);
			if (result !== API_NOT_FOUND) return await this.adapter.responseFactory(result as CometResult);
		}
	}
}
