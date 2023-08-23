import type AgalFunction from "../../values/complex/Function.class.ts";
import type Environment from "../../Environment.class.ts";
import type { CallExpr } from "../../../frontend/ast.ts";
import { type IStack, evaluate } from "../../interpreter.ts";
import { AgalReferenceError } from "../../values/internal/Error.class.ts";

export default async function call(call: CallExpr, env: Environment, stack:IStack){
  const fn = await evaluate(call.callee, env,stack) as AgalFunction;
  const este = call.callee.kind === 'MemberExpr' ? await evaluate(call.callee.object, env,stack) : fn;
  if(fn == null) new AgalReferenceError('"nulo" no es una función',stack).throw();
  const args = [];
  for(const arg of call.args) args.push(await evaluate(arg, env,stack));
  
  return await fn.call(fn.name,stack, este, ...args);
}