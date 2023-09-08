// deno-lint-ignore-file require-await
import { eval_complex } from 'aga//super_math/Parser.class.ts';
import AgalEval from 'magal/runtime/eval.ts';
import Runtime from 'magal/runtime/values/Runtime.class.ts';
import AgalFunction from 'magal/runtime/values/complex/Function.class.ts';
import NumberGetter from 'magal/runtime/values/primitive/Number.class.ts';
import { AgalString } from 'magal/runtime/values/primitive/String.class.ts';
import { AgalTypeError } from 'magal/runtime/values/internal/Error.class.ts';
import console from 'magal/runtime/global/functions/console.ts';

export default async function (
	setGlobal: (name: string, value: Runtime, constant?: boolean, keyword?: boolean) => void,
	_setKeyword: (name: string, value: Runtime) => void,
	_setLocal: (name: string, value: Runtime) => void
) {
	// deno-lint-ignore no-explicit-any
	setGlobal('salir', new AgalFunction(async () => Deno.exit(0)), true);
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
	setGlobal(
		'eval',
		new AgalFunction(async (_name, stack, _este, data) => {
			if (data instanceof AgalString) {
				return await AgalEval(data.value);
			}
			return new AgalTypeError(`Se esperaba una cadena.`, stack).throw();
		})
	);
	await console(setGlobal, _setKeyword);
}
