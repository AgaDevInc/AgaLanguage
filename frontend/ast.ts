import { LikeNumber } from "aga:ComplexMath/types"

export type BlockType =
	| 'FunctionDeclaration'
	| 'IfStatement'
	| 'ElseStatement'
	| 'WhileStatement'
	| 'ClassDeclaration'
	| 'Program';

export type NodeType =
	// Statements
	| 'VarDeclaration'
	| 'ReturnStatement'
	| 'BreakStatement'
	| 'ContinueStatement'
	| BlockType

	// Expressions
	| 'AssignmentExpr'
	| 'MemberExpr'
	| 'CallExpr'

	// Literals
	| 'Property'
	| 'ObjectLiteral'
	| 'ArrayLiteral'
	| 'NumericLiteral'
	| 'StringLiteral'
	| 'IterableLiteral'
	| 'Identifier'
	| 'PropertyIdentifier'
	| 'BinaryExpr'
	| 'ClassProperty';

interface IStmt {
	kind: NodeType;
	row: number;
	col: number;
	file: string
}
export type Stmt =
	| VarDeclaration
	| ReturnStatement
	| BreakStatement
	| ContinueStatement
	| ClassProperty
	| BlockStatement
	| Expr;

export interface ReturnStatement extends IStmt {
	kind: 'ReturnStatement';
	value?: Expr;
}
export interface BreakStatement extends IStmt {
	kind: 'BreakStatement';
}
export interface ContinueStatement extends IStmt {
	kind: 'ContinueStatement';
}
export interface VarDeclaration extends IStmt {
	kind: 'VarDeclaration';
	constant: boolean;
	identifier: string;
	value?: Expr;
}
interface IBlockStatement extends IStmt {
	kind: BlockType;
	body: Stmt[];
}
export type BlockStatement =
	| ClassDeclaration
	| Program
	| FunctionDeclaration
	| WhileStatement
	| IfStatement
	| ElseStatement;
export type ClassPropertyExtra = 'static';
export interface ClassProperty extends IStmt {
	kind: 'ClassProperty';
	identifier: string;
	value?: Stmt;
	extra?: ClassPropertyExtra;
}
export interface ClassDeclaration extends IBlockStatement {
	kind: 'ClassDeclaration';
	identifier: string;
	body: ClassProperty[];
	string: string;
}
export interface Program extends IStmt {
	kind: 'Program';
	body: Stmt[];
}
export interface FunctionDeclaration extends IBlockStatement {
	kind: 'FunctionDeclaration';
	identifier: string;
	params: string[];
	string: string;
}
export interface WhileStatement extends IBlockStatement {
	kind: 'WhileStatement';
	condition: Expr;
}
export interface IfStatement extends IBlockStatement {
	kind: 'IfStatement';
	condition: Expr;
	else: ElseStatement;
}
export interface ElseStatement extends IBlockStatement {
	kind: 'ElseStatement';
}

// deno-lint-ignore no-empty-interface
interface IExpr extends IStmt {}

export type Expr =
	| AssignmentExpr
	| BinaryExpr
	| CallExpr
	| MemberExpr
	| Identifier
	| PropertyIdentifier
	| NumericLiteral
	| StringLiteral
	| IterableLiteral
	| ObjectLiteral
	| ArrayLiteral;
export interface AssignmentExpr extends IExpr {
	kind: 'AssignmentExpr';
	assignee: Expr;
	value: Expr;
}
export interface BinaryExpr extends IExpr {
	kind: 'BinaryExpr';
	left: Expr;
	right: Expr;
	operator: string;
}
export interface CallExpr extends IExpr {
	kind: 'CallExpr';
	callee: Expr;
	args: Expr[];
}
export interface MemberExpr extends IExpr {
	kind: 'MemberExpr';
	object: Expr;
	property: Expr;
	computed: boolean;
}
export interface Identifier extends IExpr {
	kind: 'Identifier';
	symbol: string;
}
export interface PropertyIdentifier extends IExpr {
	kind: 'PropertyIdentifier';
	symbol: string;
}
export interface NumericLiteral extends IExpr {
	kind: 'NumericLiteral';
	value: LikeNumber
}
export interface StringLiteral extends IExpr {
	kind: 'StringLiteral';
	value: string;
}
export interface IterableLiteral extends IExpr {
	kind: 'IterableLiteral';
	value: Expr;
}
export interface Property extends IExpr {
	kind: 'Property';
	key: string;
	value?: Expr;
}
export interface ObjectLiteral extends IExpr {
	kind: 'ObjectLiteral';
	properties: Property[];
}
export interface ArrayLiteral extends IExpr {
	kind: 'ArrayLiteral';
	properties: Property[];
}
