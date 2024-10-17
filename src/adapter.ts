import type {CometRequest} from "./request";
import type {CometResult} from "./result";

export interface CometAdapter{
	requestParser: (req: any) => Promise<CometRequest>
	responseFactory: (result: CometResult) => Promise<any>
}