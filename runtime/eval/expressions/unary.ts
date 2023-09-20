import { multiply } from 'aga//super_math/functions.ts';
import {
  EXPRESSIONS_TYPE,
  LITERALS_TYPE,
  Stmt,
  UnaryExpr,
} from 'magal/frontend/ast.ts';
import Environment from 'magal/runtime/Environment.class.ts';
import { IStack, evaluate } from 'magal/runtime/interpreter.ts';

export default async function unary(
  unary: UnaryExpr,
  env: Environment,
  stack: IStack
) {
  const { operator, value, col, row, file } = unary;
  if (operator === '++' || operator === '--') {
    const data: Stmt = {
      kind: EXPRESSIONS_TYPE.ASSIGNMENT_EXPR,
      assignee: value,
      value: {
        kind: EXPRESSIONS_TYPE.BINARY_EXPR,
        left: value,
        operator: operator[0],
        right: {
          kind: LITERALS_TYPE.NUMERIC_LITERAL,
          value: 1,
          col,
          row,
          file,
        },
        col,
        row,
        file,
      },
      col,
      row,
      file,
    };
    return await evaluate(data, env, stack);
  }
  const right = await evaluate(value, env, stack);
  if (operator === '!') return right.aBuleano();
  if (operator === '-') return multiply(await right.aNumero(), -1);
  if (operator === '+') return right.aNumero();
}
