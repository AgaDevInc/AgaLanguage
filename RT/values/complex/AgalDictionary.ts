import AgalComplex from "magal/RT/values/complex/class.ts";
import { defaultStack } from "magal/RT/stack.ts";
import parse from "magal/RT/values/parse.ts";

export default class AgalDictionary extends AgalComplex{
  type = 'Diccionario';
  static from(value: Record<string, any>) {
    const res = new AgalDictionary();
    for (const key in value) {
      res.set(defaultStack, key, parse(value[key]));
    }
    return res;
  }
}