import type { LikeNumber } from "aga:ComplexMath/types";
import Primitive from "./Primitive.class.ts";

const memoData = new Map();

export class AgalNumber extends Primitive {
  constructor(public readonly value: LikeNumber) { super() }
  public toString() {
    return this.value.toString();
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
