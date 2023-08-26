import type { IterableLiteral } from "../../../frontend/ast.ts";
import type Environment from "../../Environment.class.ts";
import type { IStack } from "../../interpreter.ts";
import Runtime from "../Runtime.class.ts";
import type AgalArray from "../complex/Array.class.ts";
import type AgalObject from "../complex/Object.class.ts";
import AgalError from "./Error.class.ts";

export default class AgalIterator extends Runtime{
  constructor(private iterator: IterableLiteral, private env: Environment){
    super();
  }
  async useIn(obj: AgalObject | AgalArray, stack: IStack): Promise<Runtime> {
    const value = this.env.lookupVar(this.iterator.identifier, stack, this.iterator);
    if(value instanceof AgalError && value.throwed) return value;
    const AgalObject = (await import("../complex/Object.class.ts")).default;
    const AgalArray = (await import("../complex/Array.class.ts")).default;
    if(obj instanceof AgalObject){
      const keys = (await value.keys());
      if(obj instanceof AgalArray) {
        const max = await obj.length; 
      }
    }
    return obj;
  }
}