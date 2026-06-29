// Pictosfera — lista curada de categorías de pictogramas y fotos.
//
// Vive en su propio módulo (y no dentro de una vista concreta) porque
// la usan dos vistas distintas: "Pictogramas" (ARASAAC), para limpiar
// etiquetas en inglés que no estén en esta lista (ver
// mediaLibrary.limpiarEtiquetasArasaac), e "Imágenes propias", para las
// chips de "elegir categoría" al añadir una foto. Mientras no exista el
// árbol oficial de categorías de ARASAAC (ver categorias.aviso_arbol en
// los idiomas), esta lista corta hace de categorías "de fábrica".
export const CATEGORIAS_CURADAS = [
  'comida', 'animales', 'ropa', 'colores', 'familia', 'cuerpo',
  'escuela', 'juguetes', 'naturaleza', 'emociones', 'numeros', 'acciones'
];
