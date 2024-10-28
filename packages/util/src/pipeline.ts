/** Represents a middleware function.
 * @template T - The type of the state object.
 * @param state - The state object to pass through the middleware.
 * @param next - The next middleware function in the pipeline.
 * @returns A promise that resolves after executing the middleware.
 */
export type MiddlewareFn<STATE = any, RESULT = any> = (state: STATE, next: () => Promise<RESULT>) => Promise<RESULT>

/** Represents a middleware object.
 * @template T - The type of the state object.
 */
export type Middleware<STATE = any, RESULT = any> = any & { handle: MiddlewareFn<STATE, RESULT> }

/** Executes a pipeline of middlewares in a specific order.
 * @param {STATE} state - The state object to pass through the pipeline.
 * @param {Array<MiddlewareFn<STATE> | Middleware<STATE>} middlewares - The middlewares to execute in the pipeline.
 * @returns {Promise<any>} A promise that resolves after executing all middlewares in the pipeline.
 * @template STATE - The type of the state object.
 * @template RES - The type of the result object.
 */
export async function pipeline<STATE = any, RESULT = any>(
	state: STATE,
	...middlewares: Array<MiddlewareFn<STATE, RESULT> | Middleware<STATE, RESULT>>
): Promise<any> {
	let middleware: MiddlewareFn | undefined = middlewares.shift();
	if (middleware === undefined) throw Error('Middleware not found!');
	let next: () => Promise<any> = () => pipeline(state, ...middlewares);
	if (typeof middleware === "function") return await middleware(state, next);
	else if (typeof middleware === "object") return await (middleware as Middleware).handle(state, next);
	throw new Error("some error occured in pipeline execution")
}

/** Represents a pipeline of middlewares.
 * @template STATE - The type of the state object.
 * @template RES - The type of the result object.
 * */
export class Pipeline<STATE = any, RESULT = any> {
	/** The middlewares to execute in the pipeline. */
	private readonly middlewares: Array<MiddlewareFn<STATE, RESULT> | Middleware<STATE, RESULT>>;

	/** Initializes a new instance of the Pipeline class.
	 * @param {Array<MiddlewareFn<STATE> | Middleware<STATE>} middlewares - The middlewares to execute in the pipeline.
	 */
	constructor(...middlewares: Array<MiddlewareFn<STATE, RESULT> | Middleware<STATE, RESULT>>) {
		this.middlewares = middlewares;
	}
	/** Executes the pipeline with the specified state object.
	 * @param {STATE} state - The state object to pass through the pipeline.
	 * @returns {Promise<RES>} A promise that resolves with the result of the pipeline execution.
	 */
	run(state: STATE): Promise<RESULT> {
		return pipeline<STATE, RESULT>(state, ...this.middlewares);
	}
}