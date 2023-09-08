import Inspecteable from 'aga//util/Inspectable.class.ts';
import type { LikeNumber } from 'aga//super_math/types.d.ts';
import { FOREGROUND, colorize } from 'aga//colors_string/mod.ts';
import type { Stmt } from 'magal/frontend/ast.ts';
import type { IStack } from 'magal/runtime/interpreter.ts';
import Properties from 'magal/runtime/values/internal/Properties.class.ts';
import AgalArray from 'magal/runtime/values/complex/Array.class.ts';
import AgalFunction from 'magal/runtime/values/complex/Function.class.ts';
import { AgalTypeError } from 'magal/runtime/values/internal/Error.class.ts';
import AgalBoolean from 'magal/runtime/values/primitive/Boolean.class.ts';
import AgalNull from 'magal/runtime/values/primitive/Null.class.ts';
import AgalNumber from 'magal/runtime/values/primitive/Number.class.ts';
import AgalString from 'magal/runtime/values/primitive/String.class.ts';

const RootProperties = Properties.getRoot();

export const defaultStack: IStack = {
	value: null as unknown as Stmt,
	next: null,
};
export default class Runtime extends Inspecteable {
	#props: Properties;
	constructor() {
		super();
		this.#props = new Properties(this.type.loadProperties());
	}
	instanceof(type: Properties): boolean {
		return this.#props.is(type);
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
	setSync<R extends Runtime>(name: string, value: R): R;
	setSync(name: string, value: Runtime): Runtime;
	setSync(name: string, value: Runtime): Runtime {
		return this.#props.set(name, value);
	}
	getSync(name: string): Runtime | null {
		return this.#props.get(name);
	}
	async get(name: string, _stack: IStack = defaultStack): Promise<Runtime> {
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
	deepKeys(): string[] {
		return this.#props.deepKeys();
	}
	keysSync(): string[] {
		return this.#props.keys();
	}
	keys(): Promise<string[]> {
		return Promise.resolve(this.#props.keys());
	}
	// deno-lint-ignore require-await
	async call(name: string, stack: IStack, ..._args: Runtime[]): Promise<Runtime> {
		return new AgalTypeError(`'${name}' no es una función válida.`, stack).throw();
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
	toString(){
		return `[${this.type.name}]`;
	}
}
