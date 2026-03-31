// ============================================
// 💋 KISS DEFENSE — AUDIO ENGINE
// High-Tempo (BPM 160) Luxury CM Arrange
// ============================================

const NOTE_FREQ = {
    'A3':220.00,'B3':246.94,'C4':261.63,'C#4':277.18,'D4':293.66,'E4':329.63,
    'F#4':369.99,'G4':392.00,'A4':440.00,'B4':493.88,
    'C5':523.25,'C#5':554.37,'D5':587.33,'E5':659.26,'F#5':739.99,
    'G5':783.99,'A5':880.00,'B5':987.77,'D3':146.83,'F#3':184.99,'G3':196.00
};

// 天国と地獄 (Can-Can Galop) melody — beat-relative
const CAN_CAN_MELODY = [
    {b:0,n:'D5',d:0.4},{b:0.5,n:'D5',d:0.2},{b:0.75,n:'C#5',d:0.2},
    {b:1,n:'D5',d:0.4},{b:1.5,n:'E5',d:0.4},
    {b:2,n:'F#5',d:0.4},{b:2.5,n:'G5',d:0.4},
    {b:3,n:'A5',d:0.8},
    {b:4,n:'A5',d:0.4},{b:4.5,n:'G5',d:0.4},
    {b:5,n:'F#5',d:0.4},{b:5.5,n:'E5',d:0.4},
    {b:6,n:'D5',d:0.8},{b:7,n:'C#5',d:0.4},{b:7.5,n:'D5',d:0.4},
    {b:8,n:'D5',d:0.4},{b:8.5,n:'E5',d:0.4},
    {b:9,n:'F#5',d:0.4},{b:9.5,n:'G5',d:0.4},
    {b:10,n:'A5',d:0.4},{b:10.5,n:'B5',d:0.4},
    {b:11,n:'A5',d:0.8},
    {b:12,n:'G5',d:0.4},{b:12.5,n:'F#5',d:0.4},
    {b:13,n:'E5',d:0.4},{b:13.5,n:'D5',d:0.4},
    {b:14,n:'A4',d:0.4},{b:14.5,n:'D5',d:1.2},
];
const MELODY_LENGTH_BEATS = 16;

const CAN_CAN_CHORDS = [
    {b:0, notes:['D4','F#4','A4'], d:4},
    {b:4, notes:['A3','C#4','E4'], d:4},
    {b:8, notes:['G3','B3','D4'], d:4},
    {b:12, notes:['A3','C#4','E4'], d:4},
];

const CAN_CAN_BASS = [
    {b:0,n:'D3',d:2},{b:2,n:'D3',d:2},
    {b:4,n:'A3',d:2},{b:6,n:'A3',d:2},
    {b:8,n:'G3',d:2},{b:10,n:'G3',d:2},
    {b:12,n:'A3',d:2},{b:14,n:'A3',d:2},
];

class AudioEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.isPlaying = false;
        this.bpm = 160; 
        this.currentBeat = 0;
        this.nextNoteTime = 0;
        this.schedulerInterval = null;
        this.onBeat = null; 
    }

    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.55;
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -15;
        this.compressor.ratio.value = 3.5;
        this.reverb = this.ctx.createConvolver();
        this.reverb.buffer = this._createReverbIR(2.0, 2.0);
        this.reverbGain = this.ctx.createGain();
        this.reverbGain.gain.value = 0.2;
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

    _playPiano(freq, time, dur, vol = 0.1) {
        const ctx = this.ctx;
        const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = freq;
        const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 2;
        const g1 = ctx.createGain(); const g2 = ctx.createGain();
        // Snappier ADSR for fast BPM
        const a = 0.005, d = 0.1, s = 0.2, r = 0.1;
        g1.gain.setValueAtTime(0, time);
        g1.gain.linearRampToValueAtTime(vol, time + a);
        g1.gain.linearRampToValueAtTime(vol * s, time + a + d);
        g1.gain.setValueAtTime(vol * s, time + dur - r);
        g1.gain.linearRampToValueAtTime(0, time + dur);
        g2.gain.setValueAtTime(0, time);
        g2.gain.linearRampToValueAtTime(vol * 0.25, time + a);
        g2.gain.linearRampToValueAtTime(0, time + 0.12);
        o1.connect(g1); g1.connect(this.compressor); g1.connect(this.reverb);
        o2.connect(g2); g2.connect(this.compressor);
        o1.start(time); o1.stop(time + dur + 0.05); o2.start(time); o2.stop(time + dur + 0.05);
    }

    _playPad(notes, time, dur, vol = 0.035) {
        notes.forEach(n => {
            const f = NOTE_FREQ[n]; if (!f) return;
            const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
            const o2 = this.ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = f * 1.002;
            const filter = this.ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 1400;
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0, time);
            g.gain.linearRampToValueAtTime(vol, time + 0.2);
            g.gain.setValueAtTime(vol, time + dur - 0.2);
            g.gain.linearRampToValueAtTime(0, time + dur);
            o.connect(filter); o2.connect(filter); filter.connect(g); g.connect(this.compressor); g.connect(this.reverb);
            o.start(time); o.stop(time + dur + 0.1); o2.start(time); o2.stop(time + dur + 0.1);
        });
    }

    _playBass(freq, time, dur, vol = 0.08) {
        const o = this.ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = freq;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0, time);
        g.gain.linearRampToValueAtTime(vol, time + 0.02);
        g.gain.linearRampToValueAtTime(0, time + dur);
        o.connect(g); g.connect(this.compressor);
        o.start(time); o.stop(time + dur + 0.05);
    }

    _scheduleBeat(beatNum, time) {
        const secPerBeat = 60.0 / this.bpm;
        const loopBeat = beatNum % MELODY_LENGTH_BEATS;
        CAN_CAN_MELODY.forEach(m => {
            if (Math.abs(m.b - loopBeat) < 0.01) this._playPiano(NOTE_FREQ[m.n], time, m.d * secPerBeat, 0.11);
        });
        CAN_CAN_CHORDS.forEach(c => {
            if (Math.abs(c.b - loopBeat) < 0.01) this._playPad(c.notes, time, c.d * secPerBeat, 0.025);
        });
        CAN_CAN_BASS.forEach(b => {
            if (Math.abs(b.b - loopBeat) < 0.01) this._playBass(NOTE_FREQ[b.n], time, b.d * secPerBeat, 0.08);
        });
        if (this.onBeat) this.onBeat(beatNum, time);
    }

    _scheduler() {
        const ahead = 0.2;
        while (this.nextNoteTime < this.ctx.currentTime + ahead) {
            this._scheduleBeat(this.currentBeat, this.nextNoteTime);
            this.nextNoteTime += 60.0 / this.bpm * 0.5;
            this.currentBeat += 0.5;
        }
    }

    startMusic(bpm) {
        this.init(); this.resume();
        this.bpm = bpm;
        this.currentBeat = 0;
        this.nextNoteTime = this.ctx.currentTime + 0.1;
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
        const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.08), this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/d.length, 3);
        const src = this.ctx.createBufferSource(); src.buffer = buf;
        const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2800; bp.Q.value = 4;
        const g = this.ctx.createGain(); g.gain.setValueAtTime(0.1, now); g.gain.exponentialRampToValueAtTime(0.001, now+0.08);
        src.connect(bp); bp.connect(g); g.connect(this.masterGain); src.start(now);
        const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.setTargetAtTime(300, now, 0.05);
        const og = this.ctx.createGain(); og.gain.setValueAtTime(0.05, now); og.gain.exponentialRampToValueAtTime(0.001, now+0.1);
        o.connect(og); og.connect(this.masterGain); o.start(now); o.stop(now+0.1);
    }

    playBlock() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(1400, now);
        const g = this.ctx.createGain(); g.gain.setValueAtTime(0.2, now); g.gain.exponentialRampToValueAtTime(0.001, now+0.05);
        osc.connect(g); g.connect(this.masterGain); osc.start(now); osc.stop(now+0.05);
    }

    playGameOverSound() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.exponentialRampToValueAtTime(20, now+1.5);
        const g = this.ctx.createGain(); g.gain.setValueAtTime(0.15, now); g.gain.linearRampToValueAtTime(0, now+1.5);
        o.connect(g); g.connect(this.masterGain); o.start(now); o.stop(now+1.5);
    }
}
