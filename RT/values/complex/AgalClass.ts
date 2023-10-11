import AgalComplex from 'magal/RT/values/complex/class.ts';
import { ClassDeclaration, ClassPropertyExtra } from 'magal/frontend/ast.ts';
import AgalRuntime from 'magal/RT/values/class.ts';
import Enviroment from 'magal/RT/Enviroment.ts';
import { IStack, defaultStack } from 'magal/RT/stack.ts';
import interpreter from 'magal/RT/interpreter.ts';
import AgalString from 'magal/RT/values/primitive/AgalString.ts';
import AgalError, {
  AgalReferenceError,
} from 'magal/RT/values/complex/AgalError.ts';

interface NativeAgalClassConfig {
  __constructor__(
    stack: IStack,
    name: string,
    self: AgalRuntime,
    ...args: AgalRuntime[]
  ): Promise<AgalRuntime> | AgalRuntime;
  isInstance(value: AgalRuntime): boolean;
  parent?: AgalClass;
}
interface StmtAgalClassConfig {
  stmt: ClassDeclaration;
  env: Enviroment;
}

function isNativeConfig(
  config: NativeAgalClassConfig | StmtAgalClassConfig
): config is NativeAgalClassConfig {
  return (
    '__constructor__' in config &&
    typeof config.__constructor__ === 'function' &&
    'isInstance' in config &&
    typeof config.isInstance === 'function'
  );
}

interface ValidMap<K, V> {
  get(key: K): V | undefined;
}

export class AgalInstance extends AgalComplex {
  type = 'Objeto';
  loaded = false;
  constructor(private props: ValidMap<string, AgalRuntime>) {
    super();
  }
  _set(stack: IStack, key: string, value: AgalRuntime) {
    return super.set(stack, key, value);
  }
  set(stack: IStack, key: string, value: AgalRuntime) {
    if (!this.loaded)
      return new AgalReferenceError(
        stack,
        'No se puede modificar un objeto antes de que se cargue'
      ).throw();
    return this._set(stack, key, value);
  }
  get(stack: IStack, key: string): AgalRuntime | null {
    return super.get(stack, key) || this.props.get(key) || null;
  }
  static async from(
    stack: IStack,
    props: ValidMap<string, AgalRuntime>,
    args: AgalRuntime[],
    parent?: AgalClass
  ): Promise<AgalInstance> {
    const result = new AgalInstance(props);
    if (!parent) result.loaded = true;
    const clase = props.get('__constructor__');
    if (clase === parent) result.loaded = true;
    else {
      const constructor = clase?.get(stack, '__constructor__');
      await constructor?.call(stack, '__constructor__', result, ...args);
    }
    result.type = `Objeto ${
      clase?.get(stack, 'nombre')?.toString() ?? '<anonimo>'
    }`;
    return result;
  }
}
export default class AgalClass extends AgalComplex {
  #native?: NativeAgalClassConfig;
  #stmt?: StmtAgalClassConfig;
  #isLoaded = false;
  #props: Map<string, AgalRuntime> = new Map();
  parent?: AgalClass;
  constructor(
    public name: string,
    config: NativeAgalClassConfig | StmtAgalClassConfig
  ) {
    super();
    if (isNativeConfig(config)) {
      this.#native = config;
      this.parent = config.parent;
    } else {
      this.#stmt = config;
    }
  }
  get type(): string {
    if (this.parent) return `Clase ${this.name} extiende ${this.parent.name}`;
    return `Clase ${this.get(defaultStack, 'nombre')?.toString() ?? this.name}`;
  }
  private async load(stack: IStack): Promise<AgalRuntime | null> {
    if (this.#isLoaded) return null;
    if (this.#native) this.set(stack, 'nombre', AgalString.from(this.name));
    if (!this.#stmt) return null;
    const { stmt, env } = this.#stmt;
    const envClass = env.createChild();
    this.set(stack, 'nombre', AgalString.from(stmt.identifier || this.name));
    if (stmt.extend) {
      const parent = envClass.get(stmt.extend, stack, stmt);
      if (parent instanceof AgalError) return parent;
      if (!(parent instanceof AgalClass))
        return new AgalReferenceError(stack, 'Solo se pueden extender clases');
      envClass.set('super', stack, parent, stmt);
      this.parent = parent;
    }
    for (const prop of stmt.body) {
      if (!prop) continue;
      const name = prop.identifier;
      if (!name) continue;
      if (!prop.value) continue;
      const value = await interpreter(prop.value, envClass, stack);
      if (name === '__constructor__') {
        if (this.has(stack, name))
          return new AgalReferenceError(
            stack,
            'No se pueden declarar dos propiedades con el mismo nombre'
          );
        this.set(stack, name, value);
      }
      if (prop.extra === ClassPropertyExtra.Static) {
        if (this.has(stack, name))
          return new AgalReferenceError(
            stack,
            'No se pueden declarar dos propiedades estaticas con el mismo nombre'
          );
        this.set(stack, name, value);
      } else {
        if (this.#props.has(name))
          return new AgalReferenceError(
            stack,
            'No se pueden declarar dos propiedades con el mismo nombre'
          );
        this.#props.set(name, value);
      }
    }
    this.#props.set('__constructor__', this);

    this.#isLoaded = true;
    return null;
  }
  async call(
    stack: IStack,
    name: string,
    self: AgalRuntime,
    ...args: AgalRuntime[]
  ): Promise<AgalRuntime | null> {
    if (this.#native) {
      return await this.#native.__constructor__(stack, name, self, ...args);
    }
    if (this.#stmt) {
      await this.load(stack);
      return AgalInstance.from(stack, this.#props, args, this.parent);
    }
    return null;
  }
  isInstance(value: AgalRuntime): boolean {
    if (this.#native && this.#native.isInstance(value)) return true;
    const __constructor__ = value.get(
      defaultStack,
      '__constructor__'
    )! as AgalClass;
    if (!__constructor__) return false;
    if (__constructor__ === this) return true;
    if (__constructor__.parent === this) return true;
    return false;
  }
}
