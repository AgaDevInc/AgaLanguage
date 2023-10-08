import { eval_complex } from 'aga//super_math/Parser.class.ts';
import {
	type Stmt,
	type Expr,
	type Program,
	type Property,
	type CallExpr,
	type ErrorStmt,
	type BinaryExpr,
	type MemberExpr,
	type IfStatement,
	type ClassProperty,
	type ObjectLiteral,
	type AssignmentExpr,
	type VarDeclaration,
	type WhileStatement,
	type CatchStatement,
	type ReturnStatement,
	type IterableLiteral,
	type ClassDeclaration,
	type FinallyStatement,
	type FunctionDeclaration,
	ErrorType,
	BLOCK_TYPE,
	LITERALS_TYPE,
	STATEMENTS_TYPE,
	EXPRESSIONS_TYPE,
	ClassPropertyExtra,
ElseStatement,
} from 'magal/frontend/ast.ts';
import { tokenize, Token, TokenType } from './lexer.ts';

const mathOperators = '+-*/%^';

type ArrayToken = Omit<Token[], 'shift'> & { shift: () => Token };

export default class Parser {
	private tokens: ArrayToken = null as unknown as ArrayToken;

	private not_eof(): boolean {
		if (this.tokens.length == 0) return false;
		return this.tokens[0].type != TokenType.EOF;
	}

	private at(): Token {
		return (
			this.tokens[0] ?? {
				type: TokenType.Error,
				value: 'No se encontro ningun token.',
				col: 0,
				row: 0,
				file: '',
			}
		);
	}

	private eat(): Token {
		const prev = this.at();
		this.tokens.shift();
		return prev;
	}
	private expect<T extends TokenType>(type: T, err: string) {
		const prev = this.tokens.shift() as Token & { type: T };
		if (!prev)
			return {
				type: TokenType.Error,
				value: err,
				col: 0,
				row: 0,
				file: '<indeterminado>',
			} as Token & { type: TokenType.Error };
		if (prev.type != type)
			return {
				...prev,
				type: TokenType.Error,
				value: err,
			} as Token & { type: TokenType.Error };
		return prev;
	}
	private sourceCode = '';
	public produceAST(sourceCode: string, isFunction = false, file?: string): Program {
		this.sourceCode = sourceCode;
		this.tokens = tokenize(sourceCode, file) as ArrayToken;
		const program: Program = {
			kind: BLOCK_TYPE.PROGRAM,
			body: [],
			file: file ?? '',
			row: 0,
			col: 0,
		};

		const functions = [];
		const code = [];

		// Parse until the end of the file
		while (this.not_eof()) {
			const data = this.parse_stmt(isFunction, undefined, undefined, true);
			if (data) {
				if (data.kind === 'Error') {
					program.body.push(data);
					return program;
				} else if (data.kind === BLOCK_TYPE.FUNCTION_DECLARATION) functions.push(data);
				else code.push(data);
			}
		}
		program.body = [...functions, ...code];

		return program;
	}
	private getTo(aCol: number, aRow: number, bCol: number, bRow: number) {
		const code = this.sourceCode.split('\n');
		const lines = aRow == bRow ? [code[aRow - 1]] : code.slice(aRow - 1, bRow);
		lines[0] = lines[0].slice(aCol - 1);
		lines[lines.length - 1] = lines[lines.length - 1].slice(0, bCol);
		return lines.join('\n');
	}

	private makeError(token: Token, type: ErrorType): Stmt {
		const data: Stmt = {
			kind: 'Error',
			col: token.col,
			row: token.row,
			file: token.file,
			message: token.value,
			type,
		};
		return data;
	}

	private parse_stmt(isFunction: boolean, isLoop: boolean, isClassDecl: true): ClassProperty;
	private parse_stmt(isFunction?: boolean, isLoop?: boolean, isClassDecl?: boolean, isGlobalScope?: boolean): Stmt;
	private parse_stmt(isFunction = false, isLoop = false, isClassDecl = false, isGlobalScope = false) {
		const token = this.at();
		switch (token.type) {
			case TokenType.Error:
				return this.makeError(this.eat(), ErrorType.TokenizerError);
			case TokenType.Definir:
			case TokenType.Const:
				return this.parse_var_decl();
			case TokenType.Funcion:
				return this.parse_func_decl();
			case TokenType.Si:
				return this.parse_if_stmt(isFunction, isLoop);
			case TokenType.Entonces:
				return this.makeError(
					{
						...this.eat(),
						value: `No puede usar "${TokenType.Entonces.toLowerCase()}" sin un "${TokenType.Si.toLowerCase()}"`,
					},
					ErrorType.ParserError
				);
			case TokenType.Retorna:
				if (!isFunction)
					return this.makeError(
						{
							...this.eat(),
							value: `No puedes usar "${TokenType.Retorna.toLowerCase()}" fuera de una función`,
						},
						ErrorType.ParserError
					);
				return this.parse_return_stmt();
			case TokenType.Mientras:
				return this.parse_while_stmt();
			case TokenType.Romper:
				this.eat();
				if (!isLoop)
					return this.makeError(
						{
							...token,
							value: `No puedes usar "${TokenType.Romper.toLowerCase()}" fuera de un ciclo`,
						},
						ErrorType.ParserError
					);
				return {
					kind: 'BreakStatement',
					col: token.col,
					row: token.row,
				};
			case TokenType.Continuar:
				this.eat();
				if (!isLoop)
					return this.makeError(
						{
							...token,
							value: `No puedes usar "${TokenType.Continuar.toLowerCase()}" fuera de un ciclo`,
						},
						ErrorType.ParserError
					);
				return {
					kind: 'ContinueStatement',
					col: token.col,
					row: token.row,
				};
			case TokenType.Clase:
				if (isClassDecl)
					return this.makeError(
						{
							...this.eat(),
							value: `No puedes declarar una clase dentro de otra`,
						},
						ErrorType.ParserError
					);
				return this.parse_class_decl();
			case TokenType.Identifier:
				if (isClassDecl) return this.parse_class_prop();
				else return this.parse_expr();
			case TokenType.Estatico:
				this.eat();
				if (!isClassDecl)
					return this.makeError(
						{
							...token,
							value: `No puedes usar "${TokenType.Estatico.toLowerCase()}" fuera de una clase`,
						},
						ErrorType.ParserError
					);
				return this.parse_class_prop(ClassPropertyExtra.Static);
			case TokenType.Semicolon:
				while (this.not_eof() && this.at().type === TokenType.Semicolon) {
					this.eat();
				}
				return this.parse_stmt(...arguments);
			case TokenType.Intentar:
				return this.parse_try_stmt(isFunction, isLoop, isClassDecl);
			case TokenType.Capturar:
			case TokenType.Finalmente:
				return this.makeError(
					{
						...this.eat(),
						value: `No puede usar "${token.type.toLowerCase()}" sin un "${TokenType.Intentar.toLowerCase()}"`,
					},
					ErrorType.ParserError
				);
				case TokenType.Importar:
					if(isGlobalScope)	return this.parse_import_stmt();
					return this.parse_import_var();
				case TokenType.Exportar:
					if(isGlobalScope)	return this.parse_export_stmt();
					return this.makeError(
						{
							...this.eat(),
							value: `No puede usar "${TokenType.Exportar.toLowerCase()}" fuera del ambito global`,
						},
						ErrorType.ParserError
					);
				default:
				return this.parse_expr();
		}
	}
	private parse_import_var(): Expr {
		const { col, row, file } = this.eat();
		const next = this.at();
		if(next.type !== TokenType.OpenParen && next.type !== TokenType.Dot) return this.makeError({...next, value:'importar solo se puede usar en un ambito global'}, ErrorType.ParserError) as Expr;
		const importIdentifier: Token = {
			type: TokenType.Identifier,
			value: 'importar',
			col,
			row,
			file,
		}
		this.tokens.unshift(importIdentifier);
		return this.parse_expr();
	}
	private parse_import_stmt(): Stmt {
		const { col, row, file } = this.eat();
		const data = this.expect(TokenType.String, 'No se encontro la ruta del archivo');
		if (data.type === TokenType.Error)
			return this.makeError(data, ErrorType.ParserError);
		const path = data.value;
		const stmt: Stmt = {
			kind: STATEMENTS_TYPE.IMPORT_STATEMENT,
			path,
			col,
			row,
			file,
		};
		if (this.at().type === TokenType.Como) {
			this.eat();
			const data = this.expect(TokenType.Identifier, 'No se encontro el identificador');
			if (data.type === TokenType.Error)
				return this.makeError(data, ErrorType.ParserError);
			stmt.as = data.value;
		}
		if (this.at().type === TokenType.Con) {
			this.eat();
			const tk = this.at()
			const data = this.parse_object_expr();
			if(data.kind !== LITERALS_TYPE.OBJECT_LITERAL) return this.makeError({...tk, value:'Se esperaba un objeto'}, ErrorType.ParserError);
			stmt.with = data;
		}
		return stmt;
	}
	private parse_export_stmt(): Stmt {
		const { col, row, file } = this.eat();
		const data = this.parse_stmt();
		let identifier = ''
		switch (data.kind) {
			// deno-lint-ignore no-fallthrough
			case STATEMENTS_TYPE.VAR_DECLARATION:
				if(!data.value) return this.makeError({...this.at(), value:'Se esperaba una asignación'}, ErrorType.ParserError);
			case BLOCK_TYPE.FUNCTION_DECLARATION:
			case BLOCK_TYPE.CLASS_DECLARATION:
				identifier = data.identifier;
				break;
			case LITERALS_TYPE.OBJECT_LITERAL:
				identifier = '<exportable>';
				break;
		}
		if(this.at() && this.at().type === TokenType.Como) {
			this.eat();
			const data = this.expect(TokenType.Identifier, 'No se encontro el identificador');
			if (data.type === TokenType.Error)
				return this.makeError(data, ErrorType.ParserError);
			identifier = data.value;
		}
		if(!identifier) return this.makeError({...this.at(), value:'Se esperaba un identificador'}, ErrorType.ParserError)
		const value = data.kind === STATEMENTS_TYPE.VAR_DECLARATION ? data.value! : data as unknown as Expr;
		const stmt: Stmt = {
			kind: STATEMENTS_TYPE.EXPORT_STATEMENT,
			value,
			identifier,
			col,
			row,
			file,
		}
		return stmt;
	}
	private parse_finally_stmt(isFN: boolean, isLoop: boolean) {
		const { col, row, file, type } = this.at();
		if (type !== TokenType.Finalmente) return;
		const _ = this.expect(
			TokenType.Finalmente,
			`No se encontró la palabra clave "${TokenType.Finalmente.toLowerCase()}""`
		);
		if (_.type == TokenType.Error) return this.makeError(_, ErrorType.ParserError);
		const start = this.expect(TokenType.OpenBrace, 'No se encontró "{"');
		if (start.type == TokenType.Error) return this.makeError(start, ErrorType.ParserError);
		const body: Stmt[] = [];
		while (this.not_eof() && this.at().type != TokenType.CloseBrace) {
			body.push(this.parse_stmt(isFN, isLoop));
		}
		const end = this.expect(TokenType.CloseBrace, 'No se encontró "}"');
		if (end.type == TokenType.Error) return this.makeError(end, ErrorType.ParserError);
		const Finally: FinallyStatement = {
			kind: BLOCK_TYPE.FINALLY,
			body,
			col,
			row,
			file,
			start,end
		};
		return Finally;
	}
	private parse_catch_stmt(isFN: boolean, isLoop: boolean, strict = false) {
		let _;
		const { type, col, row, file } = this.at();
		if (type === TokenType.Capturar) {
			_ = this.expect(
				TokenType.Capturar,
				`No se encontró la palabra clave "${TokenType.Capturar.toLowerCase()}""`
			);
			if (_.type == TokenType.Error) return this.makeError(_, ErrorType.ParserError);
			_ = this.expect(TokenType.OpenParen, 'No se encontró "("');
			if (_.type == TokenType.Error) return this.makeError(_, ErrorType.ParserError);
			const error = this.expect(TokenType.Identifier, 'No se encontro el identificador del error');
			if (error.type === TokenType.Error) return this.makeError(error, ErrorType.ParserError);
			const errorName = error.value;
			_ = this.expect(TokenType.CloseParen, 'No se encontró ")"');
			if (_.type == TokenType.Error) return this.makeError(_, ErrorType.ParserError);
			const start = this.expect(TokenType.OpenBrace, 'No se encontró "{"');
			if (start.type == TokenType.Error) return this.makeError(start, ErrorType.ParserError);
			const body: Stmt[] = [];
			while (this.not_eof() && this.at().type != TokenType.CloseBrace) {
				body.push(this.parse_stmt(isFN, isLoop));
			}
			const end = this.expect(TokenType.CloseBrace, 'No se encontró "}"');
			if (end.type == TokenType.Error) return this.makeError(end, ErrorType.ParserError);
			const next = this.parse_catch_stmt(isFN, isLoop) as CatchStatement | ErrorStmt;
			if (next && next.kind === TokenType.Error) return next;
			const Catch: CatchStatement = {
				kind: BLOCK_TYPE.CATCH,
				errorName,
				body,
				next,
				col,
				row,
				file,
				start,end
			};
			return Catch;
		}
		if (strict)
			return this.makeError(
				{
					...this.at(),
					type: TokenType.Error,
					value: `No se encontró "${TokenType.Capturar.toLowerCase()}"`,
				},
				ErrorType.ParserError
			);
	}
	private parse_try_stmt(isFN: boolean, isLoop: boolean, isClass: boolean): Stmt {
		const token = this.expect(
			TokenType.Intentar,
			`No se encontró la palabra clave "${TokenType.Intentar.toLowerCase()}""`
		);
		if (token.type == TokenType.Error) return this.makeError(token, ErrorType.ParserError);
		const { col, row, file } = token;
		const start: Token = this.expect(TokenType.OpenBrace, 'No se encontró "{"');
		if (start.type == TokenType.Error) return this.makeError(start, ErrorType.ParserError);
		const tryBody: Stmt[] = [];
		while (this.not_eof() && this.at().type != TokenType.CloseBrace) {
			tryBody.push(this.parse_stmt(isFN, isLoop, isClass));
		}
		const end = this.expect(TokenType.CloseBrace, 'No se encontró "}"');
		if (end.type == TokenType.Error) return this.makeError(end, ErrorType.ParserError);

		const _catch = this.parse_catch_stmt(isFN, isLoop, true) as CatchStatement | ErrorStmt;
		if (_catch.kind === TokenType.Error) return _catch;
		const _finally = this.parse_finally_stmt(isFN, isLoop) as
			| FinallyStatement
			| ErrorStmt
			| undefined;
		if (_finally && _finally.kind === TokenType.Error) return _finally;
		return {
			kind: BLOCK_TYPE.TRY,
			body: tryBody,
			catch: _catch,
			finally: _finally,
			col,
			row,
			file,
			start,end
		};
	}
	private parse_iterable(): IterableLiteral {
		// ...value
		const { col, row, file } = this.eat();
		let _ = this.expect(TokenType.Dot, `No se encontró el token "${TokenType.Dot.toLowerCase()}"`);
		if (_.type == TokenType.Error)
			return this.makeError(_, ErrorType.ParserError) as IterableLiteral;
		_ = this.expect(TokenType.Dot, `No se encontró el token "${TokenType.Dot.toLowerCase()}"`);
		if (_.type == TokenType.Error)
			return this.makeError(_, ErrorType.ParserError) as IterableLiteral;
		const data = this.expect(TokenType.Identifier, 'No se encontro el identificador');
		if (data.type === TokenType.Error)
			return this.makeError(data, ErrorType.ParserError) as IterableLiteral;
		const name = data.value;
		return {
			kind: LITERALS_TYPE.ITERABLE_LITERAL,
			identifier: name,
			col,
			row,
			file,
		};
	}
	private parse_if_stmt(isFunction = false, isLoop = false): Stmt {
		const token = this.expect(TokenType.Si, `No se encontró "${TokenType.Si.toLowerCase()}"`);
		if (token.type == TokenType.Error) return this.makeError(token, ErrorType.ParserError);

		let _: Token = this.expect(TokenType.OpenParen, 'No se encontró "("');
		if (_.type == TokenType.Error) return this.makeError(_, ErrorType.ParserError);

		const condition = this.parse_expr();

		_ = this.expect(TokenType.CloseParen, 'No se encontró ")"');
		if (_.type == TokenType.Error) return this.makeError(_, ErrorType.ParserError);
		const start = this.expect(TokenType.OpenBrace, 'No se encontró "{"');
		if (start.type == TokenType.Error) return this.makeError(start, ErrorType.ParserError);

		const body: Stmt[] = [];
		const Else: ElseStatement = {
			kind: BLOCK_TYPE.ELSE_STATEMENT,
			body: [] as Stmt[],
			col: 0,
			row: 0,
			file: token.file,
			start,end:{col:0,row:0}
		};

		while (this.not_eof() && this.at().type != TokenType.CloseBrace) 
			body.push(this.parse_stmt(isFunction, isLoop));
		const end = this.expect(TokenType.CloseBrace, 'No se encontró "}"');
		if (end.type == TokenType.Error) return this.makeError(end, ErrorType.ParserError);
		if (this.at().type == TokenType.Entonces) {
			const elseToken = this.eat();
			Else.col = elseToken.col;
			Else.row = elseToken.row;

			// else if
			if (this.at().type == TokenType.Si) {
				Else.body.push(this.parse_if_stmt(isFunction, isLoop));
			} else {
				const start = this.expect(TokenType.OpenBrace, 'No se encontró "{"');
				if (start.type == TokenType.Error) return this.makeError(start, ErrorType.ParserError);
				Else.start = start;

				while (this.not_eof() && this.at().type != TokenType.CloseBrace)
					Else.body.push(this.parse_stmt(isFunction, isLoop));

				const end = this.expect(TokenType.CloseBrace, 'No se encontró "}"');
				if (end.type == TokenType.Error) return this.makeError(end, ErrorType.ParserError);
				Else.end = end;
			}
		}
		
		const ifStmt: IfStatement = {
			kind: BLOCK_TYPE.IF_STATEMENT,
			condition,
			body,
			col: token.col,
			row: token.row,
			else: Else,
			file: token.file,	start,end
		};
		return ifStmt;
	}
	private parse_return_stmt(): ReturnStatement {
		const _ = this.expect(
			TokenType.Retorna,
			`No se encontró la palabra clave "${TokenType.Retorna.toLowerCase()}""`
		);
		if (_.type == TokenType.Error)
			return this.makeError(_, ErrorType.ParserError) as unknown as ReturnStatement;
		const { col, row, file } = _;
		const value = this.parse_expr();
		return {
			kind: STATEMENTS_TYPE.RETURN_STATEMENT,
			value,
			col,
			row,
			file,
		};
	}
	private parse_func_decl(isVar = false): FunctionDeclaration {
		let _: Token = this.expect(
			TokenType.Funcion,
			`No se encontro la palabra clave "${TokenType.Funcion.toLowerCase()}"`
		);
		if (_.type == TokenType.Error)
			return this.makeError(_, ErrorType.ParserError) as unknown as FunctionDeclaration;
		const { col, row, file } = _;

		const nextToken = this.at();
		let name = '';
		if (nextToken.type == TokenType.Identifier) {
			const data = this.eat();
			if (!isVar) name = data.value;
		} else if (!isVar)
			return this.makeError(
				{ ...nextToken, value: `No se encontró el identificador` },
				ErrorType.ParserError
			) as unknown as FunctionDeclaration;

		_ = this.expect(TokenType.OpenParen, 'No se encontró "("');
		if (_.type == TokenType.Error)
			return this.makeError(_, ErrorType.ParserError) as unknown as FunctionDeclaration;
		const args: (string | IterableLiteral)[] = [];
		while (this.not_eof() && this.at().type != TokenType.CloseParen) {
			if (this.at().type === TokenType.Dot) {
				const data = this.parse_iterable() as unknown as ErrorStmt | IterableLiteral;
				if (data.kind === 'Error') return data as unknown as FunctionDeclaration;
				args.push(data);
				if (this.at().type == TokenType.Comma) this.eat();
				continue;
			}
			const data = this.expect(
				TokenType.Identifier,
				'No se encontro el identificador del argumento'
			);
			if (data.type == TokenType.Error)
				return this.makeError(data, ErrorType.ParserError) as unknown as FunctionDeclaration;
			args.push(data.value);
			if (this.at().type == TokenType.Comma) this.eat();
		}
		_ = this.expect(TokenType.CloseParen, 'No se encontró ")"');
		if (_.type == TokenType.Error)
			return this.makeError(_, ErrorType.ParserError) as unknown as FunctionDeclaration;
		const start = this.expect(TokenType.OpenBrace, 'No se encontró "{"');
		if (start.type == TokenType.Error)
			return this.makeError(start, ErrorType.ParserError) as unknown as FunctionDeclaration;
		const body: Stmt[] = [];
		while (this.not_eof() && this.at().type != TokenType.CloseBrace) {
			const data = this.parse_stmt(true);
			if (data.kind === 'Error') return data as unknown as FunctionDeclaration;
			body.push(data);
		}
		const end = this.expect(TokenType.CloseBrace, 'No se encontró "}"');
		if (end.type == TokenType.Error)
			return this.makeError(end, ErrorType.ParserError) as unknown as FunctionDeclaration;
		return {
			kind: BLOCK_TYPE.FUNCTION_DECLARATION,
			identifier: name,
			params: args,
			body,
			string: this.getTo(col, row, end.col, end.row),
			col,
			row,
			file,
			start,end
		};
	}
	private parse_class_decl(): ClassDeclaration {
		const _: Token = this.expect(
			TokenType.Clase,
			`No se encontró la palabra clave "${TokenType.Clase.toLowerCase()}"`
		);
		if (_.type == TokenType.Error)
			return this.makeError(_, ErrorType.ParserError) as unknown as ClassDeclaration;
		const { col, row, file } = _;

		const data = this.expect(TokenType.Identifier, 'No se encontro el identificador');
		if (data.type === TokenType.Error)
			return this.makeError(data, ErrorType.ParserError) as unknown as ClassDeclaration;
		const name = data.value;
		let extend;
		if (this.at().type == TokenType.Extiende) {
			this.eat();
			const data = this.expect(
				TokenType.Identifier,
				'No se encontro el identificador de la extencion'
			);
			if (data.type === TokenType.Error)
				return this.makeError(data, ErrorType.ParserError) as unknown as ClassDeclaration;
			extend = data.value;
		}
		const start = this.expect(TokenType.OpenBrace, 'No se encontró "{"');
		if (start.type == TokenType.Error)
			return this.makeError(start, ErrorType.ParserError) as unknown as ClassDeclaration;
		const body = [];
		while (this.not_eof() && this.at().type != TokenType.CloseBrace) {
			body.push(this.parse_stmt(false, false, true));
		}
		const end = this.expect(TokenType.CloseBrace, 'No se encontró "}"');
		if (end.type == TokenType.Error)
			return this.makeError(end, ErrorType.ParserError) as unknown as ClassDeclaration;
		return {
			kind: BLOCK_TYPE.CLASS_DECLARATION,
			identifier: name,
			body,
			string: this.getTo(col, row, end.col, end.row),
			extend,
			col,
			row,
			file,
			start,end
		};
	}
	private parse_class_prop(extra?: ClassPropertyExtra): ClassProperty {
		const data = this.expect(TokenType.Identifier, 'No se encontro el identificador');
		if (data.type === TokenType.Error)
			return this.makeError(data, ErrorType.ParserError) as unknown as ClassProperty;
		const name = data.value;
		const prev = this.eat();
		if (prev.type === TokenType.OpenParen) {
			const args: (string | IterableLiteral)[] = [];
			while (this.not_eof() && this.at().type != TokenType.CloseParen) {
				if(this.at().type === TokenType.Dot) {
					const data = this.parse_iterable() as unknown as ErrorStmt | IterableLiteral;
					if (data.kind === 'Error') return data as unknown as ClassProperty;
					args.push(data);
					if (this.at().type == TokenType.Comma) this.eat();
					continue;
				}
				const data = this.expect(TokenType.Identifier, 'No se encontro el identificador');
				if (data.type == TokenType.Error)
					return this.makeError(data, ErrorType.ParserError) as unknown as ClassProperty;
				args.push(data.value);
				if (this.at().type == TokenType.Comma) this.eat();
			}
			let _: Token = this.expect(TokenType.CloseParen, 'No se encontró ")"');
			if (_.type == TokenType.Error)
				return this.makeError(_, ErrorType.ParserError) as unknown as ClassProperty;
			_ = this.expect(TokenType.OpenBrace, 'No se encontró "{"');
			if (_.type == TokenType.Error)
				return this.makeError(_, ErrorType.ParserError) as unknown as ClassProperty;
			const body: Stmt[] = [];
			while (this.not_eof() && this.at().type != TokenType.CloseBrace) {
				body.push(this.parse_stmt(true));
			}
			_ = this.expect(TokenType.CloseBrace, 'No se encontró "}"');
			if (_.type == TokenType.Error)
				return this.makeError(_, ErrorType.ParserError) as unknown as ClassProperty;
			return {
				kind: LITERALS_TYPE.CLASS_PROPERTY,
				identifier: name,
				value: {
					kind: BLOCK_TYPE.FUNCTION_DECLARATION,
					identifier: '',
					params: args,
					body,
					col: prev.col,
					row: prev.row,
					file: prev.file,
				} as FunctionDeclaration,
				extra,
				col: prev.col,
				row: prev.row,
				file: prev.file,
			};
		}
		if (prev.type === TokenType.Equals) {
			const value = this.parse_expr();
			return {
				kind: LITERALS_TYPE.CLASS_PROPERTY,
				identifier: name,
				value,
				extra,
				col: prev.col,
				row: prev.row,
				file: prev.file,
			};
		}
		return this.makeError(
			{ ...prev, value: 'No se encontró el valor de la propiedad' },
			ErrorType.ParserError
		) as unknown as ClassProperty;
	}
	private parse_while_stmt(): WhileStatement {
		let _: Token = this.expect(
			TokenType.Mientras,
			`No se encontro la palabra clave "${TokenType.Mientras.toLowerCase()}"`
		);
		if (_.type == TokenType.Error)
			return this.makeError(_, ErrorType.ParserError) as unknown as WhileStatement;
		const { col, row, file } = _;
		_ = this.expect(TokenType.OpenParen, 'No se encontró "("');
		if (_.type == TokenType.Error)
			return this.makeError(_, ErrorType.ParserError) as unknown as WhileStatement;
		const condition = this.parse_expr();
		_ = this.expect(TokenType.CloseParen, 'No se encontró ")"');
		if (_.type == TokenType.Error)
			return this.makeError(_, ErrorType.ParserError) as unknown as WhileStatement;
		const start = this.expect(TokenType.OpenBrace, 'No se encontró "{"');
		if (start.type == TokenType.Error)
			return this.makeError(start, ErrorType.ParserError) as unknown as WhileStatement;
		const body: Stmt[] = [];
		while (this.not_eof() && this.at().type != TokenType.CloseBrace) {
			body.push(this.parse_stmt(false, true));
		}
		const end = this.expect(TokenType.CloseBrace, 'No se encontró "}"');
		if (end.type == TokenType.Error)
			return this.makeError(end, ErrorType.ParserError) as unknown as WhileStatement;
		return {
			kind: BLOCK_TYPE.WHILE_STATEMENT,
			condition,
			body,
			col,
			row,
			file,
			start, end
		};
	}
	private parse_var_decl(): VarDeclaration {
		const { col, row, file } = this.at();
		const isConstant = this.eat().type == TokenType.Const;
		const data = this.expect(TokenType.Identifier, 'No se encontro el identificador');
		if (data.type === TokenType.Error)
			return this.makeError(data, ErrorType.ParserError) as unknown as VarDeclaration;
		const name = data.value;
		if (this.at().type == TokenType.Equals) {
			this.eat();
			return {
				kind: STATEMENTS_TYPE.VAR_DECLARATION,
				constant: isConstant,
				identifier: name,
				value: this.parse_expr(),
				col,
				row,
				file,
			};
		}
		if (isConstant)
			return this.makeError(
				{ ...this.at(), value: 'Constantes deben tener un valor inical' },
				ErrorType.ParserError
			) as unknown as VarDeclaration;
		return {
			kind: STATEMENTS_TYPE.VAR_DECLARATION,
			constant: isConstant,
			identifier: name,
			value: undefined,
			col,
			row,
			file,
		};
	}
	private parse_expr() {
		const data = this.parse_assignment_expr();
		return data;
	}
	private parse_assignment_expr<Left extends Expr>(
		operator?: string,
		left?: Left
	): BinaryExpr | AssignmentExpr | Left;
	private parse_assignment_expr(operator = '', left = this.parse_object_expr()): Stmt {
		if (left.kind === ('Error' as EXPRESSIONS_TYPE)) return left;
		const { col, row, file } = this.at();
		if (this.at().type == TokenType.Equals) {
			this.eat(); // Advance the equals token
			operator += '='; // != = >= <= += -= /= *= ^=
			if (this.at().type == TokenType.Equals) {
				this.eat(); // Advance the equals token
				operator += '='; // !== ==
			}
			if (this.at().type == TokenType.Equals) {
				this.eat(); // Advance the equals token
				operator += '='; // ===
			}
			if (operator.length >= 2) {
				// != == !== === >= <= += -= /= *= ^=
				const right = this.parse_object_expr();
				if (right.kind === ('Error' as EXPRESSIONS_TYPE)) return right;

				return {
					kind: EXPRESSIONS_TYPE.BINARY_EXPR,
					left,
					operator,
					right,
					col,
					row,
					file,
				};
			}
			// =
			return {
				kind: EXPRESSIONS_TYPE.ASSIGNMENT_EXPR,
				assignee: left,
				value: this.parse_expr(),
				col,
				row,
				file,
			};
		}
		if (this.at().type == TokenType.Negate) {
			this.eat(); // Advance the negate token
			return this.parse_assignment_expr('!', left) as BinaryExpr;
		}
		if (this.at().type == TokenType.Or) {
			this.eat(); // Advance the or token
			return {
				kind: EXPRESSIONS_TYPE.BINARY_EXPR,
				left,
				operator: '|',
				right: this.parse_object_expr(),
				col,
				row,
				file,
			};
		}
		if (this.at().type == TokenType.And) {
			this.eat(); // Advance the and token
			return {
				kind: EXPRESSIONS_TYPE.BINARY_EXPR,
				left,
				operator: '&',
				right: this.parse_object_expr(),
				col,
				row,
				file,
			};
		}
		if (this.at().type == TokenType.OpenAngle)
			return this.parse_assignment_expr(this.eat().value, left);
		if (this.at().type == TokenType.CloseAngle)
			return this.parse_assignment_expr(this.eat().value, left);
		if (mathOperators.includes(this.at().value))
			return this.parse_assignment_expr(this.eat().value, left);
		if (operator) {
			return {
				kind: EXPRESSIONS_TYPE.BINARY_EXPR,
				left,
				operator,
				right: this.parse_object_expr(),
				col,
				row,
				file,
			};
		}

		return left;
	}
	private parse_object_expr(): Expr {
		if (this.at().type != TokenType.OpenBrace) return this.parse_array_expr() as Expr;
		const { col, row, file } = this.eat(); // Advance the open brace token
		const properties: (Property | IterableLiteral)[] = [];

		while (this.not_eof() && this.at().type != TokenType.CloseBrace) {
			let _: Token = this.at();
			if (this.at().type == TokenType.Dot) {
				properties.push(this.parse_iterable());
				if (this.at().type == TokenType.Comma) this.eat(); // Advance the colon token
				else if (this.at().type != TokenType.CloseBrace)
					return this.makeError(
						{
							...this.at(),
							value: 'No se encontró coma en la propiedad del objeto',
						},
						ErrorType.ParserError
					) as Expr;
				continue;
			} else if (this.at().type == TokenType.String) _ = this.eat();
			else if (this.at().type == TokenType.OpenBracket) {
				this.eat();
				_ = this.at();
			} else
				_ = this.expect(
					TokenType.Identifier,
					'No se puede usar un valor que no sea un identificador como clave de objeto'
				);

			if (_.type == TokenType.Error) return this.makeError(_, ErrorType.ParserError) as Expr;
			const { value: key, col, row, file } = _;

			// Allow shorthand
			if (this.at().type == TokenType.Comma) {
				this.eat(); // Advance the colon token
				properties.push({ key, kind: LITERALS_TYPE.PROPERTY, col, row, file });
				continue;
			} else if (this.at().type == TokenType.CloseBrace) {
				properties.push({ key, kind: LITERALS_TYPE.PROPERTY, col, row, file });
				continue;
			}

			_ = this.expect(TokenType.Colon, 'No se encontró dos puntos en la propiedad del objeto');
			if (_.type == TokenType.Error) return this.makeError(_, ErrorType.ParserError) as Expr;
			const value = this.parse_expr();
			properties.push({
				key,
				value,
				kind: LITERALS_TYPE.PROPERTY,
				col,
				row,
				file,
			});
			if (this.at().type != TokenType.CloseBrace) {
				_ = this.expect(TokenType.Comma, 'No se encontró coma en la propiedad del objeto');
				if (_.type == TokenType.Error) return this.makeError(_, ErrorType.ParserError) as Expr;
			}
		}
		const _ = this.expect(TokenType.CloseBrace, 'No se encontró llave de cierre');

		if (_.type == TokenType.Error) return this.makeError(_, ErrorType.ParserError) as Expr;
		return {
			kind: 'ObjectLiteral',
			properties,
			col,
			row,
			file,
		} as ObjectLiteral;
	}
	private parse_array_expr() {
		if (this.at().type != TokenType.OpenBracket) return this.parse_additive_expr();

		const { col, row, file } = this.eat(); // Advance the open brace token
		const properties: (Property | IterableLiteral)[] = [];

		while (this.not_eof() && this.at().type != TokenType.CloseBracket) {
			const key = properties.length.toString();
			const value = this.parse_expr();
			if (value.kind === LITERALS_TYPE.ITERABLE_LITERAL) properties.push(value);
			else
				properties.push({
					key,
					value,
					kind: LITERALS_TYPE.PROPERTY,
					col,
					row,
					file,
				});
			if (this.at().type != TokenType.CloseBracket) {
				const _ = this.expect(TokenType.Comma, 'No se encontró coma en la lista');
				if (_.type == TokenType.Error) return this.makeError(_, ErrorType.ParserError) as Expr;
			}
		}

		const _ = this.expect(TokenType.CloseBracket, 'No se encontró llave de cierre');
		if (_.type == TokenType.Error) return this.makeError(_, ErrorType.ParserError) as Expr;
		return { kind: 'ArrayLiteral', properties, col, row, file };
	}
	private parse_additive_expr() {
		let left = this.parse_multiplicative_expr();

		while (this.at().value == '+' || this.at().value == '-') {
			if (left.kind === ('Error' as EXPRESSIONS_TYPE)) return left;
			const operator = this.eat().value;
			const right = this.parse_multiplicative_expr();
			left = {
				kind: EXPRESSIONS_TYPE.BINARY_EXPR,
				left,
				right,
				operator,
				col: left.col,
				row: left.row,
				file: left.file,
			};
		}

		return left;
	}
	private parse_member_expr(object = this.parse_primary_expr()) {
		const { col, row, file } = this.at();

		while (this.at().type == TokenType.Dot || this.at().type == TokenType.OpenBracket) {
			const operator = this.eat();
			let property: Expr;
			let computed: boolean;

			if (operator.type == TokenType.Dot) {
				property = this.parse_primary_expr(true);
				computed = false;
				if (property.kind != LITERALS_TYPE.IDENTIFIER)
					return this.makeError(
						{
							...operator,
							value: 'No se puede acceder a una propiedad que no sea un identificador',
						},
						ErrorType.ParserError
					) as unknown as MemberExpr;
			} else {
				property = this.parse_expr();
				computed = true;
				const _ = this.expect(TokenType.CloseBracket, 'No se encontró corchete de cierre');
				if (_.type == TokenType.Error)
					return this.makeError(_, ErrorType.ParserError) as unknown as MemberExpr;
			}
			object = {
				kind: 'MemberExpr',
				object,
				property,
				computed,
				col,
				row,
				file,
			} as MemberExpr;
		}
		return object;
	}
	private parse_arguments_list(): Expr[] {
		const args = [this.parse_expr()];
		while (this.not_eof() && this.at().type == TokenType.Comma && this.eat()) {
			args.push(this.parse_expr());
		}
		return args;
	}
	private parse_args(): Expr[] {
		let _: Token = this.expect(TokenType.OpenParen, 'No se encontró paréntesis de apertura');
		if (_.type == TokenType.Error) return [this.makeError(_, ErrorType.ParserError)] as Expr[];
		const args = this.at().type == TokenType.CloseParen ? [] : this.parse_arguments_list();
		_ = this.expect(TokenType.CloseParen, 'No se encontró paréntesis de cierre');
		if (_.type == TokenType.Error) return [this.makeError(_, ErrorType.ParserError)] as Expr[];
		return args;
	}
	private parse_call_expr(callee: Expr): Expr {
		let call_expr: Expr = {
			kind: 'CallExpr',
			callee,
			args: this.parse_args(),
			col: callee.col,
			row: callee.row,
			file: callee.file,
		} as CallExpr;
		if (this.at().type == TokenType.OpenParen || this.at().type == TokenType.Dot)
			call_expr = this.parse_call_member_expr(call_expr);

		return call_expr;
	}
	private parse_call_member_expr(object?: Expr): Expr {
		const member = this.parse_member_expr(object);

		if (this.at().type == TokenType.OpenParen) return this.parse_call_expr(member);
		return member;
	}
	private parse_multiplicative_expr() {
		let left = this.parse_sqrt_expr();
		while (this.at().value == '*' || this.at().value == '/' || this.at().value == '%') {
			if (left.kind === ('Error' as EXPRESSIONS_TYPE)) return left;
			const operator = this.eat().value;
			const right = this.parse_sqrt_expr();
			left = {
				kind: EXPRESSIONS_TYPE.BINARY_EXPR,
				left,
				right,
				operator,
				col: left.col,
				row: left.row,
				file: left.file,
			};
		}

		return left;
	}
	private parse_sqrt_expr() {
		let left = this.parse_call_member_expr();

		while (this.at().value == '^') {
			if (left.kind === ('Error' as EXPRESSIONS_TYPE)) return left;
			const operator = this.eat().value;
			const right = this.parse_call_member_expr();
			left = {
				kind: EXPRESSIONS_TYPE.BINARY_EXPR,
				left,
				right,
				operator,
				col: left.col,
				row: left.row,
				file: left.file,
			};
		}

		return left;
	}
	private parse_primary_expr(isProp?:boolean): Expr {
		const tk = this.at();
		switch (tk.type) {
			case TokenType.Exportar:
				// deno-lint-ignore no-fallthrough
			case TokenType.Importar:
				if(!isProp) return this.makeError({...tk, value: `${tk.type.toLowerCase()} no puede ser usado como expresión`}, ErrorType.ParserError) as unknown as Expr;
			case TokenType.Identifier:
				return {
					kind: LITERALS_TYPE.IDENTIFIER,
					symbol: this.eat().value,
					col: tk.col,
					row: tk.row,
					file: tk.file,
				};
			case TokenType.Number: {
				this.eat();
				const data: [number, string] = [10, '0'];
				if (tk.value.includes('$')){
					const [base, value] = tk.value.split('$');
					const float = parseFloat(base);
					const int = parseInt(base);
					if(int !== float || int < 0) return this.makeError({...tk, value: 'El número base debe ser un número entero real positivo'}, ErrorType.ParserError) as unknown as Expr;
					if(2 > int || int > 36) return this.makeError({...tk, value: 'El número base debe estar entre 2 y 36'}, ErrorType.ParserError) as unknown as Expr;
					data[0] = int;
					data[1] = value;
				}
				const value_ = data[0] === 10 ? eval_complex(tk.value, {}) : parseInt(data[1], data[0]);
				type Item<A> = A extends (infer I)[] ? I : A;
				return {
					kind: LITERALS_TYPE.NUMERIC_LITERAL,
					value: value_ as Item<typeof value_>,
					col: tk.col,
					row: tk.row,
					file: tk.file,
				};
			}
			case TokenType.EOF:
			case TokenType.String:
				return {
					kind: LITERALS_TYPE.STRING_LITERAL,
					value: this.eat().value,
					col: tk.col,
					row: tk.row,
					file: tk.file,
				};

			case TokenType.OpenParen: {
				this.eat(); // Eat the open paren
				const value = this.parse_expr();
				const _ = this.expect(TokenType.CloseParen, 'No se encontró el paréntesis de cierre'); // Eat the close paren
				if (_.type == TokenType.Error) return this.makeError(_, ErrorType.ParserError) as Expr;
				return value;
			}
			case TokenType.Funcion:
				return this.parse_func_decl() as unknown as Expr;
			case TokenType.Mientras:
				return this.parse_while_stmt() as unknown as Expr;
			case TokenType.BinaryOperator:
				if (this.at().value == '-' || this.at().value == '+') {
					const data = this.eat();
					const { col, row, file } = data;
					let operator = data.value;
					if (this.at().value === operator) {
						this.eat();
						operator += operator;
					}
					return {
						kind: EXPRESSIONS_TYPE.UNARY_EXPR,
						value: this.parse_expr(),
						operator,
						col,
						row,
						file,
					};
				}
				break;
			case TokenType.Error:
				return this.makeError(this.eat(), ErrorType.TokenizerError) as unknown as Expr;
			case TokenType.Dot:
				return this.parse_iterable();
			case TokenType.Negate:
				this.eat();
				return {
					kind: EXPRESSIONS_TYPE.UNARY_EXPR,
					value: this.parse_expr(),
					operator: tk.value,
					col: tk.col,
					row: tk.row,
					file: tk.file,
				};
		}
		this.eat();
		return this.makeError(
			{ ...tk, value: `Un token inesperado "${tk.type}"` },
			ErrorType.TokenizerError
		) as unknown as Expr;
	}
}
