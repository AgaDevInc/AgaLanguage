const { inspect } = require('node:util');
const fs = require('node:fs/promises');
// Use in nodejs to replace Deno
const fn = () => {};
const req = new Request('https://example.com');
const Deno = {
	cwd: () => process.cwd(),
	readTextFile: path => fs.readFile(path, 'utf8'),
	exit: code => process.exit(code),
	readFile: _path => Promise.resolve(new Uint8Array()),
	writeFile: fn,
	remove: fn,
	readDir: _path => ['File_1.txt', 'File_2.txt'].map(file => ({ name: file })),
	mkdir: fn,
	inspect: obj => inspect(obj),
	version: { deno: '' },
	serveHttp: () => ({
		[Symbol.asyncIterator]: async function* () {
			yield {
				respondWith() {},
				request: req,
			};
		},
	}),
	listen: () => ({
		[Symbol.asyncIterator]: async function* () {},
	}),
};
module.exports = Deno;
