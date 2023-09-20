# Sintaxis

## Comentarios
```agal
# Comentarios
pintar('codigo') # Comentario despues de codigo
```

## Variables
```agal
const valor_contante = 'Este valor no se puede cambiar';
def valor_variable = 'Este valor si se puede modificar';

valor_variable = 'La variable cambio';
pintar(valor_variable); # La variable cambio

def valor_no_asignado;
pintar(valor_no_asignado) # nulo
valor_no_asignado = 'Se asigna despues';
```

## Operadores
### Operadores Aritmeticos
| Operacion | Descripcion     |
|-----------|-----------------|
|  +        |  Suma           |
|  -        |  Resta          |
|  *        |  Multiplicacion |
|  /        |  Division       |
|  %        |  Modulo         |
|  ^        |  Potencia       |

### Operadores de Modificación
| Operacion | Descripcion     |
|-----------|-----------------|
|  ++       |  Incremento     |
|  --       |  Decremento     |

### Operadores de Comparación
| Operacion | Descripcion     |
|-----------|-----------------|
|  ==       |  Igual          |
|  !=       |  Diferente      |
|  >        |  Mayor          |
|  <        |  Menor          |
|  >=       |  Mayor o Igual  |
|  <=       |  Menor o Igual  |
|  &&       |  Y              |
|  \|\|     |  O              |
|  ===      |  Identico       |
|  !==      |  No Identico    |
|  =        |  Asignación     |

## Condicionales
```agal
def edad = 18;
si(edad >= 18) {
    pintar('Eres mayor de edad');
} entonces {
    pintar('Eres menor de edad');
}
```

## Ciclos
### Ciclo Mientras
```agal
def contador = 0;
mientras(contador < 10) {
    pintar(contador);
    ++contador;
}
```

## Funciones
```agal
def suma(a, b) {
    regresa a + b;
}

pintar(suma(1, 2)); # 3
```

## Clases
```agal
clase Persona {
    nombre;
    edad;

    __constructor__(nombre, edad) {
        this.nombre = nombre;
        this.edad = edad;
    }

    saludar() {
        pintar('Hola, mi nombre es ' + this.nombre);
    }
}

def persona = Persona('Juan', 18);
persona.saludar();
```

## Listas
```agal
const lista = [1, 2, 3, 4, 5];
pintar(lista[0]); # 1

lista[0] = 10;
pintar(lista); # [10, 2, 3, 4, 5]
```

## Objetos
```agal
const objeto = {
    nombre: 'Juan',
    edad: 18
};

pintar(objeto.nombre); # Juan
pintar(objeto['edad']); # 18
```

## Importar
```agal
importar 'archivo.agal';
importar 'archivo.agal' como mod;
importar 'archivo.json' como json con {tipo:'json'};
```

## Exportar
```agal
exportar const nombre = 'archivo.agal';
exportar def variable = 'valor';
exportar fn funcion() {
    # ...
}
exportar clase Clase {
    # ...
}
exportar {
  clave: 'valor',
}
```

## Ejecutar
```bash
agal ejecutar archivo.agal
```
