import type {CometRequest} from "./request";
import type {CometResult} from "./result";

class ApiNotFound{}
export const API_NOT_FOUND = new ApiNotFound();

export interface CometApi {
	handleRequest(state: CometRequest): Promise<CometResult | ApiNotFound>;
}