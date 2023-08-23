export default class AgaError extends Error {
	constructor(
		name: string = 'AgaError',
		public col: number,
		public row: number,
		message: string
	) {
		super(message);
		this.name = name;
	}
	throw() {
		throw this;
	}
}
export class ParserError extends AgaError{
  constructor(
    public col: number,
    public row: number,
    message: string
  ) {
    super("ParserError", col, row, message);
  }
}
export class InvalidSyntaxError extends AgaError{
  constructor(
    public col: number,
    public row: number,
    message: string
  ) {
    super("InvalidSyntaxError", col, row, message);
  }
}
export class KeywordAssignmentError extends AgaError{
	constructor(
		public col: number,
		public row: number,
		message: string
	) {
		super("KeywordAssignmentError", col, row, message);
	}
}
export class VariableAlreadyDeclaredError extends AgaError{
	constructor(
		public col: number,
		public row: number,
		message: string
	) {
		super("VariableAlreadyDeclaredError", col, row, message);
	}
}
export class ConstantAssignmentError extends AgaError{
	constructor(
		public col: number,
		public row: number,
		message: string
	) {
		super("ConstantAssignmentError", col, row, message);
	}
}
export class VariableNotDeclaredError extends AgaError{
	constructor(
		public col: number,
		public row: number,
		message: string
	) {
		super("VariableNotDeclaredError", col, row, message);
	}
}
export class NotCallableError extends AgaError{
	constructor(
		public col: number,
		public row: number,
		message: string
	) {
		super("NotCallableError", col, row, message);
	}
}