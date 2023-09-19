import type { LikeNumber } from 'aga//super_math/types.d.ts';

export const enum BLOCK_TYPE {
	FUNCTION_DECLARATION = 'FunctionDeclaration',
	IF_STATEMENT = 'IfStatement',
	ELSE_STATEMENT = 'ElseStatement',
	WHILE_STATEMENT = 'WhileStatement',
	CLASS_DECLARATION = 'ClassDeclaration',
	PROGRAM = 'Program',
	TRY = 'Try',
	CATCH = 'Catch',
	FINALLY = 'Finally',
}
export const enum STATEMENTS_TYPE {
	VAR_DECLARATION = 'VarDeclaration',
	RETURN_STATEMENT = 'ReturnStatement',
	BREAK_STATEMENT = 'BreakStatement',
	CONTINUE_STATEMENT = 'ContinueStatement',
	IMPORT_STATEMENT = 'ImportStatement',
	EXPORT_STATEMENT = 'ExportStatement',
}

export const enum EXPRESSIONS_TYPE {
	ASSIGNMENT_EXPR = 'AssignmentExpr',
	MEMBER_EXPR = 'MemberExpr',
	BINARY_EXPR = 'BinaryExpr',
	CALL_EXPR = 'CallExpr',
	UNARY_EXPR = 'UnaryExpr',
}

export const enum LITERALS_TYPE {
	PROPERTY = 'Property',
	OBJECT_LITERAL = 'ObjectLiteral',
	ARRAY_LITERAL = 'ArrayLiteral',
	NUMERIC_LITERAL = 'NumericLiteral',
	STRING_LITERAL = 'StringLiteral',
	ITERABLE_LITERAL = 'IterableLiteral',
	IDENTIFIER = 'Identifier',
	PROPERTY_IDENTIFIER = 'PropertyIdentifier',
	CLASS_PROPERTY = 'ClassProperty',
	PROPERTY_COMPUTED = 'PropertyComputed',
}

export type NodeType =
	// Statements
	| STATEMENTS_TYPE
	| BLOCK_TYPE

	// Expressions
	| EXPRESSIONS_TYPE

	// Literals
	| LITERALS_TYPE
	
	// Other
	| 'Error';

export type NODE_TYPE = {
	STATMENTS: STATEMENTS_TYPE;
	BLOCK: BLOCK_TYPE;
	EXPRESSIONS: EXPRESSIONS_TYPE;
	LITERALS: LITERALS_TYPE;
};

interface IStmt {
	kind: NodeType;
	row: number;
	col: number;
	file: string;
}
export type Stmt =
	| VarDeclaration
	| ReturnStatement
	| BreakStatement
	| ContinueStatement
	| ClassProperty
	| BlockStatement
	| Expr
	| ErrorStmt
	| ImportStatement
	| ExportStatement;

export const enum ErrorType {
	TokenizerError = 'TokenizerError',
	ParserError = 'ParserError',
}
export interface ErrorStmt extends IStmt {
	kind: 'Error';
	message: string;
	type: ErrorType;
}	
export interface ImportStatement extends IStmt{
	kind: STATEMENTS_TYPE.IMPORT_STATEMENT
	path: string;
	as?: string;
	with?: ObjectLiteral;
}
export interface ExportStatement extends IStmt {
	kind: STATEMENTS_TYPE.EXPORT_STATEMENT;
	identifier: string;
	value: Expr;
}
export interface ReturnStatement extends IStmt {
	kind: STATEMENTS_TYPE.RETURN_STATEMENT;
	value?: Expr;
}
export interface BreakStatement extends IStmt {
	kind: STATEMENTS_TYPE.BREAK_STATEMENT;
}
export interface ContinueStatement extends IStmt {
	kind: STATEMENTS_TYPE.CONTINUE_STATEMENT;
}
export interface VarDeclaration extends IStmt {
	kind: STATEMENTS_TYPE.VAR_DECLARATION;
	constant: boolean;
	identifier: string;
	value?: Expr;
}
interface IBlockStatement extends IStmt {
	kind: BLOCK_TYPE;
	body: Stmt[];
}
export type BlockStatement =
	| ClassDeclaration
	| Program
	| FunctionDeclaration
	| WhileStatement
	| IfStatement
	| ElseStatement
	| TryStatement;

export interface TryStatement extends IBlockStatement {
	kind: BLOCK_TYPE.TRY;
	catch: CatchStatement;
	finally?: FinallyStatement;
}
export interface CatchStatement extends IBlockStatement {
	kind: BLOCK_TYPE.CATCH;
	errorName: string;
	next?: CatchStatement;
}
export interface FinallyStatement extends IBlockStatement {
	kind: BLOCK_TYPE.FINALLY;
}
export interface ClassDeclaration extends IBlockStatement {
	kind: BLOCK_TYPE.CLASS_DECLARATION;
	identifier: string;
	body: ClassProperty[];
	string: string;
	extend?: string;
}
export interface Program extends IStmt {
	kind: BLOCK_TYPE.PROGRAM;
	body: Stmt[];
}
export interface FunctionDeclaration extends IBlockStatement {
	kind: BLOCK_TYPE.FUNCTION_DECLARATION;
	identifier: string;
	params: (string| IterableLiteral)[];
	string: string;
}
export interface WhileStatement extends IBlockStatement {
	kind: BLOCK_TYPE.WHILE_STATEMENT;
	condition: Expr;
}
export interface IfStatement extends IBlockStatement {
	kind: BLOCK_TYPE.IF_STATEMENT;
	condition: Expr;
	else: ElseStatement;
}
export interface ElseStatement extends IBlockStatement {
	kind: BLOCK_TYPE.ELSE_STATEMENT;
}

interface IExpr extends IStmt {
	kind: EXPRESSIONS_TYPE | LITERALS_TYPE;
}

export type Expr =
	| AssignmentExpr
	| BinaryExpr
	| UnaryExpr
	| CallExpr
	| MemberExpr
	| Identifier
	| PropertyIdentifier
	| NumericLiteral
	| StringLiteral
	| IterableLiteral
	| ObjectLiteral
	| ArrayLiteral;
export const enum ClassPropertyExtra {
	Static = 'static',
}
export interface ClassProperty extends IExpr {
	kind: LITERALS_TYPE.CLASS_PROPERTY;
	identifier: string;
	value?: Stmt;
	extra?: ClassPropertyExtra;
}
export interface AssignmentExpr extends IExpr {
	kind: EXPRESSIONS_TYPE.ASSIGNMENT_EXPR;
	assignee: Expr;
	value: Expr;
}
export interface BinaryExpr extends IExpr {
	kind: EXPRESSIONS_TYPE.BINARY_EXPR;
	left: Expr;
	right: Expr;
	operator: string;
}
export interface UnaryExpr extends IExpr {
	kind: EXPRESSIONS_TYPE.UNARY_EXPR;
	value: Expr;
	operator: string;
}
export interface CallExpr extends IExpr {
	kind: EXPRESSIONS_TYPE.CALL_EXPR;
	callee: Expr;
	args: Expr[];
}
export interface MemberExpr extends IExpr {
	kind: EXPRESSIONS_TYPE.MEMBER_EXPR;
	object: Expr;
	property: Expr;
	computed: boolean;
}
export interface Identifier extends IExpr {
	kind: LITERALS_TYPE.IDENTIFIER;
	symbol: string;
}
export interface PropertyIdentifier extends IExpr {
	kind: LITERALS_TYPE.PROPERTY_IDENTIFIER;
	symbol: string;
}
export interface NumericLiteral extends IExpr {
	kind: LITERALS_TYPE.NUMERIC_LITERAL;
	value: LikeNumber;
}
export interface StringLiteral extends IExpr {
	kind: LITERALS_TYPE.STRING_LITERAL;
	value: string;
}
export interface IterableLiteral extends IExpr {
	kind: LITERALS_TYPE.ITERABLE_LITERAL;
	identifier: string;
}
export interface Property extends IExpr {
	kind: LITERALS_TYPE.PROPERTY;
	key: string;
	value?: Expr;
}
export interface PropertyComputed extends IExpr {
	kind: LITERALS_TYPE.PROPERTY_COMPUTED;
	key: Expr;
	value: Expr;
}
export interface ObjectLiteral extends IExpr {
	kind: LITERALS_TYPE.OBJECT_LITERAL;
	properties: (Property|IterableLiteral|PropertyComputed)[];
}
export interface ArrayLiteral extends IExpr {
	kind: LITERALS_TYPE.ARRAY_LITERAL;
	properties: (Property|IterableLiteral)[];
}
