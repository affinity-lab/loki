import {processCommands} from "../command/command-processor";
import type {CometRequest} from "../request";
import {CometResult} from "../result";
import type {CometState} from "../state";
import type {Middleware, MiddlewareFn} from "../util/pipeline";
import {PrefixApi} from "./prefix-api";

export class CommandApi extends PrefixApi {

	declare descriptor: Record<string, any>
	declare commands: Record<string, (state: CometState) => Promise<CometResult>>

	constructor(prefix: string, commandSets: any[], middlewares: Array<Middleware | MiddlewareFn> = []) {
		super(prefix);
		let {descriptor, commands} = processCommands(commandSets, middlewares);
		this.descriptor = descriptor;
		this.commands = commands;
	}

	async handle(state: CometState): Promise<CometResult> {
		const command = this.getSubPath(state);
		if (this.commands[command]) {
			return await this.commands[command](state);
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


