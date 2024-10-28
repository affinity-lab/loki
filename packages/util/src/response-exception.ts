import {toSnakeCase} from "./to-snake-case";

type ErrorData = { message?: string, details?: Record<string, any>, httpResponseCode: number, silent: boolean }


/**
 * Represents an extended error with additional properties such as error code, details, HTTP response code, and whether it should be silent.
 */
export class ResponseException extends Error {
	/**
	 * Creates an instance of ExtendedError.
	 *
	 * @param {string} message - The error message.
	 * @param {string} code - The error code.
	 * @param {Record<string, any>} [details] - Additional details about the error.
	 * @param {number} [httpResponseCode=500] - The HTTP response code associated with the error.
	 * @param {boolean} [silent=false] - Whether the error should be silent (i.e., not logged or reported).
	 */
	constructor(
		readonly message: string,
		readonly code: string,
		readonly details?: Record<string, any>,
		readonly httpResponseCode: number = 500,
		readonly silent: boolean = false
	) {
		// Calls the constructor of the base Error class with the provided message.
		super(message);

		// Additional properties specific to ExtendedError.
		this.name = 'ExtendedError'; // Name of the error type.
		this.httpResponseCode = httpResponseCode;
		this.silent = silent;

		// An optional property providing additional information about the error cause.
		// This is added to the Error object as 'cause' for potential further analysis.
		this.cause = { code };
	}

	/**
	 * Creates an error data object with optional properties including error message, details, HTTP response code, and whether the error should be silent.
	 *
	 * @param {string} [message] - The error message.
	 * @param {Record<string, any>} [details] - Additional details about the error.
	 * @param {number} [httpResponseCode=500] - The HTTP response code associated with the error.
	 * @param {boolean} [silent=false] - Whether the error should be silent (i.e., not logged or reported).
	 * @returns {ErrorData} An error data object containing the specified properties.
	 */
	static create(
		message?: string,
		details?: Record<string, any>,
		httpResponseCode: number = 500,
		silent: boolean = false
	): ErrorData {
		const error: ErrorData = {httpResponseCode, silent, details: undefined, message: undefined};
		if (typeof details !== "undefined") error.details = details;
		if (typeof message !== "undefined") error.message = message;
		return error;
	}

	/**
	 * Preprocesses an error tree, converting all functions within the tree into error-generating functions
	 * that create instances of ExtendedError with predefined error codes based on their names and positions in the tree.
	 *
	 * @param {Record<string, any>} errors - The error tree to preprocess.
	 * @param {string} [prefix=""] - An optional prefix to prepend to all error codes generated from function names.
	 * @returns {void}
	 */
	static errorGroup(errors: Record<string, any>, prefix: string = ""): void {
		for (const prop of Object.getOwnPropertyNames(errors)) {
			if (typeof errors[prop] === "object") {
				this.errorGroup(errors[prop], prefix + "_" + prop);
			} else if (typeof errors[prop] === "function") {
				const originalMethod = errors[prop];
				const code: string = toSnakeCase(prefix + "_" + prop).toUpperCase();
				errors[prop] = (...args: Array<any>) => {
					const errorData: ErrorData = {code, ...originalMethod(...args)};
					if (errorData.message === undefined) errorData.message = code;
					return new ResponseException(errorData.message, code, errorData.details, errorData.httpResponseCode, errorData.silent);
				};
			}
		}
	}
}

/**
 * Alias for ResponseError::create()
 * Creates an error data object with optional properties including error message, details, HTTP response code, and whether the error should be silent.
 *
 * @param {string} [message] - The error message.
 * @param {Record<string, any>} [details] - Additional details about the error.
 * @param {number} [httpResponseCode=500] - The HTTP response code associated with the error.
 * @param {boolean} [silent=false] - Whether the error should be silent (i.e., not logged or reported).
 * @returns {ErrorData} An error data object containing the specified properties.
 */
export let err = ResponseException.create;


/**
 * Alias for ResponseError::errorGroup()
 * Preprocesses an error tree, converting all functions within the tree into error-generating functions
 * that create instances of ExtendedError with predefined error codes based on their names and positions in the tree.
 *
 * @param {Record<string, any>} errors - The error tree to preprocess.
 * @param {string} [prefix=""] - An optional prefix to prepend to all error codes generated from function names.
 * @returns {void}
 */
export let errorGroup = ResponseException.errorGroup
