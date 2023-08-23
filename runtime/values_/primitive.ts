import { ComplexMath } from "../../util/imports.ts";
import RuntimeValue from "./Runtime.class.ts";

export default abstract class RuntimePrimitive extends RuntimeValue {
  public data: any
}

export class RuntimeString extends RuntimePrimitive {
  constructor(public data: string) {
    super();
  }
  aCadena(): Promise<string> {
    return Promise.resolve(this.data);
  }
  aConsola(): Promise<string> {
    return Promise.resolve(this.data);
  }
}
export class RuntimeNumber extends RuntimePrimitive {
  constructor(public data: ComplexMath['LikeNumber']) {
    super();
  }
  aCadena(): Promise<string> {
    return Promise.resolve(this.data.toString());
  }
  aConsola(): Promise<string> {
    return Promise.resolve(this.data.toString());
  }
}
export class RuntimeBoolean extends RuntimePrimitive {
  private static TRUE: RuntimeBoolean;
  private static FALSE: RuntimeBoolean;
  private static getTrue(): RuntimeBoolean {
    if (!RuntimeBoolean.TRUE) RuntimeBoolean.TRUE = new RuntimeBoolean(true);
    return RuntimeBoolean.TRUE;
  }
  private static getFalse(): RuntimeBoolean {
    if (!RuntimeBoolean.FALSE) RuntimeBoolean.FALSE = new RuntimeBoolean(false);
    return RuntimeBoolean.FALSE;
  }
  static from(data: boolean): RuntimeBoolean {
    return data ? RuntimeBoolean.getTrue() : RuntimeBoolean.getFalse();
  }
  private constructor(public data: boolean) {
    super();
  }
  aCadena(): Promise<string> {
    return Promise.resolve(this.data ? 'verdadero' : 'falso');
  }
  aConsola(): Promise<string> {
    return this.aCadena();
  }
}
export class RuntimeNull extends RuntimePrimitive {
  private static NULL: RuntimeNull;
  static getValue(): RuntimeNull {
    if (!RuntimeNull.NULL) RuntimeNull.NULL = new RuntimeNull();
    return RuntimeNull.NULL;
  }
  private constructor() {
    super();
  }
  aCadena(): Promise<string> {
    return Promise.resolve('nulo');
  }
  aConsola(): Promise<string> {
    return this.aCadena();
  }
}