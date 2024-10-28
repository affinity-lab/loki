import type {CometState} from "../../core";
import type {AuthData, AuthToken} from "./types";

const AUTH_STATE = Symbol("AUTH_STATE");
export function getAuthState(state: CometState) { return state.env[AUTH_STATE] as AuthState; }
export function setAuthState(state: CometState, authState: AuthState) { return state.env[AUTH_STATE] = authState; }

class AuthEventSingIn {constructor(readonly authData: AuthData, readonly staySignedIn: boolean = false) {}}

class AuthEventSignOut {}

export class AuthState {
	private tokenExists: boolean = false;
	constructor(readonly auth: AuthToken | undefined, readonly int?: string | number, readonly staySignedIn: boolean = false) {}
	public signIn(uid: number, ext: any, int: string | number, staySignedIn:boolean = false) { this.eventRaised = new AuthEventSingIn({uid, ext, int}, staySignedIn);}
	public signOut() { this.eventRaised = new AuthEventSignOut();}
	protected eventRaised: false | AuthEventSingIn | AuthEventSignOut = false;
	hasSignInEvent() { return this.eventRaised instanceof AuthEventSingIn; }
	hasSignOutEvent() { return this.eventRaised instanceof AuthEventSignOut; }
	getSignInEvent() { return this.eventRaised as AuthEventSingIn; }
	isRefreshRequested() { return this.int !== undefined; }
	isRefreshable() { return !this.hasSignOutEvent() && this.auth !== undefined && this.int; }
	needCleanup() { return this.hasSignOutEvent() || (this.tokenExists && !this.hasSignInEvent()); }
	hasToken() { this.tokenExists = true; }
}

