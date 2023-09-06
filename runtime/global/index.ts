// deno-lint-ignore-file require-await
import Environment from 'magal/runtime/Environment.class.ts';
import tipoDe from 'magal/runtime/values/primitive/tipoDe.ts';
import AgalArray from 'magal/runtime/values/complex/Array.class.ts';
import NullClass from 'magal/runtime/values/primitive/Null.class.ts';
import AgalObject from 'magal/runtime/values/complex/Object.class.ts';
import Primitive from 'magal/runtime/values/primitive/Primitive.class.ts';
import AgalFunction from 'magal/runtime/values/complex/Function.class.ts';
import BooleanGetter from 'magal/runtime/values/primitive/Boolean.class.ts';
import StringGetter from 'magal/runtime/values/primitive/String.class.ts';
import Runtime, { defaultStack } from 'magal/runtime/values/Runtime.class.ts';
import AgalError, { AgalTypeError } from 'magal/runtime/values/internal/Error.class.ts';

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
		if (data instanceof Primitive) return StringGetter(tipoDe(data));
		if(data instanceof AgalObject) return StringGetter('objeto');
		if(data instanceof AgalFunction) return StringGetter('funcion');
		if(data instanceof AgalArray) return StringGetter('lista');
		if(data instanceof AgalError) return StringGetter('error');
		return StringGetter('desconocido');
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
setKeyword(
	'instanciaDe',
	new AgalFunction(async (_name, stack, _este, data, tipo) => {
		if (!data)
			return new AgalTypeError(`Se esperaba un valor y no se recibió ninguno.`, stack).throw();
		if (!tipo)
			return new AgalTypeError(`Se esperaba un tipo y no se recibió ninguno.`, stack).throw();
		if (tipo instanceof AgalClass) return BooleanGetter(tipo.isInstance(data));
		return BooleanGetter(false);
	})
);

// variables
setGlobal('global', global, true);
setGlobal('esteGlobal', global, true);

function setGlobal(name: string, value: Runtime, constant = false, keyword = false) {
	if (value instanceof AgalFunction) value.setName(`<agal>.${name}`, defaultStack);
	global.set(name, defaultStack, value);
	scope.declareVar(name, defaultStack, value, { col: 0, row: 0, constant, keyword });
}
function setKeyword(name: string, value: Runtime) {
	if (value instanceof AgalFunction) value.setName(`<agal>.${name}`, defaultStack);
	scope.declareVar(name, defaultStack, value, {
		col: 0,
		row: 0,
		constant: true,
		keyword: true,
	});
}
function setLocal(name: string, value: Runtime) {
	scope.declareVar(name, defaultStack, value, { col: 0, row: 0, constant: true });
}

import classes from 'magal/runtime/global/classes/index.ts';
await classes(setGlobal, setKeyword, setLocal);
import functions from 'magal/runtime/global/functions/index.ts';
import AgalClass from "magal/runtime/values/complex/Class.class.ts";
await functions(setGlobal, setKeyword, setLocal);

export default function getGlobalScope(): Environment {
	return scope;
}
