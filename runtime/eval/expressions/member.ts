import type { MemberExpr } from "../../../frontend/ast.ts";
import type Environment from "../../Environment.class.ts";
import { IStack, evaluate } from "../../interpreter.ts";

export default async function member(member: MemberExpr, env: Environment, stack: IStack){
  const { object, property } = member;
  const obj = await evaluate(object, env, stack);
  const prop: string = property.kind === 'PropertyIdentifier' ? property.symbol : (await evaluate(property,env,stack)).toString();
  const result = await obj.get(prop);
  
  return result as NonNullable<typeof result>;
}