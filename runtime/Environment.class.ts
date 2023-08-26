import type { IStack } from './interpreter.ts';
import type Runtime from './values/Runtime.class.ts'
import { AgalReferenceError } from "./values/internal/Error.class.ts";
type RuntimeValue = InstanceType<typeof Runtime>;

export default class Environment {
	private parent?: Environment;
	private variables: Map<string, RuntimeValue>;
	private constants: Set<string>;
	private keywords: Set<string>;
	constructor(parentENV?: Environment) {
		this.parent = parentENV;
		this.variables = new Map();
		this.constants = new Set();
		this.keywords = new Set();
	}
	private isKeyword(name: string): boolean {
		if (this.keywords.has(name)) return true;
		if (!this.parent) return false;
		return this.parent.isKeyword(name);
	}
	public declareVar(
		name: string,
		stack: IStack,
		value: RuntimeValue,
		data: { col: number; row: number; constant?: boolean; keyword?: boolean }
	): RuntimeValue {
		if(!name) return new AgalReferenceError(
			`No se puede declara una variable sin nombre`,stack
		).throw();
		if (this.isKeyword(name))
			return new AgalReferenceError(
				`Variable '${name}' es una palabra reservada y no puede ser declarara`,stack
			).throw();
		else if (this.variables.has(name))
			return new AgalReferenceError(
				`Variable '${name}' ya ha sido declarada`,stack
			).throw();
		if (data.constant) this.constants.add(name);
		if (data.keyword) this.keywords.add(name);
		this.variables.set(name, value);
		return value;
	}
	public assignVar(
		name: string,
		stack: IStack,
		value: RuntimeValue,
		data: { col: number; row: number }
	): RuntimeValue {
		const env = this.resolve(name, data);
		if(!env.variables.has(name)) return new AgalReferenceError(
			`Variable '${name}' no ha sido declarada`,stack
		).throw();
		if (env.isKeyword(name))
			return new AgalReferenceError(
				`Variable '${name}' es una palabra reservada y no puede ser modificada`,stack
			).throw();
		else if (env.constants.has(name))
			return new AgalReferenceError(
				`Variable '${name}' es una constante y no puede ser modificada`,stack
			).throw();
		env.variables.set(name, value);
		return value;
	}
	public lookupVar(
		name: string,
		stack: IStack,
		data: { col: number; row: number }
	): RuntimeValue {
		const env = this.resolve(name, data);
		return env.variables.get(name) as RuntimeValue || new AgalReferenceError(
			`Variable '${name}' no ha sido declarada`,stack
		).throw();
	}
	public resolve(
		name: string,
		data: { col: number; row: number }
	): Environment {
		if (this.variables.has(name)) return this;
		if (this.parent) return this.parent.resolve(name, data);
		return this;
	}
}
