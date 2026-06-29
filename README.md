# Portal Pictosfera

Esto es el **esqueleto completo** del portal, más dos juegos ya
terminados y jugables: **Memoria de animales** y **Arrastra la palabra:
animales**, hechos con pictogramas de ARASAAC. Todo lo demás (más
juegos, más estantes) se irá añadiendo encima de esta base sin tocar lo
que ya funciona.

No hace falta saber programar para leer este documento. Donde haga falta
tocar algo más técnico, se avisa.

## Qué hay ya construido

- **El núcleo**: idiomas (castellano, inglés, catalán, euskera, gallego,
  valenciano), conexión con ARASAAC para traer pictogramas, "el pozo"
  (la biblioteca de imágenes guardadas en el propio dispositivo), voz
  (lee en voz alta), sonidos, un tema visual, el PIN para la zona de
  adultos, copia de seguridad manual, y la navegación (abajo en el
  móvil, al lado en pantallas grandes).
- **Las pantallas**: Inicio, Juegos (el estante con las apps), la
  pantalla de un juego en marcha, Pictogramas (zona de adulto) y
  Ajustes (idioma, pistas de texto, PIN, copia de seguridad, privacidad).
- **Memoria de animales**: Pulsas dos cartas, si son el mismo animal se
  quedan boca arriba; al completar el tablero, aparece una pantalla de
  "¡lo has logrado!".
- **Arrastra la palabra: animales**: aparece un pictograma con su
  nombre debajo como pista, y a un lado tres palabras (la correcta y
  dos distractores). Hay que arrastrar (o tocar) la palabra correcta
  hasta el pictograma. Si aciertas, sonido de acierto y pasa al
  siguiente nivel; si fallas, la palabra vuelve a su sitio y suena un
  aviso de fallo. El juego tiene 10 niveles.
- **Dos ajustes nuevos en "Ajustes"**, que afectan a cualquier juego
  que use una palabra de pista (como "Arrastra la palabra"): mostrar
  esa palabra en MAYÚSCULAS o en minúsculas, y mostrarla u ocultarla
  del todo.
- **Mensaje de bienvenida**: la primera vez que se abre el portal,
  aparecen tres tarjetas explicando qué es Pictosfera.

Todo está escrito en JavaScript "normal" (sin React, sin Vue, sin nada
que haya que instalar ni compilar). El archivo que ves en una carpeta es
literalmente el archivo que se ejecuta. Esto fue una decisión a
propósito: cualquiera con paciencia puede abrir un archivo `.js` y leerlo
de arriba a abajo.

## Cómo verlo en tu ordenador antes de publicarlo

Hay un detalle importante: **no funciona si simplemente haces doble clic
en `index.html`**. El portal necesita cargar archivos de idioma y de
configuración (`locales/es.json`, `data/apps.json`...), y los navegadores
bloquean ese tipo de carga cuando se abre un archivo directamente desde
el disco. Hace falta un "servidor" mínimo local, que es más sencillo de
lo que suena.

**Opción más cómoda — Visual Studio Code + "Live Server":**
1. Abre la carpeta `NO BORRAR WEB PICTOSFERA` en Visual Studio Code (gratis).
2. Instala la extensión llamada **Live Server** (búscala en el icono de
   piezas de puzle de la izquierda).
3. Clic derecho sobre `index.html` → **"Open with Live Server"**.
4. Se abrirá el portal en tu navegador, ya funcionando de verdad.

**Opción alternativa — una línea de comandos**, si te resulta cómodo:
con esta carpeta abierta en una terminal, ejecuta `python3 -m http.server`
y luego abre `http://localhost:8000` en el navegador.

## Cómo publicarlo gratis en internet (GitHub Pages)

Esto es lo más sencillo en cuanto el contenido esté listo:
1. Crea una cuenta gratuita en GitHub (si no tienes ya una).
2. Crea un repositorio nuevo y sube ahí todo el contenido de esta carpeta.
3. En el repositorio, ve a **Settings → Pages** y activa Pages sobre la
   rama principal (`main`), carpeta raíz.
4. GitHub te da una dirección web (algo como
   `https://tu-usuario.github.io/pictosfera/`) donde el portal ya
   funciona para cualquiera, sin que tengas que mantener ningún servidor.

Como el portal no tiene servidor ni base de datos propios, publicarlo en
GitHub Pages es el final del proceso: no hay nada más que "encender".

## Cómo se añadirá un juego nuevo en el futuro

Cada juego es un archivo independiente que se apunta en
`data/apps.json` (un pequeño listado: nombre, icono, estante al que
pertenece, y qué archivo `.js` lo contiene). El portal lo carga solo
cuando alguien lo abre, no antes. Esto significa que añadir un juego
nuevo nunca debería romper los que ya funcionan: si un juego nuevo tiene
un error, los demás siguen funcionando con normalidad.

Cuando llegue ese momento, lo más práctico será describir el juego nuevo
(qué hace, qué pictogramas usa, cómo se gana) y dejar que se construya
siguiendo exactamente el mismo patrón que Memoria.

## Las pruebas automáticas

Hay un conjunto de comprobaciones automáticas que verifican que la parte
de "lógica pura" del portal hace lo que debe hacer (cambiar de idioma,
construir un mazo de cartas, validar una copia de seguridad, etc.), sin
necesidad de abrir un navegador. Si en algún momento alguien con
conocimientos técnicos quiere comprobarlo:

```
npm test
```

Ahora mismo hay 52 comprobaciones y todas pasan.

Esto no sustituye probar el portal de verdad en un navegador (ver
siguiente apartado), pero sí da una primera red de seguridad: si alguien
cambia algo del núcleo más adelante y rompe la lógica de un juego o de
los idiomas, estas pruebas deberían avisar.

## Qué falta revisar — importante

- **Verificación visual en un navegador real**: en esta sesión de
  trabajo se ha comprobado a fondo el código (que todos los archivos
  existen, que no hay errores de sintaxis, que todas las traducciones
  usadas existen, que las pruebas automáticas pasan), pero no había un
  navegador disponible para recorrer el portal "a clics" y ver
  capturas de pantalla reales. Antes de darlo por cerrado, conviene que
  alguien lo abra (con Live Server, como se explica arriba) y compruebe
  con calma: que se ve bien en el móvil y en el ordenador, que los dos
  juegos cargan los pictogramas de los animales correctamente (hace
  falta conexión a internet la primera vez, para traerlos de ARASAAC),
  que el arrastre de "Arrastra la palabra" funciona bien al tacto en
  una tablet o móvil, que la voz lee los nombres, y que el PIN y la
  copia de seguridad funcionan como se espera.
- **Traducciones parciales**: catalán, euskera, gallego y valenciano
  tienen ya los textos más importantes, pero algunos textos largos
  (como el de privacidad) todavía no están traducidos. Esto **no rompe
  nada**: el portal muestra automáticamente el texto en castellano
  cuando falta una traducción en otro idioma. Conviene revisarlo más
  adelante con alguien que domine bien cada idioma.
- **El árbol de categorías completo de ARASAAC** (para poder explorar
  pictogramas por categorías en la sección "Pictogramas") se ha dejado
  para una fase posterior; de momento esa sección busca por palabra.
- **La herramienta de publicación de escritorio** (para preparar
  material sin depender de internet) se decidió dejarla para más
  adelante, según lo acordado.

## Estructura de carpetas, por si resulta útil

```
core/                   El núcleo: idiomas, ARASAAC, el pozo, voz, sonidos, PIN...
core/js/views/          Las pantallas del portal (Inicio, Juegos, Ajustes...)
apps/memoria/           Juego: Memoria de animales
apps/arrastra-palabra/  Juego: Arrastra la palabra: animales
data/apps.json          El listado de juegos disponibles
locales/                Los textos en cada idioma
tests/                  Las pruebas automáticas
```
