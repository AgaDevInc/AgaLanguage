import AgalClass from "magal/RT/values/complex/AgalClass.ts";
import { Libraries } from "magal/RT/libraries/register.ts";
import AgalDictionary from "magal/RT/values/complex/AgalDictionary.ts";
import AgalFunction from "magal/RT/values/complex/AgalFunction.ts";
import parse from "magal/RT/values/parse.ts";
import { defaultStack } from "magal/RT/stack.ts";
import AgalString from "magal/RT/values/primitive/AgalString.ts";
import AgalNull from "magal/RT/values/primitive/AgalNull.ts";

export default function (register: Libraries) {
  register.set('clases/Dicionario', () => {
    const Dicionario = new AgalClass('Dicionario', {
      __constructor__(_stack, _name, _este) {
        return new AgalDictionary();
      },
      isInstance(value) {
        return value instanceof AgalDictionary;
      }
    });
    const Dicionario_llaves = AgalFunction.from((_stack, _name, _este, obj) => parse(obj.keys()));
    Dicionario_llaves.set(defaultStack,'nombre', AgalString.from('Dicionario.llaves'));
    Dicionario.set(defaultStack, 'llaves', Dicionario_llaves);
  
    const Dicionario_entradas = AgalFunction.from((stack, _name, _este, obj) => parse(obj.keys().map(key => [key, obj.get(stack, key)])));
    Dicionario_entradas.set(defaultStack,'nombre', AgalString.from('Dicionario.entradas'));
    Dicionario.set(defaultStack, 'entradas', Dicionario_entradas);
  
    const Dicionario_valores = AgalFunction.from((stack, _name, _este, obj) => parse(obj.keys().map(key => obj.get(stack, key))));
    Dicionario_valores.set(defaultStack,'nombre', AgalString.from('Dicionario.valores'));
    Dicionario.set(defaultStack, 'valores', Dicionario_valores);
  
    const Dicionario_desdeEntradas = AgalFunction.from((stack, _name, _este, ...args) => {
      const dict = new AgalDictionary();
      args.forEach(arg => {
        const key = arg.get(stack, '0')?.toString() || 'nulo';
        const value = arg.get(stack, '1') || AgalNull.from(true);
        dict.set(stack, key, value);
      });
      return dict;
    });
    Dicionario_desdeEntradas.set(defaultStack,'nombre', AgalString.from('Dicionario.desdeEntradas'));
    Dicionario.set(defaultStack, 'desdeEntradas', Dicionario_desdeEntradas);
    return Dicionario;
  });
}