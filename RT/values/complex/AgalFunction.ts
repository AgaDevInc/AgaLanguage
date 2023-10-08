import AgalComplex from 'magal/RT/values/complex/class.ts';
import { defaultStack, type IStack } from 'magal/RT/stack.ts';
import AgalRuntime from 'magal/RT/values/class.ts';
import type { FunctionDeclaration } from 'magal/frontend/ast.ts';
import AgalString from 'magal/RT/values/primitive/AgalString.ts';
import Enviroment from 'magal/RT/Enviroment.ts';
import AgalNull from 'magal/RT/values/primitive/AgalNull.ts';
import interpreter from 'magal/RT/interpreter.ts';

export type NativeAgalFunctionConfig = (
  stack: IStack,
  name: string,
  self: AgalRuntime,
  ...args: AgalRuntime[]
) => AgalRuntime | null | Promise<AgalRuntime | null>;
export type StmtAgalFunctionConfig = {
  stmt: FunctionDeclaration;
  env: Enviroment;
};

export default class AgalFunction extends AgalComplex {
  stmt?: StmtAgalFunctionConfig;
  #native?: NativeAgalFunctionConfig;
  constructor(
    stack: IStack,
    name: string,
    config: NativeAgalFunctionConfig | StmtAgalFunctionConfig
  ) {
    super();
    if (typeof config === 'function') {
      this.#native = config;
    } else {
      this.stmt = config;
    }
    this.set(stack, 'nombre', AgalString.from(name));
  }
  set type(value: string) { }
  get type(): string {
    return `Función ${this.get(defaultStack, 'nombre')?.toString() ?? '<anonima>'}`;
  }
  async call(
    stack: IStack,
    name: string,
    self: AgalRuntime,
    ...args: AgalRuntime[]
  ): Promise<AgalRuntime | null> {
    if (this.#native) {
      return await this.#native(stack, name, self, ...args);
    }
    if (this.stmt) {
      const { env, stmt } = this.stmt;
      if(stmt.body.length === 0) return null;
      const newEnv = env.createChild();
      newEnv.set('este', stack, self, stmt);
      for (let i = 0; i < stmt.params.length; i++) {
        const param = stmt.params[i];
        if (typeof param === 'string') {
          newEnv.set(param, stack, args.shift() ?? AgalNull.from(), stmt);
        } else {
          newEnv.set(
            param.identifier,
            stack,
            args.shift() ?? AgalNull.from(),
            stmt
          );
        }
      }
      
      const result = await interpreter(stmt.body, newEnv, stack);
      if(result !== AgalNull.from(true)) return result;
    }
    return null;
  }
  static from(
    config: NativeAgalFunctionConfig
  ): AgalFunction {
    return new AgalFunction(defaultStack, config.name || '<anonima>', config);
  }
}
