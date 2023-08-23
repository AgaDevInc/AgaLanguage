// deno-lint-ignore-file require-await
import type Runtime from '../Runtime.class.ts';
export default class Properties {
	#data: Record<string, Runtime> = {};
	#father?: Properties;
	data: Record<string, Runtime>;
	father?: Properties;
	constructor(father?: Properties) {
		this.#father = father;
		this.data = this.#data;
		this.father = this.#father;
	}
	async get(name: string): Promise<Runtime | null> {
		let data = null;
		if (!data && this.#data[name] && this.#data[name] instanceof (await import('../Runtime.class.ts')).default) data = this.#data[name];
		if (!data && this.#father) data = this.#father.get(name);

		return data || null;
	}
	async set(name: string, value: Runtime): Promise<Runtime> {
		this.#data[name] = value;
		return value;
	}
	has(name: string): boolean {
		return Boolean(this.#data[name]);
	}
	keys(): string[] {
		return Object.keys(this.#data);
	}
	private static root: Properties;
	static getRoot(): Properties {
		if (!Properties.root) Properties.root = new Properties();
		return Properties.root;
	}
}
