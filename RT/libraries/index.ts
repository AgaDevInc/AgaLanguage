import register from "magal/RT/libraries/register.ts";
export {AgalResponse, AgalRequest} from "magal/RT/libraries/http.ts";
export {AgalIntArray} from "magal/RT/libraries/ListaEnteros.ts";
export {AgalWebSocket} from "magal/RT/libraries/ws.ts";
import http from "magal/RT/libraries/http.ts";
import ListaEnteros from "magal/RT/libraries/ListaEnteros.ts";
import permisos from 'magal/RT/libraries/permisos.ts'
import sab from "magal/RT/libraries/sab.ts";
import Eventos from "magal/RT/libraries/Eventos.ts";
import proceso from "magal/RT/libraries/proceso.ts";
import consola from "magal/RT/libraries/consola.ts";
import clases from "magal/RT/libraries/clases/index.ts";
import ws from "magal/RT/libraries/ws.ts"

http(register);
ListaEnteros(register);
permisos(register);
sab(register);
Eventos(register);
proceso(register);
consola(register);
clases(register);
ws(register);

export default register;