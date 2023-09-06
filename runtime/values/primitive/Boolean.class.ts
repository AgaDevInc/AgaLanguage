import type { IStack } from "magal/runtime/interpreter.ts";
import Primitive from "magal/runtime/values/primitive/Primitive.class.ts";
import Properties from "magal/runtime/values/internal/Properties.class.ts";
import { AgalTypeError } from "magal/runtime/values/internal/Error.class.ts";

const memoData = new Map();
const props = new Properties(Primitive.loadProperties());

export class AgalBoolean extends Primitive {
	value = false;
	// deno-lint-ignore require-await
	async get(name: string,stack:IStack) {
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
