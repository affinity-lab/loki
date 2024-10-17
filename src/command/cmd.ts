import {DEF, type MetaArg, MetadataLibrary} from "../util/metal.ts";
import type {Middleware, MiddlewareFn} from "../util/pipeline.ts";
import {toKebabCase} from "../util/to-kebab-case.ts";

let metal = new MetadataLibrary();

let CMD_KEY = Symbol("Cmd");
export function Cmd(name?: MetaArg<string>) {
	return function (t: any, p?: string, d?: PropertyDescriptor) {
		if (typeof p === "string") {
			if (name === undefined) name = DEF(toKebabCase(p));
			if (typeof name === "string") name = toKebabCase(name);
			metal.set(CMD_KEY, name, t, p);
		} else {
			if (name === undefined) name = DEF(toKebabCase(t.name));
			if (typeof name === "string") name = toKebabCase(name);
			metal.set(CMD_KEY, name, t)
		}
	};
}
Cmd.read = (t: any, p?: string) => metal.get(CMD_KEY, t, p)

let CMD_OMIT_KEY = Symbol("CmdOmit");
function Omit(...method: [string, ...string[]]) {return function (t: any) {metal.set(CMD_OMIT_KEY, method, t)}}
Omit.read = (t: any) => metal.get(CMD_OMIT_KEY, t)
Cmd.Omit = Omit;

let CMD_REMAP_KEY = Symbol("CmdRemap");
function Remap(map: Record<string, string>) { return function (t: any) {metal.set(CMD_REMAP_KEY, map, t)}}
Remap.read = (t: any) => metal.get(CMD_REMAP_KEY, t)
Cmd.Remap = Remap;

let CMD_MIDDLEWARE_KEY = Symbol("CmdMiddleware");
export function Middleware(...middlewares: Array<Middleware | MiddlewareFn>) {
	return function (t: any, p?: string, d?: PropertyDescriptor) {
		metal.set(CMD_MIDDLEWARE_KEY, middlewares, t, p);
	};
}
Middleware.read = (t: any, p?: string): Array<MiddlewareFn | Middleware> => metal.get(CMD_MIDDLEWARE_KEY, t, p) || []
Cmd.Middleware = Middleware;

let CMD_ARG_KEY = Symbol("CmdArg");
function Arg(t: any, p: string, index: number) { metal.set(CMD_ARG_KEY, index, t, p)}
Arg.read = (t: any, p: string) => metal.get(CMD_ARG_KEY, t, p)
Cmd.Arg = Arg;

let CMD_PARAM_KEY = Symbol("CmdParam");
function Param(t: any, p: string, index: number) { metal.set(CMD_PARAM_KEY, index, t, p)}
Param.read = (t: any, p: string) => metal.get(CMD_PARAM_KEY, t, p)
Cmd.Param = Param;

let CMD_ENV_KEY = Symbol("CmdEnv");
function Env(t: any, p: string, index: number) { metal.set(CMD_ENV_KEY, index, t, p)}
Env.read = (t: any, p: string) => metal.get(CMD_ENV_KEY, t, p)
Cmd.Env = Env;

let CMD_FILE_KEY = Symbol("CmdFile");
function File(t: any, p: string, index: number) { metal.set(CMD_FILE_KEY, index, t, p)}
File.read = (t: any, p: string) => metal.get(CMD_FILE_KEY, t, p)
Cmd.File = File;

let CMD_HEADER_KEY = Symbol("CmdHeader");
function Header(t: any, p: string, index: number) { metal.set(CMD_HEADER_KEY, index, t, p)}
Header.read = (t: any, p: string) => metal.get(CMD_HEADER_KEY, t, p)
Cmd.Header = Header;

let CMD_COOKIE_KEY = Symbol("CmdCookie");
function Cookie(t: any, p: string, index: number) { metal.set(CMD_COOKIE_KEY, index, t, p)}
Cookie.read = (t: any, p: string) => metal.get(CMD_COOKIE_KEY, t, p)
Cmd.Cookie = Cookie;

let CMD_STATE_KEY = Symbol("CmdState");
function State(t: any, p: string, index: number) { metal.set(CMD_STATE_KEY, index, t, p)}
State.read = (t: any, p: string) => metal.get(CMD_STATE_KEY, t, p)
Cmd.State = State;