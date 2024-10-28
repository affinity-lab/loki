import type {AuthToken, RefreshToken, TokenEncoder} from "./types";

interface JWT{
	decode(token: string): any;
	encode(value: any, timeout: number): any;
}

export class JwtTokenEncoder implements TokenEncoder {
	constructor(private jwt: JWT) {}
	createAuthToken(value: AuthToken, timeout: number) {return this.jwt.encode(value, timeout);}
	createRefreshToken(value: RefreshToken, timeout: number) {return this.jwt.encode(value, timeout);}
	readAuthToken(token: string | undefined): AuthToken | undefined | false {
		if (token === undefined) return undefined;
		try {
			return this.jwt.decode(token) as AuthToken;
		} catch (e) {
			return false;
		}
	}
	readRefreshToken(token: string | undefined): RefreshToken | undefined | false {
		if (token === undefined) return undefined;
		try {
			return this.jwt.decode(token) as RefreshToken;
		} catch (e) {
			return false;
		}
	}
}
