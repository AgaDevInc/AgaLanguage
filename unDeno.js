const { inspect } = require('node:util');
// Use in nodejs to replace Deno
const Deno = {
	cwd: () => process.cwd(),
	readTextFile: _path => 'Text file content',
	exit: code => process.exit(code),
	readFile: _path => Promise.resolve(new Uint8Array()),
	writeFile: (_path, _data) => {},
	remove: _path => {},
	readDir: _path => ['File_1.txt', 'File_2.txt'].map(file => ({ name: file })),
	mkdir: _path => {},
	inspect: obj => inspect(obj),
};
module.exports = Deno;
