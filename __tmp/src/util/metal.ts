export let UNDEFINED = Symbol('UNDEFINED');

export class IfNotDefined {constructor(public readonly value: any) {}}

export function ifNotDefined(value: any) {return new IfNotDefined(value)}
export type MetaArg<TYPE> = TYPE | undefined | typeof UNDEFINED | IfNotDefined;

export class MetadataLibrary {

	KEY = Symbol.for("META_KEY");

	protected findParentMeta(target: any, property?: string) {
		while (true) {
			target = Object.getPrototypeOf(target);
			if (target === null) return {};
			if (typeof property === "string") {
				if (target[property] && target[property].hasOwnProperty(this.KEY)) return target[property][this.KEY];
			} else {
				if (target.hasOwnProperty(this.KEY)) return target[this.KEY];
			}
		}
	}

	set(KEY: symbol, value: any, t: any, p?: string) {
		let meta = this.getMetaObject(t, p);
		if (value instanceof IfNotDefined) meta[KEY] = meta[KEY] || value.value;
		else if (value === UNDEFINED) meta[KEY] = undefined;
		else if (value !== undefined) meta[KEY] = value;
	}

	add(KEY: symbol, value: any, t: any, p?: string) {
		let meta = this.getMetaObject(t, p);
		if (meta[KEY] === undefined) meta[KEY] = [value];
		else if (Array.isArray(meta[KEY])) meta[KEY] = [...meta[KEY], value];
		else meta[KEY] = [meta[KEY], value];
	}

	obj(KEY: symbol, key: symbol | string, value: any, t: any, p?: string) {
		let meta = this.getMetaObject(t, p);
		if (typeof meta[KEY] === "object" && meta[KEY] !== null) meta[KEY] = {...meta[KEY]};
		else meta[KEY] = {};
		meta[KEY][key] = value;
	}

	get<T = any>(KEY: symbol, t: any, p?: string): T | undefined {
		let target = p === undefined ? t : (typeof t === "function" ? t.prototype[p] : t[p]);
		return target[this.KEY] ? target[this.KEY][KEY] : undefined;
	}

	protected getMetaObject(t: any, p?: string) {
		let target = p === undefined ? t : t[p];
		if (!target.hasOwnProperty(this.KEY)) target[this.KEY] = {...this.findParentMeta(t, p)};
		return target[this.KEY];
	}
}