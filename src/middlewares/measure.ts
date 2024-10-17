import type {CometState} from "../state";

export function measureMiddleware(label: () => string = () => Math.random().toString()) {
	return async function (state: CometState, next: Function): Promise<Response> {
		let m = label();
		console.time(m)
		let r = await next();
		console.timeEnd(m);
		return r
	}
}
