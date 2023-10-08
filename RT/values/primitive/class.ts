import AgalRuntime from 'magal/RT/values/class.ts';
import { IStack } from 'magal/RT/stack.ts';
import { AgalTypeError } from 'magal/RT/values/complex/AgalError.ts';

export default abstract class AgalPrimitive extends AgalRuntime {
  abstract value: unknown;
  get(stack: IStack): AgalRuntime | null {
    return new AgalTypeError(
      stack,
      `No se puede obtener una propiedad de un valor primitivo.`
    ).throw();
  }
  set(stack: IStack, _key: string, _value: AgalRuntime): AgalRuntime {
    return new AgalTypeError(
      stack,
      `No se puede asignar una propiedad a un valor primitivo.`
    ).throw();
  }
  delete(): void { }
  has(): boolean {
    return false;
  }
  keys(): string[] {
    return [];
  }
  toString(): string {
    return `${this.value}`;
  }
}
