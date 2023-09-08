type list<T> = T | T[];
type Flags = Record<string, list<string> | boolean>;
export type ApplicationListen = (command: string, flags: Flags, args: string[]) => void;
export interface ApplicationOption {
	alias?: string;
	description: string;
	default?: string | boolean;
}
export interface AplicationSubCommand {
	description: string;
	exec: ApplicationListen;
	options?: Record<string, ApplicationOption>;
}
export interface ApplicationCommand {
	description: string;
	exec: ApplicationListen;
	options?: Record<string, ApplicationOption>;
	subCommands: Record<string, AplicationSubCommand>;
}
export interface ApplicationRaw {
	default: ApplicationCommand;
	[command: string]: ApplicationCommand;
}

export default class Application {
	constructor(private raw: ApplicationRaw) {}
	run(args: string[]) {
		const [command, ...flags] = args;
		const commandListener = this.raw[command] || this.raw.default;
		if (!commandListener) throw new Error(`Command ${command} not found`);
		const argsList = [];
		const flagsList: Flags = {};
		while (flags.length > 0) {
			const flag = flags.shift()!;
			if (argsList.length > 0) {
				argsList.push(flag);
				continue;
			}
			if (flag.startsWith('--')) {
				const [name, value] = flag.replace('--', '').split('=');
				if (!value) flagsList[name] = true;
				else {
					const data = value.split(',');
					flagsList[name] = data.length > 1 ? data : data[0];
				}
			} else if (flag.startsWith('-')) {
				const [alias, value] = flag.replace('-', '').split('=');
				const obj = commandListener.options || {};
				const name = Object.keys(obj).find(k => obj[k].alias === alias) || alias;
				if (flagsList[name]) continue;
				if (value === undefined) flagsList[name] = true;
				else {
					const data = value.split(',');
					flagsList[name] = data.length > 1 ? data : data[0];
				}
			} else argsList.push(flag);
		}
		commandListener.exec(command, flagsList, argsList);
	}
}
