import Parser from "agal/frontend/parser.ts";
import makeRequire from 'agal/runtime/require.ts';
import getGlobalScope from 'agal/runtime/global/index.ts';
import Environment from 'agal/runtime/Environment.class.ts';
import { IStack, evaluate } from 'agal/runtime/interpreter.ts';
import AgalArray from 'agal/runtime/values/complex/Array.class.ts';
import AgalObject from 'agal/runtime/values/complex/Object.class.ts';
import AgalFunction from 'agal/runtime/values/complex/Function.class.ts';
import Runtime, { defaultStack } from "agal/runtime/values/Runtime.class.ts";
import AgalError, { AgalTypeError } from 'agal/runtime/values/internal/Error.class.ts';
import StringGetter, { AgalString } from 'agal/runtime/values/primitive/String.class.ts';

export async function getModule(path: string): Promise<AgalObject> {
	const module = new AgalObject();
	const splitPath = path.split(/[\\\/]/g);
	await module.set('ruta', defaultStack, StringGetter(splitPath.slice(0, -1).join('/')));
	await module.set('archivo', defaultStack, StringGetter(splitPath.join('/')));
	await module.set('exporta', defaultStack, new AgalObject());
	await module.set('hijos', defaultStack, new AgalArray());
	await module.set(
		'requiere', defaultStack,
		AgalFunction.from(async function requiere(_name, stack, _este, path) {
			if (path instanceof AgalString)
				return await makeRequire(module, path.value, stack);
			return new AgalTypeError('Se esperaba una cadena', stack).throw();
		}).setName('modulo.requiere', defaultStack)
	);
	return module;
}

export async function getModuleScope(path: string): Promise<Environment> {
	const data = new Environment(getGlobalScope());
	const modulo = await getModule(path);
	const requiere = await modulo.get('requiere');
	data.declareVar('requiere', defaultStack, requiere, { col: 0, row: 0 });
	data.declareVar('modulo', defaultStack, modulo, { col: 0, row: 0 });
	return data;
}

export async function agal(code: string, path = 'inicio.agal', stack = defaultStack) {
	path = path.replace(/\\/g, '/');
	const parser = new Parser();
	const program = parser.produceAST(code, false, path);
	const scope = await getModuleScope(path);
	const data = await evaluate(program, scope, stack)
	if(data instanceof AgalError) return data;
	return await (data).get('exporta');
}

export async function evalLine(line: string, lineIndex: number, scope: Environment = getGlobalScope(), stack: IStack = defaultStack): Promise<[Runtime, Environment, IStack]> {
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
