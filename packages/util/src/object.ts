import type {OmittedObject, PickedObject} from "./types";

/**
 * Filters the fields of an object based on a provided list of field names.
 * @param values - The object containing the fields to be filtered.
 * @param fields - An array of field names to include in the filtered result.
 * @returns An object containing only the fields specified in the 'fields' array.
 */
export function pickFieldsIP<PICKED extends Array<keyof VALUES>, VALUES extends Record<string, any>>(values: VALUES, ...fields: PICKED) {
	Object.keys(values).forEach(key => { if (!fields.includes(key)) delete values[key];});
	return values as PickedObject<VALUES, PICKED>;
}

/**
 * Omits specified fields from an object.
 * @param values - The object containing the fields to be omitted.
 * @param fields - An array of field names to be omitted from the object.
 * @returns An object containing all fields except those specified in the 'fields' array.
 */
export function omitFieldsIP<REMOVED extends Array<keyof VALUES>, VALUES extends Record<string, any>>(values: VALUES, ...fields: REMOVED) {
	fields.forEach(key => {delete values[key]});
	return values as OmittedObject<VALUES, REMOVED>;
}

/**
 * Filters the fields of an object based on a provided list of field names and returns a new object.
 * @param values - The object containing the fields to be filtered.
 * @param fields - An array of field names to include in the filtered result.
 * @returns A new object containing only the fields specified in the 'fields' array.
 */
export function pickFields<PICKED extends Array<keyof VALUES>, VALUES extends Record<string, any>>(values: VALUES, ...fields: PICKED) {
	let result: Partial<PickedObject<VALUES, PICKED>> = {};
	fields.forEach(key => { result[key] = values[key]; });
	return result as PickedObject<VALUES, PICKED>;
}

/**
 * Omits specified fields from an object and returns a new object.
 * @param values - The object containing the fields to be omitted.
 * @param fields - An array of field names to be omitted from the object.
 * @returns A new object containing all fields except those specified in the 'fields' array.
 */
export function omitFields<REMOVED extends Array<keyof VALUES>, VALUES extends Record<string, any>>(values: VALUES, ...fields: REMOVED) {
	let result = {...values};
	fields.forEach(key => { delete result[key]; });
	return result as OmittedObject<VALUES, REMOVED>;
}

/**
 * Retrieves the first element of an array or returns undefined if the array is blank.
 * @param array - The array from which to retrieve the first element.
 * @returns The first element of the array, or undefined if the array is blank.
 */
export function firstOrUndefined<ARRAY extends Array<any>>(array: ARRAY) {return array[0] as ARRAY[number];}

/**
 * Generates a map from an array of items using a specified key.
 * @template T - The type of items.
 * @param items - An array of items.
 * @param key - The key to use for mapping.
 * @returns A map where the keys are IDs and the values are items.
 */
export function keyMap<T extends Record<string, any>>(items: Array<T>, key: string = "id") {
	const res: Record<number, T> = {};
	(items as Array<T>).forEach((item: T) => res[item[key]] = item);
	return res;
}