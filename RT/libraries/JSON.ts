import AgalDictionary from 'magal/RT/values/complex/AgalDictionary.ts';
import { Libraries } from 'magal/RT/libraries/register.ts';
import { defaultStack } from 'magal/RT/stack.ts';
import { AgalError, AgalFunction, AgalTypeError } from 'magal/RT/values/complex/index.ts';
import AgalString from "magal/RT/values/primitive/AgalString.ts";
import parse from "magal/RT/values/parse.ts";
import { AgalRuntimeToJSON } from "magal/RT/utils.ts";

export default function (register: Libraries) {
  register.set('JSON', () => {
    const JSON = new AgalDictionary();
    JSON.set(
      defaultStack,
      'comprimir',
      AgalFunction.from(async (stack, _name, _self, data) => {
        try{
          const v = await AgalRuntimeToJSON(stack, data);
          if(v instanceof AgalError) return v.throw();
          return v;
        }catch(_e){
          return new AgalTypeError(stack, 'No se pudo convertir en json').throw();
        }
      })
    );
    JSON.set(
      defaultStack,
      'descomprimir',
      AgalFunction.from((stack, _name, _self, data) => {
        if(!(data instanceof AgalString)) return new AgalTypeError(stack, 'Se esperaba una cadena de texto').throw();
        const json = globalThis.JSON.parse(data.value);
        return parse(json);
      })
    );
    return JSON;
  });
}
