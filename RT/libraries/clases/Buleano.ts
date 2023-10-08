import AgalClass from "magal/RT/values/complex/AgalClass.ts";
import { Libraries } from "magal/RT/libraries/register.ts";
import { AgalRuntimeToAgalBoolean } from "magal/RT/utils.ts";
import AgalBoolean from "magal/RT/values/primitive/AgalBoolean.ts";

export default function (register: Libraries) {
  register.set('clases/Buleano', () => new AgalClass('Buleano', {
    __constructor__(stack, _name, _este, data) {
      return AgalRuntimeToAgalBoolean(stack,data);
    },
    isInstance(value) {
      return value instanceof AgalBoolean;
    }
	}));
}