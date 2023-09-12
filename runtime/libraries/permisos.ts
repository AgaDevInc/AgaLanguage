// deno-lint-ignore-file require-await
import AgalObject from 'magal/runtime/values/complex/Object.class.ts';
import AgalFunction from 'magal/runtime/values/complex/Function.class.ts';
import { AgalString } from 'magal/runtime/values/primitive/String.class.ts';
import { AgalTypeError } from 'magal/runtime/values/internal/Error.class.ts';

export default function Permisos() {
	const obj = new AgalObject();
	obj.setSync(
		'quitar',
		AgalFunction.from(async (_name, stack, _este, permiso, data) => {
			if (permiso instanceof AgalString) {
				if (!data) Agal.Permissions.delete(permiso.value as 'TODO');
				else if (data instanceof AgalString) Agal.Permissions.delete(permiso.value as 'TODO', data.value);
				else return new AgalTypeError('Se esperaba una cadena en el dato', stack).throw();
			} else return new AgalTypeError('Se esperaba una cadena en el permiso', stack).throw();
		})
	);
	obj.setSync(
		'pedir',
		AgalFunction.from(async (_name, stack, _este, permiso, data) => {
			if (permiso instanceof AgalString) {
				if (!data) await Agal.Permissions.get(permiso.value as 'TODO');
				else if (data instanceof AgalString) await Agal.Permissions.get(permiso.value as 'TODO', data.value);
				else return new AgalTypeError('Se esperaba una cadena en el dato', stack).throw();
			} else return new AgalTypeError('Se esperaba una cadena en el permiso', stack).throw();
		})
	);
	return obj;
}
