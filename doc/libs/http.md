# http
```agal	
importar 'http' como http;
const data = http.cliente('https://google.com'); # http.Respuesta
pintar(data); # http.Respuesta
```

## Clases
### Respuesta
```agal
clase Respuesta {
  __constructor__(codigo, cuerpo, encabezados) # Respuesta
  estatus # Numero
  cabeceras # Objeto
  url # Cadena
  cuerpo() # ListaEnteros
  texto() # Cadena
  json() # Objeto
}
```
### Peticion
```agal
clase Peticion {
  __constructor__(url, {
    metodo = Cadena,
    cabeceras = Objeto,
    cuerpo = ListaEnteros
    cache = Cadena
  }) # Peticion
  url # Cadena
  metodo # Cadena
  cabeceras # Objeto
}
```

## Funciones
### cliente
```agal
fn cliente(url, {
  metodo = Cadena,
  cabeceras = Objeto,
  cuerpo = ListaEnteros
  cache = Cadena
}) # Respuesta
```
### servidor
```agal
fn servidor(puerto, funcion_peticion, funcion_error) # Nulo
```