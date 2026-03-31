// ============================================
// 💋 KISS DEFENSE — AUDIO ENGINE
// 天国と地獄 Luxury CM Arrange + Sound Effects
// ============================================

const NOTE_FREQ = {
    'A3':220.00,'B3':246.94,'C4':261.63,'C#4':277.18,'D4':293.66,'E4':329.63,
    'F#4':369.99,'G4':392.00,'A4':440.00,'B4':493.88,
    'C5':523.25,'C#5':554.37,'D5':587.33,'E5':659.26,'F#5':739.99,
    'G5':783.99,'A5':880.00,'B5':987.77,'D3':146.83,'F#3':184.99,'G3':196.00
};

// 天国と地獄 (Can-Can Galop) melody — beat-relative
const CAN_CAN_MELODY = [
    // Phrase 1: iconic ascending motif
    {b:0,n:'D5',d:0.5},{b:0.5,n:'D5',d:0.25},{b:0.75,n:'C#5',d:0.25},
    {b:1,n:'D5',d:0.5},{b:1.5,n:'E5',d:0.5},
    {b:2,n:'F#5',d:0.5},{b:2.5,n:'G5',d:0.5},
    {b:3,n:'A5',d:1.0},
    // Phrase 2: descending
    {b:4,n:'A5',d:0.5},{b:4.5,n:'G5',d:0.5},
    {b:5,n:'F#5',d:0.5},{b:5.5,n:'E5',d:0.5},
    {b:6,n:'D5',d:1.0},{b:7,n:'C#5',d:0.5},{b:7.5,n:'D5',d:0.5},
    // Phrase 3: second ascending
    {b:8,n:'D5',d:0.5},{b:8.5,n:'E5',d:0.5},
    {b:9,n:'F#5',d:0.5},{b:9.5,n:'G5',d:0.5},
    {b:10,n:'A5',d:0.5},{b:10.5,n:'B5',d:0.5},
    {b:11,n:'A5',d:1.0},
    // Phrase 4: resolution
    {b:12,n:'G5',d:0.5},{b:12.5,n:'F#5',d:0.5},
    {b:13,n:'E5',d:0.5},{b:13.5,n:'D5',d:0.5},
    {b:14,n:'A4',d:0.5},{b:14.5,n:'D5',d:1.5},
];
const MELODY_LENGTH_BEATS = 16;

// Chord progression (beats)
const CAN_CAN_CHORDS = [
    {b:0, notes:['D4','F#4','A4'], d:4},
    {b:4, notes:['A3','C#4','E4'], d:4},
    {b:8, notes:['G3','B3','D4'], d:4},
    {b:12, notes:['A3','C#4','E4'], d:4},
];

// Bass line
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
        this.reverbGain = null;
        this.isPlaying = false;
        this.bpm = 80;
        this.currentBeat = 0;
        this.nextNoteTime = 0;
        this.scheduleAheadTime = 0.25;
        this.schedulerInterval = null;
        this.melodyBeatOffset = 0;
        this.onBeat = null; // callback
    }

    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();

        // Master chain
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.6;

        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -18;
        this.compressor.ratio.value = 4;

        // Reverb
        this.reverb = this.ctx.createConvolver();
        this.reverb.buffer = this._createReverbIR(2.5, 2.5);
        this.reverbGain = this.ctx.createGain();
        this.reverbGain.gain.value = 0.25;

        // Routing
        this.compressor.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);
        this.reverb.connect(this.reverbGain);
        this.reverbGain.connect(this.masterGain);
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

    _createReverbIR(duration, decay) {
        const len = this.ctx.sampleRate * duration;
        const buf = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
            const d = buf.getChannelData(ch);
            for (let i = 0; i < len; i++) {
                d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
            }
        }
        return buf;
    }

    // --- Piano sound (luxury CM) ---
    _playPiano(freq, time, dur, vol = 0.1) {
        if (!this.ctx) return;
        const ctx = this.ctx;
        // Fundamental
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.value = freq;
        // 2nd harmonic
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = freq * 2;
        const g1 = ctx.createGain();
        const g2 = ctx.createGain();
        // Piano ADSR
        const a = 0.008, d = 0.15, s = 0.35, r = Math.min(dur * 0.4, 0.3);
        g1.gain.setValueAtTime(0, time);
        g1.gain.linearRampToValueAtTime(vol, time + a);
        g1.gain.linearRampToValueAtTime(vol * s, time + a + d);
        g1.gain.setValueAtTime(vol * s, time + dur - r);
        g1.gain.linearRampToValueAtTime(0, time + dur);
        g2.gain.setValueAtTime(0, time);
        g2.gain.linearRampToValueAtTime(vol * 0.3, time + a);
        g2.gain.linearRampToValueAtTime(vol * 0.1, time + a + d);
        g2.gain.linearRampToValueAtTime(0, time + dur);

        osc1.connect(g1); g1.connect(this.compressor); g1.connect(this.reverb);
        osc2.connect(g2); g2.connect(this.compressor);
        osc1.start(time); osc1.stop(time + dur + 0.05);
        osc2.start(time); osc2.stop(time + dur + 0.05);
    }

    // --- String pad ---
    _playPad(notes, time, dur, vol = 0.04) {
        if (!this.ctx) return;
        notes.forEach(n => {
            const freq = NOTE_FREQ[n]; if (!freq) return;
            const osc = this.ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            const osc2 = this.ctx.createOscillator();
            osc2.type = 'sawtooth';
            osc2.frequency.value = freq * 1.003;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 1800;
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0, time);
            g.gain.linearRampToValueAtTime(vol, time + 0.3);
            g.gain.setValueAtTime(vol, time + dur - 0.4);
            g.gain.linearRampToValueAtTime(0, time + dur);
            osc.connect(filter); osc2.connect(filter);
            filter.connect(g); g.connect(this.compressor); g.connect(this.reverb);
            osc.start(time); osc.stop(time + dur + 0.1);
            osc2.start(time); osc2.stop(time + dur + 0.1);
        });
    }

    // --- Bass ---
    _playBass(freq, time, dur, vol = 0.1) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0, time);
        g.gain.linearRampToValueAtTime(vol, time + 0.03);
        g.gain.setValueAtTime(vol * 0.6, time + dur * 0.3);
        g.gain.linearRampToValueAtTime(0, time + dur);
        osc.connect(g); g.connect(this.compressor);
        osc.start(time); osc.stop(time + dur + 0.05);
    }

    // --- Schedule music for current beat window ---
    _scheduleBeat(beatNum, time) {
        const secPerBeat = 60.0 / this.bpm;
        const loopBeat = beatNum % MELODY_LENGTH_BEATS;

        // Melody
        CAN_CAN_MELODY.forEach(m => {
            if (Math.abs(m.b - loopBeat) < 0.01) {
                const freq = NOTE_FREQ[m.n];
                if (freq) this._playPiano(freq, time, m.d * secPerBeat, 0.12);
            }
        });

        // Chords
        CAN_CAN_CHORDS.forEach(c => {
            if (Math.abs(c.b - loopBeat) < 0.01) {
                this._playPad(c.notes, time, c.d * secPerBeat, 0.035);
            }
        });

        // Bass
        CAN_CAN_BASS.forEach(b => {
            if (Math.abs(b.b - loopBeat) < 0.01) {
                const freq = NOTE_FREQ[b.n];
                if (freq) this._playBass(freq, time, b.d * secPerBeat, 0.1);
            }
        });

        // Fire beat callback for game logic
        if (this.onBeat) this.onBeat(beatNum, time);
    }

    _scheduler() {
        while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
            this._scheduleBeat(this.currentBeat, this.nextNoteTime);
            const secPerBeat = 60.0 / this.bpm;
            this.nextNoteTime += secPerBeat * 0.5; // schedule per half-beat
            this.currentBeat += 0.5;
        }
    }

    startMusic(bpm) {
        this.init();
        this.resume();
        this.bpm = bpm;
        this.currentBeat = 0;
        this.nextNoteTime = this.ctx.currentTime + 0.1;
        this.isPlaying = true;
        this.schedulerInterval = setInterval(() => this._scheduler(), 40);
    }

    stopMusic() {
        this.isPlaying = false;
        if (this.schedulerInterval) {
            clearInterval(this.schedulerInterval);
            this.schedulerInterval = null;
        }
    }

    setBPM(bpm) { this.bpm = bpm; }

    getTime() { return this.ctx ? this.ctx.currentTime : 0; }

    // --- Kiss "Chu" sound effect ---
    playChu() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        // Noise burst (lip sound)
        const bufSize = Math.floor(this.ctx.sampleRate * 0.09);
        const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) {
            d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 3);
        }
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = 2800; bp.Q.value = 4;
        const ng = this.ctx.createGain();
        ng.gain.setValueAtTime(0.12, now);
        ng.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        src.connect(bp); bp.connect(ng); ng.connect(this.masterGain);
        src.start(now);
        // Tonal "u" vowel
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(650, now);
        osc.frequency.exponentialRampToValueAtTime(280, now + 0.07);
        const og = this.ctx.createGain();
        og.gain.setValueAtTime(0.06, now);
        og.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.connect(og); og.connect(this.masterGain);
        osc.start(now); osc.stop(now + 0.12);
    }

    // --- Hand block/flick sound ---
    playBlock() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        // Sharp impact noise
        const bufSize = Math.floor(this.ctx.sampleRate * 0.035);
        const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) {
            d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 5);
        }
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const ng = this.ctx.createGain();
        ng.gain.setValueAtTime(0.25, now);
        ng.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        src.connect(ng); ng.connect(this.masterGain);
        src.start(now);
        // Metallic ring
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 1800;
        const og = this.ctx.createGain();
        og.gain.setValueAtTime(0.1, now);
        og.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.connect(og); og.connect(this.masterGain);
        osc.start(now); osc.stop(now + 0.1);
    }

    // --- Game over distortion ---
    playGameOverSound() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        // Low rumble
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 1.5);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.2, now);
        g.gain.linearRampToValueAtTime(0, now + 1.5);
        osc.connect(g); g.connect(this.masterGain);
        osc.start(now); osc.stop(now + 1.6);
    }
}
