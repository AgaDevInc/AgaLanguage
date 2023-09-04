import { AgalNull } from "agal/runtime/values/primitive/Null.class.ts";
import Primitive from "agal/runtime/values/primitive/Primitive.class.ts";
import { AgalNumber } from "agal/runtime/values/primitive/Number.class.ts";
import { AgalString } from "agal/runtime/values/primitive/String.class.ts";
import { AgalBoolean } from "agal/runtime/values/primitive/Boolean.class.ts";

export default function tipoDe(value: AgalBoolean): "buleano";
export default function tipoDe(value: AgalNull): "nulo";
export default function tipoDe(value: AgalNumber): "numero";
export default function tipoDe(value: AgalString): "cadena";
export default function tipoDe(value: Primitive): "indefinido";
export default function tipoDe(value: Primitive){
  if(value instanceof AgalBoolean) return "buleano";
  if(value instanceof AgalNull) return "nulo";
  if(value instanceof AgalNumber) return "numero";
  if(value instanceof AgalString) return "cadena";
  return "indefinido";
}