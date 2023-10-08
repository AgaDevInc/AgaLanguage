import { Libraries } from "magal/RT/libraries/register.ts";
import AgalDictionary from "magal/RT/values/complex/AgalDictionary.ts";
import { defaultStack } from "magal/RT/stack.ts";
import Dicionario from "magal/RT/libraries/clases/Dicionario.ts";
import Buleano from "magal/RT/libraries/clases/Buleano.ts";
import Funcion from "magal/RT/libraries/clases/Funcion.ts";
import Cadena from "magal/RT/libraries/clases/Cadena.ts";
import Numero from "magal/RT/libraries/clases/Numero.ts";
import Error from "magal/RT/libraries/clases/Error.ts";
import Lista from "magal/RT/libraries/clases/Lista.ts";

export default function (register: Libraries) {
  Dicionario(register);
  Funcion(register);
  Buleano(register);
  Cadena(register);
  Numero(register);
  Error(register);
  Lista(register);
  register.set('clases', async () => {
    const clases = new AgalDictionary();
    clases.set(defaultStack,'Dicionario', await register.get('clases/Dicionario'));
    clases.set(defaultStack,'Buleano', await register.get('clases/Buleano'));
    clases.set(defaultStack,'Funcion', await register.get('clases/Funcion'));
    clases.set(defaultStack,'Cadena', await register.get('clases/Cadena'));
    clases.set(defaultStack,'Numero', await register.get('clases/Numero'));
    clases.set(defaultStack,'Error', await register.get('clases/Error'));
    clases.set(defaultStack,'Lista', await register.get('clases/Lista'));
    return clases;
  });
}