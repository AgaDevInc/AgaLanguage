import type Runtime from "../../values/Runtime.class.ts";
import Errors from "./Errors.ts";
import complex from "./complex.ts";
import primitive from "./primitive.ts";

export default async function (
	setGlobal: (
		name: string,
		value: Runtime,
		constant?: boolean,
		keyword?: boolean
	) => void,
	_setKeyword: (name: string, value: Runtime) => void
) {
  await complex(setGlobal, _setKeyword);
  await primitive(setGlobal, _setKeyword);
	await Errors(setGlobal, _setKeyword);
}