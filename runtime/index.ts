export {
	agal,
	evalLine,
	getModule,
	getModuleScope,
	default as AgalEval,
} from 'magal/runtime/eval.ts';
export * as global from 'magal/runtime/global/index.ts';
export * as libraries from 'magal/runtime/libraries/index.ts';
export * as interpreter from 'magal/runtime/interpreter.ts';
export * as values from 'magal/runtime/values/index.ts';
export { default as Environment } from 'magal/runtime/Environment.class.ts';
