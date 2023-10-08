import AgalComplex from 'magal/RT/values/complex/class.ts';
import AgalFunction, {
  NativeAgalFunctionConfig,
} from 'magal/RT/values/complex/AgalFunction.ts';
import { defaultStack } from 'magal/RT/stack.ts';
import AgalDictionary from 'magal/RT/values/complex/AgalDictionary.ts';
import AgalList from 'magal/RT/values/complex/AgalList.ts';
import { AgalRuntime } from 'magal/RT/values/index.ts';
import { unparse as unparseR } from 'magal/RT/values/parse.ts';

export default function parseComplex(
  data: NativeAgalFunctionConfig
): AgalFunction;
export default function parseComplex(
  data: Record<string, unknown>
): AgalDictionary;
export default function parseComplex(data: unknown[]): AgalList;
export default function parseComplex(data: unknown): AgalComplex {
  if (data instanceof AgalComplex) return data;
  if (typeof data === 'function')
    return new AgalFunction(
      defaultStack,
      data.name || '<anonima>',
      data as NativeAgalFunctionConfig
    );
  if (Array.isArray(data)) return AgalList.from(data);
  return AgalDictionary.from(data as Record<string, unknown>);
}
export function unparse(data: AgalComplex): unknown {
  if (data instanceof AgalFunction)
    return function (...args: AgalRuntime[]) {
      return data.call(defaultStack, '', data, ...args);
    };
  if (data instanceof AgalDictionary) {
    const keys = data.keys();
    const value: Record<string, unknown> = {};
    for (let i = 0; i < keys.length; i++)
      value[keys[i]] = unparseR(data.get(defaultStack, keys[i])!);

    return value;
  }
  if (data instanceof AgalList) {
    const value: unknown[] = [];
    for (let i = 0; i < data.length; i++)
      value[i] = unparseR(data.get(defaultStack, `${i}`)!);

    return value;
  }
  return null;
}
