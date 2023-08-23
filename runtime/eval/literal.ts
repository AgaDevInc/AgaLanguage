import { ArrayLiteral, Identifier, NumericLiteral, ObjectLiteral, StringLiteral } from "../../frontend/ast.ts";
import Environment from "../Environment.class.ts";
import { IStack, evaluate } from "../interpreter.ts";
import AgalArray from "../values/complex/Array.class.ts";
import AgalObject from "../values/complex/Object.class.ts";
import { AgalReferenceError } from "../values/internal/Error.class.ts";
import AgalNumber from '../values/primitive/Number.class.ts';
import AgalString from '../values/primitive/String.class.ts';

export function identifier(identifier: Identifier, env: Environment, stack: IStack) {
  const val = env.lookupVar(identifier.symbol, stack, identifier);
  if (!val) return new AgalReferenceError(
    `Variable '${identifier.symbol}' no ha sido declarada`,
    stack
  ).throw();
  return val;
}
export function string(str: StringLiteral, _env: Environment, _stack: IStack){
  return AgalString(str.value);
}
export function number(num: NumericLiteral, _env: Environment, _stack: IStack){
  return AgalNumber(num.value)
}
export async function array(arr: ArrayLiteral, env: Environment, stack: IStack){
  const list = new AgalArray();
  for (const prop of arr.properties) 
    list.set(prop.key, stack, await evaluate(prop.value!, env, stack));
  
  return list
}
export async function object(obj: ObjectLiteral, env: Environment, stack: IStack){
  const list = new AgalObject();
  for (const prop of obj.properties) 
    list.set(prop.key, stack, await evaluate(prop.value!, env, stack));
  return list
}