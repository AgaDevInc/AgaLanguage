import { IStack } from "../../interpreter.ts";
import Runtime from '../Runtime.class.ts';
import AgalArray from './Array.class.ts';
import AgalFunction, { TFunction } from './Function.class.ts';
import AgalObject from './Object.class.ts';

const parseComplex = function parseComplex(stack: IStack,value?: unknown) {
	if(value instanceof Runtime) return value;
	if (typeof value === 'function') return AgalFunction.from(value as TFunction);
	if(Array.isArray(value)) return AgalArray.from(value);
	if (typeof value === 'object')
		return AgalObject.from(value as Record<string, unknown>, stack);
} as {
  (stack: IStack,value: TFunction): AgalFunction;
  (stack: IStack,value: Record<string, unknown>): AgalObject;
  (stack: IStack,value: Array<unknown>): AgalArray;
}

export default parseComplex;