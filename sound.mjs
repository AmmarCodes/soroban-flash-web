const tones = {
  flash: [[540, 0]],
  correct: [[660, 0], [880, 0.09]],
  incorrect: [[330, 0]],
};

let context;

export async function unlockSound() {
  try {
    const Audio = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!Audio) return;
    context ??= new Audio();
    if (context.state !== 'running') await context.resume();
  } catch {
    // Some browsers block audio. Practice can continue in silence.
  }
}

export function playSound(name) {
  if (context?.state !== 'running') return;
  for (const [frequency, delay] of tones[name]) {
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const volume = context.createGain();
    oscillator.frequency.value = frequency;
    volume.gain.setValueAtTime(0, start);
    volume.gain.linearRampToValueAtTime(0.035, start + 0.012);
    volume.gain.linearRampToValueAtTime(0, start + 0.075);
    oscillator.connect(volume);
    volume.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.08);
  }
}
