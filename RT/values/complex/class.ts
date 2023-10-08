import AgalRuntime from "magal/RT/values/class.ts";
import type { IStack } from "magal/RT/stack.ts";

export default abstract class AgalComplex extends AgalRuntime{
  #props: Map<string|symbol,AgalRuntime> = new Map();
  abstract type: string;
  get(_stack: IStack,name: string): AgalRuntime|null {
    return this.#props.get(name) ?? null;
  }
  set(_stack: IStack,name: string,value: AgalRuntime): AgalRuntime {
    this.#props.set(name,value);
    return value;
  }
  delete(_stack: IStack,name: string): void {
    this.#props.delete(name);
  }
  has(_stack: IStack,name: string): boolean {
    return this.#props.has(name);
  }
  keys(): string[] {
    const keys = [];
    for (const key of this.#props.keys()) {
      if (typeof key === 'string') keys.push(key);
    }
    return keys;
  }
  toString(): string {
    return `[${this.type}]`;
  }
}