import { Libraries } from 'magal/RT/libraries/register.ts';
import AgalClass from 'magal/RT/values/complex/AgalClass.ts';
import AgalError, {
  AgalReferenceError,
  AgalSyntaxError,
  AgalTokenizeError,
  AgalTypeError,
} from 'magal/RT/values/complex/AgalError.ts';
import { defaultStack } from "magal/RT/stack.ts";

export default function (register: Libraries) {
  function registerError(name: string, type: typeof AgalError) {
    const errorName = `clases/${name ? 'Error/' + name : 'Error'}`;
    const data = () =>
      new AgalClass('Error' + name, {
        __constructor__(stack, _name, _este, mensaje) {
          return new type(stack, mensaje.toString());
        },
        isInstance(value) {
          return value instanceof type;
        },
      });
    register.set(errorName, data);
    return data;
  }
  const ErrorTipo = registerError('Tipo', AgalTypeError);
  const ErrorReferencia = registerError('Referencia', AgalReferenceError);
  const ErrorTokenizar = registerError('Tokenizar', AgalTokenizeError);
  const ErrorSintaxis = registerError('Sintaxis', AgalSyntaxError);
  const Error = () => new AgalClass('Error', {
    __constructor__(stack, _name, _este, mensaje) {
      return new AgalError(stack, mensaje.toString());
    },
    isInstance(value) {
      return value instanceof AgalError;
    },
  });

  register.set('clases/Error/solo', Error);
  register.set('clases/Error', ()=>{
    const _Error = Error();
    _Error.set(defaultStack, 'ErrorTipo', ErrorTipo());
    _Error.set(defaultStack, 'ErrorReferencia', ErrorReferencia());
    _Error.set(defaultStack, 'ErrorTokenizar', ErrorTokenizar());
    _Error.set(defaultStack, 'ErrorSintaxis', ErrorSintaxis());
    return _Error;
  });
}
