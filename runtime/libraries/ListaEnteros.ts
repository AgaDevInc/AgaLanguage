import { colorize, FOREGROUND } from 'aga//colors_string/mod.ts';
import AgalClass from 'magal/runtime/values/complex/Class.class.ts';
import AgalNumberGetter, { AgalNumber } from 'magal/runtime/values/primitive/Number.class.ts';
import AgalRuntime, { defaultStack } from 'magal/runtime/values/Runtime.class.ts';
import { AgalReferenceError } from 'magal/runtime/values/internal/Error.class.ts';
import AgalArray from 'magal/runtime/values/complex/Array.class.ts';
import AgalFunction from 'magal/runtime/values/complex/Function.class.ts';
import { AgalString } from "magal/runtime/values/primitive/String.class.ts";
import { ClassPropertyExtra } from 'magal/frontend/ast.ts';

export class AgalIntArray extends AgalArray {
  protected _set(): Promise<AgalRuntime> {
    return Promise.resolve(
      new AgalReferenceError('No se puede modificar un "ListaEnteros"', defaultStack).throw()
    );
  }
  protected async _aCadena(): Promise<string> {
    const endKey = this.length;
    const list = [];
    for (let i = 0; i < endKey; i++) {
      list.push(
        Number((await this._get(`${i}`)) ? await (await this.get(`${i}`)).aCadena() : '0')
      );
    }
    return String.fromCharCode(...list);
  }
  protected async _aConsola(): Promise<string> {
    const endKey = await this.length;
    const list = [];
    for (let i = 0; i < endKey && i < 100; i++) {
      list.push(
        (await this._get(`${i}`))
          ? await (await this.get(`${i}`)).aConsolaEn()
          : colorize('<vacio>', FOREGROUND.GRAY)
      );
    }
    return `ListaEnteros [${list.join(', ')}]`;
  }
  protected _aConsolaEn(): Promise<string> {
    return this._aConsola();
  }
  static from(list: number[] | Uint8Array) {
    const l = new AgalIntArray();
    for (let i = 0; i < list.length; i++) {
      l.setSync(`${i}`, AgalNumberGetter(list[i]));
    }
    return l;
  }
  [Symbol.iterator] = function* (this: AgalIntArray) {
    const endKey = this.length;
    for (let i = 0; i < endKey; i++) {
      const data = this.getSync(`${i}`) as AgalNumber | null;
      if(data==null) yield 0;
      else yield (Number(`${data.value}`) || 0)
    }
  }
}
export default function ListaEnteros() {
	return new AgalClass(
		'ListaEnteros',
		{
			__constructor__: {
				meta: [],
				// deno-lint-ignore require-await
				value: AgalFunction.from(async function (_name, _stack, _este, ...args) {
					const l = new AgalIntArray();
					for (let i = 0; i < args.length; i++) {
						if (!args[i]) continue;
						if (args[i] instanceof AgalNumber) {
							const data = Number(args[i].aCadena()) || 0;
							l.setSync(`${i}`, AgalNumberGetter(data));
						}
					}
					return l;
				}),
			},
      desde: {
        meta: [ClassPropertyExtra.Static],
        value: AgalFunction.from(async function (_name, stack, _este, cadena) {
          const l = new AgalIntArray();
          if(!cadena) return l;
          if(!(cadena instanceof AgalString)) {
            return new AgalReferenceError('Se esperaba una cadena', stack).throw();
          }
          const data = await cadena.aCadena();
          for (let i = 0; i < data.length; i++) {
            l.setSync(`${i}`, AgalNumberGetter(data.charCodeAt(i)));
          }
          return l;
        }).setName('ListaEnteros.desde'),
      }
		},
		undefined,
		AgalIntArray
	);
}
