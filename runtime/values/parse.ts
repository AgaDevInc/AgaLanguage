import parseComplex from "./complex/parse.ts";
import parsePrimitive from "./primitive/parse.ts";
import Null from "./primitive/Null.class.ts";
import type { IStack } from "../interpreter.ts";

// deno-lint-ignore no-explicit-any
const parseRuntime = function parseRuntime(stack: IStack,value: any) {
	const primitive = parsePrimitive(stack,value);
	if (primitive!) return primitive;
	const complex = parseComplex(stack,value);
	if (complex!) return complex;
	return Null
} as typeof parsePrimitive & typeof parseComplex & ((stack: IStack,n?:unknown)=>typeof Null);

export default parseRuntime;