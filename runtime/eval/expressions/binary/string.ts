import { isLikeNumber } from 'aga//super_math/util.ts';
import type { LikeNumber } from 'aga//super_math/types.d.ts';
import AgalError, {
	AgalTypeError,
} from "agal/runtime/values/internal/Error.class.ts";
import type { IStack } from 'agal/runtime/interpreter.ts';

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
