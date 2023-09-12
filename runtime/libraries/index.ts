import register from "magal/runtime/libraries/register.ts";
export {AgalResponse} from "magal/runtime/libraries/http.ts";
export {AgalIntArray} from "magal/runtime/libraries/ListaEnteros.ts";
import http from "magal/runtime/libraries/http.ts";
import ListaEnteros from "magal/runtime/libraries/ListaEnteros.ts";
import permisos from 'magal/runtime/libraries/permisos.ts'
import sab from "magal/runtime/libraries/sab.ts";
import Eventos from "magal/runtime/libraries/Eventos.ts";
register.set('ListaEnteros', ListaEnteros);
register.set('permisos', permisos)
register.set('sab', sab);
register.set('http', http);
register.set('Eventos', Eventos);
export default register;