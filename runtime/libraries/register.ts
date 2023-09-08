import type Runtime from 'magal/runtime/values/Runtime.class.ts';
import AgalNullValue from 'magal/runtime/values/primitive/Null.class.ts';

class Libraries {
	private _makers: Map<string, () => Runtime> = new Map();
	private _instances: Map<string, Runtime> = new Map();
	set(name: string, value: () => Runtime) {
		this._makers.set(name, value);
	}
	get(name: string): Runtime | Promise<Runtime> {
		if (!this._instances.has(name) && this._makers.has(name)) {
			this._instances.set(name, this._makers.get(name)!());
		}
		return this._instances.get(name) || AgalNullValue;
	}
	has(name: string): boolean {
		return this._makers.has(name);
	}
}
export default new Libraries();
