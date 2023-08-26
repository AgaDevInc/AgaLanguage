// deno-lint-ignore-file no-explicit-any
import Environment from '../Environment.class.ts';
import AgalEval from '../eval.ts';
import Runtime, { defaultStack } from "../values/Runtime.class.ts";
import AgalArray from '../values/complex/Array.class.ts';
import AgalFunction from '../values/complex/Function.class.ts';
import AgalObject from '../values/complex/Object.class.ts';
import { AgalTypeError } from '../values/internal/Error.class.ts';
import BooleanGetter from '../values/primitive/Boolean.class.ts';
import NullClass from '../values/primitive/Null.class.ts';
import Primitive from '../values/primitive/Primitive.class.ts';
import { AgalString } from '../values/primitive/String.class.ts';
import tipoDe from '../values/primitive/tipoDe.ts';

const scope = new Environment();
const global = new AgalObject();

// keywords
setKeyword('verdadero', BooleanGetter(true));
setKeyword('falso', BooleanGetter(false));
setKeyword('nulo', NullClass);
setKeyword('este', global);

// variables
setGlobal('global', global, true);
setGlobal('esteGlobal', global, true);

// deno-lint-ignore require-await
setGlobal('salir', new AgalFunction(async () => Deno.exit(0)), true);
setGlobal(
	'pintar',
	new AgalFunction(async (_name, _stack, _este, ...args) => {
		const data = [];
		for (const arg of args) data.push(await arg.aConsola());
		console.log(...data);
		return Promise.resolve(NullClass);
	})
);
setGlobal(
	'limpiar',
	new AgalFunction(() => {
		console.clear()
		return Promise.resolve(NullClass);
	})
);
setGlobal(
	'tipoDe',
	new AgalFunction(async (_name, stack, _este, data) => {
		if (!data)
			return new AgalTypeError(
				`Se esperaba un valor y no se recibió ninguno.`,
				stack
			).throw();
		if (data instanceof Primitive) return new AgalString(tipoDe(data));
		if (data instanceof AgalObject) return new AgalString('objeto');
		if (data instanceof AgalFunction) return new AgalString('función');
		if (data instanceof AgalArray) return new AgalString('lista');
		return await new AgalString('desconocido');
	}),
	true,
	true
);
setGlobal(
	'eval',
	new AgalFunction(async (_name,stack, _este, data) => {
		if (data instanceof AgalString) {
			return await AgalEval(data.value);
		}
		return new AgalTypeError(`Se esperaba una cadena.`,stack).throw();
	})
);

function setGlobal(
	name: string,
	value: Runtime,
	constant = false,
	keyword = false
) {
	if(value instanceof AgalFunction) value.setName(`<agal>.${name}`, defaultStack);
	global.set(name,defaultStack, value);
	scope.declareVar(name,defaultStack, value, { col: 0, row: 0, constant, keyword });
}
function setKeyword(name: string, value: any) {
	scope.declareVar(name, defaultStack, value, {
		col: 0,
		row: 0,
		constant: true,
		keyword: true,
	});
}

import classes from './classes.ts';classes(setGlobal, setKeyword)

export default function getGlobalScope(): Environment {
	return scope;
}
