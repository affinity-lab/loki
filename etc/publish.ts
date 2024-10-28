import *  as fs from "fs";
import *  as path from "path";
import {cmd} from "./util/cmd";

let packages: Record<string, any> = {};
let mainPackageJson: Record<string, any> = JSON.parse(fs.readFileSync("package.json").toString());
let root = process.cwd();
let mode: "dev" | "rel"  = process.argv.includes("rel") ? "rel" : "dev";

console.log("Loading workspaces");
for (const workspace of mainPackageJson.workspaces) {
	let packageJson = JSON.parse(fs.readFileSync(path.resolve(workspace, "package.json")).toString())
	console.log(`🖿 ${packageJson.name}`);
	packages[packageJson.name] = {
		path: workspace,
		name: workspace.split("/").pop(),
		package: packageJson.name,
		ver: {
			red: await cmd(`npm view ${packageJson.name} version`, true).catch(() => "0.0.0"),
			dev: await cmd(`npm view ${packageJson.name} version --tag dev`, true).catch(() => "0.0.0-dev.0"),
		},
		changed: false,
		dependencies: [],
		packageJson,
	};
	if (packages[packageJson.name].packageJson.version < packages[packageJson.name].ver.dev) {
		console.log(packageJson.name + " on wrong dev version!!!")
		process.exit(1);
	}
}
console.log();



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



console.log("Calculating publish order");
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




console.log("Publishing packages");
for (const build of buildOrder) {

	process.chdir(path.resolve(root, packages[build].path));
	let pkg = packages[build];


	if (mode === "dev") {

		let dependencyChanged = false
		let buildChanged = pkg.packageJson.buildMeta.bld !== pkg.packageJson.buildMeta.pub;

		// Check for changes of dependencies, and update the dependency versions
		for (const depName of pkg.dependencies) {
			let dependency = packages[depName];
			dependencyChanged = dependencyChanged || dependency.changed;
			if (dependency.changed) {
				bumpDependencyVersion(path.resolve(root, packages[build].path, "package.json"), depName, dependency.changed);
			}
		}

		if (buildChanged || dependencyChanged) {
			console.log(` ${build}`)
			let version = bumpDevVersion(path.resolve(root, packages[build].path, "package.json"));
			await cmd(`npm publish --tag dev --access public`)
			updateBuildHash(path.resolve(root, packages[build].path, "package.json"));
			pkg.changed = version;
		} else{
			console.log(` ${build}`)
		}

	} else {
		// publishing as release does not have any conditions.
		console.log(` ${build}`)
		moveToReleaseAndBump(path.resolve(root, packages[build].path, "package.json"), packages[build].dependencies);
		await cmd(`npm publish --access public`)
		moveToDevAndReset(path.resolve(root, packages[build].path, "package.json"), packages[build].dependencies)
		await cmd(`npm publish --tag dev --access public`)
	}
}


console.log();

function moveToDevAndReset(file: string, dependencies: Array<string>) {
	let content = JSON.parse(fs.readFileSync(file).toString());
	content.version = content.version + "-dev.0";
	for (let dependency of dependencies) content.dependencies[dependency] = content.dependencies[dependency] + "-dev.0";
	fs.writeFileSync(file, JSON.stringify(content, null, 2));
}

function moveToReleaseAndBump(file: string, dependencies: Array<string>) {
	let content = JSON.parse(fs.readFileSync(file).toString());
	let version = content.version.split('-')[0].split(".");
	let last = version.pop();
	content.version = [...version, (parseInt(last) + 1)].join('.')
	for (let dependency of dependencies) {
		let version = content.dependencies[dependency].split('-')[0].split(".");
		let patch = version.pop()
		content.dependencies[dependency] = [...version, (parseInt(patch) + 1)].join('.');
	}
	fs.writeFileSync(file, JSON.stringify(content, null, 2));
}

function bumpDependencyVersion(file: string, pkgName: string, newVersion: string) {
	let content = JSON.parse(fs.readFileSync(file).toString());
	content.dependencies[pkgName] = newVersion;
	fs.writeFileSync(file, JSON.stringify(content, null, 2));
}

function bumpDevVersion(file: string) {
	let content = JSON.parse(fs.readFileSync(file).toString());
	let version = content.version.split(".");
	let patch = version.pop();
	content.version = [...version, (parseInt(patch) + 1)].join('.')
	fs.writeFileSync(file, JSON.stringify(content, null, 2));
	return content.version;
}

function updateBuildHash(file: string) {
	let content = JSON.parse(fs.readFileSync(file).toString());
	content.buildMeta.pub = content.buildMeta.bld;
	fs.writeFileSync(file, JSON.stringify(content, null, 2));
}