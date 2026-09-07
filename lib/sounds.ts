// Generate and play sound effects using the Web Audio API
// No external audio files needed — all sounds are synthesized

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

function playSoundInternal(startFreq: number, endFreq: number, duration: number) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  } catch (err) {
    // Silently ignore errors
  }
}

function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem('soundEnabled') !== 'false';
}

/** Play a single/miss dart sound — a dull thud. */
export function playDartSound(ringType: 'S' | 'D' | 'T' | 'OB' | 'IB' | 'M' = 'S') {
  if (!isSoundEnabled()) return;

  // Different frequencies for different dart types
  if (ringType === 'D') {
    // Double: higher pitch
    playSoundInternal(350, 260, 0.05);
  } else if (ringType === 'T') {
    // Triple: even higher pitch
    playSoundInternal(420, 310, 0.05);
  } else if (ringType === 'OB' || ringType === 'IB') {
    // Bull: highest pitch
    playSoundInternal(500, 380, 0.05);
  } else {
    // Single/Miss: default lower thud
    playSoundInternal(250, 180, 0.05);
  }
}

export function toggleSound() {
  const current = localStorage.getItem('soundEnabled') !== 'false';
  localStorage.setItem('soundEnabled', String(!current));
  return !current;
}

/** Play a synth melody for a perfect 180 (three triple 20s). */
export function play180Melody() {
  if (!isSoundEnabled()) return;

  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const tempo = 0.15; // Duration of each note

    // The melody: a triumphant ascending line
    // Notes: C5 E5 G5 C6 (simplified as relative frequencies)
    const frequencies = [
      523.25, // C5
      659.25, // E5
      783.99, // G5
      1046.5, // C6
    ];

    const playNote = (freq: number, startTime: number) => {
      const osc = ctx.createOscillator();
      osc.type = 'square'; // Square wave for that synth sound
      osc.frequency.setValueAtTime(freq, startTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.linearRampToValueAtTime(0.02, startTime + tempo);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + tempo);
    };

    // Play the melody
    frequencies.forEach((freq, i) => {
      playNote(freq, now + i * tempo);
    });
  } catch (err) {
    // Silently ignore errors
  }
}
