export function getAllMethods(obj: any): string[] {
	if (obj === null) return [];
	const ownMethods =
		Object
			.getOwnPropertyNames(obj)
			.filter(prop => typeof obj[prop] === 'function' && prop !== 'constructor');
	const inheritedMethods = getAllMethods(Object.getPrototypeOf(obj));
	return [...new Set([...ownMethods, ...inheritedMethods])];
}