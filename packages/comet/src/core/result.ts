import {HttpStatusCode} from "@laborci/util";

export class CometResult {
	#headers: Array<[string, string]> = [];
	get headers(): Readonly<Array<[string, string]>> { return this.#headers;}

	constructor(public result: any, public status: HttpStatusCode = 200, public type: "json" | "text" | "file" = "json") {}

	setStatus(status: HttpStatusCode): CometResult {
		this.status = status;
		return this;
	}
	addHeader(name: string, value: string): CometResult {
		this.#headers.push([name, value]);
		return this;
	}

	static ok(result: any = null, type: "json" | "text" = "json"): CometResult { return new CometResult(result, 200, type);}
	static badRequest(result: any = null, type: "json" | "text" = "json"): CometResult { return new CometResult(result, 400, type);}
	static forbidden(result: any = null, type: "json" | "text" = "json"): CometResult { return new CometResult(result, 403, type);}
	static unauthorized(result: any = null, type: "json" | "text" = "json"): CometResult { return new CometResult(result, 401, type);}
	static notFound(result: any = null, type: "json" | "text" = "json"): CometResult { return new CometResult(result, 404, type);}
	static conflict(result: any = null, type: "json" | "text" = "json"): CometResult { return new CometResult(result, 409, type);}
	static unprocessableEntity(result: any = null, type: "json" | "text" = "json"): CometResult { return new CometResult(result, 422, type);}
	static internalServerError(result: any = null, type: "json" | "text" = "json"): CometResult { return new CometResult(result, 500, type);}

	noCache(): CometResult {
		this.addHeader("Cache-Control", "no-cache, no-store, must-revalidate");
		return this;
	}

	cache(time: number = 31536000): CometResult {
		this.addHeader("Cache-Control", `public, max-age=${time}`);
		return this;
	}

	contentType(type: string): CometResult {
		this.addHeader("Content-Type", type);
		return this;
	}

	setCookie(name: string, value: string, options: {
		expires?: Date,
		maxAge?: number | string,
		domain?: string,
		path?: string,
		secure?: boolean,
		httpOnly?: boolean,
		sameSite?: "Strict" | "Lax" | "None"
	} = {}): CometResult {
		const defaultOptions = {maxAge: 0, secure: true, httpOnly: true}
		options = !options ? defaultOptions : {...defaultOptions, ...options};
		let cookie = `${name}=${value}`;
		if (options.expires !== undefined) cookie += `; Expires=${options.expires.toUTCString()}`;
		if (options.maxAge !== undefined) cookie += `; Max-Age=${options.maxAge}`;
		if (options.domain !== undefined) cookie += `; Domain=${options.domain}`;
		if (options.path !== undefined) cookie += `; Path=${options.path}`;
		if (options.secure !== undefined) cookie += `; Secure`;
		if (options.httpOnly !== undefined) cookie += `; HttpOnly`;
		if (options.sameSite !== undefined) cookie += `; SameSite=${options.sameSite}`;
		this.addHeader("Set-Cookie", cookie);
		return this;
	}
	delCookie(name: string): CometResult {
		this.setCookie(name, "", {maxAge: 0});
		return this;
	}
}