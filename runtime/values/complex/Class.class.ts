import { FOREGROUND, colorize } from 'aga:Colors';
import Runtime, { defaultStack } from '../Runtime.class.ts';
import Properties from '../internal/Properties.class.ts';
import AgalNull, { AgalVoid } from '../primitive/Null.class.ts';
import StringGetter from '../primitive/String.class.ts';
import AgalObject from './Object.class.ts';
import { IStack, evaluate } from '../../interpreter.ts';
import Environment from '../../Environment.class.ts';
import { ClassDeclaration, ClassPropertyExtra } from '../../../frontend/ast.ts';
import AgalError, { AgalTypeError } from '../internal/Error.class.ts';
import AgalFunction from './Function.class.ts';

const InstanceDefault = new Runtime() as AgalClass;
InstanceDefault.makeInstance = () => new Properties(Runtime.loadProperties());
InstanceDefault.getConstructor = () => Promise.resolve(null);

type PropertiesClass = Record<
	string,
	{ meta: ClassPropertyExtra[]; value: Runtime | Promise<Runtime> }
>;
type RuntimeConstructor = { loadProperties(): Properties };
export default class AgalClass extends Runtime {
	#instance: Properties;
	#extends: AgalClass;
	isClass = true;
	private decl: ClassDeclaration | null = null;
	constructor(
		public name: string,
		properties: PropertiesClass,
		extendsFrom?: AgalClass,
		Runtime?: RuntimeConstructor
	) {
		super();
		this.#extends = extendsFrom || InstanceDefault;
		this.#instance = this.#extends.makeInstance(Runtime);
		for (const key in properties) {
			const { meta, value } = properties[key];
			let v = Promise.resolve(value);
			if (key === 'constructor')
				v.then(v => this.#instance.set(key, v)).then(v => this._set(key, v));
			else {
				const super_ = this.#instance.father
					? new AgalObject().setProperties(this.#instance.father)
					: AgalNull;
				v = v.then(v => (v instanceof AgalFunction ? v.setVar('super', super_) : v));
				if (meta.includes(ClassPropertyExtra.Static)) v.then(v => this._set(key, v));
				else v.then(v => this.#instance.set(key, v));
			}
		}

		this._set('nombre', StringGetter(this.name));
	}
	async getConstructor(): Promise<Runtime | null> {
		const Extends = await this.#extends.getConstructor();
		const Instance = await this.#instance.get('constructor');
		if (Instance instanceof AgalFunction) Instance.setVar('super', Extends || AgalNull);
		if (Instance) return Instance;
		if (Extends) return Extends;
		return null;
	}
	makeInstance(Runtime?: RuntimeConstructor) {
		return new Properties(Runtime ? Runtime.loadProperties() : this.#instance);
	}
	async call(name: string, stack: IStack, _este: Runtime, ..._args: Runtime[]): Promise<Runtime> {
		const constructor = await this.getConstructor();
		const Instance = new AgalObject().setProperties(this.makeInstance());
		if (constructor) {
			const res = await constructor.call(name, stack, Instance, ..._args);
			if (res !== AgalVoid) return res;
		}
		return Instance;
	}
	_aCadena(): Promise<string> {
		return Promise.resolve(this.decl ? this.decl.string : `clase ${this.name}{ <código nativo> }`);
	}
	_aConsola(): Promise<string> {
		const extendsIn = this.#extends === InstanceDefault ? '' : ` extiende ${this.#extends.name}`;
		return Promise.resolve(colorize(`[Clase ${this.name}${extendsIn}]`, FOREGROUND.CYAN));
	}
	static async from(decl: ClassDeclaration, env: Environment) {
		const { body, identifier, extend } = decl;
		const properties: Record<
			string,
			{ meta: ClassPropertyExtra[]; value: Runtime | Promise<Runtime> }
		> = {};
		for (const method of body){
			const data = await evaluate(method.value!, env, defaultStack);
			properties[method.identifier] = {
				meta: [method.extra!],
				value: data,
			};
			if(data instanceof AgalError) return data;
		}
		let extendsFrom;
		const extender = extend ? env.lookupVar(extend, defaultStack, decl) : undefined;
		if (extender instanceof AgalClass) extendsFrom = extender;
		else if (extender instanceof Runtime)
			return new AgalTypeError(`Solo se pueden extender clases`, defaultStack);
		const data = new AgalClass(identifier, properties, extendsFrom);
		data.decl = decl;
		return data;
	}
}
