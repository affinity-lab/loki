import {pickFields} from "@affinity-lab/loki.util";
import {CometResult} from "../../../core";

export function zodErrorHandler() {
	return async (error: any) => {
		if (typeof error === "object" && error!.constructor.name === "ZodError") {
			let errors: Record<string, any> = {}
			for (let i of error.issues) !errors[i.path[0]] ? errors[i.path[0]] = [pickFields(i, "code", "message")] : errors[i.path[0]].push(pickFields(i, "code", "message"));
			return new CometResult({details: errors}, 422);
		}
		return null;
	}
}
