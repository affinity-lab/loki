export class CometResult {
	constructor(public result: any, public status: number = 200, public type: "json" | "text" | "file" = "json") {}
}
