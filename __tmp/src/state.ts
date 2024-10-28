import type {CometApi} from "./api/api";
import type {CometRequest} from "./request";

export type CometState = {
	env: Record<string | symbol, any>,
	id: string
	api: CometApi
} & CometRequest;

export type Args<T extends Record<string, any>> = { args: T }
export type Params<T extends Record<string, any>> = { params: T }
export type Headers<T extends Record<string, any>> = { headers: T }
export type Cookies<T extends Record<string, any>> = { cookies: T }
export type Env<T extends Record<string | symbol, any>> = { env: T }
export type Files<T extends Record<string, Array<File> | File>> = { env: T }