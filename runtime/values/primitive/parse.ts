import { LikeNumber } from 'aga:ComplexMath/types';
import BooleanGetter, { AgalBoolean } from './Boolean.class.ts';
import Null, { AgalNull } from './Null.class.ts';
import NumberGetter, { AgalNumber } from './Number.class.ts';
import StringGetter, { AgalString } from './String.class.ts';
import { isLikeNumber } from 'aga:ComplexMath/util';
import type { IStack } from '../../interpreter.ts';

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
