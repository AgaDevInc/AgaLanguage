import type { BinaryExpr } from "../../../../frontend/ast.ts";
import type Environment from "../../../Environment.class.ts";
import { type IStack, evaluate } from "../../../interpreter.ts";
import AgalError from "../../../values/internal/Error.class.ts";
import { AgalNumber } from "../../../values/primitive/Number.class.ts";
import Primitive from "../../../values/primitive/Primitive.class.ts";
import { AgalString } from "../../../values/primitive/String.class.ts";
import binary_numeric from "./number.ts";
import binary_string from "./string.ts";

export default async function binary(bin: BinaryExpr, env: Environment,stack:IStack) {
	const { left, operator, right } = bin;
	const leftVal = await evaluate(left, env,stack);
	if(leftVal instanceof AgalError && leftVal.throwed) return leftVal;
	const rightVal = await evaluate(right, env,stack);
	if(rightVal instanceof AgalError && rightVal.throwed) return rightVal;

	if (leftVal instanceof AgalNumber && rightVal instanceof AgalNumber)
		return binary_numeric(stack,leftVal.value, operator, rightVal.value);
  if(leftVal instanceof AgalString && rightVal instanceof Primitive)
    return binary_string(stack,leftVal.value, operator, rightVal.value);
	if (operator == '==') return leftVal == rightVal;
	if (operator == '!=') return leftVal != rightVal;
}
