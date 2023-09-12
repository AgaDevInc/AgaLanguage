import type Runtime from 'magal/runtime/values/Runtime.class.ts';
import AgalNullValue from 'magal/runtime/values/primitive/Null.class.ts';

type LikeRuntime = Runtime | Promise<Runtime>;

class Libraries {
	private _makers: Map<string, () => LikeRuntime> = new Map();
	private _instances: Map<string, LikeRuntime> = new Map();
	set(name: string, value: () => LikeRuntime) {
		this._makers.set(name, value);
	}
	get(name: string): LikeRuntime {
		if (!this._instances.has(name) && this._makers.has(name)) {
			const data = this._makers.get(name)!();
			this._instances.set(name, data);
			Promise.resolve(data).then((data) => this._instances.set(name, data))
		}
		return this._instances.get(name) || AgalNullValue;
	}
	has(name: string): boolean {
		return this._makers.has(name);
	}
}
export default new Libraries();
