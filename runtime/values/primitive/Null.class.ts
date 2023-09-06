import type { IStack } from 'magal/runtime/interpreter.ts';
import Primitive from "magal/runtime/values/primitive/Primitive.class.ts";
import { AgalTypeError } from "magal/runtime/values/internal/Error.class.ts";

export class AgalNull extends Primitive {
	value = null;
	// deno-lint-ignore require-await
	async get(name: string, stack: IStack) {
		const error = new AgalTypeError(
			`No se puede leer la propiedad '${name}' de ${this}`,
			stack
		).throw();
		return error;
	}
	toString() {
		return 'nulo';
	}
}

export const AgalVoid = new AgalNull();
AgalVoid.toString = () => 'nada';
export default new AgalNull();
