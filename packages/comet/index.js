// @bun
// packages/comet/src/core/default-adapter.ts
import { reform } from "reformdata";

class DefaultAdapter {
  async requestParser(request) {
    let url = new URL(request.url);
    let contentType = request.headers.get("Content-type");
    let method = request.method;
    let args = {};
    let params = {};
    let files = {};
    let headers = {};
    let cookies;
    if (contentType === "application/json") {
      args = await request.json();
    } else if (contentType?.startsWith("multipart/form-data")) {
      let reformData = reform(await request.formData());
      for (let arg in reformData) {
        if (reformData[arg] instanceof File)
          files[arg] = [reformData[arg]];
        else if (Array.isArray(reformData[arg]) && reformData[arg][0] instanceof File)
          files[arg] = reformData[arg];
        else
          args[arg] = reformData[arg];
      }
    }
    url.searchParams.forEach((value, key) => params[key] = value);
    request.headers.forEach((value, key) => headers[key] = value);
    cookies = request.headers.has("Cookie") ? this.parseCookieHeader(request.headers.get("Cookie")) : {};
    return { contentType, method, url, args, files, params, cookies, headers };
  }
  async responseFactory(result) {
    let response;
    switch (result.type) {
      case "json":
        response = Response.json(result.result === undefined ? null : result.result, { status: result.status });
        break;
      case "text":
        response = new Response(result.result, { status: result.status });
        break;
      case "file":
        const file = Bun.file(result.result);
        response = new Response(file);
        break;
    }
    result.headers.forEach((header) => response.headers.append(header[0], header[1]));
    return response;
  }
  parseCookieHeader(cookieHeader) {
    const cookies = {};
    cookieHeader.split(";").forEach((cookie) => {
      const [name, ...rest] = cookie.split("=");
      cookies[name.trim()] = rest.join("=").trim();
    });
    return cookies;
  }
}
// packages/comet/src/core/api.ts
class ApiNotFound {
}
var API_NOT_FOUND = new ApiNotFound;
// packages/comet/src/core/result.ts
class CometResult {
  result;
  status;
  type;
  #headers = [];
  get headers() {
    return this.#headers;
  }
  constructor(result, status = 200, type = "json") {
    this.result = result;
    this.status = status;
    this.type = type;
  }
  setStatus(status) {
    this.status = status;
    return this;
  }
  addHeader(name, value) {
    this.#headers.push([name, value]);
    return this;
  }
  static ok(result = null, type = "json") {
    return new CometResult(result, 200, type);
  }
  static badRequest(result = null, type = "json") {
    return new CometResult(result, 400, type);
  }
  static forbidden(result = null, type = "json") {
    return new CometResult(result, 403, type);
  }
  static unauthorized(result = null, type = "json") {
    return new CometResult(result, 401, type);
  }
  static notFound(result = null, type = "json") {
    return new CometResult(result, 404, type);
  }
  static conflict(result = null, type = "json") {
    return new CometResult(result, 409, type);
  }
  static unprocessableEntity(result = null, type = "json") {
    return new CometResult(result, 422, type);
  }
  static internalServerError(result = null, type = "json") {
    return new CometResult(result, 500, type);
  }
  noCache() {
    this.addHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    return this;
  }
  cache(time = 31536000) {
    this.addHeader("Cache-Control", `public, max-age=${time}`);
    return this;
  }
  contentType(type) {
    this.addHeader("Content-Type", type);
    return this;
  }
  setCookie(name, value, options = {}) {
    const defaultOptions = { maxAge: 0, secure: true, httpOnly: true };
    options = !options ? defaultOptions : { ...defaultOptions, ...options };
    let cookie = `${name}=${value}`;
    if (options.expires !== undefined)
      cookie += `; Expires=${options.expires.toUTCString()}`;
    if (options.maxAge !== undefined)
      cookie += `; Max-Age=${options.maxAge}`;
    if (options.domain !== undefined)
      cookie += `; Domain=${options.domain}`;
    if (options.path !== undefined)
      cookie += `; Path=${options.path}`;
    if (options.secure !== undefined)
      cookie += `; Secure`;
    if (options.httpOnly !== undefined)
      cookie += `; HttpOnly`;
    if (options.sameSite !== undefined)
      cookie += `; SameSite=${options.sameSite}`;
    this.addHeader("Set-Cookie", cookie);
    return this;
  }
  delCookie(name) {
    this.setCookie(name, "", { maxAge: 0 });
    return this;
  }
}
// packages/comet/src/core/server.ts
class CometServer {
  adapter;
  apis;
  constructor(adapter, apis = []) {
    this.adapter = adapter;
    this.apis = apis;
  }
  async serve(request) {
    let cometRequest = await this.adapter.requestParser(request);
    for (const api of this.apis) {
      let result = await api.handleRequest(cometRequest);
      if (result !== API_NOT_FOUND)
        return await this.adapter.responseFactory(result);
    }
  }
}
// packages/comet/src/extensions/api.prefix/prefix-api.ts
import { Pipeline } from "@nano-forge/util";
var SUB_PATH_KEY = Symbol("SUB_PATH_KEY");

class PrefixApi {
  prefix;
  middlewares;
  pipeline;
  constructor(prefix, middlewares = []) {
    this.prefix = prefix;
    this.middlewares = middlewares;
    this.prefix = `/${prefix.replace(/^\/+|\/+$/g, "")}`;
    this.pipeline = middlewares.length ? new Pipeline(...this.middlewares, this.handle.bind(this)) : undefined;
  }
  getSubPath(state) {
    return state.env[SUB_PATH_KEY];
  }
  setSubPath(state) {
    state.env[SUB_PATH_KEY] = state.url.pathname.substring(this.prefix.length).replace(/^\/+|\/+$/g, "");
  }
  check(request) {
    return this.checkMethod(request) && this.checkContentType(request) && this.checkUrl(request) && this.checkAccess(request);
  }
  checkUrl(request) {
    return RegExp(`https?://[^/]+${this.prefix}.*\$`).test(request.url.toString());
  }
  checkMethod(request) {
    return true;
  }
  checkContentType(request) {
    return true;
  }
  checkAccess(request) {
    return true;
  }
  async handleRequest(request) {
    if (!this.check(request))
      return API_NOT_FOUND;
    let state = { ...request, env: {}, id: crypto.randomUUID(), api: this };
    this.setSubPath(state);
    return this.pipeline ? this.pipeline.run(state) : this.handle(state);
  }
}

// packages/comet/src/extensions/api.command/command-processor.ts
import { getAllMethods, Pipeline as Pipeline2 } from "@nano-forge/util";

// packages/comet/src/extensions/api.command/cmd.ts
import { ifNotDefined, MetadataLibrary, toKebabCase } from "@nano-forge/util";
var metal = new MetadataLibrary;
var CMD_KEY = Symbol("Cmd");
var CMD_OMIT_KEY = Symbol("CmdOmit");
var CMD_REMAP_KEY = Symbol("CmdRemap");
var CMD_MIDDLEWARE_KEY = Symbol("CmdMiddleware");
var CMD_ARG_KEY = Symbol("CmdArg");
var CMD_PARAM_KEY = Symbol("CmdParam");
var CMD_ENV_KEY = Symbol("CmdEnv");
var CMD_FILE_KEY = Symbol("CmdFile");
var CMD_HEADER_KEY = Symbol("CmdHeader");
var CMD_COOKIE_KEY = Symbol("CmdCookie");
var CMD_STATE_KEY = Symbol("CmdState");
var CMD_SETENV_KEY = Symbol("CmdSetEnv");
function Cmd(name) {
  return function(t, p) {
    if (typeof p === "string") {
      if (name === undefined)
        name = ifNotDefined(toKebabCase(p));
      if (typeof name === "string")
        name = toKebabCase(name);
      metal.set(CMD_KEY, name, t, p);
    } else {
      if (name === undefined)
        name = ifNotDefined(toKebabCase(t.name));
      if (typeof name === "string")
        name = toKebabCase(name);
      metal.set(CMD_KEY, name, t);
    }
  };
}
Cmd.read = (t, p) => metal.get(CMD_KEY, t, p);
function SetEnv(key, value) {
  return function(t, p) {
    metal.obj(CMD_SETENV_KEY, key, value, t, p);
  };
}
SetEnv.read = (t, p) => metal.get(CMD_SETENV_KEY, t, p) || {};
Cmd.SetEnv = SetEnv;
function Omit(...method) {
  return function(t) {
    metal.set(CMD_OMIT_KEY, method, t);
  };
}
Omit.read = (t) => metal.get(CMD_OMIT_KEY, t);
Cmd.Omit = Omit;
function Remap(map) {
  return function(t) {
    metal.set(CMD_REMAP_KEY, map, t);
  };
}
Remap.read = (t) => metal.get(CMD_REMAP_KEY, t);
Cmd.Remap = Remap;
function Middleware(...middlewares) {
  return function(t, p) {
    metal.set(CMD_MIDDLEWARE_KEY, middlewares, t, p);
  };
}
Middleware.read = (t, p) => metal.get(CMD_MIDDLEWARE_KEY, t, p) || [];
Cmd.Middleware = Middleware;
function Arg(t, p, index) {
  metal.set(CMD_ARG_KEY, index, t, p);
}
Arg.read = (t, p) => metal.get(CMD_ARG_KEY, t, p);
Cmd.Arg = Arg;
function Param(t, p, index) {
  metal.set(CMD_PARAM_KEY, index, t, p);
}
Param.read = (t, p) => metal.get(CMD_PARAM_KEY, t, p);
Cmd.Param = Param;
function Env(t, p, index) {
  metal.set(CMD_ENV_KEY, index, t, p);
}
Env.read = (t, p) => metal.get(CMD_ENV_KEY, t, p);
Cmd.Env = Env;
function File2(t, p, index) {
  metal.set(CMD_FILE_KEY, index, t, p);
}
File2.read = (t, p) => metal.get(CMD_FILE_KEY, t, p);
Cmd.File = File2;
function Header(t, p, index) {
  metal.set(CMD_HEADER_KEY, index, t, p);
}
Header.read = (t, p) => metal.get(CMD_HEADER_KEY, t, p);
Cmd.Header = Header;
function Cookie(t, p, index) {
  metal.set(CMD_COOKIE_KEY, index, t, p);
}
Cookie.read = (t, p) => metal.get(CMD_COOKIE_KEY, t, p);
Cmd.Cookie = Cookie;
function State(t, p, index) {
  metal.set(CMD_STATE_KEY, index, t, p);
}
State.read = (t, p) => metal.get(CMD_STATE_KEY, t, p);
Cmd.State = State;

// packages/comet/src/extensions/api.command/command-processor.ts
class Fqn extends String {
}
function fqn(value) {
  return new Fqn(value[0]);
}
function processCommands(commandSets, middlewares = []) {
  let commands = {};
  let descriptor = {};
  commandSets.forEach((commandSet) => {
    let prefix = Cmd.read(commandSet.constructor);
    if (!prefix)
      return;
    let omit = Cmd.Omit.read(commandSet.constructor);
    let remap = Cmd.Remap.read(commandSet.constructor);
    let middlewares_set = Cmd.Middleware.read(commandSet.constructor);
    let env_set = Cmd.SetEnv.read(commandSet.constructor);
    getAllMethods(commandSet).forEach((method) => {
      if (omit && omit.includes(method))
        return;
      let alias = Cmd.read(commandSet.constructor, method);
      if (!alias)
        return;
      if (remap && remap[method])
        alias = remap[method];
      let key = alias instanceof Fqn ? `${alias}` : `${prefix}.${alias}`;
      descriptor[key] = [commandSet.constructor.name, method];
      let fn = commandSet[method].bind(commandSet);
      let argMap = readArgMap(commandSet, method);
      let commandRunner = async (state) => {
        let args = [];
        for (let arg of argMap)
          args.push(arg === "state" ? state : state[arg]);
        let result = await fn(...args);
        if (result instanceof CometResult)
          return result;
        return new CometResult(result);
      };
      let middlewares_cmd = Cmd.Middleware.read(commandSet.constructor, method);
      let env = { ...env_set, ...Cmd.SetEnv.read(commandSet.constructor, method) };
      let middlewares_pre = [];
      if (Object.keys(env).length)
        middlewares_pre.push((state, next) => {
          state.env = { ...state.env, ...env };
          return next();
        });
      let pipeline = new Pipeline2(...middlewares_pre, ...middlewares, ...middlewares_set, ...middlewares_cmd, commandRunner);
      commands[key] = (state) => {
        return pipeline.run(state);
      };
    });
  });
  return { commands, descriptor };
}
function readArgMap(commandSet, method) {
  let t = commandSet.constructor;
  let p = method;
  let args = [
    ["args", Cmd.Arg.read(t, p)],
    ["env", Cmd.Env.read(t, p)],
    ["files", Cmd.File.read(t, p)],
    ["params", Cmd.Param.read(t, p)],
    ["headers", Cmd.Header.read(t, p)],
    ["cookies", Cmd.Cookie.read(t, p)],
    ["state", Cmd.State.read(t, p)]
  ].filter((a) => a[1] !== undefined).sort((a, b) => a[1] - b[1]).map((a) => a[0]);
  return args.length === 0 ? ["state"] : args;
}

// packages/comet/src/extensions/api.command/command-api.ts
class CommandApi extends PrefixApi {
  constructor(prefix, commandSets, middlewares = []) {
    super(prefix);
    let { descriptor, commands } = processCommands(commandSets, middlewares);
    this.descriptor = descriptor;
    this.commands = commands;
  }
  async handle(state) {
    const command = this.getSubPath(state);
    return this.commands[command] ? await this.commands[command](state) : new CometResult(`Command not found "${command}"`, 500, "text");
  }
  checkMethod(request) {
    return request.method === "POST";
  }
  checkContentType(request) {
    return request.contentType !== null && ["application/json", "multipart/form-data"].includes(request.contentType);
  }
}
// packages/comet/src/extensions/api.file-server/file-server-api.ts
import * as path from "path";
class FileServerApi extends PrefixApi {
  path2;
  constructor(prefix, path2, middlewares = []) {
    super(prefix, middlewares);
    this.path = path2;
  }
  async handle(state) {
    return new CometResult(path.join(this.path, this.getSubPath(state)), 200, "file");
  }
  checkMethod(request) {
    return request.method === "GET";
  }
}
// packages/comet/src/extensions/middleware.error-handler/cmw_error-handler.ts
function cmw_errorHandler(...handlers) {
  return async function(state, next) {
    try {
      return await next();
    } catch (error) {
      for (let handler of handlers) {
        let res = await handler(error);
        if (res !== null)
          return res;
      }
      throw error;
    }
  };
}
// packages/comet/src/extensions/middleware.error-handler/error-handlers/unexpected-error-handler.ts
function unexpectedErrorHandler(log = (error) => {
  console.log(error);
}) {
  return async (error) => {
    if (log)
      log(error);
    return new CometResult(error, 500);
  };
}
// packages/comet/src/extensions/middleware.error-handler/error-handlers/zod-error-handler.ts
import { pickFields } from "@nano-forge/util";
function zodErrorHandler(ZodErrorClass) {
  return async (error) => {
    if (error instanceof ZodErrorClass) {
      let errors = {};
      for (let i of error.issues)
        !errors[i.path[0]] ? errors[i.path[0]] = [pickFields(i, "code", "message")] : errors[i.path[0]].push(pickFields(i, "code", "message"));
      return new CometResult({ details: errors }, 422);
    }
    return null;
  };
}
// packages/comet/src/extensions/middleware.error-handler/error-handlers/response-exception-handler.ts
import { ResponseException } from "@nano-forge/util";
function responseExceptionHandler() {
  return async (error) => error instanceof ResponseException ? new CometResult({
    code: error.code,
    message: error.message,
    details: error.details
  }, error.httpResponseCode) : null;
}
// packages/comet/src/extensions/middleware.log/cmw-log.ts
import { getHttpStatusName } from "@nano-forge/util";
function requestLog(state) {
  console.log(`${state.method} ${state.url} ${state.contentType}`);
}
function responseLog(state, result, time) {
  console.log(`${result.status} ${getHttpStatusName(result.status)} ${result.type} ${time}ms`);
}
function cmw_log(requestLogger = requestLog, responseLogger = responseLog) {
  return async function(state, next) {
    let time = new Date().getMilliseconds();
    requestLogger === undefined || requestLogger(state);
    let result = await next();
    responseLogger === undefined || responseLogger(state, result, new Date().getMilliseconds() - time);
    return result;
  };
}
// packages/comet/src/extensions/middleware.guard/cmw-guard.ts
function cmw_guard(guard) {
  return async function(state, next) {
    await guard(state);
    return next();
  };
}
// packages/comet/src/extensions/middleware.validator/cmw-validator.ts
import { ResponseException as ResponseException2 } from "@nano-forge/util";
function cmw_validate(argsValidator, paramsValidator) {
  return async function(state, next) {
    if (argsValidator) {
      let parsed = argsValidator.safeParse(state.args);
      if (!parsed.success)
        throw new ResponseException2("Arguments validation error", "VALIDATION_ERROR", parsed.error.issues, 422);
      state.args = { ...state.args, ...parsed.data };
    }
    if (paramsValidator) {
      let parsed = paramsValidator.safeParse(state.args);
      if (!parsed.success)
        throw new ResponseException2("Parameters validation error", "VALIDATION_ERROR", parsed.error.issues, 422);
      state.params = { ...state.params, ...parsed.data };
    }
    return next();
  };
}
// packages/comet/src/extensions/middleware.token-auth/auth-state.ts
var AUTH_STATE = Symbol("AUTH_STATE");
function getAuthState(state) {
  return state.env[AUTH_STATE];
}
function setAuthState(state, authState) {
  return state.env[AUTH_STATE] = authState;
}

class AuthEventSingIn {
  authData;
  staySignedIn;
  constructor(authData, staySignedIn = false) {
    this.authData = authData;
    this.staySignedIn = staySignedIn;
  }
}

class AuthEventSignOut {
}

class AuthState {
  auth;
  int;
  staySignedIn;
  tokenExists = false;
  constructor(auth, int, staySignedIn = false) {
    this.auth = auth;
    this.int = int;
    this.staySignedIn = staySignedIn;
  }
  signIn(uid, ext, int, staySignedIn = false) {
    this.eventRaised = new AuthEventSingIn({ uid, ext, int }, staySignedIn);
  }
  signOut() {
    this.eventRaised = new AuthEventSignOut;
  }
  eventRaised = false;
  hasSignInEvent() {
    return this.eventRaised instanceof AuthEventSingIn;
  }
  hasSignOutEvent() {
    return this.eventRaised instanceof AuthEventSignOut;
  }
  getSignInEvent() {
    return this.eventRaised;
  }
  isRefreshRequested() {
    return this.int !== undefined;
  }
  isRefreshable() {
    return !this.hasSignOutEvent() && this.auth !== undefined && this.int;
  }
  needCleanup() {
    return this.hasSignOutEvent() || this.tokenExists && !this.hasSignInEvent();
  }
  hasToken() {
    this.tokenExists = true;
  }
}
// packages/comet/src/extensions/middleware.token-auth/cmw-auth-guard.ts
import { ResponseException as ResponseException3 } from "@nano-forge/util";
function cmw_authGuard(guard) {
  return async function(state, next) {
    let authState = getAuthState(state);
    if (authState === undefined)
      throw new ResponseException3("Unauthorized", "UNAUTHORIZED", undefined, 401);
    if (await guard(authState))
      return next();
    throw new ResponseException3("Forbidden", "FORBIDDEN", undefined, 403);
  };
}
// packages/comet/src/extensions/middleware.token-auth/token-auth-middleware.ts
function cmw_tokenAuth(tokenHandler, authResolver) {
  return new TokenAuthMiddleware(tokenHandler, authResolver);
}

class TokenAuthMiddleware {
  tokenHandler;
  authResolver;
  constructor(tokenHandler, authResolver) {
    this.tokenHandler = tokenHandler;
    this.authResolver = authResolver;
  }
  async handle(state, next) {
    let authState = await this.createAuthState(state);
    setAuthState(state, authState);
    let result = await next();
    if (authState.isRefreshRequested() && authState.isRefreshable()) {
      let staySignedIn = authState.staySignedIn;
      this.tokenHandler.setAuthToken(result, { uid: authState.auth.uid, ext: authState.auth.ext, ori: false }, staySignedIn);
      this.tokenHandler.setRefreshToken(result, { uid: authState.auth.uid, int: authState.int, ssi: staySignedIn }, staySignedIn);
    } else if (authState.needCleanup()) {
      this.tokenHandler.deleteAuthToken(result);
      this.tokenHandler.deleteRefreshToken(result);
    } else if (authState.hasSignInEvent()) {
      let auth = authState.getSignInEvent().authData;
      let staySignedIn = authState.getSignInEvent().staySignedIn;
      this.tokenHandler.setAuthToken(result, { uid: auth.uid, ext: auth.ext, ori: true }, staySignedIn);
      this.tokenHandler.setRefreshToken(result, { uid: auth.uid, int: auth.int, ssi: staySignedIn }, staySignedIn);
    }
    return result;
  }
  async createAuthState(state) {
    let authToken = this.tokenHandler.getAuthToken(state);
    if (authToken)
      return new AuthState(authToken);
    let refreshToken = this.tokenHandler.getRefreshToken(state);
    if (refreshToken) {
      let authData = await this.authResolver(refreshToken.uid);
      if (authData && refreshToken.int === authData.int)
        return new AuthState({ uid: authData.uid, ext: authData.ext, ori: false }, authData.int, refreshToken.ssi);
    }
    let authState = new AuthState(undefined);
    if (refreshToken === false || authToken === false)
      authState.hasToken();
    return authState;
  }
}
// packages/comet/src/extensions/middleware.token-auth/token-handler/token-handler-header.ts
class TokenHandlerHeader {
  tokenAdapter;
  authTokenTimeout;
  refreshTokenTimeout;
  authTokenHeader;
  refreshTokenHeader;
  staySignedInAuthTokenTimeout;
  staySignedInRefreshTokenTimeout;
  constructor(tokenAdapter, authTokenTimeout = 60 * 10, refreshTokenTimeout = 60 * 30, authTokenHeader = "auth-token", refreshTokenHeader = "refresh-token", staySignedInAuthTokenTimeout = 60 * 15, staySignedInRefreshTokenTimeout = 60 * 60 * 24 * 30) {
    this.tokenAdapter = tokenAdapter;
    this.authTokenTimeout = authTokenTimeout;
    this.refreshTokenTimeout = refreshTokenTimeout;
    this.authTokenHeader = authTokenHeader;
    this.refreshTokenHeader = refreshTokenHeader;
    this.staySignedInAuthTokenTimeout = staySignedInAuthTokenTimeout;
    this.staySignedInRefreshTokenTimeout = staySignedInRefreshTokenTimeout;
  }
  setAuthToken(result, value, staySignedIn = false) {
    result.addHeader(this.authTokenHeader, this.tokenAdapter.createAuthToken(value, staySignedIn ? this.staySignedInAuthTokenTimeout : this.authTokenTimeout));
  }
  setRefreshToken(result, value, staySignedIn = false) {
    result.addHeader(this.refreshTokenHeader, this.tokenAdapter.createRefreshToken(value, staySignedIn ? this.staySignedInRefreshTokenTimeout : this.refreshTokenTimeout));
  }
  deleteAuthToken(result) {
    result.addHeader(this.authTokenHeader, "");
  }
  deleteRefreshToken(result) {
    result.addHeader(this.refreshTokenHeader, "");
  }
  getAuthToken(state) {
    return this.tokenAdapter.readAuthToken(state.headers[this.authTokenHeader]);
  }
  getRefreshToken(state) {
    return this.tokenAdapter.readRefreshToken(state.headers[this.refreshTokenHeader]);
  }
}
// packages/comet/src/extensions/middleware.token-auth/token-handler/token-handler-cookie.ts
class TokenHandlerCookie {
  tokenAdapter;
  authTokenTimeout;
  refreshTokenTimeout;
  authTokenCookie;
  refreshTokenCookie;
  staySignedInAuthTokenTimeout;
  staySignedInRefreshTokenTimeout;
  constructor(tokenAdapter, authTokenTimeout = 60 * 10, refreshTokenTimeout = 60 * 30, authTokenCookie = "auth-token", refreshTokenCookie = "refresh-token", staySignedInAuthTokenTimeout = 60 * 15, staySignedInRefreshTokenTimeout = 60 * 60 * 24 * 30) {
    this.tokenAdapter = tokenAdapter;
    this.authTokenTimeout = authTokenTimeout;
    this.refreshTokenTimeout = refreshTokenTimeout;
    this.authTokenCookie = authTokenCookie;
    this.refreshTokenCookie = refreshTokenCookie;
    this.staySignedInAuthTokenTimeout = staySignedInAuthTokenTimeout;
    this.staySignedInRefreshTokenTimeout = staySignedInRefreshTokenTimeout;
  }
  setAuthToken(result, value, staySignedIn = false) {
    if (staySignedIn) {
      result.setCookie(this.authTokenCookie, this.tokenAdapter.createAuthToken(value, this.staySignedInAuthTokenTimeout), { maxAge: this.staySignedInAuthTokenTimeout });
    } else {
      result.setCookie(this.authTokenCookie, this.tokenAdapter.createAuthToken(value, this.authTokenTimeout), { maxAge: "session" });
    }
  }
  setRefreshToken(result, value, staySignedIn = false) {
    if (staySignedIn) {
      result.setCookie(this.refreshTokenCookie, this.tokenAdapter.createRefreshToken(value, this.staySignedInRefreshTokenTimeout), { maxAge: this.staySignedInRefreshTokenTimeout });
    } else {
      result.setCookie(this.refreshTokenCookie, this.tokenAdapter.createRefreshToken(value, this.refreshTokenTimeout), { maxAge: "session" });
    }
  }
  deleteAuthToken(result) {
    result.delCookie(this.authTokenCookie);
  }
  deleteRefreshToken(result) {
    result.delCookie(this.refreshTokenCookie);
  }
  getAuthToken(request) {
    return this.tokenAdapter.readAuthToken(request.cookies[this.authTokenCookie]);
  }
  getRefreshToken(request) {
    return this.tokenAdapter.readRefreshToken(request.cookies[this.refreshTokenCookie]);
  }
}
// packages/comet/src/extensions/middleware.token-auth/jwt-token-encoder.ts
class JwtTokenEncoder {
  jwt;
  constructor(jwt) {
    this.jwt = jwt;
  }
  createAuthToken(value, timeout) {
    return this.jwt.encode(value, timeout);
  }
  createRefreshToken(value, timeout) {
    return this.jwt.encode(value, timeout);
  }
  readAuthToken(token) {
    if (token === undefined)
      return;
    try {
      return this.jwt.decode(token);
    } catch (e) {
      return false;
    }
  }
  readRefreshToken(token) {
    if (token === undefined)
      return;
    try {
      return this.jwt.decode(token);
    } catch (e) {
      return false;
    }
  }
}
export {
  zodErrorHandler,
  unexpectedErrorHandler,
  setAuthState,
  responseExceptionHandler,
  getAuthState,
  fqn,
  cmw_validate,
  cmw_tokenAuth,
  cmw_log,
  cmw_guard,
  cmw_errorHandler,
  cmw_authGuard,
  TokenHandlerHeader,
  TokenHandlerCookie,
  TokenAuthMiddleware,
  PrefixApi,
  JwtTokenEncoder,
  FileServerApi,
  DefaultAdapter,
  CommandApi,
  CometServer,
  CometResult,
  Cmd,
  AuthState,
  API_NOT_FOUND
};
