import dts from 'bun-plugin-dts'
import * as fs from "node:fs";

await Bun.build({
	entrypoints: ['./index.ts',],
	outdir: './',
	plugins: [dts()],
});

fs.unlinkSync('./index.js');