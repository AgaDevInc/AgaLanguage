// deno-lint-ignore-file require-await
import type { VarDeclaration, FunctionDeclaration, ClassDeclaration, ClassProperty } from "magal/frontend/ast.ts";
import parseRuntime from "magal/runtime/values/parse.ts";
import { IStack, evaluate } from "magal/runtime/interpreter.ts";
import type Environment from "magal/runtime/Environment.class.ts";
import AgalClass from "magal/runtime/values/complex/Class.class.ts";
import AgalError from "magal/runtime/values/internal/Error.class.ts";
import AgalFunction from "magal/runtime/values/complex/Function.class.ts";

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