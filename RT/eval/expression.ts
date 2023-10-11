import {
  AssignmentExpr,
  BinaryExpr,
  CallExpr,
  EXPRESSIONS_TYPE,
  Expr,
  LITERALS_TYPE,
  MemberExpr,
  UnaryExpr,
} from 'magal/frontend/ast.ts';
import Enviroment from 'magal/RT/Enviroment.ts';
import { IStack } from 'magal/RT/stack.ts';
import interpreter from 'magal/RT/interpreter.ts';
import AgalError, {
  AgalReferenceError,
  AgalSyntaxError,
} from 'magal/RT/values/complex/AgalError.ts';
import {
  AgalRuntimeToAgalString,
  AgalRuntimeWithBinary,
  AgalRuntimeWithUnary,
} from 'magal/RT/utils.ts';
import AgalFunction from 'magal/RT/values/complex/AgalFunction.ts';
import AgalRuntime from 'magal/RT/values/class.ts';
import { AgalNull } from 'magal/RT/values/primitive/index.ts';

function getName(exp: Expr): string {
  if (!exp) return '';
  if (exp.kind === LITERALS_TYPE.IDENTIFIER) return exp.symbol;
  if (exp.kind === EXPRESSIONS_TYPE.ASSIGNMENT_EXPR)
    return getName(exp.assignee);
  return '';
}

export async function assignment(
  node: AssignmentExpr,
  env: Enviroment,
  stack: IStack
) {
  const val = await interpreter(node.value, env, stack);
  if (val instanceof AgalError && val.throwned) return val;
  if (!node.assignee) return val;
  if (node.assignee.kind === EXPRESSIONS_TYPE.MEMBER_EXPR) {
    const obj = await interpreter(node.assignee.object, env, stack);
    if (obj instanceof AgalError && obj.throwned) return obj;
    if (node.assignee.property.kind === 'Identifier' && !node.assignee.computed)
      return obj.set(stack, node.assignee.property.symbol, val);
    const preKey = await interpreter(node.assignee.property, env, stack);
    if (preKey instanceof AgalError && preKey.throwned) return preKey.throw();
    const key = await AgalRuntimeToAgalString(stack, preKey);
    if (key instanceof AgalError) return key.throw();
    obj.set(stack, key.value, val);
    return val;
  }
  const name = getName(node.assignee);
  if (!name)
    return new AgalSyntaxError(stack, `Nombre de variable invalido`).throw();
  return env.edit(name, stack, val, node);
}
export async function call(call: CallExpr, env: Enviroment, stack: IStack) {
  const fn = await interpreter(call.callee, env, stack);
  if (fn instanceof AgalError && fn.throwned) return fn;
  const este =
    call.callee.kind === EXPRESSIONS_TYPE.MEMBER_EXPR
      ? await interpreter(call.callee.object, env, stack)
      : fn;
  const name =
    (call.callee.kind === EXPRESSIONS_TYPE.MEMBER_EXPR
      ? call.callee.property.kind === LITERALS_TYPE.IDENTIFIER
        ? call.callee.property.symbol
        : await interpreter(call.callee.property, env, stack)
      : fn instanceof AgalFunction
      ? fn.get(stack, 'nombre')
      : '') || '';
  if (este instanceof AgalError && este.throwned) return este;
  if (fn === null)
    new AgalReferenceError(stack, '"nulo" no es una función').throw();
  const args = [];
  for (const arg of call.args) {
    const data = await interpreter(arg, env, stack);
    if (data instanceof AgalError && data.throwned) return data;
    args.push(data);
  }

  return (
    (await fn.call(stack, name.toString(), este, ...args)) ||
    AgalNull.from(true)
  );
}
export async function member(
  node: MemberExpr,
  env: Enviroment,
  stack: IStack
): Promise<AgalRuntime> {
  const obj = await interpreter(node.object, env, stack);
  if (obj instanceof AgalError && obj.throwned) return obj;
  if (node.property.kind === LITERALS_TYPE.IDENTIFIER && node.computed === false)
    return obj.get(stack, node.property.symbol) || AgalNull.from(true);
  const preKey = await interpreter(node.property, env, stack);
  if (preKey instanceof AgalError && preKey.throwned) return preKey.throw();
  const key = await AgalRuntimeToAgalString(stack, preKey);
  if (key instanceof AgalError) return key.throw();
  return obj.get(stack, key.value) || AgalNull.from(true);
}
export async function unary(
  node: UnaryExpr,
  env: Enviroment,
  stack: IStack
): Promise<AgalRuntime> {
  const operator = node.operator;
  const val = await interpreter(node.value, env, stack);
  if (val instanceof AgalError && val.throwned) return val;
  return AgalRuntimeWithUnary(stack, val, operator);
}
export async function binary(
  node: BinaryExpr,
  env: Enviroment,
  stack: IStack
): Promise<AgalRuntime> {
  const operator = node.operator;
  const left = await interpreter(node.left, env, stack);
  if (left instanceof AgalError && left.throwned) return left;
  const right = await interpreter(node.right, env, stack);
  if (right instanceof AgalError && right.throwned) return right;
  return AgalRuntimeWithBinary(stack, left, operator, right);
}
