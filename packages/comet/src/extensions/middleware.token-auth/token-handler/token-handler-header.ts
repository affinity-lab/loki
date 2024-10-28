import type {CometResult, CometState} from "../../../core";
import type {AuthToken, RefreshToken, TokenEncoder, TokenHandler} from "../types";

export class TokenHandlerHeader implements TokenHandler {
	constructor(
		protected tokenAdapter: TokenEncoder,
		protected authTokenTimeout: number = 60 * 10, // 10 minutes
		protected refreshTokenTimeout: number = 60 * 30, // 30 minutes
		protected authTokenHeader: string = "auth-token",
		protected refreshTokenHeader: string = "refresh-token",
		protected staySignedInAuthTokenTimeout: number = 60 * 15, // 15 minutes
		protected staySignedInRefreshTokenTimeout: number = 60 * 60 * 24 * 30, // 30 days
	) {
	}

	setAuthToken(result: CometResult, value: AuthToken, staySignedIn: boolean = false) {
		result.addHeader(this.authTokenHeader, this.tokenAdapter.createAuthToken(value, staySignedIn ? this.staySignedInAuthTokenTimeout : this.authTokenTimeout));
	}

	setRefreshToken(result: CometResult, value: RefreshToken, staySignedIn: boolean = false) {
		result.addHeader(this.refreshTokenHeader, this.tokenAdapter.createRefreshToken(value, staySignedIn ? this.staySignedInRefreshTokenTimeout : this.refreshTokenTimeout));
	}

	deleteAuthToken(result: CometResult) {
		result.addHeader(this.authTokenHeader, "");
	}

	deleteRefreshToken(result: CometResult) {
		result.addHeader(this.refreshTokenHeader, "");
	}

	getAuthToken(state: CometState) {
		return this.tokenAdapter.readAuthToken(state.headers[this.authTokenHeader]);
	}

	getRefreshToken(state: CometState) {
		return this.tokenAdapter.readRefreshToken(state.headers[this.refreshTokenHeader]);
	}
}
