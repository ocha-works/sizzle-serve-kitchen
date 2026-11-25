// All sound is synthesised with the Web Audio API: short oscillator blips,
// no audio files. The kitchen stays silent until the player first interacts,
// because browsers only allow audio after a gesture.
export function createSoundBoard() {
  let context = null;
  let muted = false;

  function ensureContext() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  function playTone(frequency, duration, kind, volume) {
    if (muted) return;
    const audio = ensureContext();
    if (!audio) return;
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = kind || 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume || 0.08, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration);
  }

  return {
    unlock() { ensureContext(); },
    toggleMuted() { muted = !muted; return muted; },
    isMuted() { return muted; },
    pickup() { playTone(660, 0.09, 'sine', 0.07); },
    chop() { playTone(220, 0.06, 'square', 0.05); },
    chopDone() { playTone(520, 0.12, 'sine', 0.08); playTone(780, 0.12, 'sine', 0.06); },
    sizzle() { playTone(180, 0.2, 'sawtooth', 0.03); },
    ding() { playTone(880, 0.18, 'sine', 0.09); playTone(1320, 0.22, 'sine', 0.06); },
    serve() { playTone(523, 0.12, 'sine', 0.09); playTone(659, 0.12, 'sine', 0.09); playTone(784, 0.2, 'sine', 0.09); },
    wrong() { playTone(160, 0.2, 'square', 0.06); },
    tick() { playTone(980, 0.05, 'sine', 0.05); },
    orderUp() { playTone(440, 0.1, 'triangle', 0.08); playTone(587, 0.14, 'triangle', 0.08); },
  };
}
