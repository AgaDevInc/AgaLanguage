import type { LikeNumber } from "aga:ComplexMath/types";
import Primitive from "./Primitive.class.ts";
import { IStack } from "../../interpreter.ts";
import Runtime from "../Runtime.class.ts";
import { multiply } from "aga:ComplexMath/fns";

const memoData = new Map();

export class AgalNumber extends Primitive {
  constructor(public readonly value: LikeNumber) { super() }
  async call(_name: string,stack: IStack, _este: Runtime, other: Runtime): Promise<Runtime> {
    if(other instanceof AgalNumber) return NumberGetter(multiply(this.value, other.value));
    const {AgalTypeError} = await import('../internal/Error.class.ts');
    return new AgalTypeError(`No se puede multiplicar un número con '${await other.aCadena()}'`,stack).throw();
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
