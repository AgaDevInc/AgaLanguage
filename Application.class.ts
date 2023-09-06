type value = string | boolean;
type list<T> = T | T[];
type Flags = Record<string, list<value>>;
export type ApplicationListen = (command: string, flags: Flags, args: string[]) => void;

export default class Application {
	#events: Record<string, ApplicationListen> = {};
	constructor(
		defaultApplicationListen: ApplicationListen,
		private alias: Record<string, string> = {}
	) {
		this.on('default', defaultApplicationListen);
	}
	on(command: string, listener: ApplicationListen): void {
		this.#events[command] = listener;
	}
	run(args: string[]) {
		let [command, ...flags] = args;
		if (!command) return this.#events['default'](command, {}, args);
    if(command.startsWith('-')) {
      flags.unshift(command);
      command = '';
    }
    flags = flags.filter(Boolean);
		const argsList = [];
		const flagsList: Flags = {};
		while (flags.length > 0) {
			const flag = flags.shift()!;
			if(argsList.length > 0){ argsList.push(flag);continue; }
			if (flag.startsWith('--')) {
				const [name, value] = flag.replace('--', '').split('=');
				if (!value) flagsList[name] = true;
				else {
					const data = value.split(',');
					flagsList[name] = data.length > 1 ? data : data[0];
				}
			} else if (flag.startsWith('-')) {
				const [alias, value] = flag.replace('-', '').split('=');
				const name = this.alias[alias];
				if (flagsList[name]) continue;
				if (!value) flagsList[name] = true;
				else {
					const data = value.split(',');
					flagsList[name] = data.length > 1 ? data : data[0];
				}
			} else argsList.push(flag);
		}
    const commandListener = this.#events[command] || this.#events['default'];
		commandListener(command, flagsList, argsList);
	}
}
