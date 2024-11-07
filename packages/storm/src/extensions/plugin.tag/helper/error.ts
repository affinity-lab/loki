import {err, errorGroup} from "@nano-forge/util";

export const tagError = {
	itemNotFound: (repository: string) => err("item not found!", {repository}, 404),
	groupId: (details: any = {}) => err("Group id was not provided or the given field name is wrong!", details, 500),
	selfRename: () => err("fieldName wasn't provided for selfRename!", {}, 500),
	groupPrepare: () => err("Group tag's prepare is not needed", {}, 500)
};

errorGroup(tagError, "STORM_TAG");