export type ConstructorOf<CLASS> = new (...args: any[]) => CLASS;
export type MaybePromise<TYPE> = TYPE | Promise<TYPE>;
export type MaybeArray<TYPE> = TYPE | Array<TYPE>
export type MaybeUndefined<TYPE> = TYPE | undefined;
export type MaybeNull<TYPE> = TYPE | null;
export type MaybeUnset<TYPE> = TYPE | null | undefined;
export type NonEmptyArray<T = any> = [T, ...T[]];
export type EmptyArray = [];
export type NumericString = `${number}`;
export type Numeric = NumericString|number;
export type ToString<TYPE> = TYPE & string;

/**
 * A constructor type.
 * @template OBJECT_TYPE - The type of the object.
 */
export type T_Constructor<OBJECT_TYPE> = (new (...args: any[]) => OBJECT_TYPE);

/**
 * A class type.
 * @template OBJECT_TYPE - The type of the object.
 * @template CLASS - The type of the class.
 */
export type T_Class<OBJECT_TYPE, CLASS> = T_Constructor<OBJECT_TYPE> & CLASS;

export type OmittedObject<Values extends Record<string, any>, Fields extends Array<keyof Values>> = {
	[P in keyof Values as Exclude<P, Fields[number]>]: Values[P];
};

export type PickedObject<Values extends Record<string, any>, Fields extends Array<keyof Values>> = {
	[P in Fields[number]]: Values[P];
};

type NonFunctionKeys<VALUES extends Record<string, any>> = {
	[P in keyof VALUES]: VALUES[P] extends (...args: any[]) => any ? never : P
}[keyof VALUES];

export type ExcludeFunctions<VALUES extends Record<string, any>> = Partial<Pick<VALUES, NonFunctionKeys<VALUES>>>;