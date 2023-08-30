# Declaraciones
## Declarar variable
```
def miVariable = 1
```

## Declarar constante
```
const miConstante = 1
```

## Declarar función
```
fn miFuncion(a,b) {
  ret a + b
}
```

## Declarar Clase
```
clase MiClase {
  constructor(a,b) {
    este.a = a
    este.b = b
  }
  miMetodo() {
    ret this.a + this.b
  }
  est metodoEstatico() {
    ret 1
  }
}
```
# Tipos de dato
## Objeto
```
{
  a: 1
  b: 2
}
```
## Lista
```
[1,2,3]
```
## Buleano
```
falso
cierto
```
## Nulo
```
nulo
```
## Numero
```
1
1ie
```
## Cadena
```
'Hola'
"Hola"
```

# Atrapador
```
intentar{
  "hacer algo"
}capturar(error){
  "manejar el error"
}
```

# Condicional si entonces
```
si(condicion){"si condicion es cierto ejecutar esto"}
ent {"si no es cierto entonces ejecutar esto"}
```
# Bucle mientras
```
mien(cierto){
  "código"
}
```

# Global
```
global.esteGlobal = global
global.global = global
global.salir = fn salir(){ <código nativo> }
global.pintar = fn pintar(...args){ <código nativo> }
global.limpiar = fn limpiar(){ <código nativo> }
global.analizar = fn analizar(cadena){ <código nativo> }
global.eval = fn eval(cadena){ <código nativo> }

global.Lista = clase Lista{
  constructor(){ <código nativo> }
  est de(...args){ <código nativo> }
}
global.Funcion = clase Funcion{
  constructor(){ <código nativo> }
}
global.Objeto = clase Objeto{
  constructor(){ <código nativo> }
  est llaves(){ <código nativo> }
}
global.Buleano = clase Buleano{
  constructor(){ <código nativo> }
}
global.Numero = clase Numero{
  constructor(){ <código nativo> }
}
global.Cadena = clase Cadena{
  constructor(){ <código nativo> }
}
global.Error = clase Error{
  constructor(){ <código nativo> }
}
global.ErrorTipo = clase ErrorTipo extiende Error{
  constructor(){ <código nativo> }
}
global.ErrorReferencia = clase ErrorReferencia extiende Error{
  constructor(){ <código nativo> }
}
global.ErrorSintaxis = clase ErrorSintaxis extiende Error{
  constructor(){ <código nativo> }
}
global.ErrorTokenizar = clase ErrorTokenizar extiende Error{
  constructor(){ <código nativo> }
}
```