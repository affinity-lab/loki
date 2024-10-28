/**
 * @deprecated use fse.name.sanitize() instead
 * Sanitizes a filename or URL by removing accents, replacing non-filename characters with hyphens,
 * removing leading/trailing hyphens and dots, and replacing specific sequences of characters with dots.
 *
 * @param {string} filename The filename or URL to sanitize.
 * @returns {string} The sanitized filename or URL.
 */
export function sanitizeFilename(filename: string): string {
	filename = filename.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
	filename = filename.replace(/[^a-zA-Z0-9_.]/g, '-');
	filename = filename.replace(/(^[-.]+)|([-._]+)$/g, '');
	filename = filename.replace(/-+/g, '-');
	filename = filename.replace(/\.[-]/g, '.');
	filename = filename.replace(/[-.]\./g, '.');
	return filename;
}

