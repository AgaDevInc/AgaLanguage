import { AgalBoolean } from "./Boolean.class.ts";
import { AgalNull } from "./Null.class.ts";
import { AgalNumber } from "./Number.class.ts";
import Primitive from "./Primitive.class.ts";
import { AgalString } from "./String.class.ts";

export default function tipoDe(value: AgalBoolean): "buleano";
export default function tipoDe(value: AgalNull): "nulo";
export default function tipoDe(value: AgalNumber): "numero";
export default function tipoDe(value: AgalString): "cadena";
export default function tipoDe(value: Primitive){
  if(value instanceof AgalBoolean) return "buleano";
  if(value instanceof AgalNull) return "nulo";
  if(value instanceof AgalNumber) return "numero";
  if(value instanceof AgalString) return "cadena";
  return "indefinido";
}