import { err, errorGroup} from "@nano-forge/util";

export const storageError = {
	ownerNotExists: (name: string, id: number) =>
		err("file can not be added to non existing owner", {name, id}, 500),
	fileTooLarge: (name: string, id: number, filename: string, sizeLimit: number) =>
		err("file size is too large", {name, id, filename, sizeLimit}, 500),
	extensionNotAllowed: (name: string, id: number, filename: string, allowedExtensions: string | Array<string>) =>
		err("file extension is not allowed", {name, id, filename, allowedExtensions}, 500),
	tooManyFiles: (name: string, id: number, filename: string, limit: number) =>
		err("no more storage allowed", {name, id, filename, limit}, 500),
	attachedFileNotFound: (name: string, id: number, filename: string) =>
		err("attached file not found", {name, id, filename}, 500)
};

errorGroup(storageError, "STORM_STORAGE");