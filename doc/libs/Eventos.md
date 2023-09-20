# Eventos
```agal	
importar 'Eventos' como Eventos;
const eventos = Eventos();
eventos.en('click', funcion(...args) {
    pintar(args);
});
eventos.emitir('click', 'hola', 'mundo');
```
Output:
```
['hola', 'mundo']
```

## Clases
### Eventos
```agal
clase Eventos {
  __constructor__() # Eventos
  en(nombre, funcion) # Eventos
  emitir(nombre, ...args) # Eventos
}
```