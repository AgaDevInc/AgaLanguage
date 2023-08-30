import { colorize, FOREGROUND } from "aga:Colors";
import parseRuntime from "../parse.ts";
import Runtime, { defaultStack } from "../Runtime.class.ts";
import type { IStack } from "../../interpreter.ts";
import Properties from "../internal/Properties.class.ts";

const props = new Properties(Runtime.loadProperties());
export default class AgalObject extends Runtime{
  static from(obj: Record<string, unknown>, stack:IStack){
    const o = new AgalObject();
    Object.keys(obj).forEach(key => {
      o.set(key, stack, parseRuntime(defaultStack, obj[key]));
    })
    return o;
  }
  async _aConsola(): Promise<string> {
    const obj = {} as Record<string, unknown>;
    const keys = await this.keys();
    for(const key of keys){
			const data = await this.get(key);
			if (this === data){ obj[key] = obj;continue}
      const res = await data.aConsolaEn();
      obj[key] = {[Symbol.for('Deno.customInspect')]:()=>res};
    }
    return Deno.inspect(obj, {colors: true, depth: 1});
  }
  _aConsolaEn(): Promise<string> {
    return Promise.resolve(colorize('[Objeto]', FOREGROUND.CYAN))
  }
  static loadProperties(): Properties {
    return props;
  }
}