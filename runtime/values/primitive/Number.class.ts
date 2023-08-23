import type { LikeNumber } from "aga:ComplexMath/types";
import Primitive from "./Primitive.class.ts";

const momoData = new Map();

export class AgalNumber extends Primitive {
  constructor(public readonly value: LikeNumber) { super() }
  public toString() {
    return this.value.toString();
  }
}

export default function NumberGetter(number: LikeNumber): AgalNumber {
  const name = number.toString();
	if (momoData.has(name)) {
		return momoData.get(name);
	}
  const agaNumber = new AgalNumber(number);
  momoData.set(name, agaNumber);
  return agaNumber;
}
