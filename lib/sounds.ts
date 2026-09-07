// Generate and play sound effects using the Web Audio API
// No external audio files needed — all sounds are synthesized

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

/** Play a short "dart impact" sound — a quick percussive thump.
 *  Mimics the sound of a dart hitting a board. */
export function playDartSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Create noise buffer for a more percussive, traditional dart sound
    const bufferSize = ctx.sampleRate * 0.08; // 80ms of noise
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);

    // Fill with white noise
    for (let i = 0; i < bufferSize; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }

    // Create noise source
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    // Create a low-pass filter to shape the noise (more bassy for a thump)
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(4000, now);
    filter.Q.setValueAtTime(0.8, now);

    // Gain envelope — quick attack, rapid decay for impact
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.08);

    // Connect and play
    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noiseSource.start(now);
    noiseSource.stop(now + 0.08);
  } catch (err) {
    // Silently ignore errors (audio context may not be available, or user hasn't interacted yet)
  }
}
