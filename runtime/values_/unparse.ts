import { RuntimeArray, RuntimeFunction } from "./complex.ts";
import { IRuntimeValue } from "./internal.ts";
import RuntimePrimitive from "./primitive.ts";

// deno-lint-ignore no-explicit-any
export default function unparse(data: any): any {
	if (!data) return data;
  if (data instanceof RuntimePrimitive) return data.data || null;
  if (data instanceof RuntimeArray) {
    const arr = [];
    for(let i = 0; data.properties.has(i.toString()); i++) arr.push(unparse(data.properties.get(i.toString())))
    return arr;
  }
  if (data instanceof RuntimeFunction) return (...args: IRuntimeValue[]) => data.execute(args, 0, 0);
  return data
}