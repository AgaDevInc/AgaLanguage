// deno-lint-ignore-file require-await
import AgalDictionary from 'magal/RT/values/complex/AgalDictionary.ts';
import AgalFunction from 'magal/RT/values/complex/AgalFunction.ts';
import AgalString from 'magal/RT/values/primitive/AgalString.ts';
import { AgalTypeError } from 'magal/RT/values/complex/AgalError.ts';
import { defaultStack } from 'magal/RT/stack.ts';
import AgalBoolean from 'magal/RT/values/primitive/AgalBoolean.ts';
import { Libraries } from 'magal/RT/libraries/register.ts';

export default (register: Libraries) =>
  register.set('permisos', function Permisos() {
    const obj = new AgalDictionary();
    obj.set(
      defaultStack,
      'quitar',
      AgalFunction.from(async (stack, _name, _este, permiso, data) => {
        if (!(permiso instanceof AgalString))
          return new AgalTypeError(
            stack,
            'Se esperaba una cadena en el permiso'
          ).throw();
        if (!data) return null;
        if (!(data instanceof AgalString))
          return new AgalTypeError(
            stack,
            'Se esperaba una cadena en el dato'
          ).throw();
        return null;
      })
    );
    obj.set(
      defaultStack,
      'pedir',
      AgalFunction.from(async (stack, _name, _este, permiso, data) => {
        if (!(permiso instanceof AgalString))
          return new AgalTypeError(
            stack,
            'Se esperaba una cadena en el permiso'
          ).throw();
        if (!data)
          return AgalBoolean.from(
            await Agal.Permissions.get(permiso.value as 'TODO')
          );
        if (!(data instanceof AgalString))
          return new AgalTypeError(
            stack,
            'Se esperaba una cadena en el dato'
          ).throw();
        return AgalBoolean.from(
          await Agal.Permissions.get(permiso.value as 'TODO', data.value)
        );
      })
    );
    return obj;
  });
