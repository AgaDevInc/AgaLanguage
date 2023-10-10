import {
  BLOCK_TYPE,
  EXPRESSIONS_TYPE,
  ErrorType,
  LITERALS_TYPE,
  STATEMENTS_TYPE,
  Stmt,
} from 'magal/frontend/ast.ts';
import Enviroment from 'magal/RT/Enviroment.ts';
import type { IStack } from 'magal/RT/stack.ts';
import AgalRuntime from 'magal/RT/values/class.ts';
import AgalNull from 'magal/RT/values/primitive/AgalNull.ts';
import * as eval from 'magal/RT/eval/index.ts';
import AgalError, {
  AgalSyntaxError,
  AgalTokenizeError,
} from 'magal/RT/values/complex/AgalError.ts';

export default async function interpreter(
  node: Stmt | Stmt[],
  env: Enviroment,
  stack: IStack | null
): Promise<AgalRuntime> {
  if (!node) return AgalNull.from(true);
  if (Array.isArray(node)) {
    let result: AgalRuntime | null = null;
    for (const Node of node) {
      if(!Node) continue;
      const Stack =
        Node === stack?.value ? stack : { value: Node, next: stack };
      result = await interpreter(Node, env, Stack);
      if (Node.kind === 'ReturnStatement') return result;
      if (result instanceof AgalError) return result;
    }
    return AgalNull.from(true);
  }
  const Stack = node === stack?.value ? stack : { value: node, next: stack };
  switch (node.kind) {
    case 'Error': {
      if (node.type === ErrorType.ParserError)
        return new AgalSyntaxError(Stack, node.message).throw();
      if (node.type === ErrorType.TokenizerError)
        return new AgalTokenizeError(Stack, node.message).throw();
      return new AgalError(Stack, node.message).throw();  
    }
    case LITERALS_TYPE.STRING_LITERAL:
      return eval.literal.string(node, env, Stack);
    case LITERALS_TYPE.NUMERIC_LITERAL:
      return eval.literal.numeric(node, env, Stack);
    case LITERALS_TYPE.IDENTIFIER:
      return eval.literal.identifier(node, env, Stack);
    case LITERALS_TYPE.ITERABLE_LITERAL:
      return await eval.literal.iterable(node, env, Stack);
    case LITERALS_TYPE.OBJECT_LITERAL:
      return await eval.literal.dictionary(node, env, Stack);
    case LITERALS_TYPE.ARRAY_LITERAL:
      return await eval.literal.list(node, env, Stack);

    case STATEMENTS_TYPE.EXPORT_STATEMENT:
      return await eval.statement._export(node, env, Stack);
    case STATEMENTS_TYPE.IMPORT_STATEMENT:
      return await eval.statement._import(node, env, Stack);
    case STATEMENTS_TYPE.RETURN_STATEMENT:
      return await eval.statement._return(node, env, Stack);
    case STATEMENTS_TYPE.VAR_DECLARATION:
      return await eval.declaration.variable(node, env, Stack);

    case BLOCK_TYPE.PROGRAM:
      return await eval.program(node, env, Stack);
    case BLOCK_TYPE.FUNCTION_DECLARATION:
      return eval.declaration._function(node, env, Stack);
    case BLOCK_TYPE.CLASS_DECLARATION:
      return eval.declaration._class(node, env, Stack);
    case BLOCK_TYPE.IF_STATEMENT:
      return await eval.statement._if(node, env, Stack);
    case BLOCK_TYPE.TRY:
      return await eval.statement._try(node, env, Stack);
    case BLOCK_TYPE.WHILE_STATEMENT:
      return await eval.statement._while(node, env, Stack);
    case EXPRESSIONS_TYPE.ASSIGNMENT_EXPR:
      return await eval.expression.assignment(node, env, Stack);
    case EXPRESSIONS_TYPE.MEMBER_EXPR:
      return await eval.expression.member(node, env, Stack);
    case EXPRESSIONS_TYPE.BINARY_EXPR:
      return await eval.expression.binary(node, env, Stack);
    case EXPRESSIONS_TYPE.CALL_EXPR:
      return await eval.expression.call(node, env, Stack);
    case EXPRESSIONS_TYPE.UNARY_EXPR:
      return await eval.expression.unary(node, env, Stack);
    default:
      return AgalNull.from();
  }
}
