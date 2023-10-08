import AgalPrimitive from "magal/RT/values/primitive/class.ts";

export default class AgalNull extends AgalPrimitive {
  value: unknown;
  private constructor() {
    super();
  }
  static getVoid(): AgalNull {
    if (AgalNull.void) return AgalNull.void;
    AgalNull.void = new AgalNull();
    return AgalNull.void;
  }
  static from(isVoid?:boolean): AgalNull {
    if (isVoid) return AgalNull.getVoid();
    if (AgalNull.instance) return AgalNull.instance;
    AgalNull.instance = new AgalNull();
    return AgalNull.instance;
  }
  private static instance: AgalNull|null = null;
  private static void: AgalNull|null = null;
  toString(): string {
    if(this === AgalNull.getVoid()) return 'vacio';
    return 'nulo';
  }
}