import type {
	AssignmentExpr,
	Expr,
} from '../../../frontend/ast.ts';
import type Environment from '../../Environment.class.ts';
import { type IStack, evaluate } from '../../interpreter.ts';
import AgalError, { AgalSyntaxError } from '../../values/internal/Error.class.ts';

function getName(exp: Expr): string {
	if (!exp) return '';
	if (exp.kind === 'Identifier') return exp.symbol;
	if (exp.kind === 'AssignmentExpr') return getName(exp.assignee);
	return '';
}

export default async function assignment(
	assignment: AssignmentExpr,
	env: Environment,
	stack: IStack
) {
	const { assignee, value } = assignment;
	const val = await evaluate(value, env,stack);
	if(val instanceof AgalError && val.throwed) return val;
	if(!assignee) return val;
	if (assignee.kind === 'MemberExpr') {
		const obj = await evaluate(assignee.object, env,stack);
		if(obj instanceof AgalError && obj.throwed) return obj;
		if(assignee.property.kind === 'PropertyIdentifier') return await obj.set(assignee.property.symbol,stack, val);
		const key =  await evaluate(assignee.property, env,stack)
		if(key instanceof AgalError && key.throwed) return key;
		obj.set(await key.aCadena(),stack, val);
		return val;
	}
	
	const name = getName(assignee)
	if(!name) return new AgalSyntaxError(`Nombre de variable invalido`,stack).throw();
	return env.assignVar(name, stack, val, assignment);
}
