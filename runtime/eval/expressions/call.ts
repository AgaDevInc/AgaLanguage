import type AgalFunction from "../../values/complex/Function.class.ts";
import type Environment from "../../Environment.class.ts";
import type { CallExpr } from "../../../frontend/ast.ts";
import { type IStack, evaluate } from "../../interpreter.ts";
import AgalError, { AgalReferenceError } from "../../values/internal/Error.class.ts";

export default async function call(call: CallExpr, env: Environment, stack:IStack){
  const fn = await evaluate(call.callee, env,stack);
  if(fn instanceof AgalError && fn.throwed) return fn;
  const este = call.callee.kind === 'MemberExpr' ? await evaluate(call.callee.object, env,stack) : fn;
  if(este instanceof AgalError && este.throwed) return este;
  if(fn === null) new AgalReferenceError('"nulo" no es una función',stack).throw();
  const args = [];
  for(const arg of call.args) {
   const data = await evaluate(arg, env,stack);
    if(data instanceof AgalError && data.throwed) return data;
    args.push(data);
  }
  
  return await fn.call((fn as AgalFunction).name,stack, este, ...args);
}