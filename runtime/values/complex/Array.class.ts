import { colorize,FOREGROUND } from "aga:Colors";
import parseRuntime from "../parse.ts";
import Runtime, { defaultStack } from "../Runtime.class.ts";

export default class AgalArray extends Runtime{
  get(name: string): Promise<Runtime> {
    return super.get(name);
  }
  async _aCadena(): Promise<string> {
    const endKey = (await this.keys()).map(k => parseInt(k)).reduce((a, b) => Math.max(a, b), 0);
    const list = [];
    for(let i = 0; i <= endKey; i++){
      list.push(await this.has(`${i}`) ? await (await this.get(`${i}`)).aConsolaEn() : colorize('<vacio>', FOREGROUND.GRAY));
    }
    return `[${list.join(', ')}]`;
  }
  async _aConsola(): Promise<string> {
    return await this.aCadena()
  }
  async _aConsolaEn(): Promise<string> {
    return await colorize('[Lista]', FOREGROUND.CYAN)
  }
  static from(list: unknown[]){
    const l = new AgalArray();
    for(let i = 0; i < list.length; i++)
      l.set(`${i}`, defaultStack, parseRuntime(defaultStack, list[i]));
    return l;
  }
}