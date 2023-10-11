import { Libraries } from 'magal/RT/libraries/register.ts';
import AgalDictionary from 'magal/RT/values/complex/AgalDictionary.ts';
import { defaultStack } from 'magal/RT/stack.ts';
import AgalFunction from 'magal/RT/values/complex/AgalFunction.ts';
import AgalError, { AgalTypeError } from 'magal/RT/values/complex/AgalError.ts';
import AgalNumber from 'magal/RT/values/primitive/AgalNumber.ts';
import { AgalRuntimeToConsole } from "magal/RT/utils.ts";
import { AgalString } from "magal/RT/values/primitive/index.ts";

export default (register: Libraries) => {
  register.set('tiempos', () => {
    const mod = new AgalDictionary();
    mod.set(
      defaultStack,
      'intervalo',
      new AgalFunction(
        defaultStack,
        'tiempos.intervalo',
        (stack, name, este, funcion, milisegundos) => {
          if (!(funcion instanceof AgalFunction))
            return new AgalTypeError(stack, `La funcion debe ser una funcion`);
          if (!(milisegundos instanceof AgalNumber))
            return new AgalTypeError(stack, `El tiempo debe ser un numero`);
          const intervalo = setInterval(async () => {
            const data = await funcion.call(stack, name, este);
            if (data instanceof AgalError && data.throwned) {
              clearInterval(intervalo);
              const log = await AgalRuntimeToConsole(stack, data) as AgalString
              console.log(log.value);
            }
          }, milisegundos.real);
          return new AgalFunction(
            defaultStack,
            'tiempos.intervalo().cancelar',
            () => {
              clearInterval(intervalo);
              return null;
            }
          );
        }
      )
    );
    mod.set(
      defaultStack,
      'pasando',
      new AgalFunction(
        defaultStack,
        'tiempos.timeout',
        (stack, name, este, funcion, milisegundos) => {
          if (!(funcion instanceof AgalFunction))
            return new AgalTypeError(stack, `La funcion debe ser una funcion`);
          if (!(milisegundos instanceof AgalNumber))
            return new AgalTypeError(stack, `El tiempo debe ser un numero`);
          const pasando = setTimeout(async () => {
            const data = await funcion.call(stack, name, este);
            if (data instanceof AgalError && data.throwned) {
              clearTimeout(pasando);
              const log = await AgalRuntimeToConsole(stack, data) as AgalString
              console.log(log.value);
            }
          }, milisegundos.real);
          return new AgalFunction(
            defaultStack,
            'tiempos.pasando().cancelar',
            () => {
              clearTimeout(pasando);
              return null;
            }
          );
        }
      )
    );
    return mod;
  });
};
