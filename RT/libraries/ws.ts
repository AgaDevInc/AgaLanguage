import { Libraries } from 'magal/RT/libraries/register.ts';
import { AgalEvents } from 'magal/RT/libraries/Eventos.ts';
import { AgalIntArray } from 'magal/RT/libraries/ListaEnteros.ts';
import { defaultStack } from 'magal/RT/stack.ts';
import { AgalBoolean, AgalString } from 'magal/RT/values/primitive/index.ts';
import { AgalFunction } from 'magal/RT/values/complex/index.ts';
import AgalError, { AgalTypeError } from 'magal/RT/values/complex/AgalError.ts';
import AgalClass from 'magal/RT/values/complex/AgalClass.ts';


function getCodeFromTextError(text: string) {
  const match = text.match(/os error (\d+)/);
  if (match) return parseInt(match[1]);
  return 0;
}
function getMessageFromCode(code: number){
  switch(code){
    case 10061: return 'No se pudo establecer la conexión'
    case 10054: return 'Se ha cerrado la conexión'
    case 10060: return 'Tiempo de espera agotado'
    default: return 'Error desconocido'
  }
}
export class AgalWebSocket extends AgalEvents {
  type = 'Objeto WebSocket extiende Eventos';
  constructor() {
    super();
    this.set(defaultStack, 'ABIERTO', AgalBoolean.from(false));
    this.set(defaultStack, 'CERRADO', AgalBoolean.from(false));
    this.set(
      defaultStack,
      'conectar',
      AgalFunction.from((stack, _name, _self, URL) => {
        if (URL instanceof AgalString) this.connect(URL.value);
        else
          return new AgalTypeError(
            stack,
            'Se esperaba una cadena como URL de conexión'
          );
        return null;
      })
    );
  }
  connect(url: string) {
    try {
      const urlTest = new URL(url);
      if (urlTest.protocol !== 'ws:' && urlTest.protocol !== 'wss:')
        return new AgalTypeError(
          defaultStack,
          'Se esperaba una URL con protocolo ws o wss'
        );
    } catch (_e) {
      return new AgalTypeError(defaultStack, 'Se esperaba una URL válida');
    }
    const ws = new Deno._WebSocket(url);
    ws.onopen = () => {
      this.emit('abrir');
      this.set(defaultStack, 'ABIERTO', AgalBoolean.from(true));
    };
    ws.onclose = e => {
      this.emit('cerrar', e.code, e.reason);
      this.set(defaultStack, 'ABIERTO', AgalBoolean.from(false));
      this.set(defaultStack, 'CERRADO', AgalBoolean.from(true));
    };
    ws.onmessage = async e => {
      if (typeof e.data === 'string') this.emit('mensaje', e.data);
      if (e.data instanceof ArrayBuffer) {
        const buffer = new Uint8Array(e.data);
        this.emit('mensaje', AgalIntArray.from(buffer));
      }
      if (e.data instanceof Blob) {
        const buffer = new Uint8Array(await e.data.arrayBuffer());
        this.emit('mensaje', AgalIntArray.from(buffer));
      }
    };
    ws.onerror = e => {
      const code = getCodeFromTextError((e as ErrorEvent).message)
      const message = getMessageFromCode(code)
      this.emit('error', new AgalError(defaultStack, message));
    };
    this.set(
      defaultStack,
      'enviar',
      AgalFunction.from((stack, _name, _self, mensaje) => {
        if (mensaje instanceof AgalString) ws.send(mensaje.value);
        else if (mensaje instanceof AgalIntArray)
          ws.send(new Uint8Array(mensaje));
        else
          return new AgalTypeError(
            stack,
            'Se esperaba una cadena o una ListaEnteros como mensaje'
          );
        return null;
      })
    );
    this.set(
      defaultStack,
      'desconectar',
      AgalFunction.from((_stack, _name, _self) => {
        ws.close();
        return null;
      })
    )
    return ws;
  }
  static from() {
    return new AgalWebSocket();
  }
}
export default function (register: Libraries) {
  register.set('ws', () => {
    return new AgalClass('WebSocket', {
      __constructor__: AgalWebSocket.from,
      isInstance: value => value instanceof AgalWebSocket,
    });
  });
}
