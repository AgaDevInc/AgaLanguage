// deno-lint-ignore-file require-await
import AgalObject from 'magal/runtime/values/complex/Object.class.ts';
import AgalFunction from 'magal/runtime/values/complex/Function.class.ts';
import AgalError, { AgalTypeError } from 'magal/runtime/values/internal/Error.class.ts';
import AgalNumberGetter, { AgalNumber } from 'magal/runtime/values/primitive/Number.class.ts';
import AgalStringGetter, { AgalString } from 'magal/runtime/values/primitive/String.class.ts';
import { AgalIntArray } from 'magal/runtime/libraries/ListaEnteros.ts';
import Runtime from 'magal/runtime/values/Runtime.class.ts';
import Properties from 'magal/runtime/values/internal/Properties.class.ts';
import AgalClass from 'magal/runtime/values/complex/Class.class.ts';
import { colorize } from 'aga//colors_string/functions.ts';
import { FOREGROUND } from 'aga//colors_string/constants.ts';
import { IStack } from 'magal/runtime/interpreter.ts';
import parseRuntime from 'magal/runtime/values/parse.ts';

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

const AgalResponseProperties = new Properties(Runtime.loadProperties());
const defaultInt = new AgalIntArray();

export class AgalResponse extends Runtime {
	body = defaultInt;
	constructor() {
		super();
		this.setSync('estatus', AgalNumberGetter(200));
		this.setSync('cabeceras', new AgalObject());
		this.setSync('url', AgalStringGetter(''));
	}
	toString(): string {
		return `[Respuesta ${(this.getSync('estatus') as AgalNumber).value.toString()}]`;
	}
	async set(_name: string, stack: IStack): Promise<Runtime> {
		return new AgalTypeError('No se puede modificar una respuesta', stack).throw();
	}
	protected _aCadena(): Promise<string> {
		return Promise.resolve(this.toString());
	}
	protected async _aConsola(): Promise<string> {
		return colorize(await this.aCadena(), FOREGROUND.CYAN);
	}
	static from(
		_stack: IStack,
		data: string | Uint8Array,
		options?: AgalResponseOptions,
		url?: string
	): AgalResponse {
		const res = new AgalResponse();
		res.body = AgalIntArray.from(
			data instanceof Uint8Array ? data : data.split('').map(c => c.charCodeAt(0))
		);
		if (options?.status && typeof options.status === 'number')
			res.setSync('estatus', AgalNumberGetter(options.status));
		if (options?.headers && typeof options.headers === 'object') {
			const headers = res.getSync('cabeceras')!;
			Object.entries(options.headers).forEach(([key, value]) => {
				headers.setSync(key, AgalStringGetter(value));
			});
		}
		if (url && typeof url === 'string') res.setSync('url', AgalStringGetter(url));

		return res;
	}
	static loadProperties(): Properties {
		return AgalResponseProperties;
	}
	static async getProperty(name: string, este: AgalResponse): Promise<Runtime | null> {
		if (name === 'json') {
			return AgalResponseProperties.set(
				'json',
				AgalFunction.from(async function json(_name, stack, _este) {
					const cuerpo = este.body;
					if (!(cuerpo instanceof AgalIntArray))
						return new AgalTypeError('Cuerpo invalido', stack).throw();
					const data = await cuerpo.aCadena();
					try {
						return parseRuntime(stack, JSON.parse(data));
					} catch (_e) {
						return new AgalTypeError('El cuerpo no se pudo leer como json', stack);
					}
				})
			);
		}
		if (name === 'texto') {
			return AgalResponseProperties.set(
				'texto',
				AgalFunction.from(async function texto(_name, stack, _este) {
					const cuerpo = este.body;
					if (!(cuerpo instanceof AgalIntArray))
						return new AgalTypeError('Cuerpo invalido', stack).throw();
					return AgalStringGetter(await cuerpo.aCadena());
				})
			);
		}
		if (name === 'cuerpo') {
			return AgalResponseProperties.set(
				'cuerpo',
				AgalFunction.from(async function cuerpo(_name, _stack, _este) {
					return este.body;
				})
			);
		}
		return super.getProperty(name, este);
	}
	toResponse(): Response {
		const body = this.body;
		if (!(body instanceof AgalIntArray)) throw new Error('Cuerpo invalido');
		const data = new Uint8Array(body);
		const cabeceras = this.getSync('cabeceras')!;
		const headers = Object.fromEntries(
			cabeceras.keysSync().map(key => {
				const value = cabeceras.getSync(key);
				if (!(value instanceof AgalString)) throw new Error('Cabecera invalida');
				return [key, value.value];
			})
		);
		const estatus = this.getSync('estatus')!;
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
export class AgalRequest extends Runtime {
	cache: AgalRequestCache = 'por-defecto';
	constructor() {
		super();
		const cabeceras = new AgalObject();
		cabeceras.setSync(
			'user-agent',
			AgalStringGetter(`Agal/${Agal.versions.agal} (Deno/${Deno.version.deno})`)
		);
		this.setSync('url', AgalStringGetter(''));
		this.setSync('cabeceras', cabeceras);
		this.setSync('metodo', AgalStringGetter('GET'));
	}
	toString(): string {
		return `[Peticion ${(this.getSync('metodo') as AgalString).value.toString()}]`;
	}
	protected _aCadena(): Promise<string> {
		return Promise.resolve(this.toString());
	}
	async set(_name: string, stack: IStack): Promise<Runtime> {
		return new AgalTypeError('No se puede modificar una peticion', stack).throw();
	}
	static from(stack: IStack, url: string, options?: AgalRequestOptions) {
		const req = new AgalRequest();
		req.setSync('url', AgalStringGetter(url));
		if (!options) return req;
		if (options.method && typeof options.method === 'string') {
			if (!METHODS.includes(options.method))
				return new AgalTypeError(`Metodo "${options.method}" invalido`, stack).throw();
			req.setSync('metodo', AgalStringGetter(options.method));
		} else options.method = 'GET';
		if (options.body && (typeof options.body === 'string' || options.body instanceof Uint8Array)) {
			if (options.method === 'GET')
				return new AgalTypeError(
					`No se puede enviar un cuerpo con el metodo ${options.method}`,
					stack
				).throw();
			req.setSync(
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
				return new AgalTypeError(`Cache "${options.cache}" invalido`, stack).throw();
			req.cache = options.cache;
		}
		if (options.headers && typeof options.headers === 'object') {
			const cabeceras = req.getSync('cabeceras')!;
			options.headers['user-agent'] ??= `Agal/${Agal.versions.agal} (Deno/${Deno.version.deno})`;
			Object.entries(options.headers).forEach(([key, value]) =>
				cabeceras.setSync(key, AgalStringGetter(value))
			);
		}
		return req;
	}
	static async fromRequest(request: Request) {
		const req = new AgalRequest();
		req.setSync('url', AgalStringGetter(request.url));
		req.setSync('metodo', AgalStringGetter(request.method));
		const body = await request.arrayBuffer();
		if (body.byteLength) req.setSync('cuerpo', AgalIntArray.from(new Uint8Array(body)));
		const cabeceras = req.getSync('cabeceras')!;
		for (const [key, value] of request.headers.entries())
			cabeceras.setSync(key, AgalStringGetter(value));
		return req;
	}
	toRequest(): Request {
		const url = this.getSync('url')! as AgalString;
		const metodo = this.getSync('metodo')! as AgalString;
		const cuerpo = this.getSync('cuerpo')! as AgalIntArray;
		const cabeceras = this.getSync('cabeceras')! as AgalObject;

		const URL = url.value;
		const METHOD = metodo.value;
		const BODY = cuerpo && new Uint8Array(cuerpo);
		const HEADERS = Object.fromEntries(
			cabeceras.keysSync().map(key => {
				const value = cabeceras.getSync(key)! as AgalString;
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

function clases(mod: AgalObject) {
	mod.setSync(
		'Respuesta',
		new AgalClass(
			'Respuesta',
			{
				__constructor__: {
					meta: [],
					value: AgalFunction.from(async function constructor(
						_name,
						stack,
						_este,
						cuerpo,
						options
					) {
						const res = new AgalResponse();
						if (!(cuerpo instanceof AgalIntArray))
							return new AgalTypeError('Se esperaba un arreglo de enteros', stack).throw();
						res.body = cuerpo;
						if (options) {
							if (!(options instanceof AgalObject))
								return new AgalTypeError('Se esperaba un objeto', stack).throw();
							const estatus = await options.get('estatus');
							if (estatus) {
								if (!(estatus instanceof AgalNumber))
									return new AgalTypeError('El estatus debe ser un numero', stack).throw();
								const n = Number(estatus.value.toString()) || 0;
								if (!n || Number.isInteger(n))
									return new AgalTypeError(
										'El estatus debe ser un numero Real Entero',
										stack
									).throw();
								if (n <= 100 || n >= 599)
									return new AgalTypeError(
										'El estatus debe ser un numero entre 100 y 599',
										stack
									).throw();
								res.setSync('estatus', estatus);
							}
							const cabeceras = await options.get('cabeceras');
							if (cabeceras) {
								if (!(cabeceras instanceof AgalObject))
									return new AgalTypeError('Se esperaba un objeto', stack).throw();
								cabeceras.keysSync().forEach(key => {
									const value = cabeceras.getSync(key);
									if (!(value instanceof AgalString))
										return new AgalTypeError('Se esperaba una cadena', stack).throw();
									res.getSync('cabeceras')!.setSync(key, value);
								});
							}
						}
						return res;
					}),
				},
			},
			undefined,
			AgalResponse
		)
	);
	mod.setSync(
		'Peticion',
		new AgalClass(
			'Peticion',
			{
				__constructor__: {
					meta: [],
					value: AgalFunction.from(async function constructor(_name, stack, _este, URL, options) {
						if (URL instanceof AgalString) {
							const url = URL.value.toString();
							const opts = {} as AgalRequestOptions;
							if (options instanceof AgalObject) {
								const metodo = options.getSync('metodo') as AgalString | null;
								opts.method = metodo?.value;
								const cuerpo = options.getSync('cuerpo') as AgalIntArray | AgalString | null;
								opts.body = cuerpo instanceof AgalIntArray ? new Uint8Array(cuerpo) : cuerpo?.value;
								const cabeceras = options.getSync('cabeceras') as AgalObject | null;
								opts.headers = cabeceras?.keysSync().reduce((headers, key) => {
									const value = cabeceras.getSync(key) as AgalString;
									headers[key] = value.value;
									return headers;
								}, {} as HEADERS);
								const cache = options.getSync('cache') as AgalString | null;
								opts.cache = cache?.value as AgalRequestCache;
							}
							URL = AgalRequest.from(stack, url, opts);
						}
						if (!(URL instanceof AgalRequest))
							return new AgalTypeError('Se esperaba una cadena o un objeto', stack).throw();
						return URL;
					}),
				},
			},
			undefined,
			AgalRequest
		)
	);
}

function client(mod: AgalObject) {
	const cached = new Map<string, AgalResponse>();
	const USE_CACHE_TYPES: AgalRequestCache[] = ['forzar-cache', 'solo-cache'];
	const LOAD_CACHE_TYPES: AgalRequestCache[] = ['forzar-cache', 'recargar', 'sin-cache'];

	const cliente = AgalFunction.from(async function cliente(_name, stack, _este, URL, options) {
		if (URL instanceof AgalString) {
			const url = URL.value.toString();
			const opts = {} as AgalRequestOptions;
			if (options instanceof AgalObject) {
				const metodo = options.getSync('metodo') as AgalString | null;
				opts.method = metodo?.value;
				const cuerpo = options.getSync('cuerpo') as AgalIntArray | AgalString | null;
				opts.body = cuerpo instanceof AgalIntArray ? new Uint8Array(cuerpo) : cuerpo?.value;
				const cabeceras = options.getSync('cabeceras') as AgalObject | null;
				opts.headers = cabeceras?.keysSync().reduce((headers, key) => {
					const value = cabeceras.getSync(key) as AgalString;
					headers[key] = value.value;
					return headers;
				}, {} as HEADERS);
				const cache = options.getSync('cache') as AgalString | null;
				opts.cache = cache?.value as AgalRequestCache;
			}
			URL = AgalRequest.from(stack, url, opts);
		}
		if (!(URL instanceof AgalRequest))
			return new AgalTypeError('Se esperaba una cadena o un objeto', stack).throw();
		const cacheType = URL.cache === 'por-defecto' ? globalThis.AgalRequestCache : URL.cache;

		const request = URL.toRequest();
		if (USE_CACHE_TYPES.includes(cacheType)) {
			const cachedResponse = cached.get(request.url);
			if (cachedResponse) return cachedResponse;
		}
		if (cacheType === 'solo-cache')
			return new AgalTypeError(`No funciono la peticion a '${request.url}'`, stack).throw();
		const netAccess = await Agal.Permissions.get('NET', request.url);
		if (netAccess === false)
			return new AgalTypeError(`No se puede acceder a '${request.url}'`, stack).throw();
		const response = await Agal.fetch(request).catch(() => null);
		if (!response)
			return new AgalTypeError(
				`No se pudo conectar a '${request.url}' con el metodo '${request.method}'`,
				stack
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
	mod.setSync('cliente', cliente);
}
function server(mod: AgalObject) {
	type CallBack = (R: Request, l:Deno.Listener) => Promise<Response>; 
	async function serveHttp(conn: Deno.Conn, listen: Deno.Listener, callback: CallBack) {
		const httpConn = Deno.serveHttp(conn);
		for await (const requestEvent of httpConn)
			requestEvent.respondWith(callback(requestEvent.request, listen));
	}
	async function listen(port: number, callback: CallBack) {
		const listener = Deno.listen({ port });
		for await (const conn of listener) serveHttp(conn, listener, callback);
	}
	mod.setSync(
		'servidor',
		AgalFunction.from(async function servidor(_name, stack, este, puerto, funcion, error) {
			if (!(puerto instanceof AgalNumber))
				return new AgalTypeError('Se esperaba un numero', stack).throw();
			const port = Number(puerto.value.toString());
			if (!port || !Number.isInteger(port))
				return new AgalTypeError('El puerto debe ser un numero natural', stack).throw();
			if (port <= 0 || port >= 65536)
				return new AgalTypeError('El puerto debe ser un numero entre 1 y 65535', stack).throw();
			if (!(funcion instanceof AgalFunction))
				return new AgalTypeError('Se esperaba una funcion para el segundo parametro', stack).throw();
			if (!(error instanceof AgalFunction))
				return new AgalTypeError('Se esperaba una funcion para el tercer parametro', stack).throw();

			listen(port, async (request, listen) => {
				const req = await AgalRequest.fromRequest(request);
				const res = await funcion.call('funcion', stack, este, req);
				if(res instanceof AgalError && res.throwed) {
					res.throwed = false
					const resE = await error.call('error', stack, este, res);
					if(resE instanceof AgalResponse) return resE.toResponse();
					try{
						listen.close();
					}catch(_){null}
				}
				if (!(res instanceof AgalResponse))
					return new Response('No se pudo procesar la peticion', { status: 500 });
				return res.toResponse();
			});
		})
	);
}

export default function http() {
	const mod = new AgalObject();
	clases(mod);
	client(mod);
	server(mod);
	return mod;
}
