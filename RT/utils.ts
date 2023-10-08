import AgalRuntime from 'magal/RT/values/class.ts';
import AgalComplex from 'magal/RT/values/complex/class.ts';
import AgalFunction from 'magal/RT/values/complex/AgalFunction.ts';
import { IStack } from 'magal/RT/stack.ts';
import AgalBoolean from 'magal/RT/values/primitive/AgalBoolean.ts';
import AgalError, {
  AgalSyntaxError, AgalTypeError,
} from 'magal/RT/values/complex/AgalError.ts';
import typeOf from 'magal/RT/values/typeOf.ts';
import AgalNull from 'magal/RT/values/primitive/AgalNull.ts';
import AgalNumber from 'magal/RT/values/primitive/AgalNumber.ts';
import AgalPrimitive from 'magal/RT/values/primitive/class.ts';
import AgalList from 'magal/RT/values/complex/AgalList.ts';
import AgalString from 'magal/RT/values/primitive/AgalString.ts';
import {
  BLOCK_TYPE,
  EXPRESSIONS_TYPE,
  LITERALS_TYPE,
  STATEMENTS_TYPE,
  Stmt,
} from 'magal/frontend/ast.ts';
import ComplexNumber from 'aga//super_math/ComplexNumber.class.ts';
import * as SuperMath from 'aga//super_math/functions.ts';
import { colorize } from 'aga//colors_string/functions.ts';
import { FOREGROUND } from 'aga//colors_string/constants.ts';
import AgalClass, { AgalInstance } from 'magal/RT/values/complex/AgalClass.ts';
import AgalDictionary from 'magal/RT/values/complex/AgalDictionary.ts';

export async function AgalRuntimeToAgalBoolean(
  stack: IStack,
  value: AgalRuntime
): Promise<AgalBoolean | AgalError> {
  if (value instanceof AgalComplex) {
    const bool = value.get(stack, '__buleano__');
    if (bool instanceof AgalFunction) {
      const result = await bool.call(stack, '__buleano__', value);
      if (result instanceof AgalBoolean) return result;
    }
    return AgalBoolean.from(true);
  }
  if (value instanceof AgalPrimitive) {
    if (value instanceof AgalBoolean) return value;
    if (value instanceof AgalNumber) {
      if (value === AgalNumber.from(0)) return AgalBoolean.from(false);
      if (value === AgalNumber.from(NaN)) return AgalBoolean.from(false);
      return AgalBoolean.from(true);
    }
    return AgalBoolean.from(!!value.value);
  }
  return new AgalError(
    stack,
    `Se esperaba un Booleano pero se recibio un "${typeOf(
      value || AgalNull.from()
    )}"`
  ).throw();
}
export async function AgalRuntimeToAgalIterable(
  stack: IStack,
  value: AgalRuntime
): Promise<AgalList | AgalError> {
  if (value instanceof AgalComplex) {
    if (value instanceof AgalList) return value;
    const iter = value.get(stack, '__iterable__');
    if (iter instanceof AgalFunction) {
      const result = await iter.call(stack, '__iterable__', value);
      if (result instanceof AgalList) return result;
    }
  }
  if (value instanceof AgalPrimitive) {
    if (value instanceof AgalString)
      return AgalList.from(value.value.split(''));
    if (value instanceof AgalNumber)
      return AgalList.from([value.real, value.imaginary]);
  }
  return new AgalError(stack, `El valor no es iterable`).throw();
}
export async function AgalRuntimeToAgalString(
  stack: IStack,
  value: AgalRuntime
): Promise<AgalString | AgalError> {
  if (value instanceof AgalComplex) {
    const str = value.get(stack, '__cadena__');
    if (str instanceof AgalFunction) {
      const result = await str.call(stack, '__cadena__', value);
      if (result instanceof AgalString) return result;
      return new AgalError(
        stack,
        `Se esperaba un String pero se recibio un "${typeOf(
          result || AgalNull.from(true)
        )}"`
      ).throw();
    }
    return AgalString.from(value?.toString());
  }
  return AgalString.from(value?.toString());
}
export async function AgalRuntimeToAgalNumber(
  stack: IStack,
  value: AgalRuntime
): Promise<AgalNumber | AgalError> {
  if (value instanceof AgalComplex) {
    const num = value.get(stack, '__numerico__');
    if (num instanceof AgalFunction) {
      const result = await num.call(stack, '__numerico__', value);
      if (result instanceof AgalNumber) return result;
    }
    return AgalNumber.from(NaN);
  }
  if (value instanceof AgalPrimitive) {
    if (value instanceof AgalNumber) return value;
    if (value instanceof AgalBoolean)
      return AgalNumber.from(value.value ? 1 : 0);
    if (value instanceof AgalString) return AgalNumber.from(+value.value);
  }
  return new AgalError(
    stack,
    `Se esperaba un Numero pero se recibio un "${typeOf(
      value || AgalNull.from(true)
    )}"`
  ).throw();
}
export async function AgalRuntimeToConsoleIn(
  stack: IStack,
  value: AgalRuntime
): Promise<AgalString | AgalError> {
  if (value instanceof AgalComplex) {
    const num = value.get(stack, '__consolaEn__');
    if (num instanceof AgalFunction) {
      const result = await num.call(stack, '__consolaEn__', value);
      if (result instanceof AgalString) return result;
    }
    const data = await AgalRuntimeToAgalString(stack, value);
    if (data instanceof AgalError) return data.throw();
    return AgalString.from(colorize(data.value, FOREGROUND.CYAN));
  }
  if (value instanceof AgalPrimitive) {
    if (value instanceof AgalString)
      return AgalString.from(
        colorize(Deno.inspect(value.value), FOREGROUND.GREEN)
      );
    if (value instanceof AgalNumber || value instanceof AgalBoolean)
      return AgalString.from(colorize(value.toString(), FOREGROUND.YELLOW));
    if (value instanceof AgalNull)
      return AgalString.from(
        colorize(value.toString(), FOREGROUND.BRIGHT_YELLOW)
      );
  }
  return await AgalRuntimeToAgalString(stack, value);
}

function isValidKey(key: string) {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key);
}
export async function AgalRuntimeToConsole(
  stack: IStack,
  value: AgalRuntime
): Promise<AgalString | AgalError> {
  if (value instanceof AgalComplex) {
    const num = value.get(stack, '__consola__');
    if (num instanceof AgalFunction) {
      const result = await num.call(stack, '__consola__', value);
      if (result instanceof AgalString) return result;
    }
    if (value instanceof AgalClass || value instanceof AgalFunction)
      return AgalString.from(colorize(value.toString(), FOREGROUND.CYAN));
    if (value instanceof AgalList) {
      let data = '[';
      for (let i = 0; i < value.length; i++) {
        if (i > 0) data += ', ';
        if (data.length > 50) {
          data += `...${value.length - i} mas`;
          break;
        }
        const item = value.get(stack, i.toString())!;
        if (item instanceof AgalError) return item.throw();
        const str = await AgalRuntimeToConsoleIn(stack, item);
        if (str instanceof AgalError) return str.throw();
        data += str.value;
      }
      data += ']';
      if (value.type.startsWith('Objeto'))
        data = value.type.split(' ')[1] + ' ' + data;
      return AgalString.from(data);
    }
    if (value instanceof AgalDictionary) {
      let data = '{';
      const keys = value.keys();
      for (let i = 0; i < keys.length; i++) {
        if (i > 0) data += ', ';
        if (data.length > 50) {
          data += `...${keys.length - i} mas`;
          break;
        }
        const item = value.get(stack, keys[i])!;
        if (item instanceof AgalError) return item.throw();
        const str = await AgalRuntimeToConsoleIn(stack, item);
        if (str instanceof AgalError) return str.throw();
        data += `${
          isValidKey(keys[i])
            ? keys[i]
            : colorize(Deno.inspect(keys[i]), FOREGROUND.GREEN)
        }: ${str.value}`;
      }
      data += '}';
      if (value.type.startsWith('Objeto'))
        data = value.type.split(' ')[1] + data;
      return AgalString.from(data);
    }
    if (value instanceof AgalInstance){
      const __constructor__ = value.get(stack, '__constructor__')! as AgalClass;
      if(__constructor__.parent){
        const data = await AgalRuntimeToConsole(stack, __constructor__);
        if (data instanceof AgalError) return data.throw();
        return data;
      }
    }
    if (value instanceof AgalError) {
      const stack = StackToErrorString(value.stack);
      const type = colorize(value.name, FOREGROUND.RED);
      return AgalString.from(`${type}: ${value.message}\n${stack}`);
    }
  }
  if (value instanceof AgalString) return value;

  return await AgalRuntimeToConsoleIn(stack, value);
}

export async function AgalRuntimeWithPositive(
  stack: IStack,
  value: AgalRuntime
): Promise<AgalRuntime> {
  if (value instanceof AgalComplex) {
    const num = value.get(stack, '__positivo__');
    if (num instanceof AgalFunction) {
      const result = await num.call(stack, '__positivo__', value);
      if (result instanceof AgalRuntime) return result;
    }
  }
  return await AgalRuntimeToAgalNumber(stack, value);
}
export async function AgalRuntimeWithNegative(
  stack: IStack,
  value: AgalRuntime
): Promise<AgalRuntime> {
  if (value instanceof AgalComplex) {
    const num = value.get(stack, '__negativo__');
    if (num instanceof AgalFunction) {
      const result = await num.call(stack, '__negativo__', value);
      if (result instanceof AgalRuntime) return result;
    }
  }
  if (value instanceof AgalPrimitive) {
    const number = await AgalRuntimeToAgalNumber(stack, value);
    if (number instanceof AgalError) return number.throw();
    return AgalNumber.from(ComplexNumber.from(-number.real, -number.imaginary));
  }
  return new AgalError(
    stack,
    `Se esperaba un Numero pero se recibio un "${typeOf(
      value || AgalNull.from(true)
    )}"`
  ).throw();
}
export async function AgalRuntimeWithIncrement(
  stack: IStack,
  value: AgalRuntime
): Promise<AgalRuntime> {
  if (value instanceof AgalComplex) {
    const num = value.get(stack, '__incremento__');
    if (num instanceof AgalFunction) {
      const result = await num.call(stack, '__incremento__', value);
      if (result instanceof AgalRuntime) return result;
    }
  }
  const number = await AgalRuntimeToAgalNumber(stack, value);
  if (number instanceof AgalError) return number.throw();
  return AgalNumber.from(ComplexNumber.from(number.real + 1, number.imaginary));
}
export async function AgalRuntimeWithDecrement(
  stack: IStack,
  value: AgalRuntime
): Promise<AgalRuntime> {
  if (value instanceof AgalComplex) {
    const num = value.get(stack, '__decremento__');
    if (num instanceof AgalFunction) {
      const result = await num.call(stack, '__decremento__', value);
      if (result instanceof AgalRuntime) return result;
    }
  }
  const number = await AgalRuntimeToAgalNumber(stack, value);
  if (number instanceof AgalError) return number.throw();
  return AgalNumber.from(ComplexNumber.from(number.real - 1, number.imaginary));
}

export async function AgalRuntimeWithUnary(
  stack: IStack,
  value: AgalRuntime,
  operator: string
): Promise<AgalRuntime> {
  if (operator === '+') return await AgalRuntimeWithPositive(stack, value);
  if (operator === '-') return await AgalRuntimeWithNegative(stack, value);
  if (operator === '!') {
    const bool = await AgalRuntimeToAgalBoolean(stack, value);
    if (bool instanceof AgalError) return bool.throw();
    return AgalBoolean.from(!bool.value);
  }
  if (operator === '++') return await AgalRuntimeWithIncrement(stack, value);
  if (operator === '--') return await AgalRuntimeWithDecrement(stack, value);
  return new AgalSyntaxError(stack, `Operador "${operator}" invalido`).throw();
}

export async function AgalRuntimeWithAddition(
  stack: IStack,
  left: AgalRuntime,
  right: AgalRuntime
) {
  if (left instanceof AgalComplex) {
    const num = left.get(stack, '__mas__');
    if (num instanceof AgalFunction) {
      const result = await num.call(stack, '__mas__', left, right);
      if (result instanceof AgalRuntime) return result;
    }
  }
  if (left instanceof AgalPrimitive) {
    if (left instanceof AgalString) {
      const rightString = await AgalRuntimeToAgalString(stack, right);
      if (rightString instanceof AgalError) return rightString.throw();
      return AgalString.from(left.value + rightString.value);
    }
    const leftNumber = await AgalRuntimeToAgalNumber(stack, left);
    if (leftNumber instanceof AgalError) return leftNumber.throw();
    const rightNumber = await AgalRuntimeToAgalNumber(stack, right);
    if (rightNumber instanceof AgalError) return rightNumber.throw();
    return AgalNumber.from(SuperMath.add(leftNumber.value, rightNumber.value));
  }
}
export async function AgalRuntimeWithSubtraction(
  stack: IStack,
  left: AgalRuntime,
  right: AgalRuntime
) {
  if (left instanceof AgalComplex) {
    const num = left.get(stack, '__menos__');
    if (num instanceof AgalFunction) {
      const result = await num.call(stack, '__menos__', left, right);
      if (result instanceof AgalRuntime) return result;
    }
  }
  if (left instanceof AgalPrimitive) {
    if (left instanceof AgalString) {
      const rightString = await AgalRuntimeToAgalString(stack, right);
      if (rightString instanceof AgalError) return rightString.throw();
      return AgalString.from(left.value.replace(rightString.value, ''));
    }
    const leftNumber = await AgalRuntimeToAgalNumber(stack, left);
    if (leftNumber instanceof AgalError) return leftNumber.throw();
    const rightNumber = await AgalRuntimeToAgalNumber(stack, right);
    if (rightNumber instanceof AgalError) return rightNumber.throw();
    return AgalNumber.from(
      SuperMath.subtract(leftNumber.value, rightNumber.value)
    );
  }
}
export async function AgalRuntimeWithMultiplication(
  stack: IStack,
  left: AgalRuntime,
  right: AgalRuntime
) {
  if (left instanceof AgalComplex) {
    const num = left.get(stack, '__por__');
    if (num instanceof AgalFunction) {
      const result = await num.call(stack, '__por__', left, right);
      if (result instanceof AgalRuntime) return result;
    }
  }
  if (left instanceof AgalPrimitive) {
    if (left instanceof AgalString) {
      const rightNumber = await AgalRuntimeToAgalNumber(stack, right);
      if (rightNumber instanceof AgalError) return rightNumber.throw();
      return AgalString.from(left.value.repeat(rightNumber.real) || left.value);
    }
    const leftNumber = await AgalRuntimeToAgalNumber(stack, left);
    if (leftNumber instanceof AgalError) return leftNumber.throw();
    const rightNumber = await AgalRuntimeToAgalNumber(stack, right);
    if (rightNumber instanceof AgalError) return rightNumber.throw();
    return AgalNumber.from(
      SuperMath.multiply(leftNumber.value, rightNumber.value)
    );
  }
}
export async function AgalRuntimeWithDivision(
  stack: IStack,
  left: AgalRuntime,
  right: AgalRuntime
) {
  if (left instanceof AgalComplex) {
    const num = left.get(stack, '__entre__');
    if (num instanceof AgalFunction) {
      const result = await num.call(stack, '__entre__', left, right);
      if (result instanceof AgalRuntime) return result;
    }
  }
  if (left instanceof AgalPrimitive) {
    if (left instanceof AgalString) {
      const rightNumber = await AgalRuntimeToAgalNumber(stack, right);
      if (rightNumber instanceof AgalError) return rightNumber.throw();
      const int = parseInt(rightNumber.real.toString());
      let str = '';
      for (let i = 0; i < rightNumber.real; i++)
        if (i % int == 0) str += left.value[i];
      return AgalString.from(str);
    }
    const leftNumber = await AgalRuntimeToAgalNumber(stack, left);
    if (leftNumber instanceof AgalError) return leftNumber.throw();
    const rightNumber = await AgalRuntimeToAgalNumber(stack, right);
    if (rightNumber instanceof AgalError) return rightNumber.throw();
    return AgalNumber.from(
      SuperMath.divide(leftNumber.value, rightNumber.value)
    );
  }
}
export async function AgalRuntimeWithModule(
  stack: IStack,
  left: AgalRuntime,
  right: AgalRuntime
) {
  if (left instanceof AgalComplex) {
    const num = left.get(stack, '__modulo__');
    if (num instanceof AgalFunction) {
      const result = await num.call(stack, '__modulo__', left, right);
      if (result instanceof AgalRuntime) return result;
    }
  }
  if (left instanceof AgalPrimitive) {
    if (left instanceof AgalString) {
      const rightNumber = await AgalRuntimeToAgalNumber(stack, right);
      if (rightNumber instanceof AgalError) return rightNumber.throw();
      const int = parseInt(rightNumber.real.toString());
      let str = '';
      for (let i = 0; i < rightNumber.real; i++)
        if (i % int != 0) str += left.value[i];
      return AgalString.from(str);
    }
    const leftNumber = await AgalRuntimeToAgalNumber(stack, left);
    if (leftNumber instanceof AgalError) return leftNumber.throw();
    const rightNumber = await AgalRuntimeToAgalNumber(stack, right);
    if (rightNumber instanceof AgalError) return rightNumber.throw();
    return AgalNumber.from(
      SuperMath.modulo(leftNumber.value, rightNumber.value)
    );
  }
}
export async function AgalRuntimeWithAnd(
  stack: IStack,
  left: AgalRuntime,
  right: AgalRuntime
) {
  const leftBoolean = await AgalRuntimeToAgalBoolean(stack, left);
  if (leftBoolean instanceof AgalError) return leftBoolean.throw();
  if (!leftBoolean.value) return left;
  const rightBoolean = await AgalRuntimeToAgalBoolean(stack, right);
  if (rightBoolean instanceof AgalError) return rightBoolean.throw();
  return right;
}
export async function AgalRuntimeWithOr(
  stack: IStack,
  left: AgalRuntime,
  right: AgalRuntime
) {
  const leftBoolean = await AgalRuntimeToAgalBoolean(stack, left);
  if (leftBoolean instanceof AgalError) return leftBoolean.throw();
  if (leftBoolean.value) return left;
  const rightBoolean = await AgalRuntimeToAgalBoolean(stack, right);
  if (rightBoolean instanceof AgalError) return rightBoolean.throw();
  return right;
}
export async function AgalRuntimeWithEquals(
  stack: IStack,
  left: AgalRuntime,
  right: AgalRuntime
) {
  if (left instanceof AgalComplex) {
    const num = left.get(stack, '__igual__');
    if (num instanceof AgalFunction) {
      const result = await num.call(stack, '__igual__', left, right);
      if (result instanceof AgalBoolean) return result;
      return new AgalTypeError(
        stack,
        `Se esperaba un Booleano pero se recibio un "${typeOf(
          result || AgalNull.from(true)
        )}"`
      ).throw();
    }
  }

  return AgalBoolean.from(left === right);
}

export async function AgalRuntimeWithBinary(
  stack: IStack,
  left: AgalRuntime,
  operator: string,
  right: AgalRuntime
): Promise<AgalRuntime> {
  let result: AgalRuntime | AgalError | undefined;
  if (operator === '+')
    result = await AgalRuntimeWithAddition(stack, left, right);
  if (operator === '-')
    result = await AgalRuntimeWithSubtraction(stack, left, right);
  if (operator === '*')
    result = await AgalRuntimeWithMultiplication(stack, left, right);
  if (operator === '/')
    result = await AgalRuntimeWithDivision(stack, left, right);
  if (operator === '%')
    result = await AgalRuntimeWithModule(stack, left, right);
  if (operator === '&') result = await AgalRuntimeWithAnd(stack, left, right);
  if (operator === '|') result = await AgalRuntimeWithOr(stack, left, right);
  if (operator === '==')
    result = await AgalRuntimeWithEquals(stack, left, right);
  if (operator === '!='){
    const result = await AgalRuntimeWithEquals(stack, left, right);
    if(result instanceof AgalError) return result.throw();
    return AgalBoolean.from(!result.value);
  }
  if(result) return result;
  if (operator === '===') return AgalBoolean.from(left === right);
  if (operator === '!==') return AgalBoolean.from(left !== right);
  return new AgalSyntaxError(
    stack,
    `No se pudo realizar "${typeOf(left)} ${operator} ${typeOf(right)}"`
  ).throw();
}

export function StmtToString(stmt: Stmt): string {
  switch (stmt.kind) {
    case STATEMENTS_TYPE.VAR_DECLARATION: {
      const keyword = stmt.constant ? 'const' : 'def';
      const name = stmt.identifier;
      const value = stmt.value && StmtToString(stmt.value);
      if (value) return `${keyword} ${name} = ${value}`;
      return `${keyword} ${name}`;
    }
    case STATEMENTS_TYPE.RETURN_STATEMENT: {
      const value = stmt.value && StmtToString(stmt.value);
      if (value) return `ret ${value}`;
      return `ret`;
    }
    case STATEMENTS_TYPE.BREAK_STATEMENT:
      return `rom`;

    case STATEMENTS_TYPE.CONTINUE_STATEMENT:
      return `cont`;
    case STATEMENTS_TYPE.IMPORT_STATEMENT: {
      const path = stmt.path;
      const name = stmt.as;
      const _with = stmt.with && StmtToString(stmt.with);
      let data = `importar "${path}"`;
      if (name) data += ` como ${name}`;
      if (_with) data += ` con ${_with}`;
      return data;
    }
    case STATEMENTS_TYPE.EXPORT_STATEMENT: {
      const name = stmt.identifier === '<exportable>' ? '' : stmt.identifier;
      const value = stmt.value && StmtToString(stmt.value);
      let data = `exportar ${value}`;
      if (name) data += ` como ${name}`;
      return data;
    }
    case LITERALS_TYPE.OBJECT_LITERAL:
      return '{...}';
    case LITERALS_TYPE.ARRAY_LITERAL:
      return '[...]';
    case LITERALS_TYPE.NUMERIC_LITERAL:
      return stmt.value.toString();
    case LITERALS_TYPE.STRING_LITERAL:
      return `${Deno.inspect(stmt.value)}`;
    case LITERALS_TYPE.ITERABLE_LITERAL:
      return `...${stmt.identifier}`;
    case LITERALS_TYPE.IDENTIFIER:
      return stmt.symbol;
    case BLOCK_TYPE.FUNCTION_DECLARATION: {
      const name = stmt.identifier;
      return `fn ${name}(...){ ... }`;
    }
    case BLOCK_TYPE.IF_STATEMENT: {
      const condition = StmtToString(stmt.condition);
      let data = `si (${condition}) { ... }`;
      if (stmt.else) data += ` ent { ... }`;
      return data;
    }
    case BLOCK_TYPE.WHILE_STATEMENT:
      return `mien (${StmtToString(stmt.condition)}) { ... }`;
    case BLOCK_TYPE.CLASS_DECLARATION:
      return `clase ${stmt.identifier} { ... }`;
    case BLOCK_TYPE.PROGRAM:
      return `programa { ... }`;
    case BLOCK_TYPE.TRY: {
      let data = `intentar { ... }`;
      if (stmt.catch) data += ` capturar { ... }`;
      if (stmt.finally) data += ` finalmente { ... }`;
      return data;
    }
    case EXPRESSIONS_TYPE.ASSIGNMENT_EXPR: {
      const name = StmtToString(stmt.assignee);
      const value = StmtToString(stmt.value);
      return `${name} = ${value}`;
    }
    case EXPRESSIONS_TYPE.MEMBER_EXPR: {
      const object = StmtToString(stmt.object);
      const property = StmtToString(stmt.property);
      if (stmt.computed) return `${object}[${property}]`;
      return `${object}.${property}`;
    }
    case EXPRESSIONS_TYPE.BINARY_EXPR:
      return `${StmtToString(stmt.left)} ${stmt.operator} ${StmtToString(
        stmt.right
      )}`;
    case EXPRESSIONS_TYPE.CALL_EXPR:
      return `${StmtToString(stmt.callee)}(...)`;
    case EXPRESSIONS_TYPE.UNARY_EXPR:
      return `${stmt.operator}${StmtToString(stmt.value)}`;
    default:
      return '';
  }
}

export function StackToErrorString(stack: IStack): string {
  let str = '\tEn ';
  if (stack.value === null) return '';
  if (stack.value.kind === BLOCK_TYPE.PROGRAM) return '';
  str += StmtToString(stack.value);
  return (
    str +
    ` (${colorize(stack.value.file, FOREGROUND.CYAN)}:${colorize(
      stack.value.row + '',
      FOREGROUND.YELLOW
    )}:${colorize(stack.value.col + '', FOREGROUND.YELLOW)})\n` +
    StackToErrorString(stack.next!)
  );
}
