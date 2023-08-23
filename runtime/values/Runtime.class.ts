import { FOREGROUND, colorize } from 'aga:Colors';
import Properties from './internal/Properties.class.ts';
import type { IStack } from '../interpreter.ts';
import type { Stmt } from '../../frontend/ast.ts';

const RootProperties = Properties.getRoot();

export const defaultStack: IStack = {
	value: null as unknown as Stmt,
	next: null,
};

export default class Runtime {
	#props: Properties;
	constructor() {
		this.#props = new Properties(this.type.getProperties());
	}
	protected async _set(name: string, value: Runtime | Promise<Runtime>) {
		const data = await Promise.resolve(value);
		this.#props.set(name, data);
		return data;
	}
	protected async _get(name: string): Promise<Runtime | null> {
		const data = await Promise.resolve(this.#props.get(name));
		if (data) return data;
		return await this.type.loadProperties(name);
	}
	async get(name: string, _stack: IStack = defaultStack): Promise<Runtime> {
		return (
			(await this._get(name)) ||
			(await import('./primitive/Null.class.ts')).default
		);
	}
	set<R extends Runtime>(
		name: string,
		stack: IStack,
		value: R | Promise<R>
	): Promise<R>;
	set(
		name: string,
		stack: IStack,
		value: Runtime | Promise<Runtime>
	): Promise<Runtime>;
	async set(
		name: string,
		_stack: IStack,
		value: Runtime | Promise<Runtime>
	): Promise<Runtime> {
		return await this._set(name, value);
	}
	has(name: string): Promise<boolean> {
		return Promise.resolve(this.#props.has(name));
	}
	keys(): Promise<string[]> {
		return Promise.resolve(this.#props.keys());
	}
	async call(
		name: string,
		stack: IStack,
		..._args: Runtime[]
	): Promise<Runtime> {
		return new (await import('./internal/Error.class.ts')).AgalTypeError(
			`'${name}' no es una función válida.`,
			stack
		).throw();
	}
	protected _aCadena(): Promise<string> {
		return Promise.resolve('[valor en tiempo de ejecución]');
	}
	async aCadena(): Promise<string> {
		const strfn = await this._get('aCadena');
		const strdef = await RootProperties.get('aCadena');
		if (!strfn || strfn === strdef) return this._aCadena();
		return await (await strfn.call('aCadena', defaultStack, this)).aCadena();
	}
	protected async _aConsola(): Promise<string> {
		return colorize(await this.aCadena(), FOREGROUND.MAGENTA);
	}
	async aConsola(): Promise<string> {
		const strfn = await this._get('aConsola');
		const strdef = await RootProperties.get('aConsola');
		if (!strfn || strfn === strdef) return this._aConsola();
		return await (await strfn.call('aConsola', defaultStack, this)).aCadena();
	}
	protected _aConsolaEn(): Promise<string> {
		return this.aConsola();
	}
	async aConsolaEn(): Promise<string> {
		const strfn = await this._get('aConsolaEn');
		const strdef = await RootProperties.get('aConsolaEn');
		if (!strfn || strfn === strdef) return this._aConsolaEn();
		return await (await strfn.call('aConsolaEn', defaultStack, this)).aCadena();
	}
	get type() {
		return this.constructor as typeof Runtime;
	}
	setProperties(properties: Properties) {
		this.#props = properties;
		return this;
	}
	static getProperties() {
		return RootProperties;
	}
	static async loadProperties(name: string): Promise<Runtime | null> {
		const AgalFunction = (await import('./complex/Function.class.ts')).default;
		const AgalString = (await import('./primitive/String.class.ts')).default;
		if (name === 'aCadena')
			return await RootProperties.set(
				'aCadena',
				new AgalFunction(async (_, __, este) =>
					AgalString(await este._aCadena())
				)
			);
		if (name === 'aConsola')
			return await RootProperties.set(
				'aConsola',
				new AgalFunction(async (_, __, este) =>
					AgalString(await este._aConsola())
				)
			);
		if (name === 'aConsolaEn')
			return await RootProperties.set(
				'aConsolaEn',
				new AgalFunction(async (_, __, este) =>
					AgalString(await este._aConsolaEn())
				)
			);
		return null;
	}
}
