import {ResponseException} from "@laborci/util";
import type {CometMiddlewareFn, CometResult, CometState} from "../../core";
import {type AuthState, getAuthState} from "./auth-state";


export function cmw_authGuard(guard: (state: AuthState) => boolean | Promise<boolean>): CometMiddlewareFn {
	return async function (state: CometState, next: Function): Promise<CometResult> {
		let authState = getAuthState(state);
		if (authState === undefined) throw new ResponseException("Unauthorized", "UNAUTHORIZED", undefined, 401)
		if (await guard(authState)) return next();
		throw new ResponseException("Forbidden", "FORBIDDEN", undefined, 403)
	}
}