import * as ComplexMath from 'aga:ComplexMath/fns';
import { LikeNumber } from 'aga:ComplexMath/types';
import type { IStack } from "../../../interpreter.ts";

function lessThan(left: LikeNumber, right: LikeNumber): boolean {
	if (typeof left == 'number')
		if (typeof right == 'number') return left < right;
		else
			return left < right.real || (left == right.real && right.imaginary < 0);
	else if (typeof right == 'number') return left.real < right;
	else
		return (
			left.real < right.real ||
			(left.real == right.real && left.imaginary < right.imaginary)
		);
}
function lessThanOrEqual(left: LikeNumber, right: LikeNumber): boolean {
	return ComplexMath.equals(left, right) || lessThan(left, right);
}

export default function binary_numeric(
	_stack: IStack,
	left: LikeNumber,
	operator: string,
	right: LikeNumber
): boolean | LikeNumber {
	switch (operator) {
		case '+':
			return ComplexMath.add(left, right);
		case '-':
			return ComplexMath.subtract(left, right);
		case '*':
			return ComplexMath.multiply(left, right);
		case '/':
			return ComplexMath.divide(left, right);
		case '%':
			return ComplexMath.modulo(left, right);
		case '^':
			return ComplexMath.power(left, right);
		case '':
			return ComplexMath.modulo(left, right);
		case '==':
			return ComplexMath.equals(left, right);
		case '!=':
			return !ComplexMath.equals(left, right);
		case '<':
			return lessThan(left, right);
		case '<=':
			return lessThanOrEqual(left, right);
		case '>':
			return lessThan(right, left);
		case '>=':
			return lessThanOrEqual(right, left);
		case '&&':
			return binary_numeric(_stack,left, '!=', 0) && binary_numeric(_stack,right, '!=', 0);
		case '||':
			return binary_numeric(_stack,left, '!=', 0) || binary_numeric(_stack,right, '!=', 0);
	}
	return 0;
}