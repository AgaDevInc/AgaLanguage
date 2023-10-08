import { AgalRuntimeToAgalNumber } from "magal/RT/utils.ts";
import { AgalClass } from "magal/RT/values/complex/index.ts";
import AgalNumber from "magal/RT/values/primitive/AgalNumber.ts";
import { Libraries } from "magal/RT/libraries/register.ts";

export default function (register: Libraries) {
  register.set("clases/Numero", () => new AgalClass("Numero", {
    __constructor__(stack, _name, _este, data) {
      return AgalRuntimeToAgalNumber(stack, data);
    },
    isInstance(value) {
      return value instanceof AgalNumber;
    }
  }));
}