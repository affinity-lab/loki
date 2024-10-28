import {CometResult} from "../../../core";

export function unexpectedErrorHandler(log: undefined | ((error: any) => void) = (error: any) => {console.log(error)}) {
	return async (error: any) => {
		if (log) log(error);
		return new CometResult(error, 500)
	}
}