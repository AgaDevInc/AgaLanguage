const { agal } = await import('./runtime/eval.ts');
const { defaultStack } = await import('./runtime/values/Runtime.class.ts');
const { AgalReferenceError, default: AgalError } = await import(
	'./runtime/values/internal/Error.class.ts'
);

function existFile(path: string): boolean {
	try {
		return Deno.openSync(path).statSync().isFile;
	} catch (_e) {
		return false;
	}
}

const file = `${Deno.cwd()}\\${Deno.args.join(' ')}`.trim();
if (!existFile(file)) {
	const error = new AgalReferenceError(
		`No se encontro el archivo '${file}'`,
		defaultStack
	).throw();
	console.error(await error.aConsola());
	Deno.exit(1);
}
const code = Deno.readTextFileSync(file);

const data = await agal(code, file);

if (data instanceof AgalError) {
	console.error(await data.aConsola());
	Deno.exit(1);
}
