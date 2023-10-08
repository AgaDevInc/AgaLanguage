import type { ClassDeclaration, FunctionDeclaration, VarDeclaration } from "magal/frontend/ast.ts";
import Enviroment from "magal/RT/Enviroment.ts";
import { IStack } from "magal/RT/stack.ts";
import interpreter from "magal/RT/interpreter.ts";
import AgalRuntime from "magal/RT/values/class.ts";
import AgalFunction from "magal/RT/values/complex/AgalFunction.ts";
import AgalClass from "magal/RT/values/complex/AgalClass.ts";

export  async function variable(
  node: VarDeclaration,
  env: Enviroment,
  stack: IStack
): Promise<AgalRuntime>{
  const value = await interpreter(node.value!, env, stack);
  return env.set(node.identifier, stack, value, node);
}

export function _function(
  node: FunctionDeclaration,
  env: Enviroment,
  stack: IStack
): AgalRuntime{
  const name = node.identifier;
  const value = new AgalFunction(stack, name, { stmt: node, env });
  env.set(name, stack, value, node);
  return value;
}

export function _class(
  node: ClassDeclaration,
  env: Enviroment,
  stack: IStack
): AgalRuntime{
  const name = node.identifier;
  const value = new AgalClass(name, { stmt: node, env });
  env.set(name, stack, value, node);
  return value;
}