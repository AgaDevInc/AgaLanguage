import { Libraries } from 'magal/RT/libraries/register.ts';
import AgalClass from 'magal/RT/values/complex/AgalClass.ts';
import AgalList from 'magal/RT/values/complex/AgalList.ts';
import { defaultStack } from 'magal/RT/stack.ts';
import AgalFunction from 'magal/RT/values/complex/AgalFunction.ts';
import AgalString from 'magal/RT/values/primitive/AgalString.ts';

export default function (register: Libraries) {
  register.set('clases/Lista', () => {
    const Lista = new AgalClass('Lista', {
      __constructor__(stack, _name, _este, length) {
        const list = new AgalList();
        list.set(stack, 'largo', length);
        return list;
      },
      isInstance(value) {
        return value instanceof AgalList;
      },
    });
    const Lista_de = AgalFunction.from((stack, _name, _este, ...args) => {
      const list = new AgalList();
      args.forEach((arg, index) => list.set(stack, index.toString(), arg));
      return list;
    });
    Lista_de.set(defaultStack, 'nombre', AgalString.from('Lista.de'));
    Lista.set(defaultStack, 'de', Lista_de);
    return Lista;
  });
}
