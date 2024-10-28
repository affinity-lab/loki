type GetPropertyDescriptor<T, R> = PropertyDescriptor & { get?: (this: T) => R; }

/**
 * A decorator function that materializes a getter property into a value property after the first access.
 * @param target - The target object.
 * @param name - The name of the property.
 * @param descriptor - The property descriptor.
 */
export function MaterializeIt<T, R>(
	target: any,
	name: PropertyKey,
	descriptor: GetPropertyDescriptor<T, R>
): void {
	// Check if a getter exists in the property descriptor
	const getter: ((this: T) => R) | undefined = descriptor.get;
	if (!getter) {
		throw new Error(`Getter property descriptor expected when materializing at ${target.name}::${name.toString()}`);
	}

	// Override the getter to materialize the property
	descriptor.get = function () {
		const value: R = getter.call(this);
		Object.defineProperty(this, name, {
			configurable: descriptor.configurable as boolean,
			enumerable: descriptor.enumerable as boolean,
			writable: false,
			value
		});
		return value;
	};
}

/**
 * Materializes the property if it is defined.
 *
 * @param target - The target object.
 * @param name - The name of the property.
 * @param descriptor - The property descriptor.
 */
export function MaterializeIfDefined<T, R>(
	target: any,
	name: PropertyKey,
	descriptor: PropertyDescriptor
): void {
	// Get the getter function from the property descriptor
	const getter: (() => R) | undefined = descriptor.get;

	// Throw an error if the getter is not defined
	if (!getter) {
		throw new Error(`Getter property descriptor expected when materializing at ${target.name}::${name.toString()}`);
	}

	// Override the getter function to materialize the property if it is defined
	descriptor.get = function () {
		// Call the original getter function
		const value: R = getter.call(this);

		// If the value is defined, materialize the property
		if (value !== undefined) {
			Object.defineProperty(this, name, {
				configurable: descriptor.configurable as boolean,
				enumerable: descriptor.enumerable as boolean,
				writable: false,
				value
			});
		}

		return value;
	};
}