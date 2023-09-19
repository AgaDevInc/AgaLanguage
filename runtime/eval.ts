import Parser from 'magal/frontend/parser.ts';
import makeRequire from 'magal/runtime/require.ts';
import getGlobalScope from 'magal/runtime/global/index.ts';
import Environment from 'magal/runtime/Environment.class.ts';
import { IStack, evaluate } from 'magal/runtime/interpreter.ts';
import AgalArray from 'magal/runtime/values/complex/Array.class.ts';
import AgalObject from 'magal/runtime/values/complex/Object.class.ts';
import AgalFunction from 'magal/runtime/values/complex/Function.class.ts';
import Runtime, { defaultStack } from 'magal/runtime/values/Runtime.class.ts';
import AgalError, { AgalTypeError } from 'magal/runtime/values/internal/Error.class.ts';
import StringGetter, { AgalString } from 'magal/runtime/values/primitive/String.class.ts';

export async function getModule(path: string): Promise<AgalObject> {
	const module = new AgalObject();
	const splitPath = path.split(/[\\\/]/g);
	await module.set('ruta', defaultStack, StringGetter(splitPath.slice(0, -1).join('/')));
	await module.set('archivo', defaultStack, StringGetter(splitPath.join('/')));
	await module.set('exportar', defaultStack, new AgalObject());
	await module.set('hijos', defaultStack, new AgalArray());
	const importar = AgalFunction.from(async function requiere(_name, stack, _este, path, config) {
		if (path instanceof AgalString) return await makeRequire(stack,module, path.value, config as AgalObject);
		return new AgalTypeError('Se esperaba una cadena', stack).throw();
	}).setName('importar', defaultStack)
	importar.set('mod', defaultStack, module);
	await module.set(
		'importar',
		defaultStack,
		importar
	);
	return module;
}

export async function getModuleScope(path: string): Promise<Environment> {
	const data = new Environment(getGlobalScope());
	const modulo = await getModule(path);
	data.declareVar('importar', defaultStack, await modulo.get('importar'), { col: 0, row: 0 });
	data.declareVar('exportar', defaultStack, await modulo.get('exportar'), { col: 0, row: 0 });
	data.declareVar('modulo', defaultStack, modulo, { col: 0, row: 0 });
	return data;
}

export async function agal(
	code: string,
	path = Deno.cwd() + '/inicio.agal',
	stack = defaultStack
) {
	path = path.replace(/\\/g, '/');
	const parser = new Parser();
	const program = parser.produceAST(code, false, path);
	const scope = await getModuleScope(path);
	const data = await evaluate(program, scope, stack);
	if (data instanceof AgalError) return data;
	return await data.get('exportar');
}

export async function evalLine(
	line: string,
	lineIndex: number,
	scope?: Environment,
	stack: IStack = defaultStack
): Promise<[Runtime, Environment, IStack]> {
	scope = scope ?? (await getModuleScope(Deno.cwd() + '/inicio.agal'));
	const parser = new Parser();
	const program = parser.produceAST(line, false, `<linea:${lineIndex}>`);
	const runtime = await evaluate(program.body, scope, stack);
	return [runtime, scope, stack];
}

export default async function AgalEval(code: string) {
	const parser = new Parser();
	const program = parser.produceAST(code, false, '<nativo>');
	return await evaluate(program.body, getGlobalScope(), defaultStack);
}
