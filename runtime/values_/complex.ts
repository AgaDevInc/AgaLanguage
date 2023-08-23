// deno-lint-ignore-file no-explicit-any
import AgaError, { VariableAlreadyDeclaredError } from '../../Errors.ts';
import { FunctionDeclaration, Stmt } from '../../frontend/ast.ts';
import Environment from '../Environment.class.ts';
import { evaluate } from '../interpreter.ts';
import RuntimeValue from './Runtime.class.ts';
import {
	ExtendsRuntimeValue,
	IRuntimeValue,
	Properties,
} from './internal.ts';
import { parseRuntime } from "./parse.ts";

const reserved = ['este', 'argumentos', 'super'] as const;

export class RuntimeProxy extends RuntimeValue {
	private obtener: ExtendsRuntimeValue;
	private poner: ExtendsRuntimeValue;
	private ejecutar: ExtendsRuntimeValue;
	constructor(
		data: IRuntimeValue,
		options: {
			obtener: ExtendsRuntimeValue;
			poner: ExtendsRuntimeValue;
			ejecutar: ExtendsRuntimeValue;
		},
		private col: number,
		private row: number
	) {
		super();
		this.properties.set('objeto', data);
		this.obtener = options.obtener;
		this.poner = options.poner;
		this.ejecutar = options.ejecutar;
	}
	aCadena(): Promise<string> {
		return Promise.resolve('[RuntimeProxy]');
	}
	aConsola(): Promise<string> {
		return Promise.resolve('[RuntimeProxy]');
	}
	get(key: string) {
		if(this.obtener) return this.obtener.execute([this.properties.get('objeto'), parseRuntime(key)], this.col, this.row);
		return this.properties.get('objeto')!.get(key);
	}
	set(key: string, value: RuntimeValue) {
		if(this.poner) return this.poner.execute([this.properties.get('objeto'), parseRuntime(key), value], this.col, this.row);
		return this.properties.get('objeto')!.set(key, value);
	}
	execute(args: IRuntimeValue[], _col: number, _row: number, _este?: IRuntimeValue) {
		if(this.ejecutar) return this.ejecutar.execute([this.properties.get('objeto'), ...args], this.col, this.row);
		return this.properties.get('objeto')!.execute(args, this.col, this.row);
	}
	protected static proto: Properties = null as unknown as Properties;
}

export class RuntimeArray extends RuntimeValue {
	constructor(data: IRuntimeValue[]) {
		super();
		for (let i = 0; i < data.length; i++) {
			this.properties.set(i.toString(), data[i]);
		}
	}
	set(key: string, _value: RuntimeValue): void {
		const _index = parseInt(key);
	}
	agregar(_values: RuntimeValue[]): void {}
	async unir([unidor]:[RuntimeValue]): Promise<string>{
		const data = [];
		const indexes = Array.from(this.properties.keys()).filter((key) => {
			const i = Number(key);
			if(isNaN(i)) return false;
			if(i < 0) return false;
			if(i % 1 !== 0) return false;
			return true;
		}).sort((a, b) => Number(a) - Number(b));
		for (const index of indexes) {
			const value = this.properties.get(index);
			if(value) data.push(await value.aCadena());
		}
		return data.join(await unidor.aCadena());
	}
	aCadena(): Promise<string> {
		return Promise.resolve(this.unir([{aCadena:()=>','} as unknown as RuntimeValue]));
	}
	aConsola(): Promise<string> {
		return Promise.resolve('[RuntimeArray]');
	}
	protected static proto: Properties = new Properties(RuntimeValue.proto, []);
}

export class RuntimeObject extends RuntimeValue {
	aCadena(): Promise<string> {
		return Promise.resolve('[RuntimeObject]');
	}
	aConsola(): Promise<string> {
		return Promise.resolve('[RuntimeObject]');
	}
	protected static proto: Properties = new Properties(RuntimeValue.proto, []);
}

export class RuntimeFunction extends RuntimeValue {
	private string: string;
	private body: Stmt[];
	scope: Environment;
	constructor(name: string, data: FunctionDeclaration, scope: Environment) {
		super();
		for (const work of reserved)
			if (data.params.includes(work))
				new VariableAlreadyDeclaredError(
					data.col,
					data.row,
					`No se puede declarar un parametro con el nombre '${work}'`
				);
		this.properties.set('nombre', data.identifier || (name as any));
		this.properties.set('params', data.params as any);
		this.string = data.string;
		this.body = data.body;
		this.scope = scope;
	}
	aCadena(): Promise<string> {
		return Promise.resolve(this.string);
	}
	async aConsola(): Promise<string> {
		const name = this.properties.get('nombre') || '<anonimo>';
		const data = `[Funcion ${(await import('./unparse.ts')).default(await name)}]`;
		return (data);
	}
	async execute(
		args: IRuntimeValue[],
		col: number,
		row: number,
		este?: IRuntimeValue
	) {
		const scope = new Environment(this.scope);
		const paramsNames = (await import('./unparse.ts')).default(await this.properties.get('params')) as string[];

		scope.declareVar('este', este || this, { col, row, keyword: true });
		scope.declareVar('argumentos', new RuntimeArray(args), { col, row, keyword: true });

		paramsNames.forEach((name, index) => {
			const argument = args[index];
			scope.declareVar(name, argument, { col, row });
		});
		const result = await evaluate(this.body, scope);
		return result;
	}
	private static defaultFunction: FunctionDeclaration = {
		col: 0,
		row: 0,
		kind: 'FunctionDeclaration',
		identifier:'',
		params: [],
		body: [],
		string: 'funcion (){ <codigó nativo> }',
	}
	static native(data: (col:number, row:number, ...args: IRuntimeValue[]) => any, este: IRuntimeValue): RuntimeFunction{
		const value = new RuntimeFunction(data.name, this.defaultFunction, null as unknown as Environment);
		value.execute = async (args: IRuntimeValue[], col: number, row: number, _este?: IRuntimeValue) => {
			const result = await data.call(_este || este || this, col, row,...args);
			return parseRuntime(result);
		}
		return value;
	}
	protected static proto: Properties = new Properties(RuntimeValue.proto, [
		[
			'ejecutar',
			async function (this: RuntimeFunction, col:number, row:number, ...args: IRuntimeValue[]) {
				const este = args.shift();
				if(!este) new AgaError('Error de referencia', col, row, 'No se ha especificado el objeto "este"').throw();
				return await this.execute(args, col, row, este);
			}
		]
	]);
}
