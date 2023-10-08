import { agal } from 'magal/RT/eval.ts';
import type { IStack } from 'magal/RT/stack.ts';
import type AgalRuntime from 'magal/RT/values/class.ts';
import AgalDictionary from 'magal/RT/values/complex/AgalDictionary.ts';
import AgalError, {
  AgalReferenceError,
  AgalTypeError,
} from 'magal/RT/values/complex/AgalError.ts';
import libraries from 'magal/RT/libraries/index.ts';
import AgalString from 'magal/RT/values/primitive/AgalString.ts';
import parseRuntime from 'magal/RT/values/parse.ts';
import { AgalRuntimeToAgalString } from 'magal/RT/utils.ts';
import AgalList from 'magal/RT/values/complex/AgalList.ts';

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
const resolvePath = (path: string, folder: string) => {
  try {
    const url = new URL(path, folder);
    return resolve(url.href);
  } catch (_e) {
    return null;
  }
};
export default async function makeRequire(
  stack: IStack,
  modulo: AgalDictionary,
  pathFile: string,
  config: AgalDictionary
): Promise<AgalRuntime> {
  if (libraries.has(pathFile)) return libraries.get(pathFile);
  const Rtype =
    config && typeof config.get === 'function' && config.get(stack, 'tipo');
  let type = 'modulo';
  if (Rtype instanceof AgalString && Rtype.value === 'json') type = 'json';
  const ruta = modulo.get(stack, 'ruta')
    ? await AgalRuntimeToAgalString(stack, modulo.get(stack, 'ruta')!)
    : 'nulo';
  if (ruta instanceof AgalError) return ruta.throw();
  const folder = ((ruta || Deno.cwd()) + '/')
    .replace(/\\/g, '/')
    .replace(/[\/]{1,}/g, '/');
  const path = resolvePath(pathFile, folder);
  if (path === null)
    return new AgalReferenceError(
      stack,
      `No se pudo encontrar el archivo '${pathFile}' en '${folder}'`
    ).throw();

  if (type === 'modulo' && cache.has(path)) return cache.get(path);

  const file = await Deno.readTextFile(path).catch(() => null);
  if (file === null)
    return new AgalReferenceError(
      stack,
      `No se pudo encontrar el archivo '${pathFile}' en '${path}'`
    ).throw();
  const hijos = modulo.get(stack, 'hijos');
  if (!(hijos instanceof AgalList))
    return new AgalTypeError(stack, 'Se esperaba una lista').throw();
  hijos.set(
    stack,
    hijos.length.toString(),
    AgalDictionary.from({ nombre: pathFile, ruta: path, tipo: type })
  );

  if (type === 'json') {
    try {
      const obj = JSON.parse(file);
      return parseRuntime(obj);
    } catch (_e) {
      return new AgalTypeError(
        stack,
        `No se pudo importar como JSON "${pathFile}"`
      ).throw();
    }
  }
  const code = await agal(file, path, stack);
  cache.set(path, code);
  return code!;
}
