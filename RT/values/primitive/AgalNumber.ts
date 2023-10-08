import AgalPrimitive from "magal/RT/values/primitive/class.ts";
import AgalRuntime from "magal/RT/values/class.ts";
import { LikeNumber } from "aga//super_math/types.d.ts";

const cache = new Map<string,AgalNumber>();

export default class AgalNumber extends AgalPrimitive {
  private constructor(public value: LikeNumber) {
    super();
  }
  get real(){
    if(typeof this.value === 'number') return this.value;
    return this.value.real;
  }
  get imaginary(){
    if(typeof this.value === 'number') return 0;
    return this.value.imaginary;
  }
  static from(value: LikeNumber): AgalNumber {
    const name = value.toString()
    if(name.includes('NaN')) {
      if (cache.has('NaN')) return cache.get('NaN')!;
      const instance = new AgalNumber(value);
      cache.set('NaN',instance);
      return instance;
    }
    if (cache.has(name)) return cache.get(name)!;
    const instance = new AgalNumber(value);
    cache.set(name,instance);
    return instance;
  }
  static free(data: AgalRuntime): void {
    if (data instanceof AgalNumber) {
      cache.delete(data.value.toString());
      return;
    }
    super.free(data);
  }
}