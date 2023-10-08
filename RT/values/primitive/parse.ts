// deno-lint-ignore-file no-unused-vars
import AgalPrimitive from "magal/RT/values/primitive/class.ts";
import AgalNumber from "magal/RT/values/primitive/AgalNumber.ts";
import AgalBoolean from "magal/RT/values/primitive/AgalBoolean.ts";
import AgalNull from "magal/RT/values/primitive/AgalNull.ts";
import AgalString from "magal/RT/values/primitive/AgalString.ts";
import { IStack } from "magal/RT/stack.ts";
import { LikeNumber } from "aga//super_math/types.d.ts";
import ComplexNumber from "aga//super_math/ComplexNumber.class.ts";

export default function parse(  data: LikeNumber): AgalNumber;
export default function parse(  data: boolean): AgalBoolean;
export default function parse(  data: string): AgalString;
export default function parse( data?: null): AgalNull;
export default function parse( data: unknown): AgalPrimitive{
  if(data instanceof AgalPrimitive) return data;
  if (typeof data === "number" || data instanceof ComplexNumber) return AgalNumber.from(data);
  if (typeof data === "boolean") return AgalBoolean.from(data);
  if (typeof data === "string") return AgalString.from(data);
  return AgalNull.from();
}
export function unparse(data: AgalNumber): LikeNumber;
export function unparse(data: AgalBoolean): boolean;
export function unparse(data: AgalString): string;
export function unparse(data?: AgalNull): null;
export function unparse(data?: AgalPrimitive): LikeNumber | boolean | string | null{
  if(data instanceof AgalNumber) return data.value;
  if(data instanceof AgalBoolean) return data.value;
  if(data instanceof AgalString) return data.value;
  return null;
}