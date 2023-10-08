import AgalPrimitive from "magal/RT/values/primitive/class.ts";
import AgalRuntime from "../class.ts";

const cache = new Map<string,AgalString>();

export default class AgalString extends AgalPrimitive {
  private constructor(public value: string) {
    super();
  }
  static from(value: string): AgalString {
    if (cache.has(value)) return cache.get(value)!;
    const instance = new AgalString(value);
    cache.set(value,instance);
    return instance;
  }
  static free(data: AgalRuntime): void {
    if (data instanceof AgalString) {
      cache.delete(data.value);
      return;
    }
    super.free(data);
  }
}