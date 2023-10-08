import { Stmt } from "magal/frontend/ast.ts";

export interface IStack {
  value: Stmt;
  next: IStack | null;
}
export const defaultStack: IStack = {
	value: null as unknown as Stmt,
	next: null,
};