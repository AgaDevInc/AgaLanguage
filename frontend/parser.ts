import {
	type Stmt,
	type Program,
	type Expr,
	type BinaryExpr,
	type NumericLiteral,
	type VarDeclaration,
	type AssignmentExpr,
	type Property,
	type ObjectLiteral,
	type CallExpr,
	type MemberExpr,
	type IfStatement,
	type ReturnStatement,
	type FunctionDeclaration,
	type ClassDeclaration,
	type ClassProperty,
	ClassPropertyExtra,
	type WhileStatement,
	LITERALS_TYPE,
	BLOCK_TYPE,
	STATEMENTS_TYPE,
	ErrorType,
IterableLiteral,
} from './ast.ts';
import { tokenize, Token, TokenType } from './lexer.ts';
import * as ComplexMath from 'aga:ComplexMath';

export const zero: NumericLiteral = {
	kind: LITERALS_TYPE.NUMERIC_LITERAL,
	value: 0,
	col: 0,
	row: 0,
	file: '',
};

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
		const prev = this.tokens.shift() as Token & {type: T}
		if (!prev || prev.type != type)
			return { type: TokenType.Error, value: err, col: 0, row: 0, file: '' } as Token & {type: TokenType.Error};
		return prev;
	}
	private sourceCode = '';
	public produceAST(
		sourceCode: string,
		isFunction = false,
		file?: string
	): Program {
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
			const data = this.parse_stmt(isFunction);
			if (data) {
				if (data.kind === 'Error') {
					program.body.push(data);
					return program;
				} else if (data.kind === BLOCK_TYPE.FUNCTION_DECLARATION)
					functions.push(data);
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
		return {
			kind: 'Error',
			col: token.col,
			row: token.row,
			file: token.file,
			message: token.value,
			type,
		};
	}

	private parse_stmt(
		isFunction?: boolean,
		isLoop?: boolean,
		isClassDecl?: false
	): Stmt;
	private parse_stmt(
		isFunction: boolean,
		isLoop: boolean,
		isClassDecl: true
	): ClassProperty;
	private parse_stmt(isFunction = false, isLoop = false, isClassDecl = false) {
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
				this.eat();
				break;
			case TokenType.Dot:
				return this.parse_iterable();
			default:
				return this.parse_expr();
		}
		return this.parse_expr();
	}
	parse_iterable() {
		// ...value
		const { col, row, file } = this.eat();
		let _ = this.expect(
			TokenType.Dot,
			`No se encontró el token "${TokenType.Dot.toLowerCase()}"`
		);
		if (_.type == TokenType.Error)
			return this.makeError(_, ErrorType.ParserError);
		_ = this.expect(
			TokenType.Dot,
			`No se encontró el token "${TokenType.Dot.toLowerCase()}"`
		)
		if (_.type == TokenType.Error)
			return this.makeError(_, ErrorType.ParserError);
		const data = this.expect(
			TokenType.Identifier,
			'No se encontro el identificador'
		);
		if (data.type === TokenType.Error)
			return this.makeError(data, ErrorType.ParserError);
		const name = data.value;
		const iter: IterableLiteral = {
			kind: LITERALS_TYPE.ITERABLE_LITERAL,
			identifier: name,
			col,
			row,
			file,
		};
		return iter;
	}
	private parse_if_stmt(isFunction = false, isLoop = false): Stmt {
		const token = this.expect(
			TokenType.Si,
			`No se encontró "${TokenType.Si.toLowerCase()}"`
		);
		if (token.type == TokenType.Error)
			return this.makeError(token, ErrorType.ParserError);

		let _: Token = this.expect(TokenType.OpenParen, 'No se encontró "("');
		if (_.type == TokenType.Error)
			return this.makeError(_, ErrorType.ParserError);

		const condition = this.parse_expr();

		_ = this.expect(TokenType.CloseParen, 'No se encontró ")"');
		if (_.type == TokenType.Error)
			return this.makeError(_, ErrorType.ParserError);
		_ = this.expect(TokenType.OpenBrace, 'No se encontró "{"');
		if (_.type == TokenType.Error)
			return this.makeError(_, ErrorType.ParserError);

		const ifStmt: IfStatement = {
			kind: BLOCK_TYPE.IF_STATEMENT,
			condition,
			body: [] as Stmt[],
			col: token.col,
			row: token.row,
			else: {
				kind: BLOCK_TYPE.ELSE_STATEMENT,
				body: [] as Stmt[],
				col: 0,
				row: 0,
				file: token.file,
			},
			file: token.file,
		};

		while (this.at().type != TokenType.CloseBrace) {
			ifStmt.body.push(this.parse_stmt(isFunction, isLoop));
		}
		_ = this.expect(TokenType.CloseBrace, 'No se encontró "}"');
		if (_.type == TokenType.Error)
			return this.makeError(_, ErrorType.ParserError);
		if (this.at().type == TokenType.Entonces) {
			const elseToken = this.eat();
			ifStmt.else.col = elseToken.col;
			ifStmt.else.row = elseToken.row;

			// else if
			if (this.at().type == TokenType.Si) {
				ifStmt.else.body.push(this.parse_if_stmt(isFunction, isLoop));
			} else {
				_ = this.expect(TokenType.OpenBrace, 'No se encontró "{"');
				if (_.type == TokenType.Error)
					return this.makeError(_, ErrorType.ParserError);

				while (this.at().type != TokenType.CloseBrace)
					ifStmt.else.body.push(this.parse_stmt(isFunction, isLoop));

				_ = this.expect(TokenType.CloseBrace, 'No se encontró "}"');
				if (_.type == TokenType.Error)
					return this.makeError(_, ErrorType.ParserError);
			}
		}
		return ifStmt;
	}
	private parse_return_stmt(): ReturnStatement {
		const _ = this.expect(
			TokenType.Retorna,
			`No se encontró la palabra clave "${TokenType.Retorna.toLowerCase()}""`
		);
		if (_.type == TokenType.Error)
			return this.makeError(
				_,
				ErrorType.ParserError
			) as unknown as ReturnStatement;
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
			return this.makeError(
				_,
				ErrorType.ParserError
			) as unknown as FunctionDeclaration;
		const { col, row, file } = _;

		const nextToken = this.at();
		let name = '';
		if (nextToken.type == TokenType.Identifier) name = this.eat().value;
		else if (!isVar)
			return this.makeError(
				{ ...nextToken, value: `No se encontró el identificador` },
				ErrorType.ParserError
			) as unknown as FunctionDeclaration;

		_ = this.expect(TokenType.OpenParen, 'No se encontró "("');
		if (_.type == TokenType.Error)
			return this.makeError(
				_,
				ErrorType.ParserError
			) as unknown as FunctionDeclaration;
		const args: string[] = [];
		while (this.at().type != TokenType.CloseParen) {
			const data = this.expect(
				TokenType.Identifier,
				'No se encontro el identificador del argumento'
			);
			if (data.type == TokenType.Error)
				return this.makeError(
					data,
					ErrorType.ParserError
				) as unknown as FunctionDeclaration;
			args.push(data.value);
			if (this.at().type == TokenType.Comma) this.eat();
		}
		_ = this.expect(TokenType.CloseParen, 'No se encontró ")"');
		if (_.type == TokenType.Error)
			return this.makeError(
				_,
				ErrorType.ParserError
			) as unknown as FunctionDeclaration;
		_ = this.expect(TokenType.OpenBrace, 'No se encontró "{"');
		if (_.type == TokenType.Error)
			return this.makeError(
				_,
				ErrorType.ParserError
			) as unknown as FunctionDeclaration;
		const body: Stmt[] = [];
		while (this.at().type != TokenType.CloseBrace) {
			const data = this.parse_stmt(true);
			if (data.kind === 'Error') return data as unknown as FunctionDeclaration;
			body.push(data);
		}
		const endToken = this.expect(TokenType.CloseBrace, 'No se encontró "}"');
		if (endToken.type == TokenType.Error)
			return this.makeError(
				endToken,
				ErrorType.ParserError
			) as unknown as FunctionDeclaration;
		return {
			kind: BLOCK_TYPE.FUNCTION_DECLARATION,
			identifier: name,
			params: args,
			body,
			string: this.getTo(col, row, endToken.col, endToken.row),
			col,
			row,
			file,
		};
	}
	private parse_class_decl(): ClassDeclaration {
		let _:Token = this.expect(
			TokenType.Clase,
			`No se encontró la palabra clave "${TokenType.Clase.toLowerCase()}"`
		);
		if (_.type == TokenType.Error)
			return this.makeError(
				_,
				ErrorType.ParserError
			) as unknown as ClassDeclaration;
		const { col, row, file } = _;

		const data = this.expect(
			TokenType.Identifier,
			'No se encontro el identificador'
		);
		if (data.type === TokenType.Error)
			return this.makeError(
				data,
				ErrorType.ParserError
			) as unknown as ClassDeclaration;
		const name = data.value;
		_ = this.expect(TokenType.OpenBrace, 'No se encontró "{"');
		if (_.type == TokenType.Error)
			return this.makeError(
				_,
				ErrorType.ParserError
			) as unknown as ClassDeclaration;
		const body = [];
		while (this.at().type != TokenType.CloseBrace) {
			body.push(this.parse_stmt(false, false, true));
		}
		const endToken = this.expect(TokenType.CloseBrace, 'No se encontró "}"');
		if (endToken.type == TokenType.Error)
			return this.makeError(
				endToken,
				ErrorType.ParserError
			) as unknown as ClassDeclaration;
		return {
			kind: BLOCK_TYPE.CLASS_DECLARATION,
			identifier: name,
			body,
			string: this.getTo(col, row, endToken.col, endToken.row),
			col,
			row,
			file,
		};
	}
	private parse_class_prop(extra?: ClassPropertyExtra): ClassProperty {
		const data = this.expect(
			TokenType.Identifier,
			'No se encontro el identificador'
		);
		if (data.type === TokenType.Error)
			return this.makeError(
				data,
				ErrorType.ParserError
			) as unknown as ClassProperty;
		const name = data.value;
		const prev = this.eat();
		if (prev.type === TokenType.OpenParen) {
			const args: string[] = [];
			while (this.at().type != TokenType.CloseParen) {
				const data = this.expect(
					TokenType.Identifier,
					'No se encontro el identificador'
				);
				if (data.type == TokenType.Error)
					return this.makeError(
						data,
						ErrorType.ParserError
					) as unknown as ClassProperty;
				args.push(data.value);
				if (this.at().type == TokenType.Comma) this.eat();
			}
			let _:Token = this.expect(TokenType.CloseParen, 'No se encontró ")"');
			if (_.type == TokenType.Error)
				return this.makeError(
					_,
					ErrorType.ParserError
				) as unknown as ClassProperty;
			_ = this.expect(TokenType.OpenBrace, 'No se encontró "{"');
			if (_.type == TokenType.Error)
				return this.makeError(
					_,
					ErrorType.ParserError
				) as unknown as ClassProperty;
			const body: Stmt[] = [];
			while (this.at().type != TokenType.CloseBrace) {
				body.push(this.parse_stmt(true));
			}
			_ = this.expect(TokenType.CloseBrace, 'No se encontró "}"');
			if (_.type == TokenType.Error)
				return this.makeError(
					_,
					ErrorType.ParserError
				) as unknown as ClassProperty;
			return {
				kind: LITERALS_TYPE.CLASS_PROPERTY,
				identifier: name,
				value: {
					kind: BLOCK_TYPE.FUNCTION_DECLARATION,
					identifier: name,
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
		let _:Token = this.expect(
			TokenType.Mientras,
			`No se encontro la palabra clave "${TokenType.Mientras.toLowerCase()}"`
		);
		if (_.type == TokenType.Error)
			return this.makeError(
				_,
				ErrorType.ParserError
			) as unknown as WhileStatement;
		const { col, row, file } = _;
		_ = this.expect(TokenType.OpenParen, 'No se encontró "("');
		if (_.type == TokenType.Error)
			return this.makeError(
				_,
				ErrorType.ParserError
			) as unknown as WhileStatement;
		const condition = this.parse_expr();
		_ = this.expect(TokenType.CloseParen, 'No se encontró ")"');
		if (_.type == TokenType.Error)
			return this.makeError(
				_,
				ErrorType.ParserError
			) as unknown as WhileStatement;
		_ = this.expect(TokenType.OpenBrace, 'No se encontró "{"');
		if (_.type == TokenType.Error)
			return this.makeError(
				_,
				ErrorType.ParserError
			) as unknown as WhileStatement;
		const body: Stmt[] = [];
		while (this.at().type != TokenType.CloseBrace) {
			body.push(this.parse_stmt(false, true));
		}
		_ = this.expect(TokenType.CloseBrace, 'No se encontró "}"');
		if (_.type == TokenType.Error)
			return this.makeError(
				_,
				ErrorType.ParserError
			) as unknown as WhileStatement;
		return {
			kind: BLOCK_TYPE.WHILE_STATEMENT,
			condition,
			body,
			col,
			row,
			file,
		};
	}
	private parse_var_decl(): VarDeclaration {
		const { col, row, file } = this.at();
		const isConstant = this.eat().type == TokenType.Const;
		const data = this.expect(
			TokenType.Identifier,
			'No se encontro el identificador'
		);
		if (data.type === TokenType.Error)
			return this.makeError(
				data,
				ErrorType.ParserError
			) as unknown as VarDeclaration;
		const name = data.value;
		if (this.at().type == TokenType.Equals) {
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
		return this.parse_assignment_expr();
	}
	private parse_assignment_expr<Left extends Expr>(
		operator?: string,
		left?: Left
	): BinaryExpr | AssignmentExpr | Left;
	private parse_assignment_expr(
		operator = '',
		left = this.parse_object_expr()
	) {
		const { col, row, file } = this.at();
		if (this.at().type == TokenType.Equals) {
			this.eat(); // Advance the equals token
			operator += '='; // != =
			if (this.at().type == TokenType.Equals) {
				this.eat(); // Advance the equals token
				operator += '='; // !== ==
			}
			if (this.at().type == TokenType.Equals) {
				this.eat(); // Advance the equals token
				operator += '='; // ===
			}
			if (operator.length >= 2) {
				// != == !== ===
				const right = this.parse_object_expr();
				return {
					kind: 'BinaryExpr',
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
				kind: 'AssignmentExpr',
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
				kind: 'BinaryExpr',
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
				kind: 'BinaryExpr',
				left,
				operator: '&',
				right: this.parse_object_expr(),
				col,
				row,
				file,
			};
		}
		if (this.at().type == TokenType.OpenAngle) {
			this.eat(); // Advance the open angle token
			return this.parse_assignment_expr('<', left);
		}
		if (this.at().type == TokenType.CloseAngle) {
			this.eat(); // Advance the close angle token
			return this.parse_assignment_expr('>', left);
		}
		if (operator) {
			return {
				kind: 'BinaryExpr',
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
		if (this.at().type != TokenType.OpenBrace)
			return this.parse_array_expr() as Expr;

		const { col, row, file } = this.eat(); // Advance the open brace token
		const properties: Property[] = [];

		while (this.not_eof() && this.at().type != TokenType.CloseBrace) {
			let _:Token = this.expect(
				TokenType.Identifier,
				'No se puede usar un valor que no sea un identificador como clave de objeto'
			);
			if (_.type == TokenType.Error)
				return this.makeError(_, ErrorType.ParserError) as Expr;
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
			_ = this.expect(
				TokenType.Colon,
				'No se encontró dos puntos en la propiedad del objeto'
			);
			if (_.type == TokenType.Error)
				return this.makeError(_, ErrorType.ParserError) as Expr;
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
				_ = this.expect(
					TokenType.Comma,
					'No se encontró coma en la propiedad del objeto'
				);
				if (_.type == TokenType.Error)
					return this.makeError(_, ErrorType.ParserError) as Expr;
			}
		}
		const _ = this.expect(
			TokenType.CloseBrace,
			'No se encontró llave de cierre'
		);

		if (_.type == TokenType.Error)
			return this.makeError(_, ErrorType.ParserError) as Expr;
		return {
			kind: 'ObjectLiteral',
			properties,
			col,
			row,
			file,
		} as ObjectLiteral;
	}
	private parse_array_expr() {
		if (this.at().type != TokenType.OpenBracket)
			return this.parse_additive_expr();

		const { col, row, file } = this.eat(); // Advance the open brace token
		const properties: Property[] = [];

		while (this.not_eof() && this.at().type != TokenType.CloseBracket) {
			const key = properties.length.toString();
			const value = this.parse_expr();
			properties.push({
				key,
				value,
				kind: LITERALS_TYPE.PROPERTY,
				col,
				row,
				file,
			});
			if (this.at().type != TokenType.CloseBracket) {
				const _ = this.expect(
					TokenType.Comma,
					'No se encontró coma en la lista'
				);
				if (_.type == TokenType.Error)
					return this.makeError(_, ErrorType.ParserError) as Expr;
			}
		}

		const _ = this.expect(
			TokenType.CloseBracket,
			'No se encontró llave de cierre'
		);
		if (_.type == TokenType.Error)
			return this.makeError(_, ErrorType.ParserError) as Expr;
		return { kind: 'ArrayLiteral', properties, col, row, file };
	}
	private parse_additive_expr() {
		let left = this.parse_multiplicative_expr();

		while (this.at().value == '+' || this.at().value == '-') {
			const operator = this.eat().value;
			const right = this.parse_multiplicative_expr();
			left = {
				kind: 'BinaryExpr',
				left,
				right,
				operator,
				file: left.file,
			} as BinaryExpr;
		}

		return left;
	}
	private parse_member_expr() {
		const { col, row, file } = this.at();
		let object = this.parse_primary_expr();

		while (
			this.at().type == TokenType.Dot ||
			this.at().type == TokenType.OpenBracket
		) {
			const operator = this.eat();
			let property: Expr;
			let computed: boolean;

			if (operator.type == TokenType.Dot) {
				property = this.parse_primary_expr();
				computed = false;
				if (property.kind != LITERALS_TYPE.IDENTIFIER)
					return this.makeError(
						{
							...operator,
							value:
								'No se puede acceder a una propiedad que no sea un identificador',
						},
						ErrorType.ParserError
					) as unknown as MemberExpr;
				property.kind =
					LITERALS_TYPE.PROPERTY_IDENTIFIER as unknown as LITERALS_TYPE.IDENTIFIER;
			} else {
				property = this.parse_expr();
				computed = true;
				const _ = this.expect(
					TokenType.CloseBracket,
					'No se encontró corchete de cierre'
				);
				if (_.type == TokenType.Error)
					return this.makeError(
						_,
						ErrorType.ParserError
					) as unknown as MemberExpr;
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
		let _:Token = this.expect(
			TokenType.OpenParen,
			'No se encontró paréntesis de apertura'
		);
		if (_.type == TokenType.Error)
			return [this.makeError(_, ErrorType.ParserError)] as Expr[];
		const args =
			this.at().type == TokenType.CloseParen ? [] : this.parse_arguments_list();
		_ = this.expect(
			TokenType.CloseParen,
			'No se encontró paréntesis de cierre'
		);
		if (_.type == TokenType.Error)
			return [this.makeError(_, ErrorType.ParserError)] as Expr[];
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
		if (this.at().type == TokenType.OpenParen)
			call_expr = this.parse_call_expr(call_expr);

		return call_expr;
	}
	private parse_call_member_expr(): Expr {
		const member = this.parse_member_expr();

		if (this.at().type == TokenType.OpenParen)
			return this.parse_call_expr(member);
		return member;
	}
	private parse_multiplicative_expr() {
		let left = this.parse_sqrt_expr();

		while (
			this.at().value == '*' ||
			this.at().value == '/' ||
			this.at().value == '%'
		) {
			const operator = this.eat().value;
			const right = this.parse_sqrt_expr();
			left = {
				kind: 'BinaryExpr',
				left,
				right,
				operator,
				file: left.file,
			} as BinaryExpr;
		}

		return left;
	}
	private parse_sqrt_expr() {
		let left = this.parse_call_member_expr();

		while (this.at().value == '^') {
			const operator = this.eat().value;
			const right = this.parse_call_member_expr();
			left = {
				kind: 'BinaryExpr',
				left,
				right,
				operator,
				file: left.file,
			} as BinaryExpr;
		}

		return left;
	}
	private parse_primary_expr(): Expr {
		const tk = this.at();
		switch (tk.type) {
			case TokenType.Identifier:
				return {
					kind: LITERALS_TYPE.IDENTIFIER,
					symbol: this.eat().value,
					col: tk.col,
					row: tk.row,
					file: tk.file,
				};
			case TokenType.Number:{
				const value_ = ComplexMath.eval_complex(this.eat().value, {});
				type Item<A> = A extends (infer I)[] ? I : A;
				return {
					kind: LITERALS_TYPE.NUMERIC_LITERAL,
					value: value_ as Item<typeof value_>,
					col: tk.col,
					row: tk.row,
					file: tk.file,
				};}
			case TokenType.String:
				return {
					kind: LITERALS_TYPE.STRING_LITERAL,
					value: this.eat().value,
					col: tk.col,
					row: tk.row,
					file: tk.file,
				};

			case TokenType.OpenParen:{
				this.eat(); // Eat the open paren
				const value = this.parse_expr();
				const _ = this.expect(
					TokenType.CloseParen,
					'No se encontró el paréntesis de cierre'
				); // Eat the close paren
				if (_.type == TokenType.Error)
					return this.makeError(_, ErrorType.ParserError) as Expr;
				return value;}
			case TokenType.Funcion:
				return this.parse_func_decl() as unknown as Expr;
			case TokenType.Mientras:
				return this.parse_while_stmt() as unknown as Expr;
			case TokenType.BinaryOperator:
				if (this.at().value == '-' || this.at().value == '+') {
					const { col, row, file } = this.eat();
					return {
						kind: 'BinaryExpr',
						left: zero,
						right: this.parse_expr(),
						operator: '-',
						col,
						row,
						file,
					} as BinaryExpr;
				}
				break;
			case TokenType.Error:
				return this.makeError(
					this.eat(),
					ErrorType.TokenizerError
				) as unknown as Expr;
		}
		return this.makeError(
			{ ...tk, value: `Un token inesperado "${tk.type}"` },
			ErrorType.TokenizerError
		) as unknown as Expr;
	}
}
