import { ClassPropertyExtra } from "agal/frontend/ast.ts";
import AgalClass from "agal/runtime/values/complex/Class.class.ts";
import AgalFunction from "agal/runtime/values/complex/Function.class.ts";
import Runtime, { defaultStack } from "agal/runtime/values/Runtime.class.ts";

const Static = [ClassPropertyExtra.Static];

export default async function (
	setGlobal: (
		name: string,
		value: Runtime,
		constant?: boolean,
		keyword?: boolean
	) => void,
	_setKeyword: (name: string, value: Runtime) => void
) {
	const { AgalBoolean, default: BooleanGetter } = await import(
		'../../values/primitive/Boolean.class.ts'
	);
	const { AgalNumber, default: NumberGetter } = await import(
		'../../values/primitive/Number.class.ts'
	);
	const { AgalString, default: StringGetter } = await import(
		'../../values/primitive/String.class.ts'
	);
	const Buleano = new AgalClass(
		'Buleano',
		{
			constructor: {
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
			constructor: {
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
			constructor: {
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
