import AgalDictionary from 'magal/RT/values/complex/AgalDictionary.ts';
import AgalFunction from 'magal/RT/values/complex/AgalFunction.ts';
import AgalString from 'magal/RT/values/primitive/AgalString.ts';
import { defaultStack } from 'magal/RT/stack.ts';
import { Libraries } from 'magal/RT/libraries/register.ts';

export default (register: Libraries) =>
  register.set('proceso', function proceso() {
    const mod = new AgalDictionary();
    mod.set(
      defaultStack,
      'salir',
      new AgalFunction(defaultStack, 'proceso.salir', () => Deno.exit(0))
    );
    mod.set(defaultStack, 'version', AgalString.from(Agal.versions.agal));
    mod.set(defaultStack, 'args', AgalString.from(Agal.args));
    return mod;
  });
