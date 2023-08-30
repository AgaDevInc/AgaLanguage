import {
	ArrayLiteral,
	ErrorStmt,
	ErrorType,
	Identifier,
	LITERALS_TYPE,
	NumericLiteral,
	ObjectLiteral,
	StringLiteral,
} from '../../frontend/ast.ts';
import Environment from '../Environment.class.ts';
import { IStack, evaluate } from '../interpreter.ts';
import AgalArray from '../values/complex/Array.class.ts';
import AgalObject from '../values/complex/Object.class.ts';
import AgalError, {
	AgalReferenceError,
	AgalSyntaxError,
	AgalTokenizeError,
AgalTypeError,
} from '../values/internal/Error.class.ts';
import AgalNumber from '../values/primitive/Number.class.ts';
import AgalString from '../values/primitive/String.class.ts';

export function identifier(
	identifier: Identifier,
	env: Environment,
	stack: IStack
) {
	const val = env.lookupVar(identifier.symbol, stack, identifier);
	if (!val)
		return new AgalReferenceError(
			`Variable '${identifier.symbol}' no ha sido declarada`,
			stack
		).throw();
	return val;
}
export function string(str: StringLiteral, _env: Environment, _stack: IStack) {
	return AgalString(str.value);
}
export function number(num: NumericLiteral, _env: Environment, _stack: IStack) {
	return AgalNumber(num.value);
}
export async function array(
	arr: ArrayLiteral,
	env: Environment,
	stack: IStack
) {
	const list = new AgalArray();
	let i = 0;
	for (const prop of arr.properties) {
		if (prop.kind === LITERALS_TYPE.PROPERTY) {
			const data = await evaluate(prop.value!, env, stack);
			if (data instanceof AgalError && data.throwed) return data;
			const key = isNaN(+prop.key) ? prop.key : i+'';
			list.set(key, stack, data);
			i++
			continue;
		}
		const data = env.lookupVar(prop.identifier, stack, prop);
		if (data instanceof AgalError && data.throwed) return data;
		const iter = await data.aIterable();
		if(!Array.isArray(iter)) 
			return new AgalTypeError(
				`Variable '${prop.identifier}' no es iterable`,
				stack
			).throw();
		for (let e = 0; e < iter.length; e++) {
			const element = iter[e];
			list.set(i+'', stack, element);			
		}
	}
	return list;
}
export async function object(
	obj: ObjectLiteral,
	env: Environment,
	stack: IStack
) {
	const dic = new AgalObject();
	for (const prop of obj.properties) {
		if (prop.kind === LITERALS_TYPE.PROPERTY) {
			const data = prop.value ? await evaluate(prop.value, env, stack) : env.lookupVar(prop.key, stack, prop);
			if (data instanceof AgalError && data.throwed) return data;
			dic.set(prop.key, stack, data);
			continue;
		}
		if(prop.kind === LITERALS_TYPE.PROPERTY_COMPUTED) {
			const key = await (await evaluate(prop.key, env, stack)).aCadena()
			const data = await evaluate(prop.value, env, stack);
			if (data instanceof AgalError && data.throwed) return data;
			dic.set(key, stack, data);
			continue;
		}
		const data = env.lookupVar(prop.identifier, stack, prop);
		if (data instanceof AgalError && data.throwed) return data;
		const keys = await data.keys();
		for (const key of keys) {
			const val = await data.get(key, stack);
			if (val instanceof AgalError && val.throwed) return val;
			dic.set(key, stack, val);
		}
	}
	return dic;
}
export function error(err: ErrorStmt, _env: Environment, stack: IStack) {
	const error =
		err.type === ErrorType.TokenizerError
			? new AgalTokenizeError(err.message, stack)
			: err.type === ErrorType.ParserError
			? new AgalSyntaxError(err.message, stack)
			: new AgalError('Error', err.message, stack);
	return error.throw();
}
