import type { IStack } from "agal/runtime/interpreter.ts";
import Null from "agal/runtime/values/primitive/Null.class.ts";
import parseComplex from "agal/runtime/values/complex/parse.ts";
import parsePrimitive from "agal/runtime/values/primitive/parse.ts";

// deno-lint-ignore no-explicit-any
const parseRuntime = function parseRuntime(stack: IStack,value: any) {
	const primitive = parsePrimitive(stack,value);
	if (primitive!) return primitive;
	const complex = parseComplex(stack,value);
	if (complex!) return complex;
	return Null
} as typeof parsePrimitive & typeof parseComplex & ((stack: IStack,n?:unknown)=>typeof Null);

export default parseRuntime;