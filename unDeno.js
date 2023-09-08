const { readFile, writeFile, unlink, readdir, mkdir } = require('node:fs/promises');
const { inspect } = require('node:util');
// Use in nodejs to replace Deno
const Deno = {
	cwd: () => process.cwd(),
	readTextFile: path => readFile(path, 'utf-8'),
	exit: code => process.exit(code),
	readFile: path => readFile(path).then(buffer => new Uint8Array(buffer)),
	writeFile: (path, data) => writeFile(path, data),
	remove: path => unlink(path),
	readDir: path => readdir(path).map(file => ({ name: file })),
	mkdir: path => mkdir(path),
	inspect: obj => inspect(obj),
};
module.exports = Deno;
