// Pictosfera — núcleo: texto a voz (TTS).
//
// La voz la pone el navegador/dispositivo, no el portal. Aquí solo se
// elige la mejor voz disponible para el idioma activo y se avisa con
// claridad cuando no hay ninguna instalada.

import { getLanguageInfo } from './i18n.js';

let voicesReadyPromise = null;

function loadVoices() {
  if (!('speechSynthesis' in window)) return Promise.resolve([]);
  const existing = speechSynthesis.getVoices();
  if (existing.length) return Promise.resolve(existing);
  if (voicesReadyPromise) return voicesReadyPromise;
  voicesReadyPromise = new Promise((resolve) => {
    const onChange = () => {
      const voices = speechSynthesis.getVoices();
      if (voices.length) {
        speechSynthesis.removeEventListener('voiceschanged', onChange);
        resolve(voices);
      }
    };
    speechSynthesis.addEventListener('voiceschanged', onChange);
    // Algunos navegadores nunca disparan el evento si no hay voces: no
    // esperamos eternamente.
    setTimeout(() => resolve(speechSynthesis.getVoices()), 1500);
  });
  return voicesReadyPromise;
}

function prefix(lang) {
  return lang.split('-')[0].toLowerCase();
}

async function findVoice(speechLang) {
  const voices = await loadVoices();
  if (!voices.length) return null;
  const exact = voices.find((v) => v.lang.toLowerCase() === speechLang.toLowerCase());
  if (exact) return exact;
  const samePrefix = voices.find((v) => prefix(v.lang) === prefix(speechLang));
  return samePrefix || null;
}

export function isSupported() {
  return 'speechSynthesis' in window;
}

/** ¿Hay alguna voz instalada para el idioma activo (o su alternativa)? */
export async function hasVoiceForActiveLanguage() {
  if (!isSupported()) return false;
  const info = getLanguageInfo();
  const voice = await findVoice(info.speechLang);
  if (voice) return true;
  if (info.speechFallback) return Boolean(await findVoice(info.speechFallback));
  return false;
}

/**
 * Lee un texto en voz alta usando el idioma activo. Si el dispositivo
 * no tiene voz para ese idioma, prueba el idioma de repuesto definido
 * en i18n.js (p.ej. valenciano → catalán → castellano) antes de
 * rendirse en silencio. Nunca lanza una excepción que rompa el juego.
 */
export async function speak(text) {
  if (!isSupported() || !text) return false;
  const info = getLanguageInfo();
  let voice = await findVoice(info.speechLang);
  let lang = info.speechLang;
  if (!voice && info.speechFallback) {
    voice = await findVoice(info.speechFallback);
    lang = info.speechFallback;
  }
  try {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    if (voice) utterance.voice = voice;
    utterance.rate = 0.95;
    speechSynthesis.speak(utterance);
    return Boolean(voice);
  } catch (err) {
    console.warn('[tts] No se pudo hablar:', err);
    return false;
  }
}


/**
 * Lee texto1, espera pausaMs milisegundos al terminar y luego lee texto2.
 * Útil para insertar una pausa controlada entre dos fragmentos TTS (p.ej.
 * el nombre de un pictograma y una pregunta posterior).
 */
export async function speakConPausa(texto1, pausaMs, texto2) {
  if (!isSupported() || !texto1) return;
  const info = getLanguageInfo();
  let voice = await findVoice(info.speechLang);
  let lang = info.speechLang;
  if (!voice && info.speechFallback) {
    voice = await findVoice(info.speechFallback);
    lang = info.speechFallback;
  }
  try {
    speechSynthesis.cancel();
    const u1 = new SpeechSynthesisUtterance(texto1);
    u1.lang = lang;
    if (voice) u1.voice = voice;
    u1.rate = 0.95;
    u1.onend = () => {
      if (!texto2) return;
      setTimeout(() => {
        try {
          const u2 = new SpeechSynthesisUtterance(texto2);
          u2.lang = lang;
          if (voice) u2.voice = voice;
          u2.rate = 0.95;
          speechSynthesis.speak(u2);
        } catch (err) {
          console.warn('[tts] speakConPausa — segundo fragmento fallido:', err);
        }
      }, pausaMs);
    };
    speechSynthesis.speak(u1);
  } catch (err) {
    console.warn('[tts] speakConPausa fallido:', err);
  }
}

export function stop() {
  if (isSupported()) speechSynthesis.cancel();
}
