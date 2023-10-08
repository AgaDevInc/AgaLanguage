// deno-lint-ignore-file no-explicit-any
import parseComplex from 'magal/RT/values/complex/parse.ts';
import parsePrimitive from 'magal/RT/values/primitive/parse.ts';
import AgalRuntime from "magal/RT/values/class.ts";

export default (( data: unknown) => {
  if(data instanceof AgalRuntime) return data;
  if (typeof data === 'object' && data !== null) {
    return parseComplex( data as any);
  }
  return parsePrimitive( data as any);
}) as typeof parseComplex & typeof parsePrimitive;

export const unparse = (( data: AgalRuntime) => 
    parseComplex( data as any) || parsePrimitive( data as any)
) as typeof parseComplex & typeof parsePrimitive & {(data: AgalRuntime): any};