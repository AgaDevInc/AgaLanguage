import { colorize, FOREGROUND } from 'aga//colors_string/mod.ts';
import parseRuntime from 'magal/runtime/values/parse.ts';
import type { IStack } from 'magal/runtime/interpreter.ts';
import Properties from 'magal/runtime/values/internal/Properties.class.ts';
import Runtime, { defaultStack } from 'magal/runtime/values/Runtime.class.ts';

const props = new Properties(Runtime.loadProperties());
export default class AgalObject extends Runtime {
	static from(obj: Record<string, unknown>, stack: IStack) {
		const o = new AgalObject();
		Object.keys(obj).forEach(key => {
			o.set(key, stack, parseRuntime(defaultStack, obj[key]));
		});
		return o;
	}
	async _aConsola(): Promise<string> {
		let ref = false;
		let obj = '{';
		const keys = await this.keys();
		if (keys.length === 0) return obj + '}';
		obj += '\n';
		for (let key of keys) {
			if (key.match(/^[a-zA-Z$_][a-zA-Z0-9$_]*$/) === null) key = JSRuntime.inspect(key);
			const value = await this.get(key, defaultStack);
			if (value === this) ref = true;
			const valueStr =
				value === this ? colorize('<ref>', FOREGROUND.CYAN) : await value.aConsolaEn();
			obj += `  ${key}: ${valueStr},\n`;
		}
		obj += '}';
    if (ref) obj = colorize('<ref> ', FOREGROUND.CYAN) + obj;
		return obj;
	}
	_aConsolaEn(): Promise<string> {
		return Promise.resolve(colorize('[Objeto]', FOREGROUND.CYAN));
	}
	static loadProperties(): Properties {
		return props;
	}
	toConsole(): string {
		const keys = this.keysSync();
		if (keys.length === 0) return '{}';
		let obj = '{\n';
		for (let key of keys) {
			if (key.match(/^[a-zA-Z$_][a-zA-Z0-9$_]*$/) === null) key = JSRuntime.inspect(key);
			const value = this.getSync(key)!;
			const valueSTR = value === this ? '<ref>' : value instanceof AgalObject ? colorize('[Agal Objeto]', FOREGROUND.CYAN) : value.toConsole();
			obj += `  ${key}: ${valueSTR.split('\n').join('\n  ')},\n`;
		}
		return colorize('[Agal Objeto '+colorize(obj.slice(0,-2) + '\n}',FOREGROUND.WHITE)+']', FOREGROUND.CYAN);
	}
}
