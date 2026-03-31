// ============================================
// 💋 KISS DEFENSE — AUDIO ENGINE
// Beethoven's Symphony No. 5 (Fate)
// ============================================

const NOTE_FREQ = {
    'G3': 196.00, 'Ab3': 207.65, 'F3': 174.61, 'Eb3': 155.56,
    'G4': 392.00, 'Ab4': 415.30, 'F4': 349.23, 'Eb4': 311.13,
    'G5': 783.99, 'Ab5': 830.61, 'F5': 698.46, 'Eb5': 622.25,
    'C4': 261.63, 'C5': 523.25, 'Bb3': 233.08
};

// Fate Motif: (R) 8 8 8 2 — (G-G-G-Eb)
const FATE_MELODY = [
    // Famous Motif 1
    {b:0.0, n:'G4', d:0.2}, {b:0.25, n:'G4', d:0.2}, {b:0.5, n:'G4', d:0.2}, {b:0.75, n:'Eb4', d:1.5},
    // Famous Motif 2
    {b:2.5, n:'F4', d:0.2}, {b:2.75, n:'F4', d:0.2}, {b:3.0, n:'F4', d:0.2}, {b:3.25, n:'D4', d:1.5},
    // Variation
    {b:5.0, n:'G4', d:0.2}, {b:5.25, n:'G4', d:0.2}, {b:5.5, n:'G4', d:0.2}, {b:5.75, n:'Eb4', d:0.8},
    {b:6.5, n:'Ab4', d:0.2}, {b:6.75, n:'Ab4', d:0.2}, {b:7.0, n:'Ab4', d:0.2}, {b:7.25, n:'G4', d:1.5},
];
const MELODY_LENGTH_BEATS = 8;

class AudioEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.isPlaying = false;
        this.bpm = 108; // Fate tempo is slower but more punctuated
        this.currentBeat = 0;
        this.nextNoteTime = 0;
        this.schedulerInterval = null;
        this.onBeat = null; 
    }

    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.6;
        
        this.compressor = this.ctx.createDynamicsCompressor();
        this.reverb = this.ctx.createConvolver();
        this.reverb.buffer = this._createReverbIR(2.5, 2.5);
        this.reverbGain = this.ctx.createGain();
        this.reverbGain.gain.value = 0.3;

        this.compressor.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);
        this.reverb.connect(this.reverbGain);
        this.reverbGain.connect(this.masterGain);
    }

    resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }

    _createReverbIR(duration, decay) {
        const len = this.ctx.sampleRate * duration;
        const buf = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
            const d = buf.getChannelData(ch);
            for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
        }
        return buf;
    }

    _playStrings(freq, time, dur, vol = 0.15) {
        if (!freq) return;
        const ctx = this.ctx;
        // Layered oscillators for "Fate" orchestral power
        const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = freq;
        const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = freq * 0.5; // Octave below
        const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 2200;
        const g = ctx.createGain();
        
        g.gain.setValueAtTime(0, time);
        g.gain.linearRampToValueAtTime(vol, time + 0.02);
        g.gain.setValueAtTime(vol, time + dur - 0.05);
        g.gain.linearRampToValueAtTime(0, time + dur);

        o1.connect(filter); o2.connect(filter); filter.connect(g); g.connect(this.compressor); g.connect(this.reverb);
        o1.start(time); o1.stop(time + dur + 0.1); o2.start(time); o2.stop(time + dur + 0.1);
    }

    _scheduleBeat(beatNum, time) {
        const loopBeat = beatNum % MELODY_LENGTH_BEATS;
        const secPerBeat = 60.0 / this.bpm;
        
        FATE_MELODY.forEach(m => {
            if (Math.abs(m.b - loopBeat) < 0.01) {
                this._playStrings(NOTE_FREQ[m.n], time, m.d * secPerBeat, 0.18);
            }
        });

        if (this.onBeat) this.onBeat(beatNum, time);
    }

    _scheduler() {
        while (this.nextNoteTime < this.ctx.currentTime + 0.2) {
            this._scheduleBeat(this.currentBeat, this.nextNoteTime);
            this.nextNoteTime += 60.0 / this.bpm * 0.25; // 16th note resolution
            this.currentBeat += 0.25;
        }
    }

    startMusic(bpm) {
        this.init(); this.resume();
        this.bpm = bpm;
        this.currentBeat = 0;
        this.nextNoteTime = this.ctx.currentTime + 0.2;
        this.isPlaying = true;
        this.schedulerInterval = setInterval(() => this._scheduler(), 50);
    }

    stopMusic() {
        this.isPlaying = false;
        if (this.schedulerInterval) { clearInterval(this.schedulerInterval); this.schedulerInterval = null; }
    }

    setBPM(bpm) { this.bpm = bpm; }
    getTime() { return this.ctx ? this.ctx.currentTime : 0; }

    playChu() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.setTargetAtTime(450, now, 0.05);
        const g = this.ctx.createGain(); g.gain.setValueAtTime(0.12, now); g.gain.exponentialRampToValueAtTime(0.001, now+0.1);
        o.connect(g); g.connect(this.masterGain); o.start(now); o.stop(now+0.1);
    }

    playBlock() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        // Harder impact for strings
        const osc = this.ctx.createOscillator(); osc.type = 'square'; osc.frequency.setValueAtTime(220, now);
        const g = this.ctx.createGain(); g.gain.setValueAtTime(0.15, now); g.gain.exponentialRampToValueAtTime(0.001, now+0.04);
        osc.connect(g); g.connect(this.masterGain); osc.start(now); osc.stop(now+0.04);
    }

    playGameOverSound() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        this._playStrings(NOTE_FREQ['Eb3'], now, 2.0, 0.3);
    }
}
