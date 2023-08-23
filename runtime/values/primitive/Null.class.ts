import type { IStack } from '../../interpreter.ts';
import Runtime from '../Runtime.class.ts';
import Primitive from './Primitive.class.ts';

export class AgalNull extends Primitive {
	value = null;
	async get(name: string, stack: IStack) {
		const AgalTypeError = (await import('../internal/Error.class.ts'))
			.AgalTypeError;
		const error = new AgalTypeError(
			`No se puede leer la propiedad '${name}' de ${this}`,
			stack
		).throw();
		return error;
	}
	async set(name: string, stack: IStack, _value: Runtime) {
		const AgalTypeError = (await import('../internal/Error.class.ts'))
			.AgalTypeError;
		const error = new AgalTypeError(
			`No se puede asignar la propiedad '${name}' de ${this}`,
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
