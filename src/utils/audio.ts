/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Native sound synthesis using Web Audio API
export function playSingingBowl() {
  try {
    const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    // Fundamental frequencies for a rich brass singing bowl
    const baseFreq = 144; // Deep, soothing resonance (approx D3 / D#3)
    const harmonics = [1.0, 1.97, 2.92, 4.02, 5.16]; // Real ratio spikes of singing bowls
    const gains = [0.8, 0.45, 0.25, 0.12, 0.05];

    const now = ctx.currentTime;
    const duration = 7.0; // Beautiful 7 seconds long decay

    // Master Volume node
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.65, now + 0.15); // gentle fade in
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration); // smooth, organic decay
    masterGain.connect(ctx.destination);

    harmonics.forEach((ratio, idx) => {
      const osc = ctx.createOscillator();
      const waveGain = ctx.createGain();

      // Custom slight frequency offsets to make a beautiful organic beating effect
      const tilt = (idx + 1) * 0.15; 
      const beatFreq = idx % 2 === 0 ? 0.35 : -0.22;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * ratio, now);
      
      // Pitch modulation for authentic warmth
      osc.frequency.linearRampToValueAtTime(baseFreq * ratio + beatFreq, now + duration);

      // Sine wave levels
      waveGain.gain.setValueAtTime(gains[idx], now);
      waveGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * (1 - idx * 0.1));

      // LFO for volume pulsing beating effect
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(3.5 + beatFreq, now); // ~3-4 Hz heartbeat volume swell
      lfoGain.gain.setValueAtTime(0.12, now);
      lfoGain.gain.linearRampToValueAtTime(0.02, now + duration);

      // Connect LFO to modulate wave gain
      lfo.connect(lfoGain);
      lfoGain.connect(waveGain.gain);

      osc.connect(waveGain);
      waveGain.connect(masterGain);

      lfo.start(now);
      osc.start(now);

      lfo.stop(now + duration);
      osc.stop(now + duration);
    });

    // Close AudioContext when finished
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, duration * 1000 + 500);

  } catch (error) {
    console.warn("Singing bowl sound synthesis was not supported or initialized:", error);
  }
}
