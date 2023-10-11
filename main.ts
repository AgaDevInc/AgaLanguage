import InputLoop from 'https://deno.land/x/input@2.0.3/index.ts';
import Application, { type ApplicationRaw } from 'magal/Application.class.ts';
import * as agaLanguage from 'magal/index.js';

const { AgalReferenceError, AgalError } = agaLanguage.runtime.values.complex;
const { defaultStack } = agaLanguage.runtime.stack;
const { agal, getModuleScope, evalLine } = agaLanguage.runtime;
const {AgalRuntimeToConsole} = agaLanguage.runtime.utils

const name = 'Agal';

function existFile(path: string): boolean {
	try {
		return Deno.openSync(path).statSync().isFile;
	} catch (_e) {
		return false;
	}
}

function activePermission(permission: string, data: boolean | string | string[]) {
	if (data === true) Agal.Permissions.active(permission as 'TODO', Agal.Permissions.all);
	else if (typeof data === 'string') Agal.Permissions.active(permission as 'TODO', data as unknown as typeof Agal.Permissions.all);
	else if (Array.isArray(data)) for (const d of data) activePermission(permission, d);
}
type COMMANDS = 'ayuda' | 'ejecutar';
const rawApp: ApplicationRaw = {
	default: {
		async exec(command, flags, args) {
			if (command === 'ayuda' || flags['ayuda']) return rawApp.ayuda.exec(command, flags, args);
			if (flags['version']) return console.log(`${name} v${Agal.versions.agal}\nDeno v${Agal.versions.deno}`);
			if (command)
				return console.log(
					`El comando '${command}' no existe, usa 'agal ayuda' para ver los comandos disponibles`
				);

			const input = new InputLoop();
			console.log(`Bienvenido a ${name} v${Agal.versions.agal}`);
			console.log('Para salir usa ctrl+c o salir()');
			let numberLine = 0;
			let env = getModuleScope('<agal>');
			let stack = defaultStack;
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
		description: 'Ejecuta Agal',
		subCommands: {},
		options: {
			ayuda: {
				alias: 'a',
				description: 'Muestra la ayuda de los comandos',
			},
			version: {
				alias: 'v',
				description: 'Muestra la version de Agal',
			},
		}
	},
	ayuda: {
		description: 'Muestra la ayuda de los comandos',
		exec(_command, flags, args) {
			if (args[0]) {
				const command = rawApp[args[0] as COMMANDS];
				if (!command) return console.log(`El comando '${args[0]}' no existe`);
				if (command.subCommands) return command.subCommands.ayuda?.exec(args[0], flags, args.slice(1));
				return console.log(`El comando '${args[0]}' no tiene ayuda`);
			}
			console.log('Uso: agal [COMANDO] [OPCIONES]');
			console.log('Comandos:');
			const commandsKeys = Object.keys(rawApp).filter(v=>v!=='default');
			let maxCommand = 0;
			for (const command of commandsKeys)
				if (command.length > maxCommand) maxCommand = command.length;
			for (const command of commandsKeys) {
				const { description } = rawApp[command as COMMANDS];
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
		subCommands: {}
	},
	ejecutar: {
		description: 'Ejecuta un archivo de Agal',
		async exec(command, flags, args) {
			if (flags['ayuda']) return rawApp.ejecutar.subCommands.ayuda!.exec(command, flags, args);
			if (!args.length) return console.log('No se especifico ningun archivo');
			const relativeFile = args.join(' ').trim();
			const file = relativeFile.includes(':') // is absolute path
				? relativeFile // Absolute path
				: `${Deno.cwd()}\\${relativeFile}`;
			if (flags['permitir-todo']) activePermission('TODO', flags['permitir-todo']);
			if (flags['permitir-leer']) activePermission('LEER', flags['permitir-leer']);

			if (!existFile(file)) {
				const error = new AgalReferenceError(
					defaultStack,
					`No se encontro el archivo '${file}'`,
				).throw();
				console.error((await AgalRuntimeToConsole(defaultStack, error)).value??'nulo');
				return;
			}
			const code = await Deno.readTextFile(file);
			Agal.args = args.join(' ');

			const data = await agal(code, file);

			if (data instanceof AgalError) {
				console.error((await AgalRuntimeToConsole(defaultStack, data)).value??'nulo');
				return;
			}
		},
		options: {
			ayuda: {
				alias: 'a',
				description: 'Muestra la ayuda de ejecutar',
			},
			'permitir-todo': {
				alias: 'P',
				description: 'Permite el uso de funciones no seguras (No implementado)',
			},
			'permitir-leer': {
				description: 'Permite el uso de funciones de lectura',
			},
		},
		subCommands: {
			ayuda: {
				description: 'Muestra la ayuda de ejecutar',
				exec(_command, _flags, _args) {
					console.log('Uso: agal ejecutar [OPCIONES] [ARCHIVO]');
					console.log('Opciones:');
					const optionsKeys = Object.keys(
						rawApp.ejecutar.options!
					) as (keyof typeof rawApp.ejecutar.options)[];
					let maxOption = 0;
					for (const option of optionsKeys) {
						const { alias } = rawApp.ejecutar.options![option];
						let fullOption = `--${option}`;
						if (alias) fullOption += `, -${alias}`;
						if (fullOption.length > maxOption) maxOption = fullOption.length;
					}
					for (const option of optionsKeys) {
						const { alias, description } = rawApp.ejecutar.options![option];
						let fullOption = `--${option}`;
						if (alias) fullOption += `, -${alias}`;
						console.log(`  ${fullOption.padEnd(maxOption)}  ${description}`);
					}
				},
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

const app = new Application(rawApp);
app.run(Deno.args);
