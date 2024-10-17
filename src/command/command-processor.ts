import {getAllMethods} from "../util/get-all-methods.ts";
import {Pipeline} from "../util/pipeline.ts";
import type {CometState} from "../state.ts";
import {Cmd} from "./cmd.ts";

export class Fqn extends String {}
export function fqn(value:TemplateStringsArray){return new Fqn(value[0]) as string}

type Command = ((...args: any[]) => any);

export function processCommands(commandSets: any[]) {
	let commands: Record<string, (state: CometState) => any> = {}
	let descriptor: Record<string, any> = {};

	commandSets.forEach((commandSet: any) => {
		let prefix = Cmd.read(commandSet.constructor);
		if (!prefix) return;

		let omit = Cmd.Omit.read(commandSet.constructor)
		let remap = Cmd.Remap.read(commandSet.constructor);
		let setMiddlewares = Cmd.Middleware.read(commandSet.constructor);

		getAllMethods(commandSet).forEach(method => {
			if (omit && omit.includes(method)) return;
			let alias = Cmd.read(commandSet.constructor, method)
			if (!alias) return;
			if (remap && remap[method]) alias = remap[method];
			let key = alias instanceof Fqn ? `${alias}` : `${prefix}.${alias}`;
			descriptor[key] = [commandSet.constructor.name, method];

			let fn = (commandSet[method as keyof typeof commandSet] as Command).bind(commandSet);

			let argMap = readArgMap(commandSet, method);
			let commandRunner = (state: CometState) => {
				let args: any[] = [];
				for (let arg of argMap) args.push(arg === "state" ? state : state[arg as keyof typeof state])
				return fn(...args);
			}

			let pipeline = new Pipeline(
				...setMiddlewares,
				...Cmd.Middleware.read(commandSet.constructor, method),
				commandRunner
			);
			commands[key] = (state: CometState) => pipeline.run(state);
		});
	});
	return {commands, descriptor};
}

function readArgMap(commandSet: any, method: string) {
	let t = commandSet.constructor;
	let p = method;

	let args = [
		["args", Cmd.Arg.read(t, p)],
		["env", Cmd.Env.read(t, p)],
		["files", Cmd.File.read(t, p)],
		["params", Cmd.Param.read(t, p)],
		["headers", Cmd.Header.read(t, p)],
		["cookies", Cmd.Cookie.read(t, p)],
		["state", Cmd.State.read(t, p)],
	]
		.filter(a => a[1] !== undefined)
		.sort((a, b) => a[1] - b[1])
		.map((a) => a[0]);

	return args.length === 0 ? ["state"] : args;
}

