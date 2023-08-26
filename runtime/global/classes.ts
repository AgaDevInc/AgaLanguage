import { ClassPropertyExtra } from "../../frontend/ast.ts";
import Runtime, { defaultStack } from '../values/Runtime.class.ts';
import AgalClass from '../values/complex/Class.class.ts';
import AgalFunction from '../values/complex/Function.class.ts';
import parseRuntime from '../values/parse.ts';

export default function (
	setGlobal: (
		name: string,
		value: Runtime,
		constant?: boolean,
		keyword?: boolean
	) => void,
	_setKeyword: (name: string, value: Runtime) => void
) {
	const Objeto = new AgalClass('Objeto', {
		llaves: {
			meta: [ClassPropertyExtra.Static],
			value: AgalFunction.from(async function (_name, _stack, _este, obj) {
				const keys = await obj.keys();
				return parseRuntime(defaultStack, keys);
			}).setName('Objeto.llaves', defaultStack),
		}
	});
	setGlobal('Objeto', Objeto, true);
}
