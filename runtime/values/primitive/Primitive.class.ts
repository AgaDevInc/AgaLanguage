import { FOREGROUND, colorize } from 'aga//colors_string/mod.ts';
import { IStack } from 'agal/runtime/interpreter.ts';
import Runtime from 'agal/runtime/values/Runtime.class.ts';

export default abstract class Primitive extends Runtime {
	// deno-lint-ignore no-explicit-any
	value: any;
	async set(name: string, stack: IStack, _value: Runtime) {
		const AgalTypeError = (await import('../internal/Error.class.ts')).AgalTypeError;
		const error = new AgalTypeError(
			`No se puede asignar la propiedad '${name}' de ${this}`,
			stack
		).throw();
		return error;
	}
	_aCadena(): Promise<string> {
		return Promise.resolve(`${this}`);
	}
	async _aConsola(): Promise<string> {
		return colorize(await this.aCadena(), FOREGROUND.YELLOW);
	}
	toString(): string {
		return `${this.value}`;
	}
}
