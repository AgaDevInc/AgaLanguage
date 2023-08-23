import { colorize, FOREGROUND } from 'aga:Colors';
import Runtime from '../Runtime.class.ts';
import StringGetter from '../primitive/String.class.ts';
import type { Expr, Stmt } from '../../../frontend/ast.ts';
import { IStack } from '../../interpreter.ts';
import { AgalNull } from '../primitive/Null.class.ts';

function resolveName(expr: Expr): string {
	if (!expr) return '';
	switch (expr.kind) {
		case 'Identifier':
			return expr.symbol;
		case 'MemberExpr':
			return `${resolveName(expr.object)}.${resolveName(expr.property)}`;
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
		case 'FunctionDeclaration':
			return `Funcion '${stmt.identifier}' en ${location}`;
		case 'ArrayLiteral':
			return `Lista en ${location}`;
		case 'AssignmentExpr':
			return `Assignation en ${location}`;
		case 'BinaryExpr':
			return `Operacion binaria en ${location}`;
		case 'BreakStatement':
			return `Romper en ${location}`;
		case 'CallExpr':
			return `Llamada a '${resolveName(stmt.callee)}' en ${location}`;
		case 'ClassDeclaration':
			return `Clase '${stmt.identifier}' en ${location}`;
		case 'ContinueStatement':
			return `Continuar en ${location}`;
		case 'ClassProperty':
			return `Propiedad de clase '${stmt.identifier}' en ${location}`;
		case 'ElseStatement':
			return `Entonces en ${location}`;
		case 'Identifier':
			return `Identificador '${stmt.symbol}' en ${location}`;
		case 'IfStatement':
			return `Si en ${location}`;
		case 'IterableLiteral':
			return `Iterable en ${location}`;
		case 'MemberExpr':
			return `Miembro '${resolveName(stmt)}' en ${location}`;
		case 'NumericLiteral':
			return `Numero '${stmt.value}' en ${location}`;
		case 'ObjectLiteral':
			return `Objeto en ${location}`;
		case 'WhileStatement':
			return `Mientras en ${location}`;
		case 'PropertyIdentifier':
			return `Propiedad '${stmt.symbol}' en ${location}`;
		case 'ReturnStatement':
			return `Retornar en ${location}`;
		case 'StringLiteral':
			return `Cadena '${stmt.value}' en ${location}`;
		case 'VarDeclaration':
			return `Declaracion de variable '${stmt.identifier}' en ${location}`;
		case 'Program':
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
	return data
		.filter((item, index) => data && data.indexOf(item) === index)
		.join('\n');
}

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
		const nombre =
			nombreRuntime instanceof AgalNull
				? this.name
				: await nombreRuntime.aCadena();
		const mensaje =
			mensajeRuntime instanceof AgalNull
				? this.message
				: await mensajeRuntime.aCadena();
		return `${nombre}: ${mensaje}`;
	}
	async _aConsola(): Promise<string> {
		const data = await this._aConsolaEn();
		return `${data}\n  ${this.pila.replaceAll('\n', '\n  ')}`;
	}
	async _aConsolaEn(): Promise<string> {
		const nombreRuntime = await this.get('nombre');
		const mensajeRuntime = await this.get('mensaje');
		const nombre =
			nombreRuntime instanceof AgalNull
				? this.name
				: await nombreRuntime.aCadena();
		const mensaje =
			mensajeRuntime instanceof AgalNull
				? this.message
				: await mensajeRuntime.aCadena();
		return `${colorize(nombre, FOREGROUND.RED)}: ${mensaje}`;
	}
}

export class AgalTypeError extends AgalError {
	constructor(message: string, stack: IStack) {
		super('ErrorTipo', message, stack);
	}
}
export class AgalReferenceError extends AgalError {
	constructor(message: string, stack: IStack) {
		super('ErrorReferencia', message, stack);
	}
}
