import NumberGetter from 'magal/runtime/values/primitive/Number.class.ts';
import Primitive from 'magal/runtime/values/primitive/Primitive.class.ts';
import Properties from 'magal/runtime/values/internal/Properties.class.ts';
import { AgalTypeError } from 'magal/runtime/values/internal/Error.class.ts';
import Runtime, { defaultStack } from 'magal/runtime/values/Runtime.class.ts';
import AgalFunction from 'magal/runtime/values/complex/Function.class.ts';
import parseRuntime from 'magal/runtime/values/parse.ts';

const memoData = new Map();
const StringProperties = new Properties(Primitive.loadProperties());

export class AgalString extends Primitive {
	constructor(public readonly value: string) {
		super();
	}
	public toString() {
		return this.value;
	}
	protected _aBuleano(): Promise<boolean> {
		return Promise.resolve(this.value.length > 0);
	}
	protected _aNumero() {
		return Promise.resolve(this.value.length);
	}
	protected _aIterable(): Promise<Runtime[]> {
		return Promise.resolve(this.value.split('').map(char => StringGetter(char)));
	}
	_aConsola(): Promise<string> {
		return Promise.resolve(this.value);
	}
	_aConsolaEn(): Promise<string> {
		return Promise.resolve(JSRuntime.inspect(this.value));
	}
	static loadProperties() {
		return StringProperties;
	}
	static async getProperty(name: string, este: AgalString): Promise<Runtime | null> {
		if (name === 'largo') return NumberGetter(este.value.length);
		if (name === 'mayusculas') return StringGetter(este.value.toUpperCase());
		if (name === 'minusculas') return StringGetter(este.value.toLowerCase());
		if (name === 'invertido') return StringGetter(este.value.split('').reverse().join(''));
		if (name === 'separar')
			return await StringProperties.set(
				'separar',
				// deno-lint-ignore require-await
				AgalFunction.from(async (_name, stack, _este, spliter) => {
					if (spliter instanceof AgalString) {
						const splited = este.value.split(spliter.value);
						return parseRuntime(stack, splited);
					} else return new AgalTypeError('El separador debe ser una cadena', stack).throw();
				}).setName('Cadena().separar', defaultStack)
			);
		if (/^[0-9]+$/.test(name)) return StringGetter(este.value[parseInt(name)]);
		return null;
	}
}

export default function StringGetter(string: string): AgalString {
	if (memoData.has(string)) {
		return memoData.get(string);
	}
	const agaString = new AgalString(string);
	memoData.set(string, agaString);
	return agaString;
}
