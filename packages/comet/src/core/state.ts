import type {CometApi} from "./api";
import type {CometRequest} from "./request";

export type CometState = {
	env: Record<string | symbol, any>,
	id: string
	api: CometApi
} & CometRequest;
