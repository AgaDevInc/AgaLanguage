import AgaError from '../../Errors.ts';
import { ExtendsRuntimeValue, IRuntimeValue, Properties } from './internal.ts';
import { FOREGROUND, colorize } from 'aga:Colors';

export default class RuntimeValue implements ExtendsRuntimeValue {
	properties: Properties;
	constructor() {
		const maker = this.constructor as typeof RuntimeValue;
		const father = maker.proto;
		this.properties = new Properties(father);
	}
	aCadena(): Promise<string> {
		return Promise.resolve('[RuntimeValue]')
	}
	async aConsola(): Promise<string> {
		return colorize(await this.aCadena(), FOREGROUND.MAGENTA)
	}
  get(key: string) {
    return Promise.resolve(this.properties.get(key));
  }
  set(key: string, value: RuntimeValue) {
    this.properties.set(key, value);
  } 
	execute(_args: IRuntimeValue[], col: number, row: number, _este?: IRuntimeValue): Promise<ExtendsRuntimeValue | null> {
		new AgaError('Error', col, row, 'El valor no es ejecutable').throw();
		return Promise.resolve(null);
	}
	protected static proto: Properties = new Properties(null, [
		[
			'aCadena',
			function (this: RuntimeValue) {
				return Promise.resolve(this.aCadena());
			},
		],
		[
			'aConsola',
			function (this: RuntimeValue) {
				return Promise.resolve(this.aConsola());
			},
		],
	]);
}
