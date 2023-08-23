// deno-lint-ignore-file no-explicit-any
import RuntimeValue from './Runtime.class.ts';
import { RuntimeArray, RuntimeFunction } from './complex.ts';
import { IRuntimeValue } from './internal.ts';
import { RuntimeBoolean, RuntimeNull, RuntimeNumber, RuntimeString } from "./primitive.ts";

export function parseRuntime<T extends IRuntimeValue>(data: T): T;
export function parseRuntime(data: Array<any>): RuntimeArray;
export function parseRuntime(data: (...args:RuntimeValue[])=>void): RuntimeFunction;
export function parseRuntime(data: number): RuntimeNumber;
export function parseRuntime(data: string): RuntimeString;
export function parseRuntime(data: boolean): RuntimeBoolean;
export function parseRuntime(data?: null | undefined): RuntimeNull;
export function parseRuntime(data: any) {
  const complex = parseRuntimeComplex(data);
  if (complex) return complex;
	return parseRuntimePrimitive(data as any);
}
export function parseRuntimeComplex<T extends IRuntimeValue>(data: T): T;
export function parseRuntimeComplex(data: Array<any>): RuntimeArray;
export function parseRuntimeComplex(data: (...args:RuntimeValue[])=>void): RuntimeFunction;
export function parseRuntimeComplex(data: unknown) {
  if (data instanceof RuntimeValue) return data;
  if (data instanceof Array) return new RuntimeArray(data);
  if (typeof data == 'function') return RuntimeFunction.native(data as () => void);
}

export function parseRuntimePrimitive(data: number): RuntimeNumber;
export function parseRuntimePrimitive(data: string): RuntimeString;
export function parseRuntimePrimitive(data: boolean): RuntimeBoolean;
export function parseRuntimePrimitive(data?: null | undefined): RuntimeNull;
export function parseRuntimePrimitive(data: any) {
  if (typeof data === 'number') return new RuntimeNumber(data);
  if (typeof data === 'string') return new RuntimeString(data);
  if (typeof data === 'boolean') return RuntimeBoolean.from(data);
  return RuntimeNull.getValue();
}