import { Stmt } from 'magal/frontend/ast.ts';
import parseRuntime from 'magal/runtime/values/parse.ts';
import * as literal from 'magal/runtime/eval/literal.ts';
import Environment from 'magal/runtime/Environment.class.ts';
import type Runtime from 'magal/runtime/values/Runtime.class.ts';
import * as declaration from 'magal/runtime/eval/declarations.ts';
import * as statement from 'magal/runtime/eval/statements/index.ts';
import AgalError from 'magal/runtime/values/internal/Error.class.ts';
import * as expressions from 'magal/runtime/eval/expressions/index.ts';
import Null, {AgalVoid} from 'magal/runtime/values/primitive/Null.class.ts';
type IRuntimeValue = InstanceType<typeof Runtime>;

export interface IStack {
	value: Stmt;
	next: IStack | null;
}

export async function evaluate(
	astNode: Stmt | Stmt[],
	env: Environment,
	Stack: IStack
): Promise<IRuntimeValue> {
	if (!astNode) return Null;
	if (Array.isArray(astNode)) {
		let result: IRuntimeValue | null = null;
		for (const node of astNode) {
			result = await evaluate(node, env, { value: node, next: Stack });
			if (node.kind === 'ReturnStatement') return result;
			if (result instanceof AgalError) return result;
		}
		return AgalVoid;
	}
	const stack = astNode === Stack.value ? Stack : { value: astNode, next: Stack };
	switch (astNode.kind) {
		case 'VarDeclaration':
			return await declaration.variable(astNode, env, stack);
		case 'FunctionDeclaration':
			return await declaration._function(astNode, env, stack);
		case 'ClassDeclaration':
			return await declaration._class(astNode, env, stack);
		case 'ClassProperty':
			return await declaration.classProperty(astNode, env, stack);

		case 'Program':
			return await statement.program(astNode, env, stack);
		case 'ReturnStatement':
			return await statement._return(astNode, env, stack);
		case 'IfStatement':
			return await statement._if(astNode, env, stack);
		case 'ElseStatement':
			return await statement._else(astNode, env, stack);
		case 'WhileStatement':
			return await statement._while(astNode, env, stack);
		case 'Try':
			return await statement._try(astNode, env, stack);
		case 'ImportStatement':
			return await statement._import(astNode, env, stack);
		case 'ExportStatement':
			return await statement._export(astNode, env, stack);

		case 'AssignmentExpr':
			return await expressions.assignment(astNode, env, stack);
		case 'MemberExpr':
			return await expressions.member(astNode, env, stack);
		case 'CallExpr':
			return await expressions.call(astNode, env, stack);
		case 'BinaryExpr':
			return parseRuntime(stack, await expressions.binary(astNode, env, stack));

		case 'Identifier':
			return await literal.identifier(astNode, env, stack);
		case 'StringLiteral':
			return await literal.string(astNode, env, stack);
		case 'NumericLiteral':
			return await literal.number(astNode, env, stack);
		case 'ArrayLiteral':
			return await literal.array(astNode, env, stack);
		case 'ObjectLiteral':
			return await literal.object(astNode, env, stack);

		case 'Error':
			return await literal.error(astNode, env, stack);
	}
	throw new Error(`Cannot evaluate ${astNode.kind}`);
}
