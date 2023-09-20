import { ClassPropertyExtra } from "magal/frontend/ast.ts";
import AgalClass from "magal/runtime/values/complex/Class.class.ts";
import AgalFunction from "magal/runtime/values/complex/Function.class.ts";
import Runtime, { defaultStack } from "magal/runtime/values/Runtime.class.ts";
import BooleanGetter,{ AgalBoolean } from "magal/runtime/values/primitive/Boolean.class.ts";
import NumberGetter,{ AgalNumber } from "magal/runtime/values/primitive/Number.class.ts";
import StringGetter,{ AgalString } from "magal/runtime/values/primitive/String.class.ts";

const Static = [ClassPropertyExtra.Static];

// deno-lint-ignore require-await
export default async function (
	setGlobal: (
		name: string,
		value: Runtime,
		constant?: boolean,
		keyword?: boolean
	) => void,
	_setKeyword: (name: string, value: Runtime) => void
) {
	const Buleano = new AgalClass(
		'Buleano',
		{
			__constructor__: {
				meta: Static,
				value: AgalFunction.from(async function (_name, _stack, _este, arg) {
					return BooleanGetter(arg && (await arg.aBuleano()));
				}).setName('Buleano', defaultStack),
			},
		},
		undefined,
		AgalBoolean
	);
	setGlobal('Buleano', Buleano, true);

	const Numero = new AgalClass(
		'Numero',
		{
			__constructor__: {
				meta: Static,
				value: AgalFunction.from(async function (_name, _stack, _este, arg) {
					return NumberGetter(arg ? await arg.aNumero() : 0);
				}).setName('Numero', defaultStack),
			},
		},
		undefined,
		AgalNumber
	);
	setGlobal('Numero', Numero, true);

	const Cadena = new AgalClass(
		'Cadena',
		{
			__constructor__: {
				meta: Static,
				value: AgalFunction.from(async function (_name, _stack, _este, arg) {
					return StringGetter(arg ? await arg.aCadena() : '');
				}).setName('Cadena', defaultStack),
			},
		},
		undefined,
		AgalString
	);
	setGlobal('Cadena', Cadena, true);
}
