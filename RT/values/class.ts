import type { IStack } from 'magal/RT/stack.ts';
import { AgalTypeError } from "magal/RT/values/complex/AgalError.ts";

type value = AgalRuntime | null;
export default abstract class AgalRuntime {
  abstract get(stack: IStack, name: string): value;
  abstract set(stack: IStack, name: string, value: AgalRuntime): AgalRuntime;

  abstract delete(stack: IStack, name: string): void;
  abstract has(stack: IStack, name: string): boolean;
  abstract keys(): string[];
  async call(stack: IStack,name: string,_self: AgalRuntime,..._args: AgalRuntime[]): Promise<AgalRuntime|null> {
    return await new AgalTypeError(stack,`No se puede llamar a ${name}, no es una función.`).throw();
  }
  static free(data: AgalRuntime): void {
    const class_ = data.constructor as typeof AgalRuntime;
    if (class_.free === AgalRuntime.free) return;
    class_.free(data);
  }
}
