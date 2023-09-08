import register from "magal/runtime/libraries/register.ts";
export {AgalIntArray} from "magal/runtime/libraries/ListaEnteros.ts";
import ListaEnteros from "magal/runtime/libraries/ListaEnteros.ts";
import permisos from 'magal/runtime/libraries/permisos.ts'
import sab from "magal/runtime/libraries/sab.ts";
register.set('ListaEnteros', ListaEnteros);
register.set('permisos', permisos)
register.set('sab', sab);
export default register;