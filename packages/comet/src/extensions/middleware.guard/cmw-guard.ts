import type {CometMiddlewareFn, CometResult, CometState} from "../../core";

export function cmw_guard(guard: (state: CometState) => void | Promise<void>): CometMiddlewareFn {
	return async function (state: CometState, next: Function): Promise<CometResult> {
		await guard(state);
		return next();
	}
}