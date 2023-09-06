import type {
	CatchStatement,
	ElseStatement,
	IfStatement,
	Program,
	ReturnStatement,
	TryStatement,
	WhileStatement,
} from 'magal/frontend/ast.ts';
import Environment from 'magal/runtime/Environment.class.ts';
import type Runtime from 'magal/runtime/values/Runtime.class.ts';
import { type IStack, evaluate } from 'magal/runtime/interpreter.ts';
import AgalError from 'magal/runtime/values/internal/Error.class.ts';
import Primitive from 'magal/runtime/values/primitive/Primitive.class.ts';
import AgalNull, { AgalVoid } from 'magal/runtime/values/primitive/Null.class.ts';

function contitionToBool(data: Runtime) {
	if (data instanceof Primitive) {
		return data.value;
	}
	return true;
}

export async function program(program: Program, env: Environment, stack: IStack) {
	const data: Runtime = await evaluate(program.body, env, stack);
	if (data instanceof AgalError && data.throwed) return data;

	return env.lookupVar('modulo', stack, { col: 0, row: 0 });
}

export async function _return(returnStmt: ReturnStatement, env: Environment, stack: IStack) {
	const data = returnStmt.value ? await evaluate(returnStmt.value, env, stack) : AgalNull;

	return data;
}
export async function _if(ifStmt: IfStatement, env: Environment, stack: IStack) {
	const { condition, body, else: _else } = ifStmt;
	const data = await evaluate(condition, env, stack);
	if (data instanceof AgalError && data.throwed) return data;
	if (contitionToBool(data)) return await evaluate(body, env, stack);
	if (_else) return await evaluate(_else, env, stack);
	return AgalVoid;
}

export async function _else(elseStmt: ElseStatement, env: Environment, stack: IStack) {
	return await evaluate(elseStmt.body, env, stack);
}

export async function _while(whileStmt: WhileStatement, env: Environment, stack: IStack) {
	const { condition, body } = whileStmt;

	let data = await evaluate(condition, env, stack);
	while (contitionToBool(data)) {
		if (data instanceof AgalError && data.throwed) return data;
		for (const stmt of body) {
			switch (stmt.kind) {
				// deno-lint-ignore no-fallthrough
				case 'BreakStatement':
					data = AgalVoid;
				case 'ContinueStatement':
					break;
			}
			const v = await evaluate(stmt, env, stack);
			if (v instanceof AgalError && v.throwed) return v;
		}
		data = await evaluate(condition, env, stack);
	}
	return data;
}

async function _catch(nextStmt: CatchStatement, env: Environment, stack: IStack, error: AgalError) {
	error.throwed = false;
	const catchEnv = new Environment(env);
	const { body: catchBody, next, errorName } = nextStmt;
	catchEnv.declareVar(errorName, stack, error, nextStmt);
	let data = await evaluate(catchBody, catchEnv, stack);
	if (data instanceof AgalError && data.throwed && next)
		data = await _catch(next, env, stack, data);
	return data;
}

export async function _try(_try: TryStatement, env: Environment, stack: IStack) {
	const { body: tryBody, catch: Catch, finally: Finally } = _try;
	let data = await evaluate(tryBody, new Environment(env), stack);
	if (data instanceof AgalError && data.throwed) data = await _catch(Catch, env, stack, data);
	if (data instanceof AgalError && data.throwed) return data;
	if (Finally) {
		const finallyEnv = new Environment(env);
		const { body: finallyBody } = Finally;
		data = await evaluate(finallyBody, finallyEnv, stack);
	}
	return data;
}
