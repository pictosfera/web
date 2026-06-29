// Pictosfera — núcleo: sonidos de interfaz.
//
// En vez de cargar archivos de audio (que habría que descargar y
// mantener), los sonidos se generan en el momento con la Web Audio
// API. Son cortos y discretos: clic, acierto, fallo.

let ctx = null;

function getCtx() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    ctx = new AudioCtx();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone({ freq, start, duration, type = 'sine', gain = 0.18 }) {
  const audioCtx = getCtx();
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const amp = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  amp.gain.value = 0;
  osc.connect(amp);
  amp.connect(audioCtx.destination);
  const t0 = audioCtx.currentTime + start;
  amp.gain.linearRampToValueAtTime(gain, t0 + 0.02);
  amp.gain.linearRampToValueAtTime(0, t0 + duration);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

/** Necesario en algunos navegadores: desbloquea el audio tras el
 *  primer toque del usuario. Llamar una vez, p.ej. en el primer clic. */
export function unlock() {
  getCtx();
}

export function click() {
  tone({ freq: 520, start: 0, duration: 0.06, type: 'sine', gain: 0.12 });
}

export function acierto() {
  tone({ freq: 523.25, start: 0, duration: 0.12 });
  tone({ freq: 659.25, start: 0.1, duration: 0.12 });
  tone({ freq: 783.99, start: 0.2, duration: 0.18 });
}

export function fallo() {
  tone({ freq: 220, start: 0, duration: 0.18, type: 'triangle', gain: 0.15 });
  tone({ freq: 180, start: 0.12, duration: 0.22, type: 'triangle', gain: 0.15 });
}

export function recompensa() {
  [523.25, 587.33, 659.25, 783.99, 1046.5].forEach((freq, i) => {
    tone({ freq, start: i * 0.1, duration: 0.2, gain: 0.16 });
  });
}
