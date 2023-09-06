import type { BinaryExpr } from "magal/frontend/ast.ts";
import type Environment from "magal/runtime/Environment.class.ts";
import AgalError from "magal/runtime/values/internal/Error.class.ts";
import { type IStack, evaluate } from "magal/runtime/interpreter.ts";
import binary_string from "magal/runtime/eval/expressions/binary/string.ts";
import { AgalNumber } from "magal/runtime/values/primitive/Number.class.ts";
import { AgalString } from "magal/runtime/values/primitive/String.class.ts";
import binary_numeric from "magal/runtime/eval/expressions/binary/number.ts";

export default async function binary(bin: BinaryExpr, env: Environment,stack:IStack) {
	const { left, operator, right } = bin;
	const leftVal = await evaluate(left, env,stack);
	if(leftVal instanceof AgalError && leftVal.throwed) return leftVal;
	const rightVal = await evaluate(right, env,stack);
	if(rightVal instanceof AgalError && rightVal.throwed) return rightVal;

	if (leftVal instanceof AgalNumber && rightVal instanceof AgalNumber)
		return binary_numeric(stack,leftVal.value, operator, rightVal.value);
  if(leftVal instanceof AgalString || rightVal instanceof AgalString)
    return binary_string(stack,await leftVal.aCadena(), operator, await rightVal.aCadena());
	if (operator == '==') return leftVal == rightVal;
	if (operator == '!=') return leftVal != rightVal;
}
