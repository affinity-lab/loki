import type {Middleware, MiddlewareFn} from "@laborci/util";
import type {CometRequest, CometState} from "../../core";
import {CometResult} from "../../core";
import {PrefixApi} from "../api.prefix/prefix-api";
import {processCommands} from "./command-processor";

export class CommandApi extends PrefixApi {

	declare descriptor: Record<string, any>
	declare commands: Record<string, (state: CometState) => Promise<CometResult>>

	constructor(prefix: string, commandSets: any[], middlewares: Array<Middleware | MiddlewareFn> = []) {
		/*
		 This implementation bypasses the default middleware handling behaviour.
		 It does not present the given middlewares to the requestHandler,
		 instead passes it to all commands, this was all commands can extend the
		 whole middleware pipeline
		 */
		super(prefix);
		let {descriptor, commands} = processCommands(commandSets, middlewares);
		this.descriptor = descriptor;
		this.commands = commands;
	}

	async handle(state: CometState): Promise<CometResult> {
		const command = this.getSubPath(state);
		return this.commands[command] ?
			await this.commands[command](state) :
			new CometResult(`Command not found "${command}"`, 500, "text");
	}


	/*
	 Accepts only POST requests with application/json or multipart/form-data content-type.
	 */
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


