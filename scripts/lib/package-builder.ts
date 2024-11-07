import dts from "bun-plugin-dts";
import * as fs from "node:fs";
import * as path from "node:path";
import {hashDirectory} from "./hash";

export async function packageBuilder(packageDir: string) {

	let index = path.resolve(packageDir, "index.ts");
	let buildDir: string = path.resolve(packageDir, "build");

	let packageJsonFile = path.resolve(packageDir, "package.json");
	let packageJSON = JSON.parse(fs.readFileSync(packageJsonFile).toString());
	if (!packageJSON.buildMeta) packageJSON.buildMeta = {bld:"", pub:""};


	if (fs.existsSync(buildDir)) fs.rmdirSync(buildDir, {recursive: true});
	fs.mkdirSync(buildDir);

	console.log(` ${packageJSON.name}`)
	await Bun.build({
		packages: "external",
		target: "bun",
		entrypoints: [index],
		outdir: buildDir,
		plugins: [dts()],
	})

	let buildHash = hashDirectory(buildDir);

	fs.renameSync(path.resolve(buildDir, "index.d.ts"), path.resolve(packageDir, "index.d.ts"));
	fs.renameSync(path.resolve(buildDir, "index.js"), path.resolve(packageDir, "index.js"));
	fs.rmdirSync(buildDir);

	console.log(packageJSON.buildMeta.bld === buildHash ? "  No Changes" : "  Build changed")


	packageJSON.buildMeta.bld = buildHash;
	fs.writeFileSync(packageJsonFile, JSON.stringify(packageJSON, null, 2));
	console.log("")
}
