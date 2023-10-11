import Parser from 'magal/frontend/parser.ts';
import makeRequire from 'magal/RT/require.ts';
import getGlobalScope from 'magal/RT/global/index.ts';
import Enviroment from 'magal/RT/Enviroment.ts';
import interpreter from 'magal/RT/interpreter.ts';
import AgalList from 'magal/RT/values/complex/AgalList.ts';
import AgalDictionary from 'magal/RT/values/complex/AgalDictionary.ts';
import AgalFunction from 'magal/RT/values/complex/AgalFunction.ts';
import AgalRuntime from 'magal/RT/values/class.ts';
import AgalError, { AgalTypeError } from 'magal/RT/values/complex/AgalError.ts';
import AgalString from 'magal/RT/values/primitive/AgalString.ts';
import { IStack, defaultStack } from 'magal/RT/stack.ts';

export function getModule(path: string): AgalDictionary {
  const module = new AgalDictionary();
  const splitPath = path.split(/[\\\/]/g);
  module.set(
    defaultStack,
    'ruta',
    AgalString.from(splitPath.slice(0, -1).join('/'))
  );
  module.set(defaultStack, 'archivo', AgalString.from(splitPath.join('/')));
  module.set(defaultStack, 'exportar', new AgalDictionary());
  module.set(defaultStack, 'hijos', new AgalList());
  const importar = AgalFunction.from(async function requiere(
    stack,
    _name,
    _este,
    path,
    config
  ) {
    if (path instanceof AgalString)
      return await makeRequire(
        stack,
        module,
        path.value,
        config as AgalDictionary
      );
    return new AgalTypeError(stack, 'Se esperaba una cadena').throw();
  });
  importar.set(defaultStack, 'nombre', AgalString.from('importar'));
  importar.set(defaultStack, 'mod', module);
  module.set(defaultStack, 'importar', importar);
  return module;
}

export function getModuleScope(path: string): Enviroment {
  const data = getGlobalScope().createChild();
  const modulo = getModule(path);
  data.set('importar', defaultStack, modulo.get(defaultStack, 'importar')!, {
    col: 0,
    row: 0,
  });
  data.set('exportar', defaultStack, modulo.get(defaultStack, 'exportar')!, {
    col: 0,
    row: 0,
  });
  data.set('modulo', defaultStack, modulo, { col: 0, row: 0 });
  return data;
}

export async function agal(
  code: string,
  path = Deno.cwd() + '/inicio.agal',
  stack = defaultStack
) {
  path = path.replace(/\\/g, '/');
  const parser = new Parser();
  const program = parser.produceAST(code, false, path);
  const scope = getModuleScope(path);
  const data = await interpreter(program, scope, stack);
  if (data instanceof AgalError) return data;
  return data.get(defaultStack, 'exportar');
}

export async function evalLine(
  line: string,
  lineIndex: number,
  scope?: Enviroment,
  stack: IStack = defaultStack
): Promise<[AgalRuntime, Enviroment, IStack]> {
  scope = scope ?? getModuleScope(Deno.cwd() + '/inicio.agal');
  const parser = new Parser();
  const program = parser.produceAST(line, false, `<linea:${lineIndex}>`);
  const runtime = await interpreter(program.body, scope, stack);
  return [runtime, scope, stack];
}

export default async function AgalEval(code: string) {
  const parser = new Parser();
  const program = parser.produceAST(code, false, '<nativo>');
  return await interpreter(program.body, getGlobalScope(), defaultStack);
}
