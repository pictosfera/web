# Pictosfera

Portal web de minijuegos educativos con pictogramas para niños que usan comunicación aumentativa y alternativa (CAA). Publicado en GitHub Pages, sin servidor propio, sin instalación, sin build.

---

## Para quién es

Pictosfera funciona para dos perfiles con necesidades distintas:

**El adulto** (padre, madre, terapeuta, docente) gestiona el material: busca pictogramas en ARASAAC o añade fotos propias, organiza secuencias (rutinas de pasos ordenados), crea categorías (parejas de conceptos opuestos) y diseña rutas de aprendizaje (itinerarios de juegos encadenados con progresión). También configura los ajustes de cada juego de forma individual. El acceso a esta zona está protegido por un PIN.

**El niño** ve una interfaz limpia con los juegos disponibles y las rutas que el adulto haya preparado para él. No tiene acceso a la zona de gestión.

---

## Qué hace (y qué no hace)

**Hace:**
- 21 minijuegos jugables con pictogramas propios o de ARASAAC
- Descarga y guarda pictogramas de la API pública de ARASAAC en el dispositivo
- Permite añadir fotos propias como material de juego
- Lee en voz alta (Web Speech API) en el idioma activo
- Funciona offline una vez que el material está descargado
- Guarda todo en el propio dispositivo (IndexedDB + localStorage), sin cuenta ni servidor
- Exporta e importa copias de seguridad completas en JSON
- Se puede instalar como aplicación nativa (PWA) en Android e iOS
- Soporta 6 idiomas con fallback automático a castellano

**No hace:**
- No tiene servidor propio ni base de datos remota
- No registra ni transmite ningún dato del niño
- No requiere crear una cuenta
- No tiene paso de compilación ni dependencias de npm en producción (solo para tests)
- No es un sistema de seguridad real: el PIN es un cierre de UX, no una medida de protección ante alguien que sepa usar las herramientas de desarrollo del navegador

---

## Los 21 juegos

### Lectura y vocabulario
- **Memoria** — voltear pares de cartas hasta completar el tablero
- **Arrastra la palabra** — arrastrar el nombre correcto hasta el pictograma
- **Teclea la palabra** — escribir el nombre de un pictograma con teclado en pantalla
- **Bingo de lectura** — tachar las palabras que se van cantando
- **Ruleta de letras** — la ruleta indica una letra; hay que escribirla
- **Rosco de pictogramas** — recorrer un rosco respondiendo qué pictograma se describe
- **Puzzle de pictograma y palabra** — montar el puzzle y elegir la palabra correcta
- **Relaciona pictograma y palabra** — arrastrar cada pictograma a su texto correspondiente
- **Ordena la secuencia** — poner los pasos de una rutina en el orden correcto

### Matemáticas
- **Arrastra el número** — contar objetos y arrastrar el número correcto
- **Escribe el número** — contar y escribir el resultado
- **Suma: elige el resultado** — sumar dos cantidades y elegir la respuesta entre opciones
- **Arrastra la suma** — arrastrar piezas para completar una operación
- **Completa la suma** — escribir los números que faltan en una suma
- **Dedos y pictogramas** — relacionar una cantidad de dedos con pictogramas
- **Dedos y número** — relacionar la mano con el número escrito

### Trazos
- **Escribe la letra** — trazar la letra indicada sobre un canvas con reconocimiento óptico del trazo

### Emociones y vida cotidiana
- **¿Me gusta o no me gusta?** — decidir sobre alimentos u otros objetos
- **Lista de la compra** — recordar qué productos hay que añadir al carro
- **Clasifica en categorías** — arrastrar cada objeto a su categoría (grande/pequeño, etc.)
- **Reconoce emociones** — identificar la expresión de un personaje generado por SVG

---

## Zona de adulto: gestión de material

### Biblioteca de pictogramas ("el pozo")
Almacén local de medios en IndexedDB. Acepta pictogramas de ARASAAC (descargados bajo demanda) y fotos propias. Cada medio tiene nombre editable, etiquetas y origen. Los juegos toman su material de aquí, filtrado por etiquetas cuando corresponde.

La API de ARASAAC devuelve siempre las categorías en inglés; `arasaac.js` las convierte automáticamente a etiquetas en castellano antes de guardarlas, para que el sistema de filtrado por etiquetas funcione independientemente del idioma de la interfaz.

### Secuencias
Rutinas de pasos ordenados, cada paso asociado a un pictograma de la biblioteca. Si un pictograma de un paso se borra, la secuencia entera se descarta al resolver (no tiene sentido pedagógico una rutina con un hueco en el orden).

### Categorías
Parejas de conceptos opuestos para el juego de clasificación (ej. grande/pequeño, rojo/verde). Si un pictograma de una categoría se borra, solo se elimina ese elemento; el resto de la categoría se mantiene (el orden no importa aquí).

### Rutas de aprendizaje
Itinerarios de juegos encadenados. El siguiente paso se desbloquea cuando el anterior se supera sin fallos. La única excepción es el juego de Memoria, donde voltear dos cartas que no coinciden es parte normal del juego y no cuenta como fallo que bloquee el avance.

---

## Ajustes por juego

Hay 14 parámetros configurables (mayúsculas/minúsculas, pista visible u oculta, tildes automáticas, tolerancia de trazo, resaltado de teclado, etc.). Los ajustes tienen dos capas:

- **Global**: afecta a todos los juegos que usan ese ajuste y no han sido configurados individualmente.
- **Por juego**: en cuanto se ajusta un parámetro para un juego concreto, ese juego queda desacoplado del ajuste global y tiene su propia configuración independiente.

---

## Idiomas

Castellano, inglés, catalán, euskera, gallego y valenciano. El castellano es la fuente de verdad (completo). El inglés también está completo. Los otros cuatro cubren las secciones principales; en lo que falta, el portal muestra automáticamente el texto en castellano sin romperse.

Detalle técnico relevante: el código interno del valenciano es `va`, pero la API de ARASAAC espera `val`. El sistema gestiona esta diferencia internamente para que las búsquedas en valenciano funcionen correctamente.

---

## Arquitectura técnica

**Cero build, cero servidor.** No hay bundler, no hay framework, no hay transpilación. Cada archivo `.js` del repositorio es literalmente el archivo que ejecuta el navegador. `package.json` existe únicamente para poder correr los tests con `node --test`.

**ES modules nativos.** Todo el código usa `import`/`export` estándar. El punto de entrada es `index.html` → `<script type="module" src="core/js/main.js">`.

**SPA con hash-router.** Una sola página HTML, navegación por `#/ruta`. Sin historial complejo.

**IndexedDB para datos del usuario.** Cuatro almacenes: `medios`, `secuencias`, `rutas`, `categorias`. Las migraciones son incrementales y nunca destructivas: subir de versión añade almacenes nuevos sin tocar los existentes. Esto garantiza que actualizar el portal nunca borra los datos del niño.

**CacheStorage para archivos estáticos.** El Service Worker cachea HTML, JS y CSS para uso offline. El nombre de caché incluye un timestamp que se actualiza automáticamente en cada publicación, forzando que los clientes descarten la caché vieja y descarguen los archivos nuevos.

**Aislamiento de mecánicas.** Cada juego en `apps/<mecanica>/` es autocontenido. Puede importar utilidades del núcleo (`core/js/`) pero nunca importa código de otra mecánica. Las funciones comunes (mezclar arrays, motor de trazo, patrones de selección sin repetición) están duplicadas a propósito: es una garantía de que borrar o modificar un juego no rompe ningún otro.

---

## Estado actual

- **21 juegos** implementados, testeados y registrados
- **567 pruebas automáticas**, todas pasan (`npm test`)
- **PWA instalable** en Android (Chrome) e iOS (Safari, manual)
- **Pendiente real conocido**: el árbol completo de categorías ARASAAC (~300 categorías jerarquizadas). Actualmente hay 13 categorías predefinidas en el código; la búsqueda por palabra funciona sin restricciones para encontrar cualquier pictograma.

---

## Créditos

Los pictogramas usados en este portal pertenecen a [ARASAAC](https://arasaac.org) (Portal Aragonés de la Comunicación Aumentativa y Alternativa), publicados bajo licencia Creative Commons BY-NC-SA 4.0. Autor: Sergio Palao. Propiedad: Gobierno de Aragón (España).
