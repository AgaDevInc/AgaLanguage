import AgalComplex from "magal/RT/values/complex/class.ts";
import type { IStack } from "magal/RT/stack.ts";
import AgalString from "magal/RT/values/primitive/AgalString.ts";

export default class AgalError extends AgalComplex{
  throwned = false;
  type: string
  constructor(
    public stack: IStack,
    public message: string,
    public name: string = 'Error'
  ) {
    super();
    this.type = `${name}: ${message}`
    this.set(stack, 'mensaje', AgalString.from(message));
    this.set(stack, 'nombre', AgalString.from(name));
  }
  throw() {
    this.throwned = true;
    return this;
  }
  catch() {
    this.throwned = false;
    return this;
  }
  toString() {
    return `${this.name}: ${this.message}`;
  }
}
export class AgalTypeError extends AgalError{
  constructor(stack: IStack, message: string) {
    super(stack, message, 'ErrorTipo');
  }
}
export class AgalReferenceError extends AgalError{
  constructor(stack: IStack, message: string) {
    super(stack, message, 'ErrorReferencia');
  }
}
export class AgalTokenizeError extends AgalError{
  constructor(stack: IStack, message: string) {
    super(stack, message, 'ErrorTokenizar');
  }
}
export class AgalSyntaxError extends AgalError{
  constructor(stack: IStack, message: string) {
    super(stack, message, 'ErrorSintaxis');
  }
}
export class AgalUncatched extends AgalError{
  constructor(stack: IStack, message: string) {
    super(stack, message, 'SinCapturar');
  }
}
