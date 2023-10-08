import { AgalRuntimeToAgalString } from "magal/RT/utils.ts";
import AgalString from "magal/RT/values/primitive/AgalString.ts";
import { Libraries } from "magal/RT/libraries/register.ts";
import { AgalClass } from "magal/RT/values/complex/index.ts";

export default function (register: Libraries) {
  register.set(
    'clases/Cadena',
    () =>
      new AgalClass('Cadena', {
        __constructor__(stack, _name, _este, data) {
          return AgalRuntimeToAgalString(stack, data);
        },
        isInstance(value) {
          return value instanceof AgalString;
        },
      })
  );
}
