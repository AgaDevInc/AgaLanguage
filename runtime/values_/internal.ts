export interface IRuntimeValue {
	aCadena(): Promise<string>;
	aConsola(): Promise<string>;
	get(key: string): Promise<V>;
	set(key: string, value: NonNullable<V>): void;
	execute(args: V[], col: number, row: number, este?: IRuntimeValue): Promise<V>
	properties: Properties;
}
// deno-lint-ignore no-explicit-any
export type ExtendsRuntimeValue = IRuntimeValue & { [key: string]: any };
type V = ExtendsRuntimeValue | null;
type F = Properties | null;
interface IProperties {
	set(key: string, value: NonNullable<V>): this
	get(key: string): Promise<V>
	replace(key: string, value: NonNullable<V>): void
	has(key: string): boolean
}
export class Properties implements IProperties {
	#data:Map<string, V>;
	#father: F;
	// deno-lint-ignore no-explicit-any
	constructor(father: F, entries?: readonly (readonly [string, any])[]) {
		this.#data = new Map(entries);
		this.#father = father;
	}
	async get(key: string): Promise<V> {
		const value = this.#data.get(key);
		if (value) return (await import('./parse.ts')).parseRuntime(value);
		if (this.#father) return this.#father.get(key);
		return null;
	}
	set(key: string, value: NonNullable<V>): this {
		this.#data.set(key, value);
		return this;
	}
	has(key: string): boolean {
		return this.#data.has(key)
	}
	replace(key: string, value: NonNullable<V>): void {
		if (this.has(key)) this.set(key, value);
		else if (this.#father) this.#father.replace(key, value);
	}
}
