// deno-lint-ignore-file no-case-declarations
import {
	Stmt,
	Program,
	Expr,
	BinaryExpr,
	NumericLiteral,
	VarDeclaration,
	AssignmentExpr,
	Property,
	ObjectLiteral,
	CallExpr,
	MemberExpr,
	ArrayLiteral,
	IfStatement,
	ReturnStatement,
	FunctionDeclaration,
	ClassDeclaration,
	ClassProperty,
	ClassPropertyExtra,
	WhileStatement,
} from './ast.ts';
import { tokenize, Token, TokenType } from './lexer.ts';
import AgaError, { InvalidSyntaxError } from '../Errors.ts';
import * as ComplexMath from 'aga:ComplexMath';

const zero: NumericLiteral = {
	kind: 'NumericLiteral',
	value: 0,
	col: 0,
	row: 0,
	file: '',
};

type ArrayToken = Omit<Token[], 'shift'> & { shift: () => Token };

export default class Parser {
	private tokens: ArrayToken = null as unknown as ArrayToken;

	private not_eof(): boolean {
		return this.tokens[0].type != TokenType.EOF;
	}

	private at(): Token {
		return this.tokens[0];
	}

	private eat(): Token {
		const prev = this.tokens.shift();
		return prev;
	}
	private expect(type: TokenType, err: string): Token {
		const prev = this.tokens.shift();
		if (!prev || prev.type != type) {
			new InvalidSyntaxError(prev?.col ?? 0, prev?.row ?? 0, err).throw();
		}
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
			kind: 'Program',
			body: [],
			file: file ?? '',
			row: 0,
			col: 0,
		};

		// Parse until the end of the file
		while (this.not_eof()) {
			const data = this.parse_stmt(isFunction);
			if (data) program.body.push(data);
		}

		return program;
	}
	private getTo(aCol: number, aRow: number, bCol: number, bRow: number) {
		const code = this.sourceCode.split('\n');
		const lines = aRow == bRow ? [code[aRow - 1]] : code.slice(aRow - 1, bRow);
		lines[0] = lines[0].slice(aCol - 1);
		lines[lines.length - 1] = lines[lines.length - 1].slice(0, bCol);
		return lines.join('\n');
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
			case TokenType.Def:
			case TokenType.Const:
				return this.parse_var_decl();
			case TokenType.Funcion:
				return this.parse_func_decl();
			case TokenType.Si:
				return this.parse_if_stmt(isFunction, isLoop);
			case TokenType.Entonces:
				new InvalidSyntaxError(
					token.col,
					token.row,
					'No puedes usar "entonces" sin un "si"'
				).throw();
				break;
			case TokenType.Retorna:
				if (!isFunction)
					new InvalidSyntaxError(
						token.col,
						token.row,
						`No puedes usar "${TokenType.Retorna.toLowerCase()}" fuera de una función`
					).throw();
				return this.parse_return_stmt();
			case TokenType.Mientras:
				return this.parse_while_stmt();
			case TokenType.Romper:
				if (!isLoop)
					new InvalidSyntaxError(
						token.col,
						token.row,
						'No puedes usar "romper" fuera de un ciclo'
					).throw();
				this.eat();
				return {
					kind: 'BreakStatement',
					col: token.col,
					row: token.row,
				};
			case TokenType.Continuar:
				if (!isLoop)
					new InvalidSyntaxError(
						token.col,
						token.row,
						'No puedes usar "continuar" fuera de un ciclo'
					).throw();
				this.eat();
				return {
					kind: 'ContinueStatement',
					col: token.col,
					row: token.row,
				};
			case TokenType.Clase:
				if (isClassDecl)
					new InvalidSyntaxError(
						token.col,
						token.row,
						'No puedes declarar una clase dentro de otra'
					).throw();
				return this.parse_class_decl();
			case TokenType.Identifier:
				if (isClassDecl) return this.parse_class_prop();
				else return this.parse_expr();
			case TokenType.Estatico:
				if (!isClassDecl)
					new InvalidSyntaxError(
						token.col,
						token.row,
						'No puedes declarar una propiedad fuera de una clase'
					).throw();
				this.eat();
				return this.parse_class_prop('static');
			case TokenType.Semicolon:
				this.eat();
				break;
			default:
				return this.parse_expr();
		}
		return this.parse_expr();
	}
	private parse_if_stmt(isFunction = false, isLoop = false): Stmt {
		const token = this.expect(TokenType.Si, 'No se encontró "si"');

		this.expect(TokenType.OpenParen, 'No se encontró "("');
		const condition = this.parse_expr();

		this.expect(TokenType.CloseParen, 'No se encontró ")"');
		this.expect(TokenType.OpenBrace, 'No se encontró "{"');

		const ifStmt: IfStatement = {
			kind: 'IfStatement',
			condition,
			body: [] as Stmt[],
			col: token.col,
			row: token.row,
			else: {
				kind: 'ElseStatement',
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
		this.expect(TokenType.CloseBrace, 'No se encontró "}"');
		if (this.at().type == TokenType.Entonces) {
			const elseToken = this.eat();
			ifStmt.else.col = elseToken.col;
			ifStmt.else.row = elseToken.row;

			// else if
			if (this.at().type == TokenType.Si) {
				ifStmt.else.body.push(this.parse_if_stmt(isFunction, isLoop));
			} else {
				this.expect(TokenType.OpenBrace, 'No se encontró "{"');

				while (this.at().type != TokenType.CloseBrace)
					ifStmt.else.body.push(this.parse_stmt(isFunction, isLoop));

				this.expect(TokenType.CloseBrace, 'No se encontró "}"');
			}
		}
		return ifStmt;
	}
	private parse_return_stmt(): ReturnStatement {
		const { col, row, file } = this.expect(
			TokenType.Retorna,
			'No se encontró la palabra clave "retorna"'
		);
		const value = this.parse_expr();
		return {
			kind: 'ReturnStatement',
			value,
			col,
			row,
			file,
		};
	}
	private parse_func_decl(isVar = false): FunctionDeclaration {
		const { col, row, file } = this.expect(
			TokenType.Funcion,
			'No se encontró la palabra clave "funcion"'
		);

		const nextToken = this.at();
		let name = '';
		if (nextToken.type == TokenType.Identifier) name = this.eat().value;
		else if (!isVar)
			new InvalidSyntaxError(
				nextToken.col,
				nextToken.row,
				'No se encontró el identificador'
			).throw();

		this.expect(TokenType.OpenParen, 'No se encontró "("');
		const args: string[] = [];
		while (this.at().type != TokenType.CloseParen) {
			args.push(
				this.expect(TokenType.Identifier, 'No se encontro el identificador')
					.value
			);
			if (this.at().type == TokenType.Comma) this.eat();
		}
		this.expect(TokenType.CloseParen, 'No se encontró ")"');
		this.expect(TokenType.OpenBrace, 'No se encontró "{"');
		const body: Stmt[] = [];
		while (this.at().type != TokenType.CloseBrace) {
			body.push(this.parse_stmt(true));
		}
		const endToken = this.expect(TokenType.CloseBrace, 'No se encontró "}"');
		return {
			kind: 'FunctionDeclaration',
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
		const { col, row, file } = this.expect(
			TokenType.Clase,
			'No se encontró la palabra clave "clase"'
		);
		const name = this.expect(
			TokenType.Identifier,
			'No se encontro el identificador'
		).value;
		this.expect(TokenType.OpenBrace, 'No se encontró "{"');
		const body = [];
		while (this.at().type != TokenType.CloseBrace) {
			body.push(this.parse_stmt(false, false, true));
		}
		const endToken = this.expect(TokenType.CloseBrace, 'No se encontró "}"');
		return {
			kind: 'ClassDeclaration',
			identifier: name,
			body,
			string: this.getTo(col, row, endToken.col, endToken.row),
			col,
			row,
			file,
		};
	}
	private parse_class_prop(extra?: ClassPropertyExtra): ClassProperty {
		const name = this.expect(
			TokenType.Identifier,
			'No se encontro el identificador'
		).value;
		const prev = this.eat();
		if (prev.type === TokenType.OpenParen) {
			const args: string[] = [];
			while (this.at().type != TokenType.CloseParen) {
				args.push(
					this.expect(TokenType.Identifier, 'No se encontro el identificador')
						.value
				);
				if (this.at().type == TokenType.Comma) this.eat();
			}
			this.expect(TokenType.CloseParen, 'No se encontró ")"');
			this.expect(TokenType.OpenBrace, 'No se encontró "{"');
			const body: Stmt[] = [];
			while (this.at().type != TokenType.CloseBrace) {
				body.push(this.parse_stmt(true));
			}
			this.expect(TokenType.CloseBrace, 'No se encontró "}"');
			return {
				kind: 'ClassProperty',
				identifier: name,
				value: {
					kind: 'FunctionDeclaration',
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
				kind: 'ClassProperty',
				identifier: name,
				value,
				extra,
				col: prev.col,
				row: prev.row,
				file: prev.file,
			};
		}
		new InvalidSyntaxError(
			prev.col,
			prev.row,
			'No se encontró el valor de la propiedad'
		).throw();
		return null as unknown as ClassProperty;
	}
	private parse_while_stmt(): WhileStatement {
		const { col, row, file } = this.expect(
			TokenType.Mientras,
			`No se encontro la palabra clave "${TokenType.Mientras.toLowerCase()}"`
		);
		this.expect(TokenType.OpenParen, 'No se encontró "("');
		const condition = this.parse_expr();
		this.expect(TokenType.CloseParen, 'No se encontró ")"');
		this.expect(TokenType.OpenBrace, 'No se encontró "{"');
		const body: Stmt[] = [];
		while (this.at().type != TokenType.CloseBrace) {
			body.push(this.parse_stmt(false, true));
		}
		this.expect(TokenType.CloseBrace, 'No se encontró "}"');
		return {
			kind: 'WhileStatement',
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
		const name = this.expect(
			TokenType.Identifier,
			'No se encontro el identificador'
		).value;
		if (this.at().type == TokenType.Equals) {
			return {
				kind: 'VarDeclaration',
				constant: isConstant,
				identifier: name,
				value: this.parse_expr(),
				col,
				row,
				file,
			};
		}
		if (isConstant)
			new InvalidSyntaxError(
				col,
				row,
				'Constantes deben tener un valor'
			).throw();
		return {
			kind: 'VarDeclaration',
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
				const right = this.parse_assignment_expr(operator);
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
		if (this.at().type == TokenType.CloseAngle) {
			this.eat(); // Advance the close angle token
			return this.parse_assignment_expr('<', left)
		}
		if (this.at().type == TokenType.OpenAngle) {
			this.eat(); // Advance the open angle token
			return this.parse_assignment_expr('<', left)
		}
		if(operator){
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
	private parse_object_expr() {
		if (this.at().type != TokenType.OpenBrace) return this.parse_array_expr();

		const { col, row, file } = this.eat(); // Advance the open brace token
		const properties: Property[] = [];

		while (this.not_eof() && this.at().type != TokenType.CloseBrace) {
			const {
				value: key,
				col,
				row,
				file,
			} = this.expect(
				TokenType.Identifier,
				'No se puede usar un valor que no sea un identificador como clave de objeto'
			);

			// Allow shorthand
			if (this.at().type == TokenType.Comma) {
				this.eat(); // Advance the colon token
				properties.push({ key, kind: 'Property', col, row, file });
				continue;
			} else if (this.at().type == TokenType.CloseBrace) {
				properties.push({ key, kind: 'Property', col, row, file });
				continue;
			}
			this.expect(
				TokenType.Colon,
				'No se encontró dos puntos en la propiedad del objeto'
			);
			const value = this.parse_expr();
			properties.push({ key, value, kind: 'Property', col, row, file });
			if (this.at().type != TokenType.CloseBrace) {
				this.expect(
					TokenType.Comma,
					'No se encontró coma en la propiedad del objeto'
				);
			}
		}
		this.expect(TokenType.CloseBrace, 'No se encontró llave de cierre');
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
			properties.push({ key, value, kind: 'Property', col, row, file });
			if (this.at().type != TokenType.CloseBracket) {
				this.expect(TokenType.Comma, 'No se encontró coma en la lista');
			}
		}

		this.expect(TokenType.CloseBracket, 'No se encontró llave de cierre');
		return { kind: 'ArrayLiteral', properties, col, row, file } as ArrayLiteral;
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
				if (property.kind != 'Identifier')
					new InvalidSyntaxError(
						col,
						row,
						'No se puede acceder a una propiedad que no sea un identificador'
					).throw();
				property.kind = 'PropertyIdentifier';
			} else {
				property = this.parse_expr();
				computed = true;
				this.expect(
					TokenType.CloseBracket,
					'No se encontró corchete de cierre'
				);
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
		this.expect(TokenType.OpenParen, 'No se encontró paréntesis de apertura');
		const args =
			this.at().type == TokenType.CloseParen ? [] : this.parse_arguments_list();
		this.expect(TokenType.CloseParen, 'No se encontró paréntesis de cierre');
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
					kind: 'Identifier',
					symbol: this.eat().value,
					col: tk.col,
					row: tk.row,
					file: tk.file,
				};
			case TokenType.Number:
				const value_ = ComplexMath.eval_complex(this.eat().value, {});
				type Item<A> = A extends (infer I)[] ? I : A;
				return {
					kind: 'NumericLiteral',
					value: value_ as Item<typeof value_>,
					col: tk.col,
					row: tk.row,
					file: tk.file,
				};
			case TokenType.String:
				return {
					kind: 'StringLiteral',
					value: this.eat().value,
					col: tk.col,
					row: tk.row,
					file: tk.file,
				};

			case TokenType.OpenParen:
				this.eat(); // Eat the open paren
				const value = this.parse_expr();
				this.expect(
					TokenType.CloseParen,
					'No se encontró el paréntesis de cierre'
				); // Eat the close paren
				return value;
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
		}
		new AgaError(
			'InvalidTokenError',
			tk.col,
			tk.row,
			`Un token inesperado "${tk.value}"`
		);
		return null as unknown as Expr;
	}
}
