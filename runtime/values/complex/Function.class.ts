import { colorize, FOREGROUND } from 'aga:Colors';
import { BLOCK_TYPE, type FunctionDeclaration } from '../../../frontend/ast.ts';
import Environment from '../../Environment.class.ts';
import Runtime, { defaultStack } from '../Runtime.class.ts';
import { AgalReferenceError } from '../internal/Error.class.ts';
import Properties from '../internal/Properties.class.ts';
import StringGetter from '../primitive/String.class.ts';
import { AgalVoid } from '../primitive/Null.class.ts';
import { IStack } from '../../interpreter.ts';

const defaultDeclaration: FunctionDeclaration = {
	col: 0,
	row: 0,
	body: [],
	identifier: '',
	kind: BLOCK_TYPE.FUNCTION_DECLARATION,
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
) => Promise<Runtime | void>;

export default class AgalFunction extends Runtime {
	private native: TFunction | null = null;
	public name = '';
	private vars = new Map<string, Runtime>();
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
		name: string,
		stack: IStack,
		este: Runtime,
		..._args: Runtime[]
	): Promise<Runtime> {
		if (this.native) return await this.native(name, stack, este, ..._args) || AgalVoid;
		const env = new Environment(this.env);
		this.vars.forEach((value, key) =>	env.declareVar(key, stack, value, this.decl));
		env.declareVar('este', stack, este, {
			keyword: true,
			col: this.decl.col,
			row: this.decl.row,
		});
		const rest: Runtime[] = [];
		this.decl.params.forEach((param, i) => {
			const value = _args[i];
			if (rest.length > 0) return rest.push(value);
			if (typeof param === 'object' && param !== null) {
				env.declareVar(param.identifier, stack, value, this.decl);
				return rest.push(value);
			}
			env.declareVar(param, stack, value, this.decl);
		});
		return (await import('../../interpreter.ts')).evaluate(
			this.decl.body,
			env,
			stack
		) || AgalVoid;
	}
	setVar(name: string, value: Runtime) {
		this.vars.set(name, value);
		return this;
	}
	_aCadena(): Promise<string> {
		return Promise.resolve(
			this.decl.string || `fn ${this.name}() { <código nativo> }`
		);
	}
	async _aConsola(): Promise<string> {
		const name = await this.get('nombre');
		return colorize(`[Función ${name || '<anónima>'}]`, FOREGROUND.CYAN);
	}
	setName(name: string, stack: IStack) {
		this.name = name || this.name;
		this.set('nombre', stack, StringGetter(this.name));
		return this;
	}
	static loadProperties(): Properties {
		if (!use) {
			use = true;
			AgalFunction.default = AgalFunction.from(async () => {});
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
				}).setName('Funcion().ejecutar', defaultStack)
			);
		}
		return fnProperties;
	}
	static from(fn: TFunction) {
		return new AgalFunction(fn);
	}
	private static default: AgalFunction;
}
