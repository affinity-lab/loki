import {ResponseException} from "@affinity-lab/loki.util";
import type {CometMiddlewareFn, CometResult, CometState} from "../../core";

type ZodLike = {
	safeParse: (arg: any) => {
		success: boolean,
		data: any,
		error: {
			issues: any
		}
	}
}

export function cmw_validate(argsValidator?: ZodLike, paramsValidator?: ZodLike): CometMiddlewareFn {
	return async function (state: CometState, next: Function): Promise<CometResult> {
		if (argsValidator) {
			let parsed = argsValidator.safeParse(state.args);
			if (!parsed.success) throw new ResponseException("Arguments validation error", "VALIDATION_ERROR", parsed.error.issues, 422);
			state.args = {...state.args, ...parsed.data};
		}
		if (paramsValidator) {
			let parsed = paramsValidator.safeParse(state.args);
			if (!parsed.success) throw new ResponseException("Parameters validation error", "VALIDATION_ERROR", parsed.error.issues, 422);
			state.params = {...state.params, ...parsed.data};
		}
		return next();
	}
}