import { colorize, FOREGROUND } from 'aga//colors_string/mod.ts';
import { IStack } from 'magal/runtime/interpreter.ts';
import parseRuntime from 'magal/runtime/values/parse.ts';
import NumberGetter from 'magal/runtime/values/primitive/Number.class.ts';
import AgalFunction from 'magal/runtime/values/complex/Function.class.ts';
import Properties from 'magal/runtime/values/internal/Properties.class.ts';
import Runtime, { defaultStack } from 'magal/runtime/values/Runtime.class.ts';

export type Listable<T> = {
	[key: number]: T;
	length: number;
};
const ArrayProperties = new Properties(Runtime.loadProperties());
export default class AgalArray extends Runtime {
	protected async _aCadena(): Promise<string> {
		const endKey = await this.length;
		const list = [];
		for (let i = 0; i < endKey && i < 100; i++) {
			list.push(
				(await this._get(`${i}`))
					? await (await this.get(`${i}`)).aConsolaEn()
					: colorize('<vacio>', FOREGROUND.GRAY)
			);
		}
		return `[${list.join(', ')}]`;
	}
	protected async _aConsola(): Promise<string> {
		return await this.aCadena();
	}
	protected async _aConsolaEn(): Promise<string> {
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
	get length(): number {
		const length = this.keysSync()
			.map(k => parseInt(k) ?? -1)
			.reduce((a, b) => Math.max(a, b), -1);
		return length + 1;
	}
	static from(list: Listable<unknown>) {
		const l = new AgalArray();
		for (let i = 0; i < list.length; i++) l.setSync(`${i}`, parseRuntime(defaultStack, list[i]));
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
				new AgalFunction((_name: string, _stack: IStack, este: Runtime, ...args: Runtime[]) => {
					for (let i = 0; i < args.length; i++) este.setSync(`${length + i}`, args[i]);
					return Promise.resolve(este);
				}).setName('Lista().agregar', defaultStack)
			);
		if (name === 'empujar')
			return await ArrayProperties.set(
				'empujar' /* is how Array().unshift() */,
				new AgalFunction((_name: string, _stack: IStack, este: Runtime, ...args: Runtime[]) => {
					const argsLength = args.length;
					for (let i = 1; i <= length; i++)
						este.setSync(`${length + argsLength - i}`, este.getSync(`${length - i}`)!);
					for (let i = 0; i < argsLength; i++) este.setSync(`${i}`, args[i]);
					return Promise.resolve(este);
				}).setName('Lista().empujar', defaultStack)
			);
		return super.getProperty(name, este);
	}
	toConsole(): string {
		return colorize(`[Agal ${this.type.name}]`, FOREGROUND.CYAN);
	}
	iter() {
		// deno-lint-ignore no-this-alias
		const self = this;
		return {
			[Symbol.iterator]: function* () {
				const length = self.length;
				for (let i = 0; i < length; i++) yield self.getSync(`${i}`)!;
			},
		};
	}
}
