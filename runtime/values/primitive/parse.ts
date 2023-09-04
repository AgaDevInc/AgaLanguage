import { isLikeNumber } from 'aga//super_math/util.ts';
import type { LikeNumber } from 'aga//super_math/types.d.ts';
import type { IStack } from 'agal/runtime/interpreter.ts';
import Null, { AgalNull } from "agal/runtime/values/primitive/Null.class.ts";
import NumberGetter, { AgalNumber } from "agal/runtime/values/primitive/Number.class.ts";
import StringGetter, { AgalString } from "agal/runtime/values/primitive/String.class.ts";
import BooleanGetter, { AgalBoolean } from "agal/runtime/values/primitive/Boolean.class.ts";

export default function parsePrimitive(_stack:IStack,value: LikeNumber): AgalNumber;
export default function parsePrimitive(_stack:IStack,value: string): AgalString;
export default function parsePrimitive(_stack:IStack,value: boolean): AgalBoolean;
export default function parsePrimitive(_stack:IStack,value: null): AgalNull;
export default function parsePrimitive(_stack:IStack,value: unknown) {
	if (typeof value === 'string') return StringGetter(value);
	if (isLikeNumber(value)) return NumberGetter(value);
	if (typeof value === 'boolean') return BooleanGetter(value);
	if (value === null) return Null;
}
