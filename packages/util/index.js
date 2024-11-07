// @bun
// packages/util/src/metadata-library.ts
var UNDEFINED = Symbol("UNDEFINED");

class IfNotDefined {
  value;
  constructor(value) {
    this.value = value;
  }
}
function ifNotDefined(value) {
  return new IfNotDefined(value);
}

class MetadataLibrary {
  KEY = Symbol.for("META_KEY");
  findParentMeta(target, property) {
    while (true) {
      target = Object.getPrototypeOf(target);
      if (target === null)
        return {};
      if (typeof property === "string") {
        if (target[property] && target[property].hasOwnProperty(this.KEY))
          return target[property][this.KEY];
      } else {
        if (target.hasOwnProperty(this.KEY))
          return target[this.KEY];
      }
    }
  }
  set(KEY, value, t, p) {
    let meta = this.getMetaObject(t, p);
    if (value instanceof IfNotDefined)
      meta[KEY] = meta[KEY] || value.value;
    else if (value === UNDEFINED)
      meta[KEY] = undefined;
    else if (value !== undefined)
      meta[KEY] = value;
  }
  add(KEY, value, t, p) {
    let meta = this.getMetaObject(t, p);
    if (meta[KEY] === undefined)
      meta[KEY] = [value];
    else if (Array.isArray(meta[KEY]))
      meta[KEY] = [...meta[KEY], value];
    else
      meta[KEY] = [meta[KEY], value];
  }
  obj(KEY, key, value, t, p) {
    let meta = this.getMetaObject(t, p);
    if (typeof meta[KEY] === "object" && meta[KEY] !== null)
      meta[KEY] = { ...meta[KEY] };
    else
      meta[KEY] = {};
    meta[KEY][key] = value;
  }
  get(KEY, t, p) {
    let target = p === undefined ? t : typeof t === "function" ? t.prototype[p] : t[p];
    return target[this.KEY] ? target[this.KEY][KEY] : undefined;
  }
  getMetaObject(t, p) {
    let target = p === undefined ? t : t[p];
    if (!target.hasOwnProperty(this.KEY))
      target[this.KEY] = { ...this.findParentMeta(t, p) };
    return target[this.KEY];
  }
}
// packages/util/src/pipeline.ts
async function pipeline(state, ...middlewares) {
  let middleware = middlewares.shift();
  if (middleware === undefined)
    throw Error("Middleware not found!");
  let next = () => pipeline(state, ...middlewares);
  if (typeof middleware === "function")
    return await middleware(state, next);
  else if (typeof middleware === "object")
    return await middleware.handle(state, next);
  throw new Error("some error occured in pipeline execution");
}

class Pipeline {
  middlewares;
  constructor(...middlewares) {
    this.middlewares = middlewares;
  }
  run(state) {
    return pipeline(state, ...this.middlewares);
  }
}
// packages/util/src/get-all-methods.ts
function getAllMethods(obj) {
  if (obj === null)
    return [];
  const ownMethods = Object.getOwnPropertyNames(obj).filter((prop) => typeof obj[prop] === "function" && prop !== "constructor");
  const inheritedMethods = getAllMethods(Object.getPrototypeOf(obj));
  return [...new Set([...ownMethods, ...inheritedMethods])];
}
// packages/util/src/to-kebab-case.ts
function toKebabCase(input) {
  return input.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase().replace(/_/g, "-");
}
// packages/util/src/to-snake-case.ts
function toSnakeCase(input) {
  return input.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase().replace(/-/g, "_");
}
// packages/util/src/http-status-codes.ts
var HttpStatusCode;
((HttpStatusCode2) => {
  HttpStatusCode2[HttpStatusCode2["Continue"] = 100] = "Continue";
  HttpStatusCode2[HttpStatusCode2["SwitchingProtocols"] = 101] = "SwitchingProtocols";
  HttpStatusCode2[HttpStatusCode2["Processing"] = 102] = "Processing";
  HttpStatusCode2[HttpStatusCode2["EarlyHints"] = 103] = "EarlyHints";
  HttpStatusCode2[HttpStatusCode2["OK"] = 200] = "OK";
  HttpStatusCode2[HttpStatusCode2["Created"] = 201] = "Created";
  HttpStatusCode2[HttpStatusCode2["Accepted"] = 202] = "Accepted";
  HttpStatusCode2[HttpStatusCode2["NonAuthoritativeInformation"] = 203] = "NonAuthoritativeInformation";
  HttpStatusCode2[HttpStatusCode2["NoContent"] = 204] = "NoContent";
  HttpStatusCode2[HttpStatusCode2["ResetContent"] = 205] = "ResetContent";
  HttpStatusCode2[HttpStatusCode2["PartialContent"] = 206] = "PartialContent";
  HttpStatusCode2[HttpStatusCode2["MultiStatus"] = 207] = "MultiStatus";
  HttpStatusCode2[HttpStatusCode2["AlreadyReported"] = 208] = "AlreadyReported";
  HttpStatusCode2[HttpStatusCode2["IMUsed"] = 226] = "IMUsed";
  HttpStatusCode2[HttpStatusCode2["MultipleChoices"] = 300] = "MultipleChoices";
  HttpStatusCode2[HttpStatusCode2["MovedPermanently"] = 301] = "MovedPermanently";
  HttpStatusCode2[HttpStatusCode2["Found"] = 302] = "Found";
  HttpStatusCode2[HttpStatusCode2["SeeOther"] = 303] = "SeeOther";
  HttpStatusCode2[HttpStatusCode2["NotModified"] = 304] = "NotModified";
  HttpStatusCode2[HttpStatusCode2["UseProxy"] = 305] = "UseProxy";
  HttpStatusCode2[HttpStatusCode2["TemporaryRedirect"] = 307] = "TemporaryRedirect";
  HttpStatusCode2[HttpStatusCode2["PermanentRedirect"] = 308] = "PermanentRedirect";
  HttpStatusCode2[HttpStatusCode2["BadRequest"] = 400] = "BadRequest";
  HttpStatusCode2[HttpStatusCode2["Unauthorized"] = 401] = "Unauthorized";
  HttpStatusCode2[HttpStatusCode2["PaymentRequired"] = 402] = "PaymentRequired";
  HttpStatusCode2[HttpStatusCode2["Forbidden"] = 403] = "Forbidden";
  HttpStatusCode2[HttpStatusCode2["NotFound"] = 404] = "NotFound";
  HttpStatusCode2[HttpStatusCode2["MethodNotAllowed"] = 405] = "MethodNotAllowed";
  HttpStatusCode2[HttpStatusCode2["NotAcceptable"] = 406] = "NotAcceptable";
  HttpStatusCode2[HttpStatusCode2["ProxyAuthenticationRequired"] = 407] = "ProxyAuthenticationRequired";
  HttpStatusCode2[HttpStatusCode2["RequestTimeout"] = 408] = "RequestTimeout";
  HttpStatusCode2[HttpStatusCode2["Conflict"] = 409] = "Conflict";
  HttpStatusCode2[HttpStatusCode2["Gone"] = 410] = "Gone";
  HttpStatusCode2[HttpStatusCode2["LengthRequired"] = 411] = "LengthRequired";
  HttpStatusCode2[HttpStatusCode2["PreconditionFailed"] = 412] = "PreconditionFailed";
  HttpStatusCode2[HttpStatusCode2["PayloadTooLarge"] = 413] = "PayloadTooLarge";
  HttpStatusCode2[HttpStatusCode2["URITooLong"] = 414] = "URITooLong";
  HttpStatusCode2[HttpStatusCode2["UnsupportedMediaType"] = 415] = "UnsupportedMediaType";
  HttpStatusCode2[HttpStatusCode2["RangeNotSatisfiable"] = 416] = "RangeNotSatisfiable";
  HttpStatusCode2[HttpStatusCode2["ExpectationFailed"] = 417] = "ExpectationFailed";
  HttpStatusCode2[HttpStatusCode2["ImATeapot"] = 418] = "ImATeapot";
  HttpStatusCode2[HttpStatusCode2["MisdirectedRequest"] = 421] = "MisdirectedRequest";
  HttpStatusCode2[HttpStatusCode2["UnprocessableEntity"] = 422] = "UnprocessableEntity";
  HttpStatusCode2[HttpStatusCode2["Locked"] = 423] = "Locked";
  HttpStatusCode2[HttpStatusCode2["FailedDependency"] = 424] = "FailedDependency";
  HttpStatusCode2[HttpStatusCode2["TooEarly"] = 425] = "TooEarly";
  HttpStatusCode2[HttpStatusCode2["UpgradeRequired"] = 426] = "UpgradeRequired";
  HttpStatusCode2[HttpStatusCode2["PreconditionRequired"] = 428] = "PreconditionRequired";
  HttpStatusCode2[HttpStatusCode2["TooManyRequests"] = 429] = "TooManyRequests";
  HttpStatusCode2[HttpStatusCode2["RequestHeaderFieldsTooLarge"] = 431] = "RequestHeaderFieldsTooLarge";
  HttpStatusCode2[HttpStatusCode2["UnavailableForLegalReasons"] = 451] = "UnavailableForLegalReasons";
  HttpStatusCode2[HttpStatusCode2["InternalServerError"] = 500] = "InternalServerError";
  HttpStatusCode2[HttpStatusCode2["NotImplemented"] = 501] = "NotImplemented";
  HttpStatusCode2[HttpStatusCode2["BadGateway"] = 502] = "BadGateway";
  HttpStatusCode2[HttpStatusCode2["ServiceUnavailable"] = 503] = "ServiceUnavailable";
  HttpStatusCode2[HttpStatusCode2["GatewayTimeout"] = 504] = "GatewayTimeout";
  HttpStatusCode2[HttpStatusCode2["HTTPVersionNotSupported"] = 505] = "HTTPVersionNotSupported";
  HttpStatusCode2[HttpStatusCode2["VariantAlsoNegotiates"] = 506] = "VariantAlsoNegotiates";
  HttpStatusCode2[HttpStatusCode2["InsufficientStorage"] = 507] = "InsufficientStorage";
  HttpStatusCode2[HttpStatusCode2["LoopDetected"] = 508] = "LoopDetected";
  HttpStatusCode2[HttpStatusCode2["NotExtended"] = 510] = "NotExtended";
  HttpStatusCode2[HttpStatusCode2["NetworkAuthenticationRequired"] = 511] = "NetworkAuthenticationRequired";
})(HttpStatusCode ||= {});
function getHttpStatusName(code) {
  const statusName = HttpStatusCode[code];
  return statusName ? statusName : "Unknown Status Code";
}
// packages/util/src/response-exception.ts
class ResponseException extends Error {
  message;
  code;
  details;
  httpResponseCode;
  silent;
  constructor(message, code, details, httpResponseCode = 500, silent = false) {
    super(message);
    this.message = message;
    this.code = code;
    this.details = details;
    this.httpResponseCode = httpResponseCode;
    this.silent = silent;
    this.name = "ExtendedError";
    this.httpResponseCode = httpResponseCode;
    this.silent = silent;
    this.cause = { code };
  }
  static create(message, details, httpResponseCode = 500, silent = false) {
    const error = { httpResponseCode, silent, details: undefined, message: undefined };
    if (typeof details !== "undefined")
      error.details = details;
    if (typeof message !== "undefined")
      error.message = message;
    return error;
  }
  static errorGroup(errors, prefix = "") {
    for (const prop of Object.getOwnPropertyNames(errors)) {
      if (typeof errors[prop] === "object") {
        this.errorGroup(errors[prop], prefix + "_" + prop);
      } else if (typeof errors[prop] === "function") {
        const originalMethod = errors[prop];
        const code = toSnakeCase(prefix + "_" + prop).toUpperCase();
        errors[prop] = (...args) => {
          const errorData = { code, ...originalMethod(...args) };
          if (errorData.message === undefined)
            errorData.message = code;
          return new ResponseException(errorData.message, code, errorData.details, errorData.httpResponseCode, errorData.silent);
        };
      }
    }
  }
}
var err = ResponseException.create;
var errorGroup = ResponseException.errorGroup;
// packages/util/src/object.ts
function pickFieldsIP(values, ...fields) {
  Object.keys(values).forEach((key) => {
    if (!fields.includes(key))
      delete values[key];
  });
  return values;
}
function omitFieldsIP(values, ...fields) {
  fields.forEach((key) => {
    delete values[key];
  });
  return values;
}
function pickFields(values, ...fields) {
  let result = {};
  fields.forEach((key) => {
    result[key] = values[key];
  });
  return result;
}
function omitFields(values, ...fields) {
  let result = { ...values };
  fields.forEach((key) => {
    delete result[key];
  });
  return result;
}
function firstOrUndefined(array) {
  return array[0];
}
function keyMap(items, key = "id") {
  const res = {};
  items.forEach((item) => res[item[key]] = item);
  return res;
}
// packages/util/src/bytes.ts
function bytes(sizeWithUnit) {
  if (typeof sizeWithUnit === "number")
    return sizeWithUnit;
  const sizeRegex = /^(\d+(\.\d+)?|\.\d+)(kb|mb|gb|tb)$/i;
  const match = sizeWithUnit.match(sizeRegex);
  if (!match)
    return parseInt(sizeWithUnit);
  const size = parseInt(match[1]);
  const unit = match[3].toLowerCase();
  return Math.floor(size * Math.pow(1024, { kb: 1, mb: 2, gb: 3, tb: 4 }[unit]));
}
// packages/util/src/materialize-it.ts
function MaterializeIt(target, name, descriptor) {
  const getter = descriptor.get;
  if (!getter) {
    throw new Error(`Getter property descriptor expected when materializing at ${target.name}::${name.toString()}`);
  }
  descriptor.get = function() {
    const value = getter.call(this);
    Object.defineProperty(this, name, {
      configurable: descriptor.configurable,
      enumerable: descriptor.enumerable,
      writable: false,
      value
    });
    return value;
  };
}
function MaterializeIfDefined(target, name, descriptor) {
  const getter = descriptor.get;
  if (!getter) {
    throw new Error(`Getter property descriptor expected when materializing at ${target.name}::${name.toString()}`);
  }
  descriptor.get = function() {
    const value = getter.call(this);
    if (value !== undefined) {
      Object.defineProperty(this, name, {
        configurable: descriptor.configurable,
        enumerable: descriptor.enumerable,
        writable: false,
        value
      });
    }
    return value;
  };
}
// packages/util/src/process-pipeline.ts
class BlockRunner {
  pipeline2;
  constructor(pipeline2) {
    this.pipeline = pipeline2;
  }
  #segments = [];
  async run(ctx, state) {
    for (const segment of this.#segments)
      await segment.apply(ctx, [state]);
  }
  prepend(segment) {
    this.#segments.unshift(segment);
    return this.pipeline.blocks;
  }
  append(segment) {
    this.#segments.push(segment);
    return this.pipeline.blocks;
  }
}

class ProcessPipeline {
  names;
  #blocks = {};
  blocks = this.#blocks;
  constructor(...names) {
    this.names = names;
    for (const name of names)
      this.#blocks[name] = new BlockRunner(this);
  }
  async run(ctx, state) {
    for (const name of this.names)
      await this.#blocks[name].run(ctx, state);
    return state;
  }
  setup(blocks) {
    for (const key in blocks) {
      if (Array.isArray(blocks[key]))
        blocks[key].forEach((fn) => this.blocks[key].append(fn));
      if (blocks[key] instanceof Function)
        this.blocks[key].append(blocks[key]);
    }
    return this;
  }
}
export {
  toSnakeCase,
  toKebabCase,
  pipeline,
  pickFieldsIP,
  pickFields,
  omitFieldsIP,
  omitFields,
  keyMap,
  ifNotDefined,
  getHttpStatusName,
  getAllMethods,
  firstOrUndefined,
  errorGroup,
  err,
  bytes,
  UNDEFINED,
  ResponseException,
  ProcessPipeline,
  Pipeline,
  MetadataLibrary,
  MaterializeIt,
  MaterializeIfDefined,
  IfNotDefined,
  HttpStatusCode
};
