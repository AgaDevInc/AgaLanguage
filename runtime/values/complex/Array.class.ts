import { colorize, FOREGROUND } from 'aga:Colors';
import parseRuntime from '../parse.ts';
import Runtime, { defaultStack } from '../Runtime.class.ts';
import Properties from '../internal/Properties.class.ts';
import NumberGetter from '../primitive/Number.class.ts';
import AgalFunction from './Function.class.ts';
import { IStack } from '../../interpreter.ts';

const ArrayProperties = new Properties(Runtime.loadProperties());
export default class AgalArray extends Runtime {
	get(name: string): Promise<Runtime> {
		return super.get(name);
	}
	async _aCadena(): Promise<string> {
		const endKey = await this.length;
		const list = [];
		for (let i = 0; i < endKey; i++) {
			list.push(
				(await this._get(`${i}`))
					? await (await this.get(`${i}`)).aConsolaEn()
					: colorize('<vacio>', FOREGROUND.GRAY)
			);
		}
		return `[${list.join(', ')}]`;
	}
	async _aConsola(): Promise<string> {
		return await this.aCadena();
	}
	async _aConsolaEn(): Promise<string> {
		return await colorize('[Lista]', FOREGROUND.CYAN);
	}
	protected async _aNumero(): Promise<number> {
		return await this.length;
	}
	protected async _aIterable() {
		const length = await this.length;
		const list = [];
		for (let i = 0; i < length; i++) list.push(await this.get(`${i}`));
		return list;
	}
	get length(): Promise<number> {
		return new Promise(resolve => {
			(async () => {
				const length = (await this.keys())
					.map(k => parseInt(k) ?? -1)
					.reduce((a, b) => Math.max(a, b), -1);
				resolve(length + 1);
			})();
		});
	}
	static from(list: unknown[]) {
		const l = new AgalArray();
		for (let i = 0; i < list.length; i++)
			l.set(`${i}`, defaultStack, parseRuntime(defaultStack, list[i]));
		return l;
	}
	static loadProperties(): Properties {
		return ArrayProperties;
	}
	static async getProperty(name: string, este: Runtime): Promise<Runtime | null> {
		const maxIndex = (await este.keys())
			.map(k => parseInt(k) ?? -1)
			.reduce((a, b) => Math.max(a, b), -1);
		const length = maxIndex + 1;
		if (name === 'largo') return NumberGetter(length);
		if (name === 'agregar')
			return await ArrayProperties.set(
				'agregar',
				new AgalFunction(
					async (_name: string, stack: IStack, este: Runtime, ...args: Runtime[]) => {
						for (let i = 0; i < args.length; i++) await este.set(`${length + i}`, stack, args[i]);
						return este;
					}
				).setName('Lista().agregar', defaultStack)
			);
		return null;
	}
}
