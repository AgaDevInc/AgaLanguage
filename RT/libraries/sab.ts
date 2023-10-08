import AgalFunction from 'magal/RT/values/complex/AgalFunction.ts';
import AgalDictionary from 'magal/RT/values/complex/AgalDictionary.ts';
import {
  AgalReferenceError,
  AgalTypeError,
} from 'magal/RT/values/complex/AgalError.ts';
import AgalString from 'magal/RT/values/primitive/AgalString.ts';
import { AgalIntArray } from 'magal/RT/libraries/ListaEnteros.ts';
import AgalArray from 'magal/RT/values/complex/AgalList.ts';
import { defaultStack } from 'magal/RT/stack.ts';
import { Libraries } from 'magal/RT/libraries/register.ts';

function FileFunctions(mod: AgalDictionary) {
  const leerArchivo = AgalFunction.from(
    async (stack, _name, _este, archivo) => {
      if (archivo instanceof AgalString) {
        const file = (await Agal.Permissions.get('LEER', archivo.value))
          ? await Deno.readFile(archivo.value).catch(() => null)
          : null;
        if (file === null)
          return new AgalReferenceError(
            stack,
            `No se pudo encontrar el archivo '${archivo.value}'`
          ).throw();
        return AgalIntArray.from(file as unknown as number[]);
      } else
        return new AgalTypeError(
          stack,
          'El archivo debe ser una cadena'
        ).throw();
    }
  );
  leerArchivo.set(defaultStack, 'nombre', AgalString.from('sab.leerArchivo'));
  mod.set(defaultStack, 'leerArchivo', leerArchivo);
  const crearArchivo = AgalFunction.from(
    async (stack, _name, _este, archivo, datos) => {
      if (archivo instanceof AgalString) {
        if (datos instanceof AgalIntArray) {
          const data = (await Agal.Permissions.get('CREAR', archivo.value))
            ? await Deno.writeFile(archivo.value, new Uint8Array(datos)).catch(
                () => null
              )
            : false;
          if (data === null)
            return new AgalReferenceError(
              stack,
              `No se pudo crear el archivo '${archivo.value}'`
            ).throw();
          return datos;
        } else
          return new AgalTypeError(
            stack,
            'Los datos deben ser un ListaEnteros'
          ).throw();
      } else
        return new AgalTypeError(
          stack,
          'El archivo debe ser una cadena'
        ).throw();
    }
  );
  crearArchivo.set(defaultStack, 'nombre', AgalString.from('sab.crearArchivo'));
  mod.set(defaultStack, 'crearArchivo', crearArchivo);
}

async function readDir(path: string): Promise<string[]> {
  const data = Deno.readDir(path);
  const files: string[] = [];
  for await (const file of data) files.push(file.name);
  return files;
}

function FolderFunctions(mod: AgalDictionary) {
  const leerCarpeta = AgalFunction.from(
    async (stack, _name, _este, carpeta) => {
      if (carpeta instanceof AgalString) {
        const data = (await Agal.Permissions.get('LEER', carpeta.value))
          ? await readDir(carpeta.value).catch(() => null)
          : null;
        if (data === null)
          return new AgalReferenceError(
            stack,
            `No se pudo leer la carpeta '${carpeta.value}'`
          ).throw();
        return AgalArray.from(data);
      } else
        return new AgalTypeError(
          stack,
          'La carpeta debe ser una cadena'
        ).throw();
    }
  );
  leerCarpeta.set(defaultStack, 'nombre', AgalString.from('sab.leerCarpeta'));
  mod.set(defaultStack, 'leerCarpeta', leerCarpeta);
  const crearCarpeta = AgalFunction.from(
    async (stack, _name, _este, carpeta) => {
      if (carpeta instanceof AgalString) {
        const data = (await Agal.Permissions.get('CREAR', carpeta.value))
          ? await Deno.mkdir(carpeta.value).catch(() => null)
          : false;
        if (data === null)
          return new AgalReferenceError(
            stack,
            `No se pudo crear la carpeta '${carpeta.value}'`
          ).throw();
        return AgalIntArray.from(data as unknown as number[]);
      } else
        return new AgalTypeError(
          stack,
          'La carpeta debe ser una cadena'
        ).throw();
    }
  );
  crearCarpeta.set(defaultStack, 'nombre', AgalString.from('sab.crearCarpeta'));
  mod.set(defaultStack, 'crearCarpeta', crearCarpeta);
}

export default (register: Libraries) =>
  register.set('sab', function sab() {
    const mod = new AgalDictionary();
    FileFunctions(mod);
    FolderFunctions(mod);
    const borrar = AgalFunction.from(async (stack, _name, _este, archivo) => {
      if (archivo instanceof AgalString) {
        const data = (await Agal.Permissions.get('BORRAR', archivo.value))
          ? await Deno.remove(archivo.value).catch(() => null)
          : false;
        if (data === null)
          return new AgalReferenceError(
            stack,
            `No se pudo borrar '${archivo.value}'`
          ).throw();
        return AgalIntArray.from(data as unknown as number[]);
      } else
        return new AgalTypeError(stack, 'La ruta debe ser una cadena').throw();
    });
    borrar.set(defaultStack, 'nombre', AgalString.from('sab.borrar'));
    mod.set(defaultStack, 'borrar', borrar);
    return mod;
  });
