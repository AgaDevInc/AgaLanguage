import { Program } from "magal/frontend/ast.ts";
import Enviroment from "magal/RT/Enviroment.ts";
import interpreter from "magal/RT/interpreter.ts";
import { IStack } from "magal/RT/stack.ts";
import AgalError from "magal/RT/values/complex/AgalError.ts";

export * as literal from "magal/RT/eval/literal.ts"
export * as statement from "magal/RT/eval/statement.ts"
export * as declaration from "magal/RT/eval/declaration.ts"
export * as expression from "magal/RT/eval/expression.ts"
export async function program(node: Program, env: Enviroment, stack: IStack){
  const result = await interpreter(node.body, env, stack);
  if(result instanceof AgalError && result.throwned) return result;
  return env.get('modulo', stack, node)
}