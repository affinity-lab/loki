import type {Middleware, MiddlewareFn} from "../util/pipeline.ts";
import {processCommands} from "../command/command-processor.ts";
import type {CometRequest} from "../request.ts";
import {CometResult} from "../result.ts";
import type {CometState} from "../state.ts";
import {PrefixApi} from "./prefix-api.ts";

export class CommandApi extends PrefixApi {

	declare descriptor: Record<string, any>
	declare commands: Record<string, (state: CometState) => any>

	constructor(prefix: string, commandSets: any[], middlewares: Array<Middleware | MiddlewareFn> = []) {
		super(prefix, middlewares);
		let {descriptor, commands} = processCommands(commandSets);
		this.descriptor = descriptor;
		this.commands = commands;
		console.log(`${prefix}`, this.descriptor)
	}

	async handle(state: CometState): Promise<CometResult> {
		const command = this.getSubPath(state);
		if (this.commands[command]) {
			const result = await this.commands[command]({...state, env: {}, id: crypto.randomUUID(), api: this});
			return new CometResult(result);
		} else {
			return new CometResult(`Command not found "${command}"`, 500, "text");
		}
	}

	protected checkMethod(request: CometRequest): boolean {
		return request.method === "POST";
	}
	protected checkContentType(request: CometRequest): boolean {
		return (
			request.contentType !== null &&
			["application/json", "multipart/form-data"].includes(request.contentType)
		);
	}
}


