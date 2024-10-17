import type {CometRequest} from "./request.ts";
import type {CometResult} from "./result.ts";

export interface CometAdapter{
	requestParser: (req: any) => Promise<CometRequest>
	responseFactory: (result: CometResult) => Promise<any>
}