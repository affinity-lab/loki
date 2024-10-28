import type {CometMiddlewareFn, CometResult, CometState} from "../../core";

type ErrorHandler = (error: any) => Promise<CometResult | null>;

export function cmw_errorHandler(...handlers: Array<ErrorHandler>): CometMiddlewareFn {
	return async function (state: CometState, next: () => Promise<CometResult>): Promise<CometResult> {
		try {
			return await next();
		} catch (error: any) {
			for (let handler of handlers) {
				let res = await handler(error);
				if (res !== null) return res;
			}
			throw error;
		}
	}
}