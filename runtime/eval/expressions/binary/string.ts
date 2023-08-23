import { LikeNumber } from 'aga:ComplexMath/types';
import AgalError, {
	AgalTypeError,
} from '../../../values/internal/Error.class.ts';
import { isLikeNumber } from 'https://agacdn.onrender.com/AgaDev:ComplexMath@1.0.0/util.ts';
import type { IStack } from '../../../interpreter.ts';

function string_string(
	left: string,
	operator: string,
	right: string
): boolean | string {
	switch (operator) {
		case '==':
			return left == right;
		case '!=':
			return left != right;
		case '+':
			return left + right;
		case '-':
			return left.replace(right, '');
	}
	return false;
}
function string_number(
	left: string,
	operator: string,
	right: LikeNumber
): boolean | string {
	switch (operator) {
		case '+':
			return left + right;
		case '-':
			return left.slice(0, -right);
		case '*':
			return left.repeat(+right);
		case '/':
			return left.slice(0, Math.round(left.length / +right));
	}
	return false;
}

// deno-lint-ignore require-await
export default async function binary_string(
	stack: IStack,
	left: string,
	operator: string,
	right: string | LikeNumber
): Promise<boolean | string | AgalError> {
	if (typeof right == 'string') return string_string(left, operator, right);
	if (isLikeNumber(right)) return string_number(left, operator, right);

	return new AgalTypeError(
		`'cadena ${operator} ${typeof right}' no es valido`,
		stack
	).throw();
}
