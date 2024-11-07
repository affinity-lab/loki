import * as crypto from "crypto";
import {type BinaryToTextEncoding} from "crypto";

export async function hash(string: string, algorithm: string = "sha256", encoding: BinaryToTextEncoding = "hex"): Promise<string> {
	return crypto.createHash(algorithm).update(string).digest(encoding);
}

export class Password {
	constructor(private readonly pepper: Buffer,
				private algorithm: string = "sha256",
				private encoding: BinaryToTextEncoding = "hex") {};

	async hash(password: string): Promise<string> {
		return hash(password + this.pepper, this.algorithm, this.encoding);
	};
}
