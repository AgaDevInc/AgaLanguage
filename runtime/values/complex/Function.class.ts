import { colorize, FOREGROUND } from 'aga:Colors';
import type { FunctionDeclaration } from '../../../frontend/ast.ts';
import Environment from '../../Environment.class.ts';
import Runtime, { defaultStack } from '../Runtime.class.ts';
import { AgalReferenceError } from '../internal/Error.class.ts';
import Properties from '../internal/Properties.class.ts';
import StringGetter from '../primitive/String.class.ts';
import { AgalVoid } from '../primitive/Null.class.ts';
import { IStack } from "../../interpreter.ts";

const defaultDeclaration: FunctionDeclaration = {
	col: 0,
	row: 0,
	body: [],
	identifier: '',
	kind: 'FunctionDeclaration',
	params: [],
	string: '',
	file: '',
};
const defaultEnv = new Environment();
let use = false;
const fnProperties = new Properties(Runtime.loadProperties());

export type TFunction = (
	name: string,
	stack: IStack,
	este: Runtime,
	...args: Runtime[]
) => Promise<Runtime>;

export default class AgalFunction extends Runtime {
	private native: TFunction | null = null;
	public name = '';
	public decl = defaultDeclaration;
	private env = defaultEnv;
	constructor(fn: TFunction);
	constructor(name: string, decl: FunctionDeclaration, env: Environment);
	constructor(
		name?: string | TFunction,
		decl?: FunctionDeclaration,
		env?: Environment
	) {
		super();
		if (typeof name === 'function') {
			this.native = name;
			name = this.native.name;
		}
		this.setName(name || '', defaultStack);
		if (decl) this.decl = decl;
		if (env) this.env = env;
	}
	async call(
		_name: string,
		stack: IStack,
		este: Runtime,
		..._args: Runtime[]
	): Promise<Runtime> {
		if (this.native) return await this.native(_name, stack, este, ..._args);
		const env = new Environment(this.env);
		env.declareVar('este', stack, este, {
			keyword: true,
			col: this.decl.col,
			row: this.decl.row,
		});
		this.decl.params.forEach((param, i) => {
			const value = _args[i];
			env.declareVar(param,stack, value, { col: this.decl.col, row: this.decl.row });
		});
		return (await import('../../interpreter.ts')).evaluate(this.decl.body, env, stack);
	}
	_aCadena(): Promise<string> {
		return Promise.resolve(this.decl.string || `fn ${this.name}() { <código nativo> }`);
	}
	async _aConsola(): Promise<string> {
		const name = await this.get('nombre');
		return colorize(`[Funcion ${name}]`, FOREGROUND.CYAN);
	}
	setName(name: string, stack: IStack) {
		this.name = name || this.name;
		this.set('nombre', stack, StringGetter(this.name));
		return this;
	}
	static getProperties(): Properties {
		if (!use) {
			use = true;
			AgalFunction.default = AgalFunction.from(() => Promise.resolve(AgalVoid));
			fnProperties.set(
				'ejecutar',
				new AgalFunction(async function (
					this: Runtime,
					name: string,
					stack: IStack,
					_este: Runtime,
					...args: Runtime[]
				) {
					const este = args.shift()!;
					if (!este)
						return new AgalReferenceError(
							"No se ha pasado el objeto 'este'",
							defaultStack
						).throw();
					return await _este.call(name, stack, este, ...args);
				})
			);
		}
		return fnProperties;
	}
	static from(fn: TFunction) {
		return new AgalFunction(fn);
	}
	private static default: AgalFunction;
}
