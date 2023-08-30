import { FOREGROUND, colorize } from 'aga:Colors';
import Properties from './internal/Properties.class.ts';
import type { IStack } from '../interpreter.ts';
import type { Stmt } from '../../frontend/ast.ts';
import type { LikeNumber } from 'aga:ComplexMath/types';

const RootProperties = Properties.getRoot();

export const defaultStack: IStack = {
	value: null as unknown as Stmt,
	next: null,
};
export default class Runtime {
	#props: Properties;
	constructor() {
		this.#props = new Properties(this.type.loadProperties());
	}
	protected async _set(name: string, value: Runtime | Promise<Runtime>) {
		const data = await Promise.resolve(value);
		this.#props.set(name, data);
		return data;
	}
	protected async _get(name: string): Promise<Runtime | null> {
		const data = await Promise.resolve(this.#props.get(name));
		if (data) return data;
		return await this.type.getProperty(name, this);
	}
	async get(name: string, _stack: IStack = defaultStack): Promise<Runtime> {
		const AgalNull = (await import('./primitive/Null.class.ts')).default;
		return (await this._get(name)) || AgalNull;
	}
	set<R extends Runtime>(name: string, stack: IStack, value: R | Promise<R>): Promise<R>;
	set(name: string, stack: IStack, value: Runtime | Promise<Runtime>): Promise<Runtime>;
	async set(name: string, _stack: IStack, value: Runtime | Promise<Runtime>): Promise<Runtime> {
		return await this._set(name, value);
	}
	has(name: string): Promise<boolean> {
		return Promise.resolve(this.#props.has(name));
	}
	keys(): Promise<string[]> {
		return Promise.resolve(this.#props.keys());
	}
	async call(name: string, stack: IStack, ..._args: Runtime[]): Promise<Runtime> {
		const {AgalTypeError} = await import('./internal/Error.class.ts');
		return new AgalTypeError(
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
	protected _aBuleano(): Promise<boolean> {
		return Promise.resolve(true);
	}
	async aBuleano(): Promise<boolean> {
		const strfn = await this._get('aBuleano');
		const strdef = await RootProperties.get('aBuleano');
		if (!strfn || strfn === strdef) return this._aBuleano();
		return await (await strfn.call('aBuleano', defaultStack, this)).aBuleano();
	}
	protected _aNumero(): Promise<LikeNumber> {
		return Promise.resolve(0);
	}
	async aNumero(): Promise<LikeNumber> {
		const strfn = await this._get('aNumero');
		const strdef = await RootProperties.get('aNumero');
		if (!strfn || strfn === strdef) return this._aNumero();
		return await (await strfn.call('aNumero', defaultStack, this)).aNumero();
	}
	protected _aIterable(): Promise<Runtime[]> {
		return Promise.resolve([]);
	}
	async aIterable(): Promise<Runtime[]> {
		const strfn = await this._get('aIterable');
		const strdef = await RootProperties.get('aIterable');
		if (!strfn || strfn === strdef) return this._aIterable();
		return await (await strfn.call('aIterable', defaultStack, this)).aIterable();
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
	static loadProperties() {
		return RootProperties;
	}
	static async getProperty(name: string, _este: Runtime): Promise<Runtime | null> {
		const AgalFunction = (await import('./complex/Function.class.ts')).default;
		const AgalString = (await import('./primitive/String.class.ts')).default;
		const AgalNumber = (await import('./primitive/Number.class.ts')).default;
		const AgalBoolean = (await import('./primitive/Boolean.class.ts')).default;
		const AgalArray = (await import('./complex/Array.class.ts')).default;

		if (name === 'aBuleano')
			return await RootProperties.set(
				'aBuleano',
				new AgalFunction(async (_, __, este) => AgalBoolean(await este._aBuleano())).setName(
					'aBuleano',
					defaultStack
				)
			);
		if (name === 'aNumero')
			return await RootProperties.set(
				'aNumero',
				new AgalFunction(async (_, __, este) => AgalNumber(await este._aNumero())).setName(
					'aNumero',
					defaultStack
				)
			);
		if (name === 'aIterable')
			return await RootProperties.set(
				'aIterable',
				new AgalFunction(async (_, __, este) => AgalArray.from(await este._aIterable())).setName(
					'aIterable',
					defaultStack
				)
			);
		if (name === 'aCadena')
			return await RootProperties.set(
				'aCadena',
				new AgalFunction(async (_, __, este) => AgalString(await este._aCadena())).setName(
					'aCadena',
					defaultStack
				)
			);
		if (name === 'aConsola')
			return await RootProperties.set(
				'aConsola',
				new AgalFunction(async (_, __, este) => AgalString(await este._aConsola())).setName(
					'aConsola',
					defaultStack
				)
			);
		if (name === 'aConsolaEn')
			return await RootProperties.set(
				'aConsolaEn',
				new AgalFunction(async (_, __, este) => AgalString(await este._aConsolaEn())).setName(
					'aConsolaEn',
					defaultStack
				)
			);
		return null;
	}
}
