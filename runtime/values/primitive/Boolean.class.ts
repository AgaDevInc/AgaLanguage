import type { IStack } from "../../interpreter.ts";
import Properties from "../internal/Properties.class.ts";
import Primitive from './Primitive.class.ts';

const memoData = new Map();
const props = new Properties(Primitive.loadProperties());

export class AgalBoolean extends Primitive {
	value = false;
	async get(name: string,stack:IStack) {
		const AgalTypeError = (await import('../internal/Error.class.ts'))
			.AgalTypeError;
		const error = new AgalTypeError(
			`No se puede leer la propiedad '${name}' de ${this}`,stack
		).throw();
		return error;
	}
	toString() {
		return this.value ? 'cierto' : 'falso';
	}
	protected _aNumero() {
		return Promise.resolve(this.value ? 1 : 0);
	}
	protected _aBuleano(): Promise<boolean> {
		return Promise.resolve(this.value);
	}
	static loadProperties() {
		return props;
	}
}

export default function BooleanGetter(boolean: boolean): AgalBoolean {
	if (memoData.has(boolean)) {
		return memoData.get(boolean);
	}
	const booleanRuntime = new AgalBoolean();
	booleanRuntime.value = boolean;
	memoData.set(boolean, booleanRuntime);
	return booleanRuntime;
}
