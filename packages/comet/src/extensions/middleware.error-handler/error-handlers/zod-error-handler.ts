import {pickFields} from "@nano-forge/util";
import {CometResult} from "../../../core";

export function zodErrorHandler(ZodErrorClass: any) {
	return async (error: any) => {
		if (error instanceof ZodErrorClass) {
			let errors: Record<string, any> = {}
			for (let i of error.issues) !errors[i.path[0]] ? errors[i.path[0]] = [pickFields(i, "code", "message")] : errors[i.path[0]].push(pickFields(i, "code", "message"));
			return new CometResult({details: errors}, 422);
		}
		return null;
	}
}
