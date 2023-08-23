import Runtime from "../Runtime.class.ts";
import { FOREGROUND,colorize } from "aga:Colors";

export default abstract class Primitive extends Runtime{
  // deno-lint-ignore no-explicit-any
  value: any
  _aCadena(): Promise<string> {
    return Promise.resolve(`${this}`);
  }
  async _aConsola(): Promise<string> {
    return colorize(await this.aCadena(), FOREGROUND.YELLOW);
  }
  toString(): string {
    return `${this.value}`;
  }
}