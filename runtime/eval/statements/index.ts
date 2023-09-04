import type {
	ElseStatement,
	IfStatement,
	Program,
	ReturnStatement,
	TryCatchStatement,
	WhileStatement,
} from 'agal/frontend/ast.ts';
import Environment from "agal/runtime/Environment.class.ts";
import type Runtime from 'agal/runtime/values/Runtime.class.ts';
import { type IStack, evaluate } from "agal/runtime/interpreter.ts";
import AgalError from "agal/runtime/values/internal/Error.class.ts";
import Primitive from "agal/runtime/values/primitive/Primitive.class.ts";
import AgalNull, { AgalVoid } from "agal/runtime/values/primitive/Null.class.ts";

function contitionToBool(data: Runtime) {
	if (data instanceof Primitive) {
		return data.value;
	}
	return true;
}

export async function program(
	program: Program,
	env: Environment,
	stack: IStack
) {
	const data: Runtime = await evaluate(program.body, env, stack);
	if (data instanceof AgalError && data.throwed) return data;

	return env.lookupVar('modulo', stack, { col: 0, row: 0 });
}

export async function _return(
	returnStmt: ReturnStatement,
	env: Environment,
	stack: IStack
) {
	const data = returnStmt.value
		? await evaluate(returnStmt.value, env, stack)
		: AgalNull;

	return data;
}
export async function _if(
	ifStmt: IfStatement,
	env: Environment,
	stack: IStack
) {
	const { condition, body, else: _else } = ifStmt;
	const data = await evaluate(condition, env, stack);
	if (data instanceof AgalError && data.throwed) return data;
	if (contitionToBool(data)) return await evaluate(body, env, stack);
	if (_else) return await evaluate(_else, env, stack);
	return AgalVoid
}

export async function _else(
	elseStmt: ElseStatement,
	env: Environment,
	stack: IStack
) {
	return await evaluate(elseStmt.body, env, stack);
}

export async function _while(
	whileStmt: WhileStatement,
	env: Environment,
	stack: IStack
) {
	const { condition, body } = whileStmt;

	let data = await evaluate(condition, env, stack);
	while (contitionToBool(data)) {
		if (data instanceof AgalError && data.throwed) return data;
		for(const stmt of body){
			switch(stmt.kind){
				// deno-lint-ignore no-fallthrough
				case 'BreakStatement': data = AgalVoid;
				case 'ContinueStatement': break;
			}
			const v = await evaluate(stmt, env, stack);
			if (v instanceof AgalError && v.throwed) return v;
		}
		data = await evaluate(condition, env, stack);
	}
	return data;
}

export async function try_catch(
	trycatch: TryCatchStatement,
	env: Environment,
	stack: IStack
) {
	const { body: tryBody, catchBody, errorName } = trycatch;
	let data = await evaluate(tryBody, new Environment(env), stack)
	if (data instanceof AgalError && data.throwed) {
		const catchEnv = new Environment(env);
		data.throwed = false;
		catchEnv.declareVar(errorName, stack, data, trycatch);
		data = await evaluate(catchBody, catchEnv, stack);
	}
	return data;
}