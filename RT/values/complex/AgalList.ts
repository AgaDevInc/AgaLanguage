import AgalComplex from 'magal/RT/values/complex/class.ts';
import AgalNumber from 'magal/RT/values/primitive/AgalNumber.ts';
import AgalRuntime from 'magal/RT/values/class.ts';
import { defaultStack, IStack } from 'magal/RT/stack.ts';
import { AgalTypeError } from 'magal/RT/values/complex/AgalError.ts';
import AgalNull from 'magal/RT/values/primitive/AgalNull.ts';
import parse, { unparse } from 'magal/RT/values/parse.ts';

export default class AgalList extends AgalComplex {
  type = 'Lista';
  get length(): number {
    const keys = this.keys();
    return keys.reduce((acc, key) => {
      const n = Number(key);
      if (isNaN(n)) return acc;
      return Math.max(acc, n + 1);
    }, 0);
  }
  get(_stack: IStack, name: string): AgalRuntime | null {
    if (name === 'largo') return AgalNumber.from(this.length);
    return super.get(_stack, name);
  }
  set(_stack: IStack, name: string, value: AgalRuntime): AgalRuntime {
    if (name === 'largo') {
      if (value instanceof AgalNumber) {
        const x = Number(value.value);
        if (isNaN(x))
          return new AgalTypeError(
            _stack,
            `El largo de una lista debe ser un número real. (${x})`
          ).throw();
        if (x.toString().includes('.'))
          return new AgalTypeError(
            _stack,
            `El largo de una lista debe ser un número entero. (${x})`
          ).throw();
        if (x < 0)
          return new AgalTypeError(
            _stack,
            `El largo de una lista debe ser positivo. (${x})`
          ).throw();
        const length = this.length;
        if (x < length)
          for (let i = length; i > x; i--) this.delete(_stack, i.toString());
        else
          for (let i = length; i < x; i++)
            this.set(_stack, i.toString(), AgalNull.from(true));
      }
    }
    return super.set(_stack, name, value);
  }
  *[Symbol.iterator]() {
    for(let i = 0; i < this.length; i++) yield unparse(this.get(defaultStack, i.toString())!);
  }

  // deno-lint-ignore no-explicit-any
  static from(list: any[]): AgalList {
    const result = new AgalList();
    list.forEach((item, index) => result.set(defaultStack, index.toString(), parse(item)));
    return result;
  }
}
