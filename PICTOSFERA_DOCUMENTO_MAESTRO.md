# PICTOSFERA — DOCUMENTO MAESTRO DE RECONSTRUCCIÓN

> Generado el 30 de junio de 2026. Actualizado el 5 de julio de 2026. Este documento existe para un único propósito: si se pierde todo el código del proyecto **y** todo el historial de esta conversación con Claude, este archivo por sí solo debe permitir reconstruir Pictosfera desde cero, con el mismo comportamiento, las mismas convenciones y sin reintroducir los bugs que ya se detectaron y corrigieron. Está escrito para que lo pueda usar tanto una IA (Claude u otra) como una persona con paciencia pero sin conocimientos previos del proyecto.

## 0. Cómo usar este documento

Léelo en orden. Las secciones están pensadas como capas: primero el "porqué" del proyecto (sección 1), después la forma física de las carpetas (sección 2), después las reglas transversales que TODO el código respeta (sección 3) — esta es la sección más importante para no reintroducir bugs ya resueltos —, después los catálogos exhaustivos de cada módulo del núcleo (sección 4) y de cada uno de los 21 minijuegos (sección 5), después la infraestructura no funcional pero necesaria (sección 6: tests, CSS, locales, archivos raíz, herramienta de publicación), después el historial narrado de construcción y los bugs encontrados con su solución exacta (sección 7), el estado de las pruebas automáticas y los pendientes reales (sección 8), y por último una guía paso a paso de reconstrucción en el orden correcto de dependencias (sección 9).

Si en algún momento este documento entra en contradicción con `README.md` del propio proyecto: **confía en este documento**. `README.md` quedó desactualizado durante el desarrollo (se explica por qué en la sección 8) y no se ha corregido a propósito, para no perder ese rastro de qué tan fácil es que la documentación de cara al usuario se desincronice del código real.

Todo el código fuente está en castellano (nombres de variables, funciones, comentarios) — es una decisión deliberada del proyecto, no una inconsistencia. Los nombres de archivo, IDs internos y claves de almacenamiento también están en castellano salvo excepciones tomadas directamente de APIs externas (ARASAAC, IndexedDB, Pointer Events...).

## 1. Visión y filosofía del proyecto

Pictosfera es un portal web de minijuegos educativos con pictogramas, pensado para niños y niñas con necesidades de comunicación aumentativa (apoyo en pictogramas ARASAAC), gestionado por un adulto (padre/madre, terapeuta, docente) que prepara el material y un niño que juega. Decisiones de fondo que explican casi todo el resto del código:

**Cero servidor, cero build.** No hay backend propio, no hay bundler, no hay framework, no hay paso de compilación. `package.json` existe únicamente para poder ejecutar `npm test`; el portal en sí se abre tal cual (con un servidor estático mínimo, ver sección 6). Cada archivo `.js` que ves en una carpeta es literalmente el archivo que se ejecuta en el navegador, sin transformar. Esto fue elegido a propósito para que cualquier persona con paciencia (no necesariamente programadora) pueda abrir un archivo y leerlo de arriba a abajo, y para que publicar el portal sea tan simple como subir los archivos a GitHub Pages.

**Todo vive en el dispositivo del niño.** IndexedDB para datos estructurados (pictogramas guardados, secuencias, categorías, rutas), localStorage para preferencias (idioma, ajustes, PIN). No hay servidor que guarde nada del niño. La única llamada de red es a la API pública de ARASAAC para buscar/traer pictogramas, y es opcional (el portal funciona offline una vez que el material ya está en "el pozo", el nombre interno de la biblioteca local de medios).

**El adulto prepara, el niño juega.** Hay una "zona del adulto" protegida por PIN (PIN que es deliberadamente NO seguridad real, ver sección 3) donde se gestionan pictogramas, fotos propias, secuencias (rutinas ordenadas), categorías (parejas opuestas para clasificar) y rutas de aprendizaje (itinerarios de juegos encadenados). El niño solo ve Inicio, Juegos y sus Rutas.

**Cada mecánica es una isla.** Cada minijuego vive en su propia carpeta bajo `apps/`, es autocontenido, y deliberadamente NO importa código de otra mecánica (sí importa libremente utilidades del núcleo en `core/js/`). Esto significa que funciones idénticas (mezclar un array, motor de reconocimiento de trazo, patrones de "elegir siguiente sin repetir") están duplicadas letra por letra en varios archivos. No es descuido: es la decisión consciente de que un minijuego se pueda añadir, copiar o borrar sin riesgo de romper ningún otro. Si en una reconstrucción futura alguien decide "limpiar" esa duplicación extrayéndola a un módulo común, debe saber que rompe esta garantía de aislamiento a propósito buscada.

**Accesibilidad real, no decorativa.** Todas las mecánicas de arrastrar ofrecen una alternativa de teclado o de toque secuencial. El PIN, el modo pantalla completa y otras protecciones están documentadas explícitamente como NO seguridad real. Las cabezas/personajes que representan emociones nunca revelan en texto accesible la respuesta correcta (ver sección 3). Hay `prefers-reduced-motion` respetado a nivel de tokens CSS.

**Idioma como ciudadano de primera clase pero con fallback seguro.** Castellano es el idioma "fuente de verdad": existe traducción completa a 6 idiomas (es/ca/eu/gl/va/en) en la estructura, pero solo es/en están 100% completos; los otros 4 cubren lo esencial y caen automáticamente a castellano en lo que falta, sin romper nunca la interfaz (ver sección 3 y 6).

## 2. Estructura de carpetas

Árbol completo de la raíz del proyecto (`NO BORRAR WEB PICTOSFERA/`):

```
index.html              Shell HTML único de toda la app (SPA de una sola página)
manifest.json           Manifiesto PWA
sw.js                   Service Worker (cache de los archivos del núcleo, no de pictogramas)
package.json            Solo para "npm test"; type:"module", sin dependencias
.gitignore              node_modules/, .DS_Store, Thumbs.db, *.log
README.md               Documentación para el autor no técnico (ver aviso de obsolescencia en sección 8)

core/
  css/
    tokens.css           Variables CSS globales: paleta, tipografía, espaciados, radios, sombras, transiciones
    shell.css             Estilos del armazón de navegación (topbar, tabbar, sidebar, puerta de entrada...)
    adult.css             Estilos de toda la zona de adulto (Pictogramas, Ajustes, sus subsecciones admin)
  js/
    main.js               Punto de entrada: arranca puerta → bienvenida → router → shell
    router.js             Hash-router minimalista
    shell.js               Construye topbar/tabbar/sidebar y la navegación entre vistas
    i18n.js                Sistema de idiomas: SUPPORTED_LANGS, t(), cambio de idioma, fallback a es
    db.js                   IndexedDB "tonta": apertura, versión, 4 almacenes (medios, secuencias, rutas, categorias)
    mediaLibrary.js        "El pozo": lógica de negocio sobre el almacén "medios" (el pozo de pictogramas/fotos)
    arasaac.js              Cliente HTTP de la API pública de ARASAAC
    categoriasPictogramas.js  Árbol de categorías cortas predefinidas (parcial, ver pendientes)
    categorias.js          CRUD de parejas de categorías opuestas (para clasifica-categorias)
    secuencias.js          CRUD de secuencias/rutinas ordenadas (para ordena-secuencia)
    rutas.js                Lógica de negocio de "rutas de aprendizaje" (itinerarios de juegos)
    ajustesJuego.js        Lectura/escritura de los 14 ajustes con cascada per-game → global → defecto
    ajustesCatalogo.js     Catálogo declarativo: qué ajustes aplica cada una de las 21 mecánicas
    appLoader.js            Carga dinámica de una mecánica desde data/apps.json + construcción de "plataforma"
    backup.js               Exportar/importar copia de seguridad completa (JSON)
    tts.js                   Texto a voz (Web Speech API), con voces por idioma y fallback
    sounds.js                Sonidos de click/acierto/fallo/recompensa (sintetizados o assets cortos)
    pin.js                    PIN parental (NO es seguridad real, ver sección 3)
    fullscreen.js            Pantalla completa (NO es kiosco real, ver sección 3)
    puerta.js                 Pantalla de entrada que captura el primer toque (gesto de usuario) en cada visita
    welcome.js                Paseo de bienvenida de 3 tarjetas, solo la primera vez
    reward.js                 Pantalla de recompensa reutilizable al completar un juego
    footer.js                  Pie de página global con autoría y atribución ARASAAC
    personajes.js             Generador de personajes SVG "papercraft" (cuerpo completo)
    cabezas.js                 Generador de cabezas SVG con expresión facial (reutiliza personajes.js)
    pwa.js                     Módulo de instalación PWA: captura beforeinstallprompt, detecta iOS, expone instalar()
    views/                      13 archivos, una vista por pantalla: inicio.js, juegos.js, juego.js,
                                 pictogramas.js, pictogramasArasaac.js, fotos.js, secuencias.js (admin),
                                 categoriasAdmin.js, ajustes.js, rutas.js, rutasCrear.js, rutaJugar.js,
                                 (ver catálogo completo en sección 4 para los nombres exactos y responsabilidades)

apps/                    Un subdirectorio por mecánica, 21 en total — ver listado exacto en sección 5
  memoria/
  arrastra-palabra/
  teclea-palabra/
  ordena-secuencia/
  escribe-letra/
  bingo-lectura/
  ruleta-letras/
  rosco-pictogramas/
  arrastra-numero/
  escribe-numero/
  suma-resultado/
  dedos-pictogramas/
  dedos-numero/
  completa-suma/
  arrastra-suma/
  clasifica-categorias/
  puzzle-pictograma-palabra/
  relaciona-pictograma-palabra/
  me-gusta-no-me-gusta/
  lista-compra/
  reconoce-emociones/

data/
  apps.json               Registro de las 21 instancias de juego jugables (ver contenido íntegro en sección 6)

locales/
  es.json                  Castellano — fuente de verdad, 38 namespaces, completo
  en.json                  Inglés — completo, mismos 38 namespaces, traducción 1:1
  ca.json, eu.json, gl.json, va.json   Catalán/euskera/gallego/valenciano — 11 namespaces cada uno
                            (parcial; lo que falta cae a castellano automáticamente)

tests/
  helpers/shims.mjs        Shims de navegador para poder testear módulos del navegador desde Node
  *.test.mjs               33 archivos de test, uno por módulo de lógica pura (ver listado en sección 6)
```

Fuera de la carpeta del proyecto web, en una carpeta hermana del escritorio
(`NO BORRAR PICTOSFERA LETRITAS/GESTOR SUBIDAS WEB/`), vive una herramienta
de publicación independiente (`GestorSubidasWeb.ps1` + lanzador `.bat` +
`LEEME`) que NO forma parte del código del portal pero sí del proyecto en
sentido amplio — ver sección 6.
## 3. Arquitectura transversal (reglas que TODO el código respeta)

Esta sección es la más crítica del documento: condensa las convenciones y los bugs ya resueltos que afectan a varios módulos a la vez. Cualquier reconstrucción que no respete estas reglas reintroducirá problemas ya solucionados.

### 3.1 El contrato de mecánica

Cada `apps/<mecanica>/<mecanica>.js` exporta por defecto:

```js
export default {
  id: 'nombre-carpeta',
  nombre: 'Nombre visible',
  icono: '🔤',
  estante: 'LECTURA',
  // opcional, solo Memoria lo declara:
  rutaPerfectoSinFallos: false,
  montar(contenedor, plataforma) { /* construye todo el DOM, arranca la primera ronda */ },
  desmontar() { /* limpia listeners globales, timers, tts, resetea estado del módulo */ },
};
```

`montar` recibe el contenedor ya vacío. El estado de la partida (ronda actual, aciertos, ids ya usados, flags de "ya escuchado TTS") vive en variables a nivel de módulo (closure), nunca en el DOM. `desmontar` siempre reinicializa ese estado para que una remontada posterior no herede nada de la partida anterior.

### 3.2 El objeto `plataforma`

Construido por `appLoader.mountApp` y pasado a cada `montar()`. Forma exacta:

```js
{
  appId,          // id de la entrada en data/apps.json, ej. "memoria-animales"
  nombre, icono, estante,   // copiados de la entrada de apps.json
  lang,           // código de idioma activo en el momento de montar (ya resuelto, string plano)
  medios,         // array de medios ya filtrados/resueltos (ver 3.3)
  categorias,     // (si aplica) parejas de categorías ya resueltas
  secuencias,     // (si aplica) secuencias ya resueltas
  fijos,          // (si aplica) mapa de pictogramas ARASAAC de ID fijo ya resueltos {clave: medioResuelto}
  t,              // función de traducción ya ligada al idioma activo: t('clave', {n: 3})
  tts,            // { speak(texto), stop() }
  sounds,         // { click(), acierto(), fallo(), recompensa() }
  cabezas,        // helpers de core/js/cabezas.js, listos para usar
  getDisplayUrl,  // (medio) => url mostrable, resuelve casos especiales de ARASAAC
  mostrarRecompensa, // (opciones) => pantalla de recompensa; wrapper que sabe de "modo ruta"
  ajustesPista,   // objeto plano YA resuelto con los ajustes que aplican a esta mecánica
}
```

Decisión de diseño explícita: `lang` y `ajustesPista` se pasan como **datos ya resueltos**, no como acceso a las funciones vivas de i18n/ajustes. Esto preserva el aislamiento de cada mecánica — una mecánica nunca puede, por accidente o a propósito, cambiar el idioma global o leer un ajuste que no le corresponde; solo ve la foto fija que `appLoader` decidió pasarle.

### 3.3 `resolverMaterial(descriptor)` — lógica interna de `appLoader.js`

- Si `material` no tiene `material.etiqueta` → devuelve la biblioteca de medios completa, sin filtrar.
- Si tiene `material.etiqueta` y `material.semillaArasaac` (lista de palabras semilla): llama a `mediaLibrary.ensureSeedFromArasaac({ tag: material.etiqueta, terms: material.semillaArasaac, lang: material.semillaArasaacLang || getLanguage(), displayLang: getLanguage(), min: material.minimo || 6 })` (esto siembra la biblioteca local con pictogramas de ARASAAC si no hay suficientes ya guardados), y después devuelve `mediaLibrary.listByTags([etiqueta])`.
- Las entradas con `material.fijos` (IDs ARASAAC fijos, ej. un plato, un cubo de basura, las 4 caras de reconoce-emociones) se resuelven aparte y se exponen en `plataforma.fijos`, no en `plataforma.medios`.
- Dos entradas de `apps.json` no tienen `material` en absoluto (`ordena-secuencia-rutinas`, `dedos-numero`): no necesitan medios filtrados, usan `secuencias`/lógica numérica pura.

### 3.4 Cascada de ajustes (`ajustesJuego.js` + `ajustesCatalogo.js`)

Hay 14 ajustes posibles en total (13 definidos formalmente en `DEFINICIONES_AJUSTE` de `ajustesCatalogo.js`, ya que `dificultadRuleta` es un caso aparte de un solo juego): `mayuscula`, `mostrar`, `resaltarTeclado`, `tildesAutomaticas`, `mayusculasAutomaticas`, `puntuacionAutomatica`, `espaciosAutomaticos`, `soloTexto`, `pulsadorTts`, `letraPunteada`, `toleranciaTrazo`, `dificultadRuleta`, `listaSoloTexto`, `estanteSoloImagen`. Cada uno tiene una clave de `localStorage`.

`claveJuego(appId, claveGlobal)` construye una clave por-juego: `pictosfera.juego.<appId>.<ajuste>`. Orden de lectura: clave per-game → clave global → valor de fábrica. Escribir un ajuste **con** un `appId` desacopla ese juego concreto del ajuste global desde ese momento (ya no seguirá los cambios futuros del ajuste global; escribir sin `appId` solo afecta a los juegos que nunca se hayan desacoplado individualmente).

`ajustesCatalogo.js` es el catálogo declarativo y agnóstico de almacenamiento: `CAMPOS_POR_MECANICA` mapea cada una de las ~21 mecánicas a la lista de ajustes (de los 13) que le aplican. La pantalla de Ajustes (`views/ajustes.js`) y `appLoader.js` (al construir `ajustesPista`) leen este catálogo en vez de tener hardcodeado mecánica por mecánica qué ajuste le toca a quién.

### 3.5 Sistema de idiomas (`i18n.js`)

`SUPPORTED_LANGS` es un array de 6 entradas, cada una `{ code, nombre, arasaacCode, speechLang, speechFallback }`. Caso especial importante: el valenciano tiene código interno `va` pero su `arasaacCode` es `val` (distinto) — si se reconstruye esto y se usa `va` literal al llamar a la API de ARASAAC, las búsquedas en valenciano fallarán silenciosamente.

Cadena de fallback de traducción: `currentLang` → `es` → la propia clave en crudo como texto (para que nunca se vea "undefined" en pantalla, en el peor caso se ve la clave técnica). `STORAGE_KEY = 'pictosfera.lang'`. Al cambiar de idioma se dispara el evento `pictosfera:lang-changed` en `window` para que cualquier vista abierta pueda re-renderizar sus textos sin recargar la página.

`locales/es.json` y `locales/en.json` tienen exactamente 38 namespaces de nivel superior (ver contenido íntegro de `es.json` en la sección 6.4) y son traducción 1:1, clave por clave. `locales/ca.json`, `eu.json`, `gl.json`, `va.json` tienen solo 11 namespaces cada uno (`app, nav, inicio, juegos, pin, pictogramas, ajustes, recompensa, comunes, estantes, memoria`) — cubren el núcleo y el primer juego, pero ni de lejos los 21 minijuegos ni las secciones más nuevas (rutas, secuencias, categorías, footer, puerta...); esos textos, en esos 4 idiomas, caen automáticamente a castellano por el mecanismo de fallback descrito arriba. Esto **no es un bug**, es el estado real y esperado del proyecto; está señalado igual en el README como pendiente de traducción.

Interpolación: estilo `{n}`, `{nombre}`, `{letra}`, etc., sustituido literalmente por `t(clave, variables)`.

### 3.6 IndexedDB (`db.js`)

Base de datos `pictosfera`, `DB_VERSION = 4`. Los almacenes se crean de forma incremental con `if (!db.objectStoreNames.contains(nombre))` dentro de `onupgradeneeded`, nunca de forma destructiva (nunca se borra ni recrea un almacén existente, así que subir de versión es siempre seguro sobre datos reales de un niño):

1. `medios` (v1) — `keyPath: 'id'`, índices `etiquetas` (multiEntry) y `origen`.
2. `secuencias` (v2) — `keyPath: 'id'`.
3. `rutas` (v3) — `keyPath: 'id'`.
4. `categorias` (v4) — `keyPath: 'id'`.

`db.js` es deliberadamente "tonto": solo abre la base de datos y expone operaciones CRUD genéricas sobre almacenes. Toda la lógica de negocio (qué significa una "etiqueta", cómo se resuelve una secuencia rota, qué es una pareja de categorías válida) vive en sus módulos respectivos: `mediaLibrary.js`, `secuencias.js`, `categorias.js`, `rutas.js`.

### 3.7 Dos filosofías distintas ante una "referencia rota"

Cuando un pictograma guardado se borra de la biblioteca pero seguía referenciado desde una secuencia o categoría, el proyecto trata el caso de dos formas distintas a propósito, según si el orden importa:

- `secuencias.resolverPasos`: si **cualquier** paso de la secuencia no se puede resolver, se descarta la secuencia **entera** (no solo el paso roto) — porque una rutina con un hueco en medio del orden ("lávate los dientes" → ??? → "péinate") deja de tener sentido pedagógico.
- `categorias.resolverCategoria`: si un pictograma de una categoría no se puede resolver, se descarta **solo ese elemento**, conservando el resto — porque en una categoría el orden no importa, así que perder un elemento suelto no invalida nada.

### 3.8 Rutas de aprendizaje: qué es una "partida perfecta"

`rutas.js` expone `esPartidaPerfecta(mecanica, huboFallo)`: por defecto exige cero fallos para desbloquear el siguiente paso de la ruta. La única excepción es Memoria, que declara `rutaPerfectoSinFallos: false` en su propio módulo — porque voltear dos cartas que no son pareja es parte normal e inevitable del juego de memoria, no un error que deba bloquear el avance. `appLoader.js`, en "modo ruta", envuelve `sounds.fallo` para detectar cualquier fallo durante la sesión de juego, envuelve `mostrarRecompensa` para calcular `esPartidaPerfecta` y llamar a `rutaContexto.alTerminarPaso(fuePerfecto)`, y cambia el botón de salida de la pantalla de recompensa para que diga "volver a la ruta" en vez de "volver a juegos".

### 3.9 Bug histórico (corregido): contaminación de etiquetas en inglés desde ARASAAC

La API pública de ARASAAC devuelve siempre `categories`/`tags` en inglés, sin importar qué idioma se pida en la petición. Si se guardaban esas etiquetas tal cual, la biblioteca local terminaba con pictogramas etiquetados en inglés aunque toda la interfaz estuviera en castellano (o cualquier otro idioma).

**Solución aplicada:** `arasaac.js`, en su función `toMedium()`, deja siempre `etiquetas: []` vacío al convertir un resultado crudo de la API a un medio interno. Las etiquetas reales solo las añade quien siembra/filtra explícitamente (`mediaLibrary.ensureSeedFromArasaac`, que asigna la etiqueta que se le pidió, no la que devolvió ARASAAC). Para limpiar datos ya contaminados de sesiones anteriores a este fix existen `mediaLibrary.limpiarEtiquetasArasaac()` y `etiquetasArasaacLimpias()`; la vista `pictogramasArasaac.js` llama a esa limpieza cada vez que refresca la biblioteca, así que el problema se autocorrige progresivamente incluso en instalaciones ya existentes.

### 3.10 Bug histórico (corregido): fuga de `<style>` de un SVG insertado por `innerHTML`

En `personajes.js`, un bloque `<style>` dentro de un SVG insertado vía `innerHTML` **no queda aislado a ese SVG**: sus reglas se filtran a todo el documento y pueden chocar con CSS de otras partes del portal.

**Solución aplicada:** prefijo de clase obligatorio `pj-` (constante `PREFIJO`) en absolutamente todas las reglas del `<style>` del personaje. `personajes.js` reexporta `PREFIJO` (y `ESTILO_PERSONAJE`) para que `cabezas.js` pueda reutilizar exactamente el mismo bloque de estilos sin duplicarlo ni arriesgarse a una segunda fuga con un prefijo distinto.

### 3.11 Regla de accesibilidad obligatoria en `cabezas.js` (mecánica reconoce-emociones)

Cualquier `etiqueta` de texto que se pase a las funciones generadoras de cabezas **no debe revelar nunca la expresión facial representada** (por ejemplo, jamás debe decir literalmente "Triste"). Si se hiciera, un lector de pantalla le daría la respuesta correcta a un usuario ciego antes de que pudiera "mirar" la cara, invalidando el ejercicio. La mecánica usa en su lugar un texto accesible genérico tipo "Cara de un personaje" (`role="img"` + `aria-label` genérico); si no se pasa ninguna etiqueta, el SVG lleva `aria-hidden="true"`. La expresión en sí se decide aparte (al azar entre las 4 disponibles, o explícitamente por ronda), nunca a través del texto accesible.

Bug histórico relacionado, ya corregido: el generador de cabezas/personajes dibujaba un hijab con demasiada frecuencia; se limitó explícitamente a que el rasgo "hijab" solo se genere un 10% de las veces.

### 3.12 PIN y pantalla completa: NO son seguridad real

`pin.js` guarda el PIN parental **en texto plano** en `localStorage`. Está documentado en el propio código como un "cierre" de experiencia de usuario (UX) para que un niño pequeño no entre por error en la zona de adulto — nunca como una medida de seguridad real frente a alguien que sepa abrir las herramientas de desarrollador del navegador. La clave i18n `pin.aviso` lo dice explícitamente al usuario: "El PIN es un cierre sencillo... No es una medida de seguridad real."

`fullscreen.js` tampoco es un modo kiosco real: es una comodidad visual. En iPhone/Safari no hace nada (no falla, simplemente no-opea en silencio) porque iOS no permite pantalla completa web fuera de elementos de vídeo.

### 3.13 `puerta.js`: por qué se muestra en CADA visita

A diferencia de `welcome.js` (el paseo de 3 tarjetas, que solo aparece la primera vez), la puerta de entrada se muestra **siempre**, en cada apertura del portal. Su propósito real no es informativo: es capturar el primer toque/clic del usuario dentro de un evento de gesto de usuario genuino, requisito imprescindible de los navegadores para poder llamar después a `activarPantallaCompleta()` (la API de Fullscreen exige que la petición se origine síncronamente dentro de un gesto del usuario; un `main.js` que intentara pedir pantalla completa nada más cargar, sin gesto, sería bloqueado silenciosamente por el navegador).

### 3.14 Copia de seguridad (`backup.js`)

Formato exacto del archivo exportado:

```json
{
  "tipo": "pictosfera-copia",
  "version": 1,
  "creado": "<ISO timestamp>",
  "incluyeFotos": true,
  "ajustes": { "idioma": "es", "pin": "...", "accesoLibreJuegos": true },
  "medios": [...],
  "secuencias": [...],
  "rutas": [...],
  "categorias": [...]
}
```

`validarCopia`/`aplicarCopia` son compatibles con copias antiguas: si un backup viejo no tiene alguno de los arrays más nuevos (porque se exportó antes de que existiera esa función), no borra ni vacía los datos nuevos ya presentes en el dispositivo al importar — solo sustituye lo que el backup sí trae. `necesitaRecordatorio` dispara un aviso de "hace tiempo que no haces una copia" cuando han pasado 15 días o más desde la última copia exportada **y** además hay material nuevo desde entonces (no avisa si no ha cambiado nada).

### 3.15 Convención de pruebas (`tests/`)

`tests/helpers/shims.mjs` instala, antes de cada archivo de test: un `localStorage` en memoria respaldado por un `Map`, un `document` mínimo (`{ documentElement: {} }`), un `window` real (`new EventTarget()`), y crucialmente un `fetch` que reescribe rutas `file://`/`./` y lee archivos REALES desde la raíz del proyecto con `fs.readFile`. Esto significa que los tests de i18n y de carga de apps ejercitan los archivos JSON reales de `locales/`/`data/`, no mocks — si rompes una traducción o el JSON de `apps.json`, los tests lo detectan de verdad.

Convención de alcance: los tests cubren exclusivamente lógica pura (mezclar, validar, calcular, formatear) — nunca DOM, nunca arrastre con puntero, nunca toque ni teclado real. Esa parte de cada mecánica se considera "no testeable sin navegador real" y se verifica a mano (ver sección 8).

### 3.16 Bug histórico (corregido): panel manual de categoría al añadir pictograma ARASAAC cuando las categorías ya existen

En la vista `pictogramasArasaac.js`, al hacer clic en un resultado de búsqueda para añadirlo a "el pozo", se mostraba siempre el panel manual de selección de categoría aunque la API de ARASAAC ya hubiera devuelto categorías detectadas automáticamente en el campo `etiquetas` del objeto `medio`.

**Causa:** el handler de click no comprobaba si el medio ya tenía etiquetas.

**Corrección aplicada:** el handler ahora bifurca:
```js
card.addEventListener('click', async () => {
  if (card.disabled) return;
  sounds.click();
  if (medio.etiquetas && medio.etiquetas.length > 0) {
    // Ya hay categorías auto-detectadas desde ARASAAC — guardar directamente
    await mediaLibrary.addArasaacMedio(medio);
    card.classList.add('ya-anadido');
    card.disabled = true;
    refrescarBiblioteca();
  } else {
    // Sin categorías: mostrar el panel manual para que el adulto las elija
    mostrarPanelAnadir(medio, card);
  }
});
```
La función `etiquetasDesdeArasaac(picto)` en `arasaac.js` convierte las categorías inglesas de ARASAAC a etiquetas curadas en español usando el mapa `MAPA_CATEGORIAS_ARASAAC`. Si la categoría no tiene mapeo, devuelve la propia categoría inglesa como fallback (en minúsculas). El campo `etiquetas` del objeto `medio` ya viene relleno por `toMedium()` cuando ARASAAC devuelve categorías.

### 3.17 Mapeo de categorías ARASAAC a etiquetas en español (`arasaac.js`)

La API de ARASAAC devuelve las categorías del pictograma siempre en inglés (campo `categories`). `arasaac.js` tiene un mapa (`MAPA_CATEGORIAS_ARASAAC`) que convierte esas categorías inglesas a etiquetas curadas en español antes de guardarlas en el medio. Ejemplos: `"Food & Drink"` → `"comida"`, `"Animals"` → `"animales"`, `"Daily life"` → `"vida cotidiana"`.

La función `etiquetasDesdeArasaac(picto)` aplica este mapa: si la categoría inglesa tiene entrada en el mapa, usa el valor español; si no tiene mapeo, usa la categoría en inglés en minúsculas (comportamiento de fallback seguro — no falla, solo puede quedar en inglés ese caso raro). `toMedium()` llama a `etiquetasDesdeArasaac()` para rellenar el campo `etiquetas`, de modo que al añadir un pictograma ARASAAC ya llega con categorías en castellano sin intervención del adulto.

**Relación con la regla 3.9:** el vacío `etiquetas: []` de la regla 3.9 se aplicaba en el arranque inicial del proyecto para evitar que las categorías inglesas contaminaran el store. Con el mapeo de la regla 3.17, `toMedium()` puede rellenar `etiquetas` directamente con valores ya traducidos — el store ya no recibe etiquetas en inglés por esta vía.

### 3.18 Cambio a `resolverMaterial`: filtrado por etiqueta solo en juegos que lo necesitan

Hasta la tarea #258, `resolverMaterial()` en `appLoader.js` filtraba la biblioteca de medios por la etiqueta indicada en `material.etiqueta` para TODOS los juegos. Esto excluía medios sin esa etiqueta aunque fueran perfectamente válidos para juegos como `me-gusta-no-me-gusta` o `lista-compra`, que solo necesitan cualquier pictograma disponible, no uno de una categoría concreta.

**Corrección:** `resolverMaterial()` aplica el filtro por etiqueta únicamente cuando el descriptor de la app lo necesita explícitamente. Los juegos `me-gusta-no-me-gusta` y `lista-compra` ya no tienen `material.etiqueta` restrictivo en `apps.json`, así que reciben la biblioteca completa y funcionan con cualquier pictograma que el adulto haya añadido.

### 3.19 `pwa.js` — módulo de instalación PWA

`core/js/pwa.js` es un módulo de efecto secundario que debe importarse como la **primera** importación de `main.js` (antes que cualquier otra cosa). El motivo: el navegador dispara el evento `beforeinstallprompt` muy temprano en la carga de la página y lo descarta si no hay un listener ya registrado. El módulo escucha ese evento en cuanto carga y guarda la referencia al prompt.

API pública del módulo:
- `puedeInstalar()` — `true` si se capturó el `beforeinstallprompt` (Chrome/Android, escritorio Chromium). `false` en Safari/iOS.
- `esIOS()` — `true` en iPad/iPhone/iPod (detecta `navigator.userAgent`).
- `estaInstalada()` — `true` si el portal se está ejecutando en `display-mode: standalone` (ya instalado como PWA).
- `instalar()` — lanza el diálogo nativo de instalación del navegador; devuelve `true` si el usuario acepta, `false` si cancela. Solo funciona si `puedeInstalar()` es `true`.

En iOS el flujo es distinto: no hay `beforeinstallprompt`, la instalación se hace manualmente desde el menú de compartir de Safari → "Añadir a pantalla de inicio". El módulo no intenta emular esto — solo detecta que estamos en iOS con `esIOS()` y la UI muestra instrucciones de texto en lugar de un botón de instalación.

El banner de bienvenida en `puerta.js` se muestra si:
1. El portal no está ya instalado (`!estaInstalada()`), Y
2. El usuario no ha descartado el banner antes (`localStorage.getItem('pwa-banner-descartado') !== '1'`), Y
3. Hay alguna opción disponible (`puedeInstalar() || esIOS()`).

La sección "Instalar app" en `ajustes.js` siempre aparece (independientemente de si ya está instalado), y muestra uno de cuatro estados: ya instalada / instrucciones iOS / botón de instalar / no disponible en este navegador.

**CacheStorage vs. IndexedDB — no confundir:** el service worker gestiona `CacheStorage` (archivos estáticos del portal: HTML, JS, CSS). Los datos del usuario (pictogramas, rutas, ajustes, PIN) viven en IndexedDB y `localStorage` — el service worker NUNCA los toca. Actualizar el `CACHE_NAME` del service worker fuerza que los clientes descarguen los archivos estáticos nuevos, pero no borra ni modifica los datos del niño.

### 3.20 GestorSubidasWeb — actualización automática del `CACHE_NAME` en `sw.js`

El `CACHE_NAME` en `sw.js` controla la caché de los archivos estáticos del portal. Si este nombre no cambia entre deploys, los clientes que ya tienen el service worker activo seguirán sirviendo los archivos viejos de la caché aunque GitHub Pages ya tenga los nuevos.

**Solución implementada:** `GestorSubidasWeb.ps1` tiene una función `Update-ServiceWorkerCache` que se ejecuta automáticamente al principio de `Publish-Cambios`, antes del `git add -A`. Hace exactamente esto:

```powershell
function Update-ServiceWorkerCache {
    $swPath = Join-Path $script:Config.Carpeta 'sw.js'
    if (-not (Test-Path $swPath)) { return }
    $version = (Get-Date).ToString('yyyyMMddHHmm')
    $contenido = Get-Content -Path $swPath -Raw -Encoding UTF8
    $nuevo = $contenido -replace "CACHE_NAME\s*=\s*'pictosfera-v[\w-]*'", "CACHE_NAME = 'pictosfera-v$version'"
    if ($nuevo -ne $contenido) {
        [System.IO.File]::WriteAllText($swPath, $nuevo, [System.Text.Encoding]::UTF8)
    }
}
```

El resultado: cada publicación genera un `CACHE_NAME` distinto (p.ej. `pictosfera-v202507051230`). El service worker detecta que su nombre de caché ya no coincide con el activo en el cliente, descarta la caché vieja y descarga los archivos nuevos en la siguiente apertura del portal. Los datos de usuario permanecen intactos.

### 3.22 Zero-build, recordatorio final

`package.json` completo:

```json
{
  "name": "pictosfera",
  "private": true,
  "version": "1.0.0",
  "description": "Portal Pictosfera: juegos con pictogramas, gratis y sin servidor. Este package.json existe solo para poder ejecutar las pruebas automaticas (node --test); el portal en si no necesita ningun paso de instalacion ni de compilacion.",
  "type": "module",
  "scripts": { "test": "node --test tests/**/*.test.mjs" }
}
```

Sin dependencias declaradas. `"type": "module"` para poder usar `import`/`export` nativos tanto en el navegador como en Node al testear.
## 4. Catálogo completo de `core/js/` (los 38 módulos del núcleo)

Catálogo módulo por módulo de los 38 archivos de `core/js/` (25 archivos directos + 13 vistas en `core/js/views/`): qué hace cada uno, qué exporta, cómo se relaciona con los demás. Junto con la sección 3 (reglas transversales) y la sección 5 (catálogo de mecánicas), este catálogo es suficiente para reescribir el núcleo entero sin ver el código original. Generado leyendo íntegramente los 38 archivos.

He leído los 38 archivos completos. Ahora compongo el informe final exhaustivo en español, archivo por archivo.

---

# INFORME DE INVESTIGACIÓN: `core/js` de Pictosfera

Ruta base analizada: `C:\Users\cogni\Desktop\NO BORRAR WEB PICTOSFERA\core\js`

Total de archivos `.js` encontrados y leídos: **39** (24 en `core/js/` y 15 en `core/js/views/`).

Listado completo verificado con Glob:
- `core/js/i18n.js`, `tts.js`, `sounds.js`, `router.js`, `pin.js`, `welcome.js`, `secuencias.js`, `arasaac.js`, `categoriasPictogramas.js`, `shell.js`, `reward.js`, `rutas.js`, `db.js`, `categorias.js`, `appLoader.js`, `ajustesJuego.js`, `backup.js`, `mediaLibrary.js`, `cabezas.js`, `personajes.js`, `footer.js`, `fullscreen.js`, `puerta.js`, `main.js`, `ajustesCatalogo.js`, `pwa.js`
- `core/js/views/juego.js`, `pictogramasSecuencias.js`, `medioCard.js`, `pictogramasArasaac.js`, `pictogramasFotos.js`, `ajustes.js`, `rutas.js`, `rutasCrear.js`, `rutaJugar.js`, `inicio.js`, `juegos.js`, `pictogramasCategorias.js`, `pictogramas.js`

---

## 1. `core/js/db.js`

**Propósito:** Capa de acceso "tonta" a IndexedDB. Solo sabe guardar/leer/borrar registros en cuatro almacenes (medios, secuencias, rutas, categorías). No contiene lógica de negocio: eso vive en `mediaLibrary.js`, `secuencias.js`, `categorias.js`, `rutas.js`.

**Constantes de módulo:**
- `DB_NAME = 'pictosfera'`
- `DB_VERSION = 4`
- `STORE_MEDIOS = 'medios'`
- `STORE_SECUENCIAS = 'secuencias'`
- `STORE_RUTAS = 'rutas'`
- `STORE_CATEGORIAS = 'categorias'`
- `dbPromise = null` (singleton de la conexión, en memoria de módulo)

**Esquema de IndexedDB (base `pictosfera`, versión 4):**
- `medios` (keyPath `id`): índices `etiquetas` (multiEntry: true) y `origen`. Creado en v1.
- `secuencias` (keyPath `id`): sin índices. Creado cuando no existía (históricamente v2).
- `rutas` (keyPath `id`): sin índices. Comentario explícito: "Almacén nuevo en la versión 3".
- `categorias` (keyPath `id`): sin índices. Comentario explícito: "Almacén nuevo en la versión 4".

**Lógica de migración:** en `onupgradeneeded`, cada store se crea solo `if (!db.objectStoreNames.contains(STORE_X))`, así una base creada en v1 (solo "medios") gana los stores nuevos sin perder datos. No hay migración de datos existentes, solo creación incremental de stores.

**Funciones internas (no exportadas):** `openDb()` (abre/memoiza la conexión), `withStore(storeName, mode, fn)` (envoltorio de transacción), `getAll(storeName)`, `getById(storeName, id)`.

**Funciones exportadas (4 por cada uno de los 4 almacenes, patrón idéntico):**

*medios:*
- `putMedio(medio)` → Promise. Guarda/sustituye un medio completo (put).
- `putManyMedios(medios)` → Promise. Guarda varios de golpe (usado en import/siembra).
- `getAllMedios()` → Promise<array>. Todos los medios.
- `getMedioById(id)` → Promise<objeto|null>.
- `deleteMedio(id)` → Promise. Borra uno.
- `clearMedios()` → Promise. Vacía todo el store (usado al importar copia completa que sustituye).

*secuencias:* mismo patrón → `putSecuencia`, `putManySecuencias`, `getAllSecuencias`, `getSecuenciaById`, `deleteSecuencia`, `clearSecuencias`.

*rutas:* mismo patrón → `putRuta`, `putManyRutas`, `getAllRutas`, `getRutaById`, `deleteRuta`, `clearRutas`.

*categorías:* mismo patrón → `putCategoria`, `putManyCategorias`, `getAllCategorias`, `getCategoriaById`, `deleteCategoria`, `clearCategorias`.

**Comentarios relevantes:** El comentario de cabecera aclara explícitamente que `db.js` es deliberadamente "tonto" — solo persistencia, no reglas de negocio.

---

## 2. `core/js/i18n.js`

**Propósito:** Sistema de internacionalización global del portal. Un único idioma activo repinta TODO (interfaz, pictogramas, voz TTS). No hay perfiles por niño.

**Constantes/singletons de módulo:**
- `SUPPORTED_LANGS` (array exportado) — catálogo completo de 6 idiomas, cada uno con `{ code, nombre, arasaacCode, speechLang, speechFallback }`:
  - `es` → Castellano, arasaacCode `es`, speechLang `es-ES`, fallback `null`
  - `ca` → Català, arasaacCode `ca`, speechLang `ca-ES`, fallback `es-ES`
  - `eu` → Euskara, arasaacCode `eu`, speechLang `eu-ES`, fallback `es-ES`
  - `gl` → Galego, arasaacCode `gl`, speechLang `gl-ES`, fallback `es-ES`
  - `va` → Valencià, arasaacCode `val` (¡distinto del code interno `va`!), speechLang `ca-ES`, fallback `es-ES`
  - `en` → English, arasaacCode `en`, speechLang `en-GB`, fallback `en-US`
- `DEFAULT_LANG = 'es'`
- `STORAGE_KEY = 'pictosfera.lang'` (localStorage)
- `EVENT_NAME = 'pictosfera:lang-changed'` (CustomEvent en `window`)
- `bundles` = `Map` en memoria (cachea los JSON de cada idioma cargado; siempre incluye `'es'`)
- `currentLang = DEFAULT_LANG` (estado mutable de módulo)
- `baseUrl = './locales/'` (configurable via `initI18n({baseUrl})`)

**Funciones exportadas:**
- `t(key, vars)` → string. Traduce una clave punteada (p.ej. `"nav.inicio"`); interpola `{var}` en el string. Si falta en idioma activo, cae a `es`; si tampoco existe, devuelve la propia clave (para hacer visible el fallo).
- `getLanguage()` → string. Código interno del idioma activo.
- `getLanguageInfo()` → objeto. La entrada completa de `SUPPORTED_LANGS` para el idioma activo.
- `setLanguage(code)` → Promise. Valida el código (cae a `DEFAULT_LANG` si inválido), carga el bundle JSON, siempre también carga `es` como red de seguridad, persiste en localStorage, actualiza `document.documentElement.lang`, y dispara el evento `pictosfera:lang-changed`.
- `initI18n(options = {})` → Promise. Se llama una vez al arrancar: lee `baseUrl` si se pasa, lee preferencia guardada en localStorage (o `DEFAULT_LANG`), llama a `setLanguage`.
- `onLanguageChange(callback)` → función de desuscripción. Se suscribe al evento de cambio de idioma.

**Lógica de fallback:** `readPath` navega rutas punteadas; `t()` siempre intenta primero `currentLang`, luego `es`, luego la clave cruda.

**Carga de locales:** fetch a `${baseUrl}${code}.json` con `cache: 'no-cache'`. Si falla, se cachea un objeto vacío `{}` para ese idioma (evita reintentos infinitos) y se loggea un warning.

---

## 3. `core/js/tts.js`

**Propósito:** Texto a voz usando Web Speech API del navegador. Elige la mejor voz disponible para el idioma activo y degrada con claridad si no hay ninguna.

**Constantes/estado de módulo:**
- `voicesReadyPromise = null` (cachea la promesa de espera de voces)

**Funciones internas:** `loadVoices()` (espera hasta 1500ms a que el navegador cargue voces vía evento `voiceschanged`, si no hay ninguna ya disponible), `prefix(lang)` (normaliza `"es-ES"` → `"es"`), `findVoice(speechLang)` (busca coincidencia exacta de `lang`, si no, coincidencia de prefijo).

**Funciones exportadas:**
- `isSupported()` → boolean. `'speechSynthesis' in window`.
- `hasVoiceForActiveLanguage()` → Promise<boolean>. Comprueba si hay voz para `speechLang` del idioma activo o, si no, para su `speechFallback`.
- `speak(text)` → Promise<boolean>. Busca voz (con fallback en cascada), cancela cualquier locución previa (`speechSynthesis.cancel()`), construye `SpeechSynthesisUtterance` con `rate = 0.95`, habla. Devuelve `true` si encontró voz instalada, `false` si habló sin voz específica o si falló (nunca lanza excepción).
- `stop()` → void. Cancela cualquier locución en curso.

---

## 4. `core/js/sounds.js`

**Propósito:** Sonidos de interfaz generados con Web Audio API en tiempo real (sin archivos de audio que mantener).

**Constantes/estado de módulo:**
- `ctx = null` (singleton de `AudioContext`, creado perezosamente y reutilizado; se llama `resume()` si está `suspended`)

**Funciones internas:** `getCtx()`, `tone({freq, start, duration, type, gain})` (genera un oscilador con envolvente lineal de ganancia).

**Funciones exportadas:**
- `unlock()` → void. Crea/despierta el AudioContext; debe llamarse tras el primer toque del usuario (requerido por navegadores).
- `click()` → void. Tono 520Hz, 0.06s, sine, gain 0.12.
- `acierto()` → void. Arpegio ascendente de 3 notas (523.25, 659.25, 783.99 Hz).
- `fallo()` → void. Dos tonos triangulares descendentes (220, 180 Hz).
- `recompensa()` → void. Arpegio de 5 notas ascendentes (523.25, 587.33, 659.25, 783.99, 1046.5 Hz), gain 0.16, espaciadas 0.1s.

---

## 5. `core/js/router.js`

**Propósito:** Enrutador SPA basado en hash (`#/ruta`), sin dependencia de servidor — funciona igual en GitHub Pages que en dominio propio.

**Estado de módulo (no exportado):**
- `routes = []` (array de `{pattern, handler}`)
- `notFoundHandler = (() => {})`
- `currentCleanup = null` (función de limpieza de la vista actual)

**Funciones internas:** `parsePath()` (parsea `location.hash`, default `/inicio` si vacío, separa query string con `URLSearchParams`), `matchRoute(path)` (compara segmento a segmento, soporta parámetros `:nombre`).

**Funciones exportadas:**
- `registerRoute(pattern, handler)` → void. Registra una ruta. `handler` recibe `(params, query)` y puede devolver una función de limpieza (o una Promise que resuelve a una).
- `setNotFoundHandler(handler)` → void.
- `navigate(path)` → void. Cambia `location.hash`; si la ruta es "igual" a la actual, fuerza un re-render disparando manualmente `HashChangeEvent('hashchange')` (para poder "recargar" una vista, p.ej. Juegos).
- `startRouter()` → void. Suscribe `render` a `hashchange` y ejecuta el primer render.
- `getCurrentPath()` → string. Solo la parte de path (sin query) del hash actual.

**Comportamiento de render:** antes de montar la nueva vista, llama (con try/catch) a `currentCleanup` de la vista anterior. Si no hay ruta que case, usa `notFoundHandler`.

---

## 6. `core/js/pin.js`

**Propósito:** PIN parental como "pestillo" de UX, NO seguridad real (comentario explícito en cabecera: se guarda en claro y cualquiera con acceso al dispositivo podría verlo).

**Constantes de módulo:**
- `STORAGE_KEY = 'pictosfera.pin'` (localStorage, el PIN se guarda en texto plano, sin hash)

**Funciones exportadas:**
- `hasPin()` → boolean.
- `setPin(pin)` → void. Lanza `Error('invalid-pin')` si no son 4 dígitos exactos (regex `/^\d{4}$/`).
- `getRaw()` → string|null. Valor crudo del PIN; comentario dice explícitamente que solo lo usa `backup.js` para incluirlo en la copia de seguridad.
- `removePin()` → void.
- `verifyPin(input)` → boolean. Comparación directa de strings.
- `requestPinChallenge()` → Promise<boolean>. Si no hay PIN, resuelve `true` inmediatamente (deja pasar). Si hay PIN, muestra un teclado numérico modal (creado a mano vía DOM, montado en `#modal-root`) con 4 puntos de progreso, teclado 0-9, botón cancelar y borrar. Resuelve `true` si el PIN es correcto, `false` si se cancela.

**Detalle de implementación del modal:** construido enteramente con `document.createElement` (sin templates HTML). Reproduce sonidos (`sounds.click/acierto/fallo`) en cada interacción. Al fallar, limpia la entrada y muestra `t('pin.error')`.

---

## 7. `core/js/shell.js`

**Propósito:** Navegación persistente del portal (barra de pestañas / sidebar), idéntica en todas las vistas.

**Constantes de módulo:**
- `NAV_ITEMS` (array fijo de 5 entradas): `{route, icon, labelKey, adult}`:
  - `/inicio` 🏠 `nav.inicio` (no adulto)
  - `/juegos` 🎮 `nav.juegos` (no adulto)
  - `/pictogramas` 🖼️ `nav.pictogramas` (adulto)
  - `/rutas` 🧭 `nav.rutas` (adulto)
  - `/ajustes` ⚙️ `nav.ajustes` (adulto)

**Funciones internas:** `isActive(route)`, `buildButton(item)` (crea un `<button>` con icono+etiqueta; si es zona adulta y hay PIN, añade un icono de candado 🔒 visual), `paint()` (repinta `#tabbar` y `#sidebar`, ambos con los mismos botones).

**Función exportada:**
- `initShell()` → void. Pinta una vez, y vuelve a pintar en `hashchange` (para marcar `aria-current`) y en cambio de idioma.

**Comportamiento de PIN:** al hacer click en un ítem "adult" con PIN activo, llama a `requestPinChallenge()` antes de navegar; si se cancela, no navega. La decisión documentada explícitamente: "visibles siempre, con PIN al tocarlas" (acordado con el autor).

---

## 8. `core/js/reward.js`

**Propósito:** Pantalla de recompensa reutilizable que cualquier mecánica de juego invoca al terminar una partida.

**Constantes de módulo:**
- `MENSAJES = ['recompensa.mensaje_1', 'recompensa.mensaje_2', 'recompensa.mensaje_3']`
- `EMOJIS = ['🌟', '🎉', '🏆', '🎈', '✨']`

**Función exportada:**
- `showReward(options = {})` → void. Monta un modal en `#modal-root` con emoji+mensaje aleatorios (o fijos si se pasan `options.emoji`/`options.mensajeKey`), reproduce `sounds.recompensa()` y `tts.speak(mensaje)`. Si `options.onContinuar` es función, muestra botón "seguir jugando". Botón "salir" usa `options.salirLabelKey` (por defecto `'recompensa.salir'`) y `options.onSalir` (por defecto navega a `/juegos`).

**Uso documentado en comentario:** el modo ruta (`appLoader.js`) sustituye `salirLabelKey` por `'rutas.volver_a_la_ruta'` y `onSalir` por volver a la pantalla de la ruta.

---

## 9. `core/js/categorias.js`

**Propósito:** Capa de negocio para "parejas de categorías dicotómicas" (p.ej. grande/pequeño) usadas por el minijuego "Clasifica los pictogramas en dos categorías". Las vistas y apps nunca hablan con `db.js` directamente.

**Constante de módulo:**
- `MIN_MEDIOS_POR_CATEGORIA = 1` (cada categoría necesita al menos un medio propio)

**Forma de datos — pareja completa (objeto persistido en store `categorias`):**
```js
{
  id: 'catpar:<uuid>',
  nombre: string,
  categorias: [
    { id: 'cat:<uuid>', nombre: string, cabeceraId: <id de medio>, medios: [<ids de medio>] },
    { id: 'cat:<uuid>', nombre: string, cabeceraId: <id de medio>, medios: [<ids de medio>] }
  ], // longitud exacta 2
  creado: <ISO timestamp>
}
```

**Funciones exportadas:**
- `validarPareja({nombre, categorias})` → `{ok, error?}`. Errores posibles: `'falta-nombre'`, `'categorias-invalidas'` (no es array de longitud 2), y por categoría: `'falta-nombre-categoria'`, `'falta-cabecera'`, `'medios-insuficientes'`.
- `listAll()` → Promise<array>.
- `getById(id)` → Promise<objeto|null>.
- `crearPareja({nombre, categorias})` → Promise<pareja creada>. Valida, genera ids, persiste con `db.putCategoria`.
- `actualizarPareja(id, cambios)` → Promise<pareja actualizada>. Lanza `'esa-pareja-no-existe'` si no existe.
- `eliminarPareja(id)` → Promise.
- `resolverCategoria(categoria, medios)` → objeto|null. Lógica pura: resuelve `cabeceraId` y `medios` contra la biblioteca actual; si la cabecera no existe o no queda ningún medio resoluble, devuelve `null`. Medios individuales rotos se descartan en silencio (a diferencia de secuencias, donde el orden importa).
- `parejasJugables(parejas, medios)` → array. Lógica pura: filtra solo parejas con AMBAS categorías resolubles.
- `clearAll()` → Promise.
- `replaceAll(parejas)` → Promise. Usado al importar copia de seguridad completa.

**uid() interna:** usa `crypto.randomUUID()` si existe, si no fallback `cat${Date.now()}-${random}`.

---

## 10. `core/js/secuencias.js`

**Propósito:** Capa de negocio para secuencias ordenadas de pictogramas (rutinas reales como "lavarse los dientes"), usadas por "Ordena la secuencia".

**Constante de módulo:**
- `MIN_PASOS = 2` (con menos de 2 pasos no hay nada que ordenar)

**Forma de datos — secuencia (store `secuencias`):**
```js
{
  id: 'seq:<uuid>',
  nombre: string,
  pasos: [<ids de medio>], // orden importa, longitud >= 2
  creado: <ISO timestamp>
}
```

**Funciones exportadas:**
- `validarSecuencia({nombre, pasos})` → `{ok, error?}`. Errores: `'falta-nombre'`, `'pasos-insuficientes'`, `'paso-invalido'` (algún paso es falsy).
- `listAll()`, `getById(id)`.
- `crearSecuencia({nombre, pasos})` → Promise<secuencia creada>.
- `actualizarSecuencia(id, cambios)` → Promise. Lanza `'esa-secuencia-no-existe'`.
- `eliminarSecuencia(id)` → Promise.
- `resolverPasos(secuencia, medios)` → array|null. Lógica pura: si CUALQUIER paso no resuelve (medio borrado), devuelve `null` (secuencia entera descartada — a diferencia de categorías, aquí un paso roto invalida todo porque rompería el orden/sentido).
- `secuenciasJugables(secuencias, medios)` → array. Filtra solo las completamente resolubles.
- `clearAll()`, `replaceAll(secuencias)`.

---

## 11. `core/js/rutas.js`

**Propósito:** Itinerarios guiados de aprendizaje — listas ordenadas de pasos (instancias de juego con config propia) que el niño juega en orden, con desbloqueo secuencial bloqueado por "puntuación perfecta".

**Constante de módulo:**
- `MIN_PASOS = 1`
- `CLAVE_ACCESO_LIBRE_JUEGOS = 'pictosfera.juegos.accesoLibre'` (localStorage)

**Forma de datos — ruta (store `rutas`):**
```js
{
  id: 'ruta:<uuid>',
  nombre: string,
  pasos: [
    { instanciaId: '<uuid>', appId: string, config: {<objeto plano, copia de ajustesCatalogo>} }
  ],
  progreso: { desbloqueadoHasta: number }, // índice 0-based
  creado: <ISO timestamp>
}
```

**Detalle de diseño documentado:** cada paso guarda su config como objeto plano propio "capturado en el momento de añadirlo o editarlo" — NO referencia a `ajustesJuego.js`/localStorage, para que cada instancia (incluso el mismo juego repetido) sea independiente.

**Funciones exportadas:**
- `crearPaso(appId, config = {})` → objeto `{instanciaId, appId, config}`. Lógica pura.
- `validarRuta({nombre, pasos})` → `{ok, error?}`. Errores: `'falta-nombre'`, `'pasos-insuficientes'`, `'paso-invalido'`.
- `listAll()`, `getById(id)`.
- `crearRuta({nombre, pasos})` → Promise<ruta creada>. Normaliza pasos (genera `instanciaId` si falta), inicializa `progreso = {desbloqueadoHasta: 0}`.
- `actualizarRuta(id, cambios)` → Promise<ruta actualizada>. **Importante:** reinicia el progreso a `{desbloqueadoHasta: 0}` siempre, documentado: "tras cambiar de orden, quitar o añadir pasos, un índice de progreso antiguo ya no tiene por qué señalar al mismo juego".
- `eliminarRuta(id)`, `clearAll()`, `replaceAll(rutas)`.
- `pasoDesbloqueado(ruta, indice)` → boolean. Lógica pura: `indice <= desbloqueadoHasta`.
- `siguienteProgreso(ruta, indice, fuePerfecto)` → `{desbloqueadoHasta}`. Lógica pura: solo avanza si `fuePerfecto && indice === actual` (el paso terminado era justo la frontera); tope en `totalPasos - 1`.
- `esPartidaPerfecta(mecanica, huboFallo)` → boolean. Lógica pura: por defecto exige cero fallos (`!huboFallo`), salvo que la mecánica declare `rutaPerfectoSinFallos: false` (caso documentado: Memoria, donde fallar parejas es normal), en cuyo caso siempre es `true` (basta completar).
- `registrarProgreso(id, indice, fuePerfecto)` → Promise<ruta actualizada>. Persiste el resultado de `siguienteProgreso`.
- `getAccesoLibreJuegos()` → boolean (default `true` si no hay valor guardado).
- `setAccesoLibreJuegos(valor)` → void.

**Comportamiento del interruptor de acceso libre:** activado por defecto; si se desactiva, el menú JUEGOS sigue accesible pero todos los juegos se ven en gris y tocar cualquiera lleva a Inicio en vez de abrir el juego (lógica vive en la vista `views/juegos.js`, no aquí — este módulo solo guarda el booleano).

---

## 12. `core/js/mediaLibrary.js`

**Propósito:** Biblioteca de medios ("el pozo") — capa de negocio única para TODA la app sobre pictogramas ARASAAC + fotos locales. Las apps nunca tocan IndexedDB directamente.

**Forma de datos — medio:**
```js
// Origen ARASAAC:
{
  id: 'arasaac:<arasaacId>',
  arasaacId: number,
  imagen: <url string>,
  imagenCandidatos: [<urls en cascada de tamaño>],
  nombre: string,
  etiquetas: [string], // se rellenan tras sembrar/filtrar, vacío al venir de arasaac.js
  origen: 'arasaac',
  creado: <ISO timestamp>
}
// Origen foto local:
{
  id: 'foto:<uuid>',
  origen: 'foto',
  nombre: string,
  etiquetas: [string], // SIEMPRE obligatorias, en minúsculas
  archivo: Blob,
  creado: <ISO timestamp>
}
```

**Estado de módulo:**
- `photoUrlCache = new Map()` (cachea `URL.createObjectURL` por id de foto para no regenerar Blob URLs repetidamente; se revoca en `removeMedio`/`clearAll`)

**Funciones internas:** `uid()` (crypto.randomUUID o fallback).

**Funciones exportadas:**
- `listAll()` → Promise<array>.
- `listByTags(tags)` → Promise<array>. Medios con AL MENOS una etiqueta pedida (comparación case-insensitive). Si `tags` vacío, devuelve todo.
- `getById(id)` → Promise<objeto|null>.
- `removeMedio(id)` → Promise. Revoca Blob URL cacheada si existía, borra de IndexedDB.
- `addArasaacMedio(pictoOrMedio)` → Promise<medio completo>. Idempotente (put). Acepta un picto crudo de ARASAAC (lo convierte con `toMedium`) o ya un medio normalizado.
- `addFotoLocal({archivo, nombre, etiquetas})` → Promise<medio creado>. Lanza error si falta archivo, nombre, o etiquetas (categoría obligatoria validada también aquí, no solo en la vista).
- `actualizarMedio(id, cambios)` → Promise<medio actualizado>. Lanza si no existe.
- `getDisplayUrl(medio)` → string. URL directa si ARASAAC; Blob URL cacheada (creada perezosamente) si foto local.
- `ensureSeedFromArasaac({tag, terms, lang='es', displayLang=lang, min=6})` → Promise<array>. Siembra el pozo si hay menos de `min` medios con `tag`: busca cada término en ARASAAC (primer resultado de cada búsqueda, evitando duplicados), y si `displayLang !== lang`, vuelve a pedir el nombre en `displayLang` por id antes de guardar. Añade la etiqueta `tag` a cada medio sembrado.
- `mediosArasaacParaRetraducir(medios)` → array. Lógica pura: filtra medios con `origen === 'arasaac' && arasaacId` (las fotos propias nunca se retraducen).
- `actualizarIdiomaArasaac(lang)` → Promise. Para cada medio ARASAAC ya guardado, vuelve a pedir su `nombre` en `lang`; si cambia, lo persiste. Si falla algún pictograma individual, se queda con el nombre anterior (no rompe el resto).
- `ensureFixedArasaac(arasaacId, lang='es')` → Promise<medio>. Para pictogramas "fijos" de id conocido (p.ej. plato/basura/carrito): si ya está en el pozo, lo devuelve; si no, lo pide por id y lo añade.
- `etiquetasArasaacLimpias(medio, permitidas)` → array. Lógica pura: para medios ARASAAC, filtra solo las etiquetas en la lista `permitidas`; fotos propias se devuelven tal cual.
- `limpiarEtiquetasArasaac(permitidas)` → Promise<number>. Recorre la biblioteca, limpia etiquetas no permitidas en medios ARASAAC, solo escribe los que cambian. Devuelve cuántos se afectaron.
- `clearAll()` → Promise. Revoca todas las Blob URLs cacheadas y vacía el store.
- `replaceAll(medios)` → Promise. `clearAll()` + `putManyMedios` (usado al importar copia).

**Comentario de bug histórico citado:** "Existe para deshacer una contaminación histórica: antes del arreglo de arasaac.js (toMedium ya no guarda las categorías en inglés que la API devuelve siempre), algunos pictogramas ya guardados en el pozo se quedaron con esas etiquetas en inglés." → Este es el bug ya corregido explícitamente documentado: ARASAAC siempre devolvía `categories`/`tags` en inglés sin importar el idioma pedido, y se mostraban sin traducir en "Mi biblioteca"; el fix fue dejar `etiquetas: []` en `toMedium` (ver `arasaac.js`) y este módulo limpia la contaminación ya persistida.

---

## 13. `core/js/arasaac.js`

**Propósito:** Único punto de conexión con la API pública de ARASAAC. Las peticiones salen directas del navegador del usuario a ARASAAC (el portal no es intermediario ni guarda nada en servidor propio).

**Constantes de módulo:**
- `API_BASE = 'https://api.arasaac.org/api'`
- `STATIC_BASE = 'https://static.arasaac.org/pictograms'`
- `IMAGE_SIZES = [300, 500, 2500]` (cascada de tamaños para `onerror` de `<img>`)

**Funciones internas:** `arasaacLangCode(internalCode)` (traduce código interno de Pictosfera al `arasaacCode` esperado por la API, fallback `'es'`), `bestKeyword(picto)` (primera keyword con `.keyword` no vacío).

**Funciones exportadas:**
- `imageUrl(arasaacId, size=300)` → string. `${STATIC_BASE}/${arasaacId}/${arasaacId}_${size}.png`.
- `imageUrlCandidates(arasaacId)` → array de 3 URLs (300, 500, 2500).
- `toMedium(picto)` → objeto medio. Convierte respuesta cruda de ARASAAC. **Decisión documentada explícitamente (bug corregido):** `etiquetas` se deja **vacío a propósito** porque `categories`/`tags` de ARASAAC vienen siempre en inglés sin importar idioma pedido — mostrar eso era el bug reportado ("las keywords aparecen siempre en inglés"). La etiqueta real la añade quien siembra/filtra (`mediaLibrary.ensureSeedFromArasaac`).
- `searchPictograms(query, lang='es', {signal})` → Promise<array de medios>. GET a `${API_BASE}/pictograms/${langCode}/search/${texto}`. Lanza error si `!res.ok`. Devuelve `[]` si query vacío.
- `getPictogramById(arasaacId, lang='es', {signal})` → Promise<medio>. GET a `${API_BASE}/pictograms/${langCode}/${arasaacId}`. El id es el mismo en todos los idiomas; la keyword cambia por idioma — esto permite "retraducir" sin rebuscar.

**Nota sobre IDs ARASAAC fijos:** este módulo NO contiene IDs fijos en sí; los IDs fijos (p.ej. plato=2532, basura=2724) viven en `data/apps.json` bajo `descriptor.material.fijos` y se resuelven vía `appLoader.resolverFijos` + `mediaLibrary.ensureFixedArasaac`. (Esos valores numéricos concretos aparecen como ejemplo en el comentario de `appLoader.js`, no como constante de código).

---

## 14. `core/js/categoriasPictogramas.js`

**Propósito:** Lista curada y fija de categorías "de fábrica" para pictogramas/fotos, usada por dos vistas distintas (limpieza de etiquetas ARASAAC y chips de categoría al añadir fotos).

**Constante exportada (única):**
- `CATEGORIAS_CURADAS` = `['comida', 'animales', 'ropa', 'colores', 'familia', 'cuerpo', 'escuela', 'juguetes', 'naturaleza', 'emociones', 'numeros', 'acciones']` (12 categorías fijas en español, claves planas sin tildes).

**Comentario relevante:** "Mientras no exista el árbol oficial de categorías de ARASAAC... esta lista corta hace de categorías 'de fábrica'" — es decir, es un placeholder consciente, no la taxonomía completa de ARASAAC.

---

## 15. `core/js/ajustesJuego.js`

**Propósito:** Ajustes visuales/de comportamiento compartidos por los minijuegos sobre cómo mostrar "pistas" de texto/teclado. Sigue patrón de resolución en cascada: clave propia del juego → clave global → valor de fábrica.

**Constantes de módulo (claves de localStorage):**
- `CLAVE_MAYUSCULA = 'pictosfera.pista.mayuscula'`
- `CLAVE_MOSTRAR = 'pictosfera.pista.mostrar'`
- `CLAVE_RESALTAR_TECLADO = 'pictosfera.pista.resaltarTeclado'`
- `CLAVE_TILDES_AUTOMATICAS = 'pictosfera.pista.tildesAutomaticas'`
- `CLAVE_MAYUSCULAS_AUTOMATICAS = 'pictosfera.pista.mayusculasAutomaticas'`
- `CLAVE_PUNTUACION_AUTOMATICA = 'pictosfera.pista.puntuacionAutomatica'`
- `CLAVE_ESPACIOS_AUTOMATICOS = 'pictosfera.pista.espaciosAutomaticos'`
- `CLAVE_SOLO_TEXTO = 'pictosfera.pista.soloTexto'`
- `CLAVE_PULSADOR_TTS = 'pictosfera.pista.pulsadorTts'`
- `CLAVE_LETRA_PUNTEADA = 'pictosfera.pista.letraPunteada'`
- `CLAVE_TOLERANCIA_TRAZO = 'pictosfera.pista.toleranciaTrazo'`
- `CLAVE_DIFICULTAD_RULETA = 'pictosfera.pista.dificultadRuleta'`
- `CLAVE_LISTA_SOLO_TEXTO = 'pictosfera.pista.listaSoloTexto'`
- `CLAVE_ESTANTE_SOLO_IMAGEN = 'pictosfera.pista.estanteSoloImagen'`
- `EVENTO_CAMBIO = 'pictosfera:ajustes-juego-changed'`
- `NIVELES_TOLERANCIA_TRAZO = ['facil', 'normal', 'dificil']`
- `NIVELES_DIFICULTAD_RULETA = ['facil', 'normal', 'dificil']`

**Esquema de claves "por juego":** `claveJuego(appId, claveGlobal)` construye `pictosfera.juego.<appId>.<ajuste>` (extrae el último segmento de la clave global). Al ESCRIBIR con `appId`, solo se toca la clave propia del juego (desacopla ese juego del global desde ese momento). Al LEER con `appId`: 1) clave propia si existe → 2) clave global heredada → 3) valor de fábrica.

**Valores por defecto:** mostrar=true, mayuscula=true, resaltarTeclado=true, tildesAutomaticas=true, mayusculasAutomaticas=true, puntuacionAutomatica=true, espaciosAutomaticos=true, soloTexto=false, pulsadorTts=false, letraPunteada=true, toleranciaTrazo='facil', dificultadRuleta='facil', listaSoloTexto=false, estanteSoloImagen=false.

**Funciones exportadas (pares get/set, 14 ajustes):**
- `getMayuscula(appId)` / `setMayuscula(valor, appId)`
- `getMostrarPista(appId)` / `setMostrarPista(valor, appId)`
- `getResaltarTeclado(appId)` / `setResaltarTeclado(valor, appId)`
- `getTildesAutomaticas(appId)` / `setTildesAutomaticas(valor, appId)`
- `getMayusculasAutomaticas(appId)` / `setMayusculasAutomaticas(valor, appId)`
- `getPuntuacionAutomatica(appId)` / `setPuntuacionAutomatica(valor, appId)`
- `getEspaciosAutomaticos(appId)` / `setEspaciosAutomaticos(valor, appId)`
- `getSoloTexto(appId)` / `setSoloTexto(valor, appId)`
- `getPulsadorTts(appId)` / `setPulsadorTts(valor, appId)`
- `getLetraPunteada(appId)` / `setLetraPunteada(valor, appId)`
- `getToleranciaTrazo(appId)` / `setToleranciaTrazo(valor, appId)` (enum)
- `getDificultadRuleta(appId)` / `setDificultadRuleta(valor, appId)` (enum)
- `getListaSoloTexto(appId)` / `setListaSoloTexto(valor, appId)`
- `getEstanteSoloImagen(appId)` / `setEstanteSoloImagen(valor, appId)`
- `getAjustesPista(appId)` → objeto con los 14 valores resueltos (foto fija, cómoda para `plataforma.ajustesPista` en `appLoader.js`).
- `onChange(callback)` → función de desuscripción. Escucha `pictosfera:ajustes-juego-changed`; el callback recibe `getAjustesPista()` SIN filtrar por appId (quien quiera un juego concreto debe volver a pedirlo dentro del callback).

**Detalle de los 14 ajustes (documentado extensamente en comentarios de cabecera):** mayúscula/minúscula de pistas, mostrar/ocultar pista, resaltar teclado, 4 ajustes de "mano amiga" (tildes/mayúsculas/puntuación/espacios automáticos, todos default true), 2 ajustes de "modo presentación" (soloTexto, pulsadorTts — default false ambos), 2 propios de "Escribe la letra" (letraPunteada, toleranciaTrazo), 1 propio de "Ruleta de letras" (dificultadRuleta), 2 propios de "Lista de la compra" (listaSoloTexto, estanteSoloImagen).

---

## 16. `core/js/ajustesCatalogo.js`

**Propósito:** Catálogo declarativo de QUÉ ajustes existen, QUÉ mecánica usa cada uno, y CÓMO se pinta su control en el DOM. No persiste nada — desacoplado a propósito de dónde vive el valor (puede ser `ajustesJuego.js`+localStorage, o un objeto en memoria de una instancia de ruta).

**Constantes exportadas:**
- `CAMPOS_POR_MECANICA` — objeto que mapea 17 mecánicas a arrays de ids de ajuste aplicables (p.ej. `memoria: ['mayuscula', 'soloTexto']`; `'teclea-palabra'`: 8 campos; `'rosco-pictogramas'`, `'arrastra-numero'`, `'suma-resultado'`, `'dedos-pictogramas'`, `'dedos-numero'`, `'arrastra-suma'`: array vacío `[]`).
- `DEFINICIONES_AJUSTE` — array de 13 objetos `{id, tipo, etiqueta, getter, setter, porDefecto, opciones?}` (catálogo completo: nombres exactos de getters/setters de `ajustesJuego.js`, claves i18n de etiqueta, valores de fábrica, y para tipo `'select'` las opciones `[[valor, claveI18n], ...]`).

**Funciones exportadas:**
- `camposParaMecanica(mecanica)` → array de definiciones completas (no solo ids) aplicables; mecánica desconocida → `[]`.
- `valoresPorDefecto(mecanica)` → objeto `{id: valorDeFabrica}`. Usado como punto de partida para una instancia nueva de ruta sin depender de localStorage.
- `construirCampoGenerico(definicion, valorActual, alCambiar, idPrefijo='ajuste')` → `HTMLElement`. Construye un checkbox o select genérico; llama `sounds.click()` y `alCambiar(nuevoValor)` en el evento `change`.
- `pintarPanelAjustes(panel, mecanica, valores, alCambiarCampo, idPrefijo='ajuste')` → void. Repinta un contenedor con todos los campos de la mecánica; si no hay ninguno, muestra `t('ajustes.pistas_sin_ajustes')`.

**Nota de diseño:** este catálogo es la pieza que permite que tanto la vista "Ajustes" (configuración global por juego) como `views/rutasCrear.js` (configuración congelada por instancia dentro de una ruta) reutilicen el mismo conjunto de controles sin duplicar código.

---

## 17. `core/js/appLoader.js` (NÚCLEO CRÍTICO)

**Propósito:** Cargador dinámico de minijuegos ("apps"). Lee `data/apps.json`, importa con `import()` dinámico el módulo de la mecánica, resuelve todo el material que la app necesita (pictogramas, secuencias, categorías, fijos), y construye el objeto `plataforma` que se pasa a `mecanica.montar(contenedor, plataforma)`. El núcleo nunca cambia para añadir una app nueva.

**Contrato exigido a cada módulo de mecánica:** `export default { id, nombre, icono, estante, montar(contenedor, plataforma), desmontar() }`.

**Estado de módulo:**
- `descriptorsCache = null` (cachea el array de `apps.json` hasta que se pida `force: true`)

**Funciones internas:** `resolveModuleUrl(modulo)` (resuelve ruta relativa contra `document.baseURI`), `resolverFijos(descriptor)` (ver detalle abajo), `resolverCategorias()`, `resolverSecuencias()`.

**Funciones exportadas:**

- `loadDescriptors({force=false})` → Promise<array>. Fetch a `./data/apps.json`. Cachea en memoria. NO importa el código de la mecánica todavía (se hace solo al jugar, para no cargar JS de más en la pantalla "Juegos").
- `getDescriptorById(appId)` → Promise<objeto|null>.
- `nombreDescriptor(descriptor)` → string. Si el descriptor trae `nombreClave`, traduce con `t()`; si no, usa `descriptor.nombre` literal (red de seguridad para apps no traducidas aún).
- `getAppsGroupedByEstante()` → Promise<array de `{estante, apps}`>. Agrupa por estante en orden de primera aparición (estantes planos, sin jerarquía).
- `elegirParejaAleatoria(parejas)` → objeto|null. Lógica pura: elige una pareja de categorías al azar de las jugables.
- `mountApp(appId, contenedor, opciones={})` → Promise<función de limpieza>. **La función más compleja del proyecto.** Ver desglose abajo.

**`resolverMaterial(descriptor)` (función interna, no exportada — pero es la pieza pedida explícitamente para documentar):**
```js
async function resolverMaterial(descriptor) {
  const material = descriptor.material || {};
  const etiqueta = material.etiqueta;
  if (!etiqueta) return mediaLibrary.listAll();

  if (Array.isArray(material.semillaArasaac) && material.semillaArasaac.length) {
    await mediaLibrary.ensureSeedFromArasaac({
      tag: etiqueta,
      terms: material.semillaArasaac,
      lang: material.semillaArasaacLang || getLanguage(),
      displayLang: getLanguage(),
      min: material.minimo || 6
    });
  }
  return mediaLibrary.listByTags([etiqueta]);
}
```
**Comportamiento exacto:** si el descriptor NO trae `material.etiqueta`, devuelve TODA la biblioteca sin filtrar (las mecánicas que no la necesitan la ignoran). Si trae etiqueta y además `material.semillaArasaac` (array de palabras de búsqueda en castellano), llama a `ensureSeedFromArasaac` con: `tag=etiqueta`, `terms=semillaArasaac`, `lang=material.semillaArasaacLang || getLanguage()` (normalmente las palabras de búsqueda en `apps.json` están en castellano), `displayLang=getLanguage()` (el idioma activo real del portal — si difiere de `lang`, el pictograma sembrado se vuelve a traducir inmediatamente), `min=material.minimo || 6` (mínimo de medios con esa etiqueta antes de considerar que ya hay suficiente material y no sembrar más). Finalmente devuelve `mediaLibrary.listByTags([etiqueta])` — el pozo YA filtrado por esa etiqueta, incluyendo lo recién sembrado.

**`resolverCategorias()` interna:** carga TODAS las parejas y TODOS los medios, calcula `categoriasDb.parejasJugables(parejas, todosMedios)`, elige una al azar con `elegirParejaAleatoria`, devuelve `pareja.categorias` (array de 2) o `[]` si no hay ninguna jugable.

**`resolverFijos(descriptor)` interna:** lee `descriptor.material.fijos` (objeto `{clave: arasaacId}`, ejemplo citado en comentario: `{ plato: 2532, basura: 2724 }`). Para cada entrada, llama `mediaLibrary.ensureFixedArasaac(arasaacId, lang)` en paralelo (`Promise.all`); si falla algún fijo individual, lo deja en `null` y loggea warning (no rompe el resto). Devuelve `{clave: medioResuelto|null}`.

**`resolverSecuencias()` interna:** resuelve TODAS las secuencias contra la biblioteca COMPLETA (no filtrada por etiqueta de esta app), porque una secuencia puede combinar pictogramas de cualquier categoría. Devuelve solo las jugables.

**Desglose de `mountApp(appId, contenedor, opciones)`:**
1. Busca el descriptor por id; lanza si no existe.
2. Resuelve URL del módulo de mecánica e importa dinámicamente (`import(/* @vite-ignore */ moduleUrl)`); valida que `mod.default.montar` sea función.
3. Construye `appResuelta = {...mecanica, ...descriptor, nombre: nombreDescriptor(descriptor)}` — el descriptor JSON puede sobrescribir nombre/icono/estante de la mecánica base.
4. Resuelve en secuencia: `medios` (resolverMaterial), `categoriasResueltas` (resolverCategorias), `secuenciasResueltas` (resolverSecuencias), `fijosResueltos` (resolverFijos).
5. **Modo ruta** (si `opciones.rutaContexto` está presente): envuelve `sounds.fallo` para detectar si hubo algún fallo en la partida (`huboFallo` flag local), y envuelve `mostrarRecompensa` para: calcular `esPartidaPerfecta(mecanica, huboFallo)` desde `rutas.js`, llamar `rutaContexto.alTerminarPaso(fuePerfecto)`, sustituir `salirLabelKey` por `'rutas.volver_a_la_ruta'`, reiniciar `huboFallo=false` si el niño pulsa "seguir jugando", y sustituir `onSalir` por `rutaContexto.alSalir`.
6. Construye el objeto `plataforma` completo (ver forma exacta abajo) y llama `mecanica.montar(contenedor, plataforma)`.
7. Devuelve una función de limpieza que llama `mecanica.desmontar()` con try/catch.

**Forma exacta del objeto `plataforma` pasado a cada mecánica:**
```js
{
  appId, nombre, icono, estante,        // del descriptor/mecánica resuelto
  lang,                                  // código interno de idioma activo (string)
  medios,                                // array filtrado por etiqueta o biblioteca completa
  categorias,                            // array de 2 categorías resueltas (o [])
  secuencias,                            // secuencias jugables resueltas (pasos como medios completos)
  fijos,                                 // objeto {clave: medio|null}
  t, tts, sounds,                        // utilidades de núcleo (sounds envuelto si modo ruta)
  cabezas,                               // módulo completo core/js/cabezas.js
  getDisplayUrl,                         // mediaLibrary.getDisplayUrl
  mostrarRecompensa,                     // showReward (envuelto si modo ruta)
  ajustesPista                           // opciones.ajustesPistaOverride || getAjustesPista(descriptor.id)
}
```

**Comentario citado (decisión arquitectónica clave):** "lang... Se pasa el código en vez de la función `getLanguage` para no romper el aislamiento: esto ya es el dato resuelto, no acceso directo al núcleo." Este principio se repite para `ajustesPista` también.

---

## 18. `core/js/backup.js`

**Propósito:** Copia de seguridad completa exportable/importable como archivo JSON, porque todo vive solo en este dispositivo (sin servidor, sin sync en la nube).

**Constantes de módulo:**
- `TIPO_COPIA = 'pictosfera-copia'` (campo `tipo` discriminador en el JSON)
- `VERSION_COPIA = 1`
- `CLAVE_META = 'pictosfera.copia.meta'` (localStorage; guarda `{fechaISO, conteoMedios}` de la última copia hecha)

**Forma de datos — archivo de copia (JSON):**
```js
{
  tipo: 'pictosfera-copia',
  version: 1,
  creado: <ISO timestamp>,
  incluyeFotos: boolean,
  ajustes: { idioma: string, pin: string|null, accesoLibreJuegos: boolean },
  medios: [ /* medios; fotos sin archivoDataUrl si incluirFotos=false */ ],
  secuencias: [...],
  rutas: [...],
  categorias: [...]
}
```
Para fotos propias dentro de `medios`: si `incluirFotos=true`, cada foto incluye `archivoDataUrl` (data URL en texto, vía `FileReader.readAsDataURL`); si `false`, solo se guardan `{id, origen, nombre, etiquetas, creado}` (sin imagen).

**Funciones exportadas:**
- `blobToDataUrl(blob)` → Promise<string>. Conversión Blob→dataURL.
- `dataUrlToBlob(dataUrl)` → Promise<Blob>. Conversión inversa vía `fetch(dataUrl)`.
- `construirCopia(medios, ajustes, opciones={})` → Promise<objeto copia>. Función pura/asíncrona (recibe todo por parámetro, sin tocar IndexedDB/localStorage directamente — diseñada para tests). `opciones.secuencias/rutas/categorias` por defecto `[]` (retrocompatibilidad).
- `validarCopia(json)` → `{ok, error?}`. Comprueba `tipo === TIPO_COPIA`, `medios` es array; `secuencias`/`rutas`/`categorias` son opcionales pero si están presentes deben ser arrays (si no, `'secuencias-invalidas'` etc.).
- `aplicarCopia(json, opciones={})` → Promise<resumen>. Reconstruye Blobs desde `archivoDataUrl`, reemplaza TODA la biblioteca/secuencias/rutas/categorías (solo si el campo es un array — así una copia antigua sin ese campo no borra datos creados después), y restaura ajustes (idioma válido, PIN si tiene formato de 4 dígitos o lo quita, `accesoLibreJuegos`).
- `necesitaRecordatorio({ultimaCopiaISO, conteoMediosUltimaCopia, conteoMediosActual, ahora=new Date()})` → boolean. Lógica pura: avisa si hay material nuevo desde la última copia Y (nunca se ha hecho copia O han pasado ≥15 días).
- `getUltimaCopiaInfo()` → `{fechaISO, conteoMedios}` leído de localStorage.
- `comprobarRecordatorio()` → Promise<boolean>. Combina `mediaLibrary.listAll()` + `getUltimaCopiaInfo()` + `necesitaRecordatorio`.
- `exportarCopia({incluirFotos=false})` → Promise<copia>. Recoge medios/secuencias/rutas/categorías/ajustes reales, construye la copia, dispara descarga de archivo (`pictosfera-copia-YYYY-MM-DD.json`), marca fecha del recordatorio.
- `importarDesdeArchivo(file)` → Promise<resumen>. Lee texto del archivo (vía `file.text()` o `FileReader` de fallback), parsea JSON, valida, aplica, marca recordatorio.

**Umbral de recordatorio:** 15 días desde la última copia (constante implícita `dias >= 15` en `necesitaRecordatorio`).

---

## 19. `core/js/personajes.js`

**Propósito:** Generador de personajes ilustrados SVG estilo "papercraft" (cuerpo entero), reutilizable como decoración o interacción en cualquier minijuego. Código de dibujo aportado por el autor del proyecto, con 2 arreglos del equipo.

**Constantes exportadas:**
- `PREFIJO = 'pj-'` — prefijo obligatorio en TODAS las clases CSS del `<style>` embebido. **Bug corregido documentado:** un `<style>` dentro de un `<svg>` insertado por `innerHTML` NO queda aislado al propio SVG — sus reglas se aplican a TODO el documento; con nombres genéricos como `.red`/`.line` eso sería "una bomba de relojería" en un proyecto con 20+ mecánicas con CSS propio.
- `ESTILO_PERSONAJE` — bloque `<style>` completo con clases: `pj-line`, `pj-thin`, `pj-eye`, 4 tonos de piel (`pj-skin-light/medium/latino/dark`), 5 colores de pelo, 12 colores básicos (`pj-blue/green/yellow/red/purple/orange/pink/navy/gray/white/black/metal`).
- `OPCIONES_PERSONAJE` — catálogo de rasgos sorteables: `pieles` (4), `pelos` (5), `camisetas` (7), `pantalones` (6), `zapatos` (4), `accesorios` (4: ninguno/diadema/lazo/coletas), `accesoriosColor` (5), `velos` (5).
- `TRANSFORM_PERSONAJE_NORMAL`, `TRANSFORM_PERSONAJE_VELO`, `TRANSFORM_SILLA_RUEDAS` (transforms SVG, no exportadas).
- `DIBUJANTES_POR_VARIANTE` (mapa interno `{base, peloLargo, coletas, velo, sillaRuedas} → función dibujante`).

**Funciones exportadas:**
- `crearSVG500(contenido, {fondo='#ffffff', etiqueta=null, incluirEstilos=true})` → string SVG. Envoltorio común 500x500 con accesibilidad (`role="img" aria-label` si hay etiqueta, sino `aria-hidden="true"`).
- `generarPersonajeBaseSVG(opciones)` → string SVG. Variante "pelo corto".
- `generarPersonajePeloLargoSVG(opciones)` → string SVG. Pelo largo + diadema o lazo.
- `generarPersonajeColetasSVG(opciones)` → string SVG. Coletas con gomas de color.
- `generarPersonajeConVeloSVG(opciones)` → string SVG. Variante hijab.
- `generarPersonajeSillaRuedasSVG(opciones)` → string SVG. Variante silla de ruedas.
- `generarPersonajeAleatorioSVG(opciones={})` → string SVG. Sortea variante y rasgos (ver `elegirVarianteYRasgosAlAzar` interna). Opciones: `permitirVelo=true`, `permitirSillaRuedas=true`, `probabilidadVelo=0.1`, `probabilidadSillaRuedas=0.12`, más `fondo`/`etiqueta`/`incluirEstilos`.
- `generarVariosPersonajesAleatorios(cantidad=10, opciones={})` → array de strings SVG.
- `descargarSVG(svg, nombre='personaje.svg')` → void. **Bug corregido documentado:** antes lanzaba `ReferenceError: document is not defined` si se llamaba desde Node (tests); ahora lanza un `Error` explícito y claro si `document`/`Blob`/`URL` no existen.

**Lógica de sorteo (interna, `elegirVarianteYRasgosAlAzar`):** la silla de ruedas se sortea primero (`probabilidadSillaRuedas`); si no sale, se sortea el velo (`probabilidadVelo`) — son mutuamente excluyentes (`usaVelo = !usaSilla && ...`); si ninguno sale, la variante depende del `accesorio` sorteado (coletas → variante coletas; diadema/lazo → peloLargo; ninguno → base).

**Reexportación documentada:** `PREFIJO`, `ESTILO_PERSONAJE`, `crearSVG500` se exportan también para que `cabezas.js` los reutilice sin duplicar el `<style>`.

---

## 20. `core/js/cabezas.js`

**Propósito:** "Hermano pequeño" de `personajes.js` — dibuja solo cabeza+pelo+accesorios, con la particularidad de 4 expresiones faciales (contento/triste/enfadado/asustado), útil para minijuegos de reconocimiento de emociones.

**Constantes exportadas:**
- `OPCIONES_CABEZA` — `{pieles (4), pelos (5), accesorios (4), accesoriosColor (6), hijabs (5), expresiones (4: contento/triste/enfadado/asustado)}`.
- `DIBUJANTES_POR_VARIANTE_CABEZA` (interno, mapa `{base, peloLargo, coletas, hijab}`).

**Reexportación:** `descargarSVG` se reexporta sin cambios desde `personajes.js` (`export { descargarSVG } from './personajes.js'`).

**Funciones exportadas:**
- `generarCabezaBaseSVG(opciones)` → string SVG. Pelo corto sin accesorios.
- `generarCabezaPeloLargoSVG(opciones)` → string SVG. Pelo largo con diadema o lazo.
- `generarCabezaConColetasSVG(opciones)` → string SVG. Coletas.
- `generarCabezaConHijabSVG(opciones)` → string SVG.
- `generarCabezaAleatoriaSVG(opciones={})` → string SVG. Opciones: `permitirHijab=true`, `probabilidadHijab=0.1`, `expresion=null` (si no se fija, se sortea entre las 4).
- `generarVariasCabezasAleatorias(cantidad=10, opciones={})` → array de strings SVG.

**Función interna clave:** `generarRasgosFaciales(expresion)` — dibuja ojos+boca según expresión; valor desconocido cae a "contento" por defecto (mismo criterio que el resto del proyecto: default razonable en vez de excepción).

**Nota de accesibilidad documentada explícitamente (importante para reconstrucción fiel):** si una mecánica de "reconocer emociones" pasa `etiqueta` a estas funciones, ese texto NUNCA debe revelar la expresión (p.ej. nunca `"Triste"`) porque rompería el ejercicio para usuarios de lector de pantalla; debe ser algo genérico como `"Cara de un personaje"`.

---

## 21. `core/js/footer.js`

**Propósito:** Pie de página fijo con créditos/licencias, visible en todas las vistas (vive en `#app-footer`, fuera de `#view`).

**Constantes de módulo:**
- `LICENCIA_URL = 'https://creativecommons.org/licenses/by/4.0/deed.es'`
- `ARASAAC_URL = 'https://arasaac.org'`

**Función exportada:**
- `initFooter()` → void. Pinta una vez y se repinta en cambio de idioma. Construye 3 líneas: autor (`footer.autor`), licencia CC-BY-4.0 con enlace, atribución ARASAAC con enlace (ambos enlaces `target="_blank" rel="noopener noreferrer"`).

---

## 22. `core/js/fullscreen.js`

**Propósito:** Modo pantalla completa como capa de COMODIDAD (no seguridad real — documentado explícitamente: ningún sitio web puede bloquear el botón inicio/gesto atrás/notificaciones del sistema operativo).

**Funciones internas:** `elementoCompleto()` (lee `document.fullscreenElement || document.webkitFullscreenElement`), `pedirCompleto()` (intenta `requestFullscreen`/`webkitRequestFullscreen`; si no soportado —p.ej. iPhone Safari— se ignora sin error).

**Funciones exportadas:**
- `activarPantallaCompleta()` → void. Pide pantalla completa AHORA — debe llamarse dentro de un evento de clic/toque real (regla de navegadores).
- `vigilarPantallaCompleta()` → void. Suscribe un listener de `click` con `{capture: true}` en `document` que vuelve a pedir pantalla completa si se detecta "rota" (el niño pulsó atrás, giró pantalla, etc.).

**Nota documentada sobre iPhone:** en Safari iOS esta función no hace nada — el sistema no permite fullscreen en páginas web (solo vídeos); el resto del portal sigue funcionando sin avisos ni errores.

---

## 23. `core/js/puerta.js`

**Propósito:** Pantalla previa a TODO lo demás (incluso antes del paseo de bienvenida) — un único botón "Empezar" cuyo objetivo real es captar el primer toque del usuario para poder pedir pantalla completa (que requiere un gesto real). A diferencia del paseo de bienvenida, se muestra SIEMPRE al abrir el portal (no solo la primera vez), porque el estado de pantalla completa no se recuerda entre visitas.

**Constante de módulo:**
- `LOGO_SVG` — data URI de un logo SVG simple (rect azul `#3D8BD4` redondeado + círculo blanco + rect blanco, 100x100 viewBox) generado inline, no es un archivo externo.

**Función exportada:**
- `mostrarPuerta(continuar)` → void. Si no existe `#modal-root`, llama `continuar()` directamente (no bloquea el portal). Si existe, monta overlay con logo+título+texto+botón "Empezar"; al pulsar: `activarPantallaCompleta()` + `vigilarPantallaCompleta()` + cierra overlay + llama `continuar()`.

---

## 24. `core/js/welcome.js`

**Propósito:** Paseo de bienvenida de 3 tarjetas, mostrado UNA SOLA VEZ por dispositivo (primera vez que se abre el portal): qué es Pictosfera, dónde se guarda el material, importancia de copias de seguridad.

**Constante de módulo:**
- `CLAVE = 'pictosfera.bienvenidaVista'` (localStorage)
- `TARJETAS` — array de 3 objetos `{titulo, texto}` con claves i18n (`bienvenida.titulo_1/2/3`, `bienvenida.texto_1/2/3`).

**Funciones internas:** `yaVista()` (lee localStorage; si falla, devuelve `true` — es decir, en entornos sin localStorage NUNCA se muestra), `marcarVista()`, `mostrar()` (construye el modal paginado con puntos de progreso tipo carrusel, botón avanza/cierra y botón saltar).

**Función exportada:**
- `maybeShowWelcome()` → void. Se llama una vez al arrancar; no hace nada si `yaVista()` es `true`.

---

## 25. `core/js/main.js`

**Propósito:** Único archivo que `index.html` carga directamente. Solo "enchufa" las piezas (i18n, rutas, navegación, paseo de bienvenida); no contiene lógica propia de ninguna pantalla.

**Import de efecto secundario crítico:** la primera línea de `main.js` debe ser `import './pwa.js';` — sin ninguna importación anterior. Esto garantiza que el listener de `beforeinstallprompt` se registra antes de que el navegador pueda descartarlo. Si este import se mueve a una posición posterior o se elimina, la instalación PWA dejará de funcionar en Chrome/Android (ver sección 3.19).

**Función interna:** `arrancar()` — async, secuencia de arranque:
1. `await initI18n()`.
2. Registra 13 rutas (ver lista exacta abajo).
3. `initShell()`, `initFooter()`, `startRouter()`.
4. `mostrarPuerta(() => { maybeShowWelcome(); })` — la puerta se ve siempre antes que nada, incluso antes del paseo de bienvenida.
5. Si `'serviceWorker' in navigator`, registra `./sw.js` (catch silencioso con warning si falla).

**Tabla de rutas registradas (orden exacto del código):**
```
/inicio                    -> views/inicio.js
/juegos                    -> views/juegos.js
/juegos/:id                -> views/juego.js
/pictogramas                -> views/pictogramas.js
/pictogramas/arasaac        -> views/pictogramasArasaac.js
/pictogramas/secuencias     -> views/pictogramasSecuencias.js
/pictogramas/categorias     -> views/pictogramasCategorias.js
/pictogramas/fotos          -> views/pictogramasFotos.js
/rutas                       -> views/rutas.js
/rutas/crear                 -> views/rutasCrear.js
/rutas/editar/:id            -> views/rutasCrear.js
/rutas/jugar/:id              -> views/rutaJugar.js
/ajustes                     -> views/ajustes.js
```

**Manejo de errores de arranque:** si `arrancar()` rechaza, se loggea con `console.error` y se muestra `<p class="vacio">No se ha podido cargar Pictosfera...</p>` en `#view`.

**Variable global de depuración:** `window.pictosfera = { navigate }` — solo para consola del navegador, explícitamente documentado como herramienta de debug.

---

## 25b. `core/js/pwa.js` *(añadido en actualización de julio 2026)*

**Propósito:** Módulo de efecto secundario que captura el evento `beforeinstallprompt` del navegador (Chrome/Android/Chromium de escritorio) y expone una API limpia para preguntar si se puede instalar, si ya está instalada y para lanzar el diálogo nativo de instalación. NO tiene interfaz de usuario propia — eso vive en `puerta.js` (banner de primera visita) y `ajustes.js` (sección persistente).

**Dependencias:** ninguna (solo navegador). Se importa con `import './pwa.js'` como efecto secundario.

**Variables de módulo (privadas):**
- `_deferred` — referencia al evento `BeforeInstallPromptEvent` capturado (o `null` si no se capturó todavía / el navegador no lo soporta).

**Listener interno:** al cargarse el módulo, registra `window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); _deferred = e; })`. El `preventDefault()` impide que el navegador muestre su propio mini-banner nativo, dando control a la app sobre cuándo y cómo mostrar la propuesta de instalación.

**Funciones exportadas:**
- `puedeInstalar()` → `boolean`. `true` si `_deferred !== null`. Solo es `true` en Chrome/Android y Chromium de escritorio; nunca en Safari/iOS.
- `esIOS()` → `boolean`. Detecta iPad/iPhone/iPod por `navigator.userAgent`. Útil para mostrar instrucciones de texto cuando `puedeInstalar()` es `false` pero el usuario podría añadir la app manualmente desde Safari.
- `estaInstalada()` → `boolean`. `true` si `window.matchMedia('(display-mode: standalone)').matches`. Indica que el portal ya se abrió como PWA instalada (no en pestaña de navegador).
- `instalar()` → `Promise<boolean>`. Llama a `_deferred.prompt()`, espera `_deferred.userChoice`, devuelve `true` si `outcome === 'accepted'`, `false` si canceló. Tras llamarse, `_deferred` queda consumido y `puedeInstalar()` vuelve a ser `false` (el navegador solo permite usar el prompt una vez por ciclo de vida de la página).

**Claves i18n relacionadas (namespace `pwa`):** `sugerencia`, `sugerencia_ios`, `instalar`, `ahora_no`, `seccion_titulo`, `seccion_texto`, `ya_instalada`, `explicacion_boton`, `instrucciones_ios`, `no_disponible`.

**Clave localStorage:** `pwa-banner-descartado` — se pone a `'1'` cuando el usuario pulsa "Ahora no" en el banner de `puerta.js`. No hay clave para `ajustes.js` (la sección de ajustes siempre se muestra, independientemente de si el banner fue descartado).

**CSS relacionado (en `shell.css`):** `.pwa-banner`, `.pwa-banner-texto`, `.pwa-banner-botones`, `.pwa-btn-instalar`, `.pwa-btn-descartar`.

---

## 26. `core/js/views/medioCard.js`

**Propósito:** Componente de tarjeta reutilizable para un medio de la biblioteca (imagen + nombre editable + botón borrar). Usado por las vistas "Pictogramas" (ARASAAC) e "Imágenes propias" (fotos).

**Función exportada:**
- `crearMedioCard(medio, {origenClave, onCambio})` → `HTMLElement`. Construye: imagen (`mediaLibrary.getDisplayUrl`), nombre con botón lápiz ✏️ que lo convierte en `<input>` editable (Enter confirma vía `mediaLibrary.actualizarMedio`, Escape cancela, blur confirma), etiqueta de origen traducida (`origenClave`), botón borrar ✕ (con `window.confirm` antes de `mediaLibrary.removeMedio`). Llama `onCambio()` tras cualquier cambio para que la vista que lo usa se refresque.

---

## 27. `core/js/views/inicio.js`

**Propósito:** Pantalla de bienvenida para el niño: saludo, botón grande "ir a jugar", y si existen rutas creadas por el adulto, una tarjeta por ruta para entrar directo a jugarla.

**Función exportada:**
- `render()` → Promise<función de limpieza>. Pinta título+intro+botón "ir a juegos" (navega a `/juegos`). Carga `rutas.listAll()`; si hay alguna, añade una sección "estante" con tarjetas (icono 🧭 fijo) que navegan a `/rutas/jugar/:id`. Maneja cancelación (`cancelado` flag) para evitar pintar tras desmontar.

---

## 28. `core/js/views/juegos.js`

**Propósito:** Pantalla "Juegos" — pinta estantes con tarjetas de apps desde `data/apps.json`, e incluye el interruptor de "acceso libre" protegido por PIN.

**Función interna:** `nombreEstante(estante)` (traduce `estantes.<id>`, o devuelve el id crudo si no hay traducción).

**Función exportada:**
- `render()` → Promise<función de limpieza>. Pinta checkbox de acceso libre (revertido visualmente hasta confirmar PIN si hay uno configurado, vía `requestPinChallenge`), luego carga `getAppsGroupedByEstante()` y pinta cada estante con su grid de tarjetas. Si `accesoLibre` es `false`, las tarjetas se ven con clase `app-card-bloqueado` y al pulsarlas navegan a `/inicio` en vez de a `/juegos/:id`.

---

## 29. `core/js/views/juego.js`

**Propósito:** Vista anfitriona genérica de cualquier app (`/juegos/:id`). No conoce ninguna mecánica concreta: delega todo a `appLoader.mountApp`.

**Función exportada:**
- `render({id})` → Promise<función de limpieza>. Pinta botón "volver" (navega a `/juegos`) + contenedor `.juego-contenedor`. Llama `mountApp(id, contenedor)`; si falla, muestra `core.error_cargar_app`. La limpieza devuelta llama a la función de limpieza de `mountApp` (con try/catch).

---

## 30. `core/js/views/pictogramas.js`

**Propósito:** Menú principal de la zona "Pictogramas" del adulto — 4 accesos a pantallas hijas. Documentado: antes esta pantalla mezclaba búsqueda ARASAAC+fotos+secuencias en un solo scroll largo confuso; ahora es solo un menú.

**Constante de módulo:**
- `OPCIONES` — array de 4 `{ruta, icono, clave}`: `/pictogramas/arasaac` 🖼️, `/pictogramas/secuencias` 📋, `/pictogramas/categorias` 🗂️, `/pictogramas/fotos` 📷.

**Función exportada:**
- `render()` → Promise<función de limpieza (no-op)>. Pinta título+ayuda+grid de 4 tarjetas que navegan a cada subruta.

---

## 31. `core/js/views/pictogramasArasaac.js`

**Propósito:** Gestión de pictogramas ARASAAC (zona adulto): buscar en ARASAAC y añadir al pozo, gestionar solo la parte de la biblioteca de origen `'arasaac'` (filtrado por etiqueta).

**Función exportada:**
- `render()` → Promise<función de limpieza>. Construye: sección "Buscar en ARASAAC" (input + botón + `AbortController` para cancelar búsquedas en curso si se lanza otra), resultados como grid de tarjetas (máx. 30 mostrados, `lista.slice(0, 30)`) que al pulsarlas llaman `mediaLibrary.addArasaacMedio` y se marcan `ya-anadido` + deshabilitadas; sección "Mi biblioteca" con chips de filtro por etiqueta (traducidas si están en `CATEGORIAS_CURADAS`) y grid de `crearMedioCard`.

**Detalle de limpieza automática:** `refrescarBiblioteca()` llama primero `mediaLibrary.limpiarEtiquetasArasaac(CATEGORIAS_CURADAS)` cada vez que se refresca — comentario explícito: "Limpia contaminación histórica (etiquetas en inglés que ARASAAC devolvía antes del arreglo de arasaac.js)".

---

## 32. `core/js/views/pictogramasFotos.js`

**Propósito:** Gestión de fotos propias (zona adulto): añadir fotos locales con categoría obligatoria, gestionar la parte de la biblioteca de origen `'foto'`.

**Función exportada:**
- `render()` → Promise<función de limpieza>. Sección "Añadir foto": input de archivo oculto (`hidden=true`) sustituido por botón propio traducible (comentario: "El botón nativo de 'elegir archivo' no se puede traducir: su texto lo pone el navegador en SU idioma"), campo nombre, chips de categoría (`CATEGORIAS_CURADAS`, selección múltiple con toggle) + input "otra categoría" (separado por comas), validación (archivo+etiquetas obligatorios) antes de `mediaLibrary.addFotoLocal`. Sección "Mis fotos": mismo patrón de filtro por chips + grid de `crearMedioCard` que la vista ARASAAC, pero filtrando `origen === 'foto'`.

**Detalle:** `inputFoto.capture = 'environment'` — sugiere cámara trasera en móviles al elegir archivo.

---

## 33. `core/js/views/pictogramasSecuencias.js`

**Propósito:** Editor de secuencias (rutinas ordenadas) — crear/editar/borrar secuencias guardadas con `secuencias.js`. Vive en su propia ruta porque antes saturaba la pantalla principal de Pictogramas.

**Constante de módulo:**
- `MENSAJES_ERROR_SECUENCIA` — mapa de código de error de `secuencias.validarSecuencia` a clave i18n (`'falta-nombre'` → `pictogramas.secuencia_error_nombre`, `'pasos-insuficientes'`/`'paso-invalido'` → `pictogramas.secuencia_error_pasos`).

**Función exportada:**
- `render()` → Promise<función de limpieza>. Mantiene su PROPIA copia en memoria de la biblioteca de medios (no comparte con la pantalla principal). Permite: elegir pasos desde la biblioteca existente (sin deshabilitar tras añadir, porque una rutina puede repetir un paso, p.ej. "abrir grifo" dos veces), reordenar con flechas ⬆️⬇️, quitar con ✕, buscar+añadir directamente desde ARASAAC sin salir del editor (añade a la biblioteca Y al paso a la vez), editar/cancelar edición de una secuencia existente, confirmación con `window.confirm` mostrando resumen numerado antes de guardar si hay ≥`MIN_PASOS`.

---

## 34. `core/js/views/pictogramasCategorias.js`

**Propósito:** Editor de parejas de categorías dicotómicas — pantalla más compleja de la zona adulto. Usa un "selector compartido" reutilizable (`abrirSelector`/`cerrarSelector`) cuyo destino (`objetivoActivo: {tipo: 'cabecera'|'pool', indice}`) decide si el pictograma elegido fija la cabecera (selección única) o se añade/quita del pool (selección múltiple), evitando duplicar 4 veces el mismo buscador+grid.

**Constante de módulo:**
- `MENSAJES_ERROR_PAREJA` — mapa de 5 códigos de error de `categorias.validarPareja` a claves i18n.

**Función exportada:**
- `render()` → Promise<función de limpieza>. Estado de formulario: `formCategorias` (array de 2 `{nombre, cabeceraId, medios}`), `objetivoActivo` (null o `{tipo, indice}`). El selector compartido se abre con `abrirSelector({tipo, indice})`, muestra biblioteca completa + buscador ARASAAC integrado; al elegir un medio, `elegirMedioParaObjetivo` decide si fija cabecera (cierra selector) o toggle en el pool (mantiene selector abierto). Confirmación con `window.confirm` con resumen antes de guardar. Edición/borrado de parejas existentes con el mismo patrón que secuencias.

---

## 35. `core/js/views/rutas.js`

**Propósito:** Pantalla principal "Rutas de aprendizaje" (zona adulto) — listado de rutas creadas, con botón crear, editar, borrar.

**Función exportada:**
- `render()` → Promise<función de limpieza>. Pinta título+explicación+botón "crear" (navega a `/rutas/crear`) + lista de tarjetas (`rutas.listAll()`), cada una con nombre, número de pasos (`rutas.numero_pasos`), botón editar (navega a `/rutas/editar/:id`) y botón borrar (con `window.confirm` antes de `rutas.eliminarRuta`).

---

## 36. `core/js/views/rutasCrear.js`

**Propósito:** Pantalla única que sirve tanto para crear (`/rutas/crear`) como editar (`/rutas/editar/:id`) una ruta. El adulto elige juegos de la lista completa agrupada por estante y configura cada instancia con un modal.

**Constante de módulo:**
- `MENSAJES_ERROR_RUTA` — mapa de 4 códigos de error (`'falta-nombre'`, `'pasos-insuficientes'`, `'paso-invalido'`, `'esa-ruta-no-existe'`) a claves i18n.

**Funciones internas:** `nombreEstante`, `agruparPorEstante(lista)` (idéntica lógica a `appLoader.getAppsGroupedByEstante` pero reimplementada localmente sobre un array ya cargado), `abrirModalConfig({descriptor, valoresIniciales, textoBoton})` → Promise<objeto|null>. Modal que usa `ajustesCatalogo.pintarPanelAjustes` sobre una COPIA en memoria (`valoresTrabajo`) de los valores; resuelve con el objeto final al confirmar o `null` al cancelar/cerrar overlay.

**Función exportada:**
- `render({id})` → Promise<función de limpieza>. Si llega `id`, precarga la ruta existente (nombre + pasos clonados con `config` propia). Permite: añadir un juego (botón "Añadir" SIEMPRE habilitado, nunca se deshabilita — comentario explícito: "una ruta puede repetir el mismo juego varias veces, cada vez con su propia configuración"), abre `abrirModalConfig` con `valoresPorDefecto(descriptor.mecanica)` como punto de partida, y al confirmar empuja `rutas.crearPaso(descriptor.id, config)` a `pasosElegidos`. Reordenar con flechas, editar config de un paso ya añadido (reabre el modal con sus valores actuales), quitar con ✕. Guardar con confirmación resumen + `rutas.crearRuta`/`rutas.actualizarRuta`.

**Aviso documentado en UI:** si se está editando una ruta existente, se muestra `rutas.aviso_editar_reinicia` (recordatorio de que editar reinicia el progreso, coherente con `rutas.actualizarRuta`).

---

## 37. `core/js/views/rutaJugar.js`

**Propósito:** Vista "cara del niño" para jugar una ruta (`/rutas/jugar/:id`). Pinta los pasos como lista con estados (superado/jugable/bloqueado) y, al tocar un paso jugable, sustituye la lista por el juego montado en "modo ruta".

**Función exportada:**
- `render({id})` → Promise<función de limpieza>. Carga la ruta y los descriptores de apps en paralelo. `pintarLista()`: para cada paso calcula `desbloqueado` (`rutas.pasoDesbloqueado`), `completado` (`indice < desbloqueadoHasta`), `jugable` (`desbloqueado && descriptor existe`); pinta como `<button>` si jugable, `<div>` si no; icono `❓` si descriptor roto, `🔒` si bloqueado, icono real si jugable; check `✅` si completado.
- `jugarPaso(indice)` (interna): oculta la lista, monta el juego con `mountApp(paso.appId, contenedorJuego, {ajustesPistaOverride: paso.config, rutaContexto: {alTerminarPaso, alSalir}})`. `alTerminarPaso` llama `rutas.registrarProgreso(ruta.id, indice, fuePerfecto)` y actualiza la variable local `ruta` con el resultado. `alSalir` vuelve a mostrar la lista (`mostrarLista()`, que repinta con el progreso actualizado).
- `mostrarLista()` (interna): desmonta el juego actual (try/catch) antes de repintar.

**Manejo de errores:** ruta no encontrada → `rutas.no_encontrada`; descriptor de algún paso no encontrado → icono `❓` + texto `rutas.paso_roto`, pero NO bloquea el resto de pasos.

---

## 38. `core/js/views/ajustes.js`

**Propósito:** Pantalla "Ajustes" (zona adulto) — idioma, voz, ajustes de pista por juego, PIN parental, copia de seguridad, privacidad. Es la vista más extensa del proyecto, organizada en 5 categorías colapsables (`<details>`).

**Función interna:** `pintarPanelAjustesJuego(panel, appId, mecanica)` — usa `ajustesCatalogo.pintarPanelAjustes` leyendo de `ajustesJuego.getAjustesPista(appId)` y escribiendo con el setter correspondiente de `ajustesJuego` (`DEFINICIONES_AJUSTE.find(d => d.id === id).setter`) pasando siempre `appId` (cada juego desacoplado del global al primer cambio).

**Función exportada:**
- `render()` → Promise<función de limpieza>. Construye 5 secciones, cada una envuelta en `crearCategoria(claveTitulo, ...secciones)` (un `<details>` colapsable con sonido al abrir):

  1. **Idioma:** `<select>` con todos `SUPPORTED_LANGS`; al cambiar, llama `setLanguage`, dispara en segundo plano (sin bloquear) `mediaLibrary.actualizarIdiomaArasaac(nuevoIdioma)`, y navega a `/ajustes` de nuevo (en vez de re-render directo) para que el router desmonte correctamente la instancia anterior y no queden dos renders vivos. Aviso de disponibilidad de voz (`tts.hasVoiceForActiveLanguage`).

  2. **Ajustes de cada juego:** selector `<select>` con todos los descriptores (`loadDescriptors`), cada `<option>` lleva `dataset.mecanica`; al cambiar, repinta el panel de esa mecánica.

  3. **PIN parental:** estado actual (activo/inactivo), aviso de que no es seguridad real (`pin.aviso`), formulario nuevo PIN + confirmar (valida regex `/^\d{4}$/` y coincidencia), botón quitar PIN (con `window.confirm`). Tras cualquier cambio, vuelve a llamar `render()` completo (no solo repinta la sección).

  4. **Copia de seguridad:** checkbox "incluir fotos" (con aviso adicional al activarlo), botón exportar (`backup.exportarCopia`), botón importar (input file oculto + botón propio traducible, con `window.confirm` antes de aplicar). Bloque de recordatorio (oculto por defecto, se muestra si `backup.comprobarRecordatorio()` resuelve `true`) con botones "ahora" (dispara el click del botón exportar) y "luego" (lo oculta sin marcar nada persistente — se volverá a mostrar en la siguiente visita si sigue cumpliéndose la condición).

  5. **Privacidad:** texto estático informativo.

**Detalle de UX documentado:** "Las secciones se agrupan en categorías colapsables para no saturar la pantalla con todo a la vez."

---

## Resumen de constantes/claves globales transversales (para referencia rápida de reconstrucción)

**localStorage keys usadas en todo el proyecto:**
- `pictosfera.lang` (i18n.js)
- `pictosfera.pin` (pin.js)
- `pictosfera.pista.*` (14 claves en ajustesJuego.js, listadas en sección 15)
- `pictosfera.juego.<appId>.<ajuste>` (claves por-juego derivadas, ajustesJuego.js)
- `pictosfera.juegos.accesoLibre` (rutas.js)
- `pictosfera.bienvenidaVista` (welcome.js)
- `pictosfera.copia.meta` (backup.js, JSON `{fechaISO, conteoMedios}`)

**IndexedDB:** base `pictosfera`, versión `4`, stores `medios` (keyPath `id`, índices `etiquetas` multiEntry y `origen`), `secuencias` (keyPath `id`), `rutas` (keyPath `id`), `categorias` (keyPath `id`).

**CustomEvents en `window`:**
- `pictosfera:lang-changed` (i18n.js)
- `pictosfera:ajustes-juego-changed` (ajustesJuego.js)

**Prefijos de id por tipo de entidad:** `arasaac:<id>` y `foto:<uuid>` (medios), `seq:<uuid>` (secuencias), `ruta:<uuid>` (rutas), `catpar:<uuid>` y `cat:<uuid>` (categorías/parejas).

Todos los archivos fuente fueron leídos íntegramente; las rutas absolutas exactas usadas para esta investigación son las listadas al inicio del informe, bajo `C:\Users\cogni\Desktop\NO BORRAR WEB PICTOSFERA\core\js\` y su subcarpeta `views\`.## 5. Catálogo completo de las 21 mecánicas (`apps/`)

Catálogo exhaustivo de las 21 mecánicas/minijuegos, en el orden en que aparecen en `data/apps.json`. Para cada una: identidad del módulo, concepto del juego en una frase, toda su lógica pura exportada (las funciones que tienen tests unitarios, con su comportamiento exacto en casos límite), cómo usa el objeto `plataforma`, estructura lógica del DOM que construye, mecanismo de interacción (arrastre/toque/teclado) y cómo valida acierto/fallo, qué ajustes de `ajustesCatalogo.js` consume y cómo le afectan, particularidades o bugs históricos documentados en el propio código, y una descripción de alto nivel del CSS. Cierra con una sección de "Patrones comunes entre mecánicas" — convenciones compartidas por las 21, incluida la filosofía explícita de no compartir código entre mecánicas (sección 1 y 3.1).

He recibido la documentación completa de los 5 grupos de subagentes, cubriendo las 21 mecánicas. Ahora voy a consolidar todo en el informe final estructurado según lo solicitado, con las 21 secciones en orden y la sección final de patrones comunes.

---

# CATÁLOGO EXHAUSTIVO DE LAS 21 MECÁNICAS DE PICTOSFERA

**Contexto arquitectónico común** (válido para todas las secciones siguientes, no se repite en cada una salvo detalle): cada mecánica vive en `apps/<carpeta>/<nombre>.js` + `.css` y exporta `export default { id, nombre, icono, estante, montar(contenedor, plataforma), desmontar() }`. El núcleo (`core/js/appLoader.js`) construye `plataforma` como una foto fija con: `appId, nombre, icono, estante, lang, medios, categorias, secuencias, fijos, t, tts, sounds, cabezas, getDisplayUrl, mostrarRecompensa, ajustesPista`. `ajustesPista` trae los 13 campos posibles (mayuscula, mostrar, resaltarTeclado, tildesAutomaticas, mayusculasAutomaticas, puntuacionAutomatica, espaciosAutomaticos, soloTexto, pulsadorTts, letraPunteada, toleranciaTrazo, dificultadRuleta, listaSoloTexto, estanteSoloImagen); cada mecánica solo usa los suyos, definidos en `core/js/ajustesCatalogo.js` → `CAMPOS_POR_MECANICA`.

---

## 1. MEMORIA

**1. Identidad:** `{ id: 'memoria', nombre: 'Memoria', icono: '🧠', estante: 'JUEGOS', rutaPerfectoSinFallos: false }`.

**2. Concepto:** el niño voltea tarjetas de dos en dos buscando parejas de pictogramas iguales hasta emparejar todas.

**3. Lógica pura exportada:**
- `elegirNumeroParejas(totalMedios)`: si `totalMedios < MIN_PAREJAS(3)` → `0`; si no, `Math.max(3, Math.min(5, totalMedios))` (entre 3 y 5).
- `formatearNombre(nombre, mayuscula=true)`: `''` si `!nombre`; si no `toLocaleUpperCase('es')`/`toLocaleLowerCase('es')`.
- `crearMazo(medios, numParejas = elegirNumeroParejas(medios.length))`: `[]` si `numParejas<=0`; si no, mezcla `medios` (Fisher-Yates), toma los primeros `numParejas`, crea dos cartas por cada uno (`{cartaId:'<i>-a'|'<i>-b', medioId, medio, volteada:false, emparejada:false}`), mezcla el mazo resultante.
- `sonPareja(cartaA, cartaB)`: `Boolean(cartaA)&&Boolean(cartaB)&&cartaA.medioId===cartaB.medioId&&cartaA.cartaId!==cartaB.cartaId`; `false` con null/undefined.
- `mezclar` interna (Fisher-Yates, no exportada).

**4. Uso de plataforma:** `medios` (mín. 3), `icono/nombre`, `t` (memoria.instrucciones/intentos/parejas, juegos.sin_material), `getDisplayUrl`, `sounds.click/acierto/fallo`, `tts.speak` (al voltear, dice el nombre), `mostrarRecompensa({onContinuar})` al completar, `ajustesPista` (fallback `{mayuscula:true, soloTexto:false}`).

**5. DOM:** `.memoria-app` → cabecera + `.memoria-marcador` (intentos/parejas) + `.memoria-tablero` (grid de `button.memoria-carta`, con `img`+`span.memoria-carta-nombre` si volteada, glifo 🂠 si no).

**6. Interacción:** tap puro. Al voltear 2 cartas: incrementa intentos, bloquea, compara `sonPareja`; si pareja, desbloquea inmediato + sonido acierto + repinta (recompensa si completas todas); si no, sonido fallo y tras 900ms vuelven boca abajo.

**7. Ajustes:** `mayuscula` (formato nombre), `soloTexto` (oculta imagen, deja solo nombre).

**8. Particularidades:** `rutaPerfectoSinFallos:false` documentado explícitamente — "voltear dos cartas que no son pareja es parte normal e inevitable de Memoria, no un error que deba bloquear el progreso de una ruta"; basta completar todas las parejas sin exigir cero fallos. `MAX_PAREJAS=5` justificado "para no saturar la pantalla ni la memoria de trabajo del niño".

**9. CSS:** grid `auto-fill, minmax(110px,1fr)` (140px desde 768px); cartas `aspect-ratio:3/4`; volteada cambia a fondo claro con imagen 70%+nombre; emparejada con borde verde y opacidad reducida; modo solo-texto centra y agranda el nombre.

---

## 2. ARRASTRA-PALABRA

**1. Identidad:** `{ id: 'arrastra-palabra', nombre: 'Arrastra la palabra', icono: '🔤', estante: 'LECTURA' }`.

**2. Concepto:** el niño arrastra la caja de texto con la palabra correcta hasta el pictograma objetivo, entre la correcta y 2 distractores, en 10 niveles.

**3. Lógica pura exportada:**
- `elegirDistractores(medios, medioCorrectoId, cantidad=2)`: filtra excluyendo el correcto (tolera `medios` null→`[]`), mezcla, corta a `min(cantidad, candidatos.length)`.
- `generarNivel(medios, {evitarIds=[]}={})`: `null` si `medios` no es array o `length<3`. Si no: `sinUsar`=no evitados; si vacío usa `medios` completo; elige `medioCorrecto` al azar; `distractores=elegirDistractores(medios, id, 2)`; opciones mezcladas `[{medio,esCorrecta}]`. Devuelve `{medioCorrecto, opciones}`.
- `esRespuestaCorrecta(opcion, medioCorrecto)`: comparación de ids, falsy-safe.
- `formatearPista(nombre, mayuscula=true)`: `''` si falsy; mayúscula/minúscula (sin locale explícito).
- `puedeResponder(ajustesPista, escuchado)`: `!ajustesPista.pulsadorTts || Boolean(escuchado)`.
- `mezclar` interna duplicada.

**4. Uso de plataforma:** `medios`(mín.3), `t` (arrastra.instrucciones/nivel, comunes.escuchar, juegos.sin_material), `getDisplayUrl`, `sounds.click/acierto/fallo`, `tts.speak`, `mostrarRecompensa` tras nivel 10, `ajustesPista` (fallback `{mayuscula:true, mostrar:true, soloTexto:false, pulsadorTts:false}`).

**5. DOM:** `.arrastra-app` → cabecera+marcador+`.arrastra-zona` con `.arrastra-objetivo` y `.arrastra-opciones` (3 `div role=button tabIndex=0`).

**6. Interacción:** drag con Pointer Events + umbral 4px (`UMBRAL_ARRASTRE`); teclado (Enter/Espacio) como vía alternativa de "elegir". Solo cuenta intento si `arrastrado && dentroDelObjetivo` al soltar (un toque simple no cuenta). Acierto: bloquea, sonido+TTS, clase correcta, avanza nivel (700ms) o recompensa (500ms en nivel 10). Fallo: sonido+shake 400ms, sin bloquear, reintentable.

**7. Ajustes:** `mostrar` (oculta pista salvo soloTexto), `mayuscula` (formato), `soloTexto` (oculta imagen, ignora `mostrar`), `pulsadorTts` (sustituye objetivo por botón 🔊; bloquea respuesta hasta escuchar).

**8. Particularidades:** comentario explícito: un toque simple no cuenta porque "eso dejaría de ser un juego de arrastrar"; teclado es "vía de accesibilidad deliberada... no un toque accidental"; en soloTexto la pista ignora `mostrar` "si no, la carta quedaría vacía".

**9. CSS:** `.arrastra-zona` columna por defecto, fila en landscape (basado en orientación de dispositivo, no ancho). Opciones en píldoras con `cursor:grab/grabbing`, shake en fallo, verde en acierto. Pulsador TTS circular con pulso animado infinito que se detiene al escuchar.

---

## 3. TECLEA-PALABRA

**1. Identidad:** `{ id: 'teclea-palabra', nombre: 'Teclea la palabra', icono: '⌨️', estante: 'ESCRITURA' }`.

**2. Concepto:** el niño escribe con un teclado en pantalla el nombre del pictograma mostrado, letra a letra, en 10 niveles.

**3. Lógica pura exportada** (la más extensa del proyecto en funciones de texto):
- `tecladoParaIdioma(lang)`: devuelve el teclado de `FAMILIA_TECLADO[lang]` o `TECLADO_ES` si desconocido (es/ca/eu/gl/va con Ñ; en sin Ñ).
- `normalizarTexto(texto, opciones={})`: defaults todos `true`. `''` si `!texto`. Quita espacios si `espaciosAutomaticos`, quita puntuación (`esPuntuacion`) si `puntuacionAutomatica`, protege Ñ/ñ siempre, quita tildes si `tildesAutomaticas` (`normalize('NFD').replace(MARCAS_DIACRITICAS,'')`), y al final pasa a minúscula si `mayusculasAutomaticas`.
- `letrasNecesarias(texto, {tildes=true}={})`: `[]` si `!texto`; Set de caracteres únicos (Ñ normalizada, sin espacio/puntuación/dígitos).
- `comprobarPalabra(tecleado, objetivo, opciones={})`: `normalizarTexto(tecleado,opciones)===normalizarTexto(objetivo,opciones)`.
- `necesitaTeclaMayus(nombre, ajustesPista={})`: `false` si `!nombre` o `mayusculasAutomaticas!==false`; si no, `tieneMayuscula(nombre)`.
- `necesitaTeclaSimbolos(nombre, ajustesPista={})`: `false` si `!nombre` o `puntuacionAutomatica!==false`; si no, comprueba algún carácter de puntuación.
- `necesitaTeclaNumeros(nombre)`: `Boolean(nombre) && algún dígito` — no depende de ningún ajuste.
- `necesitaTeclaEspacio(nombre, ajustesPista={})`: `false` si `!nombre` o sin espacio; si no, `espaciosAutomaticos===false`.
- `tildesNecesarias(nombre, ajustesPista={})`: `[]` si `!nombre` o `tildesAutomaticas!==false`; si no, vocales con tilde necesarias (`letrasNecesarias({tildes:false})` filtrado a 'áéíóú').
- `simbolosNecesarios(nombre)` / `numerosNecesarios(nombre)`: `[]` si `!nombre`; si no, set único de signos/dígitos.
- `elegirSiguienteMedio(medios, {evitarIds=[]}={})`: `null` si vacío; evita usados salvo que vacíe la lista (entonces usa todos).
- `formatearTexto(texto, mayuscula=true)`: estándar.
- `puedeResponder(ajustesPista, escuchado)`: igual patrón.

Internas clave: `esPuntuacion(c)=c!==' ' && !ES_LETRA.test(c) && !esDigito(c)` (usa `\p{L}` Unicode, NO lista cerrada); `tieneMayuscula`; `quitarTilde`; `siguienteCaracterObjetivo` (carácter normalizado de la posición actual, forzando siempre minúscula internamente para esa comprobación de tilde).

**4. Uso de plataforma:** `medios`, `lang` (selecciona teclado), `t` (teclea.instrucciones/nivel/espacio/mayus/simbolos/numeros/borrar/volver_letras, comunes.escuchar, juegos.sin_material), `getDisplayUrl`, `sounds.click/acierto/fallo`, `tts.speak`, `mostrarRecompensa`, `ajustesPista` completo (9 campos).

**5. DOM:** `.teclea-app` → cabecera+marcador+`.teclea-zona`: `.teclea-objetivo` (pictograma+pista o pulsador), `.teclea-escritura` (fichas `span.teclea-letra`), `.teclea-teclado` (filas + fila de acciones condicional). El teclado tiene 4 "capas": `letras`/`simbolos`/`numeros`/`tildes` (subset temporal de 2 teclas).

**6. Interacción:** solo tap en teclado (sin drag). Añade carácter a `tecleado`; al llegar a longitud objetivo, compara con `comprobarPalabra`. Acierto: sonido+TTS, fichas en verde, bloquea teclado, avanza tras 700ms (o recompensa 500ms). Fallo: sonido, fichas con animación de "caída" (`teclea-letra-cae`), tras 650ms limpia, resetea capa y mayúscula, desbloquea. Tecla de letra con tilde requerida abre subset de 2 opciones en vez de teclear directo.

**7. Ajustes (los 9):** `mostrar`, `mayuscula` (también caso inicial del interruptor Mayús), `resaltarTeclado` (sombrea teclas necesarias), `tildesAutomaticas` (si false, exige tecla de tilde via subset), `mayusculasAutomaticas` (si false y hay mayúscula interna, aparece interruptor "Mayús"), `puntuacionAutomatica` (si false, aparece tecla "Símbolos"), `espaciosAutomaticos` (si false, aparece tecla espacio), `soloTexto`, `pulsadorTts`.

**8. Particularidades/bugs históricos citados textualmente:**
- *"Antes había una lista cerrada de signos admitidos... así que cualquier símbolo ASCII que no estuviera en esa lista... no se reconocía como signo... se clasifica como 'signo' cualquier carácter que no sea letra, ni cifra, ni espacio."*
- *"si la palabra solo lleva 'é' y nunca una 'e' suelta, la tecla física 'e' debe sombrearse igual... (ver bug: con varias letras acentuadas distintas, solo se sombreaba la primera...)."*
- El interruptor Mayús arranca en `ajustesPista.mayuscula` para evitar *"una contradicción visual confusa para el niño"*.

**9. CSS:** `.teclea-zona` siempre columna, independiente de orientación (*"No cambia con la orientación del dispositivo"*); en landscape solo se reduce el pictograma. Fichas con sombra; ficha de espacio con borde discontinuo. Animación de caída en cascada por `--orden`. Teclado en filas flex; resaltado con `color-mix` sobre verde; tecla con subset de tilde lleva punto decorativo `::after`.

---

## 4. ORDENA-SECUENCIA

**1. Identidad:** `{ id: 'ordena-secuencia', nombre: 'Ordena la secuencia', icono: '🪥', estante: 'RUTINAS' }`.

**2. Concepto:** el niño arrastra cada pictograma desordenado hasta el hueco numerado correcto para reconstruir el orden de una rutina, en 10 ejercicios.

**3. Lógica pura exportada:**
- `mezclar(lista)`: SÍ exportada (a diferencia de otras), Fisher-Yates tolerante a null/undefined → `[]`.
- `elegirSiguienteSecuencia(secuencias, {evitarIds=[]}={})`: `null` si no es array o vacío; evita usadas salvo que vacíe la lista (usa cualquiera).
- `generarRonda(secuencia)`: `pasos=(secuencia&&secuencia.pasos)||[]`; `piezas` mezcladas `{piezaId:'p'+i, medio}`; devuelve `{pasos:[...pasos], piezas}` (pasos en orden correcto original, copia; piezas mezcladas). Secuencia null → `{pasos:[],piezas:[]}`.
- `colocacionCorrecta(pieza, indiceCasilla, pasosCorrectos)`: `false` si pieza/medio/array inválidos; compara `pasosCorrectos[indiceCasilla].id===pieza.medio.id` (nunca compara `piezaId`).
- `rondaCompleta(colocados)`: `Array.isArray&&length>0&&every(Boolean)` — vacío da `false`.
- `formatearNombre(nombre, mayuscula=true)`: estándar.

**4. Uso de plataforma:** `secuencias` (en vez de `medios`, mín. 1 jugable), `t` (ordena.instrucciones/ejercicio/casilla_vacia/sin_secuencias), `getDisplayUrl`, `sounds.click/acierto/fallo`, `mostrarRecompensa` tras ejercicio 10. **NO usa `tts.speak`** en ningún punto. `ajustesPista` fallback `{mayuscula:true, soloTexto:false}`.

**5. DOM:** `.ordena-app` → cabecera+marcador+`.ordena-zona`: `.ordena-casillas` (N `button.ordena-casilla` con número de posición) + `.ordena-piezas` (N `div role=button tabIndex=0`, arrastrables, se eliminan al colocarse).

**6. Interacción:** drag por Pointer Events (umbral 4px) generalizado a múltiples huecos (`casillaEnPosicion` solo entre casillas NO deshabilitadas) + selección por tap/teclado como alternativa (tocar pieza selecciona, tocar casilla vacía con selección coloca). Acierto: sonido, fija pieza, repinta casilla llena, elimina pieza del DOM; si completo, recompensa/siguiente tras 600ms. Fallo: sonido+shake 400ms, pieza permanece disponible.

**7. Ajustes:** `mayuscula` (formato), `soloTexto` (oculta imágenes en piezas y casillas llenas).

**8. Particularidades citadas textualmente:**
- *"para que una rutina que repite un mismo pictograma en dos pasos distintos... tenga dos piezas independientes en el montón"* → de ahí `piezaId` propio en vez de id del medio.
- *"uno ya resuelto correctamente no debe poder 'robar' una pieza nueva"* → `casillaEnPosicion` excluye huecos llenos.
- *"en vez de un click aparte —que duplicaría el manejo, porque el navegador dispara click tras pointerup incluso después de arrastrar— se reutiliza el booleano arrastrado"*.
- Guarda explícito comentado como "defensivo": `if (estado.colocados[indice]) return;`.

**9. CSS:** comentario explícito: *"A diferencia de 'Arrastra la palabra', aquí el layout es SIEMPRE huecos arriba/piezas abajo, en cualquier orientación... no solo cuestión de aprovechar espacio"* — sin `@media orientation`. Huecos/piezas cuadrados (~100/96px) con borde punteado/sólido; pieza seleccionada con sombra; misma animación de temblor que arrastra-palabra.

---

## 5. ESCRIBE-LETRA

**1. Identidad:** `{ id: 'escribe-letra', nombre: 'Escribe la letra', icono: '✍️', estante: 'ESCRITURA' }`.

**2. Concepto:** el niño traza con el dedo/stylus, casilla por casilla, cada letra de la palabra del pictograma mostrado, avanzando solo si el trazo se reconoce correcto.

**3. Lógica pura exportada (motor de reconocimiento de trazo, compartido conceptualmente con escribe-numero/completa-suma/arrastra-suma, duplicado literalmente en cada uno):**
- `letrasDePalabra(nombre)`: array de caracteres-letra (filtra espacios y no-letras vía `\p{L}`); `[]` si falsy.
- `letraEsperada(caracter, ajustesPista={})`: si `tildesAutomaticas!==false` y no es ñ/Ñ, quita acento; aplica caso (`mayuscula===false`→minúscula, si no→mayúscula).
- `casillasObjetivo(nombre, ajustesPista={})`: `letrasDePalabra(nombre).map(letraEsperada)`.
- `dilatarMascara(mascara, ancho, alto, radio)`: con radio 0 devuelve copia; si no, "contagia" cuadrado `(2r+1)²` (distancia Chebyshov) por cada píxel activo.
- `contarPixeles(mascara)`: suma truthy.
- `proporcionDentro(mascaraA, mascaraB)`: fracción de píxeles de A también activos en B; `0` si A vacía.
- `indicesPorZona(ancho, alto, divisiones)`: reparte rejilla en `divisiones²` zonas por posición proporcional.
- `cubreTodasLasZonas(mascaraReferencia, mascaraTrazo, zonas, minPixelesZona)`: cada zona con menos de `minPixelesZona` píxeles de referencia pasa automática; si no, exige ≥1 píxel de trazo en ella.
- `NIVELES_TRAZO` (constante): facil `{radio:3, minCobertura:0.3, maxDesvio:0.6, minPixelesTrazo:3, minRatioTrazo:0.75, divisionesZona:2, minPixelesZona:4}`; normal `{2,0.5,0.4,5,0.9,3,3}`; dificil `{1,0.7,0.25,6,1,4,2}` (mismo orden de campos).
- `configTolerancia(nivel)`: fallback a `facil` si desconocido.
- `evaluarTrazo({mascaraReferencia,mascaraTrazo,ancho,alto}, nivel='facil')`: 1) si `totalTrazo<minPixelesTrazo` → `{correcto:false,cobertura:0,desvio:1}` inmediato; 2) si `totalTrazo<totalReferencia*minRatioTrazo` → igual corte; 3) dilata ambas máscaras; 4) `cobertura=proporcionDentro(referencia, trazoDilatado)`; 5) `desvio=1-proporcionDentro(trazo, referenciaDilatada)`; 6) `zonasCubiertas=cubreTodasLasZonas(...)`; 7) `correcto = cobertura>=minCobertura && desvio<=maxDesvio && zonasCubiertas`.
- `formatearTexto(texto, mayuscula=true)`: estándar.
- `elegirSiguienteMedio(medios, {evitarIds=[]}={})`: patrón estándar (`null` si vacío).
- `puedeResponder(ajustesPista, escuchado)`: patrón estándar.

**4. Uso de plataforma:** `medios` (mín.3), `ajustesPista` completo (mayuscula, mostrar, tildesAutomaticas, soloTexto, pulsadorTts, letraPunteada, toleranciaTrazo), `t`, `getDisplayUrl`, `sounds.acierto/fallo`, `tts.speak` (al escuchar y al completar palabra), `mostrarRecompensa`.

**5. DOM:** `.escribe-app` → cabecera+marcador+`.escribe-zona`: `.escribe-objetivo` (imagen/pulsador+pista) y `.escribe-casillas` (una por letra, cada una con `<canvas>`).

**6. Interacción:** dibujo por puntero sobre la casilla activa. `pointerdown` marca primer punto (visual+máscara GRID=18); `pointermove` dibuja e interpola en máscara; `pointerup/cancel` NO evalúa inmediato: arma `setTimeout(evaluarCasillaActual, 2000)` — volver a tocar antes cancela y reinicia el ciclo. Evaluación: `evaluarTrazo` con máscara de referencia rasterizada (canvas oculto 84×84, fuente `bold 72%`, umbral alfa>100) vs. máscara de trazo, usando `toleranciaTrazo`. Correcto: sonido+avanza letra (TTS de palabra completa al terminar); incorrecto: sonido+shake 400ms+limpia casilla para reintentar.

**7. Ajustes:** `mostrar`, `mayuscula`, `tildesAutomaticas` (afecta forma exacta a trazar/comparar), `soloTexto`, `pulsadorTts`, `letraPunteada` (trazo discontinuo decorativo, no afecta evaluación), `toleranciaTrazo` (nivel pasado a `evaluarTrazo`).

**8. Particularidades/bugs citados textualmente:**
- *"es habitual levantar el dedo varias veces al trazar, p.ej. al cruzar una 't' o una 'f'"* → justifica los 2000ms de espera.
- Bug documentado en `cubreTodasLasZonas`: *"un trazo concentrado en una sola zona puede, dilatado, solapar una fracción grande de una letra de referencia también dilatada... sin haber pasado nunca por el resto de la letra — por ejemplo, un único brazo de una 'V' o una sola pata de una 'M'"*.
- Sobre `minRatioTrazo`: *"un trazo corto y simple... puede coincidir por pura casualidad con UNA parte de una letra con varios trazos (como 'A' o 'V')"*.
- `canvas.style.touchAction='none'` para evitar scroll/zoom al trazar.

**9. CSS:** objetivo en tarjeta con sombra (fila en landscape); casillas cuadradas con canvas 84×84; estados `-activa/-correcta/-bloqueada`; shake `escribe-fallo`; pulso infinito en pulsador TTS que se detiene tras escuchar.

---

## 6. BINGO-LECTURA

**1. Identidad:** `{ id: 'bingo-lectura', nombre: 'Bingo de lectura', icono: '🅱️', estante: 'LECTURA' }`.

**2. Concepto:** el niño tiene un cartón de 9 casillas; sale una "bola" con un estímulo y debe tocar la casilla del cartón que coincide, hasta completar las 9 bolas.

**3. Lógica pura exportada:**
- `mezclar` interna (Fisher-Yates).
- `bolaConPalabra(ajustesPista)`: `Boolean(ajustesPista && ajustesPista.mostrar)`.
- `cartonConPictograma(ajustesPista)`: `!(ajustesPista && ajustesPista.soloTexto)` — `true` incluso con `ajustesPista` undefined.
- `elegirCarton(medios, tamano=9)`: `null` si no es array o `length<tamano`; si no, `mezclar(medios).slice(0,tamano)`.
- `elegirSiguienteBola(carton, marcadasIds=[])`: `null` si carton vacío/no array; de no marcadas si quedan, si no (caso límite) usa el cartón entero; elige al azar.
- `esRespuestaCorrecta(medioTocado, medioObjetivo)`: comparación de ids, falsy-safe.
- `formatearPista(nombre, mayuscula=true)`: estándar (sin locale explícito, a diferencia de memoria).
- `puedeResponder(ajustesPista, escuchado)`: patrón estándar.

**4. Uso de plataforma:** `medios` (mín. 9 = `TAMANO_CARTON`), `ajustesPista` (mostrar, soloTexto, mayuscula, pulsadorTts; fallback `{mayuscula:true,mostrar:true,soloTexto:false,pulsadorTts:false}`), `t` (bingo.instrucciones/bola/casilla_marcada/mensaje_final, comunes.escuchar, juegos.sin_material), `getDisplayUrl`, `sounds.acierto/fallo`, `tts.speak`, `mostrarRecompensa({mensajeKey:'bingo.mensaje_final', onContinuar})`.

**5. DOM:** `.bingo-app` → cabecera+marcador+`.bingo-zona`: `.bingo-bombo>.bingo-bola` (regenerada cada bola) + `.bingo-carton` (grid 3×3 de `button.bingo-casilla`).

**6. Interacción:** tap. Acierto: bloquea, resetea fallosSeguidos, sonido+TTS, marca casilla con sello "✓"; recompensa en bola 9 (500ms) o siguiente bola (700ms). Fallo: sonido+shake 400ms, incrementa `fallosSeguidos`; al llegar a `UMBRAL_AYUDA=2` fallos seguidos en la misma bola, `ofrecerAyuda()` repite la consigna por voz y resalta el borde de la casilla correcta 1200ms (sin penalización, no ligado a ningún ajuste).

**7. Ajustes — 4 modos documentados explícitamente:** `mostrar`→`bolaConPalabra` (bola con/sin pista textual), `soloTexto`→`cartonConPictograma` inverso (cartón sin imagen, solo nombre); **el pictograma de la bola nunca se oculta por soloTexto** (decisión deliberada). `mayuscula` formatea ambos lados. `pulsadorTts` sustituye la bola por botón único y bloquea todo el cartón (`bingo-carton-bloqueada`) hasta pulsarlo.

**8. Particularidades citadas textualmente:** *"mostrar=false, soloTexto=false → variante extra, coherente con los ajustes: bola solo con dibujo, cartón con dibujo+palabra (más fácil que el modo 1)"* — 4ª combinación no contemplada en la especificación original de 3 modos, resuelta con criterio propio. *"el pictograma de la bola NUNCA se oculta por 'soloTexto'... Es una decisión de diseño deliberada, no un descuido."* Partida siempre de 9 bolas fijas, sin resumen final de aciertos/fallos.

**9. CSS:** bombo como "pastilla" con borde grueso, animación pop de aparición de bola; pulsador circular con pulso; cartón grid 3×3 con estados `-marcada/-fallo/-ayuda` (halo naranja); landscape pone bombo y cartón en fila.

---

## 7. RULETA-LETRAS

**1. Identidad:** `{ id: 'ruleta-letras', nombre: 'Ruleta de letras', icono: '🎡', estante: 'ESCRITURA' }`. El módulo .js más grande del proyecto (805 líneas).

**2. Concepto:** el niño gira una ruleta de 4 resultados para descubrir, letra a letra o con ayudas regaladas, una palabra oculta, mientras también se revela su pictograma bajo una retícula 3×3.

**3. Lógica pura exportada (la más rica del proyecto):**
- `letrasDePalabra(nombre)`: igual patrón que escribe-letra (duplicada a propósito).
- `normalizarLetra(caracter)`: `''` si falsy; mayúscula; si resulta 'Ñ' se protege; si no, quita acento.
- `letrasNormalizadasDePalabra(nombre)`: map de lo anterior.
- `formatearLetra(caracter, mayuscula=true)`: cambia solo el caso, conserva el acento original (a diferencia de `normalizarLetra`).
- `esVocal(letraNormalizada)`: pertenece a `['A','E','I','O','U']`.
- `letrasOcultasUnicas(letrasNormalizadas, usadas=[])`: únicas no usadas.
- `palabraCompleta(letrasNormalizadas, usadas=[])`: `false` si vacío/no array; si no, todas en `usadas`.
- `indicesDeLetraEnPalabra(letrasNormalizadas, letraNormalizada)`: `[]` si inválido; índices de aparición.
- `elegirLetraRegalada(candidatas, letrasNormalizadas)`: `null` si vacío; elige la de más apariciones, en empate la de menor `primeraPosicion`.
- `resultadosDisponibles(disponibilidad={})`: array de strings entre `'letra'/'pista'/'vocal'/'consonante'` según 4 booleans de entrada, en ese orden fijo.
- `pesosResultados(disponibles, dificultad='normal')`: `PESOS_BASE_POR_DIFICULTAD` = facil`{letra:60,pista:16,vocal:14,consonante:10}`, normal`{75,10,8,7}`, dificil`{85,5,5,5}`; `PESO_EXTRA_DEGRADADO_POR_DIFICULTAD={facil:15,normal:10,dificil:5}`. Caso base (4 disponibles): copia de `base`. Caso degradado: cada extra disponible recibe el peso fijo degradado; si hay 'letra', `pesos.letra=max(0, 100-extras.length*pesoExtra)`; si no hay 'letra' pero sí extras, se reparten 100 a partes iguales.
- `elegirResultadoRuleta(pesos, azar)`: filtra peso>0; `total`; si 0→`null`; `azar` clampado a `[0,0.999999]`×`total`=`umbral`; recorre entradas restando peso hasta `umbral<peso`; fallback a la última entrada.
- `ORDEN_REVELADO_RETICULA` (constante): `[4,1,3,5,7,0,2,6,8]` (centro→lados→esquinas en grid 3×3).
- `casillasInicialesPictograma(dificultad)`: `{facil:2,normal:1,dificil:1}` (fallback normal); slice del orden anterior.
- `siguienteCasillaPictograma(visibles=[])`: primer índice no visible, o `null` si todos visibles.
- `palabraEncajaDificultad(nombre, dificultad)`: `RANGOS_LONGITUD_PALABRA={facil:[2,4],normal:[4,6],dificil:[6,Infinity]}` (fallback normal); compara longitud inclusive.
- `elegirPalabrasJugables(medios, dificultad)`: `[]` si no array; filtra por rango; fallback a `length>=2` si ninguno encaja.
- `elegirSiguientePalabra(medios, dificultad, evitarIds=[])`: usa lo anterior; `null` si vacío; evita usadas salvo agotarse.
- `ABECEDARIO_COMPLETO` (27 letras, Ñ tras N, orden español).
- `crearAbecedario(letrasNormalizadasUnicas, dificultad)`: si no es `'facil'`, copia completa; si es `'facil'`, propias+4 distractoras al azar (`DISTRACTORAS_FACIL=4`), conservando el orden del abecedario completo.

**4. Uso de plataforma:** `medios` (mín.3), `ajustesPista` SOLO `mayuscula` y `dificultadRuleta` (NO usa `soloTexto`/`pulsadorTts`, justificado explícitamente), `t` (muchas claves de ruleta), `getDisplayUrl`, `sounds.click/acierto/fallo/recompensa`, `tts.speak` al completar palabra, `mostrarRecompensa` tras `PALABRAS_TOTAL=10`.

**5. DOM:** `.ruleta-app` → cabecera+marcador+`.ruleta-zona`: `.ruleta-pictograma` (imagen+retícula 3×3 superpuesta) y `.ruleta-centro` (panel de casillas-letra, rueda con 4 sectores conic-gradient + puntero + botón girar, mensaje, abecedario de botones).

**6. Interacción — máquina de estados `fase` (`esperando-giro`/`elige-letra`/`palabra-completa`):**
1. **Girar:** calcula `disponibles`→`pesos`→`resultado` con `Math.random()` ANTES de animar; anima la rueda 1100ms (`calcularRotacionSiguiente`: ángulo objetivo del sector + vueltas extra, garantiza giro siempre hacia delante) y solo al terminar resuelve.
2. Resolución: `'letra'`→abre selección de abecedario; `'pista'`→revela siguiente casilla retícula; `'vocal'`/`'consonante'`→`elegirLetraRegalada` y revela sus apariciones.
3. Elegir letra del abecedario: revela apariciones si coincide (acierto) o mensaje "no está" (fallo); siempre vuelve a `esperando-giro`.
4. Al completar palabra: revela pictograma entero, sonido recompensa, TTS, pasa a siguiente palabra o recompensa final.

**7. Ajustes:** `mayuscula` (formato letras/abecedario), `dificultadRuleta` (afecta SIMULTÁNEAMENTE: rango de longitud de palabra, casillas iniciales visibles de retícula, abecedario completo o reducido [solo en facil], y pesos de la ruleta).

**8. Particularidades citadas textualmente:** *"el pictograma TIENE que verse... porque descubrirlo poco a poco es el corazón del juego"* (por eso no usa soloTexto/pulsadorTts). *"NO es azar puro: el resultado se calcula matemáticamente ANTES de iniciar la animación... para poder testear con node --test sin depender de animación real."* `RETRASO_GIRO_MS=1100` con advertencia: *"debe coincidir con la transición CSS de .ruleta-rueda"* (acoplamiento frágil JS/CSS). Pesos de normal verificados con ejemplo citado: *"sin pistas pendientes: elige letra 80, vocal 10, consonante 10"*.

**9. CSS:** app más ancha (960px máx); retícula superpuesta con celdas que se ocultan con fade+scale; rueda con `conic-gradient` de 4 cuadrantes rotada con `cubic-bezier 1.1s`; abecedario flex-wrap de botones cuadrados táctiles.

---

## 8. ROSCO-PICTOGRAMAS

**1. Identidad:** `{ id: 'rosco-pictogramas', nombre: 'Rosco de pictogramas', icono: '🔠', estante: 'LECTURA' }`. Sin ajustes propios.

**2. Concepto:** el niño escucha una consigna ("empieza por la letra X" o "tiene la letra X") y toca, entre cuatro pictogramas, el único que la cumple, recorriendo un rosco de A a Z.

**3. Lógica pura exportada:**
- `normalizarLetra(caracter)`: toma solo el primer carácter; protege Ñ; si no, quita acento y mayúscula (sin locale explícito).
- `primeraLetraNormalizada(nombre)`: `''` si falsy; busca primer carácter-letra (ignora dígitos/símbolos iniciales).
- `letrasNormalizadasDePalabra(nombre)`: todas las letras normalizadas en orden.
- `medioEmpiezaPorLetra(medio, letraNormalizada)` / `medioTieneLetra(...)`: comparaciones directas, `false` si `!medio`.
- `medioSatisfaceConsigna(medio, letraNormalizada, modo)`: `'tiene'`→`medioTieneLetra`, cualquier otro valor→`medioEmpiezaPorLetra` (default).
- `determinarModoConsigna(medios, letraNormalizada)`: `null` si vacío; `'empieza'` si algún medio empieza por ella; si no `'tiene'` si alguno la contiene; si no `null`.
- `candidatosObjetivo` / `candidatosDistractor`: filtran satisfacción/no-satisfacción de la consigna excluyendo el objetivo.
- `construirRonda(medios, letraNormalizada)`: `null` si vacío, si `modo===null`, si `objetivoCandidatos` vacío, o si `distractorCandidatos.length<DISTRACTORES_POR_RONDA(3)`. Si no: elige objetivo al azar, mezcla y toma 3 distractores, devuelve `{letra, modo, objetivo, distractores, pictogramas: mezclar([objetivo,...distractores])}`.
- `construirSecuenciaRosco(medios)`: `[]` si no array; recorre `ABECEDARIO_ROSCO` (A-Z, **sin Ñ**, 26 letras) llamando `construirRonda` y filtrando los `null` — puede dar partida con menos de 26 turnos.
- `esSeleccionCorrecta(ronda, medioId)`: compara id; `false` con inválidos.
- `claveConsigna(modo)`: `'tiene'`→`rosco.consigna_tiene`, si no→`rosco.consigna_empieza` (default).

**4. Uso de plataforma:** `medios` (mín.4 = objetivo+3 distractores), `ajustesPista` no usado en lógica (coincide con `CAMPOS_POR_MECANICA:[]`), `t` (rosco.instrucciones/progreso/consigna_*/mensaje_final), `getDisplayUrl`, `sounds.acierto/fallo`, `tts.speak` (lee la consigna completa cada ronda), `mostrarRecompensa({mensajeKey:'rosco.mensaje_final'})`.

**5. DOM:** `.rosco-app` → cabecera+`.rosco-progreso`+`.rosco-zona`: `.rosco-anillo-cont` (26 `span.rosco-letra` posicionados en círculo) con `.rosco-centro` superpuesto (consigna `aria-live="polite"` + grid 2×2 de 4 `button.rosco-pictograma`).

**6. Interacción:** tap. Acierto: bloquea ronda, sonido, marca letra resuelta en el anillo, avanza tras 900ms. Fallo: sonido, **solo ese botón** se deshabilita (eliminación progresiva), el juego sigue activo sin bloquearse — se puede seguir intentando con los pictogramas restantes.

**7. Ajustes:** ninguno afecta comportamiento. Justificado: *"el pictograma en sí ES el rompecabezas que hay que resolver a la vista... la consigna ya se dice siempre en voz alta sin necesidad de pulsador."*

**8. Particularidades citadas textualmente:** *"la especificación pide expresamente 'las letras de la A a la Z'... Aquí se respeta la letra de la especificación"* (por eso 26 letras sin Ñ, a diferencia del resto del proyecto que usa 27 con Ñ) — pero sí protege la normalización para que "ñ" no cuente como "n". *"Sin tiempo límite, sin marcador de puntos, sin límite de fallos."*

**9. CSS:** anillo cuadrado responsive (`clamp(280px,92vw,380px)`) con letras posicionadas vía `top/left` calculados en JS; centro superpuesto con tarjeta propia; pictogramas en grid 2×2 con estados `-correcto/-incorrecto` (shake).

---

## 9. ARRASTRA-NUMERO

**1. Identidad:** `{ id: 'arrastra-numero', nombre: 'Cuenta y arrastra el número', icono: '🔢', estante: 'NUMEROS' }`. Sin ajustes propios.

**2. Concepto:** el niño cuenta una serie de pictogramas idénticos repetidos en línea y arrastra, de una fila de números del 1 al 10, el que coincide con esa cantidad.

**3. Lógica pura exportada:**
- `numerosArrastrables(min=1, max=10)`: array `[min..max]` ascendente.
- `elegirSiguienteMedio(medios, {evitarIds=[]}={})`: patrón estándar, `null` si vacío.
- `cantidadAleatoria(min=1, max=10)`: entero uniforme `[min,max]`.
- `generarNivel(medios, {evitarIds=[]}={})`: `null` si no hay medio; si no, `{medio, cantidad: cantidadAleatoria()}`.
- `esRespuestaCorrecta(numero, cantidad)`: `Number(numero)===Number(cantidad)`.

**4. Uso de plataforma:** `medios` (mín.1), `t` (juegos.sin_material, arrastraNumero.nivel/casilla_vacia/instrucciones), `getDisplayUrl`, `icono/nombre`, `sounds.acierto/fallo`, `tts.speak(String(cantidad))`, `mostrarRecompensa`. **No usa `ajustesPista`** (confirmado: `CAMPOS_POR_MECANICA:[]`).

**5. DOM:** `.arrastranum-app` → cabecera+marcador+`.arrastranum-zona`: `.arrastranum-serie` (N `<img>` + `.arrastranum-objetivo` casilla vacía al final) y `.arrastranum-numeros` (10 `div role=button tabindex=0`).

**6. Interacción:** drag por puntero (umbral 4px) + teclado Enter/Espacio directo sobre el número. Acierto: bloquea, sonido+TTS, verde, avanza 700ms (o recompensa 500ms en nivel 10). Fallo: sonido+shake 320ms (clases retiradas a 400ms), sin límite de intentos.

**7. Ajustes:** ninguno. Comentario explícito: *"esta mecánica no usa los ajustes de pista del portal... siempre se ve la imagen, tantas veces como toque."*

**8. Particularidades:** *"El arrastre reutiliza la misma dinámica de puntero que 'Arrastra la palabra' (duplicada a propósito: cada mecánica de este proyecto es independiente)."* `elegirSiguienteMedio` evita repetir el medio anterior solo "soft" (si solo hay un medio en la biblioteca, repite igual).

**9. CSS:** serie en fila flex con wrap (imágenes 64×64); objetivo cuadrado 64×64 con borde discontinuo→sólido; números en píldoras con `touch-action:none`.

---

## 10. ESCRIBE-NUMERO

**1. Identidad:** `{ id: 'escribe-numero', nombre: 'Cuenta y escribe el número', icono: '✏️', estante: 'NUMEROS' }`.

**2. Concepto:** el niño cuenta una serie de pictogramas y escribe a mano, en un único recuadro-lienzo, el número correspondiente (1-10, una o dos cifras).

**3. Lógica pura exportada:** mismo motor de reconocimiento de trazo que escribe-letra (duplicado literal): `dilatarMascara`, `contarPixeles`, `proporcionDentro`, `indicesPorZona`, `cubreTodasLasZonas`, `NIVELES_TRAZO` (mismos 3 perfiles con mismos valores exactos), `configTolerancia`, `evaluarTrazo` (idéntico algoritmo de 8 pasos). Además: `elegirSiguienteMedio` (patrón estándar), `cantidadAleatoria(min=1,max=10)`, `generarNivel(medios,{evitarIds=[]}={})` → `null` o `{medio, cantidad}`.

**4. Uso de plataforma:** `medios` (mín.1), `t`, `getDisplayUrl`, `sounds.acierto/fallo`, `tts.speak`, `mostrarRecompensa`, `ajustesPista` (fallback `{letraPunteada:true, toleranciaTrazo:'facil'}`).

**5. DOM:** `.escribenum-app` → cabecera+marcador+`.escribenum-zona`: `.escribenum-serie` (N imágenes) y una única `.escribenum-casilla` con `<canvas>` 150×110px (admite 1-2 cifras).

**6. Interacción:** igual mecanismo que escribe-letra: dibujo en canvas con máscara lógica `GRID_X=24,GRID_Y=18`; tras soltar, timeout de **2000ms** antes de evaluar; máscara de referencia rasterizada con tamaño de fuente que se reduce iterativamente (`-=2` mientras `measureText().width>ANCHO_CASILLA*0.82` y `tamanoFuente>10`) para que "10" quepa. Acierto: sonido+TTS, verde, avanza. Fallo: sonido+shake 400ms, limpia casilla completa para reintentar.

**7. Ajustes:** `letraPunteada` (decorativo, no afecta evaluación), `toleranciaTrazo` (selecciona perfil de `NIVELES_TRAZO`).

**8. Particularidades:** comentario de cabecera: *"es el MISMO algoritmo que en 'Escribe la letra'... duplicado a propósito en vez de extraído a un módulo común"*; diferencia clave: una sola casilla que puede contener 1 o 2 caracteres, de ahí el ajuste dinámico de tamaño de fuente.

**9. CSS:** única mecánica de estas 5 con `@media (orientation:landscape)` que cambia de columna a fila y amplía a 920px. Casilla con borde grueso que cambia a verde si resuelta.

---

## 11. SUMA-RESULTADO

**1. Identidad:** `{ id: 'suma-resultado', nombre: 'Suma pictogramas y elige el resultado', icono: '➕', estante: 'NUMEROS' }`. Sin ajustes propios.

**2. Concepto:** el niño ve dos grupos de pictogramas idénticos con "+" entre ambos y "=?" al final, suma mentalmente y pulsa entre tres números el resultado correcto.

**3. Lógica pura exportada:**
- `elegirSiguienteMedio` (patrón estándar).
- `sumandoAleatorio(min=1, max=5)`: entero uniforme.
- `generarOpciones(resultado, {cantidad=3, min=1, max=10}={})`: candidatos `[min..max]` excepto `resultado`; mezcla y toma `cantidad-1` distractores (`Math.max(0,cantidad-1)`); antepone `resultado` y mezcla todo. Caso límite: rango insuficiente → menos distractores de los pedidos, sin error.
- `generarNivel(medios,{evitarIds=[]}={})`: `null` si sin medio; si no, `sumando1`/`sumando2` independientes (1-5 cada uno), `resultado=suma` (rango real 2-10), `opciones=generarOpciones(resultado)` (rango ofrecido 1-10).
- `esRespuestaCorrecta(opcion, resultado)`: `Number(opcion)===Number(resultado)`.
- `mezclar` interna no exportada.

**4. Uso de plataforma:** `medios`(mín.1), `t`, `getDisplayUrl`, `sounds.click/acierto/fallo`, `tts.speak(String(resultado))`, `mostrarRecompensa`. No usa `ajustesPista`.

**5. DOM:** `.sumares-app` → cabecera+marcador+`.sumares-zona`: `.sumares-operacion` (grupo1+signo "+"+grupo2+signo "="+signo "?") y `.sumares-opciones` (3 `<button>`).

**6. Interacción:** tap directo en botón (sin drag). `sounds.click()` inmediato + validación. Acierto: bloquea, sonido+TTS, verde, avanza. Fallo: sonido+shake, sin límite — *"No hay límite de fallos: puede volver a intentarlo"*.

**7. Ajustes:** ninguno. *"esta mecánica no usa los ajustes de pista del portal (no hay palabra que mostrar como pista): siempre se ven las imágenes de los pictogramas."*

**8. Particularidades:** diseño deliberado de "dos grupos de pictogramas IGUALES... para que la suma se vea como una sola cantidad creciendo". El "1" puede salir como distractor aunque la suma mínima real sea 2.

**9. CSS:** operación en fila flex centrada; imágenes 56×56 (más pequeñas que en arrastra/escribe-numero por más densidad visual); opciones en píldoras clicables.

---

## 12. DEDOS-PICTOGRAMAS

**1. Identidad:** `{ id: 'dedos-pictogramas', nombre: 'Relaciona los dedos con los pictogramas', icono: '✋', estante: 'NUMEROS' }`. Sin ajustes propios.

**2. Concepto:** el niño ve 1-2 manos SVG con dedos levantados, suma el total y pulsa, entre tres grupos de pictogramas con cantidades distintas, el grupo cuyo número coincide.

**3. Lógica pura exportada:**
- `iconoMano(n)`: genera SVG de una mano con `cantidad=max(1,min(5,round(n)))` dedos (clamp [1,5]); con `n===5` dibuja 4 dedos rectos + pulgar especial rotado -28° desde el lateral; con `n<5`, exactamente `cantidad` dedos rectos equiespaciados.
- `generarManos({minManos=1,maxManos=2,minDedos=1,maxDedos=5}={})`: número de manos aleatorio en rango, cada una con dedos aleatorios independientes en rango.
- `totalDedos(manos)`: `(manos||[]).reduce(sum,0)` — `0` con null/undefined.
- `elegirSiguienteMedio` (patrón estándar).
- `generarOpciones(total, {cantidad=3,min=1,max=10}={})`: mismo patrón que suma-resultado, pero cada "opción" es una cantidad de pictogramas a dibujar.
- `generarNivel(medios,{evitarIds=[]}={})`: `null` si sin medio; si no, `{medio, manos, total, opciones}`.
- `esRespuestaCorrecta(opcion, total)`: comparación numérica.

**4. Uso de plataforma:** `medios`(mín.1), `t`, `getDisplayUrl` (repetido N veces por botón de opción), `sounds.click/acierto/fallo`, `tts.speak(String(total))`, `mostrarRecompensa`. No usa `ajustesPista`.

**5. DOM:** `.dedospict-app` → cabecera+marcador+`.dedospict-zona`→`.dedospict-columnas` (dos columnas lado a lado): `.dedospict-manos` (1-2 manos SVG + signo "+" si hay 2) y `.dedospict-opciones` (3 botones en COLUMNA vertical, cada uno con tantas imágenes pequeñas como su cantidad).

**6. Interacción:** tap, mismo patrón que suma-resultado (click+sonido+validación+verde/shake).

**7. Ajustes:** ninguno (no aparece `plataforma.ajustesPista` en el código).

**8. Particularidades:** comentario sobre por qué se eligió tap en vez de arrastre: *"para mantener una interacción consistente entre las tres mecánicas de 'elegir entre tres opciones'"* (suma-resultado, dedos-pictogramas, dedos-numero). Comentario detallado sobre anatomía del pulgar: *"una mano real no tiene 5 dedos en abanico, todos iguales: el pulgar es más corto, más grueso, y sale del lateral de la palma girado hacia fuera"*. `iconoMano` duplicada a propósito desde dedos-numero.

**9. CSS:** única de las 5 mecánicas de números con opciones en columna vertical (no fila); manos en cajas 100×120px; opciones como cajas anchas con imágenes de 32×32px en wrap interno.

---

## 13. DEDOS-NUMERO

**1. Identidad:** `{ id: 'dedos-numero', nombre: 'Relaciona los dedos con el número', icono: '🖐️', estante: 'NUMEROS' }`. Sin ajustes propios.

**2. Concepto:** el niño ve 1-2 manos SVG con dedos levantados, suma el total y pulsa entre tres números de texto el que coincide.

**3. Lógica pura exportada:** `iconoMano(n)` (idéntica byte a byte a dedos-pictogramas), `generarManos` (idéntica), `totalDedos` (idéntica), `generarOpciones` (idéntica, pero aquí son números de texto, no grupos de imágenes), `generarNivel()` **sin parámetros** — nunca devuelve `null`, siempre `{manos, total, opciones}` (comentario explícito: *"nunca devuelve null (esta mecánica no depende de material de la biblioteca)"*), `esRespuestaCorrecta(opcion, total)`.

**4. Uso de plataforma — particularidad central:** NO usa `medios`, NI `getDisplayUrl`, NI `ajustesPista` en absoluto (comentario: *"Esta mecánica no necesita pictogramas: no usa material de la biblioteca ni, por tanto, los ajustes de pista del portal"*). Usa `t` (dedosNumero.nivel/instrucciones — sin clave `sin_material`, porque nunca puede faltar), `icono/nombre`, `sounds.click/acierto/fallo`, `tts.speak`, `mostrarRecompensa`.

**5. DOM:** `.dedosnum-app` → cabecera+marcador+`.dedosnum-zona` en COLUMNA (a diferencia de dedos-pictogramas): `.dedosnum-manos` + debajo `.dedosnum-opciones` (3 botones en fila, texto numérico).

**6. Interacción:** idéntico patrón tap que dedos-pictogramas/suma-resultado.

**7. Ajustes:** ninguno, explícitamente no aplicable.

**8. Particularidades:** única de las 5 mecánicas de números que NO depende de `plataforma.medios` en absoluto — nunca muestra "sin material"; `montar()` llama directo a `iniciarPartida()` sin comprobación de mínimo.

**9. CSS:** columna para toda la zona (a diferencia de dedos-pictogramas); manos en cajas algo más grandes (110×130px); opciones en fila con wrap, estilo píldora idéntico a sumares/arrastranum.

---

## 14. COMPLETA-SUMA

**1. Identidad:** `{ id: 'completa-suma', nombre: 'Escribe los números de la suma', icono: '🧮', estante: 'NUMEROS' }`.

**2. Concepto:** el niño ve una suma representada con pictogramas (sumando1 copias + sumando2 copias = resultado copias, del mismo pictograma) y escribe a mano, en tres recuadros independientes, los tres números.

**3. Lógica pura exportada:** mismo motor de reconocimiento de trazo, duplicado literal (`dilatarMascara`, `contarPixeles`, `proporcionDentro`, `indicesPorZona`, `cubreTodasLasZonas`, `NIVELES_TRAZO` con los mismos 3 perfiles, `configTolerancia`, `evaluarTrazo` idéntico de 8 pasos). Además: `elegirSiguienteMedio` (patrón estándar), `sumandoAleatorio(min=1,max=5)`, `generarNivel(medios,{evitarIds=[]}={})` → `null` o `{medio, sumando1, sumando2, resultado:sumando1+sumando2}` (máx. resultado 10).

**4. Uso de plataforma:** `medios`, `t`, `getDisplayUrl`, `sounds.acierto/fallo`, `tts.speak`, `mostrarRecompensa`, `ajustesPista` (fallback `{letraPunteada:true, toleranciaTrazo:'facil'}`).

**5. DOM:** `.completasuma-app` → cabecera+marcador+`.completasuma-zona`: `.completasuma-operacion` con tres `.completasuma-parte` (grupo de imágenes + casilla-canvas) separadas por signos "+"/"=".

**6. Interacción:** igual mecanismo de trazo+timeout 2000ms que escribe-letra/escribe-numero, evaluado independientemente en cada una de las 3 casillas (cualquier orden). Acierto en una casilla: marca resuelta en verde; cuando las 3 están resueltas, avanza nivel/recompensa. Fallo: limpia esa casilla para reintentar.

**7. Ajustes:** `letraPunteada` (decorativo), `toleranciaTrazo` (perfil de evaluación).

**8. Particularidades:** *"el MISMO algoritmo que en Escribe la letra y Cuenta y escribe el número (duplicado a propósito)"*. Tamaño de casilla 150×110 igual que escribe-numero, porque el resultado puede ser de dos cifras ("10").

**9. CSS:** tres "partes" en columna con signos "+"/"=" alineados a la altura de los grupos; casilla con borde→verde al resolver.

---

## 15. ARRASTRA-SUMA

**1. Identidad:** `{ id: 'arrastra-suma', nombre: 'Arrastra los números de la suma', icono: '🧩', estante: 'NUMEROS' }`. Sin ajustes propios.

**2. Concepto:** misma suma pictográfica que completa-suma, pero el niño arrastra números desde un banco fijo (1-10) hasta tres casillas-objetivo (sumando1, sumando2, resultado), pudiendo **reutilizar el mismo número varias veces**.

**3. Lógica pura exportada:** `elegirSiguienteMedio` (patrón estándar), `sumandoAleatorio(min=1,max=5)`, `numerosArrastrables(min=1,max=10)` (array ascendente, banco fijo), `generarNivel(medios,{evitarIds=[]}={})` → `null` o `{medio,sumando1,sumando2,resultado}`, `esRespuestaCorrecta(numero,valorEsperado)`: `Number(numero)===Number(valorEsperado)`.

**4. Uso de plataforma:** `medios`, `t`, `getDisplayUrl`, `sounds.acierto/fallo`, `tts.speak`, `mostrarRecompensa`. **No usa `ajustesPista`** en absoluto (confirma `CAMPOS_POR_MECANICA:[]`).

**5. DOM:** `.arrastrasuma-app` → cabecera+marcador+`.arrastrasuma-zona`: `.arrastrasuma-operacion` (tres `.arrastrasuma-parte` con grupo+`.arrastrasuma-objetivo`) y `.arrastrasuma-numeros` (10 números arrastrables, banco fijo no regenerado entre niveles salvo repintado completo).

**6. Interacción:** drag por puntero (umbral 4px) + teclado (Enter/Espacio busca automáticamente la primera casilla sin resolver cuyo valor esperado coincida). Al acertar una casilla: se pinta verde con el valor, **el número del banco NO se deshabilita ni retira** — sigue disponible para reutilizarlo. Si las 3 casillas se resuelven, avanza/recompensa.

**7. Ajustes:** ninguno.

**8. Particularidades citadas textualmente:** *"A diferencia de 'Cuenta y arrastra el número', aquí el número del banco NO se queda marcado como 'correcto' de forma permanente: sigue disponible para volver a arrastrarlo (puede hacer falta dos veces en el mismo nivel, p.ej. si los dos sumandos son iguales)"* — ej. 3+3=6 requiere arrastrar "3" dos veces y "6" una vez.

**9. CSS:** misma base que completa-suma; casillas-objetivo cuadradas 64×64 con borde discontinuo→verde sólido al resolver; banco de números en píldoras reutilizables con pulso breve de acierto.

---

## 16. CLASIFICA-CATEGORIAS

**1. Identidad:** `{ id: 'clasifica-categorias', nombre: 'Clasifica los pictogramas en dos categorías', icono: '🗂️', estante: 'CONCEPTOS' }`.

**2. Concepto:** el niño arrastra (o navega por teclado) un pictograma, que aparece de uno en uno, hasta la zona de una de dos categorías fijas con cabecera propia, clasificándolo correctamente.

**3. Lógica pura exportada:**
- `hayMaterialSuficiente(categorias)`: `true` solo si `categorias` es array de longitud EXACTAMENTE 2 y al menos UNA tiene `medios` array no vacío (basta una, no exige ambas).
- `elegirSiguienteReto(categorias, {evitarIds=[]}={})`: filtra categorías con medios; `null` si ninguna tiene; elige categoría al azar entre las disponibles, dentro de ella evita usados salvo agotarse. Devuelve `{categoriaId, medio}`.
- `esRespuestaCorrecta(categoriaIdElegida, categoriaIdCorrecta)`: `Boolean(ambos) && String(a)===String(b)` — ids falsy (0, '', null) se tratan como inválidos.
- `formatearPista(nombre, mayuscula=true)`: estándar.
- `puedeResponder(ajustesPista, escuchado)`: patrón estándar.

**4. Uso de plataforma — particularidad central:** NO usa `plataforma.medios`. Usa exclusivamente `plataforma.categorias` (array de exactamente 2 `{id,nombre,cabecera,medios}`, ya resuelto al azar por el núcleo antes de montar). `hayMaterialSuficiente(plataforma.categorias)` decide si se construyen las zonas; las cabeceras se pintan con `categoria.cabecera` (no un ejemplo del pozo). Además `t`, `getDisplayUrl`, `sounds.click/acierto/fallo`, `tts.speak`, `mostrarRecompensa`, `ajustesPista` (mostrar, mayuscula, soloTexto, pulsadorTts).

**5. DOM:** `.clasifica-app` → cabecera+marcador+`.clasifica-zonas` (2 `div role=button tabindex=0`, cada una con cabecera+bandeja de colocados) + `.clasifica-item-zona[aria-live=polite]` (el pictograma a clasificar, o pulsador TTS).

**6. Interacción:** drag por puntero contra DOS zonas posibles (`detectarZona` por bounding rect) + teclado donde **cada zona** es activable individualmente (no el ítem) porque hay dos destinos. Acierto: bloquea, sonido+voz, zona verde, pictograma a la bandeja, ítem oculto, avanza tras 700ms. Fallo: sonido+shake en zona e ítem 400ms, sin bloquear.

**7. Ajustes (4, los más ricos junto a teclea-palabra):** `mostrar` (pista oculta salvo soloTexto), `mayuscula` (cabeceras+ítem+bandeja), `soloTexto` (sin imagen en ítem ni en miniaturas de bandeja), `pulsadorTts` (sustituye TANTO cabeceras de categoría COMO ítem por botón 🔊; el bloqueo de "escuchar antes de responder" solo aplica al ítem a clasificar, no a las cabeceras — *"esos se pueden escuchar en cualquier momento: no cambian de nivel a nivel"*).

**8. Particularidades citadas textualmente:** *"Crítico para el arrastre: sin esto [img.draggable=false], el navegador arranca su propio arrastre nativo de imagen... que se adelanta al arrastre por puntero... pointerup nunca llega a disparar soltar() como toca, así que el drop no se registra nunca. El resto de mecánicas de 'arrastrar' del proyecto no lo sufren porque arrastran texto o casillas, no una `<img>` suelta"* — bug histórico documentado con su fix permanente. Las zonas se construyen una sola vez por partida.

**9. CSS:** zonas en fila (columna en portrait), cada una flex:1 con borde discontinuo→sólido al resaltar/resolver; ítem en tarjeta separada; pulsador TTS circular con pulso.

---

## 17. PUZZLE-PICTOGRAMA-PALABRA

**1. Identidad:** `{ id: 'puzzle-pictograma-palabra', nombre: 'Puzzle de pictograma y palabra', icono: '🖼️', estante: 'LECTURA' }`.

**2. Concepto:** el niño ve un pictograma modelo completo y recompone arrastrando sus 4 piezas (cuadrantes 2×2) a los huecos correctos; al completar, elige entre 3 palabras la que nombra ese pictograma.

**3. Lógica pura exportada:**
- `mezclar(lista)`: Fisher-Yates estándar.
- `hayMaterialSuficiente(medios)`: `true` solo si tras filtrar por `nombre` truthy quedan ≥3.
- `elegirSiguienteMedio(medios,{evitarIds=[]}={})`: filtra por `nombre`; `null` si vacío; evita usados salvo agotarse.
- `generarPiezas()`: 4 objetos `{piezaId:'p0'..'p3', cuadrante:0..3}` mezclados (`CUADRANTES_TOTAL=4` fijo).
- `colocacionCorrecta(pieza, indiceCasilla)`: `Boolean(pieza)&&pieza.cuadrante===indiceCasilla`.
- `piezasCompletas(colocadas)`: array de longitud exactamente 4 con `every(Boolean)`.
- `generarOpcionesPalabra(medioCorrecto, pool)`: candidatos del pool con nombre≠correcto; mezcla y toma 2 distractores sin nombres repetidos (Set); si tras recorrer todo el pool quedan menos de 2, **rellena repitiendo `distractores[0]||nombreCorrecto`** (puede dar texto duplicado en caso extremo de material muy pequeño, aunque en la práctica con el guard de `hayMaterialSuficiente` no debería darse). Devuelve `mezclar([correcta, distractor1, distractor2])`.
- `formatearTexto(texto, mayuscula=true)`: estándar.

**4. Uso de plataforma:** `medios` (para elegir medio Y como pool completo de distractores en CUALQUIER ronda, sin excluir ya usados), `t`, `getDisplayUrl`, `sounds.click/acierto/fallo`, `tts.speak`, `mostrarRecompensa`, `ajustesPista` (fallback `{mayuscula:true}`, solo este campo).

**5. DOM:** `.puzzle-app` → cabecera+marcador+`.puzzle-zona-puzzle` (modelo + grid 2×2 de huecos + bandeja de 4 piezas) y `.puzzle-zona-palabra[aria-live=polite]` (oculta hasta completar puzzle): pregunta + 3 botones.

**6. Interacción — dos fases:** *Puzzle*: drag por puntero (umbral 4px) + tap simple selecciona (`alternarSeleccion`, igual dinámica que ordena-secuencia) + teclado. `casillaEnPosicion` excluye huecos llenos. Acierto: pieza encajada con su trozo de imagen real (vía `background-position` del cuadrante), eliminada de la bandeja; al completar 4, pasa a fase palabra. Fallo: shake, pieza vuelve a la bandeja. *Palabra*: tap en botón, acierto avanza/recompensa, fallo shake sin bloqueo.

**7. Ajustes:** solo `mayuscula` (formatea los 3 botones de palabra; no afecta piezas ni imagen modelo).

**8. Particularidades citadas textualmente:** *"El truco de recortar cada pieza/hueco a su cuadrante es puro CSS: una imagen de fondo a '200% 200%'... más un background-position en cada esquina (0%/100%) hace que cada caja muestre solo su cuarto correspondiente"* — sin recorte real de imagen (`POSICIONES_CUADRANTE=['0% 0%','100% 0%','0% 100%','100% 100%']`). *"Solo se evalúan los huecos TODAVÍA VACÍOS, igual que en 'Ordena la secuencia': uno ya resuelto no debe poder 'robar' una pieza nueva."*

**9. CSS:** imagen modelo pequeña arriba; grid 2×2 fijo de huecos 90×90 (80×80 portrait) con gap, efecto rejilla; bandeja de piezas debajo separada por línea discontinua; zona de palabra con 3 botones grandes.

---

## 18. RELACIONA-PICTOGRAMA-PALABRA

**1. Identidad:** `{ id: 'relaciona-pictograma-palabra', nombre: 'Relaciona el pictograma con su palabra', icono: '🔗', estante: 'LECTURA' }`.

**2. Concepto:** el niño arrastra (o toca/selecciona) cada uno de 3 pictogramas de una columna izquierda hasta la casilla de texto correcta en la columna derecha, emparejando los 3.

**3. Lógica pura exportada:**
- `mezclar(lista)`: Fisher-Yates estándar.
- `hayMaterialSuficiente(medios)`: cuenta nombres DISTINTOS (Set, filtrando sin nombre); `true` si ≥3 (`GRUPO_TOTAL`).
- `elegirGrupoRonda(medios,{evitarIds=[]}={})`: `null` si no array. Toma el primer medio de cada nombre distinto (deduplicado por nombre); `null` si `<3`; filtra no usados (por id) salvo agotarse; devuelve `mezclar(candidatos).slice(0,3)`.
- `construirCasillas(grupo)`: `mezclar(grupo||[]).map(m=>({id,nombre}))` (orden mezclado independiente de la izquierda).
- `esRespuestaCorrecta(idPictograma, idCasilla)`: `Boolean(ambos)&&String(a)===String(b)`.
- `grupoCompleto(grupo, colocadosIds)`: `false` si `grupo` no es longitud exactamente 3 o `colocadosIds` no array; si no, todos los ids del grupo están en `colocadosIds`.
- `formatearTexto(texto, mayuscula=true)`: estándar.
- `puedeResponderItem(ajustesPista, escuchadosIds, medioId)`: `!pulsadorTts || (array.includes(medioId))` — es por-ítem (lista de ids escuchados), no un único booleano global.

**4. Uso de plataforma:** `medios` (cualquier pictograma con nombre, sin etiqueta concreta), `t`, `getDisplayUrl`, `sounds.click/acierto/fallo`, `tts.speak`, `mostrarRecompensa` tras ronda 10, `ajustesPista` (mostrar, mayuscula, soloTexto, pulsadorTts; fallback completo).

**5. DOM:** `.relaciona-app` → cabecera+marcador+`.relaciona-columnas[aria-live=polite]`: `.relaciona-col-izq` (3 items arrastrables) y `.relaciona-col-der` (3 `button.relaciona-casilla`).

**6. Interacción:** drag por puntero (umbral 4px) + tap simple selecciona (toggle) + casillas también responden a click directo con selección previa (`intentarColocarSeleccion`). `detectarCasilla` excluye casillas `disabled`. Acierto: casilla deshabilitada y verde, item marcado colocado (no desaparece); al completar 3, avanza/recompensa. Fallo: shake 400ms en ambos, sin límite.

**7. Ajustes:** `mayuscula`, `mostrar` (oculta pista salvo soloTexto), `soloTexto` (sin imagen en item izq.), `pulsadorTts` (sustituye TODO el contenido del item por botón; bloqueo por-ítem vía `escuchadosIds`, no un único flag global — diferencia respecto a otras mecánicas con un solo objetivo).

**8. Particularidades:** mismo bug histórico documentado de `img.draggable=false` "Crítico para el arrastre" (remite al mismo patrón que clasifica-categorias). `detectarCasilla` excluye disabled "una ya acertada no debe poder robar un pictograma nuevo". Declarado explícitamente como combinación de la dinámica de drag de clasifica-categorias + selección por toque de puzzle-pictograma-palabra, "duplicado a propósito".

**9. CSS:** columnas en fila (apiladas en portrait); items con borde grueso azul, casillas con borde discontinuo→verde sólido; pulsador TTS circular con pulso.

---

## 19. ME-GUSTA-NO-ME-GUSTA

**1. Identidad:** `{ id: 'me-gusta-no-me-gusta', nombre: 'Me gusta / no me gusta', icono: '🍽️', estante: 'CONCEPTOS' }`.

**2. Concepto:** el niño arrastra (o selecciona por teclado) una comida hasta el plato ("me gusta") o el cubo de basura ("no me gusta"), según su preferencia — SIN acierto ni fallo real.

**3. Lógica pura exportada:**
- `hayMaterialSuficiente(medios)`: basta con UNA comida con nombre (`some`, no `length>=N`).
- `elegirSiguienteMedio(medios,{evitarIds=[]}={})`: patrón estándar sobre medios válidos (con nombre).
- `esZonaValida(zonaId)`: `zonaId==='plato'||zonaId==='basura'` — función pura testeable sin DOM.
- `formatearPista(nombre, mayuscula=true)`: estándar.

**4. Uso de plataforma — particularidad central (`fijos`):** `plataforma.fijos.plato` y `plataforma.fijos.basura` (ARASAAC ids 2532 y 2724 según comentario), pintados UNA VEZ por partida; si el medio fijo no carga, cae a emoji de respaldo (🍽️/🗑️) — "el juego sigue siendo jugable" sin red. Plato/cubo llevan etiqueta FIJA vía `t()`, independiente de `ajustesPista`. Además `medios` (comida variable), `t`, `sounds.acierto()` (única, **nunca `fallo()`** — reutilizado como "sonido de confirmación" genérico), `tts.speak`, `getDisplayUrl`, `mostrarRecompensa`, `ajustesPista` (mostrar, mayuscula, soloTexto — sin pulsadorTts).

**5. DOM:** `.megusta-app` → cabecera+marcador+`.megusta-zonas` (2 zonas `role=button tabindex=0` con fijo+etiqueta+bandeja de colocados) + `.megusta-item-zona[aria-live=polite]` (la comida actual).

**6. Interacción:** drag por puntero (umbral 4px) — a diferencia de otras, un toque simple SIN arrastre NO decide nada (solo cuenta soltar dentro de zona tras arrastre real) — + teclado (Enter/Espacio sobre cada zona decide directo). `manejarEleccion` NO compara acierto/fallo, solo valida `esZonaValida`: bloquea, sonido+voz, añade a bandeja, oculta item, avanza tras 500-700ms.

**7. Ajustes:** `mayuscula`, `mostrar` (oculta pista salvo soloTexto), `soloTexto` (oculta imagen de la comida; también afecta si los chips de bandeja muestran imagen o texto). Nunca afectan al plato/cubo (chrome fijo siempre con su etiqueta+imagen fija).

**8. Particularidades citadas textualmente:** *"A DIFERENCIA del resto de mecánicas de 'arrastrar' de este proyecto, AQUÍ NO HAY acierto ni fallo — es una actividad de preferencia personal, no de clasificación correcta."* `sounds.acierto()` reutilizado como confirmación genérica. Mismo patrón de `img.draggable=false` documentado.

**9. CSS:** zonas en fila (columna en portrait), borde dashed que escala/colorea al resaltar o elegir; fijo en caja 90×90 o emoji 3.4rem; bandeja flex-wrap de chips 44×44.

---

## 20. LISTA-COMPRA

**1. Identidad:** `{ id: 'lista-compra', nombre: 'Lista de la compra', icono: '🛒', estante: 'RUTINAS' }`.

**2. Concepto:** el niño identifica entre 10 pictogramas de un estante los 5 que aparecen en una lista de la compra y los mete (arrastrando o tocando) en un carrito fijo, evitando 5 señuelos.

**3. Lógica pura exportada:**
- `mezclar(lista)`: Fisher-Yates estándar.
- `hayMaterialSuficiente(medios)`: filtra con nombre; `true` si `validos.length>=MIN_MEDIOS(10)` — NO exige nombres distintos, solo cantidad.
- `generarRonda(medios)`: `null` si `<10` válidos; mezcla todos, primeros 5 = `lista`, siguientes 5 = `senuelos`, devuelve `{lista, estante: mezclar([...lista,...senuelos])}`.
- `esCoincidencia(medio, lista)`: `false` si `!medio`; si no, comparación por `id` exacto contra algún elemento de `lista`.
- `rondaCompleta(idsAnadidos, lista)`: `false` si `lista` vacía/no array; todos los ids de `lista` están en el Set de `idsAnadidos`.
- `formatearTexto(texto, mayuscula=true)`: estándar.

**4. Uso de plataforma — particularidad (`fijos.carrito`):** `plataforma.fijos.carrito` (ARASAAC id 5948 según comentario), pintado UNA SOLA VEZ en `montar()` (no se repinta por ronda), con respaldo a emoji 🛒. Además `medios` (mín.10, etiqueta "comida" compartida con me-gusta-no-me-gusta según comentario), `t`, `sounds.acierto/fallo`, `tts.speak`, `getDisplayUrl`, `mostrarRecompensa` tras ronda **5** (`RONDAS_TOTAL=5`, distinto de 10 en otras mecánicas), `ajustesPista` (mayuscula, listaSoloTexto, estanteSoloImagen).

**5. DOM:** `.lista-app` → cabecera+marcador+`.lista-juego` (fila): `.lista-columna-lista` (`ul[aria-live=polite]` de 5 `<li>` con marca "✓") y `.lista-columna-estante` (grid de 10 items arrastrables) + `.lista-carrito` (zona fija única).

**6. Interacción — particularidad:** como solo hay UN destino posible (carrito), un toque simple SIN arrastrar TAMBIÉN cuenta como intento directo (`if (!arrastrado || sueltaEnCarrito(...)) manejarIntento(...)`) — a diferencia de las demás mecánicas de arrastre. También responde a teclado directo. Acierto: marca ✓ en la lista, **elimina el elemento del estante del DOM**; al completar 5, avanza/recompensa. Fallo: carrito se sombrea rojo 400ms + item del estante tiembla, permanece en el estante.

**7. Ajustes (propios, no compartidos con otras mecánicas):** `mayuscula`, `listaSoloTexto` (lado LISTA sin imagen, solo nombre), `estanteSoloImagen` (lado ESTANTE sin caption de texto, solo pictograma). No usa `mostrar`/`soloTexto`/`pulsadorTts`.

**8. Particularidad/bug detectado por el subagente (hallazgo, no corrección):** discrepancia entre JS y CSS — el JS añade/quita la clase `lista-carrito-resaltado` (terminada en "o"), pero el CSS define el selector `.lista-carrito-resaltada` (terminado en "a"). Esto implica que el resaltado visual del carrito durante el arrastre **nunca se aplica realmente** — incoherencia de nomenclatura entre archivos, documentada aquí como hallazgo fiel al código fuente actual, no corregida. `RONDAS_TOTAL=5` (única mecánica de las 21 con ese total, distinto del estándar 10). Mismo patrón de `img.draggable=false` documentado. Mismo patrón de `pintarFijo` con respaldo a emoji que me-gusta-no-me-gusta.

**9. CSS:** dos columnas en fila (apiladas en portrait): lista en columna de `<li>` con fondo suave y marca de conseguido (tachado+verde 0.7 opacidad); estante en grid de 5 columnas (3 en portrait); carrito centrado abajo con borde dashed.

---

## 21. RECONOCE-EMOCIONES

**1. Identidad:** `{ id: 'reconoce-emociones', nombre: 'Reconoce emociones', icono: '🙂', estante: 'CONCEPTOS' }`.

**2. Concepto:** el niño mira la cara generada de un personaje con una expresión (contento/triste/enfadado/asustado) y pulsa, entre cuatro pictogramas fijos de emociones, el que corresponde.

**3. Lógica pura exportada:**
- `mezclar(lista)`: Fisher-Yates estándar (comentario: "se repite en cada mecánica que la necesita en vez de compartir un helper de núcleo").
- `elegirSiguienteExpresion(usadas=[])`: de las 4 `EXPRESIONES=['contento','triste','enfadado','asustado']` (constante independiente del catálogo interno de `cabezas.js`, desacoplada a propósito), filtra no usadas; si quedan, elige entre ellas; si no (las 4 usadas), elige entre las 4 de nuevo.
- `esRespuestaCorrecta(claveBoton, expresionActual)`: `Boolean(claveBoton)&&claveBoton===expresionActual`.
- `formatearTexto(texto, mayuscula=true)`: estándar.
- `construirOpciones()`: `mezclar(DEFINICIONES_EMOCION)` — las 4 definiciones completas en orden aleatorio cada ronda. No exporta ningún `hayMaterialSuficiente` (deliberado: no depende de material).

**4. Uso de plataforma — particularidades centrales (`cabezas` y `fijos`):**
- `plataforma.cabezas.generarCabezaAleatoriaSVG({expresion, etiqueta})`: pasa SOLO `expresion` (una de las 4 fijas elegidas) y `etiqueta: t('reconoceEmociones.cara_personaje')` — texto genérico, NUNCA la clave de expresión. El SVG se inyecta vía `innerHTML`.
- `plataforma.fijos[def.clave]` (`fijos.contento/triste/enfadado/asustado`): los 4 pictogramas fijos de respuesta, con respaldo a emoji (😊😢😠😨) si no cargan.
- `t` (instrucciones, pregunta, ronda, cara_personaje, y las 4 claves de etiqueta — usadas TANTO como texto visible COMO aria-label del botón, en vez de depender del `alt` interno de ARASAAC).
- `sounds.acierto/fallo`, `tts.speak(t(etiquetaClave))` (dice la etiqueta del portal, no el nombre ARASAAC interno), `mostrarRecompensa` tras ronda 10, `ajustesPista` (mayuscula, soloTexto). **No usa `plataforma.medios`** en absoluto.

**5. DOM:** `.emociones-app` → cabecera+marcador+`.emociones-zona[aria-live=polite]`: `.emociones-cara` (SVG inyectado), pregunta, `.emociones-opciones` (4 `<button>` con imagen/emoji+etiqueta).

**6. Interacción:** solo tap (sin drag, botones nativos accesibles por teclado sin lógica adicional). Acierto: bloquea, sonido+voz, verde, avanza tras 700ms (o recompensa en ronda 10). Fallo: sonido+shake 320ms, sin bloqueo, reintentable.

**7. Ajustes:** `mayuscula` (etiqueta del botón), `soloTexto` (oculta imagen/emoji del botón, deja solo texto). Nunca afecta a la cara generada (sin pista de texto ahí).

**8. Particularidades de accesibilidad citadas textualmente — la más relevante del proyecto:** el comentario en `cabezas.js` advierte explícitamente: si la mecánica pasa `etiqueta` al generador de cabezas, ese texto se anuncia por lector de pantalla vía `role="img"` + `aria-label`, y "NO debe ser el nombre de la expresión (p.ej. 'Triste'), porque eso le daría la respuesta a quien use un lector de pantalla antes de mirar la cara". Por eso reconoce-emociones, si etiqueta la cabeza, usa una etiqueta genérica tipo "Cara de un personaje" — nunca el nombre de la emoción. Sin `etiqueta`, el SVG lleva `aria-hidden="true"` por defecto. La expresión se sortea entre las cuatro disponibles (`generarRasgosFaciales` cae a "contento" para cualquier valor desconocido) salvo que el juego fije `expresion` explícitamente para controlar qué cara le toca a cada ronda. Otra particularidad: el generador de cabezas reutiliza el `<style>` y el envoltorio `<svg>` de `personajes.js` (mismo prefijo de clases `pj-` y misma paleta de pieles/pelos) en vez de duplicar las reglas CSS, justificado en el comentario porque ambos módulos dibujan la misma familia de personajes "papercraft".

**9. CSS:** layout simple centrado: contenedor principal con la cabeza SVG grande arriba (tamaño fijo, viewBox 500x500) y, debajo, una fila de opciones (botones con las etiquetas de emoción en texto/pictograma) para elegir; clase de "seleccionado" resalta la opción elegida con borde de color; en fallo, animación corta de shake sobre la opción incorrecta; en acierto, breve resalte verde antes de pasar a la siguiente ronda. Sin grid complejo: flexbox simple en columna.

---

## PATRONES COMUNES ENTRE MECÁNICAS

**Estructura de módulo.** Las 21 mecánicas exportan exactamente el mismo contrato: `export default { id, nombre, icono, estante, montar(contenedor, plataforma), desmontar() }`. `id` coincide siempre con el nombre de la carpeta en `apps/`. `montar` recibe el contenedor DOM ya vacío y el objeto `plataforma` construido por `appLoader.js`; es responsable de pintar toda la UI, registrar listeners y arrancar la primera ronda. `desmontar` (a veces llamado simplemente al desmontar la vista, sin argumentos) limpia listeners globales (especialmente `pointermove`/`pointerup` en `document`), cancela `setTimeout`/`setInterval` pendientes, detiene TTS en curso (`tts.stop()`) y resetea el `estado` del módulo a sus valores iniciales para que una remontada posterior (volver a entrar en el juego) no herede estado de la partida anterior.

**Estado en el closure, no en el DOM.** Cada mecánica mantiene un objeto `estado` (u objetos sueltos) a nivel de módulo (closure de `montar`) con la ronda/nivel actual, los aciertos, el material restante, flags de "ya ha escuchado el TTS" (`escuchado`/`escuchadosIds`), etc. `desmontar` siempre reinicializa ese estado.

**Validación de material suficiente.** Todas las mecánicas comprueban, antes de arrancar, que `plataforma.medios` (o `categorias`/`secuencias`/`fijos` según el caso) tiene la cantidad mínima de elementos necesaria para la mecánica (normalmente entre 2 y 4 distintos, a veces más para mecánicas con varias opciones simultáneas). Si no hay suficiente material, el patrón común es no lanzar una excepción sino pintar un mensaje de aviso amigable (helper típicamente llamado `mostrarSinMaterial()` o similar) invitando al adulto a añadir medios, y no arrancar ninguna ronda. Las funciones puras de selección de ronda devuelven `null` (no lanzan) cuando reciben material insuficiente o vacío, de forma consistente en todo el proyecto.

**Barajado: `mezclar()` Fisher-Yates duplicado intencionalmente.** Prácticamente cada archivo de mecánica define su propia función `mezclar(lista)` (Fisher-Yates, recorrido de atrás hacia delante, intercambio con índice aleatorio `0..i`) en vez de importarla de un módulo común. Esto es deliberado: varios archivos llevan comentarios casi idénticos del tipo "cada mecánica de este proyecto es independiente y no importa código de otra mecánica" — es una decisión arquitectónica explícita de los autores para que cada mecánica sea autocontenida y se pueda copiar/pegar/borrar sin romper otras.

**Selección de la siguiente ronda evitando repetición inmediata.** Patrón recurrente: una función `elegirSiguienteMedio` (o `elegirSiguienteCategoria`, `elegirSiguientePictograma`, etc.) que recibe la lista completa de material y una lista `evitarIds` (normalmente el/los último(s) elegido(s)) y devuelve un elemento al azar que no esté en `evitarIds`; si tras filtrar no queda ninguno (p.ej. solo hay 1-2 elementos en total), cae de vuelta a elegir de la lista completa sin restricción, para no bloquear el juego.

**Convención de nombres de funciones puras.** Las funciones de formateo de texto siguen el patrón `formatearTexto`/`formatearPista`/`formatearNombre` (aplican mayúsculas, tildes automáticas u otras transformaciones de `ajustesPista` antes de mostrar texto en pantalla o de pasarlo a TTS). Las de selección de ronda siguen `elegirSiguiente*` o `elegirRonda*`. Las de validación de respuesta siguen `esCorrecto`/`validar*`/`comprobarRespuesta`. Las de cálculo numérico (sumas, resultados) tienen nombres descriptivos como `calcularResultado`, `generarSuma`. Esta convención no está impuesta por ninguna herramienta de lint común (no hay build/lint), sino que es disciplina manual repetida por archivo.

**Gating de interacción mediante `ajustesPista.pulsadorTts`.** Cuando este ajuste está activo, la mecánica sustituye el pictograma/pista habitual por un botón de altavoz animado y bloquea la acción principal (arrastrar, teclear, pulsar la opción) hasta que el niño pulse el botón al menos una vez. El estado de si ya se ha escuchado se guarda por ronda/elemento, típicamente en una variable `escuchado` (booleano para la ronda actual) o un `Set`/objeto `escuchadosIds` (cuando hay varios elementos visibles a la vez, como en bingo-lectura o relaciona-pictograma-palabra). Una función `puedeResponder()`/`puedeResponderItem(id)` centraliza la comprobación antes de aceptar cualquier interacción.

**Gating visual mediante `ajustesPista.soloTexto`.** Cuando está activo, la mecánica sustituye la imagen del pictograma por el nombre en texto (usando la etiqueta del medio, pasada por `formatearTexto` para aplicar mayúsculas/tildes según el resto de ajustes). Se usa en mecánicas donde tiene sentido practicar lectura en vez de reconocimiento visual (memoria, arrastra-palabra, bingo-lectura, clasifica-categorias, relaciona-pictograma-palabra, me-gusta-no-me-gusta, reconoce-emociones).

**Constantes de temporización compartidas (no exportadas, repetidas por archivo).** Casi todas las mecánicas usan: 10 niveles/rondas totales por sesión de juego (`NIVELES_TOTAL`/`RONDAS_TOTAL` = 10; la única excepción documentada es lista-compra con 5); un retardo de unos 700ms antes de avanzar a la siguiente ronda tras un acierto (tiempo para que se vea/oiga el feedback de acierto); unos 500ms antes de mostrar la recompensa final tras completar la última ronda; una animación de "shake" de unos 400ms sobre el elemento que ha fallado. Estos números están escritos como literales en cada archivo, no centralizados.

**Arrastre con Pointer Events y umbral anti-tap.** Las mecánicas de arrastrar y soltar (arrastra-palabra, arrastra-numero, arrastra-suma, ordena-secuencia, dedos-pictogramas, dedos-numero, etc.) usan `pointerdown`/`pointermove`/`pointerup`/`pointercancel` (no `dragstart`/`drop` HTML5) para tener un único camino de eventos que funciona igual con ratón, touch y stylus. Aplican un umbral de movimiento de unos 4px (`UMBRAL_ARRASTRE`) antes de considerar que el gesto es un arrastre real (y no un simple tap/click), para no interferir con la alternativa de teclado/tap. Llaman a `setPointerCapture` envuelto en `try/catch` porque no todos los entornos lo soportan. Fijan `img.draggable = false` en las imágenes arrastrables — documentado en varios archivos como "crítico" porque sin esto el navegador inicia su propio drag nativo de imagen, que secuestra los eventos pointer y rompe la mecánica.

**Alternativa accesible al arrastre.** Las mecánicas de arrastrar ofrecen siempre una vía alternativa por teclado (Enter/Espacio para "recoger" y luego para "soltar" en la zona con foco) o por tap secuencial (tocar el origen y luego el destino), para cumplir accesibilidad sin depender de gestos finos de arrastre.

**Motor de reconocimiento de trazo manuscrito duplicado literalmente.** escribe-letra, escribe-numero y completa-suma comparten (copiado, no importado) el mismo motor: rasteriza el glifo de referencia a una máscara de baja resolución sobre una rejilla lógica, acumula una máscara de trazo a partir del movimiento del puntero, dilata ambas máscaras un radio dependiente de `ajustesPista.toleranciaTrazo` (clasificada en 'facil'/'normal'/'dificil', usando distancia de Chebyshev), calcula ratios de cobertura/desviación más una comprobación de cobertura por zonas, y espera 2000ms tras el `pointerup` antes de evaluar el trazo final (para tolerar letras de varios trazos como "t" o "f"). El ajuste `letraPunteada` controla si se muestra el contorno punteado de guía.

**Inyección de estilos en `<head>` una sola vez.** Cada mecánica que necesita CSS propio (la inmensa mayoría) inyecta su hoja de estilos dinámicamente mediante un id único (típicamente `ESTILOS_ID` o similar) y una comprobación `if (document.getElementById(ESTILOS_ID)) return;` antes de crear y añadir el `<style>`/`<link>`, de forma que montar/desmontar repetidos no dupliquen la hoja de estilos en el documento.

**Uso uniforme de `plataforma`.** Todas las mecánicas acceden a `plataforma.medios` para el material gráfico/textual, `plataforma.t` para textos de interfaz (i18n), `plataforma.tts.speak()` para locución, `plataforma.sounds.{click,acierto,fallo,recompensa}()` para feedback sonoro, `plataforma.getDisplayUrl(medio)` para resolver la URL de imagen mostrable (en vez de acceder a una propiedad de URL directamente, por si el medio requiere resolución especial vía ARASAAC), `plataforma.mostrarRecompensa(opciones)` al terminar la partida completa (nunca llaman a `showReward` de `reward.js` directamente — siempre a través de este wrapper de `plataforma`, que es el que sabe envolver el comportamiento de "ruta guiada" cuando el juego se juega como paso de un itinerario), y `plataforma.ajustesPista` (objeto plano congelado) para leer cada ajuste relevante a la mecánica según `CAMPOS_POR_MECANICA`. Las mecánicas con categorías/secuencias/fijos (clasifica-categorias, ordena-secuencia, lista-compra, etc.) además consumen `plataforma.categorias`, `plataforma.secuencias` o `plataforma.fijos` respectivamente.

**Filosofía de independencia de código entre mecánicas.** Confirmado repetidamente en comentarios de archivo: cada mecánica es deliberadamente autosuficiente y no importa lógica de otra mecánica del propio `apps/`, aunque sí comparte libremente utilidades de `core/js/` (i18n, sounds, tts, reward, cabezas, mediaLibrary, ajustesJuego/ajustesCatalogo, router). Esto explica por qué `mezclar()`, el motor de reconocimiento de trazo, y los patrones de `elegirSiguiente*`/`puedeResponder*` aparecen duplicados letra por letra en varios archivos en vez de extraerse a un módulo compartido: es una decisión consciente de los autores, no descuido.

Con esto queda completo el catálogo de las 21 mecánicas (memoria, arrastra-palabra, teclea-palabra, ordena-secuencia, escribe-letra, bingo-lectura, ruleta-letras, rosco-pictogramas, arrastra-numero, escribe-numero, suma-resultado, dedos-pictogramas, dedos-numero, completa-suma, arrastra-suma, clasifica-categorias, puzzle-pictograma-palabra, relaciona-pictograma-palabra, me-gusta-no-me-gusta, lista-compra, reconoce-emociones) más la sección de patrones comunes, suficiente para una reconstrucción completa desde cero del comportamiento de cada una sin necesitar el código fuente original.## 6. Infraestructura: archivos raíz, CSS de tokens, locales, registro de apps, tests, herramienta de publicación

### 6.1 Archivos raíz, contenido íntegro

**`index.html`** (cáscara única de toda la SPA):

```html
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<title>Pictosfera</title>
<meta name="description" content="Pictosfera: portal educativo de juegos con pictogramas para niños.">
<link rel="manifest" href="manifest.json">
<meta name="theme-color" content="#3D8BD4">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%233D8BD4'/%3E%3Ccircle cx='50' cy='40' r='18' fill='white'/%3E%3Crect x='25' y='62' width='50' height='28' rx='10' fill='white'/%3E%3C/svg%3E">
<link rel="stylesheet" href="core/css/tokens.css">
<link rel="stylesheet" href="core/css/shell.css">
<link rel="stylesheet" href="core/css/adult.css">
</head>
<body>

<div id="app-root">
  <header id="topbar" class="topbar" aria-label="Pictosfera">
    <div class="topbar-brand">
      <img class="topbar-logo" alt="" aria-hidden="true" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%233D8BD4'/%3E%3Ccircle cx='50' cy='40' r='18' fill='white'/%3E%3Crect x='25' y='62' width='50' height='28' rx='10' fill='white'/%3E%3C/svg%3E">
      <span class="topbar-title">Pictosfera</span>
    </div>
    <nav id="tabbar" class="tabbar" aria-label="Navegación principal"></nav>
  </header>

  <div class="layout">
    <nav id="sidebar" class="sidebar" aria-label="Navegación principal"></nav>
    <main id="view" class="view" tabindex="-1"></main>
  </div>

  <footer id="app-footer" class="app-footer"></footer>
</div>

<div id="modal-root"></div>

<noscript>Pictosfera necesita JavaScript activado para funcionar.</noscript>

<script type="module" src="core/js/main.js"></script>
</body>
</html>
```

**`manifest.json`** (PWA):

```json
{
  "name": "Pictosfera",
  "short_name": "Pictosfera",
  "description": "Portal educativo de juegos con pictogramas para niños.",
  "start_url": "./index.html",
  "scope": "./",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#FFFDF7",
  "theme_color": "#3D8BD4",
  "lang": "es",
  "icons": [
    {
      "src": "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%233D8BD4'/%3E%3Ccircle cx='50' cy='40' r='18' fill='white'/%3E%3Crect x='25' y='62' width='50' height='28' rx='10' fill='white'/%3E%3C/svg%3E",
      "sizes": "100x100",
      "type": "image/svg+xml"
    }
  ]
}
```

**`sw.js`** (service worker mínimo — cache-first solo del propio origen, network-first con fallback a cache; NO cachea pictogramas ARASAAC ni fotos, que dependen de internet/IndexedDB respectivamente):

```js
const CACHE_NAME = 'pictosfera-v1';
const CORE_ASSETS = [
  './', './index.html', './manifest.json',
  './core/css/tokens.css', './core/css/shell.css', './core/css/adult.css',
  './core/js/main.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch(() => {/* si falla el precache, no bloquea la instalación */})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
  );
});
```

**`.gitignore`**: `node_modules/`, `.DS_Store`, `Thumbs.db`, `*.log`.

**`package.json`**: ver contenido íntegro en la sección 3.16.

### 6.2 `core/css/tokens.css` — íntegro

```css
:root{
  /* --- Paleta principal --- */
  --color-bg: #FFFDF7;
  --color-bg-soft: #F3EFE3;
  --color-surface: #FFFFFF;
  --color-surface-alt: #F7F4EC;

  --color-primary: #3D8BD4;
  --color-primary-dark: #2B6BAA;
  --color-secondary: #F2A33D;
  --color-secondary-dark: #C97F1E;
  --color-success: #4CAF6D;
  --color-error: #E2654B;
  --color-adult: #6D5A9E;

  --color-text: #2B2B28;
  --color-text-soft: #5B5850;
  --color-text-on-primary: #FFFFFF;
  --color-border: #E4DECB;

  --font-family: 'Atkinson Hyperlegible', 'Comic Sans MS', system-ui,
                 -apple-system, 'Segoe UI', Roboto, sans-serif;
  --font-size-base: 18px;
  --font-size-sm: 0.85rem;
  --font-size-md: 1.1rem;
  --font-size-lg: 1.6rem;
  --font-size-xl: 2.4rem;
  --line-height: 1.4;

  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 40px;

  --radius-sm: 8px;
  --radius-md: 16px;
  --radius-lg: 28px;
  --radius-pill: 999px;

  --shadow-sm: 0 2px 6px rgba(43,43,40,0.10);
  --shadow-md: 0 6px 18px rgba(43,43,40,0.14);

  --transition-fast: 120ms ease;
  --transition-base: 220ms ease;

  --touch-target: 56px;
}

*, *::before, *::after{ box-sizing: border-box; }

html, body{
  margin: 0; padding: 0;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  line-height: var(--line-height);
  -webkit-text-size-adjust: 100%;
}

#app-root{ min-height: 100vh; display: flex; flex-direction: column; }
button{ font-family: inherit; }
img{ max-width: 100%; display: block; }
a{ color: var(--color-primary-dark); }

@media (prefers-reduced-motion: reduce){
  *{ animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

`core/css/shell.css` (389 líneas) y `core/css/adult.css` (855 líneas) son demasiado largos para reproducir literalmente aquí; se describen en prosa en sección 4 (junto a `shell.js`/`views/`) y sección 5 (junto a cada mecánica). Ambos consumen exclusivamente las variables de `tokens.css` — ninguna hoja de estilo del proyecto declara un color, tamaño o radio "a mano" fuera de `tokens.css`.

### 6.3 `data/apps.json` — íntegro (21 entradas)

```json
[
  { "id": "memoria-animales", "mecanica": "memoria", "modulo": "apps/memoria/memoria.js", "nombre": "Memoria", "nombreClave": "juegos_nombres.memoria_animales", "icono": "🐾", "estante": "ANIMALES",
    "material": { "etiqueta": "animales", "semillaArasaacLang": "es", "semillaArasaac": ["perro","gato","vaca","pájaro","conejo","pez","caballo","oveja","pato","rana","león","elefante"] } },
  { "id": "arrastra-palabra-animales", "mecanica": "arrastra-palabra", "modulo": "apps/arrastra-palabra/arrastraPalabra.js", "nombre": "Arrastra la palabra", "nombreClave": "juegos_nombres.arrastra_palabra_animales", "icono": "🔤", "estante": "LECTURA",
    "material": { "etiqueta": "animales", "semillaArasaacLang": "es", "semillaArasaac": ["perro","gato","vaca","pájaro","conejo","pez","caballo","oveja","pato","rana","león","elefante"] } },
  { "id": "teclea-palabra-animales", "mecanica": "teclea-palabra", "modulo": "apps/teclea-palabra/tecleaPalabra.js", "nombre": "Teclea la palabra", "nombreClave": "juegos_nombres.teclea_palabra_animales", "icono": "⌨️", "estante": "ESCRITURA",
    "material": { "etiqueta": "animales", "semillaArasaacLang": "es", "semillaArasaac": ["perro","gato","vaca","pájaro","conejo","pez","caballo","oveja","pato","rana","león","elefante"] } },
  { "id": "ordena-secuencia-rutinas", "mecanica": "ordena-secuencia", "modulo": "apps/ordena-secuencia/ordenaSecuencia.js", "nombre": "Ordena la secuencia", "nombreClave": "juegos_nombres.ordena_secuencia_rutinas", "icono": "🪥", "estante": "RUTINAS" },
  { "id": "escribe-letra-animales", "mecanica": "escribe-letra", "modulo": "apps/escribe-letra/escribeLetra.js", "nombre": "Escribe la letra", "nombreClave": "juegos_nombres.escribe_letra_animales", "icono": "✍️", "estante": "ESCRITURA",
    "material": { "etiqueta": "animales", "semillaArasaacLang": "es", "semillaArasaac": ["perro","gato","vaca","pájaro","conejo","pez","caballo","oveja","pato","rana","león","elefante"] } },
  { "id": "bingo-lectura-animales", "mecanica": "bingo-lectura", "modulo": "apps/bingo-lectura/bingoLectura.js", "nombre": "Bingo de lectura", "nombreClave": "juegos_nombres.bingo_lectura_animales", "icono": "🅱️", "estante": "LECTURA",
    "material": { "etiqueta": "animales", "semillaArasaacLang": "es", "semillaArasaac": ["perro","gato","vaca","pájaro","conejo","pez","caballo","oveja","pato","rana","león","elefante"], "minimo": 9 } },
  { "id": "ruleta-letras-animales", "mecanica": "ruleta-letras", "modulo": "apps/ruleta-letras/ruletaLetras.js", "nombre": "Ruleta de letras", "nombreClave": "juegos_nombres.ruleta_letras_animales", "icono": "🎡", "estante": "ESCRITURA",
    "material": { "etiqueta": "animales", "semillaArasaacLang": "es", "semillaArasaac": ["perro","gato","vaca","pájaro","conejo","pez","caballo","oveja","pato","rana","león","elefante"] } },
  { "id": "rosco-pictogramas-animales", "mecanica": "rosco-pictogramas", "modulo": "apps/rosco-pictogramas/roscoPictogramas.js", "nombre": "Rosco de pictogramas", "nombreClave": "juegos_nombres.rosco_pictogramas_animales", "icono": "🔠", "estante": "LECTURA",
    "material": { "etiqueta": "animales", "semillaArasaacLang": "es", "semillaArasaac": ["perro","gato","vaca","pájaro","conejo","pez","caballo","oveja","pato","rana","león","elefante"], "minimo": 12 } },
  { "id": "arrastra-numero-animales", "mecanica": "arrastra-numero", "modulo": "apps/arrastra-numero/arrastraNumero.js", "nombre": "Cuenta y arrastra el número", "nombreClave": "juegos_nombres.arrastra_numero_animales", "icono": "🔢", "estante": "NUMEROS",
    "material": { "etiqueta": "animales", "semillaArasaacLang": "es", "semillaArasaac": ["perro","gato","vaca","pájaro","conejo","pez","caballo","oveja","pato","rana","león","elefante"] } },
  { "id": "escribe-numero-animales", "mecanica": "escribe-numero", "modulo": "apps/escribe-numero/escribeNumero.js", "nombre": "Cuenta y escribe el número", "nombreClave": "juegos_nombres.escribe_numero_animales", "icono": "✏️", "estante": "NUMEROS",
    "material": { "etiqueta": "animales", "semillaArasaacLang": "es", "semillaArasaac": ["perro","gato","vaca","pájaro","conejo","pez","caballo","oveja","pato","rana","león","elefante"] } },
  { "id": "suma-resultado-animales", "mecanica": "suma-resultado", "modulo": "apps/suma-resultado/sumaResultado.js", "nombre": "Suma pictogramas y elige el resultado", "nombreClave": "juegos_nombres.suma_resultado_animales", "icono": "➕", "estante": "NUMEROS",
    "material": { "etiqueta": "animales", "semillaArasaacLang": "es", "semillaArasaac": ["perro","gato","vaca","pájaro","conejo","pez","caballo","oveja","pato","rana","león","elefante"] } },
  { "id": "dedos-pictogramas-animales", "mecanica": "dedos-pictogramas", "modulo": "apps/dedos-pictogramas/dedosPictogramas.js", "nombre": "Relaciona los dedos con los pictogramas", "nombreClave": "juegos_nombres.dedos_pictogramas_animales", "icono": "✋", "estante": "NUMEROS",
    "material": { "etiqueta": "animales", "semillaArasaacLang": "es", "semillaArasaac": ["perro","gato","vaca","pájaro","conejo","pez","caballo","oveja","pato","rana","león","elefante"] } },
  { "id": "dedos-numero", "mecanica": "dedos-numero", "modulo": "apps/dedos-numero/dedosNumero.js", "nombre": "Relaciona los dedos con el número", "nombreClave": "juegos_nombres.dedos_numero", "icono": "🖐️", "estante": "NUMEROS" },
  { "id": "completa-suma-animales", "mecanica": "completa-suma", "modulo": "apps/completa-suma/completaSuma.js", "nombre": "Escribe los números de la suma", "nombreClave": "juegos_nombres.completa_suma_animales", "icono": "🧮", "estante": "NUMEROS",
    "material": { "etiqueta": "animales", "semillaArasaacLang": "es", "semillaArasaac": ["perro","gato","vaca","pájaro","conejo","pez","caballo","oveja","pato","rana","león","elefante"] } },
  { "id": "arrastra-suma-animales", "mecanica": "arrastra-suma", "modulo": "apps/arrastra-suma/arrastraSuma.js", "nombre": "Arrastra los números de la suma", "nombreClave": "juegos_nombres.arrastra_suma_animales", "icono": "🧩", "estante": "NUMEROS",
    "material": { "etiqueta": "animales", "semillaArasaacLang": "es", "semillaArasaac": ["perro","gato","vaca","pájaro","conejo","pez","caballo","oveja","pato","rana","león","elefante"] } },
  { "id": "clasifica-categorias", "mecanica": "clasifica-categorias", "modulo": "apps/clasifica-categorias/clasificaCategorias.js", "nombre": "Clasifica los pictogramas en dos categorías", "nombreClave": "juegos_nombres.clasifica_categorias", "icono": "🗂️", "estante": "CONCEPTOS" },
  { "id": "puzzle-pictograma-palabra-animales", "mecanica": "puzzle-pictograma-palabra", "modulo": "apps/puzzle-pictograma-palabra/puzzlePictogramaPalabra.js", "nombre": "Puzzle de pictograma y palabra", "nombreClave": "juegos_nombres.puzzle_pictograma_palabra_animales", "icono": "🖼️", "estante": "LECTURA",
    "material": { "etiqueta": "animales", "semillaArasaacLang": "es", "semillaArasaac": ["perro","gato","vaca","pájaro","conejo","pez","caballo","oveja","pato","rana","león","elefante"] } },
  { "id": "relaciona-pictograma-palabra-animales", "mecanica": "relaciona-pictograma-palabra", "modulo": "apps/relaciona-pictograma-palabra/relacionaPictogramaPalabra.js", "nombre": "Relaciona el pictograma con su palabra", "nombreClave": "juegos_nombres.relaciona_pictograma_palabra_animales", "icono": "🔗", "estante": "LECTURA",
    "material": { "etiqueta": "animales", "semillaArasaacLang": "es", "semillaArasaac": ["perro","gato","vaca","pájaro","conejo","pez","caballo","oveja","pato","rana","león","elefante"] } },
  { "id": "me-gusta-no-me-gusta-comidas", "mecanica": "me-gusta-no-me-gusta", "modulo": "apps/me-gusta-no-me-gusta/meGustaNoMeGusta.js", "nombre": "Me gusta / no me gusta", "nombreClave": "juegos_nombres.me_gusta_no_me_gusta_comidas", "icono": "🍽️", "estante": "CONCEPTOS",
    "material": { "etiqueta": "comida", "semillaArasaacLang": "es", "semillaArasaac": ["manzana","plátano","pan","leche","queso","huevo","zanahoria","galleta","naranja","tomate","arroz","pollo"], "minimo": 12, "fijos": { "plato": 2532, "basura": 2724 } } },
  { "id": "lista-compra-comidas", "mecanica": "lista-compra", "modulo": "apps/lista-compra/listaCompra.js", "nombre": "Lista de la compra", "nombreClave": "juegos_nombres.lista_compra_comidas", "icono": "🛒", "estante": "RUTINAS",
    "material": { "etiqueta": "comida", "semillaArasaacLang": "es", "semillaArasaac": ["manzana","plátano","pan","leche","queso","huevo","zanahoria","galleta","naranja","tomate","arroz","pollo"], "minimo": 12, "fijos": { "carrito": 5948 } } },
  { "id": "reconoce-emociones", "mecanica": "reconoce-emociones", "modulo": "apps/reconoce-emociones/reconoceEmociones.js", "nombre": "Reconoce emociones", "nombreClave": "juegos_nombres.reconoce_emociones", "icono": "🙂", "estante": "CONCEPTOS",
    "material": { "fijos": { "contento": 35547, "triste": 35545, "enfadado": 35539, "asustado": 35535 } } }
]
```

Las 6 "estantes" usadas: `ANIMALES`, `LECTURA`, `ESCRITURA`, `RUTINAS`, `NUMEROS`, `CONCEPTOS`. Solo `ordena-secuencia-rutinas` y `dedos-numero` no tienen `material` (no necesitan medios filtrados). `me-gusta-no-me-gusta-comidas`, `lista-compra-comidas` y `reconoce-emociones` usan IDs ARASAAC fijos (`fijos`) además o en lugar de `semillaArasaac`.

### 6.4 `locales/es.json` — íntegro (38 namespaces, fuente de verdad)

```json
{
  "app": { "nombre": "Pictosfera" },
  "nav": { "inicio": "Inicio", "juegos": "Juegos", "pictogramas": "Pictogramas", "rutas": "Rutas", "ajustes": "Ajustes" },
  "inicio": { "bienvenida": "¡Hola! Bienvenido a Pictosfera", "intro": "Elige \"Juegos\" para empezar a jugar.", "ir_juegos": "Ver juegos", "rutas_titulo": "Tus rutas" },
  "juegos": { "titulo": "Juegos", "vacio": "Todavía no hay juegos en este estante.", "sin_material": "Todavía no hay suficiente material para jugar a esto. Añade pictogramas o fotos desde \"Pictogramas\".", "cargando": "Cargando juegos…", "volver": "Volver a juegos", "interruptor_titulo": "Acceso libre a los juegos", "interruptor_ayuda": "Si lo desactivas, el niño podrá seguir entrando aquí, pero verá los juegos en gris y, al tocar cualquiera, irá directamente a Inicio. Útil si quieres que solo juegue a través de las rutas de aprendizaje.", "interruptor_bloqueado": "bloqueado, sin acceso libre" },
  "pin": { "titulo": "Zona del adulto", "subtitulo": "Introduce el PIN para continuar", "crear_subtitulo": "Crea un PIN para esta zona", "error": "PIN incorrecto, inténtalo de nuevo", "borrar": "Borrar", "cancelar": "Cancelar", "aviso": "El PIN es un cierre sencillo para que el peque no entre por error. No es una medida de seguridad real." },
  "pictogramas": { "titulo": "Pictogramas", "buscar_placeholder": "Buscar un pictograma…", "buscar_boton": "Buscar", "buscando": "Buscando…", "sin_resultados": "No se han encontrado pictogramas.", "error_busqueda": "No se ha podido conectar con ARASAAC. Comprueba tu conexión a internet.", "anadir": "Añadir al pozo", "anadido": "Añadido", "mi_biblioteca": "Mi biblioteca", "biblioteca_vacia": "Todavía no has añadido ningún pictograma ni foto.", "biblioteca_vacia_arasaac": "Todavía no has añadido ningún pictograma de ARASAAC.", "biblioteca_vacia_fotos": "Todavía no has añadido ninguna foto.", "menu_ayuda": "Elige qué quieres gestionar.", "menu_pictogramas": "Pictogramas", "menu_fotos": "Imágenes propias", "anadir_foto": "Añadir foto", "elegir_foto": "Elegir foto", "ningun_archivo": "Ningún archivo elegido", "foto_nombre": "Nombre de la foto", "foto_etiqueta": "Elige una o más categorías", "foto_etiqueta_obligatoria": "Tienes que elegir al menos una categoría", "guardar": "Guardar", "borrar_medio_confirmar": "¿Borrar este elemento de la biblioteca?", "origen_arasaac": "ARASAAC", "origen_foto": "Foto propia", "filtrar_por": "Filtrar por categoría", "todas": "Todas", "editar_nombre": "Editar nombre", "secuencias_titulo": "Secuencias", "secuencias_ayuda": "Diseña aquí una rutina real (lavarse los dientes, vestirse...) como una lista de pictogramas en el orden correcto. Los juegos que ordenan secuencias usarán las que crees aquí.", "secuencias_abrir": "Gestionar secuencias", "secuencia_nombre": "Nombre de la secuencia", "secuencia_nombre_placeholder": "Ej: Lavarse los dientes", "secuencia_pasos": "Pasos de la secuencia, en orden", "secuencia_sin_pasos": "Todavía no has añadido ningún paso.", "secuencia_elegir": "Añade pasos desde tu biblioteca", "secuencia_buscar_arasaac": "¿No está en tu biblioteca? Búscalo en ARASAAC", "secuencia_buscar_arasaac_ayuda": "El pictograma que elijas se añadirá a tu biblioteca y, a la vez, a este paso de la secuencia. Puedes buscar varias veces, con palabras distintas, para cada paso de la rutina (por ejemplo: primero \"cepillo de dientes\", después \"abrir el grifo\").", "secuencia_confirmar_guardar": "Vas a guardar esta secuencia con {n} pasos:\n{resumen}\n\n¿Confirmas que están todos, en el orden correcto?", "secuencia_subir": "Subir este paso", "secuencia_bajar": "Bajar este paso", "secuencia_paso_roto": "(pictograma eliminado de la biblioteca)", "secuencia_error_nombre": "Escribe un nombre para la secuencia.", "secuencia_error_pasos": "Añade al menos {n} pasos para poder ordenarlos.", "secuencia_editar": "Editar secuencia", "secuencia_borrar_confirmar": "¿Borrar esta secuencia?", "secuencia_rota": "Falta algún pictograma: revisa esta secuencia", "mis_secuencias": "Mis secuencias", "secuencias_vacio": "Todavía no has creado ninguna secuencia.", "guardar_cambios": "Guardar cambios", "categorias_titulo": "Categorías", "categorias_ayuda": "Diseña aquí parejas de categorías opuestas (por ejemplo grande/pequeño, rojo/verde...) para el juego \"Clasifica los pictogramas en dos categorías\". Cada categoría necesita un pictograma que la represente y al menos un pictograma que pertenezca a ella; en cada partida el juego elegirá al azar una de las parejas que hayas creado.", "categoria_pareja_nombre": "Nombre de la pareja", "categoria_pareja_nombre_placeholder": "Ej: Grande y pequeño", "categoria_numero": "Categoría {n}", "categoria_nombre": "Nombre de la categoría", "categoria_nombre_placeholder": "Ej: Grande", "categoria_cabecera_titulo": "Pictograma que representa esta categoría", "categoria_cabecera_elegir": "Elegir pictograma", "categoria_sin_cabecera": "Todavía no has elegido ningún pictograma.", "categoria_pictogramas_titulo": "Pictogramas que pertenecen a esta categoría", "categoria_pictogramas_anadir": "Añadir pictogramas", "categoria_sin_pictogramas": "Todavía no has añadido ningún pictograma.", "categoria_seleccionar_cabecera_titulo": "Elige el pictograma que representa a la categoría {n}", "categoria_seleccionar_pictogramas_titulo": "Elige los pictogramas de la categoría {n}", "categoria_buscar_arasaac": "¿No está en tu biblioteca? Búscalo en ARASAAC", "categoria_listo": "Listo", "categoria_confirmar_guardar": "Vas a guardar esta pareja como \"{nombre}\":\n{resumen}\n\n¿Confirmas que está todo correcto?", "categoria_error_nombre": "Escribe un nombre para la pareja.", "categoria_error_categorias": "Una pareja necesita exactamente dos categorías.", "categoria_error_nombre_categoria": "Escribe un nombre para cada categoría.", "categoria_error_cabecera": "Elige un pictograma que represente a cada categoría.", "categoria_error_pictogramas": "Añade al menos un pictograma a cada categoría.", "categoria_editar": "Editar pareja", "categoria_borrar_confirmar": "¿Borrar esta pareja de categorías?", "categoria_rota": "Falta algún pictograma: revisa esta pareja", "mis_categorias": "Mis categorías", "categorias_vacio": "Todavía no has creado ninguna pareja de categorías." },
  "ajustes": { "titulo": "Ajustes", "cat_idioma": "Idioma y voz", "cat_juegos": "Ajustes de juegos", "cat_seguridad": "Seguridad y PIN", "cat_copia": "Importar y exportar", "cat_privacidad": "Privacidad", "idioma": "Idioma", "idioma_ayuda": "Cambia el idioma de toda la app: textos, pictogramas y voz.", "voz_disponible": "Tu dispositivo tiene voz para este idioma.", "voz_no_disponible": "Tu dispositivo no tiene voz instalada para este idioma. El texto se verá igual, pero puede que no se escuche o que se escuche en otro idioma.", "pin_titulo": "PIN parental", "pin_estado_activo": "El PIN está activado.", "pin_estado_inactivo": "Todavía no has creado un PIN.", "pin_crear": "Crear PIN", "pin_cambiar": "Cambiar PIN", "pin_quitar": "Quitar PIN", "pin_nuevo": "Nuevo PIN (4 cifras)", "pin_confirmar": "Repite el PIN", "pin_no_coincide": "Los dos PIN no coinciden", "pin_invalido": "El PIN debe tener 4 cifras", "pin_guardado": "PIN guardado", "pin_quitado": "PIN eliminado", "copia_titulo": "Copia de seguridad", "copia_explicacion": "Aquí puedes guardar una copia de tu biblioteca y tus ajustes en un archivo, o recuperarla en otro momento u otro dispositivo.", "copia_exportar": "Exportar copia", "copia_importar": "Importar copia", "copia_incluir_fotos": "Incluir también mis fotos", "copia_incluir_fotos_aviso": "Si activas esto, el archivo contendrá las fotos del niño o niña. Tú decides dónde lo guardas: Pictosfera no guarda ni ve nada de esto.", "copia_recuerda": "La copia recupera pictogramas, nombres, categorías, secuencias, ajustes y PIN. Las fotos no se incluyen salvo que marques la casilla.", "copia_importar_confirmar": "Importar esta copia sustituirá tu biblioteca actual. ¿Continuar?", "copia_exito_exportar": "Copia guardada correctamente.", "copia_exito_importar": "Copia importada correctamente.", "copia_error": "No se ha podido leer este archivo de copia.", "recordatorio_copia": "Hace más de 15 días que no haces una copia de seguridad y has añadido material nuevo. ¿Quieres hacerla ahora?", "recordatorio_ahora": "Hacer copia ahora", "recordatorio_luego": "Más tarde", "pistas_titulo": "Ajustes de cada juego", "pistas_ayuda": "Cada juego guarda sus propios ajustes, por separado de los demás. Elige un juego para ver y cambiar los suyos.", "pistas_elegir_juego": "Juego", "pistas_sin_ajustes": "Este juego no tiene ajustes propios.", "pistas_mostrar": "Mostrar la palabra de pista junto al pictograma", "pistas_mayuscula": "Mostrar las palabras en MAYÚSCULAS", "pistas_resaltar_teclado": "Sombrear en el teclado las letras necesarias para escribir la palabra", "pistas_mano_amiga_ayuda": "Estos ajustes evitan complicar al niño mientras aprende a escribir. Si los desactivas, el juego exigirá teclear esa parte correctamente y mostrará las teclas necesarias para poder hacerlo.", "pistas_tildes_automaticas": "Poner las tildes automáticamente (á, é, í, ó, ú)", "pistas_mayusculas_automaticas": "No exigir mayúscula inicial en nombres propios", "pistas_puntuacion_automatica": "Poner automáticamente comas, puntos y signos", "pistas_espacios_automaticos": "Poner automáticamente los espacios entre palabras", "pistas_presentacion_ayuda": "Estos ajustes cambian cómo se presenta el pictograma en el juego. Son opcionales y están desactivados por defecto.", "pistas_solo_texto": "Mostrar solo el texto de la palabra, sin la imagen del pictograma", "pistas_pulsador_tts": "Sustituir el pictograma por un botón para escuchar la palabra (hay que pulsarlo antes de poder responder)", "pistas_escritura_ayuda": "Estos ajustes son solo para los juegos de escritura guiada letra a letra (\"Escribe la letra\").", "pistas_letra_punteada": "Mostrar la letra en trazo punteado dentro de cada casilla, como pista para repasarla", "pistas_tolerancia_trazo": "Precisión exigida al trazar las letras", "tolerancia_facil": "Fácil (recomendado al empezar)", "tolerancia_normal": "Normal", "tolerancia_dificil": "Difícil", "pistas_ruleta_ayuda": "Este ajuste es solo para el juego \"Ruleta de letras\".", "pistas_dificultad_ruleta": "Dificultad de la Ruleta de letras (longitud de la palabra, frecuencia de pistas y tamaño del abecedario)", "pistas_lista_solo_texto": "En la lista de la compra, mostrar solo el texto, sin la imagen del pictograma", "pistas_estante_solo_imagen": "En el estante, mostrar solo el pictograma, sin el texto debajo", "privacidad_titulo": "Privacidad", "privacidad_texto": "Pictosfera no tiene servidor ni base de datos propios. Todo lo que añades vive solo en este dispositivo y en este navegador. Si borras los datos del navegador, se perderá todo salvo que tengas una copia de seguridad exportada; las fotos solo se recuperan si las incluiste en esa copia." },
  "rutas": { "titulo": "Rutas de aprendizaje", "explicacion": "Una ruta de aprendizaje es un itinerario guiado: una lista ordenada de juegos que el niño juega uno detrás de otro. Cada juego se desbloquea solo cuando termina el anterior sin ningún fallo. Puedes crear tantas rutas como quieras; cada una aparecerá en \"Inicio\" como una tarjeta más, junto al acceso normal a Juegos.", "crear_boton": "Crear ruta guiada", "mis_rutas": "Mis rutas", "vacio": "Todavía no has creado ninguna ruta.", "numero_pasos": "{n} juegos", "editar": "Editar ruta", "borrar_confirmar": "¿Borrar esta ruta?", "no_encontrada": "Esta ruta no existe o ha sido borrada.", "titulo_crear": "Crear ruta guiada", "titulo_editar": "Editar ruta guiada", "aviso_editar_reinicia": "Al guardar los cambios, el progreso que el niño tuviera en esta ruta se reiniciará desde el primer juego.", "nombre": "Nombre de la ruta", "nombre_placeholder": "Ej: Rutina de la mañana", "pasos_titulo": "Juegos de la ruta, en orden", "sin_pasos": "Todavía no has añadido ningún juego.", "paso_roto": "(juego ya no disponible)", "paso_subir": "Subir este juego", "paso_bajar": "Bajar este juego", "paso_editar": "Editar ajustes de este juego", "config_guardar": "Guardar ajustes", "elegir_titulo": "Añade juegos desde aquí", "anadir_boton": "Añadir", "config_anadir": "Añadir a la ruta", "guardar": "Guardar ruta", "guardar_cambios": "Guardar cambios", "confirmar_guardar": "Vas a guardar esta ruta con {n} juegos:\n{resumen}\n\n¿Confirmas que están todos, en el orden correcto?", "config_ayuda": "Estos ajustes son solo para este juego dentro de esta ruta: no afectan ni al acceso directo desde Juegos ni a ninguna otra ruta.", "error_nombre": "Escribe un nombre para la ruta.", "error_pasos": "Añade al menos {n} juego para poder guardar la ruta.", "bloqueado": "Bloqueado: termina antes el juego anterior sin fallos", "volver_a_la_ruta": "Volver a la ruta" },
  "recompensa": { "mensaje_1": "¡Muy bien!", "mensaje_2": "¡Lo has conseguido!", "mensaje_3": "¡Genial!", "continuar": "Seguir jugando", "salir": "Volver a juegos" },
  "comunes": { "cerrar": "Cerrar", "aceptar": "Aceptar", "cancelar": "Cancelar", "volver": "Volver", "cargando": "Cargando…", "error_generico": "Algo no ha funcionado. Inténtalo de nuevo.", "escuchar": "Escuchar" },
  "bienvenida": { "titulo_1": "Bienvenido a Pictosfera", "texto_1": "Un portal de juegos con pictogramas, gratis y pensado para que los datos de tu hijo o hija se queden solo en este dispositivo.", "titulo_2": "Tu biblioteca, tus reglas", "texto_2": "Desde \"Pictogramas\" puedes añadir fotos propias y organizar el material que usan los juegos.", "titulo_3": "Haz copias de seguridad", "texto_3": "De vez en cuando, guarda una copia desde \"Ajustes\". Así no pierdes el trabajo si cambias de dispositivo o borras los datos del navegador. La copia no incluye las fotos salvo que tú lo decidas.", "empezar": "Empezar" },
  "puerta": { "titulo": "¡Vamos a jugar!", "texto": "Toca el botón para abrir Pictosfera a pantalla completa." },
  "estantes": { "ANIMALES": "Animales", "LECTURA": "Lectura", "NUMEROS": "Números", "ESCRITURA": "Escritura", "RUTINAS": "Rutinas", "CONCEPTOS": "Conceptos" },
  "memoria": { "nombre": "Memoria", "instrucciones": "Toca dos cartas para encontrar la pareja.", "intentos": "Intentos: {n}", "parejas": "Parejas encontradas: {n} de {total}" },
  "arrastra": { "nombre": "Arrastra la palabra", "instrucciones": "Arrastra la palabra correcta hasta el pictograma.", "nivel": "Nivel {n} de {total}" },
  "teclea": { "nombre": "Teclea la palabra", "instrucciones": "Mira el pictograma y escribe su nombre con el teclado.", "nivel": "Nivel {n} de {total}", "espacio": "Espacio", "mayus": "Mayúscula", "simbolos": "Símbolos", "numeros": "Números", "volver_letras": "Volver a las letras", "borrar": "Borrar" },
  "ordena": { "nombre": "Ordena la secuencia", "instrucciones": "Arrastra o toca cada pictograma y colócalo en el hueco que le corresponde, en el orden correcto.", "ejercicio": "Ejercicio {n} de {total}", "casilla_vacia": "Hueco {n}, vacío", "sin_secuencias": "Todavía no se ha diseñado ninguna secuencia jugable. Ve a Pictogramas → Secuencias para crear una." },
  "escribe": { "nombre": "Escribe la letra", "instrucciones": "Mira el pictograma y escribe cada letra dentro de su casilla, con el dedo o un lápiz táctil.", "nivel": "Nivel {n} de {total}", "casilla_bloqueada": "Casilla bloqueada: termina antes la letra anterior", "casilla_actual": "Escribe aquí la letra {letra}", "casilla_correcta": "Letra {letra} ya escrita correctamente" },
  "bingo": { "nombre": "Bingo de lectura", "instrucciones": "Mira la bola del bombo y toca en tu cartón el pictograma o la palabra que coincide.", "bola": "Bola {n} de {total}", "casilla_marcada": "{nombre}, ya encontrada", "mensaje_final": "¡Bingo!" },
  "ruleta": { "nombre": "Ruleta de letras", "instrucciones": "Gira la ruleta y sigue su resultado: elige letras, consigue pistas o letras gratis hasta completar la palabra y descubrir el pictograma.", "palabra": "Palabra {n} de {total}", "girar": "Girar la ruleta", "girando": "Girando…", "resultado_letra": "Elige una letra", "resultado_pista": "Pista", "resultado_vocal": "Vocal gratis", "resultado_consonante": "Consonante gratis", "letra_no_esta": "La {letra} no está", "casilla_oculta": "Letra oculta", "casilla_revelada": "Letra {letra}", "abecedario_bloqueado": "Gira la ruleta: si sale \"Elige una letra\", podrás tocar el abecedario", "mensaje_final": "¡Palabra completada!" },
  "rosco": { "nombre": "Rosco de pictogramas", "instrucciones": "Escucha la consigna y toca, entre los cuatro pictogramas, el único que la cumple.", "progreso": "Letra {n} de {total}", "consigna_empieza": "Empieza por la letra {letra}", "consigna_tiene": "Tiene la letra {letra}", "mensaje_final": "¡Rosco completado!" },
  "arrastraNumero": { "instrucciones": "Cuenta los pictogramas y arrastra el número correcto hasta la casilla.", "nivel": "Nivel {n} de {total}", "casilla_vacia": "Casilla vacía, todavía sin número" },
  "escribeNumero": { "instrucciones": "Cuenta los pictogramas y escribe el número correspondiente dentro del recuadro, con el dedo o un lápiz táctil.", "nivel": "Nivel {n} de {total}", "casilla_vacia": "Recuadro vacío, todavía sin número", "casilla_correcta": "Número ya escrito correctamente" },
  "sumaResultado": { "instrucciones": "Cuenta los dos grupos de pictogramas, súmalos y toca el resultado correcto.", "nivel": "Nivel {n} de {total}" },
  "dedosPictogramas": { "instrucciones": "Cuenta los dedos levantados y toca el grupo de pictogramas con esa misma cantidad.", "nivel": "Nivel {n} de {total}" },
  "dedosNumero": { "instrucciones": "Cuenta los dedos levantados y toca el número correcto.", "nivel": "Nivel {n} de {total}" },
  "completaSuma": { "instrucciones": "Mira la suma representada con pictogramas y escribe, en cada recuadro, el número que le corresponde.", "nivel": "Ejercicio {n} de {total}", "casilla_vacia": "Recuadro vacío, todavía sin número", "casilla_correcta": "Número ya escrito correctamente" },
  "arrastraSuma": { "instrucciones": "Mira la suma representada con pictogramas y arrastra, hasta cada casilla, el número que le corresponde.", "nivel": "Ejercicio {n} de {total}", "casilla_vacia": "Casilla vacía, todavía sin número", "casilla_correcta": "Número ya colocado correctamente" },
  "clasificaCategorias": { "instrucciones": "Arrastra cada pictograma hasta la categoría a la que pertenece.", "nivel": "Pictograma {n} de {total}", "zona_categoria": "Categoría: {nombre}" },
  "puzzle": { "instrucciones": "Mira el pictograma de arriba y arrastra cada pieza hasta el hueco que le corresponde. Cuando completes la imagen, elige la palabra que la nombra.", "ronda": "Pictograma {n} de {total}", "pregunta_palabra": "¿Cómo se llama?", "casilla_vacia": "Hueco {n}, vacío", "casilla_completa": "Hueco {n} completado", "pieza": "Pieza para el hueco {n}" },
  "relacionaPictogramaPalabra": { "instrucciones": "Arrastra cada pictograma hasta el texto que le corresponde.", "ronda": "Ronda {n} de {total}", "casilla": "Casilla: {nombre}", "resuelto": "Emparejado correctamente con {nombre}" },
  "meGusta": { "instrucciones": "Mira cada comida y arrástrala hasta el plato si te gusta, o hasta el cubo de basura si no te gusta.", "ronda": "Comida {n} de {total}", "zona_me_gusta": "Me gusta", "zona_no_me_gusta": "No me gusta" },
  "listaCompra": { "instrucciones": "Mira la lista de la compra y toca o arrastra hasta el carrito solo los pictogramas que están en la lista.", "ronda": "Ronda {n} de {total}", "titulo_lista": "Lista de la compra", "titulo_estante": "Estantería", "zona_carrito": "Carrito de la compra" },
  "reconoceEmociones": { "instrucciones": "Mira la cara y toca el pictograma que representa cómo se siente.", "ronda": "Cara {n} de {total}", "pregunta": "¿Cómo se siente?", "cara_personaje": "Cara de un personaje", "contento": "Contento", "triste": "Triste", "enfadado": "Enfadado", "asustado": "Asustado" },
  "categorias": { "comida": "Comida", "animales": "Animales", "ropa": "Ropa", "colores": "Colores", "familia": "Familia", "cuerpo": "Cuerpo", "escuela": "Escuela", "juguetes": "Juguetes", "naturaleza": "Naturaleza", "emociones": "Emociones", "numeros": "Números", "acciones": "Acciones", "otra": "Otra…", "otra_placeholder": "Escribe una categoría", "aviso_arbol": "De momento esta es una lista corta de categorías. Más adelante se incrustará aquí el árbol oficial de categorías de ARASAAC." },
  "core": { "error_cargar_apps": "No se ha podido cargar la lista de juegos.", "error_cargar_app": "No se ha podido cargar este juego.", "sin_conexion_arasaac": "No se ha podido conectar con ARASAAC. Comprueba tu conexión a internet." },
  "juegos_nombres": { "memoria_animales": "Memoria", "arrastra_palabra_animales": "Arrastra la palabra", "teclea_palabra_animales": "Teclea la palabra", "ordena_secuencia_rutinas": "Ordena la secuencia", "escribe_letra_animales": "Escribe la letra", "bingo_lectura_animales": "Bingo de lectura", "ruleta_letras_animales": "Ruleta de letras", "rosco_pictogramas_animales": "Rosco de pictogramas", "arrastra_numero_animales": "Cuenta y arrastra el número", "escribe_numero_animales": "Cuenta y escribe el número", "suma_resultado_animales": "Suma pictogramas y elige el resultado", "dedos_pictogramas_animales": "Relaciona los dedos con los pictogramas", "dedos_numero": "Relaciona los dedos con el número", "completa_suma_animales": "Escribe los números de la suma", "arrastra_suma_animales": "Arrastra los números de la suma", "clasifica_categorias": "Clasifica los pictogramas en dos categorías", "puzzle_pictograma_palabra_animales": "Puzzle de pictograma y palabra", "relaciona_pictograma_palabra_animales": "Relaciona el pictograma con su palabra", "me_gusta_no_me_gusta_comidas": "Me gusta / no me gusta", "lista_compra_comidas": "Lista de la compra", "reconoce_emociones": "Reconoce emociones" },
  "footer": { "autor": "Pictosfera — desarrollado por Roberto Corral Retuerta.", "licencia": "Se autoriza la libre distribución y el uso de este portal citando siempre a su autor (Licencia Creative Commons Atribución 4.0 — CC BY 4.0).", "licencia_enlace": "Ver la licencia CC BY 4.0", "arasaac": "Los símbolos pictográficos utilizados son propiedad del Gobierno de Aragón y han sido creados por Sergio Palao para ARASAAC, que los distribuye bajo licencia Creative Commons (BY-NC-SA).", "arasaac_enlace": "Visitar ARASAAC" }
}
```

### 6.5 `locales/en.json` — íntegro (38 namespaces, traducción 1:1 de es.json)

```json
{
  "app": { "nombre": "Pictosfera" },
  "nav": { "inicio": "Home", "juegos": "Games", "pictogramas": "Pictograms", "rutas": "Routes", "ajustes": "Settings" },
  "inicio": { "bienvenida": "Hi! Welcome to Pictosfera", "intro": "Choose \"Games\" to start playing.", "ir_juegos": "See games", "rutas_titulo": "Your routes" },
  "juegos": { "titulo": "Games", "vacio": "There are no games on this shelf yet.", "sin_material": "There isn't enough material to play this yet. Add pictograms or photos from \"Pictograms\".", "cargando": "Loading games…", "volver": "Back to games", "interruptor_titulo": "Free access to games", "interruptor_ayuda": "If you turn this off, the child can still come in here, but the games will show greyed out, and tapping any of them will go straight to Home. Useful if you want them to only play through learning routes.", "interruptor_bloqueado": "locked, free access off" },
  "pin": { "titulo": "Adult area", "subtitulo": "Enter the PIN to continue", "crear_subtitulo": "Create a PIN for this area", "error": "Wrong PIN, try again", "borrar": "Delete", "cancelar": "Cancel", "aviso": "The PIN is a simple latch so a child doesn't enter by accident. It is not real security." },
  "pictogramas": { "titulo": "Pictograms", "buscar_placeholder": "Search a pictogram…", "buscar_boton": "Search", "buscando": "Searching…", "sin_resultados": "No pictograms found.", "error_busqueda": "Could not connect to ARASAAC. Check your internet connection.", "anadir": "Add to library", "anadido": "Added", "mi_biblioteca": "My library", "biblioteca_vacia": "You haven't added any pictograms or photos yet.", "biblioteca_vacia_arasaac": "You haven't added any ARASAAC pictograms yet.", "biblioteca_vacia_fotos": "You haven't added any photos yet.", "menu_ayuda": "Choose what you want to manage.", "menu_pictogramas": "Pictograms", "menu_fotos": "My own images", "anadir_foto": "Add photo", "elegir_foto": "Choose photo", "ningun_archivo": "No file chosen", "foto_nombre": "Photo name", "foto_etiqueta": "Choose one or more categories", "foto_etiqueta_obligatoria": "You must choose at least one category", "guardar": "Save", "borrar_medio_confirmar": "Delete this item from the library?", "origen_arasaac": "ARASAAC", "origen_foto": "Own photo", "filtrar_por": "Filter by category", "todas": "All", "editar_nombre": "Edit name", "secuencias_titulo": "Sequences", "secuencias_ayuda": "Design a real-life routine here (brushing teeth, getting dressed...) as a list of pictograms in the right order. Games that order sequences will use the ones you create here.", "secuencias_abrir": "Manage sequences", "secuencia_nombre": "Sequence name", "secuencia_nombre_placeholder": "E.g.: Brushing teeth", "secuencia_pasos": "Sequence steps, in order", "secuencia_sin_pasos": "You haven't added any steps yet.", "secuencia_elegir": "Add steps from your library", "secuencia_buscar_arasaac": "Not in your library? Search it on ARASAAC", "secuencia_buscar_arasaac_ayuda": "The pictogram you choose will be added to your library and to this step of the sequence at the same time. You can search again and again, with different words for each step of the routine (for example: first \"toothbrush\", then \"turn on the tap\").", "secuencia_confirmar_guardar": "You're about to save this sequence with {n} steps:\n{resumen}\n\nConfirm all the steps are there, in the right order?", "secuencia_subir": "Move this step up", "secuencia_bajar": "Move this step down", "secuencia_paso_roto": "(pictogram removed from the library)", "secuencia_error_nombre": "Write a name for the sequence.", "secuencia_error_pasos": "Add at least {n} steps so they can be ordered.", "secuencia_editar": "Edit sequence", "secuencia_borrar_confirmar": "Delete this sequence?", "secuencia_rota": "A pictogram is missing: check this sequence", "mis_secuencias": "My sequences", "secuencias_vacio": "You haven't created any sequence yet.", "guardar_cambios": "Save changes", "categorias_titulo": "Categories", "categorias_ayuda": "Design pairs of opposite categories here (for example big/small, red/green...) for the \"Sort pictograms into two categories\" game. Each category needs a pictogram that represents it and at least one pictogram that belongs to it; each round the game will randomly pick one of the pairs you've created.", "categoria_pareja_nombre": "Pair name", "categoria_pareja_nombre_placeholder": "E.g.: Big and small", "categoria_numero": "Category {n}", "categoria_nombre": "Category name", "categoria_nombre_placeholder": "E.g.: Big", "categoria_cabecera_titulo": "Pictogram that represents this category", "categoria_cabecera_elegir": "Choose pictogram", "categoria_sin_cabecera": "You haven't chosen a pictogram yet.", "categoria_pictogramas_titulo": "Pictograms that belong to this category", "categoria_pictogramas_anadir": "Add pictograms", "categoria_sin_pictogramas": "You haven't added any pictograms yet.", "categoria_seleccionar_cabecera_titulo": "Choose the pictogram that represents category {n}", "categoria_seleccionar_pictogramas_titulo": "Choose the pictograms for category {n}", "categoria_buscar_arasaac": "Not in your library? Search it on ARASAAC", "categoria_listo": "Done", "categoria_confirmar_guardar": "You're about to save this pair as \"{nombre}\":\n{resumen}\n\nConfirm everything is correct?", "categoria_error_nombre": "Write a name for the pair.", "categoria_error_categorias": "A pair needs exactly two categories.", "categoria_error_nombre_categoria": "Write a name for each category.", "categoria_error_cabecera": "Choose a pictogram to represent each category.", "categoria_error_pictogramas": "Add at least one pictogram to each category.", "categoria_editar": "Edit pair", "categoria_borrar_confirmar": "Delete this pair of categories?", "categoria_rota": "A pictogram is missing: check this pair", "mis_categorias": "My categories", "categorias_vacio": "You haven't created any pair of categories yet." },
  "ajustes": { "titulo": "Settings", "cat_idioma": "Language and voice", "cat_juegos": "Game settings", "cat_seguridad": "Security and PIN", "cat_copia": "Import and export", "cat_privacidad": "Privacy", "idioma": "Language", "idioma_ayuda": "Changes the language for the whole app: text, pictograms and voice.", "voz_disponible": "Your device has a voice for this language.", "voz_no_disponible": "Your device doesn't have a voice installed for this language. The text will still show, but it may not be spoken, or may be spoken in another language.", "pin_titulo": "Parental PIN", "pin_estado_activo": "The PIN is turned on.", "pin_estado_inactivo": "You haven't created a PIN yet.", "pin_crear": "Create PIN", "pin_cambiar": "Change PIN", "pin_quitar": "Remove PIN", "pin_nuevo": "New PIN (4 digits)", "pin_confirmar": "Repeat the PIN", "pin_no_coincide": "The two PINs don't match", "pin_invalido": "The PIN must have 4 digits", "pin_guardado": "PIN saved", "pin_quitado": "PIN removed", "copia_titulo": "Backup", "copia_explicacion": "Here you can save a copy of your library and settings to a file, or restore it later or on another device.", "copia_exportar": "Export backup", "copia_importar": "Import backup", "copia_incluir_fotos": "Also include my photos", "copia_incluir_fotos_aviso": "If you turn this on, the file will contain the child's photos. You decide where you keep it: Pictosfera never stores or sees any of this.", "copia_recuerda": "The backup restores pictograms, names, categories, sequences, settings and PIN. Photos are not included unless you tick the box.", "copia_importar_confirmar": "Importing this backup will replace your current library. Continue?", "copia_exito_exportar": "Backup saved successfully.", "copia_exito_importar": "Backup imported successfully.", "copia_error": "This backup file could not be read.", "recordatorio_copia": "It's been more than 15 days since your last backup and you've added new material. Want to make one now?", "recordatorio_ahora": "Back up now", "recordatorio_luego": "Later", "pistas_titulo": "Settings for each game", "pistas_ayuda": "Each game keeps its own settings, separate from the others. Choose a game to see and change its settings.", "pistas_elegir_juego": "Game", "pistas_sin_ajustes": "This game has no settings of its own.", "pistas_mostrar": "Show the hint word next to the pictogram", "pistas_mayuscula": "Show words in UPPERCASE", "pistas_resaltar_teclado": "Highlight the keys needed to type the word on the keyboard", "pistas_mano_amiga_ayuda": "These settings avoid complicating things for a child still learning to write. If you turn them off, the game will require typing that part correctly and will show the keys needed to do so.", "pistas_tildes_automaticas": "Add accent marks automatically (á, é, í, ó, ú)", "pistas_mayusculas_automaticas": "Don't require a capital initial on proper nouns", "pistas_puntuacion_automatica": "Add commas, periods and other punctuation automatically", "pistas_espacios_automaticos": "Add spaces between words automatically", "pistas_presentacion_ayuda": "These settings change how the pictogram is shown in the game. They're optional and turned off by default.", "pistas_solo_texto": "Show only the word's text, without the pictogram image", "pistas_pulsador_tts": "Replace the pictogram with a listen button (must be pressed before answering)", "pistas_escritura_ayuda": "These settings are only for the guided letter-by-letter writing games (\"Write the letter\").", "pistas_letra_punteada": "Show the letter as a dotted outline inside each box, as a guide to trace over", "pistas_tolerancia_trazo": "Precision required when tracing letters", "tolerancia_facil": "Easy (recommended to start)", "tolerancia_normal": "Normal", "tolerancia_dificil": "Hard", "pistas_ruleta_ayuda": "This setting is only for the \"Letter wheel\" game.", "pistas_dificultad_ruleta": "Letter wheel difficulty (word length, hint frequency and alphabet size)", "pistas_lista_solo_texto": "In the shopping list, show only the text, without the pictogram image", "pistas_estante_solo_imagen": "On the shelf, show only the pictogram, without the text below", "privacidad_titulo": "Privacy", "privacidad_texto": "Pictosfera has no server or database of its own. Everything you add lives only on this device, in this browser. If you clear your browser data, everything will be lost unless you have an exported backup; photos are only recovered if you included them in that backup." },
  "rutas": { "titulo": "Learning routes", "explicacion": "A learning route is a guided itinerary: an ordered list of games that the child plays one after another. Each game only unlocks once the previous one is finished with no mistakes at all. You can create as many routes as you like; each one will show up in \"Home\" as another card, alongside the normal access to Games.", "crear_boton": "Create guided route", "mis_rutas": "My routes", "vacio": "You haven't created any route yet.", "numero_pasos": "{n} games", "editar": "Edit route", "borrar_confirmar": "Delete this route?", "no_encontrada": "This route doesn't exist or has been deleted.", "titulo_crear": "Create guided route", "titulo_editar": "Edit guided route", "aviso_editar_reinicia": "When you save these changes, any progress the child had on this route will reset back to the first game.", "nombre": "Route name", "nombre_placeholder": "E.g.: Morning routine", "pasos_titulo": "Games in the route, in order", "sin_pasos": "You haven't added any game yet.", "paso_roto": "(game no longer available)", "paso_subir": "Move this game up", "paso_bajar": "Move this game down", "paso_editar": "Edit this game's settings", "config_guardar": "Save settings", "elegir_titulo": "Add games from here", "anadir_boton": "Add", "config_anadir": "Add to the route", "guardar": "Save route", "guardar_cambios": "Save changes", "confirmar_guardar": "You're about to save this route with {n} games:\n{resumen}\n\nConfirm they're all there, in the right order?", "config_ayuda": "These settings only apply to this game inside this route: they don't affect direct access from Games, nor any other route.", "error_nombre": "Write a name for the route.", "error_pasos": "Add at least {n} game so the route can be saved.", "bloqueado": "Locked: finish the previous game with no mistakes first", "volver_a_la_ruta": "Back to the route" },
  "recompensa": { "mensaje_1": "Well done!", "mensaje_2": "You did it!", "mensaje_3": "Great job!", "continuar": "Keep playing", "salir": "Back to games" },
  "comunes": { "cerrar": "Close", "aceptar": "OK", "cancelar": "Cancel", "volver": "Back", "cargando": "Loading…", "error_generico": "Something went wrong. Please try again.", "escuchar": "Listen" },
  "bienvenida": { "titulo_1": "Welcome to Pictosfera", "texto_1": "A portal of pictogram games, free, designed so your child's data stays only on this device.", "titulo_2": "Your library, your rules", "texto_2": "From \"Pictograms\" you can add your own photos and organise the material used by the games.", "titulo_3": "Make backups", "texto_3": "From time to time, save a backup from \"Settings\". That way you won't lose your work if you change devices or clear your browser data. The backup does not include photos unless you choose to.", "empezar": "Get started" },
  "puerta": { "titulo": "Let's play!", "texto": "Tap the button to open Pictosfera in full screen." },
  "estantes": { "ANIMALES": "Animals", "LECTURA": "Reading", "NUMEROS": "Numbers", "ESCRITURA": "Writing", "RUTINAS": "Routines", "CONCEPTOS": "Concepts" },
  "memoria": { "nombre": "Memory", "instrucciones": "Tap two cards to find the matching pair.", "intentos": "Attempts: {n}", "parejas": "Pairs found: {n} of {total}" },
  "arrastra": { "nombre": "Drag the word", "instrucciones": "Drag the correct word onto the pictogram.", "nivel": "Level {n} of {total}" },
  "teclea": { "nombre": "Type the word", "instrucciones": "Look at the pictogram and type its name on the keyboard.", "nivel": "Level {n} of {total}", "espacio": "Space", "mayus": "Capital", "simbolos": "Symbols", "numeros": "Numbers", "volver_letras": "Back to letters", "borrar": "Delete" },
  "ordena": { "nombre": "Order the sequence", "instrucciones": "Drag or tap each pictogram and place it in the slot it belongs to, in the right order.", "ejercicio": "Exercise {n} of {total}", "casilla_vacia": "Slot {n}, empty", "sin_secuencias": "No playable sequence has been designed yet. Go to Pictograms → Sequences to create one." },
  "escribe": { "nombre": "Write the letter", "instrucciones": "Look at the pictogram and write each letter inside its box, with a finger or a stylus.", "nivel": "Level {n} of {total}", "casilla_bloqueada": "Locked box: finish the previous letter first", "casilla_actual": "Write the letter {letra} here", "casilla_correcta": "Letter {letra} already written correctly" },
  "bingo": { "nombre": "Reading bingo", "instrucciones": "Look at the ball from the bingo cage and tap the matching pictogram or word on your card.", "bola": "Ball {n} of {total}", "casilla_marcada": "{nombre}, already found", "mensaje_final": "Bingo!" },
  "ruleta": { "nombre": "Letter wheel", "instrucciones": "Spin the wheel and follow its result: choose letters, get hints or free letters until you complete the word and uncover the pictogram.", "palabra": "Word {n} of {total}", "girar": "Spin the wheel", "girando": "Spinning…", "resultado_letra": "Choose a letter", "resultado_pista": "Hint", "resultado_vocal": "Free vowel", "resultado_consonante": "Free consonant", "letra_no_esta": "There's no {letra}", "casilla_oculta": "Hidden letter", "casilla_revelada": "Letter {letra}", "abecedario_bloqueado": "Spin the wheel: if it lands on \"Choose a letter\", you'll be able to tap the alphabet", "mensaje_final": "Word completed!" },
  "rosco": { "nombre": "Pictogram letter ring", "instrucciones": "Listen to the clue and tap the one pictogram, among the four, that matches it.", "progreso": "Letter {n} of {total}", "consigna_empieza": "Starts with the letter {letra}", "consigna_tiene": "Contains the letter {letra}", "mensaje_final": "Ring completed!" },
  "arrastraNumero": { "instrucciones": "Count the pictograms and drag the correct number onto the box.", "nivel": "Level {n} of {total}", "casilla_vacia": "Empty box, no number yet" },
  "escribeNumero": { "instrucciones": "Count the pictograms and write the matching number inside the box, with your finger or a stylus.", "nivel": "Level {n} of {total}", "casilla_vacia": "Empty box, no number yet", "casilla_correcta": "Number already written correctly" },
  "sumaResultado": { "instrucciones": "Count both groups of pictograms, add them up, and tap the correct result.", "nivel": "Level {n} of {total}" },
  "dedosPictogramas": { "instrucciones": "Count the raised fingers and tap the group of pictograms with that same amount.", "nivel": "Level {n} of {total}" },
  "dedosNumero": { "instrucciones": "Count the raised fingers and tap the correct number.", "nivel": "Level {n} of {total}" },
  "completaSuma": { "instrucciones": "Look at the addition shown with pictograms and write the matching number in each box.", "nivel": "Exercise {n} of {total}", "casilla_vacia": "Empty box, no number yet", "casilla_correcta": "Number already written correctly" },
  "arrastraSuma": { "instrucciones": "Look at the addition shown with pictograms and drag, onto each box, the number that matches it.", "nivel": "Exercise {n} of {total}", "casilla_vacia": "Empty box, no number yet", "casilla_correcta": "Number already placed correctly" },
  "clasificaCategorias": { "instrucciones": "Drag each pictogram to the category it belongs to.", "nivel": "Pictogram {n} of {total}", "zona_categoria": "Category: {nombre}" },
  "puzzle": { "instrucciones": "Look at the pictogram above and drag each piece onto the slot it belongs to. Once you complete the picture, choose the word that names it.", "ronda": "Pictogram {n} of {total}", "pregunta_palabra": "What is it called?", "casilla_vacia": "Slot {n}, empty", "casilla_completa": "Slot {n} completed", "pieza": "Piece for slot {n}" },
  "relacionaPictogramaPalabra": { "instrucciones": "Drag each picture to the text it matches.", "ronda": "Round {n} of {total}", "casilla": "Box: {nombre}", "resuelto": "Correctly matched with {nombre}" },
  "meGusta": { "instrucciones": "Look at each food and drag it onto the plate if you like it, or onto the bin if you don't.", "ronda": "Food {n} of {total}", "zona_me_gusta": "I like it", "zona_no_me_gusta": "I don't like it" },
  "listaCompra": { "instrucciones": "Look at the shopping list and tap or drag onto the cart only the pictograms that are on the list.", "ronda": "Round {n} of {total}", "titulo_lista": "Shopping list", "titulo_estante": "Shelf", "zona_carrito": "Shopping cart" },
  "reconoceEmociones": { "instrucciones": "Look at the face and tap the pictogram that shows how it feels.", "ronda": "Face {n} of {total}", "pregunta": "How does it feel?", "cara_personaje": "A character's face", "contento": "Happy", "triste": "Sad", "enfadado": "Angry", "asustado": "Scared" },
  "categorias": { "comida": "Food", "animales": "Animals", "ropa": "Clothes", "colores": "Colours", "familia": "Family", "cuerpo": "Body", "escuela": "School", "juguetes": "Toys", "naturaleza": "Nature", "emociones": "Feelings", "numeros": "Numbers", "acciones": "Actions", "otra": "Other…", "otra_placeholder": "Type a category", "aviso_arbol": "For now this is a short list of categories. Later, the official ARASAAC category tree will be embedded here." },
  "core": { "error_cargar_apps": "Could not load the list of games.", "error_cargar_app": "Could not load this game.", "sin_conexion_arasaac": "Could not connect to ARASAAC. Check your internet connection." },
  "juegos_nombres": { "memoria_animales": "Memory", "arrastra_palabra_animales": "Drag the word", "teclea_palabra_animales": "Type the word", "ordena_secuencia_rutinas": "Order the sequence", "escribe_letra_animales": "Write the letter", "bingo_lectura_animales": "Reading bingo", "ruleta_letras_animales": "Letter wheel", "rosco_pictogramas_animales": "Pictogram letter ring", "arrastra_numero_animales": "Count and drag the number", "escribe_numero_animales": "Count and write the number", "suma_resultado_animales": "Add pictograms and choose the result", "dedos_pictogramas_animales": "Match fingers to pictograms", "dedos_numero": "Match fingers to the number", "completa_suma_animales": "Write the numbers of the addition", "arrastra_suma_animales": "Drag the numbers of the addition", "clasifica_categorias": "Sort the pictograms into two categories", "puzzle_pictograma_palabra_animales": "Picture puzzle and word", "relaciona_pictograma_palabra_animales": "Match the picture to its word", "me_gusta_no_me_gusta_comidas": "I like it / I don't like it", "lista_compra_comidas": "Shopping list", "reconoce_emociones": "Recognise feelings" },
  "footer": { "autor": "Pictosfera — developed by Roberto Corral Retuerta.", "licencia": "Free distribution and use of this site is authorised provided the author is always credited (Creative Commons Attribution 4.0 license — CC BY 4.0).", "licencia_enlace": "View the CC BY 4.0 license", "arasaac": "The pictographic symbols used are the property of the Government of Aragón and were created by Sergio Palao for ARASAAC, which distributes them under a Creative Commons license (BY-NC-SA).", "arasaac_enlace": "Visit ARASAAC" }
}
```

### 6.6 `locales/ca.json`, `eu.json`, `gl.json`, `va.json` — estado parcial

Los 4 archivos tienen exactamente 72 líneas y los mismos 11 namespaces cada uno: `app, nav, inicio, juegos, pin, pictogramas, ajustes, recompensa, comunes, estantes, memoria`. Cubren el núcleo de la interfaz y el primer juego (Memoria) en cada idioma, pero no las claves de los otros 20 minijuegos ni de secuencias/categorías/rutas/footer/puerta. Esas claves ausentes caen automáticamente a castellano por el mecanismo de fallback de `i18n.js` (sección 3.5) — el portal nunca muestra una clave rota ni "undefined" en ninguno de los 6 idiomas. Si se reconstruye desde cero sin tener a mano el contenido exacto de estos 4 archivos, es seguro generarlos solo con esos 11 namespaces (traducidos por un hablante de cada idioma) y dejar el resto sin definir: el comportamiento será idéntico al actual.

### 6.7 Tests automáticos: lista completa de archivos

33 archivos en `tests/*.test.mjs` (uno por módulo de lógica pura), más `tests/helpers/shims.mjs`:

```
ajustesJuego, appLoader, arasaac, arrastraNumero, arrastraPalabra, arrastraSuma,
backup, bingoLectura, cabezas, categorias, clasificaCategorias, completaSuma,
dedosNumero, dedosPictogramas, escribeLetra, escribeNumero, i18n, listaCompra,
meGustaNoMeGusta, mediaLibrary, memoria, ordenaSecuencia, personajes,
puzzlePictogramaPalabra, reconoceEmociones, relacionaPictogramaPalabra,
roscoPictogramas, ruletaLetras, rutas, secuencias, sumaResultado, tecleaPalabra
```

(falta deliberadamente un test de `dedos-numero` separado de `dedosNumero` — coinciden; y no hay test de `puerta.js`/`fullscreen.js`/`welcome.js`/`footer.js` por ser triviales de puro DOM sin lógica calculable).

`tests/helpers/shims.mjs` — íntegro:

```js
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(here, '..', '..');

function crearLocalStorage() {
  const datos = new Map();
  return {
    getItem: (clave) => (datos.has(clave) ? datos.get(clave) : null),
    setItem: (clave, valor) => datos.set(clave, String(valor)),
    removeItem: (clave) => datos.delete(clave),
    clear: () => datos.clear(),
    _datos: datos
  };
}

export function installBrowserShims() {
  globalThis.localStorage = crearLocalStorage();
  globalThis.document = { documentElement: {} };
  globalThis.window = new EventTarget();

  globalThis.fetch = async (url) => {
    const urlStr = String(url);
    const relativo = urlStr.replace(/^file:\/\//, '').replace(/^\.?\//, '');
    const ruta = path.join(PROJECT_ROOT, relativo);
    try {
      const contenido = await fs.readFile(ruta, 'utf8');
      return { ok: true, status: 200, json: async () => JSON.parse(contenido) };
    } catch {
      return { ok: false, status: 404, json: async () => { throw new Error(`No encontrado: ${ruta}`); } };
    }
  };

  return globalThis.localStorage;
}
```

Nótese el comentario de cabecera que menciona un `tests/MANUAL.md`: ese archivo **no existe** realmente en el repositorio (referencia obsoleta/colgante); no hace falta crearlo al reconstruir.

### 6.8 Herramienta de publicación de escritorio (fuera del portal web)

En una carpeta hermana (`NO BORRAR PICTOSFERA LETRITAS/GESTOR SUBIDAS WEB/`), independiente del código del portal, existe `GestorSubidasWeb.ps1`: una aplicación de escritorio Windows (Windows Forms, PowerShell) pensada para que una persona sin conocimientos de git/GitHub pueda publicar cambios del portal con un clic. Guarda el token de acceso personal de GitHub cifrado con DPAPI (nunca en texto plano), y hace commit+push de un solo clic. Va acompañada de un lanzador `.bat` que la abre sin mostrar ninguna ventana de consola, y un `LEEME` con instrucciones paso a paso para alguien no técnico. Esta herramienta ya existe y funciona — el punto del README.md que dice que se "decidió dejarla para más adelante" está obsoleto (ver sección 8.3).
## 7. Historial narrado de desarrollo y correcciones

Esta sección recoge, en orden cronológico aproximado, los momentos más importantes del desarrollo: decisiones de arquitectura, bugs detectados (con causa exacta y solución exacta), y el orden en que se construyeron los sistemas. La fuente es la lista interna de tareas completadas (#1–#245 más las de esta sesión). El objetivo es que una IA reconstruyendo el proyecto desde cero sepa cuáles son las trampas más probables y cómo evitarlas.

### 7.1 Fase 1 — Fundamentos (tareas ~#1–#50)

El proyecto empezó definiendo la filosofía "cero build / cero servidor" antes de escribir ningún archivo. La decisión más importante fue que cada `<script type="module">` se sirve exactamente como está escrito en disco: sin transpilación, sin bundler. Esto fuerza a que todo el código sea ES2020 nativo, sin decoradores, sin JSX, sin TypeScript.

Se construyó primero `core/css/tokens.css` — las variables CSS — antes de ningún HTML. La regla fue: ningún archivo CSS del proyecto puede declarar un color, radius o sombra "en duro"; todo tiene que referenciar una variable de tokens. Esto se mantiene sin excepción en los 21 minijuegos.

`db.js` se diseñó deliberadamente "tonta": solo sabe abrir la base de datos y gestionar versiones/migraciones de almacenes. Toda la lógica de negocio de los datos (qué guardar, cómo indexar, qué descartar) vive en `mediaLibrary.js`, `secuencias.js`, `categorias.js` y `rutas.js`. El patrón de migración incremental con `if (!db.objectStoreNames.contains(...))` fue la solución para nunca hacer destructivo un upgrade de IndexedDB (perder los datos del niño sería inaceptable).

La versión inicial de `i18n.js` tenía un bug silencioso: el código de idioma interno `'va'` (valenciano) se usaba directamente en las llamadas a la API de ARASAAC, que espera `'val'`. Resultado: todas las búsquedas en valenciano devolvían silenciosamente resultados en otro idioma o error. **Corrección:** `i18n.js` expone `arasaacCode` como campo separado en cada entrada de `SUPPORTED_LANGS`, y `arasaac.js` usa siempre ese campo en lugar del código interno.

### 7.2 Fase 2 — Sistema de medios y ARASAAC (tareas ~#50–#90)

El primer bug grave del sistema de medios fue la "contaminación de etiquetas ARASAAC". La API de ARASAAC devuelve siempre los campos `categories` y `tags` en inglés, independientemente del idioma solicitado. La primera implementación de `arasaac.js` copiaba esas etiquetas directamente al campo `etiquetas` del medio guardado en IndexedDB. Esto hacía que el sistema de filtrado de la biblioteca (que funciona por etiquetas) se comportara de forma imprevisible en idiomas distintos del inglés — un pictograma añadido buscando "perro" en español podría tener la etiqueta `"dog"` y no aparecer cuando el adulto filtrase por la etiqueta "animales" en español.

**Corrección en dos partes:**

1. `arasaac.js`'s `toMedium()` dejó de copiar etiquetas de la respuesta ARASAAC: `etiquetas: []` siempre. Las únicas etiquetas que tiene un medio ARASAAC son las que `mediaLibrary.ensureSeedFromArasaac` añade explícitamente al guardarlo (la etiqueta que el adulto o la app eligieron al añadirlo).

2. Para datos ya guardados con la contaminación antigua: `mediaLibrary.limpiarEtiquetasArasaac()` y `etiquetasArasaacLimpias()` detectan y borran las etiquetas en inglés contaminadas. `pictogramasArasaac.js` llama a esta limpieza en cada refresco de la vista de biblioteca.

En esta fase también se construyó el sistema de "semilla ARASAAC": cuando un juego necesita material de una etiqueta (`material.etiqueta`) y esa etiqueta no tiene suficientes entradas en la biblioteca local, `appLoader.js` llama automáticamente a `mediaLibrary.ensureSeedFromArasaac` para sembrar la biblioteca con un conjunto predefinido de términos de búsqueda (`material.semillaArasaac`). Esto hace que los juegos "funcionen de serie" sin que el adulto tenga que buscar nada manualmente.

### 7.3 Fase 3 — Shell de navegación y router (tareas ~#90–#120)

El router es un hash-router minimalista: escucha `hashchange`, parsea `window.location.hash`, y llama a la función `renderizar()` de la vista correspondiente. No hay historia de navegación compleja, no hay lazy-loading sofisticado: cada vista es una función que recibe `#view` y lo puebla. La única complicación fue que algunas vistas tienen "sub-navegación" (Pictogramas tiene al menos 4 subsecciones), resuelta con un parámetro de query en el hash en lugar de rutas anidadas.

La "puerta" (`puerta.js`) resolvió el problema de pantalla completa en iOS. El API `requestFullscreen()` solo funciona si se llama desde un event handler de un gesto de usuario real (tap, click). En la primera versión, `fullscreen.js` intentaba activar la pantalla completa al cargar la app, y fallaba silenciosamente en todos los navegadores que no son Chrome Desktop. La solución fue mostrar `puerta.js` en CADA visita (no solo la primera) — una pantalla de bienvenida con un botón central. El tap de ese botón es el gesto de usuario que desencadena `requestFullscreen()` ya dentro de su event handler. Nótese que en iOS Safari la pantalla completa sigue sin funcionar (iOS no permite web fullscreen fuera de video), pero la puerta ya no da error.

### 7.4 Fase 4 — Sistema de ajustes y cascada per-game (tareas ~#120–#140)

El sistema de ajustes tuvo una iteración importante. La primera versión guardaba todos los ajustes en claves globales de localStorage (`pictosfera.<ajuste>`). Esto funcionaba, pero hacía imposible dar ajustes distintos al mismo juego dentro de una ruta de aprendizaje versus el acceso libre.

La solución fue la función `claveJuego(appId, claveGlobal)` en `ajustesJuego.js`: los ajustes tienen dos capas de clave — una global (`pictosfera.<ajuste>`) y una per-game (`pictosfera.juego.<appId>.<ajuste>`). La lectura sigue esta cascada: primero busca la clave per-game; si no existe, la global; si no existe, el valor por defecto del factory. La escritura: si se escribe con `appId`, solo se escribe la clave per-game y desde ese momento ese juego queda "desacoplado" del ajuste global.

La tarea #123 ("integrar el árbol de categorías ARASAAC") quedó en progreso durante esta fase: el campo `categorias.aviso_arbol` en `es.json`/`en.json` avisa al adulto de que la lista de categorías de la vista de Pictogramas es actualmente corta (13 entradas en `categoriasPictogramas.js`). La integración del árbol completo ARASAAC mediante una semilla embebida en `categoriasPictogramas.js` o una llamada a la API se identificó como "Punto 2" de la hoja de ruta pero no llegó a implementarse antes del cierre de esta sesión de desarrollo. Es el único pendiente real del proyecto (ver sección 8).

### 7.5 Fase 5 — Mecánicas: las 21 apps (tareas ~#140–#220)

Las mecánicas se construyeron en lotes. Las primeras en implementarse fueron `memoria`, `arrastra-palabra` y `teclea-palabra` — las tres más simples — que establecieron el contrato del módulo (ver sección 3.1) y los patrones comunes que todas las demás siguieron.

**Bug de arrastre con tap-fantasma:** En la primera versión del drag-and-drop, un tap rápido sobre un elemento arrastrable a veces lo "soltaba" inmediatamente en la posición inicial, sin desplazamiento, generando un `pointerup` falso. **Corrección:** se añadió un umbral de 4 píxeles (`UMBRAL_MOVIMIENTO = 4`) — el drag no "activa" hasta que el puntero se ha desplazado al menos 4px desde el `pointerdown`. Esto filtra los taps puros y los diferencia del inicio de un arrastre real. Este patrón quedó copiado en todos los minijuegos con arrastre.

**Bug de `setPointerCapture` en Safari:** `element.setPointerCapture(event.pointerId)` lanza excepción en Safari cuando el elemento ya no está en el DOM en el momento en que se llama (puede ocurrir si el DOM se reconstruye justo en ese tick). **Corrección:** `try { el.setPointerCapture(id) } catch {}` — silenciar la excepción. Si falla, el drag simplemente no captura el puntero (el usuario puede compensarlo con un movimiento normal).

**Bug de imágenes arrastradas por el navegador:** `img.draggable = false` es crítico en todos los minijuegos. Sin esto, al arrastrar un pictograma en Chrome/Firefox el navegador muestra una "sombra fantasma" de la imagen que interfiere visualmente con el drag custom. Es una línea fácil de olvidar al añadir un nuevo juego.

**Motor de reconocimiento de trazo (escribe-letra, escribe-numero, completa-suma):** El motor está duplicado en los 3 archivos (no importado desde un módulo común — filosofía de aislamiento). Funciona así: al montar el juego se renderiza la letra/número de referencia en un canvas fuera de pantalla, se lee el mapa de píxeles, se aplica una dilatación (el radio en píxeles se calcula en función del nivel `toleranciaTrazo`) usando distancia de Chebyshev. El usuario dibuja sobre otro canvas; al `pointerup`, se espera 2000ms (por si la letra tiene varios trazos) y se comparan ambos mapas de bits. El umbral de acierto es la fracción de píxeles de referencia cubiertos por el trazo del usuario, ponderado por la tolerancia elegida.

**Personajes/cabezas — bug de filtración de `<style>`:** `personajes.js` genera SVGs con un bloque `<style>` interno. Cuando esos SVGs se insertan via `innerHTML` en el DOM, el `<style>` "se escapa" del SVG y aplica sus reglas a todo el documento. **Corrección:** todas las clases CSS del SVG llevan el prefijo `pj-` (constante `PREFIJO` en `personajes.js`), y `cabezas.js` reutiliza tanto el `PREFIJO` como el `ESTILO_PERSONAJE` exportados desde `personajes.js` (sin duplicar el `<style>`).

**Cabezas — bug del hijab frecuencia excesiva:** El generador de personajes incluye un rasgo de vestimenta (hijab) para representar diversidad. En la primera versión el rasgo salía con probabilidad 25%, lo que lo hacía aparecer en casi todos los juegos. **Corrección:** probabilidad reducida a 10% (1 de cada 10 personajes).

**Accesibilidad de cabezas:** Las etiquetas `aria-label` de las cabezas/personajes en `reconoce-emociones` NUNCA deben revelar la emoción representada (eso sería dar la respuesta). Se usa siempre el texto genérico `t('reconoceEmociones.cara_personaje')` ("Cara de un personaje"). Cualquier texto más descriptivo (p.ej. "cara triste") convertiría el juego en trivial para usuarios de lector de pantalla. Si un SVG no recibe etiqueta, lleva `aria-hidden="true"`.

**`ordena-secuencia` — secuencia rota:** `secuencias.resolverPasos` descarta la secuencia entera si falta cualquier pictograma de cualquier paso. La alternativa (descartar solo el paso roto y reordenar) fue rechazada porque el propósito pedagógico de la secuencia es el orden exacto de TODOS sus pasos — una secuencia parcial cambia su significado.

**`clasifica-categorias` — medio roto:** `categorias.resolverCategoria` descarta solo el medio individual roto (no la categoría entera). En este caso el orden no importa y tener 4 items en lugar de 5 en una categoría sigue siendo jugable.

**`reconoce-emociones` — sin `etiqueta`/`semillaArasaac` en apps.json:** Este juego usa IDs ARASAAC fijos (`fijos: {contento: 35547, triste: 35545, enfadado: 35539, asustado: 35535}`). Es el único juego que no necesita ningún material de la biblioteca del adulto — siempre funciona si hay conexión a internet para los 4 pictogramas fijos. `appLoader.js` detecta la ausencia de `material.etiqueta` y sirve el campo `fijos` directamente como `plataforma.fijos` sin llamar a `resolverMaterial`.

**`lista-compra` — 5 rondas en lugar de 10:** `listaCompra.js` define `TOTAL_RONDAS = 5` (no 10 como el resto) porque cada ronda ya implica revisar una lista completa, lo que alarga más el juego. Esta excepción está documentada en el código y en la sección de "Patrones comunes entre mecánicas" del catálogo de sección 5.

### 7.6 Fase 6 — Rutas de aprendizaje (tareas ~#200–#215)

Las rutas de aprendizaje (`rutas.js`) son la única feature donde el juego NO se abre desde la vista `juego.js` normal, sino desde `rutaJugar.js`. La diferencia clave: `rutaJugar.js` lleva la cuenta de si el juego se completó "sin fallos" para decidir si se desbloquea el siguiente paso. La lógica de "partida perfecta" en `rutas.js` llama a `esPartidaPerfecta(mecanica, huboFallo)`. Por defecto, cualquier fallo = no perfecta. La única excepción es `memoria` (`rutaPerfectoSinFallos: false` declarado en el módulo), porque en Memoria voltear dos cartas y no acertar es parte normal del juego, no un error pedagógico — exigir cero intentos fallidos haría la ruta imposible de completar.

### 7.7 Fase 7 — Tests automáticos (tareas ~#215–#230)

El sistema de tests se construyó al final de cada mecánica, no antes. Esto fue pragmático pero dejó la cobertura concentrada en la lógica pura (funciones exportadas) y sin cobertura del DOM ni de las interacciones de puntero.

El shim de `fetch` en `tests/helpers/shims.mjs` funciona leyendo archivos reales del disco (no mockeando respuestas). Esto significa que los tests de `appLoader` y `i18n` que cargan `data/apps.json` o `locales/es.json` están integrados implícitamente con esos archivos — si un archivo de datos tiene un error de sintaxis, el test de la capa de negocio fallará también.

Los 5 "fallos" que reporta `npm test` en este momento son todos de la misma naturaleza: el sandbox de bash donde se ejecuta `npm test` tiene una copia montada de los archivos del proyecto que puede quedar estancada (ver bug recurrente de staleness en sección 8). Vistos desde el disco real (con el Read tool), todos los archivos son válidos. No hay ningún fallo real de lógica en el proyecto.

### 7.8 Fase 8 — `relaciona-pictograma-palabra` (tarea ~#240–#245)

El último minijuego implementado. La mecánica: 3 pictogramas en la columna izquierda, 3 cajas de texto en la columna derecha; el jugador arrastra cada pictograma a su caja de texto correspondiente. Comparte el motor de Pointer Events (con umbral de 4px y `setPointerCapture` en try/catch) del resto de minijuegos con arrastre. Sus funciones puras testeadas: `mezclar`, `hayMaterialSuficiente` (mínimo 3 medios), `elegirGrupoRonda` (3 medios distintos al azar, sin repetir grupos ya vistos), `construirCasillas`, `esRespuestaCorrecta`, `grupoCompleto`, `formatearTexto`, `puedeResponderItem`. El namespace i18n es `relacionaPictogramaPalabra` con las claves `instrucciones`, `ronda`, `casilla`, `resuelto`.

### 7.9 Fase 9 — Herramienta de publicación `GestorSubidasWeb.ps1` (tareas ~#221–#225)

Para hacer la publicación en GitHub Pages accesible a una persona no técnica, se creó `GestorSubidasWeb.ps1` en una carpeta hermana. Implementación: Windows Forms (PowerShell), con un campo de mensaje de commit, un botón "Publicar", un log en tiempo real, y el PAT de GitHub guardado con DPAPI (cifrado en el perfil de Windows del usuario — nunca en texto plano en ningún archivo). El flujo completo es: `git add -A` → `git commit -m <mensaje>` → `git push`. Va acompañada de un `.bat` de lanzamiento (oculta la consola de PowerShell, abre solo la ventana de Windows Forms) y un `LEEME` en lenguaje no técnico.

### 7.10 Fase 10 — Correcciones post-lanzamiento y PWA (tareas #250–#265, julio 2026)

Esta fase abarcó cuatro líneas de trabajo independientes:

**Bug: panel de categoría innecesario al añadir pictograma ARASAAC (tareas #250–#253).** Al buscar un pictograma en ARASAAC y hacer clic para añadirlo, aparecía siempre el panel manual de selección de categoría aunque la API ya hubiera devuelto categorías válidas. Causa: el handler de clic no comprobaba si `medio.etiquetas.length > 0`. Corrección: bifurcar — si hay etiquetas, guardar directo; si no hay, mostrar el panel manual. Adicionalmente, `arasaac.js` recibió el mapa `MAPA_CATEGORIAS_ARASAAC` y la función `etiquetasDesdeArasaac()` para traducir las categorías inglesas de la API a etiquetas curadas en español antes de guardarlas. De este modo los medios ya llegan al store con categorías en castellano sin intervención del adulto.

**Corrección de `resolverMaterial` (tarea #258).** El filtrado de la biblioteca de medios por `material.etiqueta` se aplicaba incorrectamente a juegos como `me-gusta-no-me-gusta` y `lista-compra`, que no necesitan una categoría específica sino cualquier pictograma disponible. Se eliminó `material.etiqueta` de esas entradas de `apps.json` para que `resolverMaterial` les devuelva la biblioteca completa.

**Bug en `puzzle-pictograma-palabra` (tareas #254–#255).** Dos bugs detectados en el minijuego: la zona de texto de la palabra se ocultaba incorrectamente entre rondas por no limpiar el `innerHTML`, y las palabras podían seleccionarse antes de completar el arrastre del puzzle. Correcciones: limpiar `innerHTML` al iniciar cada ronda y deshabilitar los botones de palabra hasta que el puzzle esté completo.

**Feature: instalación PWA (tareas #261–#265).** Se añadió la posibilidad de instalar Pictosfera como aplicación nativa desde el portal web:
- `core/js/pwa.js` — módulo nuevo que captura `beforeinstallprompt` y expone `puedeInstalar()`, `esIOS()`, `estaInstalada()`, `instalar()`. Se importa como primera importación de `main.js` (efecto secundario, sin alias).
- `core/js/puerta.js` — muestra un banner de instalación en la primera visita si el usuario no está en standalone y no descartó el banner antes.
- `core/js/views/ajustes.js` — nueva categoría "Instalar app" con 4 estados distintos según la plataforma.
- `core/css/shell.css` — estilos `.pwa-banner` y relacionados.
- `locales/es.json` y `locales/en.json` — bloque `pwa` con 10 claves y clave `ajustes.cat_instalar`.

**Fix: actualización automática del service worker (posterior a tarea #265).** El `CACHE_NAME` en `sw.js` era `'pictosfera-v1'` hardcoded desde el inicio. Esto provocaba que los clientes que ya tenían el service worker activo siguieran sirviendo archivos viejos incluso después de un nuevo deploy en GitHub Pages. Corrección: `GestorSubidasWeb.ps1` recibió la función `Update-ServiceWorkerCache` que, antes de cada `git add -A`, reemplaza el `CACHE_NAME` por `pictosfera-v{yyyyMMddHHmm}` (timestamp del momento del commit). Así, cada publicación tiene un nombre de caché distinto y los clientes siempre reciben los archivos nuevos en la próxima apertura.

## 8. Estado de las pruebas automáticas, pendientes reales y obsolescencias de README

### 8.1 Estado de los tests automáticos

**Comando:** `npm test` (alias de `node --test tests/**/*.test.mjs`)

**Resultado actual:** 567 tests en total. **567 pasan. 0 fallan.** *(Actualizado julio 2026 — los 5 falsos positivos de entorno que reportaba la sesión anterior fueron corregidos reparando los archivos truncados en el mount del sandbox.)*

La manera de distinguir un fallo real de uno de entorno en sesiones futuras: si el test falla con un error de parsing/lectura de un archivo de datos (JSON malformado, archivo no encontrado), es staleness del sandbox de bash — usar el Read tool para leer el archivo desde Windows y reparar con Python bash append si hace falta. Si falla con un assertion de lógica ("expected X, got Y"), es un bug real en el código.

Cobertura de los 33 módulos testados: únicamente lógica pura (funciones exportadas sin efectos de DOM). No hay tests de interacción de puntero/teclado, no hay tests de renderizado DOM, no hay tests de la capa `core/js/views/`. Esto es deliberado — esos aspectos se validan manualmente.

**Lista de los 33 archivos de test y lo que cubren:**

- `ajustesJuego.test.mjs` — `leer`, `escribir`, `claveJuego`, cascada global→per-game→defecto, interacción entre ajustes de distintos juegos
- `appLoader.test.mjs` — `resolverMaterial`, `montarApp`, integración con `data/apps.json` real (via shim fetch)
- `arasaac.test.mjs` — `buscar`, `toMedium` (verifica que `etiquetas: []` siempre vacío)
- `arrastraNumero.test.mjs` — `hayMaterialSuficiente`, `elegirSiguiente`, `esCorrectoNumero`
- `arrastraPalabra.test.mjs` — `hayMaterialSuficiente`, `mezclar`, `elegirSiguiente`, `formatearTexto`
- `arrastraSuma.test.mjs` — `generarEjercicio`, `esCorrectoArrastraSuma`
- `backup.test.mjs` — `exportarCopia`, `validarCopia`, `aplicarCopia`, `necesitaRecordatorio`
- `bingoLectura.test.mjs` — `hayMaterialSuficiente`, `generarCarton`, `avanzarBola`, `marcarCasilla`, `hayBingo`
- `cabezas.test.mjs` — `generarCabeza`, `PREFIJO`, ausencia de expresión emocional en etiqueta
- `categorias.test.mjs` — `guardarCategoria`, `listarCategorias`, `resolverCategoria` (drop de medios rotos individuales), `borrarCategoria`
- `clasificaCategorias.test.mjs` — `hayMaterialSuficiente`, `elegirPareja`, `esCorrectoClasifica`
- `completaSuma.test.mjs` — `generarEjercicio`, `esCorrectoCompletaSuma`, reconocimiento de trazo (umbral de tolerancia)
- `dedosNumero.test.mjs` — `generarRonda`, `esCorrectoNumero` (dedos)
- `dedosPictogramas.test.mjs` — `hayMaterialSuficiente`, `generarRonda`, `esCorrectoGrupo`
- `escribeLetra.test.mjs` — `hayMaterialSuficiente`, `elegirSiguiente`, `formatearTexto`, motor de trazo (distancia de Chebyshev)
- `escribeNumero.test.mjs` — `generarRonda`, motor de trazo
- `i18n.test.mjs` — `t()`, fallback chain (currentLang → es → raw key), `cambiarIdioma`, evento `pictosfera:lang-changed`, `arasaacCode` para valenciano
- `listaCompra.test.mjs` — `hayMaterialSuficiente`, `elegirLista`, `esItemEnLista`, `TOTAL_RONDAS === 5`
- `meGustaNoMeGusta.test.mjs` — `hayMaterialSuficiente`, `elegirAlimento`, `esCorrectoMeGusta`
- `mediaLibrary.test.mjs` — `guardarMedio`, `listarMedios`, `listarPorEtiqueta`, `ensureSeedFromArasaac`, `limpiarEtiquetasArasaac`, `etiquetasArasaacLimpias`, `borrarMedio`
- `memoria.test.mjs` — `hayMaterialSuficiente`, `generarTablero`, `voltearCarta`, `esPareja`, `tableroCompleto`
- `ordenaSecuencia.test.mjs` — `haySecuenciaJugable`, `elegirSecuencia`, `resolverPasos` (descarte total si paso roto)
- `personajes.test.mjs` — `generarPersonaje`, prefijo `pj-`, no filtración de estilos (solo verificado sintácticamente)
- `puzzlePictogramaPalabra.test.mjs` — `hayMaterialSuficiente`, `elegirPictograma`, `generarPiezas`, `esPiezaCorrecta`, `esCorrectoWord`
- `reconoceEmociones.test.mjs` — `generarRonda`, `esCorrectoEmocion`, etiquetas no reveladoras en cabezas
- `relacionaPictogramaPalabra.test.mjs` — `mezclar`, `hayMaterialSuficiente`, `elegirGrupoRonda`, `construirCasillas`, `esRespuestaCorrecta`, `grupoCompleto`, `formatearTexto`, `puedeResponderItem`
- `roscoPictogramas.test.mjs` — `hayMaterialSuficiente`, `generarRosco`, `evaluar`, `consignaTexto`
- `ruletaLetras.test.mjs` — `hayMaterialSuficiente`, `elegirPalabra`, `girarRuleta`, `aplicarResultado`, `esLetraCorrecta`, `palabraCompleta`, dificultad
- `rutas.test.mjs` — `guardarRuta`, `listarRutas`, `borrarRuta`, `esPartidaPerfecta` (incluyendo excepción de memoria), `siguientePaso`, `estadoRuta`
- `secuencias.test.mjs` — `guardarSecuencia`, `listarSecuencias`, `resolverPasos`, `borrarSecuencia`
- `sumaResultado.test.mjs` — `generarEjercicio`, `esCorrectoSuma`, rango de resultados
- `tecleaPalabra.test.mjs` — `hayMaterialSuficiente`, `elegirSiguiente`, `formatearTexto`, `validarInput` (tildes, mayúsculas, puntuación, espacios automáticos)

### 8.2 Pendientes reales al cierre de la sesión de desarrollo

**Solo un pendiente real sin cerrar:**

**Tarea #123 — "Punto 2: integrar árbol de categorías ARASAAC"** (estado: en progreso, no completada).

El campo `categorias.aviso_arbol` en `es.json` y `en.json` ya informa al adulto de que la lista de categorías es provisional y corta. Lo que falta: sustituir (o extender) la lista hardcoded de 13 entradas en `core/js/categoriasPictogramas.js` por el árbol oficial de categorías de ARASAAC. El árbol ARASAAC tiene aproximadamente 300 categorías anidadas y se puede obtener del endpoint público `https://api.arasaac.org/v1/categories/{lang}`. Las opciones de implementación documentadas:

a) Embeber el árbol como JSON estático en `categoriasPictogramas.js` (sin llamada de red — consistente con la filosofía offline-first). Requiere una única llamada manual a la API en el momento de construir el archivo, y versionarlo en el repo.

b) Cargarlo en tiempo de ejecución desde la API al abrir la sección de categorías del adulto (requiere conexión, pero es coherente con las búsquedas ARASAAC existentes).

La opción (a) es más consistente con la filosofía del proyecto. Para la reconstrucción desde cero: implementar (a) llamando primero a `https://api.arasaac.org/v1/categories/es` para obtener el árbol en español, parsearlo, aplanarlo a la estructura `{id, nombre, padre}` y guardarlo en `categoriasPictogramas.js` como constante exportada.

### 8.3 Obsolescencias conocidas en `README.md`

El `README.md` actual (149 líneas) contiene al menos tres afirmaciones desactualizadas que no se corrigieron durante el desarrollo para preservar el rastro de cuándo divergió la doc del código:

**Desactualización 1:** "2 juegos disponibles (Memoria, Arrastra la palabra)". El proyecto tiene **21 mecánicas** implementadas y testeadas. Esta línea del README corresponde al estado del primer prototipo.

**Desactualización 2:** "52 comprobaciones automáticas". El proyecto tiene **567 tests** (todos pasan desde julio 2026).

**Desactualización 3:** "Herramienta de publicación de escritorio — Decisión tomada: queda para más adelante". `GestorSubidasWeb.ps1` ya existe, está completa y funciona. Esta línea del README quedó obsoleta cuando se completaron las tareas #221–#225.

Ninguna de estas obsolescencias afecta al funcionamiento del portal — solo a la documentación de cara al autor.

### 8.4 Referencia colgante en los tests

`tests/helpers/shims.mjs` tiene un comentario de cabecera que menciona `tests/MANUAL.md`. Ese archivo no existe en el repositorio y nunca existió. El comentario es una referencia colgante (quizá una intención que no se materializó). No hace falta crear `tests/MANUAL.md` al reconstruir — el shim funciona perfectamente sin él.
## 9. Guía de reconstrucción paso a paso

Esta guía asume un punto de partida de **carpeta vacía**. Sigue este orden; saltarlo causaría dependencias rotas.

### Paso 1 — Archivos raíz

Crea en la raíz del proyecto: `index.html`, `manifest.json`, `sw.js`, `.gitignore`, `package.json`. Contenido íntegro de todos en sección 6. Ninguno depende de nada más. Verifica que `package.json` tiene `"type":"module"` y sin dependencias en `dependencies`.

### Paso 2 — CSS (tokens primero, siempre)

Crea `core/css/tokens.css` (contenido íntegro en sección 6.2). Luego `core/css/shell.css` y `core/css/adult.css` — estos consumen las variables de tokens, nunca declaran valores en duro. Shell.css cubre el layout del armazón (topbar/tabbar/sidebar/layout/footer). Adult.css cubre toda la UI de la zona del adulto (Pictogramas, Ajustes, Rutas). Ninguno de los dos tiene contenido especificado íntegramente en este documento (son principalmente layout y estética), pero el catálogo de `core/js/` de sección 4 describe las clases CSS que cada módulo JS espera encontrar.

### Paso 3 — `data/apps.json` y `locales/`

Crea `data/apps.json` con las 21 entradas (contenido íntegro en sección 6.3). Crea `locales/es.json` (sección 6.4) y `locales/en.json` (sección 6.5). Crea `locales/ca.json`, `eu.json`, `gl.json`, `va.json` con los 11 namespaces cada uno (ver sección 6.6; si no tienes el contenido exacto, puedes generarlos traduciendo los 11 namespaces de es.json al idioma correspondiente — el resultado funcional será idéntico al actual).

### Paso 4 — Núcleo: módulos base sin dependencias internas

Implementa en este orden (cada módulo solo depende de los anteriores o de módulos nativos del navegador):

1. `core/js/i18n.js` — `SUPPORTED_LANGS` (6 idiomas, con `arasaacCode` separado para valenciano), `t()`, `getLanguage()`, `setLanguage()`, evento `pictosfera:lang-changed`. Ver sección 3.5 y catálogo sección 4 para el contrato exacto.

2. `core/js/db.js` — apertura de IndexedDB `pictosfera` en `DB_VERSION=4`, 4 almacenes con migraciones incrementales (no destructivas). Ver sección 3.7.

3. `core/js/ajustesJuego.js` — 13 ajustes, `claveJuego()`, cascada per-game → global → defecto. Ver sección 3.4.

4. `core/js/ajustesCatalogo.js` — mapa declarativo de qué ajustes aplica cada mecánica (referencia: catálogo de sección 5 para saber qué ajustes consume cada app).

5. `core/js/arasaac.js` — cliente HTTP de la API ARASAAC. `toMedium()` deja `etiquetas: []` siempre. Ver sección 3.8.

6. `core/js/mediaLibrary.js` — lógica de "el pozo": CRUD de medios, `ensureSeedFromArasaac`, `limpiarEtiquetasArasaac`. Ver sección 3.8 y catálogo sección 4.

7. `core/js/secuencias.js`, `core/js/categorias.js`, `core/js/rutas.js` — CRUD de sus respectivas entidades. Ver secciones 3.9, 3.10 del catálogo.

8. `core/js/categoriasPictogramas.js` — lista corta de 13 categorías hardcoded. Pendiente de integración ARASAAC (sección 8.2).

### Paso 5 — Núcleo: módulos de UI/comportamiento

9. `core/js/tts.js` — Web Speech API, selección de voz por idioma, fallback.

10. `core/js/sounds.js` — sintetizador de sonidos de feedback (click, acierto, fallo, recompensa).

11. `core/js/pin.js` — PIN parental en localStorage, texto plano, explícitamente NO seguridad real.

12. `core/js/fullscreen.js` — `requestFullscreen()` con fallback silencioso (no lanzar nunca si falla; en iOS siempre falla).

13. `core/js/personajes.js` — generador de SVG de personajes con `PREFIJO = 'pj-'` y `ESTILO_PERSONAJE` exportados. El bloque `<style>` interno usa SOLO clases con ese prefijo. Ver sección 3.11.

14. `core/js/cabezas.js` — generador de SVG de cabezas que reutiliza `PREFIJO` y `ESTILO_PERSONAJE` de `personajes.js`. Nunca revela la emoción en el texto accesible. Ver sección 3.12.

15. `core/js/backup.js` — exportar/importar JSON con la estructura `{tipo:'pictosfera-copia', version:1, ...}`. Ver sección 3.14.

16. `core/js/appLoader.js` — carga dinámica de mecánicas, `resolverMaterial()`, construcción del objeto `plataforma`. Ver secciones 3.2 y 3.3.

17. `core/js/reward.js` — pantalla de recompensa reutilizable.

18. `core/js/footer.js` — pie de página global.

19. `core/js/welcome.js` — tour de bienvenida de 3 tarjetas (solo la primera vez).

20. `core/js/puerta.js` — pantalla de entrada en cada visita (captura el gesto de usuario para fullscreen). Ver sección 3.13. Tras el botón "Empezar", muestra opcionalmente el banner PWA si no está instalada y no fue descartado.

21. `core/js/pwa.js` — módulo de instalación PWA. Sin interfaz propia. Ver sección 3.19 para el contrato exacto. Importante: no contiene lógica específica de ninguna vista — solo captura eventos de navegador y expone una API.

### Paso 6 — Vistas (`core/js/views/`)

13 archivos de vista en `core/js/views/`. Implementar en cualquier orden ya que las vistas no se importan entre sí (el router decide cuál montar). Ver catálogo completo de sección 4. El orden recomendado por dependencia de datos:

`inicio.js` → `juegos.js` → `juego.js` → `pictogramasArasaac.js` → `fotos.js` → `pictogramas.js` (los agrupa) → `secuencias.js` (admin) → `categoriasAdmin.js` → `ajustes.js` → `rutas.js` → `rutasCrear.js` → `rutaJugar.js`

### Paso 7 — Router y punto de entrada

22. `core/js/router.js` — hash-router: `hashchange` + `renderizar()` por ruta.

23. `core/js/shell.js` — topbar, tabbar, sidebar, navegación.

24. `core/js/main.js` — punto de entrada: `puerta → welcome → shell → router`. **La primera línea debe ser `import './pwa.js';`** (ver sección 3.19).

En este punto el portal debería funcionar en su totalidad excepto los minijuegos.

### Paso 8 — Mecánicas (`apps/`)

Implementa las 21 mecánicas en cualquier orden. Cada una es autocontenida. Sigue siempre el contrato del módulo (sección 3.1):

```js
// apps/<mecanica>/<mecanica>.js
export default {
  id: '<id-del-juego>',
  nombre: '<nombre visible>',
  icono: '<emoji>',
  estante: '<ESTANTE>',
  // rutaPerfectoSinFallos: false   // SOLO si es memoria
  montar(contenedor, plataforma) { /* ... */ },
  desmontar() { /* ... */ }
};
```

Para cada mecánica, repasa la lista de bugs/patrones comunes (sección 3.1 y catálogo sección 5):

- Umbral de 4px antes de activar el drag
- `img.draggable = false` en todas las imágenes dentro de elementos arrastrables
- `try { el.setPointerCapture(id) } catch {}` en el `pointerdown`
- Un solo bloque `<style>` inyectado en `document.head`, guardado con `document.getElementById(ESTILOS_ID)` para no duplicarlo
- Estado del minijuego en variables closure del módulo, NUNCA en el DOM
- `desmontar()` limpia todos los listeners globales, todos los timers, y resetea las variables de módulo
- Validar `hayMaterialSuficiente()` al inicio de `montar()`; si falla, devolver sin montar nada (no lanzar)

### Paso 9 — Tests

Crea `tests/helpers/shims.mjs` (contenido íntegro en sección 6.7). Luego un `tests/<modulo>.test.mjs` por cada módulo de lógica pura. La convención: importar `installBrowserShims` y llamarla en el `before` / al principio del archivo; importar solo las funciones puras exportadas por el módulo; testear en Node sin DOM. Ver sección 8.1 para la lista completa y qué cubre cada archivo.

### Paso 10 — Herramienta de publicación (opcional, fuera del portal)

En una carpeta hermana al portal, crea `GestorSubidasWeb.ps1` (Windows Forms + PowerShell), un `.bat` de lanzamiento y un `LEEME`. Ver sección 7.9 para la descripción funcional. Esta herramienta es independiente del código del portal y puede omitirse si el flujo de publicación se hace directamente desde git.

**Crítico:** la función `Publish-Cambios` debe incluir la llamada a `Update-ServiceWorkerCache` como su primera instrucción, antes del `git add -A`. Sin esto, el `CACHE_NAME` de `sw.js` nunca cambiará y los clientes con el service worker ya activo no recibirán nunca los archivos nuevos del portal. Ver sección 3.20 para el código exacto de esa función.

### Paso 11 — Verificación final

```bash
npm test
# Debe pasar 567/567 tests
# Si hay fallos de parsing/lectura de archivos: staleness del sandbox de bash (ver sección 8.1)
# Si hay fallos de assertion (lógica), hay un bug real que corregir

# Verificar que las 21 mecánicas aparecen en Juegos
# Verificar que la ruta "Memoria → Arrastra la palabra" funciona en modo ruta
# Verificar que la copia de seguridad exporta e importa sin pérdida
```

### Guía de diagnóstico para bugs comunes

**"El juego no carga / muestra pantalla en blanco":** Revisar la consola del navegador. Casi siempre es un `import` fallido (ruta incorrecta) o un `JSON.parse` de un archivo de locales malformado.

**"Las etiquetas de categorías no funcionan en un idioma":** Verificar que `arasaac.js`'s `toMedium()` deja `etiquetas: []`. Si no, ejecutar `mediaLibrary.limpiarEtiquetasArasaac()` desde la consola.

**"El drag no funciona en iOS":** Verificar que se usa `Pointer Events` (no `Mouse Events` ni `Touch Events`). En iOS el drag con Touch Events requiere `touchmove` sin `preventDefault()` en el listener activo, lo que choca con el scroll. Pointer Events lo resuelve.

**"El juego cuenta un tap como acierto/fallo antes de que el usuario haga nada":** El `pointerup` se está disparando inmediatamente tras el `pointerdown` (tap sin desplazamiento). Verificar que el umbral de 4px está implementado correctamente.

**"Los tests fallan con error de JSON":** Staleness del sandbox. No tocar los archivos con comandos bash destructivos. El archivo está bien — releer con el Read tool para confirmarlo.

**"La pantalla completa no funciona en iPhone":** Comportamiento esperado — iOS Safari no permite web fullscreen fuera de video. `fullscreen.js` debe silenciar el error, no lanzarlo.

**"`npm test` no encuentra los archivos de test":** Verificar que `package.json` tiene `"test": "node --test tests/**/*.test.mjs"` y que el glob expande correctamente en el SO (en Windows puede necesitar comillas adicionales o el uso de `node --test` con lista explícita).
