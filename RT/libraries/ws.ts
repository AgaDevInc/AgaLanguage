import { Libraries } from 'magal/RT/libraries/register.ts';
import { AgalEvents } from 'magal/RT/libraries/Eventos.ts';
import { AgalIntArray } from 'magal/RT/libraries/ListaEnteros.ts';
import { IStack, defaultStack } from 'magal/RT/stack.ts';
import { AgalBoolean, AgalString } from 'magal/RT/values/primitive/index.ts';
import { AgalFunction } from 'magal/RT/values/complex/index.ts';
import AgalError, { AgalTypeError } from 'magal/RT/values/complex/AgalError.ts';
import AgalClass from 'magal/RT/values/complex/AgalClass.ts';

function getCodeFromTextError(text: string) {
  const match = text.match(/os error (\d+)/);
  if (match) return parseInt(match[1]);
  return 0;
}
function getMessageFromCode(code: number) {
  switch (code) {
    case 10061:
      return 'No se pudo establecer la conexión';
    case 10054:
      return 'Se ha cerrado la conexión';
    case 10060:
      return 'Tiempo de espera agotado';
    default:
      return 'Error desconocido';
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
        if (!(URL instanceof AgalString))
          return new AgalTypeError(
            stack,
            'Se esperaba una cadena como URL de conexión'
          ).throw();
        return this.connect(stack, URL.value);
      })
    );
  }
  connect(stack: IStack, url: string) {
    try {
      const urlTest = new URL(url);
      if (urlTest.protocol !== 'ws:' && urlTest.protocol !== 'wss:')
        return new AgalTypeError(
          stack,
          'Se esperaba una URL con protocolo ws o wss'
        ).throw();
    } catch (_e) {
      return new AgalTypeError(
        stack,
        'Se esperaba una URL válida'
      ).throw();
    }
    const ws = new Deno._WebSocket(url) as WebSocket;
    ws.onopen = async () => {
      this.set(stack, 'ABIERTO', AgalBoolean.from(true));
      const data = await this.emit('abrir');
      if (data instanceof AgalError && data.throwned) return this.emit('error', data.catch());
    };
    ws.onclose = async e => {
      this.set(stack, 'ABIERTO', AgalBoolean.from(false));
      this.set(stack, 'CERRADO', AgalBoolean.from(true));
      const data = await this.emit('cerrar', e.code);
      if (data instanceof AgalError && data.throwned) return this.emit('error', data.catch());
    };
    ws.onmessage = async e => {
      if (typeof e.data === 'string') {
        const data = await this.emit('mensaje', e.data);
        if (data instanceof AgalError && data.throwned) return this.emit('error', data.catch());
      }
      if (e.data instanceof ArrayBuffer) {
        const buffer = new Uint8Array(e.data);
        const data = await this.emit('mensaje', AgalIntArray.from(buffer));
        if (data instanceof AgalError && data.throwned) return this.emit('error', data.catch());
      }
      if (e.data instanceof Blob) {
        const buffer = new Uint8Array(await e.data.arrayBuffer());
        const data = await this.emit('mensaje', AgalIntArray.from(buffer));
        if (data instanceof AgalError && data.throwned) return this.emit('error', data.catch());
      }
    };
    ws.onerror = e => {
      const code = getCodeFromTextError((e as ErrorEvent).message);
      const message = getMessageFromCode(code);
      const error = new AgalError(stack, message);
      this.emit('error', error);
    };
    this.set(
      stack,
      'enviar',
      AgalFunction.from((stack, _name, _self, mensaje) => {
        if((this.get(stack, 'CERRADO') as AgalBoolean).value) return new AgalTypeError(stack, 'La conexión está cerrada').throw()
        if(!(this.get(stack, 'ABIERTO') as AgalBoolean).value) return new AgalTypeError(stack, 'No se ha establecido la conexión').throw()
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
      stack,
      'desconectar',
      AgalFunction.from((_stack, _name, _self) => {
        ws.close();
        return null;
      })
    );
    return null;
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
