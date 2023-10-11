import { AgalRuntimeToAgalString } from 'magal/RT/utils.ts';
import AgalString from 'magal/RT/values/primitive/AgalString.ts';
import { Libraries } from 'magal/RT/libraries/register.ts';
import { AgalClass, AgalFunction, AgalTypeError } from 'magal/RT/values/complex/index.ts';
import { defaultStack } from "magal/RT/stack.ts";
import parse from "magal/RT/values/parse.ts";

export default function (register: Libraries) {
  register.set('clases/Cadena', () => {
    const Cadena = new AgalClass('Cadena', {
      __constructor__(stack, _name, _este, data) {
        return AgalRuntimeToAgalString(stack, data);
      },
      isInstance(value) {
        return value instanceof AgalString;
      },
    });
    Cadena.set(defaultStack, 'separar', AgalFunction.from((stack, _name, _este, str, sep) => {
      if(!(str instanceof AgalString)) {
        return new AgalTypeError(stack, 'El primer argumento debe ser una cadena').throw();
      }
      if(!(sep instanceof AgalString)) {
        return new AgalTypeError(stack, 'El segundo argumento debe ser una cadena').throw();
      }
      return parse(str.value.split(sep.value));
    }))
    Cadena.set(defaultStack, 'unir', AgalFunction.from((stack, _name, _este, ...args) => {
      let result = '';
      for(const arg of args) {
        if(!(arg instanceof AgalString)) {
          return new AgalTypeError(stack, 'Todos los argumentos deben ser cadenas').throw();
        }
        result += arg.value;
      }
      return parse(result);
    }))
    return Cadena;
  });
}
