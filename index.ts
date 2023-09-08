import InputLoop from 'https://deno.land/x/input@2.0.3/index.ts';
const input = new InputLoop();
type PermissionNameFS = 'LEER' | 'CREAR' | 'BORRAR';
type PermissionName = 'TODO' | PermissionNameFS;
type PermissionData = string | typeof allPermissions;
type Permission = Record<PermissionData, boolean>;

const allPermissions = Symbol();

class PermissionManager {
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
declare global {
	const permisos: PermissionManager;
}
// deno-lint-ignore no-explicit-any
(globalThis as any).permisos = new PermissionManager();

export * as frontend from 'magal/frontend/index.ts';
export * as runtime from 'magal/runtime/index.ts';
