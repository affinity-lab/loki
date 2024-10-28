import { err, errorGroup} from "@laborci/util";


export const sapphireError = {
	notFound: (details: Record<string, any> = {}) => err("Not Found", details, 404),
	unauthorized: () => err("Unauthorized", {}, 401),
	forbidden: () => err("Forbidden", {}, 403),
	collectionNotExist: (name: string) => err("Collection does not exist!", {name}, 404),
	fileNotProvided: () => err("File is not provided", undefined, 400)
};

errorGroup(sapphireError, "SAPPHIRE");