import {reform} from "reformdata";
import type {CometAdapter} from "./adapter";
import type {CometRequest} from "./request";
import type {CometResult} from "./result";


export class DefaultAdapter implements CometAdapter {
	async requestParser(request: Request): Promise<CometRequest> {
		let url = new URL(request.url)
		let contentType = request.headers.get("Content-type");
		let method = request.method;
		let args: any = {};
		let params: any = {};
		let files: any = {};
		let headers: any = {};
		let cookies: any;

		if (contentType === "application/json") {
			args = await request.json();
		} else if (contentType?.startsWith("multipart/form-data")) {
			let reformData = reform(await request.formData()) as Record<string, any>;
			for (let arg in reformData) {
				if (reformData[arg] instanceof File) files[arg] = [reformData[arg]];
				else if (Array.isArray(reformData[arg]) && reformData[arg][0] instanceof File) files[arg] = reformData[arg];
				else args[arg] = reformData[arg];
			}
		}

		// read params
		url.searchParams.forEach((value, key) => params[key] = value);

		// read cookies
		request.headers.forEach((value, key) => headers[key] = value);
		cookies = request.headers.has("Cookie") ? this.parseCookieHeader(request.headers.get("Cookie") as string) : {};

		return {contentType, method, url, args, files, params, cookies, headers}
	}

	async responseFactory(result: CometResult): Promise<Response> {
		let response: Response;
		switch (result.type) {
			case "json":
				response = Response.json(result.result === undefined ? null : result.result, {status: result.status});
				break;
			case "text":
				response = new Response(result.result, {status: result.status});
				break;
			case "file":
				const file = Bun.file(result.result);
				response = new Response(file);
				break;
		}
		result.headers.forEach((header) => response.headers.append(header[0], header[1]))
		return response;
	}

	parseCookieHeader(cookieHeader: string): Record<string, string> {
		const cookies: Record<string, string> = {};
		cookieHeader.split(";").forEach(cookie => {
			const [name, ...rest] = cookie.split("=");
			cookies[name.trim()] = rest.join("=").trim();
		});
		return cookies;
	}
}