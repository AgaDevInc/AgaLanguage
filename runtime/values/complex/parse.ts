import { IStack } from "magal/runtime/interpreter.ts";
import Runtime from "magal/runtime/values/Runtime.class.ts";
import AgalArray from "magal/runtime/values/complex/Array.class.ts";
import AgalObject from "magal/runtime/values/complex/Object.class.ts";
import AgalFunction, { TFunction } from "magal/runtime/values/complex/Function.class.ts";

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