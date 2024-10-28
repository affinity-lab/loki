import {ResponseException} from "@laborci/util";
import {CometResult} from "../../../core";

export function responseExceptionHandler() {
	return async (error: any) => error instanceof ResponseException ? new CometResult(
		{
			code: error.code,
			message: error.message,
			details: error.details
		}, error.httpResponseCode) : null;
}