import AgalPrimitive from 'magal/RT/values/primitive/class.ts';

const cache = new Map<boolean, AgalBoolean>();

export default class AgalBoolean extends AgalPrimitive {
  constructor(public value: boolean) {
    super();
  }
  static from(value: boolean) {
    if (cache.has(value)) return cache.get(value)!;
    const instance = new AgalBoolean(value);
    cache.set(value, instance);
    return instance;
  }
  toString(): string {
    return this.value ? 'cierto' : 'falso';
  }
}
