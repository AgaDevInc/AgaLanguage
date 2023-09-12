import  Runtime from 'magal/runtime/values/Runtime.class.ts';
export default class Properties {
	#data: Record<string, Runtime> = {};
	father?: Properties;
	v: Record<string, Runtime>;
	constructor(father?: Properties) {
		this.father = father;
		this.v = this.#data
	}
	get data(): Record<string, Runtime>{
		if(this.father) return {...this.father.data, ...this.#data};
		return this.#data;
	}
	is(ins: Properties): boolean{
		if(ins === this) return true;
		if(ins.father) return this.is(ins.father);
		return false;
	}
	get(name: string): Runtime | null {
		let data = null;
		if (!data && this.#data[name] && this.#data[name] instanceof Runtime) data = this.#data[name];
		if (!data && this.father) data = this.father.get(name);

		return data
	}
	set(name: string, value: Runtime): Runtime {
		this.#data[name] = value;
		return value;
	}
	has(name: string): boolean {
		return Boolean(this.data[name]);
	}
	deepKeys(): string[] {
		return Object.keys(this.data);
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
