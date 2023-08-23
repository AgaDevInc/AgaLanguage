import { FOREGROUND, colorize } from "aga:Colors";
import Primitive from "./Primitive.class.ts";

const momoData = new Map();

export class AgalString extends Primitive {
  constructor(public readonly value: string) { super() }
  public toString() {
    return this.value;
  }
  aConsola(): Promise<string> {
    return Promise.resolve(this.value);
  }
  aConsolaEn(): Promise<string> {
    return colorize(Deno.inspect(this.value), FOREGROUND.GREEN);
  }
}

export default function StringGetter(string: string): AgalString {
	if (momoData.has(string)) {
		return momoData.get(string);
	}
  const agaString = new AgalString(string);
  momoData.set(string, agaString);
  return agaString;
}
