// deno-lint-ignore-file require-await
import AgalClass from "magal/runtime/values/complex/Class.class.ts";
import AgalFunction from "magal/runtime/values/complex/Function.class.ts";
import Runtime, { defaultStack } from "magal/runtime/values/Runtime.class.ts";
import { AgalTypeError } from "magal/runtime/values/internal/Error.class.ts";
import { AgalString } from "magal/runtime/values/primitive/String.class.ts";
import parseComplex from "magal/runtime/values/complex/parse.ts";

export class AgalEvents extends Runtime{
  #events: Record<string, AgalFunction[]> = {};
  constructor(){
    super()
    this.setSync('en', AgalFunction.from(async (_name, _stack, _este, evento, funcion) => {
      if(!evento) return new AgalTypeError('Se esperaba un evento pero se recibió nada', _stack)
      if(!(evento instanceof AgalString)) return new AgalTypeError('El evento debe ser una cadena', _stack)
      if(!funcion) return new AgalTypeError('Se esperaba una función pero se recibió nada', _stack)
      if(!(funcion instanceof AgalFunction)) return new AgalTypeError('La función debe ser una función', _stack)
      if(!this.#events[evento.value]) this.#events[evento.value] = []
      this.#events[evento.value].push(funcion)
    }))
    this.setSync('emitir', AgalFunction.from(async (name, stack, este, evento, ...args) => {
      if(!evento) return new AgalTypeError('Se esperaba un evento pero se recibió nada', stack)
      if(!(evento instanceof AgalString)) return new AgalTypeError('El evento debe ser una cadena', stack)
      if(!this.#events[evento.value]) return
      for(let i = 0; i < this.#events[evento.value].length; i++){
        this.#events[evento.value][i].call(name, stack, este, ...args)
      }
    }))
  }
  emit(evento: string, ...args: unknown[]){
    if(!this.#events[evento]) return;
    const AgalArgs = parseComplex(defaultStack, args).iter()
    for(let i = 0; i < this.#events[evento].length; i++)
      this.#events[evento][i].call('emit', defaultStack, this, ...AgalArgs)
  }
  on(evento: string, funcion: AgalFunction){
    if(!this.#events[evento]) this.#events[evento] = []
    this.#events[evento].push(funcion)
  }
}
export default function Eventos(){
  return new AgalClass('Eventos', {
    __constructor__: {
      meta:[],
      value: AgalFunction.from(async () => new AgalEvents())
    }
  })
}