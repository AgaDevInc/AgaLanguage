import {
  ExportStatement,
  IfStatement,
  ImportStatement,
  ReturnStatement,
  TryStatement,
  WhileStatement,
} from 'magal/frontend/ast.ts';
import { IStack } from 'magal/RT/stack.ts';
import AgalRuntime from 'magal/RT/values/class.ts';
import AgalError from 'magal/RT/values/complex/AgalError.ts';
import AgalNull from 'magal/RT/values/primitive/AgalNull.ts';
import Enviroment from 'magal/RT/Enviroment.ts';
import interpreter from 'magal/RT/interpreter.ts';
import AgalDictionary from 'magal/RT/values/complex/AgalDictionary.ts';
import AgalString from 'magal/RT/values/primitive/AgalString.ts';
import { AgalRuntimeToAgalBoolean } from 'magal/RT/utils.ts';

export async function _export(
  node: ExportStatement,
  env: Enviroment,
  stack: IStack
): Promise<AgalRuntime> {
  const data = env.get('exportar', stack, node);
  if (data instanceof AgalError && data.throwned) return data;
  if (node.identifier === '<exportable>') {
    const value = await interpreter(node.value, env, stack);
    if (value instanceof AgalError) return value;
    if (value instanceof AgalDictionary) {
      const keys = value.keys();
      for (const key of keys) {
        const original = data.get(stack, key);
        data.set(
          stack,
          key,
          value.get(stack, key) || original || AgalNull.from(true)
        );
      }
    }
    return value;
  }
  const value = await interpreter(node.value, env, stack);
  if (value instanceof AgalError) return value;
  data.set(stack, node.identifier, value);
  return data;
}

export async function _import(
  node: ImportStatement,
  env: Enviroment,
  stack: IStack
): Promise<AgalRuntime> {
  const data = env.get('importar', stack, node);
  if (data instanceof AgalError && data.throwned) return data;
  const _with = await interpreter(node.with!, env, stack);
  const value = await data.call(
    stack,
    'importar',
    data,
    AgalString.from(node.path),
    _with
  ) || AgalNull.from(true);
  if(value instanceof AgalError) return value.throw();
  if (node.as) env.set(node.as, stack, value, node);
  return value;
}
export async function _return(
  node: ReturnStatement,
  env: Enviroment,
  stack: IStack
): Promise<AgalRuntime> {
  if (!node.value) return AgalNull.from(true);
  return await interpreter(node.value, env, stack);
}
export async function _if(node: IfStatement, env: Enviroment, stack: IStack) {
  const condition = await interpreter(node.condition, env, stack);
  if (condition instanceof AgalError && condition.throwned) return condition;
  const bool = await AgalRuntimeToAgalBoolean(stack, condition);
  if (bool instanceof AgalError) return bool.throw();
  if (bool.value) {
    const ifEnv = env.createChild();
    const result = await interpreter(node.body, ifEnv, stack);
    env.deleteChild(ifEnv);
    return result;
  } else if (node.else) {
    const elseEnv = env.createChild();
    const result = await interpreter(node.else, elseEnv, stack);
    env.deleteChild(elseEnv);
    return result;
  }
  return AgalNull.from(true);
}
export async function _try(node: TryStatement, env: Enviroment, stack: IStack) {
  const tryEnv = env.createChild();
  const body = await interpreter(node.body, tryEnv, stack);
  env.deleteChild(tryEnv);
  if (body instanceof AgalError && body.throwned) {
    const catchEnv = env.createChild();
    catchEnv.set(node.catch.errorName, stack, body, node.catch);
    const catchBody = await interpreter(node.catch.body, catchEnv, stack);
    env.deleteChild(catchEnv);
    return catchBody;
  }
  if (node.finally) {
    const finallyEnv = env.createChild();
    const finallyBody = await interpreter(node.finally.body, finallyEnv, stack);
    env.deleteChild(finallyEnv);
    return finallyBody;
  }
  return body;
}

export async function _while(
  node: WhileStatement,
  env: Enviroment,
  stack: IStack
) {
  const condition = await interpreter(node.condition, env, stack);
  if (condition instanceof AgalError && condition.throwned) return condition;
  let bool = await AgalRuntimeToAgalBoolean(stack, condition);
  if (bool instanceof AgalError) return bool.throw();
  const whileEnv = env.createChild();
  while (bool.value) {
    const result = await interpreter(node.body, whileEnv, stack);
    if (result instanceof AgalError && result.throwned) {
      env.deleteChild(whileEnv);
      return result;
    }
    const condition = await interpreter(node.condition, env, stack);
    if (condition instanceof AgalError && condition.throwned) {
      env.deleteChild(whileEnv);
      return condition;
    }
    bool = await AgalRuntimeToAgalBoolean(stack, condition);
    if (bool instanceof AgalError) {
      env.deleteChild(whileEnv);
      return bool.throw();
    }
    whileEnv.clear();
  }
  env.deleteChild(whileEnv);
  return AgalNull.from(true);
}
