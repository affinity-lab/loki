import type {CometRequest} from "../request.ts";
import type {CometResult} from "../result.ts";

class ApiNotFound{}
export const API_NOT_FOUND = new ApiNotFound();

export interface CometApi {
	handleRequest(state: CometRequest): Promise<CometResult | ApiNotFound>;
}