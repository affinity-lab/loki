import dts from "bun-plugin-dts";
import * as fs from "node:fs";
import * as path from "node:path";
import {hashDirectory} from "./hash";


export async function commonPackageBuild(packageDir: string) {

	let dirs = {
		export: "export",
		build: "build",
		dist: "dist",
	}

	let exportDir: string = path.resolve(packageDir, dirs.export);
	let buildDir: string = path.resolve(packageDir, dirs.build);
	let distDir: string = path.resolve(packageDir, dirs.dist);
	let packageJsonFile = path.resolve(packageDir, "package.json");
	let packageJSON = JSON.parse(fs.readFileSync(packageJsonFile).toString());
	packageJSON.module = `${dirs.dist}/index.js`;
	packageJSON.main = `${dirs.dist}/index.js`;
	packageJSON.types = `${dirs.dist}/index.d.ts`;
	delete packageJSON.exports;
	if (!packageJSON.buildMeta) packageJSON.buildMeta = {};


	if (fs.existsSync(buildDir)) fs.rmdirSync(buildDir, {recursive: true});
	fs.mkdirSync(buildDir);

	let entryPoints: string[] = [];
	fs.readdirSync(exportDir).forEach(file => {
		if (file.endsWith(".ts") && !file.endsWith(".d.ts")) {
			// fs.copyFileSync(path.resolve(exportDir, file), path.resolve(buildDir, file))
			// normalizeExport(path.resolve(buildDir, file))
			entryPoints.push(file)
		}
	})

	if (!entryPoints.includes("index.ts")) {
		console.log("ERROR: export does not contain index file (index.ts)");
		process.exit(1);
	}

	for (let entryPoint of entryPoints) {
		console.log(` ${packageJSON.name}: ${path.parse(entryPoint).name}`)
		entryPoint = path.resolve(exportDir, entryPoint);
		process.stderr.write("error! some error occurred\n")

		await Bun.build({
			packages: "external",
			target: "bun",
			entrypoints: [entryPoint],
			outdir: buildDir,
			plugins: [dts()],
		})
	}
	let buildHash = hashDirectory(buildDir);

// REMOVING JS FILES
// 	for (let entryPoint of entryPoints) {
// 		entryPoint = path.resolve(buildDir, entryPoint);
// 		fs.unlinkSync(path.resolve(buildDir, path.parse(entryPoint).name + ".js"))
// 	}

// RENAME BUILD DIR TO DIST DIR
	if (fs.existsSync(distDir)) fs.rmdirSync(distDir, {recursive: true});
	fs.renameSync(buildDir, distDir);

// UPDATE PACKAGE JSON
	if (entryPoints.length > 1) {
		packageJSON.exports = {}

		for (let entryPoint of entryPoints) {
			let name = path.parse(entryPoint).name;
			if (name === "index") {
				packageJSON.exports["."] = {
					import: `./${dirs.dist}/${name}.d.ts`,
					types: `./${dirs.dist}/${name}.d.ts`,
					default: `./${dirs.dist}/${name}.js`,
				};
			} else {
				packageJSON.exports[`./${name}`] = {
					import: `./${dirs.dist}/${name}.d.ts`,
					types: `./${dirs.dist}/${name}.d.ts`,
					default: `./${dirs.dist}/${name}.js`,
				};
			}
		}
	}

	packageJSON.buildMeta.bld = buildHash;
	fs.writeFileSync(packageJsonFile, JSON.stringify(packageJSON, null, 2));
	console.log("")
}


function normalizeExport(file: string) {
	let content = fs.readFileSync(file).toString();
	let output = [];
	for (let line of content.split("\n")) {
		line = line.split("//")[0].trim();
		if (line !== "") output.push(line);
	}
	output = output.join("").split("export").join("\nexport").split("\n");
	output.sort((a, b) => a.localeCompare(b));
	fs.writeFileSync(file, output.join("\n") + "\n")
}