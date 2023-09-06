import { FOREGROUND, colorize } from 'aga//colors_string/mod.ts';
import { IStack } from 'magal/runtime/interpreter.ts';
import Runtime from 'magal/runtime/values/Runtime.class.ts';
import { AgalTypeError } from "magal/runtime/values/internal/Error.class.ts";

export default abstract class Primitive extends Runtime {
	// deno-lint-ignore no-explicit-any
	value: any;
	// deno-lint-ignore require-await
	async set(name: string, stack: IStack, _value: Runtime) {
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
	toConsole(): string {
		return this.constructor.name+' '+colorize(`${this}`, FOREGROUND.YELLOW);
	}
}
