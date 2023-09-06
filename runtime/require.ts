import { agal } from 'magal/runtime/eval.ts';
import type { IStack } from 'magal/runtime/interpreter.ts';
import type Runtime from 'magal/runtime/values/Runtime.class.ts';
import AgalObject from 'magal/runtime/values/complex/Object.class.ts';
import { AgalReferenceError } from 'magal/runtime/values/internal/Error.class.ts';

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
	const folder = await (await modulo.get('ruta')).aCadena() || JSRuntime.cwd();
	const path = resolve(JSRuntime.resolve(folder,pathFile));
	if (cache.has(path)) return cache.get(path);

	const file = await JSRuntime.readFile(path).catch(() => null);
	if (file === null)
		return new AgalReferenceError(
			`No se pudo encontrar el archivo '${pathFile}' en '${path}'`,
			stack
		).throw();
	const code = await agal(file, path, stack);
	cache.set(path, code);
	const hijos = await modulo.get('hijos');
	const hijos_agregar = await hijos.get('agregar');
	await hijos_agregar.call(
		'agregar',
		stack,
		hijos,
		AgalObject.from({ nombre: pathFile, ruta: path }, stack)
	);
	return code;
}
