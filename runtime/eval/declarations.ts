// deno-lint-ignore-file require-await
import { type VarDeclaration,type FunctionDeclaration,type ClassDeclaration, type ClassProperty } from "../../frontend/ast.ts";
import type Environment from "../Environment.class.ts";
import { IStack, evaluate } from "../interpreter.ts";
import AgalClass from "../values/complex/Class.class.ts";
import AgalFunction from "../values/complex/Function.class.ts";
import AgalError from "../values/internal/Error.class.ts";
import parseRuntime from "../values/parse.ts";

export async function variable(
	varDecl: VarDeclaration,
	env: Environment,
	stack: IStack
) {
	const value = varDecl.value
		? await evaluate(varDecl.value, env, stack)
		: null;
	const data = {
		col: varDecl.col,
		row: varDecl.row,
		constant: varDecl.constant,
	};
	return env.declareVar(
		varDecl.identifier,
		stack,
		parseRuntime(stack, value as NonNullable<typeof value>),
		data
	);
}
export async function _function(
	funcDecl: FunctionDeclaration,
	env: Environment,
	stack: IStack
) {
	const { identifier, col, row } = funcDecl;
	const func = new AgalFunction(identifier, funcDecl, env);
	return identifier ? env.declareVar(identifier, stack, func, { col, row, constant: true }):func
}
export async function _class(classDecl: ClassDeclaration, env:Environment, stack:IStack) {
	const { identifier, col, row } = classDecl;

	const func = await AgalClass.from(classDecl, env);
	if(func instanceof AgalError) return func;
	return env.declareVar(identifier, stack, func, { col, row, constant: true });
}
export function classProperty(
	classprp: ClassProperty,
	env: Environment,
	stack: IStack
) {
	return evaluate(classprp.value!, env, stack)
}