import AgalRuntime from "magal/RT/values/class.ts";
import AgalComplex from "magal/RT/values/complex/class.ts";
import complexTypeOf from "magal/RT/values/complex/typeOf.ts";
import primitiveTypeOf from "magal/RT/values/primitive/typeOf.ts";
import AgalPrimitive from "magal/RT/values/primitive/class.ts";

function typeOf(type: AgalRuntime): string{
  if(type instanceof AgalComplex) return complexTypeOf(type);
  if(type instanceof AgalPrimitive) return primitiveTypeOf(type);
  return 'desconocido';
}

export default typeOf as typeof primitiveTypeOf & typeof complexTypeOf & typeof typeOf;