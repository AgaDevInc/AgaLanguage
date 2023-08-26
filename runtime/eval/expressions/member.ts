import type { MemberExpr } from '../../../frontend/ast.ts';
import type Environment from '../../Environment.class.ts';
import { IStack, evaluate } from '../../interpreter.ts';
import AgalError from '../../values/internal/Error.class.ts';

export default async function member(
	member: MemberExpr,
	env: Environment,
	stack: IStack
) {
	const { object, property } = member;
	const obj = await evaluate(object, env, stack);
	if (obj instanceof AgalError && obj.throwed) return obj;

	if (property.kind === 'PropertyIdentifier')
		return await obj.get(property.symbol, stack);
	const propEvaluated = await evaluate(property, env, stack);
	if (propEvaluated instanceof AgalError && propEvaluated.throwed)
		return propEvaluated;
	const prop = await propEvaluated.aCadena();
	const result = await obj.get(prop, stack);

	return result as NonNullable<typeof result>;
}
