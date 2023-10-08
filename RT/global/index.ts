import Enviroment from 'magal/RT/Enviroment.ts';

import typeOf from 'magal/RT/values/primitive/typeOf.ts';
import AgalNull from 'magal/RT/values/primitive/AgalNull.ts';
import AgalDictionary from 'magal/RT/values/complex/AgalDictionary.ts';
import AgalFunction from 'magal/RT/values/complex/AgalFunction.ts';
import AgalBoolean from 'magal/RT/values/primitive/AgalBoolean.ts';
import AgalString from 'magal/RT/values/primitive/AgalString.ts';
import AgalRuntime from 'magal/RT/values/class.ts';
import AgalError, { AgalTypeError, AgalUncatched } from 'magal/RT/values/complex/AgalError.ts';
import AgalClass from 'magal/RT/values/complex/AgalClass.ts';
import { defaultStack } from "magal/RT/stack.ts";
import { AgalRuntimeToConsole } from "magal/RT/utils.ts";

const scope = new Enviroment();
const global = new AgalDictionary();

// keywords
setKeyword('cierto', AgalBoolean.from(true));
setKeyword('falso', AgalBoolean.from(false));
setKeyword('nulo', AgalNull.from());
setKeyword('vacio', AgalNull.from(true));
setKeyword('este', global);
setKeyword(
  'tipoDe',
  new AgalFunction(
    defaultStack,
    'tipoDe',
    (stack, _name, _este, data) => {
      if (!data)
        return new AgalTypeError(
          stack,
          `Se esperaba un valor y no se recibió ninguno.`
        ).throw();
      return AgalString.from(typeOf(data as any));
    }
  )
);
setKeyword(
  'lanzar',
  new AgalFunction(
    defaultStack,
    'lanzar',async ( stack,_name, _este, data) => {
    if (!data)
      return new AgalTypeError( stack,
        `Se esperaba un valor y no se recibió ninguno.`,
      ).throw();
    if (data instanceof AgalError) return data.throw();
    const string = await AgalRuntimeToConsole(stack,data);
    if(string instanceof AgalError) return string.throw()
    return new AgalUncatched(stack, string.value).throw();
  })
);
setKeyword(
  'instanciaDe',
  new AgalFunction(defaultStack, 'instanciaDe', (stack,_name,  _este, data, tipo) => {
    if (!data)
      return new AgalTypeError(
    stack,
        `Se esperaba un valor y no se recibió ninguno.`,
      ).throw();
    if (!tipo)
      return new AgalTypeError(
    stack,
        `Se esperaba un tipo y no se recibió ninguno.`,
      ).throw();
    if (tipo instanceof AgalClass) return AgalBoolean.from(tipo.isInstance(data));
    return AgalBoolean.from(false);
  })
);

// variables
setGlobal('global', global, true);
setGlobal('esteGlobal', global, true);

function setGlobal(
  name: string,
  value: AgalRuntime,
  constant = false,
  keyword = false
) {
  if (value instanceof AgalFunction)value.set(defaultStack, 'nombre', AgalString.from(`<agal>.${name}`));
  global.set(defaultStack,name,  value);
  scope.set(name, defaultStack, value, { col: 0, row: 0, constant, keyword });
}
function setKeyword(name: string, value: AgalRuntime) {
  if (value instanceof AgalFunction)
    value.set(defaultStack, 'nombre', AgalString.from(`<agal>.${name}`));
  scope.set(name, defaultStack, value, {
    col: 0,
    row: 0,
    constant: true,
    keyword: true,
  });
}

export default function getGlobalScope(): Enviroment {
  return scope;
}

