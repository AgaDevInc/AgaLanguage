import { colorize,FOREGROUND } from "aga:Colors";
import parseRuntime from "../parse.ts";
import Runtime, { defaultStack } from "../Runtime.class.ts";
import Properties from "../internal/Properties.class.ts";
import NumberGetter from "../primitive/Number.class.ts";
import AgalFunction from "./Function.class.ts";
import { IStack } from "../../interpreter.ts";

const ArrayProperties = new Properties(Runtime.loadProperties());
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
  static loadProperties(): Properties {
    return ArrayProperties;
  }
  static async getProperty(name: string,este: Runtime): Promise<Runtime|null> {
    const maxIndex = (await este.keys()).map(k => parseInt(k)|0).reduce((a, b) => Math.max(a, b), 0);
    if(name === 'largo') return NumberGetter(maxIndex + 1);
    if(name === 'agregar') return await ArrayProperties.set(
			'agregar',
			new AgalFunction(async (_name:string, stack:IStack, este:Runtime, ...args:Runtime[])=>{
        for(let i = 1; i <= args.length; i++)
          await este.set(`${maxIndex + i}`, stack, args[i]);
        return este;
      }).setName('Lista().agregar', defaultStack)
		);
    return null;
  }
}