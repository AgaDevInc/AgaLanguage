import type AgalRuntime from 'magal/RT/values/class.ts';
import AgalNull from 'magal/RT/values/primitive/AgalNull.ts';

type LikeRuntime = AgalRuntime | Promise<AgalRuntime>;

export class Libraries {
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
		return this._instances.get(name) || AgalNull.from(true);
	}
	has(name: string): boolean {
		return this._makers.has(name);
	}
}
export default new Libraries();
