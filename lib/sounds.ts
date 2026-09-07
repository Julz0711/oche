// Generate and play sound effects using the Web Audio API
// No external audio files needed — all sounds are synthesized

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

/** Play a short "dart plop" sound — a quick attack with a brief decay.
 *  Mimics the sound of a dart hitting a board. */
export function playDartSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Oscillator for the plop sound — a brief sine wave burst
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);

    // Gain envelope for a quick attack and decay
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    // Connect and play
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  } catch (err) {
    // Silently ignore errors (audio context may not be available, or user hasn't interacted yet)
  }
}
