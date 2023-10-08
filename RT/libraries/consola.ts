import AgalFunction from 'magal/RT/values/complex/AgalFunction.ts';
import AgalObject from 'magal/RT/values/complex/AgalDictionary.ts';
import { Libraries } from "magal/RT/libraries/register.ts";
import { AgalRuntimeToConsole } from "magal/RT/utils.ts";
import { AgalError } from "magal/RT/values/complex/index.ts";
import AgalString from "magal/RT/values/primitive/AgalString.ts";
import { defaultStack } from "magal/RT/stack.ts";

const data: string[] = [];

function writeln(str: string) {
	console.log(str)
	data.push(str+'\n');
}

export default function (
	register: Libraries
) {
	register.set('consola', ()=>{
		const pintar = AgalFunction.from(async ( _stack,_name, _este, ...args) => {
			const data = [];
			for (const arg of args) {
				const value = await AgalRuntimeToConsole(_stack, arg)
				if(value instanceof AgalError) return value.throw()
				data.push(value);
			}
			writeln(data.filter(Boolean).join(' '));
			return null;
		});
		pintar.set(defaultStack, 'nombre', AgalString.from('consola.pintar'))
		const limpiar = AgalFunction.from(() => {
			console.clear();
			data.length = 0;
			return null;
		});
		limpiar.set(defaultStack, 'nombre', AgalString.from('consola.limpiar'))
	
		const mod = AgalObject.from({limpiar, pintar});
		return mod;
	});
}
