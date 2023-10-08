// deno-lint-ignore-file require-await
import AgalDictionary from 'magal/RT/values/complex/AgalDictionary.ts';
import AgalFunction from 'magal/RT/values/complex/AgalFunction.ts';
import AgalError, { AgalTypeError } from 'magal/RT/values/complex/AgalError.ts';
import AgalNumber from 'magal/RT/values/primitive/AgalNumber.ts';
import AgalString from 'magal/RT/values/primitive/AgalString.ts';
import { AgalIntArray } from 'magal/RT/libraries/ListaEnteros.ts';
import AgalRuntime from 'magal/RT/values/class.ts';
import AgalClass from 'magal/RT/values/complex/AgalClass.ts';
import { IStack, defaultStack } from 'magal/RT/stack.ts';
import parseRuntime from 'magal/RT/values/parse.ts';
import AgalComplex from 'magal/RT/values/complex/class.ts';
import { AgalRuntimeToAgalString } from 'magal/RT/utils.ts';
import { Libraries } from 'magal/RT/libraries/register.ts';

declare global {
  // deno-lint-ignore no-var
  var AgalRequestCache: AgalRequestCache;
}

globalThis.AgalRequestCache ??= 'forzar-cache';

type HEADERS = Record<string, string>;
interface AgalResponseOptions {
  status?: number;
  headers?: Record<string, string>;
}

const defaultInt = new AgalIntArray();

const AgalResponseProperties = new Map<string, AgalFunction>();
export class AgalResponse extends AgalComplex {
  type = 'Objeto Respuesta';
  body = defaultInt;
  constructor() {
    super();
    this._set('estatus', AgalNumber.from(200));
    this._set('cabeceras', new AgalDictionary());
    this._set('url', AgalString.from(''));
  }
  toString(): string {
    return `[Respuesta ${this.get(defaultStack, 'estatus')}]`;
  }
  _set(name: string, value: AgalRuntime): AgalRuntime {
    return super.set(defaultStack, name, value);
  }
  set(stack: IStack, _name: string, _value: AgalRuntime): AgalRuntime {
    return new AgalTypeError(
      stack,
      'No se puede modificar una respuesta'
    ).throw();
  }
  static from(
    stack: IStack,
    data: string | Uint8Array,
    options?: AgalResponseOptions,
    url?: string
  ): AgalResponse {
    const res = new AgalResponse();
    res.body = AgalIntArray.from(
      data instanceof Uint8Array
        ? data
        : data.split('').map(c => c.charCodeAt(0))
    );
    if (options?.status && typeof options.status === 'number')
      res._set('estatus', AgalNumber.from(options.status));
    if (options?.headers && typeof options.headers === 'object') {
      const headers = res.get(stack, 'cabeceras')! as AgalDictionary;
      Object.entries(options.headers).forEach(([key, value]) => {
        headers.set(stack, key, AgalString.from(value));
      });
    }
    if (url && typeof url === 'string') res._set('url', AgalString.from(url));

    return res;
  }
  get(stack: IStack, name: string): AgalRuntime | null {
    if (name === 'json' || name === 'texto' || name === 'cuerpo')
      return AgalResponse.getProperty(name, this);
    return super.get(stack, name);
  }
  static getProperty(name: string, este: AgalResponse): AgalRuntime {
    if (name === 'json') {
      !AgalResponseProperties.has(name) &&
        AgalResponseProperties.set(
          'json',
          AgalFunction.from(async function json(stack, _name, _este) {
            const cuerpo = este.body;
            if (!(cuerpo instanceof AgalIntArray))
              return new AgalTypeError(stack, 'Cuerpo invalido').throw();
            const data = await AgalRuntimeToAgalString(stack, cuerpo);
            if (data instanceof AgalError) return data.throw();
            try {
              return parseRuntime(JSON.parse(data.value));
            } catch (_e) {
              return new AgalTypeError(
                stack,
                'El cuerpo no se pudo leer como json'
              );
            }
          })
        );
    }
    if (name === 'texto') {
      !AgalResponseProperties.has(name) &&
        AgalResponseProperties.set(
          'texto',
          AgalFunction.from(async function texto(stack) {
            const cuerpo = este.body;
            if (!(cuerpo instanceof AgalIntArray))
              return new AgalTypeError(stack, 'Cuerpo invalido').throw();
            const data = await AgalRuntimeToAgalString(stack, cuerpo);
            if (data instanceof AgalError) return data.throw();
            return AgalString.from(data.value);
          })
        );
    }
    if (name === 'cuerpo') {
      !AgalResponseProperties.has(name) &&
        AgalResponseProperties.set(
          'cuerpo',
          AgalFunction.from(async function cuerpo(_stack, _name, _este) {
            return este.body;
          })
        );
    }
    return AgalResponseProperties.get(name) ?? este;
  }
  toResponse(): Response {
    const body = this.body;
    if (!(body instanceof AgalIntArray)) throw new Error('Cuerpo invalido');
    const data = new Uint8Array(body);
    const cabeceras = this.get(defaultStack, 'cabeceras')!;
    const headers = Object.fromEntries(
      cabeceras.keys().map(key => {
        const value = cabeceras.get(defaultStack, key);
        if (!(value instanceof AgalString))
          throw new Error('Cabecera invalida');
        return [key, value.value];
      })
    );
    const estatus = this.get(defaultStack, 'estatus')!;
    if (!(estatus instanceof AgalNumber)) throw new Error('Cuerpo invalido');
    return new Response(data, {
      status: Number(estatus.value.toString()),
      headers,
    });
  }
}
type AgalRequestCache =
  | 'por-defecto'
  | 'sin-guardar'
  | 'recargar'
  | 'sin-cache'
  | 'solo-cache'
  | 'forzar-cache';

interface AgalRequestOptions {
  method?: string;
  headers?: HEADERS;
  body?: string | Uint8Array;
  cache?: AgalRequestCache;
}
const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
export class AgalRequest extends AgalComplex {
  type = 'Objeto Peticion';
  cache: AgalRequestCache = 'por-defecto';
  constructor() {
    super();
    const cabeceras = new AgalDictionary();
    cabeceras.set(
      defaultStack,
      'user-agent',
      AgalString.from(`Agal/${Agal.versions.agal} (Deno/${Deno.version.deno})`)
    );
    this._set('url', AgalString.from(''));
    this._set('cabeceras', cabeceras);
    this._set('metodo', AgalString.from('GET'));
  }
  toString(): string {
    return `[Peticion ${this.get(defaultStack, 'metodo')}]`;
  }
  _set(name: string, value: AgalRuntime): AgalRuntime {
    return super.set(defaultStack, name, value);
  }
  set(stack: IStack, _name: string, _value: AgalRuntime): AgalRuntime {
    return new AgalTypeError(
      stack,
      'No se puede modificar una peticion'
    ).throw();
  }
  static from(stack: IStack, url: string, options?: AgalRequestOptions) {
    const req = new AgalRequest();
    req._set('url', AgalString.from(url));
    if (!options) return req;
    if (options.method && typeof options.method === 'string') {
      if (!METHODS.includes(options.method))
        return new AgalTypeError(
          stack,
          `Metodo "${options.method}" invalido`
        ).throw();
      req._set('metodo', AgalString.from(options.method));
    } else options.method = 'GET';
    if (
      options.body &&
      (typeof options.body === 'string' || options.body instanceof Uint8Array)
    ) {
      if (options.method === 'GET')
        return new AgalTypeError(
          stack,
          `No se puede enviar un cuerpo con el metodo ${options.method}`
        ).throw();
      req._set(
        'cuerpo',
        AgalIntArray.from(
          options.body instanceof Uint8Array
            ? options.body
            : options.body.split('').map(c => c.charCodeAt(0))
        )
      );
    }
    if (options.cache && typeof options.cache === 'string') {
      if (!AgalRequest.getCache(options.cache))
        return new AgalTypeError(
          stack,
          `Cache "${options.cache}" invalido`
        ).throw();
      req.cache = options.cache;
    }
    if (options.headers && typeof options.headers === 'object') {
      const cabeceras = req.get(defaultStack, 'cabeceras')!;
      options.headers[
        'user-agent'
      ] ??= `Agal/${Agal.versions.agal} (Deno/${Deno.version.deno} ${Deno.build.os})`;
      Object.entries(options.headers).forEach(([key, value]) =>
        cabeceras.set(defaultStack, key, AgalString.from(value))
      );
    }
    return req;
  }
  static async fromRequest(request: Request) {
    const req = new AgalRequest();
    req._set('url', AgalString.from(request.url));
    req._set('metodo', AgalString.from(request.method));
    const body = await request.arrayBuffer();
    if (body.byteLength)
      req._set('cuerpo', AgalIntArray.from(new Uint8Array(body)));
    const cabeceras = req.get(defaultStack, 'cabeceras')!;
    for (const [key, value] of request.headers.entries())
      cabeceras.set(defaultStack, key, AgalString.from(value));
    return req;
  }
  toRequest(): Request {
    const url = this.get(defaultStack, 'url')! as AgalString;
    const metodo = this.get(defaultStack, 'metodo')! as AgalString;
    const cuerpo = this.get(defaultStack, 'cuerpo')! as AgalIntArray;
    const cabeceras = this.get(defaultStack, 'cabeceras')! as AgalDictionary;

    const URL = url.value;
    const METHOD = metodo.value;
    const BODY = cuerpo && new Uint8Array(cuerpo);
    const HEADERS = Object.fromEntries(
      cabeceras.keys().map(key => {
        const value = cabeceras.get(defaultStack, key)! as AgalString;
        return [key, value.value];
      })
    );

    return new Request(URL, {
      method: METHOD,
      cache: 'no-store',
      headers: HEADERS,
      body: BODY,
    });
  }
  static getCache(cache: AgalRequestCache): RequestCache {
    switch (cache) {
      case 'por-defecto':
        if (globalThis.AgalRequestCache !== 'por-defecto')
          return this.getCache(globalThis.AgalRequestCache);
        return 'default';
      case 'sin-guardar':
        return 'no-store';
      case 'recargar':
        return 'reload';
      case 'sin-cache':
        return 'no-cache';
      case 'solo-cache':
        return 'only-if-cached';
      case 'forzar-cache':
        return 'force-cache';
    }
  }
}

function clases(mod: AgalDictionary) {
  mod.set(
    defaultStack,
    'Respuesta',
    new AgalClass('Respuesta', {
      __constructor__(stack, _name, _este, cuerpo, options) {
        const res = new AgalResponse();
        if (!(cuerpo instanceof AgalIntArray))
          return new AgalTypeError(
            stack,
            'Se esperaba un arreglo de enteros'
          ).throw();
        res.body = cuerpo;
        if (options) {
          if (!(options instanceof AgalDictionary))
            return new AgalTypeError(stack, 'Se esperaba un objeto').throw();
          const estatus = options.get(stack, 'estatus');
          if (estatus) {
            if (!(estatus instanceof AgalNumber))
              return new AgalTypeError(
                stack,
                'El estatus debe ser un numero'
              ).throw();
            const n = Number(estatus.value.toString()) || 0;
            if (!n || Number.isInteger(n))
              return new AgalTypeError(
                stack,
                'El estatus debe ser un numero Real Entero'
              ).throw();
            if (n <= 100 || n >= 599)
              return new AgalTypeError(
                stack,
                'El estatus debe ser un numero entre 100 y 599'
              ).throw();
            res._set('estatus', estatus);
          }
          const cabeceras = options.get(stack, 'cabeceras');
          if (cabeceras) {
            if (!(cabeceras instanceof AgalDictionary))
              return new AgalTypeError(stack, 'Se esperaba un objeto').throw();
            cabeceras.keys().forEach(key => {
              const value = cabeceras.get(stack, key);
              if (!(value instanceof AgalString))
                return new AgalTypeError(
                  stack,
                  'Se esperaba una cadena'
                ).throw();
              res.get(stack, 'cabeceras')!.set(stack, key, value);
            });
          }
        }
        return res;
      },
      isInstance(value: AgalRuntime) {
        return value instanceof AgalResponse;
      },
    })
  );
  mod.set(
    defaultStack,
    'Peticion',
    new AgalClass('Peticion', {
      async __constructor__(stack, _name, _este, URL, options) {
        if (URL instanceof AgalString) {
          const url = URL.value.toString();
          const opts = {} as AgalRequestOptions;
          if (options instanceof AgalDictionary) {
            const metodo = options.get(stack, 'metodo') as AgalString | null;
            opts.method = metodo?.value;
            const cuerpo = options.get(stack, 'cuerpo') as
              | AgalIntArray
              | AgalString
              | null;
            opts.body =
              cuerpo instanceof AgalIntArray
                ? new Uint8Array(cuerpo)
                : cuerpo?.value;
            const cabeceras = options.get(
              stack,
              'cabeceras'
            ) as AgalDictionary | null;
            opts.headers = cabeceras?.keys().reduce((headers, key) => {
              const value = cabeceras.get(stack, key) as AgalString;
              headers[key] = value.value;
              return headers;
            }, {} as HEADERS);
            const cache = options.get(stack, 'cache') as AgalString | null;
            opts.cache = cache?.value as AgalRequestCache;
          }
          URL = AgalRequest.from(stack, url, opts);
        }
        if (!(URL instanceof AgalRequest))
          return new AgalTypeError(
            stack,
            'Se esperaba una cadena o un objeto'
          ).throw();
        return URL;
      },
      isInstance(value: AgalRuntime) {
        return value instanceof AgalRequest;
      },
    })
  );
}

function client(mod: AgalDictionary) {
  const cached = new Map<string, AgalResponse>();
  const USE_CACHE_TYPES: AgalRequestCache[] = ['forzar-cache', 'solo-cache'];
  const LOAD_CACHE_TYPES: AgalRequestCache[] = [
    'forzar-cache',
    'recargar',
    'sin-cache',
  ];

  const cliente = AgalFunction.from(async function cliente(
    stack,
    _name,
    _este,
    URL,
    options
  ) {
    if (URL instanceof AgalString) {
      const url = URL.value.toString();
      const opts = {} as AgalRequestOptions;
      if (options instanceof AgalDictionary) {
        const metodo = options.get(stack, 'metodo') as AgalString | null;
        opts.method = metodo?.value;
        const cuerpo = options.get(stack, 'cuerpo') as
          | AgalIntArray
          | AgalString
          | null;
        opts.body =
          cuerpo instanceof AgalIntArray
            ? new Uint8Array(cuerpo)
            : cuerpo?.value;
        const cabeceras = options.get(
          stack,
          'cabeceras'
        ) as AgalDictionary | null;
        opts.headers = cabeceras?.keys().reduce((headers, key) => {
          const value = cabeceras.get(stack, key) as AgalString;
          headers[key] = value.value;
          return headers;
        }, {} as HEADERS);
        const cache = options.get(stack, 'cache') as AgalString | null;
        opts.cache = cache?.value as AgalRequestCache;
      }
      URL = AgalRequest.from(stack, url, opts);
    }
    if (!(URL instanceof AgalRequest))
      return new AgalTypeError(
        stack,
        'Se esperaba una cadena o un objeto'
      ).throw();
    const cacheType =
      URL.cache === 'por-defecto' ? globalThis.AgalRequestCache : URL.cache;

    const request = URL.toRequest();
    if (USE_CACHE_TYPES.includes(cacheType)) {
      const cachedResponse = cached.get(request.url);
      if (cachedResponse) return cachedResponse;
    }
    if (cacheType === 'solo-cache')
      return new AgalTypeError(
        stack,
        `No funciono la peticion a '${request.url}'`
      ).throw();
    const netAccess = await Agal.Permissions.get('NET', request.url);
    if (netAccess === false)
      return new AgalTypeError(
        stack,
        `No se puede acceder a '${request.url}'`
      ).throw();
    const response = await Agal.fetch(request).catch(() => null);
    if (!response)
      return new AgalTypeError(
        stack,
        `No se pudo conectar a '${request.url}' con el metodo '${request.method}'`
      ).throw();
    const data = AgalResponse.from(
      stack,
      new Uint8Array(await response.arrayBuffer()),
      {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
      },
      request.url
    );
    if (LOAD_CACHE_TYPES.includes(cacheType)) cached.set(request.url, data);
    return data;
  });
  mod.set(defaultStack, 'cliente', cliente);
}
function server(mod: AgalDictionary) {
  type CallBack = (R: Request, l: Deno.Listener) => Promise<Response>;
  async function serveHttp(
    conn: Deno.Conn,
    listen: Deno.Listener,
    callback: CallBack
  ) {
    const httpConn = Deno.serveHttp(conn);
    for await (const requestEvent of httpConn)
      requestEvent.respondWith(callback(requestEvent.request, listen));
  }
  async function listen(port: number, callback: CallBack) {
    const listener = Deno.listen({ port });
    for await (const conn of listener) serveHttp(conn, listener, callback);
  }
  mod.set(
    defaultStack,
    'servidor',
    AgalFunction.from(async function servidor(
      stack,
      _name,
      este,
      puerto,
      funcion,
      error
    ): Promise<AgalRuntime | null> {
      if (!(puerto instanceof AgalNumber))
        return new AgalTypeError(stack, 'Se esperaba un numero').throw();
      const port = Number(puerto.value.toString());
      if (!port || !Number.isInteger(port))
        return new AgalTypeError(
          stack,
          'El puerto debe ser un numero natural'
        ).throw();
      if (port <= 0 || port >= 65536)
        return new AgalTypeError(
          stack,
          'El puerto debe ser un numero entre 1 y 65535'
        ).throw();
      if (!(funcion instanceof AgalFunction))
        return new AgalTypeError(
          stack,
          'Se esperaba una funcion para el segundo parametro'
        ).throw();
      if (!(error instanceof AgalFunction))
        return new AgalTypeError(
          stack,
          'Se esperaba una funcion para el tercer parametro'
        ).throw();

      listen(port, async (request, listen) => {
        const req = await AgalRequest.fromRequest(request);
        const res = await funcion.call(stack, 'funcion', este, req);
        if (res instanceof AgalError && res.throwned) {
          res.catch();
          const resE = await error.call(stack, 'error', este, res);
          if (resE instanceof AgalResponse) return resE.toResponse();
          try {
            listen.close();
          } catch (_) {
            null;
          }
        }
        if (!(res instanceof AgalResponse))
          return new Response('No se pudo procesar la peticion', {
            status: 500,
          });
        return res.toResponse();
      });
      return null;
    })
  );
}

export default (register: Libraries) =>
  register.set('http', function http() {
    const mod = new AgalDictionary();
    clases(mod);
    client(mod);
    server(mod);
    return mod;
  });
