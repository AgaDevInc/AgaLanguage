import AgalFunction from "magal/runtime/values/complex/Function.class.ts";
import AgalObject from "magal/runtime/values/complex/Object.class.ts";
import { AgalReferenceError, AgalTypeError } from "magal/runtime/values/internal/Error.class.ts";
import { AgalString } from "magal/runtime/values/primitive/String.class.ts";
import { AgalIntArray } from "magal/runtime/libraries/ListaEnteros.ts";
import AgalArray from "magal/runtime/values/complex/Array.class.ts";

function FileFunctions(mod: AgalObject){
  const leerArchivo = AgalFunction.from(async (_name, _stack, _este, archivo)=>{
    if(archivo instanceof AgalString){
      const file = await Agal.Permissions.get('LEER',archivo.value) ? await Deno.readFile(archivo.value).catch(()=>null) : null
      if(file === null) return new AgalReferenceError(`No se pudo encontrar el archivo '${archivo.value}'`, _stack).throw();
      return AgalIntArray.from(file as unknown as number[]);
    }else return new AgalTypeError('El archivo debe ser una cadena', _stack).throw();
  }).setName('<internal>.sab.leerArchivo');
  mod.setSync('leerArchivo', leerArchivo);
  const crearArchivo = AgalFunction.from(async (_name, _stack, _este, archivo, datos)=>{
    if(archivo instanceof AgalString){
      if(datos instanceof AgalIntArray){
        const data = await Agal.Permissions.get('CREAR',archivo.value) ? await Deno.writeFile(archivo.value, new Uint8Array(datos)).catch(()=>null) : false;
        if(data === null) return new AgalReferenceError(`No se pudo crear el archivo '${archivo.value}'`, _stack).throw();
        return datos;
      }else return new AgalTypeError('Los datos deben ser un ListaEnteros', _stack).throw();
    }else return new AgalTypeError('El archivo debe ser una cadena', _stack).throw();
  }).setName('<internal>.sab.crearArchivo');
  mod.setSync('crearArchivo', crearArchivo);
}

async function readDir(path: string):Promise<string[]>{
  const data = Deno.readDir(path);
  const files: string[] = [];
  for await(const file of data)
    files.push(file.name);
  return files;
}

function FolderFunctions(mod: AgalObject){
  const leerCarpeta = AgalFunction.from(async (_name, _stack, _este, carpeta)=>{
    if(carpeta instanceof AgalString){
      const data = await Agal.Permissions.get('LEER',carpeta.value) ? await readDir(carpeta.value).catch(()=>null) : null;
      if(data === null) return new AgalReferenceError(`No se pudo leer la carpeta '${carpeta.value}'`, _stack).throw();
      return AgalArray.from(data);
    }else return new AgalTypeError('La carpeta debe ser una cadena', _stack).throw();
  }).setName('<internal>.sab.leerCarpeta');
  mod.setSync('leerCarpeta', leerCarpeta);
  const crearCarpeta = AgalFunction.from(async (_name, _stack, _este, carpeta)=>{
    if(carpeta instanceof AgalString){
      const data = await Agal.Permissions.get('CREAR',carpeta.value) ? await Deno.mkdir(carpeta.value).catch(()=>null) : false;
      if(data === null) return new AgalReferenceError(`No se pudo crear la carpeta '${carpeta.value}'`, _stack).throw();
      return AgalIntArray.from(data as unknown as number[]);
    }else return new AgalTypeError('La carpeta debe ser una cadena', _stack).throw();
  }).setName('<internal>.sab.crearCarpeta');
  mod.setSync('crearCarpeta', crearCarpeta);
}

export default function sab(){
  const mod = new AgalObject()
  FileFunctions(mod);
  FolderFunctions(mod);
  const borrar = AgalFunction.from(async (_name, _stack, _este, archivo)=>{
    if(archivo instanceof AgalString){
      const data = await Agal.Permissions.get('BORRAR',archivo.value) ? await Deno.remove(archivo.value).catch(()=>null) : false;
      if(data === null) return new AgalReferenceError(`No se pudo borrar '${archivo.value}'`, _stack).throw();
      return AgalIntArray.from(data as unknown as number[]);
    }else return new AgalTypeError('La ruta debe ser una cadena', _stack).throw();
  }).setName('<internal>.sab.borrar');
  mod.setSync('borrar', borrar);
  return mod;
}