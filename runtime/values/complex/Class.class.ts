import { FOREGROUND, colorize } from 'aga//colors_string/mod.ts';
import Environment from 'magal/runtime/Environment.class.ts';
import { IStack, evaluate } from 'magal/runtime/interpreter.ts';
import AgalObject from 'magal/runtime/values/complex/Object.class.ts';
import StringGetter from 'magal/runtime/values/primitive/String.class.ts';
import AgalFunction from 'magal/runtime/values/complex/Function.class.ts';
import Properties from 'magal/runtime/values/internal/Properties.class.ts';
import { ClassDeclaration, ClassPropertyExtra } from 'magal/frontend/ast.ts';
import Runtime, { defaultStack } from 'magal/runtime/values/Runtime.class.ts';
import AgalNull, { AgalVoid } from 'magal/runtime/values/primitive/Null.class.ts';
import AgalError, { AgalTypeError } from 'magal/runtime/values/internal/Error.class.ts';

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
		private Runtime?: RuntimeConstructor
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
	isInstance(val: Runtime) {
		if (this.Runtime && val instanceof (this.Runtime as typeof Runtime)) return true;
		return val.instanceof(this.#instance);
	}
	get instance() {
		return this.#instance;
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
		for (const method of body) {
			const data = await evaluate(method.value!, env, defaultStack);
			properties[method.identifier] = {
				meta: [method.extra!],
				value: data,
			};
			if (data instanceof AgalError) return data;
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
	toConsole(): string {
		const extendsIn = this.#extends === InstanceDefault ? '' : ` extiende ${this.#extends.name}`;
		return colorize(`[Agal Clase ${this.name}${extendsIn}]`, FOREGROUND.CYAN);
	}
}
