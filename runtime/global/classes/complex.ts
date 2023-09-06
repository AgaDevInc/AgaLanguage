import AgalEval from "magal/runtime/eval.ts";
import parseRuntime from "magal/runtime/values/parse.ts";
import { ClassPropertyExtra } from "magal/frontend/ast.ts";
import AgalArray from "magal/runtime/values/complex/Array.class.ts";
import AgalClass from "magal/runtime/values/complex/Class.class.ts";
import AgalFunction from "magal/runtime/values/complex/Function.class.ts";
import { AgalString } from "magal/runtime/values/primitive/String.class.ts";
import { AgalTypeError } from "magal/runtime/values/internal/Error.class.ts";
import Runtime, { defaultStack } from "magal/runtime/values/Runtime.class.ts";

const Static = [ClassPropertyExtra.Static]

export default function (
	setGlobal: (
		name: string,
		value: Runtime,
		constant?: boolean,
		keyword?: boolean
	) => void,
	_setKeyword: (name: string, value: Runtime) => void
) {
	const Lista = new AgalClass('Lista', {
		constructor: {
			meta: Static,
			value:AgalFunction.from(function (_name, _stack, _este,) {
				return Promise.resolve(new AgalArray());
			}).setName('Lista', defaultStack),
		},
		de: {
			meta: Static,
			value: AgalFunction.from(function (_name, _stack, _este, ...args) {
				return Promise.resolve(AgalArray.from(args));
			}).setName('Lista.de', defaultStack),
		}
	}, undefined, AgalArray);
	setGlobal('Lista', Lista, true);
	const Funcion = new AgalClass('Funcion', {
		constructor: {
			meta: Static,
			// deno-lint-ignore require-await
			value:AgalFunction.from(async function (_name, _stack, _este, ...argums) {
				const [code, ...args] = argums.reverse();
				if(!code) return new AgalTypeError('No se ha especificado el codigo de la funcion', _stack).throw();
				const validCode = code instanceof AgalString;
				if(!validCode) return new AgalTypeError('El codigo de la funcion debe ser un texto', _stack).throw();
				const validArgs = args.every(arg => arg instanceof AgalString);
				if(!validArgs) return new AgalTypeError('Los argumentos de la funcion deben ser textos', _stack).throw();
				return AgalEval(`fn funcion(${args.join(',')}){ ${code} }`)
			}).setName('Funcion', defaultStack),
		}
	}, undefined, AgalFunction);
	setGlobal('Funcion', Funcion, true);
	const Objeto = new AgalClass('Objeto', {
		llaves: {
			meta: Static,
			value: AgalFunction.from(async function (_name, _stack, _este, obj) {
				const keys = await obj.keys();
				return parseRuntime(defaultStack, keys);
			}).setName('Objeto.llaves', defaultStack),
		}
	}, undefined, AgalClass);
	setGlobal('Objeto', Objeto, true);
}
