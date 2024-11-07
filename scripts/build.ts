import *  as fs from "fs";
import *  as path from "path";
import {cmd} from "./lib/cmd";
import {packageBuilder} from "./lib/package-builder";

let packages: Record<string, any> = {};
let mainPackageJson: Record<string, any> = JSON.parse(fs.readFileSync("package.json").toString());
let root = process.cwd();

console.log("Loading workspaces");
for (const workspace of mainPackageJson.workspaces) {
	let packageJson = JSON.parse(fs.readFileSync(path.resolve(workspace, "package.json")).toString())
	console.log(`🖿 ${packageJson.name}`);
	packages[packageJson.name] = {
		path: workspace,
		name: workspace.split("/").pop(),
		package: packageJson.name,
		dependencies: [],
		packageJson,
	};
}
console.log("");

console.log("Analyzing dependencies");
for (const pkgName in packages) {
	let pkg = packages[pkgName];
	console.log(`🖿 ${pkgName}`);
	for (const dependencyName in pkg.packageJson.dependencies) {
		if (packages.hasOwnProperty(dependencyName)) {
			console.log(` ➜ ${dependencyName}`);
			pkg.dependencies.push(dependencyName);
		}
	}
}

console.log();

console.log("Calculating build order");
let buildOrder: Set<string> = new Set();
while (buildOrder.size < Object.keys(packages).length) {
	for (const pkgName in packages) {
		if (!buildOrder.has(pkgName)) {
			let pkg = packages[pkgName];
			let dependencies = pkg.dependencies.filter((dep: string) => !buildOrder.has(dep));
			if (dependencies.length === 0) buildOrder.add(pkgName);
		}
	}
}

console.log(' ' + [...buildOrder].join("\n↘ "));
console.log();

console.log("Building packages");
for (const build of buildOrder) {
	console.log(`${path.resolve(root, packages[build].path)}`)
	await packageBuilder(path.resolve(root, packages[build].path))
}

console.log("\n");