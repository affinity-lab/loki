import type {Middleware, MiddlewareFn} from "@nano-forge/util";
import type {CometResult} from "./result";
import type {CometState} from "./state";

export type CometMiddleware = Middleware<CometState, CometResult>
export type CometMiddlewareFn = MiddlewareFn<CometState, CometResult>
export type CometMiddlewareKind = CometMiddleware | CometMiddlewareFn
