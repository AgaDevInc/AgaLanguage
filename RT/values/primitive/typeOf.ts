import AgalPrimitive from "magal/RT/values/primitive/class.ts";
import AgalBoolean from "magal/RT/values/primitive/AgalBoolean.ts";
import AgalNull from "magal/RT/values/primitive/AgalNull.ts";
import AgalNumber from "magal/RT/values/primitive/AgalNumber.ts";
import AgalString from "magal/RT/values/primitive/AgalString.ts";

export default function typeOf(type: AgalBoolean): 'buleano'
export default function typeOf(type: AgalNull): 'nulo' | 'vacio'
export default function typeOf(type: AgalNumber): 'numero'
export default function typeOf(type: AgalString): 'cadena'
export default function typeOf(type: AgalPrimitive): string | 'desconocido'
export default function typeOf(type: AgalPrimitive): string{
  if(type instanceof AgalBoolean) return 'buleano';
  if(type instanceof AgalNull) {
    if(type === AgalNull.getVoid()) return 'vacio';
    return 'nulo';
  }
  if(type instanceof AgalNumber) return 'numero';
  if(type instanceof AgalString) return 'cadena';
  return 'desconocido';
}