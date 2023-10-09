import { IStack } from "magal/RT/stack.ts";
import AgalRuntime from "magal/RT/values/class.ts";
import { AgalReferenceError } from "magal/RT/values/complex/AgalError.ts";

interface Position {
  col: number;
  row: number;
}

export default class Enviroment {
  private readonly parent?: Enviroment;
  private childrens: Enviroment[] = [];
  private variables = new Map<string, AgalRuntime>();
  private constants = new Set<string>();
  private keywords = new Set<string>();
  constructor(parent?: Enviroment) {
    this.parent = parent;
  }
  createChild(): Enviroment {
    const child = new Enviroment(this);
    this.childrens.push(child);
    return child;
  }
  deleteChild(child: Enviroment): boolean {
    const index = this.childrens.indexOf(child);
    if (index === -1) return false;
    this.childrens.splice(index, 1);
    return true;
  }
  private isKeyword(name: string): boolean {
    return Boolean(this.keywords.has(name) || this.parent?.isKeyword(name));
  }
  set(name: string, stack: IStack, value: AgalRuntime, data: Position & { constant?: boolean; keyword?: boolean }): AgalRuntime {
    if (!name) return new AgalReferenceError(stack, 'No se puede declarar una variable sin nombre').throw()
    if (this.isKeyword(name) && !data.keyword)
    return new AgalReferenceError(stack, `Variable '${name}' es una palabra reservada y no puede ser declarara`).throw()
  
    else if (this.variables.has(name))
    return new AgalReferenceError(stack, `Variable '${name}' ya ha sido declarada`).throw()
    if (data.constant) this.constants.add(name);
    if (data.keyword) this.keywords.add(name);
    this.variables.set(name, value);
    return value;
  }
  edit(name: string, stack: IStack, value: AgalRuntime, data: Position): AgalRuntime {
    const env = this.resolve(name, data);
    if (!env.variables.has(name)) 
    return new AgalReferenceError(stack, `Variable '${name}' no ha sido declarada`).throw()
    if (env.isKeyword(name)) 
    return new AgalReferenceError(stack, `Variable '${name}' es una palabra reservada y no puede ser modificada`).throw()
    else if (env.constants.has(name))
    return new AgalReferenceError(stack, `Variable '${name}' es una constante y no puede ser modificada`).throw()
    env.variables.set(name, value);
    return value;
  }
  get(name: string, stack: IStack, data: Position): AgalRuntime {
    const env = this.resolve(name, data);
    if (!env.variables.has(name)) return new AgalReferenceError(stack, `Variable '${name}' no ha sido declarada`).throw()
    return env.variables.get(name)!;
  }
  resolve(name: string, data: Position): Enviroment {
    if (this.variables.has(name)) return this;
    if (this.parent) return this.parent.resolve(name, data);
    return this;
  }
  clear(): void {
    this.variables.clear();
    this.constants.clear();
    this.keywords.clear();
  }
  toObject(): Record<string, AgalRuntime> {
    const obj = this.parent?.toObject() ?? {};
    for (const [key, value] of this.variables) {
      obj[key] = value;
    }
    return obj;
  }
}
