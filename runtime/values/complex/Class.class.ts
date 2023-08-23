import { FOREGROUND, colorize } from 'aga:Colors';
import Runtime, { defaultStack } from '../Runtime.class.ts';
import Properties from '../internal/Properties.class.ts';
import { AgalVoid } from '../primitive/Null.class.ts';
import StringGetter from '../primitive/String.class.ts';
import AgalObject from './Object.class.ts';
import { IStack, evaluate } from '../../interpreter.ts';
import Environment from '../../Environment.class.ts';
import type { ClassDeclaration } from '../../../frontend/ast.ts';

const InstanceDefault = new Runtime() as AgalClass;
InstanceDefault.makeInstance = () => new Properties(Runtime.loadProperties());
InstanceDefault.getConstructor = () => Promise.resolve(null);

export const enum MetaClass {
	STATIC = 'static',
}
type PropertiesClass = Record<
	string,
	{ meta: MetaClass[]; value: Runtime | Promise<Runtime> }
>;

export default class AgalClass extends Runtime {
	#instance: Properties;
	#extends: AgalClass;
	isClass = true;
	private decl: ClassDeclaration | null = null;
	constructor(name: string, decl: ClassDeclaration, env: Environment);
	constructor(
		name: string,
		properties: PropertiesClass,
		extendsFrom?: AgalClass
	);
	constructor(
		public name: string,
		properties: ClassDeclaration | PropertiesClass,
		extendsFrom?: AgalClass | Environment
	) {
		super();
		if (properties.kind === 'ClassDeclaration') {
			const { body, identifier } = properties as ClassDeclaration;
			this.name = identifier;
			this.decl = properties as ClassDeclaration;
			properties = {};
			for (const method of body)
				properties[method.identifier] = {
					meta: [method.extra as MetaClass.STATIC],
					value: evaluate(
						method.value!,
						extendsFrom as Environment,
						defaultStack
					),
				};
			extendsFrom = undefined;
		}
		this.#extends = (extendsFrom as AgalClass) || InstanceDefault;
		this.#instance = this.#extends.makeInstance();
		for (const key in properties) {
			const { meta, value } = (properties as PropertiesClass)[key];
			const v = Promise.resolve(value)
			if (meta.includes(MetaClass.STATIC)) v.then((v) => this._set(key, v));
			else v.then((v) => this.#instance.set(key, v));
		}

		this._set('nombre', StringGetter(this.name));
	}
	async getConstructor(): Promise<Runtime | null> {
		const Static = await this._get('constructor');
		if (Static) return Static;
		const Instance = await this.#instance.get('constructor');
		if (Instance) return Instance;
		const Extends = await this.#extends.getConstructor();
		if (Extends) return Extends;
		return null;
	}
	makeInstance() {
		return new Properties(this.#instance);
	}
	async call(
		name: string,
		stack: IStack,
		_este: Runtime,
		..._args: Runtime[]
	): Promise<Runtime> {
		const constructor = await this.getConstructor();
		const Instance = new AgalObject().setProperties(this.makeInstance());
		if (constructor) {
			const res = await constructor.call(name, stack, Instance, ..._args);
			if (res !== AgalVoid) return res;
		}
		return Instance;
	}
	_aCadena(): Promise<string> {
		return Promise.resolve(this.decl ? this.decl.string : `clase ${this.name}{ <código nativo> }`)
	}
	_aConsola(): Promise<string> {
		return Promise.resolve(colorize(`[Clase ${this.name}]`, FOREGROUND.CYAN));
	}
}
