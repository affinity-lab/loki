import {ifNotDefined, type MetaArg, MetadataLibrary} from "@laborci/util";
import {toKebabCase} from "@laborci/util"
import type {CometMiddlewareKind} from "../../core";

let metal = new MetadataLibrary();

// type PropertyDecorator = ((t: any, p?: string) => void);
// type ClassDecorator = ((t: any) => void);
// type PropertyOrClassDecorator = PropertyDecorator | ClassDecorator;

const CMD_KEY = Symbol("Cmd");
const CMD_OMIT_KEY = Symbol("CmdOmit");
const CMD_REMAP_KEY = Symbol("CmdRemap");
const CMD_MIDDLEWARE_KEY = Symbol("CmdMiddleware");
const CMD_ARG_KEY = Symbol("CmdArg");
const CMD_PARAM_KEY = Symbol("CmdParam");
const CMD_ENV_KEY = Symbol("CmdEnv");
const CMD_FILE_KEY = Symbol("CmdFile");
const CMD_HEADER_KEY = Symbol("CmdHeader");
const CMD_COOKIE_KEY = Symbol("CmdCookie");
const CMD_STATE_KEY = Symbol("CmdState");
const CMD_SETENV_KEY = Symbol("CmdSetEnv");


export function Cmd(name?: MetaArg<string>) {
	return function (t: any, p?: string): void {
		if (typeof p === "string") {
			if (name === undefined) name = ifNotDefined(toKebabCase(p));
			if (typeof name === "string") name = toKebabCase(name);
			metal.set(CMD_KEY, name, t, p);
		} else {
			if (name === undefined) name = ifNotDefined(toKebabCase(t.name));
			if (typeof name === "string") name = toKebabCase(name);
			metal.set(CMD_KEY, name, t)
		}
	};
}
Cmd.read = (t: any, p?: string) => metal.get(CMD_KEY, t, p)


export function SetEnv(key: string | symbol, value: any) {return function (t: any, p?: string) {metal.obj(CMD_SETENV_KEY, key, value, t, p)}}
SetEnv.read = (t: any, p?: string) => metal.get<{ key: string | symbol, value: any }>(CMD_SETENV_KEY, t, p) || {}
Cmd.SetEnv = SetEnv;

export function Omit(...method: [string, ...string[]]) {return function (t: any) {metal.set(CMD_OMIT_KEY, method, t)}}
Omit.read = (t: any) => metal.get(CMD_OMIT_KEY, t)
Cmd.Omit = Omit;

export function Remap(map: Record<string, string>) { return function (t: any) {metal.set(CMD_REMAP_KEY, map, t)}}
Remap.read = (t: any) => metal.get(CMD_REMAP_KEY, t)
Cmd.Remap = Remap;

export function Middleware(...middlewares: Array<CometMiddlewareKind>) { return function (t: any, p?: string) { metal.set(CMD_MIDDLEWARE_KEY, middlewares, t, p) }}
Middleware.read = (t: any, p?: string): Array<CometMiddlewareKind> => metal.get(CMD_MIDDLEWARE_KEY, t, p) || []
Cmd.Middleware = Middleware;


export function Arg(t: any, p: string, index: number) { metal.set(CMD_ARG_KEY, index, t, p)}
Arg.read = (t: any, p: string) => metal.get(CMD_ARG_KEY, t, p)
Cmd.Arg = Arg;

export function Param(t: any, p: string, index: number) { metal.set(CMD_PARAM_KEY, index, t, p)}
Param.read = (t: any, p: string) => metal.get(CMD_PARAM_KEY, t, p)
Cmd.Param = Param;

export function Env(t: any, p: string, index: number) { metal.set(CMD_ENV_KEY, index, t, p)}
Env.read = (t: any, p: string) => metal.get(CMD_ENV_KEY, t, p)
Cmd.Env = Env;

export function File(t: any, p: string, index: number) { metal.set(CMD_FILE_KEY, index, t, p)}
File.read = (t: any, p: string) => metal.get(CMD_FILE_KEY, t, p)
Cmd.File = File;

export function Header(t: any, p: string, index: number) { metal.set(CMD_HEADER_KEY, index, t, p)}
Header.read = (t: any, p: string) => metal.get(CMD_HEADER_KEY, t, p)
Cmd.Header = Header;

export function Cookie(t: any, p: string, index: number) { metal.set(CMD_COOKIE_KEY, index, t, p)}
Cookie.read = (t: any, p: string) => metal.get(CMD_COOKIE_KEY, t, p)
Cmd.Cookie = Cookie;

export function State(t: any, p: string, index: number) { metal.set(CMD_STATE_KEY, index, t, p)}
State.read = (t: any, p: string) => metal.get(CMD_STATE_KEY, t, p)
Cmd.State = State;
