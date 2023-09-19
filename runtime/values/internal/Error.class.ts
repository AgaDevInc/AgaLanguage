import { colorize, FOREGROUND } from 'aga//colors_string/mod.ts';
import { IStack } from 'magal/runtime/interpreter.ts';
import {
	BLOCK_TYPE,
	LITERALS_TYPE,
	type Expr,
	type Stmt,
	EXPRESSIONS_TYPE,
	STATEMENTS_TYPE,
} from 'magal/frontend/ast.ts';
import Runtime from 'magal/runtime/values/Runtime.class.ts';
import { AgalNull } from 'magal/runtime/values/primitive/Null.class.ts';
import StringGetter from 'magal/runtime/values/primitive/String.class.ts';
import Properties from 'magal/runtime/values/internal/Properties.class.ts';

function resolveArgs(args: Expr[]): string {
	return args.map((arg) => resolveName(arg)).join(', ');
}
function resolveName(expr: Expr): string {
	if (!expr) return '';
	switch (expr.kind) {
		case 'Identifier':
		case 'PropertyIdentifier':
			return expr.symbol;
		case 'MemberExpr':
			return `${resolveName(expr.object)}.${resolveName(expr.property)}`;
		case 'CallExpr':
			return `${resolveName(expr.callee)}(${resolveArgs(expr.args)})`;
		case 'ArrayLiteral':
			return `[Lista]`;
		case 'ObjectLiteral':
			return `{Objeto}`;
		case 'IterableLiteral':
			return `...${expr.identifier}`;
		case 'NumericLiteral':
			return expr.value + '';
		case 'StringLiteral':
			return Deno.inspect(expr.value,{colors: true});
		default:
			return '';
	}
}

function parseStmt(stmt: Stmt): string {
	const location = `${colorize(stmt.file, FOREGROUND.CYAN)}:${colorize(
		stmt.row + '',
		FOREGROUND.YELLOW
	)}:${colorize(stmt.col + '', FOREGROUND.YELLOW)}`;
	switch (stmt.kind) {
		case BLOCK_TYPE.FUNCTION_DECLARATION:
			return `Funcion '${stmt.identifier}' en ${location}`;
		case BLOCK_TYPE.ELSE_STATEMENT:
			return `Entonces en ${location}`;
		case BLOCK_TYPE.IF_STATEMENT:
			return `Si en ${location}`;
		case BLOCK_TYPE.WHILE_STATEMENT:
			return `Mientras en ${location}`;
		case BLOCK_TYPE.TRY:
			return `Intentar en ${location}`;
		case BLOCK_TYPE.CLASS_DECLARATION:
			return `Clase '${stmt.identifier}' en ${location}`;

		case EXPRESSIONS_TYPE.ASSIGNMENT_EXPR:
			return `Assignation en ${location}`;
		case EXPRESSIONS_TYPE.BINARY_EXPR:
			return `Operacion binaria en ${location}`;
		case EXPRESSIONS_TYPE.CALL_EXPR:
			return `Llamada a '${resolveName(stmt.callee)}' en ${location}`;
		case EXPRESSIONS_TYPE.MEMBER_EXPR:
			return `Miembro '${resolveName(stmt)}' en ${location}`;

		case LITERALS_TYPE.ARRAY_LITERAL:
			return `Lista en ${location}`;
		case LITERALS_TYPE.CLASS_PROPERTY:
			return `Propiedad de clase '${stmt.identifier}' en ${location}`;
		case LITERALS_TYPE.IDENTIFIER:
			return `Identificador '${stmt.symbol}' en ${location}`;
		case LITERALS_TYPE.ITERABLE_LITERAL:
			return `Iterable en ${location}`;
		case LITERALS_TYPE.NUMERIC_LITERAL:
			return `Numero '${stmt.value}' en ${location}`;
		case LITERALS_TYPE.OBJECT_LITERAL:
			return `Objeto en ${location}`;
		case LITERALS_TYPE.PROPERTY_IDENTIFIER:
			return `Propiedad '${stmt.symbol}' en ${location}`;
		case LITERALS_TYPE.STRING_LITERAL:
			return `Cadena '${stmt.value}' en ${location}`;

		case STATEMENTS_TYPE.VAR_DECLARATION:
			return `Declaracion de variable '${stmt.identifier}' en ${location}`;
		case STATEMENTS_TYPE.RETURN_STATEMENT:
			return `Retornar en ${location}`;
		case STATEMENTS_TYPE.BREAK_STATEMENT:
			return `Romper en ${location}`;
		case STATEMENTS_TYPE.CONTINUE_STATEMENT:
			return `Continuar en ${location}`;
		default:
			return `En ${location}`;
	}
}
function parseStack(stack: IStack) {
	const data: string[] = [];
	data.push(stack.value ? parseStmt(stack.value) : '');
	while (stack.next) {
		stack = stack.next;
		data.push(stack.value ? parseStmt(stack.value) : '');
	}
	return '\n' + data.filter((item, index) => item && data.indexOf(item) === index).join('\n');
}

const props = new Properties(Runtime.loadProperties());
export default class AgalError extends Runtime {
	throwed = false;
	private pila: string;
	constructor(private name = 'Error', private message: string, stack: IStack) {
		super();
		this._set('nombre', StringGetter(name));
		this._set('mensaje', StringGetter(message));
		this.pila = parseStack(stack);
		this._set(
			'pila',
			// deno-lint-ignore no-control-regex
			StringGetter(this.pila.replace(/\x1b[\[][0-9:]*m/g, ''))
		);
	}
	throw() {
		this.throwed = true;
		return this;
	}
	async _aCadena(): Promise<string> {
		const nombreRuntime = await this.get('nombre');
		const mensajeRuntime = await this.get('mensaje');
		const nombre = nombreRuntime instanceof AgalNull ? this.name : await nombreRuntime.aCadena();
		const mensaje =
			mensajeRuntime instanceof AgalNull ? this.message : await mensajeRuntime.aCadena();
		return `${nombre}: ${mensaje}`;
	}
	async _aConsola(): Promise<string> {
		const data = await this._aConsolaEn();
		return `${data}${this.pila.replaceAll('\n', '\n  ')}`;
	}
	async _aConsolaEn(): Promise<string> {
		const nombreRuntime = await this.get('nombre');
		const mensajeRuntime = await this.get('mensaje');
		const nombre = nombreRuntime instanceof AgalNull ? this.name : await nombreRuntime.aCadena();
		const mensaje =
			mensajeRuntime instanceof AgalNull ? this.message : await mensajeRuntime.aCadena();
		return `${colorize(nombre, FOREGROUND.RED)}: ${mensaje}`;
	}
	static loadProperties(): Properties {
		return props;
	}
	toString(){
		return `${this.name}: ${this.message} ${this.pila}`;
	}
}

const propsType = new Properties(AgalError.loadProperties());
export class AgalTypeError extends AgalError {
	constructor(message: string, stack: IStack) {
		super('ErrorTipo', message, stack);
	}
	static loadProperties(): Properties {
		return propsType;
	}
}
const propsRef = new Properties(AgalError.loadProperties());
export class AgalReferenceError extends AgalError {
	constructor(message: string, stack: IStack) {
		super('ErrorReferencia', message, stack);
	}
	static loadProperties(): Properties {
		return propsRef;
	}
}
const propsSyn = new Properties(AgalError.loadProperties());
export class AgalSyntaxError extends AgalError {
	constructor(message: string, stack: IStack) {
		super('ErrorSintaxis', message, stack);
	}
	static loadProperties(): Properties {
		return propsSyn;
	}
}
const propsToken = new Properties(AgalError.loadProperties());
export class AgalTokenizeError extends AgalError {
	constructor(message: string, stack: IStack) {
		super('ErrorTokenizar', message, stack);
	}
	static loadProperties(): Properties {
		return propsToken;
	}
}
