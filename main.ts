import Environment from './runtime/Environment.class.ts';
import { IStack } from './runtime/interpreter.ts';
import { agal, evalLine, getModuleScope } from './runtime/eval.ts';
import { defaultStack } from './runtime/values/Runtime.class.ts';
import AgalError, { AgalReferenceError } from './runtime/values/internal/Error.class.ts';
const version = '1.0.0';
const name = 'Agal';

function existFile(path: string): boolean {
	try {
		return Deno.openSync(path).statSync().isFile;
	} catch (_e) {
		return false;
	}
}

const relativeFile = Deno.args.join(' ').trim();
const file = relativeFile.includes(':') // is absolute path
	? relativeFile // Absolute path
	: `${Deno.cwd()}\\${relativeFile}`;

// REPL
if (!relativeFile) {
	const { default: InputLoop } = await import('https://deno.land/x/input@2.0.3/index.ts');
	const input = new InputLoop();
	console.log(`Bienvenido a ${name} v${version}`);
	console.log('Para salir usa ctrl+c o salir()');
	let numberLine = 0;
	let env: Environment = await getModuleScope(file);
	let stack: IStack = defaultStack;
	while (true) {
		const [runtime, scope, _stack] = await evalLine(
			(await input.question('>', false)).trim(),
			++numberLine,
			env!,
			stack!
		);
		console.log(await runtime.aConsola());
		env = scope;
		stack = _stack;
	}
}

if (!existFile(file)) {
	const error = new AgalReferenceError(`No se encontro el archivo '${file}'`, defaultStack).throw();
	console.error(await error.aConsola());
	Deno.exit();
}
const code = Deno.readTextFileSync(file);

const data = await agal(code, file);

if (data instanceof AgalError) {
	console.error(await data.aConsola());
	Deno.exit();
}
