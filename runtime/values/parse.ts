import type { IStack } from "magal/runtime/interpreter.ts";
import Null from "magal/runtime/values/primitive/Null.class.ts";
import parseComplex from "magal/runtime/values/complex/parse.ts";
import parsePrimitive from "magal/runtime/values/primitive/parse.ts";

// deno-lint-ignore no-explicit-any
const parseRuntime = function parseRuntime(stack: IStack,value: any) {
	const primitive = parsePrimitive(stack,value);
	if (primitive!) return primitive;
	const complex = parseComplex(stack,value);
	if (complex!) return complex;
	return Null
} as typeof parsePrimitive & typeof parseComplex & ((stack: IStack,n?:unknown)=>typeof Null);

export default parseRuntime;