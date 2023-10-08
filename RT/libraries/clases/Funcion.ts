import AgalClass from "magal/RT/values/complex/AgalClass.ts";
import { AgalTypeError } from "magal/RT/values/complex/AgalError.ts";
import AgalString from "magal/RT/values/primitive/AgalString.ts";
import AgalEval from "magal/RT/eval.ts";
import AgalFunction from "magal/RT/values/complex/AgalFunction.ts";
import { Libraries } from "magal/RT/libraries/register.ts";

export default function (register: Libraries) {
  register.set('clases/Funcion', () => new AgalClass('Funcion', {
    __constructor__(stack, _name, _este, ...argums) {
      const [code, ...args] = argums.reverse();
      if(!code) return new AgalTypeError(stack,'No se ha especificado el codigo de la funcion').throw();
      const validCode = code instanceof AgalString;
      if(!validCode) return new AgalTypeError(stack,'El codigo de la funcion debe ser un texto').throw();
      const validArgs = args.every(arg => arg instanceof AgalString);
      if(!validArgs) return new AgalTypeError(stack,'Los argumentos de la funcion deben ser textos').throw();
      return AgalEval(`fn funcion(${args.join(',')}){ ${code} }`)
    },
    isInstance(value) {
      return value instanceof AgalFunction;
    }
	}));
}