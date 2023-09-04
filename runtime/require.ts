import { agal } from "agal/runtime/eval.ts";
import type { IStack } from "agal/runtime/interpreter.ts";
import type Runtime from 'agal/runtime/values/Runtime.class.ts';
import AgalObject from "agal/runtime/values/complex/Object.class.ts";
import { AgalReferenceError } from "agal/runtime/values/internal/Error.class.ts";

const cache = new Map();

function resolve(path: string) {
	const pathArray = path.split(/[\\|\/]/).filter(Boolean);
	const PATH = [];
	for (let i = 0; i < pathArray.length; i++) {
		const part = pathArray[i];
		if (part === '..') {
			PATH.pop();
		} else if (part !== '.') {
			PATH.push(part);
		}
	}
	return PATH.join('/');
}

export default async function makeRequire(
	modulo: AgalObject,
	pathFile: string,
	stack: IStack
): Promise<Runtime> {
	const path = resolve(`${await modulo.get('ruta')}/${pathFile}`);
	if (cache.has(path)) return cache.get(path);
	const file = await Deno.readTextFile(path).catch(() => null);
	if (file === null)
		return new AgalReferenceError(
			`No se pudo encontrar el archivo '${pathFile}' en '${path}'`,stack
		).throw();
	const code = await agal(file, path, stack);
	cache.set(path, code);
	const hijos = await modulo.get('hijos')
	const hijos_agregar = await hijos.get('agregar')
	await hijos_agregar.call('agregar', stack, hijos, AgalObject.from({nombre:pathFile, ruta:path}, stack));
	return code;
}
