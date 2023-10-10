import InputLoop from 'https://deno.land/x/input@2.0.3/index.ts';
const input = new InputLoop();
type PermissionNameFS = 'LEER' | 'CREAR' | 'BORRAR';
type PermissionName = 'TODO' | PermissionNameFS | 'NET';
type PermissionData = string | typeof allPermissions;
type Permission = Record<PermissionData, boolean>;

const allPermissions = Symbol();

class PermissionManager implements Permissions {
	readonly all: typeof allPermissions = allPermissions;
	permissions = {} as Record<PermissionName, Permission>;
	isActive(permission: PermissionName, data: PermissionData) {
		if (this.permissions[permission]) {
			if (typeof this.permissions[permission][data] === 'boolean')
				return this.permissions[permission][data];
			if (typeof this.permissions[permission][this.all] === 'boolean')
				return this.permissions[permission][this.all];
		}
		if (this.permissions['TODO']) {
			if (typeof this.permissions['TODO'][data] === 'boolean')
				return this.permissions['TODO'][data];
			if (typeof this.permissions['TODO'][this.all] === 'boolean')
				return this.permissions['TODO'][this.all];
		}
		return null;
	}
	delete(permission: PermissionName, data: PermissionData = this.all) {
		if (this.permissions[permission]) {
			if (typeof this.permissions[permission][data] === 'boolean')
				delete this.permissions[permission][data];
		}
	}
	async get(permission: PermissionName, data: PermissionData = this.all) {
		const access = this.isActive(permission, data);
		if (typeof access === 'boolean') return access;
		console.log(
			`El programa quiere permisos para "${permission}" ${
				typeof data === 'string' ? `con "${data}"` : 'de forma general'
			}`
		);
		const answer = (
			await input.question(
				`  ¿Deseas permitirlo? [S/N/P] (S = si, N = No, P = Permitir todo) `,
				false
			)
		)
			.toUpperCase()
			.trim()[0];
		if (answer === 'S') {
			this.active(permission, data);
			return true;
		}
		if (answer === 'P') {
			this.active(permission);
			return true;
		}
		return false;
	}
	active(permission: PermissionName, data: PermissionData = this.all) {
		if (!this.permissions[permission]) this.permissions[permission] = {} as Permission;
		this.permissions[permission][data] = true;
	}
	unactive(permission: PermissionName, data: PermissionData = this.all) {
		if (!this.permissions[permission]) this.permissions[permission] = {} as Permission;
		this.permissions[permission][data] = false;
	}
}
interface Permissions {
	readonly all: typeof allPermissions;
	permissions: Record<PermissionName, Permission>;
	isActive(permission: PermissionName, data: PermissionData): boolean | null;
	get(permission: PermissionName, data?: PermissionData): Promise<boolean>;
	delete(permission: PermissionName, data?: PermissionData): void;
	active(permission: PermissionName, data?: PermissionData): void;
	unactive(permission: PermissionName, data?: PermissionData): void;
}

declare global {
	interface IAgal{
		Permissions: Permissions;
		versions: {
			agal: string;
			deno: string;
		};
		fetch: typeof fetch;
		args: string;
		console: {
			input: () => Promise<string>;
			output: (str: string) => void;
		}
	}
	namespace Deno {
		export const _WebSocket: typeof WebSocket;
	}
	const Agal: IAgal;
}
// deno-lint-ignore no-explicit-any
(globalThis as any).Agal = {
	Permissions: new PermissionManager(),
	versions: { agal: '0.1.0', deno: Deno.version.deno },
	fetch: (url: string, options?: RequestInit) =>{
		if(Deno.version.v8) return fetch(url, options);
		return new Promise((resolve) => {
			resolve(new Response(''));
		});
	},
	args: '',
	console: {
		input: async () => {
			return await input.question('');
		},
		output: (str: string) => {
			console.log(str);
		},
	},
};
(Deno as any)._WebSocket = WebSocket;
export * as frontend from 'magal/frontend/index.ts';
export * as runtime from 'magal/RT/index.ts';
