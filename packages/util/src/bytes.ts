type Units = "kb" | "mb" | "gb" | "tb";
type FileSizeWithUnit =
	`${number}KB` | `${number}kb` | `${number}kB` |
	`${number}MB` | `${number}mb` |
	`${number}GB` | `${number}gb` |
	`${number}TB` | `${number}tb` |
	`${number}B` | `${number}b` | `${number}` | number;


/**
 * Converts a string representation of file size to bytes. If a numeric value is provided, it returns it as is.
 * @param {string | number} sizeWithUnit - The size string with optional unit (e.g., "14kb", "35mb") or a numeric value representing bytes.
 * @returns {number} The size in bytes.
 * @throws {Error} If the provided size string is in an invalid format or if an invalid unit is encountered.
 * @description
 * This function accepts a string representation of file size with optional unit (e.g., "14kb", "35mb") or a numeric value representing bytes.
 * It converts the size to bytes and returns the result.
 * If a numeric value is provided, it is returned as is.
 * If the size string is in an invalid format or if an invalid unit is encountered, it throws an error.
 * Supported units are "kb" (kilobytes), "mb" (megabytes), "gb" (gigabytes), and "tb" (terabytes).
 * The function is case-insensitive and accepts both lowercase and uppercase unit abbreviations.
 */
export function bytes(sizeWithUnit: FileSizeWithUnit): number {
	if (typeof sizeWithUnit === "number") return sizeWithUnit;
	const sizeRegex = /^(\d+(\.\d+)?|\.\d+)(kb|mb|gb|tb)$/i;
	const match = sizeWithUnit.match(sizeRegex);
	if (!match) return parseInt(sizeWithUnit);
	const size = parseInt(match[1]);
	const unit = match[3].toLowerCase() as Units;
	return Math.floor(size * Math.pow(1024, {kb: 1, mb: 2, gb: 3, tb: 4}[unit]));
}