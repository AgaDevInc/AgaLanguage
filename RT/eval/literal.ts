import {
  ArrayLiteral,
  Identifier,
  IterableLiteral,
  LITERALS_TYPE,
  NumericLiteral,
  ObjectLiteral,
  StringLiteral,
} from 'magal/frontend/ast.ts';
import Environment from 'magal/RT/Enviroment.ts';
import { IStack } from 'magal/RT/stack.ts';
import AgalString from 'magal/RT/values/primitive/AgalString.ts';
import AgalNumber from 'magal/RT/values/primitive/AgalNumber.ts';
import AgalRuntime from 'magal/RT/values/class.ts';
import AgalList from 'magal/RT/values/complex/AgalList.ts';
import interpreter from 'magal/RT/interpreter.ts';
import AgalNull from 'magal/RT/values/primitive/AgalNull.ts';
import AgalError from 'magal/RT/values/complex/AgalError.ts';
import AgalDictionary from 'magal/RT/values/complex/AgalDictionary.ts';
import { AgalRuntimeToAgalIterable } from 'magal/RT/utils.ts';

export function string(
  node: StringLiteral,
  _env: Environment,
  _stack: IStack
): AgalString {
  return AgalString.from(node.value);
}
export function numeric(
  node: NumericLiteral,
  _env: Environment,
  _stack: IStack
): AgalNumber {
  return AgalNumber.from(node.value);
}
export function identifier(
  node: Identifier,
  env: Environment,
  stack: IStack
): AgalRuntime {
  const value = env.get(node.symbol, stack, node);
  return value;
}

export async function iterable(
  node: IterableLiteral,
  env: Environment,
  stack: IStack
): Promise<AgalError | AgalList> {
  const value = env.get(node.identifier, stack, node);
  if (value instanceof AgalError && value.throwned) return value;
  return await AgalRuntimeToAgalIterable(stack, value)
}

function insertable(value: AgalRuntime):AgalRuntime {
  if(value instanceof AgalNull)return AgalNull.from();
  return value;
}

export async function list(
  node: ArrayLiteral,
  env: Environment,
  stack: IStack
): Promise<AgalList | AgalError> {
  const list = new AgalList();
  for (const element of node.properties) {
    const i = list.length;
    if(!element)continue;
    if (element.kind === LITERALS_TYPE.PROPERTY) {
      if (!element.value) {
        list.set(stack, `${i}`, AgalNull.from(true));
        continue;
      }
      const v = await interpreter(element.value, env, stack);
      list.set(stack, `${i}`, insertable(v));
      continue;
    }
    if(element.kind === LITERALS_TYPE.ITERABLE_LITERAL){
      const v = await iterable(element, env, stack);
      if(v instanceof AgalError)return v;
      const iterLength = v.length;
      for (let j = 0; j < iterLength; j++) {
        const value = v.get(stack, `${j}`);
        list.set(stack, `${i+j}`, insertable(value!)||AgalNull.from(true));
      }
    }
  }
  return list;
}
export async function dictionary(
  node: ObjectLiteral,
  env: Environment,
  stack: IStack
): Promise<AgalDictionary | AgalError> {
  const dict = new AgalDictionary();
  for (const element of node.properties) {
    if (element.kind === LITERALS_TYPE.PROPERTY) {
      if (!element.value) {
        dict.set(stack, element.key, AgalNull.from(true));
        continue;
      }
      const v = await interpreter(element.value, env, stack);
      dict.set(stack, element.key, insertable(v));
    }
    if(element.kind === LITERALS_TYPE.ITERABLE_LITERAL){
      const v = env.get(element.identifier, stack, element);
      if(v instanceof AgalError)return v;
      const keys = v.keys();
      for (const key of keys) {
        const original = dict.get(stack, key);
        const value = v.get(stack, key);
        dict.set(stack, key, insertable(value!)||original||AgalNull.from(true));
      }
    }
  }
  return dict;
}