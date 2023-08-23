import Runtime, { defaultStack } from '../Runtime.class.ts';
import { AgalTypeError } from '../internal/Error.class.ts';
import Properties from '../internal/Properties.class.ts';
import NumberGetter from './Number.class.ts';
import Primitive from './Primitive.class.ts';

const memoData = new Map();
const StringProperties = new Properties(Primitive.loadProperties());

export class AgalString extends Primitive {
	constructor(public readonly value: string) {
		super();
	}
	public toString() {
		return this.value;
	}
	_aConsola(): Promise<string> {
		return Promise.resolve(this.value);
	}
	_aConsolaEn(): Promise<string> {
		return Promise.resolve(Deno.inspect(this.value, { colors: true }));
	}
	static loadProperties() {
		return StringProperties;
	}
	static async getProperty(
		name: string,
		este: AgalString
	): Promise<Runtime | null> {
		const AgalFunction = (await import('../complex/Function.class.ts')).default;
		if (name === 'largo') return NumberGetter(este.value.length);
		if (name === 'mayusculas') return StringGetter(este.value.toUpperCase());
		if (name === 'minusculas') return StringGetter(este.value.toLowerCase());
		if (name === 'invertido')
			return StringGetter(este.value.split('').reverse().join(''));
		if (name === 'separar')
		return await StringProperties.set(
			'separar',
			AgalFunction.from(async (_name, stack, _este, spliter) => {
				if (spliter instanceof AgalString) {
					const splited = este.value.split(spliter.value);
					return (await import('../parse.ts')).default(stack, splited);
				} else
					return new AgalTypeError(
						'El separador debe ser una cadena',
						stack
					).throw();
			}).setName('Cadena().separar', defaultStack)
		);
		if(/^[0-9]+$/.test(name))
			return StringGetter(este.value[parseInt(name)]);
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
