import type {CometResult, CometState} from "../../../core";
import type {AuthToken, RefreshToken, TokenEncoder, TokenHandler} from "../types";

export class TokenHandlerCookie implements TokenHandler {
	constructor(
		protected tokenAdapter: TokenEncoder,
		protected authTokenTimeout: number = 60 * 10, // 10 minutes
		protected refreshTokenTimeout: number = 60 * 30, // 30 minutes
		protected authTokenCookie: string = "auth-token",
		protected refreshTokenCookie: string = "refresh-token",
		protected staySignedInAuthTokenTimeout: number = 60 * 15, // 15 minutes
		protected staySignedInRefreshTokenTimeout: number = 60 * 60 * 24 * 30, // 30 days
	) {
	}
	setAuthToken(result: CometResult, value: AuthToken, staySignedIn: boolean = false) {
		if (staySignedIn) {
			result.setCookie(this.authTokenCookie, this.tokenAdapter.createAuthToken(value, this.staySignedInAuthTokenTimeout), {maxAge: this.staySignedInAuthTokenTimeout});
		} else {
			result.setCookie(this.authTokenCookie, this.tokenAdapter.createAuthToken(value, this.authTokenTimeout), {maxAge: "session"});
		}
	}
	setRefreshToken(result: CometResult, value: RefreshToken, staySignedIn: boolean = false) {
		if (staySignedIn) {
			result.setCookie(this.refreshTokenCookie, this.tokenAdapter.createRefreshToken(value, this.staySignedInRefreshTokenTimeout), {maxAge: this.staySignedInRefreshTokenTimeout});
		} else {
			result.setCookie(this.refreshTokenCookie, this.tokenAdapter.createRefreshToken(value, this.refreshTokenTimeout), {maxAge: "session"});
		}
	}
	deleteAuthToken(result: CometResult) {
		result.delCookie(this.authTokenCookie);
	}
	deleteRefreshToken(result: CometResult) {
		result.delCookie(this.refreshTokenCookie);
	}

	getAuthToken(request: CometState) {
		return this.tokenAdapter.readAuthToken(request.cookies[this.authTokenCookie]);
	}

	getRefreshToken(request: CometState) {
		return this.tokenAdapter.readRefreshToken(request.cookies[this.refreshTokenCookie]);
	}
}
