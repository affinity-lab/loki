import {getHttpStatusName} from "@nano-forge/util";
import type {CometMiddlewareFn, CometResult, CometState} from "../../core";

function requestLog(state: CometState) { console.log(`${state.method} ${state.url} ${state.contentType}`);}
function responseLog(state: CometState, result: CometResult, time: number) { console.log(`${result.status} ${getHttpStatusName(result.status)} ${result.type} ${time}ms`)}

export function cmw_log(
	requestLogger: undefined | ((state: CometState) => void) = requestLog,
	responseLogger: undefined | ((state: CometState, result: CometResult, time: number) => void) = responseLog
): CometMiddlewareFn {
	return async function (state: CometState, next: Function): Promise<CometResult> {
		let time = new Date().getMilliseconds();
		requestLogger === undefined || requestLogger(state);
		let result = await next();
		responseLogger === undefined || responseLogger(state, result, new Date().getMilliseconds() - time);
		return result
	}
}
