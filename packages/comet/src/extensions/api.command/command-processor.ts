import {getAllMethods, type Middleware, type MiddlewareFn, Pipeline} from "@laborci/util";
import type {CometState} from "../../core";
import {CometResult} from "../../core";
import {Cmd} from "./cmd";

export class Fqn extends String {}

export function fqn(value: TemplateStringsArray) {return new Fqn(value[0]) as string}

type Command = ((...args: any[]) => any);

export function processCommands(commandSets: any[], middlewares: Array<Middleware | MiddlewareFn> = []) {
	let commands: Record<string, (state: CometState) => any> = {}
	let descriptor: Record<string, any> = {};

	commandSets.forEach((commandSet: any) => {
		let prefix = Cmd.read(commandSet.constructor);
		if (!prefix) return;

		let omit = Cmd.Omit.read(commandSet.constructor)
		let remap = Cmd.Remap.read(commandSet.constructor);
		let middlewares_set = Cmd.Middleware.read(commandSet.constructor);
		let env_set = Cmd.SetEnv.read(commandSet.constructor);

		getAllMethods(commandSet).forEach(method => {
			if (omit && omit.includes(method)) return;
			let alias = Cmd.read(commandSet.constructor, method)
			if (!alias) return;
			if (remap && remap[method]) alias = remap[method];
			let key = alias instanceof Fqn ? `${alias}` : `${prefix}.${alias}`;
			descriptor[key] = [commandSet.constructor.name, method];

			let fn = (commandSet[method as keyof typeof commandSet] as Command).bind(commandSet);

			let argMap = readArgMap(commandSet, method);
			let commandRunner = async (state: CometState) => {
				let args: any[] = [];
				for (let arg of argMap) args.push(arg === "state" ? state : state[arg as keyof typeof state])
				let result = await fn(...args);
				if (result instanceof CometResult) return result;
				return new CometResult(result);
			}

			let middlewares_cmd = Cmd.Middleware.read(commandSet.constructor, method);

			let env = {...env_set, ...Cmd.SetEnv.read(commandSet.constructor, method)};
			let middlewares_pre: Array<MiddlewareFn | Middleware> = [];

			if (Object.keys(env).length) middlewares_pre.push((state: CometState, next: Function)=>{
				state.env = {...state.env, ...env};
				return next();
			})

			let pipeline = new Pipeline(
				...middlewares_pre,
				...middlewares,
				...middlewares_set,
				...middlewares_cmd,
				commandRunner
			);
			commands[key] = (state: CometState) => {
				return pipeline.run(state);
			}
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

