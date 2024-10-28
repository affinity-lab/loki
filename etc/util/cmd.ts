import * as child_process from "node:child_process";

export function cmd(command: string, quiet: boolean = false): Promise<string> {
	return new Promise((resolve, reject) => {
		child_process.exec(command, (error, stdout) => {
			let res = stdout.toString().trim();
			if (!quiet) console.log(res);
			if (error) {
				if (!quiet) console.log(error);
				reject({res, error});
			} else resolve(res);
		});
	});
}