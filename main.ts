import type { IStack } from 'magal/runtime/interpreter.ts';
import type Environment from 'magal/runtime/Environment.class.ts';
import Application, { ApplicationListen } from 'magal/Application.class.ts';
import * as agaLanguage from 'magal/index.ts';

const { AgalReferenceError, AgalError } = agaLanguage.runtime.values.internal;
const { defaultStack } = agaLanguage.runtime.values;
const { agal, getModuleScope, evalLine } = agaLanguage.runtime;

const version = '1.0.0';
const name = 'Agal';

function existFile(path: string): boolean {
	try {
		return Deno.openSync(path).statSync().isFile;
	} catch (_e) {
		return false;
	}
}

type COMMANDS = 'ayuda' | 'ejecutar';
type Command = { description: string; fn: ApplicationListen; flags?: Record<string, option> };
const commands: Record<COMMANDS, Command & { ayuda?: Command }> = {
	ayuda: {
		description: 'Muestra la ayuda de los comandos',
		fn(_command, flags, args) {
			if (args[0]) {
				const command = commands[args[0] as COMMANDS];
				if (!command) return console.log(`El comando '${args[0]}' no existe`);
				if (command.ayuda) return command.ayuda.fn(args[0], flags, args.slice(1));
				return console.log(`El comando '${args[0]}' no tiene ayuda`);
			}
			console.log('Uso: agal [COMANDO] [OPCIONES]');
			console.log('Comandos:');
			const commandsKeys = Object.keys(commands);
			let maxCommand = 0;
			for (const command of commandsKeys)
				if (command.length > maxCommand) maxCommand = command.length;
			for (const command of commandsKeys) {
				const { description } = commands[command as COMMANDS];
				console.log(`  ${command.padEnd(maxCommand)}  ${description}`);
			}
			console.log('Opciones:');
			const optionsKeys = Object.keys(options) as (keyof typeof options)[];
			let maxOption = 0;
			for (const option of optionsKeys) {
				const { alias } = options[option];
				let fullOption = `--${option}`;
				if (alias) fullOption += `, -${alias}`;
				if (fullOption.length > maxOption) maxOption = fullOption.length;
			}
			for (const option of optionsKeys) {
				const { alias, description } = options[option];
				let fullOption = `--${option}`;
				if (alias) fullOption += `, -${alias}`;
				console.log(`  ${fullOption.padEnd(maxOption)}  ${description}`);
			}
		},
	},
	ejecutar: {
		description: 'Ejecuta un archivo de Agal',
		async fn(command, flags, args) {
			if (flags['ayuda']) return commands.ejecutar.ayuda!.fn(command, flags, args);
			if (!args.length) return console.log('No se especifico ningun archivo');
			const relativeFile = args.join(' ').trim();
			const file = relativeFile.includes(':') // is absolute path
				? relativeFile // Absolute path
				: `${JSRuntime.cwd()}\\${relativeFile}`;

			if (!existFile(file)) {
				const error = new AgalReferenceError(
					`No se encontro el archivo '${file}'`,
					defaultStack
				).throw();
				console.error(await error.aConsola());
				return;
			}
			const code = await JSRuntime.readFile(file);

			const data = await agal(code, file);

			if (data instanceof AgalError) {
				console.error(await data.aConsola());
				return;
			}
		},
		flags: {
			ayuda: {
				alias: 'a',
				description: 'Muestra la ayuda de ejecutar',
			},
			permitir: {
				alias: 'P',
				description: 'Permite el uso de funciones inseguras (No implementado)',
			},
		},
		ayuda: {
			description: 'Muestra la ayuda de ejecutar',
			fn(_command, _flags, _args) {
				console.log('Uso: agal ejecutar [OPCIONES] [ARCHIVO]');
				console.log('Opciones:');
				const optionsKeys = Object.keys(
					commands.ejecutar.flags!
				) as (keyof typeof commands.ejecutar.flags)[];
				let maxOption = 0;
				for (const option of optionsKeys) {
					const { alias } = commands.ejecutar.flags![option];
					let fullOption = `--${option}`;
					if (alias) fullOption += `, -${alias}`;
					if (fullOption.length > maxOption) maxOption = fullOption.length;
				}
				for (const option of optionsKeys) {
					const { alias, description } = commands.ejecutar.flags![option];
					let fullOption = `--${option}`;
					if (alias) fullOption += `, -${alias}`;
					console.log(`  ${fullOption.padEnd(maxOption)}  ${description}`);
				}
			},
		},
	},
};
type option = { alias?: string; description: string };
const options: Record<string, option> = {
	ayuda: {
		alias: 'a',
		description: 'Muestra la ayuda de los comandos',
	},
	version: {
		alias: 'v',
		description: 'Muestra la version de Agal',
	},
};

const app = new Application(
	async (command, flags, args) => {
		if (command === 'ayuda' || flags['ayuda']) return commands.ayuda.fn(command, flags, args);
		if (flags['version']) return console.log(`${name} v${version}`);
		if (command)
			return console.log(
				`El comando '${command}' no existe, usa 'agal ayuda' para ver los comandos disponibles`
			);

		const { default: InputLoop } = await import('https://deno.land/x/input@2.0.3/index.ts');
		const input = new InputLoop();
		console.log(`Bienvenido a ${name} v${version}`);
		console.log('Para salir usa ctrl+c o salir()');
		let numberLine = 0;
		let env: Environment = await getModuleScope('<agal>');
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
	},
	{ a: 'ayuda', v: 'version' }
);
for (const command in commands) app.on(command, commands[command as COMMANDS].fn);
app.run(Deno.args);
