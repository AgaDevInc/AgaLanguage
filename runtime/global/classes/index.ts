import Errors from "magal/runtime/global/classes/Errors.ts";
import complex from "magal/runtime/global/classes/complex.ts";
import type Runtime from "magal/runtime/values/Runtime.class.ts";
import primitive from "magal/runtime/global/classes/primitive.ts";

export default async function (
	setGlobal: (
		name: string,
		value: Runtime,
		constant?: boolean,
		keyword?: boolean
	) => void,
	_setKeyword: (name: string, value: Runtime) => void,
	_setLocal: (name: string, value: Runtime) => void
) {
  await complex(setGlobal, _setKeyword);
  await primitive(setGlobal, _setKeyword);
	await Errors(setGlobal, _setKeyword, _setLocal);
}