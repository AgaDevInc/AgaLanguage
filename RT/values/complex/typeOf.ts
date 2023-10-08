import AgalComplex from "magal/RT/values/complex/class.ts";
import AgalDictionary from "magal/RT/values/complex/AgalDictionary.ts";
import AgalClass from "magal/RT/values/complex/AgalClass.ts";
import AgalError from "magal/RT/values/complex/AgalError.ts";
import { AgalFunction } from "magal/RT/values/complex/index.ts";
import AgalList from "magal/RT/values/complex/AgalList.ts";

export default function typeOf(type: AgalClass): 'clase'
export default function typeOf(type: AgalDictionary): 'diccionario'
export default function typeOf(type: AgalError): 'error'
export default function typeOf(type: AgalFunction): 'funcion'
export default function typeOf(type: AgalList): 'lista'
export default function typeOf(type: AgalComplex): string | 'objeto' | 'desconocido'
export default function typeOf(type: AgalComplex): string{
  if(type instanceof AgalClass) return 'clase';
  if(type instanceof AgalDictionary) return 'diccionario';
  if(type instanceof AgalError) return 'error';
  if(type instanceof AgalFunction) return 'funcion';
  if(type instanceof AgalList) return 'lista';
  if(type instanceof AgalComplex) return 'objeto';
  return 'desconocido';
}