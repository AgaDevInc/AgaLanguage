// deno-lint-ignore-file require-await
import AgalClass from 'magal/RT/values/complex/AgalClass.ts';
import AgalFunction from 'magal/RT/values/complex/AgalFunction.ts';
import { AgalTypeError } from 'magal/RT/values/complex/AgalError.ts';
import AgalString from 'magal/RT/values/primitive/AgalString.ts';
import { defaultStack } from 'magal/RT/stack.ts';
import parse from 'magal/RT/values/parse.ts';
import AgalComplex from 'magal/RT/values/complex/class.ts';
import { Libraries } from 'magal/RT/libraries/register.ts';

export class AgalEvents extends AgalComplex {
  type = 'Objeto Eventos';
  #events: Record<string, AgalFunction[]> = {};
  constructor() {
    super();
    this.set(
      defaultStack,
      'en',
      AgalFunction.from(async (stack, _name, _este, evento, funcion) => {
        if (!evento)
          return new AgalTypeError(
            stack,
            'Se esperaba un evento pero se recibió nada'
          ).throw();
        if (!(evento instanceof AgalString))
          return new AgalTypeError(
            stack,
            'El evento debe ser una cadena'
          ).throw();
        if (!funcion)
          return new AgalTypeError(
            stack,
            'Se esperaba una función pero se recibió nada'
          ).throw();
        if (!(funcion instanceof AgalFunction))
          return new AgalTypeError(
            stack,
            'La función debe ser una función'
          ).throw();
        if (!this.#events[evento.value]) this.#events[evento.value] = [];
        this.#events[evento.value].push(funcion);
        return funcion;
      })
    );
    this.set(
      defaultStack,
      'emitir',
      AgalFunction.from(async (stack, name, este, evento, ...args) => {
        if (!evento)
          return new AgalTypeError(
            stack,
            'Se esperaba un evento pero se recibió nada'
          );
        if (!(evento instanceof AgalString))
          return new AgalTypeError(stack, 'El evento debe ser una cadena');
        if (!this.#events[evento.value]) return null;
        for (let i = 0; i < this.#events[evento.value].length; i++) {
          this.#events[evento.value][i].call(stack, name, este, ...args);
        }
        return null;
      })
    );
  }
  // deno-lint-ignore no-explicit-any
  emit(evento: string, ...args: any[]) {
    if (!this.#events[evento]) return;
    for (let i = 0; i < this.#events[evento].length; i++)
      this.#events[evento][i].call(
        defaultStack,
        'emit',
        this,
        ...args.map(parse)
      );
  }
  on(evento: string, funcion: AgalFunction) {
    if (!this.#events[evento]) this.#events[evento] = [];
    this.#events[evento].push(funcion);
  }
}
export default (register: Libraries) =>
  register.set('Eventos', function Eventos() {
    return new AgalClass('Eventos', {
      __constructor__: async () => new AgalEvents(),
      isInstance: value => value instanceof AgalEvents,
    });
  });
