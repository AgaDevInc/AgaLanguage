import type { LikeNumber } from "aga:ComplexMath/types";
import Primitive from "./Primitive.class.ts";
import type { IStack } from "../../interpreter.ts";
import Runtime from "../Runtime.class.ts";
import { multiply } from "aga:ComplexMath/fns";
import Properties from "../internal/Properties.class.ts";

const memoData = new Map();
const props = new Properties(Primitive.loadProperties());

export class AgalNumber extends Primitive {
  constructor(public readonly value: LikeNumber) { super() }
  async call(_name: string,stack: IStack, _este: Runtime, other: Runtime): Promise<Runtime> {
    if(other instanceof AgalNumber) return NumberGetter(multiply(this.value, other.value));
    const {AgalTypeError} = await import('../internal/Error.class.ts');
    return new AgalTypeError(`No se puede multiplicar un número con '${await other.aCadena()}'`,stack).throw();
  }
  static loadProperties() {
    return props;
  }
  protected _aNumero() {
    return Promise.resolve(this.value);
  }
  protected _aBuleano(): Promise<boolean> {
    return Promise.resolve(!!this.value);
  }
  protected _aIterable(): Promise<Runtime[]> {
    if(typeof this.value === 'number') return Promise.resolve([NumberGetter(this.value), NumberGetter(0)])
    return Promise.resolve([...this.value].map(NumberGetter));
  }
}

export default function NumberGetter(number: LikeNumber): AgalNumber {
  const name = number.toString(36); // para numeros grandes 1000000 -> lfls usando base 36 0-9a-z
	if (memoData.has(name))
		return memoData.get(name);
  const agaNumber = new AgalNumber(number);
  memoData.set(name, agaNumber);
  return agaNumber;
}
