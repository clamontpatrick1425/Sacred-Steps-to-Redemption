/**
 * Devotional Soundscape Generator & Audio Utility
 * Generates custom, high-fidelity soothing devotional music loops tailored to each
 * weekly theme's genre (Country Gospel, Gospel Rap, Gospel Soul, Afroswing-Gospel, etc.)
 * using browser-native Web Audio API and OfflineAudioContext.
 * 
 * Supports:
 * - Real-time in-app streaming playback with audio visualizer
 * - Offline audio rendering to standard 16-bit stereo WAV files for direct download
 */

// Genre musical scales & chord progressions (Frequencies in Hz)
const CHORD_PROFILES: Record<string, number[][]> = {
  'Country Gospel': [
    [196.00, 246.94, 293.66, 392.00], // G major
    [220.00, 261.63, 329.63, 440.00], // A minor
    [174.61, 220.00, 261.63, 349.23], // F major
    [261.63, 329.63, 392.00, 523.25], // C major
  ],
  'Gospel Soul': [
    [174.61, 220.00, 261.63, 329.63], // Fmaj7
    [164.81, 207.65, 246.94, 311.13], // E7#9
    [220.00, 261.63, 329.63, 392.00], // Am7
    [196.00, 246.94, 293.66, 349.23], // G7
  ],
  'Gospel Rap': [
    [130.81, 155.56, 196.00, 246.94], // C minor / sub
    [116.54, 138.59, 174.61, 220.00], // Bb minor
    [123.47, 146.83, 185.00, 233.08], // B major
    [110.00, 130.81, 164.81, 207.65], // Ab major
  ],
  'Gospel Blues': [
    [146.83, 185.00, 220.00, 261.63], // D7
    [196.00, 246.94, 293.66, 349.23], // G7
    [146.83, 185.00, 220.00, 261.63], // D7
    [220.00, 277.18, 329.63, 392.00], // A7
  ],
  'Gospel House': [
    [261.63, 329.63, 392.00, 523.25], // C major 4/4
    [196.00, 246.94, 293.66, 392.00], // G
    [220.00, 261.63, 329.63, 440.00], // Am
    [174.61, 220.00, 261.63, 349.23], // F
  ],
  'Amapiano-Gospel': [
    [146.83, 220.00, 261.63, 329.63], // Dm9 / log drum bass
    [164.81, 246.94, 293.66, 369.99], // Em9
    [174.61, 261.63, 329.63, 392.00], // Fmaj7
    [196.00, 293.66, 369.99, 440.00], // G6
  ],
  'Afrobeats-Gospel': [
    [196.00, 246.94, 293.66, 392.00], // G major bounce
    [220.00, 261.63, 329.63, 440.00], // Am
    [246.94, 293.66, 369.99, 493.88], // Bm
    [261.63, 329.63, 392.00, 523.25], // C
  ],
  'Afroswing-Gospel': [
    [220.00, 261.63, 329.63, 392.00], // Am7 swing
    [146.83, 174.61, 220.00, 261.63], // Dm7
    [164.81, 196.00, 246.94, 293.66], // Em7
    [174.61, 220.00, 261.63, 329.63], // Fmaj7
  ],
  'Afro-Highlife Gospel': [
    [261.63, 329.63, 392.00, 523.25], // C highlife
    [174.61, 220.00, 261.63, 349.23], // F
    [196.00, 246.94, 293.66, 392.00], // G
    [261.63, 329.63, 392.00, 523.25], // C
  ],
  'Country Drill': [
    [146.83, 174.61, 220.00, 261.63], // Dm drill slide
    [130.81, 164.81, 196.00, 246.94], // C
    [116.54, 146.83, 174.61, 220.00], // Bb
    [110.00, 138.59, 164.81, 207.65], // A
  ],
  'Gospel Drill': [
    [130.81, 155.56, 196.00, 233.08], // Cm drill
    [116.54, 138.59, 174.61, 207.65], // Bbm
    [123.47, 146.83, 185.00, 220.00], // B
    [110.00, 130.81, 164.81, 196.00], // Ab
  ],
  'Gospel Trap': [
    [110.00, 130.81, 164.81, 220.00], // Am trap
    [174.61, 220.00, 261.63, 349.23], // F
    [130.81, 164.81, 196.00, 261.63], // C
    [164.81, 196.00, 246.94, 329.63], // Em
  ],
};

const DEFAULT_CHORDS = [
  [196.00, 246.94, 293.66, 392.00],
  [220.00, 261.63, 329.63, 440.00],
  [174.61, 220.00, 261.63, 349.23],
  [261.63, 329.63, 392.00, 523.25]
];

/**
 * Synthesizes a devotional audio soundtrack using OfflineAudioContext.
 */
export async function renderDevotionalAudio(
  genre: string = 'Country Gospel',
  durationSeconds: number = 24,
  sampleRate: number = 44100
): Promise<AudioBuffer> {
  const offlineCtx = new OfflineAudioContext(2, sampleRate * durationSeconds, sampleRate);
  const chords = CHORD_PROFILES[genre] || DEFAULT_CHORDS;

  const chordDuration = durationSeconds / chords.length;

  // Master bus
  const masterGain = offlineCtx.createGain();
  masterGain.gain.setValueAtTime(0.75, 0);

  // Convolver / Reverb simulation filter
  const filter = offlineCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(genre.includes('Drill') || genre.includes('Trap') ? 1400 : 2800, 0);
  filter.Q.setValueAtTime(1.2, 0);

  masterGain.connect(filter);
  filter.connect(offlineCtx.destination);

  // Synthesize chord beds & melodic arpeggios
  chords.forEach((chord, chordIdx) => {
    const startTime = chordIdx * chordDuration;
    const endTime = startTime + chordDuration;

    // Warm pad oscillator for each note
    chord.forEach((freq, noteIdx) => {
      // Warm sawtooth/triangle pad
      const padOsc = offlineCtx.createOscillator();
      const padGain = offlineCtx.createGain();
      
      padOsc.type = genre.includes('Soul') || genre.includes('House') ? 'triangle' : 'sine';
      padOsc.frequency.setValueAtTime(freq, startTime);

      // Gentle vibrato
      const lfo = offlineCtx.createOscillator();
      const lfoGain = offlineCtx.createGain();
      lfo.frequency.setValueAtTime(4.5, startTime);
      lfoGain.gain.setValueAtTime(1.5, startTime);
      lfo.connect(padOsc.frequency);
      lfo.start(startTime);
      lfo.stop(endTime);

      // Envelope
      padGain.gain.setValueAtTime(0.001, startTime);
      padGain.gain.exponentialRampToValueAtTime(0.12 / chord.length, startTime + 0.6);
      padGain.gain.setValueAtTime(0.12 / chord.length, endTime - 0.5);
      padGain.gain.exponentialRampToValueAtTime(0.0001, endTime);

      padOsc.connect(padGain);
      padGain.connect(masterGain);

      padOsc.start(startTime);
      padOsc.stop(endTime);

      // Arpeggiated melody note
      const arpStartTime = startTime + (noteIdx * 0.7);
      if (arpStartTime + 1.2 < endTime) {
        const bellOsc = offlineCtx.createOscillator();
        const bellGain = offlineCtx.createGain();

        bellOsc.type = 'sine';
        bellOsc.frequency.setValueAtTime(freq * 2, arpStartTime);

        bellGain.gain.setValueAtTime(0.001, arpStartTime);
        bellGain.gain.exponentialRampToValueAtTime(0.18, arpStartTime + 0.05);
        bellGain.gain.exponentialRampToValueAtTime(0.0001, arpStartTime + 1.2);

        bellOsc.connect(bellGain);
        bellGain.connect(masterGain);

        bellOsc.start(arpStartTime);
        bellOsc.stop(arpStartTime + 1.25);
      }
    });

    // Gentle devotional sub/root bass
    const rootFreq = chord[0] / 2;
    const bassOsc = offlineCtx.createOscillator();
    const bassGain = offlineCtx.createGain();

    bassOsc.type = genre.includes('Rap') || genre.includes('Trap') || genre.includes('Drill') ? 'triangle' : 'sine';
    bassOsc.frequency.setValueAtTime(rootFreq, startTime);

    bassGain.gain.setValueAtTime(0.001, startTime);
    bassGain.gain.exponentialRampToValueAtTime(0.25, startTime + 0.2);
    bassGain.gain.setValueAtTime(0.25, endTime - 0.4);
    bassGain.gain.exponentialRampToValueAtTime(0.0001, endTime);

    bassOsc.connect(bassGain);
    bassGain.connect(masterGain);

    bassOsc.start(startTime);
    bassOsc.stop(endTime);
  });

  return await offlineCtx.startRendering();
}

/**
 * Converts a standard Web Audio AudioBuffer into a WAV Blob suitable for streaming & download.
 */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const length = buffer.length * blockAlign;
  const bufferArray = new ArrayBuffer(44 + length);
  const view = new DataView(bufferArray);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, length, true);

  // Write interleaved PCM samples
  const channelData: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channelData.push(buffer.getChannelData(c));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channelData[c][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Triggers an immediate browser download of an audio blob.
 */
export function downloadSongFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}
