// deno-lint-ignore-file require-await
import Runtime, { defaultStack } from 'magal/runtime/values/Runtime.class.ts';
import AgalFunction from 'magal/runtime/values/complex/Function.class.ts';
import AgalObject from 'magal/runtime/values/complex/Object.class.ts';
import StringGetter from 'magal/runtime/values/primitive/String.class.ts';

const data: string[] = [];

function writeln(str: string) {
	console.log(str)
	data.push(str+'\n');
}

export default async function (
	setGlobal: (name: string, value: Runtime, constant?: boolean, keyword?: boolean) => void,
	_setKeyword: (name: string, value: Runtime) => void
) {
	const pintar = new AgalFunction(async (_name, _stack, _este, ...args) => {
		const data = [];
		for (const arg of args) data.push(await arg.aConsola());
		writeln(data.join(' '));
	});
	setGlobal('pintar', pintar)
	const limpiar = new AgalFunction(async () => {
		console.clear();
		data.length = 0;
	});
	setGlobal('limpiar', limpiar);
	setGlobal(
		'consola',
		AgalObject.from(
			{
				limpiar,
				pintar,
				leer() {
					return StringGetter(data.join(''));
				},
			},
			defaultStack
		)
	);
}
