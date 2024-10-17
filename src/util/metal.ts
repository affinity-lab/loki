export let UNSET = Symbol('UNSET');

export class Default {constructor(public readonly value: any) {}}

export function DEF(value: any) {return new Default(value)}
export type MetaArg<TYPE> = TYPE | undefined | typeof UNSET | Default;

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
		if (value instanceof Default) {
			meta[KEY] = meta[KEY] || value.value;
		} else if (value === UNSET) {
			delete meta[KEY];
		} else if (value !== undefined) {
			meta[KEY] = value;
		}
	}

	get(KEY: symbol, t: any, p?: string) {
		let target = p === undefined ? t : (typeof t === "function" ? t.prototype[p] : t[p]);
		return target[this.KEY] ? target[this.KEY][KEY] : undefined;
	}

	protected getMetaObject(t: any, p?: string) {
		let target = p === undefined ? t : t[p];
		if (!target.hasOwnProperty(this.KEY)) target[this.KEY] = {...this.findParentMeta(t, p)};
		return target[this.KEY];
	}
}