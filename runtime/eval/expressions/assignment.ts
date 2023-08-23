import type {
	AssignmentExpr,
	Expr,
} from '../../../frontend/ast.ts';
import type Environment from '../../Environment.class.ts';
import { type IStack, evaluate } from '../../interpreter.ts';

function getName(exp: Expr): string {
	if (!exp) return '';
	if (exp.kind === 'Identifier') return exp.symbol;
	if (exp.kind === 'AssignmentExpr') return getName(exp.assignee);
	throw new Error(`Cannot get name of ${exp.kind}`);
}

export default async function assignment(
	assignment: AssignmentExpr,
	env: Environment,
	stack: IStack
) {
	const { assignee, value } = assignment;
	const val = await evaluate(value, env,stack);
	if(!assignee) return val;
	if (assignee.kind === 'MemberExpr') {
		const obj = await evaluate(assignee.object, env,stack);
		const key = assignee.property.kind === 'PropertyIdentifier' ? assignee.property.symbol : await (await evaluate(assignee.property, env,stack)).aCadena();
		obj.set(key,stack, val);
		return val;
	}
	
	return env.assignVar(getName(assignee), stack, val, assignment);
}
