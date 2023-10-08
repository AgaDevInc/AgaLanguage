import AgalClass from 'magal/RT/values/complex/AgalClass.ts';
import AgalNumber from 'magal/RT/values/primitive/AgalNumber.ts';
import AgalRuntime from 'magal/RT/values/class.ts';
import { AgalReferenceError } from 'magal/RT/values/complex/AgalError.ts';
import AgalLista from 'magal/RT/values/complex/AgalList.ts';
import AgalFunction from 'magal/RT/values/complex/AgalFunction.ts';
import AgalString from 'magal/RT/values/primitive/AgalString.ts';
import { defaultStack, IStack } from 'magal/RT/stack.ts';
import {
  AgalRuntimeToAgalNumber,
  AgalRuntimeToAgalString,
} from 'magal/RT/utils.ts';
import { AgalError, AgalTypeError } from 'magal/RT/values/complex/index.ts';
import { Libraries } from 'magal/RT/libraries/register.ts';

export class AgalIntArray extends AgalLista {
  type = `Objeto ListaEnteros extiende Lista`;
  _set(name: string, value: AgalNumber) {
    return super.set(defaultStack, name, value);
  }
  set(stack: IStack, _name: string, _value: AgalRuntime): AgalRuntime {
    return new AgalReferenceError(
      stack,
      'No se puede modificar un "ListaEnteros"'
    ).throw();
  }

  static from(list: number[] | Uint8Array) {
    const l = new AgalIntArray();
    for (let i = 0; i < list.length; i++) {
      l._set(`${i}`, AgalNumber.from(list[i]));
    }
    return l;
  }
  toString(): string {
    let str = '';
    for (let i = 0; i < this.length; i++) {
      const n = this.get(defaultStack, i + '')! as AgalNumber;
      str += String.fromCharCode(n.real);
    }
    return str;
  }
}
export default (register: Libraries) =>
  register.set('ListaEnteros', function ListaEnteros() {
    const Lista = register.get('clases/Lista') as AgalClass;
    const Class = new AgalClass('ListaEnteros', {
      async __constructor__(stack, _name, _este, ...args) {
        const l = new AgalIntArray();
        for (let i = 0; i < args.length; i++) {
          const v = await AgalRuntimeToAgalNumber(stack, args[i]);
          if (v instanceof AgalError) return v.throw();
          const int = parseInt(v.real.toString().replace('-', ''));
          if (isNaN(int)) {
            return new AgalReferenceError(
              stack,
              'Se esperaba un numero'
            ).throw();
          }
          if (AgalNumber.from(int) !== v)
            return new AgalTypeError(
              stack,
              `Se esperaba un numero entero real positivo`
            ).throw();
          l._set(`${i}`, AgalNumber.from(int));
        }
        return l;
      },
      isInstance(value: AgalRuntime) {
        return value instanceof AgalIntArray;
      },
      parent: Lista,
    });
    const desde = AgalFunction.from(async function (
      stack,
      _name,
      _este,
      cadena
    ) {
      const l = new AgalIntArray();
      if (!cadena) return l;
      if (!(cadena instanceof AgalString)) {
        return new AgalTypeError(stack, 'Se esperaba una cadena para convertir').throw();
      }
      const data = await AgalRuntimeToAgalString(stack, cadena);
      if (data instanceof AgalError) return data.throw();
      for (let i = 0; i < data.value.length; i++) {
        l._set(`${i}`, AgalNumber.from(data.value.charCodeAt(i)));
      }
      return l;
    });
    desde.set(defaultStack, 'nombre', AgalString.from('ListaEnteros.desde'));
    Class.set(defaultStack, 'desde', desde);
    return Class;
  });
