import path from "path";
import type {NonEmptyArray} from "../types";

/**
 * @deprecated use fse.path.join() instead
 * This method joins a
 * @param args
 */
export function joinPath(...args: NonEmptyArray<string>) {
	let p = args.map(i=>i.replaceAll("\\", "/").replace(/^\/+|\/+$/g, '')).filter(i=>!!i).join("/");
	return args[0].startsWith("/") ? "/" + p : p;
}
