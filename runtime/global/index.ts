// deno-lint-ignore-file no-explicit-any require-await
import { eval_complex } from 'aga//super_math/Parser.class.ts';
import AgalEval from "agal/runtime/eval.ts";
import Environment from "agal/runtime/Environment.class.ts";
import tipoDe from "agal/runtime/values/primitive/tipoDe.ts";
import AgalArray from "agal/runtime/values/complex/Array.class.ts";
import NullClass from "agal/runtime/values/primitive/Null.class.ts";
import AgalObject from "agal/runtime/values/complex/Object.class.ts";
import Primitive from "agal/runtime/values/primitive/Primitive.class.ts";
import AgalFunction from "agal/runtime/values/complex/Function.class.ts";
import BooleanGetter from "agal/runtime/values/primitive/Boolean.class.ts";
import { AgalString } from "agal/runtime/values/primitive/String.class.ts";
import Runtime, { defaultStack } from "agal/runtime/values/Runtime.class.ts";
import AgalError, { AgalTypeError } from "agal/runtime/values/internal/Error.class.ts";

const scope = new Environment();
const global = new AgalObject();

// keywords
setKeyword('cierto', BooleanGetter(true));
setKeyword('falso', BooleanGetter(false));
setKeyword('nulo', NullClass);
setKeyword('este', global);
setKeyword(
	'tipoDe',
	new AgalFunction(async (_name, stack, _este, data) => {
		if (!data)
			return new AgalTypeError(`Se esperaba un valor y no se recibió ninguno.`, stack).throw();
		if (data instanceof Primitive) return new AgalString(tipoDe(data));
		if (data instanceof AgalObject) return new AgalString('objeto');
		if (data instanceof AgalFunction) return new AgalString('función');
		if (data instanceof AgalArray) return new AgalString('lista');
		if (data instanceof AgalError) return new AgalString('error');
		return await new AgalString('desconocido');
	})
);
setKeyword(
	'lanzar',
	new AgalFunction(async (_name, stack, _este, data) => {
		if (!data)
			return new AgalTypeError(`Se esperaba un valor y no se recibió ninguno.`, stack).throw();
		if (data instanceof AgalError) return data.throw();
		return new AgalError('Lanzado', await data.aConsolaEn(), stack).throw();
	})
);

// variables
setGlobal('global', global, true);
setGlobal('esteGlobal', global, true);

setGlobal('salir', new AgalFunction(async () => Deno.exit(0)), true);
setGlobal(
	'pintar',
	new AgalFunction(async (_name, _stack, _este, ...args) => {
		const data = [];
		for (const arg of args) data.push(await arg.aConsola());
		console.log(...data);
	})
);
setGlobal(
	'analizar',
	new AgalFunction(async (_name, stack, _este, data) => {
		if (data instanceof AgalString) {
			try {
				const number = eval_complex(data.value, {});
				if (Array.isArray(number)) return NumberGetter(number[0]);
				else return NumberGetter(number);
			} catch (_e) {
				return new AgalTypeError(`No se pudo analizar la cadena '${data.value}'`, stack).throw();
			}
		}
		return new AgalTypeError(`Se esperaba una cadena.`, stack).throw();
	}),
	true
);
setGlobal('limpiar', new AgalFunction(async () => console.clear()));
setGlobal(
	'eval',
	new AgalFunction(async (_name, stack, _este, data) => {
		if (data instanceof AgalString) {
			return await AgalEval(data.value);
		}
		return new AgalTypeError(`Se esperaba una cadena.`, stack).throw();
	})
);

function setGlobal(name: string, value: Runtime, constant = false, keyword = false) {
	if (value instanceof AgalFunction) value.setName(`<agal>.${name}`, defaultStack);
	global.set(name, defaultStack, value);
	scope.declareVar(name, defaultStack, value, { col: 0, row: 0, constant, keyword });
}
function setKeyword(name: string, value: any) {
	scope.declareVar(name, defaultStack, value, {
		col: 0,
		row: 0,
		constant: true,
		keyword: true,
	});
}

import classes from './classes/index.ts';
import NumberGetter from '../values/primitive/Number.class.ts';
await classes(setGlobal, setKeyword);

export default function getGlobalScope(): Environment {
	return scope;
}
