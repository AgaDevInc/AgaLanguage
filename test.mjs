import {readFileSync} from 'node:fs';
import { createRequire } from 'node:module';

const code = readFileSync('./index.cjs', 'utf8');
const MyModule = {exports:{}};
globalThis.require = createRequire(import.meta.url);
Function('module', 'exports', 'globalThis', code+';return module.exports')(MyModule, MyModule.exports, globalThis);

const agalanguage = await MyModule.exports;

const [data] = await agalanguage.runtime.evalLine('requiere("./test.agal")');
console.log(data);

