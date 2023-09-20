// deno-lint-ignore-file require-await
import Runtime from 'magal/runtime/values/Runtime.class.ts';
import AgalClass from 'magal/runtime/values/complex/Class.class.ts';
import AgalFunction from "magal/runtime/values/complex/Function.class.ts";
import AgalError,{ AgalTypeError,AgalReferenceError,AgalSyntaxError,AgalTokenizeError } from "magal/runtime/values/internal/Error.class.ts";
import { AgalString } from "magal/runtime/values/primitive/String.class.ts";

export default async function (
	setGlobal: (name: string, value: Runtime, constant?: boolean, keyword?: boolean) => void,
	_setKeyword: (name: string, value: Runtime) => void,
	setLocal: (name: string, value: Runtime) => void
) {
	const MyError = new AgalClass(
		'Error',
		{
			__constructor__: {
				meta: [],
				value: AgalFunction.from(async function (_name, stack, _este, mensaje) {
					if (!mensaje) return new AgalError('Error', `Error`, stack);
					if (mensaje instanceof AgalString) return new AgalError('Error', mensaje.value, stack);
					return new AgalTypeError(`Se esperaba una cadena`, stack).throw();
				}),
			},
		},
		undefined,
		AgalError
	);
	setGlobal('Error', MyError, true);

	const MyErrorTipo = new AgalClass(
		'ErrorTipo',
		{
			__constructor__: {
				meta: [],
				value: AgalFunction.from(async function (_name, stack, _este, mensaje) {
					if (!mensaje) return new AgalTypeError(`ErrorTipo`, stack);
					if (mensaje instanceof AgalString) return new AgalTypeError(mensaje.value, stack);
					return new AgalTypeError(`Se esperaba una cadena`, stack).throw();
				}),
			},
		},
		MyError,
		AgalTypeError
	);
	setLocal('ErrorTipo', MyErrorTipo);

	const MyErrorReferencia = new AgalClass(
		'ErrorReferencia',
		{
			__constructor__: {
				meta: [],
				value: AgalFunction.from(async function (_name, stack, _este, mensaje) {
					if (!mensaje) return new AgalReferenceError(`ErrorReferencia`, stack);
					if (mensaje instanceof AgalString) return new AgalReferenceError(mensaje.value, stack);
					return new AgalTypeError(`Se esperaba una cadena`, stack).throw();
				}),
			},
		},
		MyError,
		AgalReferenceError
	);
	setLocal('ErrorReferencia', MyErrorReferencia);

	const MyErrorSintaxis = new AgalClass(
		'ErrorSintaxis',
		{
			__constructor__: {
				meta: [],
				value: AgalFunction.from(async function (_name, stack, _este, mensaje) {
					if (!mensaje) return new AgalSyntaxError(`ErrorSintaxis`, stack);
					if (mensaje instanceof AgalString) return new AgalSyntaxError(mensaje.value, stack);
					return new AgalTypeError(`Se esperaba una cadena`, stack).throw();
				}),
			},
		},
		MyError,
		AgalSyntaxError
	);
	setLocal('ErrorSintaxis', MyErrorSintaxis);

	const MyErrorTokenizar = new AgalClass(
		'ErrorTokenizar',
		{
			__constructor__: {
				meta: [],
				value: AgalFunction.from(async function (_name, stack, _este, mensaje) {
					if (!mensaje) return new AgalTokenizeError(`ErrorTokenizar`, stack);
					if (mensaje instanceof AgalString) return new AgalTokenizeError(mensaje.value, stack);
					return new AgalTypeError(`Se esperaba una cadena`, stack).throw();
				}),
			},
		},
		MyError,
		AgalTokenizeError
	);
	setLocal('ErrorTokenizar', MyErrorTokenizar);
}
