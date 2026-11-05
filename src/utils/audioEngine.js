import { NOTE_NAMES, getNoteForStringFret } from '../data/musicData';

class GuitarAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.micStream = null;
    this.analyser = null;
    this.micSource = null;
    this.timeBuffer = null;
    this.isMicActive = false;
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.85;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Create tube overdrive curve for Gibson Overdrive tone
  makeDistortionCurve(amount = 65) {
    const k = typeof amount === 'number' ? amount : 50;
    const nSamples = 44100;
    const curve = new Float32Array(nSamples);
    const deg = Math.PI / 180;
    for (let i = 0; i < nSamples; ++i) {
      const x = (i * 2) / nSamples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  // Play a realistic guitar note by frequency (Hz) and tone ('acoustic' | 'clean' | 'overdrive')
  playFrequency(freq, tone = 'acoustic', duration = 1.4, volume = 0.42) {
    const ctx = this.initContext();
    const now = ctx.currentTime;

    const noteGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    if (tone === 'overdrive') {
      // Gibson Les Paul Overdrive Crunch: Sawtooth + Triangle + Tube Waveshaper + Cab Lowpass
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, now);
      osc2.frequency.setValueAtTime(freq * 2, now); // Harmonic overtone

      const shaper = ctx.createWaveShaper();
      shaper.curve = this.makeDistortionCurve(95);
      shaper.oversample = '4x';

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2400, now);
      filter.frequency.exponentialRampToValueAtTime(1100, now + duration);
      filter.Q.value = 2.8;

      const osc2Gain = ctx.createGain();
      osc2Gain.gain.value = 0.25;

      noteGain.gain.setValueAtTime(0.001, now);
      noteGain.gain.linearRampToValueAtTime(volume * 0.75, now + 0.012);
      noteGain.gain.exponentialRampToValueAtTime(volume * 0.45, now + 0.25);
      noteGain.gain.exponentialRampToValueAtTime(0.0008, now + duration * 1.25);

      osc1.connect(shaper);
      osc2.connect(osc2Gain);
      osc2Gain.connect(shaper);
      shaper.connect(filter);
      filter.connect(noteGain);
      noteGain.connect(this.masterGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration * 1.25);
      osc2.stop(now + duration * 1.25);
    } else if (tone === 'clean') {
      // Electric Clean Chorus: Dual detuned oscillators + warm amp filter
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'triangle';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq, now);
      osc2.frequency.setValueAtTime(freq * 1.003, now); // Subtle chorus shimmer

      const osc2Gain = ctx.createGain();
      osc2Gain.gain.value = 0.28;

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3200, now);
      filter.frequency.exponentialRampToValueAtTime(900, now + duration);
      filter.Q.value = 1.5;

      noteGain.gain.setValueAtTime(0.001, now);
      noteGain.gain.linearRampToValueAtTime(volume, now + 0.01);
      noteGain.gain.exponentialRampToValueAtTime(volume * 0.35, now + 0.22);
      noteGain.gain.exponentialRampToValueAtTime(0.0008, now + duration);

      osc1.connect(filter);
      osc2.connect(osc2Gain);
      osc2Gain.connect(filter);
      filter.connect(noteGain);
      noteGain.connect(this.masterGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration);
      osc2.stop(now + duration);
    } else {
      // Acoustic Dreadnought Warmth: Pluck transient + body resonance + warm harmonic decay
      const oscFund = ctx.createOscillator();
      const oscBody = ctx.createOscillator();
      oscFund.type = 'sawtooth';
      oscBody.type = 'triangle';
      oscFund.frequency.setValueAtTime(freq, now);
      oscBody.frequency.setValueAtTime(freq * 2, now);

      const bodyGain = ctx.createGain();
      bodyGain.gain.setValueAtTime(0.45, now);
      bodyGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3800, now);
      filter.frequency.exponentialRampToValueAtTime(650, now + duration * 0.85);
      filter.Q.value = 2.0;

      noteGain.gain.setValueAtTime(0.001, now);
      noteGain.gain.linearRampToValueAtTime(volume * 1.05, now + 0.008);
      noteGain.gain.exponentialRampToValueAtTime(volume * 0.38, now + 0.16);
      noteGain.gain.exponentialRampToValueAtTime(0.0008, now + duration);

      oscFund.connect(filter);
      oscBody.connect(bodyGain);
      bodyGain.connect(filter);
      filter.connect(noteGain);
      noteGain.connect(this.masterGain);

      oscFund.start(now);
      oscBody.start(now);
      oscFund.stop(now + duration);
      oscBody.stop(now + duration);
    }
  }

  playStringFret(stringNumber, fret, tone = 'acoustic', duration = 1.35) {
    const info = getNoteForStringFret(stringNumber, fret);
    this.playFrequency(info.freq, tone, duration);
    return info;
  }

  // Strum a 6-string chord array: frets = [str6, str5, str4, str3, str2, str1]
  strumChord(frets, tone = 'acoustic', arpeggio = false) {
    const delayMs = arpeggio ? 160 : 32;
    let activeIdx = 0;
    frets.forEach((fret, idx) => {
      if (fret < 0) return; // Muted string
      const stringNumber = 6 - idx;
      const delay = activeIdx * delayMs;
      activeIdx++;
      setTimeout(() => {
        this.playStringFret(stringNumber, fret, tone, arpeggio ? 1.5 : 1.8);
      }, delay);
    });
  }

  // Drum & Metronome percussion synthesizer
  playDrumOrClick(type = 'click', accent = false) {
    const ctx = this.initContext();
    const now = ctx.currentTime;

    if (type === 'kick') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(135, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.12);
      gain.gain.setValueAtTime(0.55, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (type === 'snare') {
      // Crisp snare + body
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(185, now);
      oscGain.gain.setValueAtTime(0.28, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      osc.connect(oscGain);
      oscGain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.11);

      const bufferSize = ctx.sampleRate * 0.12;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 900;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.24, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.masterGain);
      noise.start(now);
    } else {
      // Studio Woodblock / Click
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(accent ? 1180 : 780, now);
      osc.frequency.exponentialRampToValueAtTime(accent ? 590 : 390, now + 0.045);
      gain.gain.setValueAtTime(accent ? 0.38 : 0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.05);
    }
  }

  // Start Real-Time Microphone for Tuner & Highway Note Detection
  async startMicrophone() {
    if (this.isMicActive && this.analyser) return true;
    try {
      const ctx = this.initContext();
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          autoGainControl: false,
          noiseSuppression: false,
        },
      });
      this.micSource = ctx.createMediaStreamSource(this.micStream);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 4096;
      this.timeBuffer = new Float32Array(this.analyser.fftSize);
      this.micSource.connect(this.analyser);
      this.isMicActive = true;
      return true;
    } catch (err) {
      console.warn('Microphone access denied or unavailable:', err);
      this.isMicActive = false;
      return false;
    }
  }

  stopMicrophone() {
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }
    this.isMicActive = false;
  }

  // Normalized Autocorrelation Pitch Detection (Guitar range 65Hz – 1100Hz)
  getDetectedPitch() {
    if (!this.isMicActive || !this.analyser || !this.ctx) return null;
    this.analyser.getFloatTimeDomainData(this.timeBuffer);

    const buf = this.timeBuffer;
    const sampleRate = this.ctx.sampleRate;
    const size = buf.length;

    // 1. Check RMS signal energy
    let rms = 0;
    for (let i = 0; i < size; i++) {
      rms += buf[i] * buf[i];
    }
    rms = Math.sqrt(rms / size);
    if (rms < 0.011) return null; // Too quiet / background noise

    // 2. Trim edges for stable window
    const minPeriod = Math.floor(sampleRate / 1100); // ~1100 Hz max
    const maxPeriod = Math.floor(sampleRate / 62);   // ~62 Hz min (Drop C / Drop D)
    const searchLen = Math.min(2048, Math.floor(size / 2));

    let bestOffset = -1;
    let bestCorrelation = 0;
    const correlations = new Float32Array(maxPeriod + 2);

    for (let offset = minPeriod; offset <= maxPeriod; offset++) {
      let sum = 0;
      let norm1 = 0;
      let norm2 = 0;
      for (let i = 0; i < searchLen; i++) {
        const a = buf[i];
        const b = buf[i + offset];
        sum += a * b;
        norm1 += a * a;
        norm2 += b * b;
      }
      const denom = Math.sqrt(norm1 * norm2);
      const corr = denom > 0 ? sum / denom : 0;
      correlations[offset] = corr;

      if (corr > 0.82 && corr > bestCorrelation) {
        bestCorrelation = corr;
        bestOffset = offset;
        // Once we find a strong first peak above 0.90, prefer fundamental over sub-octave
        if (corr > 0.91) break;
      }
    }

    if (bestOffset === -1 || bestCorrelation < 0.80) return null;

    // Parabolic interpolation for sub-sample frequency precision
    const prev = correlations[bestOffset - 1] || correlations[bestOffset];
    const curr = correlations[bestOffset];
    const next = correlations[bestOffset + 1] || correlations[bestOffset];
    const shift = (next - prev) / (2 * (2 * curr - prev - next + 1e-9));
    const refinedPeriod = bestOffset + (Math.abs(shift) < 1 ? shift : 0);

    const frequency = sampleRate / refinedPeriod;
    if (frequency < 60 || frequency > 1200) return null;

    // Convert frequency to MIDI note and cents
    const exactMidi = 69 + 12 * Math.log2(frequency / 440);
    const midi = Math.round(exactMidi);
    const cents = Math.round((exactMidi - midi) * 100);
    const pitchClass = NOTE_NAMES[((midi % 12) + 12) % 12];
    const octave = Math.floor(midi / 12) - 1;

    return {
      frequency: Number(frequency.toFixed(1)),
      midi,
      note: `${pitchClass}${octave}`,
      pitchClass,
      octave,
      cents,
      rms: Number(rms.toFixed(3)),
      confidence: Number(bestCorrelation.toFixed(2)),
    };
  }
}

export const audioEngine = new GuitarAudioEngine();
