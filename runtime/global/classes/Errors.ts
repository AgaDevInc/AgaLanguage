// deno-lint-ignore-file require-await
import Runtime from "../../values/Runtime.class.ts";
import AgalClass from "../../values/complex/Class.class.ts";

export default async function (
	setGlobal: (
		name: string,
		value: Runtime,
		constant?: boolean,
		keyword?: boolean
	) => void,
	_setKeyword: (name: string, value: Runtime) => void){
	const {default:AgalError, AgalTypeError, AgalReferenceError, AgalSyntaxError,AgalTokenizeError} = (await import("../../values/internal/Error.class.ts"));
	const AgalFunction = (await import("../../values/complex/Function.class.ts")).default;
	const AgalString = (await import("../../values/primitive/String.class.ts")).AgalString;
	const MyError = new AgalClass("Error", {
		constructor: {
			meta:[],
			value:AgalFunction.from(async function (_name, stack,_este,mensaje) {
			if(!mensaje) return new AgalError('Error',`Error`, stack);
			if(mensaje instanceof AgalString)	return new AgalError('Error',mensaje.value, stack);
			return new AgalTypeError(`Se esperaba una cadena`, stack).throw()
		})}
	}, undefined, AgalError);
	setGlobal('Error', MyError, true);

	const MyErrorTipo = new AgalClass("ErrorTipo", {
		constructor: {
			meta:[],
			value:AgalFunction.from(async function (_name, stack,_este,mensaje) {
			if(!mensaje) return new AgalTypeError(`ErrorTipo`, stack);
			if(mensaje instanceof AgalString)	return new AgalTypeError(mensaje.value, stack);
			return new AgalTypeError(`Se esperaba una cadena`, stack).throw()
		})}
	}, MyError, AgalTypeError);
	setGlobal('ErrorTipo', MyErrorTipo, true);

	const MyErrorReferencia = new AgalClass("ErrorReferencia", {
		constructor: {
			meta:[],
			value:AgalFunction.from(async function (_name, stack,_este,mensaje) {
			if(!mensaje) return new AgalReferenceError(`ErrorReferencia`, stack);
			if(mensaje instanceof AgalString)	return new AgalReferenceError(mensaje.value, stack);
			return new AgalTypeError(`Se esperaba una cadena`, stack).throw()
		})}
	}, MyError, AgalReferenceError);
	setGlobal('ErrorReferencia', MyErrorReferencia, true);

	const MyErrorSintaxis = new AgalClass("ErrorSintaxis", {
		constructor: {
			meta:[],
			value:AgalFunction.from(async function (_name, stack,_este,mensaje) {
			if(!mensaje) return new AgalSyntaxError(`ErrorSintaxis`, stack);
			if(mensaje instanceof AgalString)	return new AgalSyntaxError(mensaje.value, stack);
			return new AgalTypeError(`Se esperaba una cadena`, stack).throw()
		})}
	}, MyError, AgalSyntaxError);
	setGlobal('ErrorSintaxis', MyErrorSintaxis, true);

	const MyErrorTokenizar = new AgalClass("ErrorTokenizar", {
		constructor: {
			meta:[],
			value:AgalFunction.from(async function (_name, stack,_este,mensaje) {
			if(!mensaje) return new AgalTokenizeError(`ErrorTokenizar`, stack);
			if(mensaje instanceof AgalString)	return new AgalTokenizeError(mensaje.value, stack);
			return new AgalTypeError(`Se esperaba una cadena`, stack).throw()
		})}
	}, MyError, AgalTokenizeError);
	setGlobal('ErrorTokenizar', MyErrorTokenizar, true);}