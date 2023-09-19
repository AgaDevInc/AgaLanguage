import { agal } from 'magal/runtime/eval.ts';
import type { IStack } from 'magal/runtime/interpreter.ts';
import type Runtime from 'magal/runtime/values/Runtime.class.ts';
import AgalObject from 'magal/runtime/values/complex/Object.class.ts';
import {
  AgalReferenceError,
  AgalTypeError,
} from 'magal/runtime/values/internal/Error.class.ts';
import libraries from './libraries/index.ts';
import { AgalString } from 'magal/runtime/values/primitive/String.class.ts';
import parseRuntime from 'magal/runtime/values/parse.ts';

const cache = new Map();

function resolve(path: string) {
  const pathArray = path.split(/[\\|\/]/).filter(Boolean);
  const PATH = [];
  for (let i = 0; i < pathArray.length; i++) {
    const part = pathArray[i];
    if (part === '..') {
      PATH.pop();
    } else if (part !== '.') {
      PATH.push(part);
    }
  }
  return PATH.join('/');
}

export default async function makeRequire(
  stack: IStack,
  modulo: AgalObject,
  pathFile: string,
  config: AgalObject
): Promise<Runtime> {
  if (libraries.has(pathFile)) return libraries.get(pathFile);
  const Rtype =
    config && typeof config.getSync === 'function' && config.getSync('tipo');
  let type = 'modulo';
  if (Rtype instanceof AgalString && Rtype.value === 'json') type = 'json';
  const ruta = await (await modulo.get('ruta')).aCadena();
  const folder = ((ruta || Deno.cwd()) + '/')
    .replace(/\\/g, '/')
    .replace(/[\/]{1,}/g, '/');
  const path = resolve(new URL(pathFile, folder).href);

  if (type === 'modulo' && cache.has(path)) return cache.get(path);

  const file = await Deno.readTextFile(path).catch(() => null);
  if (file === null)
    return new AgalReferenceError(
      `No se pudo encontrar el archivo '${pathFile}' en '${path}'`,
      stack
    ).throw();
  const hijos = await modulo.get('hijos');
  const hijos_agregar = await hijos.get('agregar');
  await hijos_agregar.call(
    'agregar',
    stack,
    hijos,
    AgalObject.from({ nombre: pathFile, ruta: path, tipo: type }, stack)
  );
  if (type === 'json') {
    try {
      const obj = JSON.parse(file);
      return parseRuntime(stack, obj);
    } catch (_e) {
      return new AgalTypeError(
        `No se pudo importar como JSON "${pathFile}"`,
        stack
      ).throw();
    }
  }
  const code = await agal(file, path, stack);
  cache.set(path, code);
  return code;
}
