// ============================================
// 💋NUMARIN — AUDIO ENGINE
// Safari/iOS Compatibility & Fate Motif
// ============================================

class AudioEngine {
    constructor() {
        this.ctx = null;
        this.bpm = 108;
        this.nextNoteTime = 0;
        this.currentBeat = 0;
        this.lookahead = 0.1;
        this.timer = null;
        this.onBeat = null;
    }

    init() {
        if (this.ctx) return;
        const SelectedContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new SelectedContext();
        
        // --- Safari "Silence" Unlock ---
        this.unlock();
    }

    unlock() {
        if (!this.ctx) return;
        // Create an empty buffer and play it to satisfy Safari's gesture requirement
        const buffer = this.ctx.createBuffer(1, 1, 22050);
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.ctx.destination);
        source.start(0);
        
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    getTime() {
        return this.ctx ? this.ctx.currentTime : 0;
    }

    setBPM(bpm) { this.bpm = bpm; }

    startMusic(bpm) {
        this.init();
        this.resume();
        this.bpm = bpm;
        this.currentBeat = 0;
        this.nextNoteTime = this.ctx.currentTime + 0.1;
        
        if (this.timer) clearInterval(this.timer);
        this.timer = setInterval(() => this._scheduler(), 25);
    }

    stopMusic() {
        clearInterval(this.timer);
        this.timer = null;
    }

    _scheduler() {
        while (this.nextNoteTime < this.ctx.currentTime + this.lookahead) {
            this._scheduleBeat(this.currentBeat, this.nextNoteTime);
            this.nextNoteTime += (60.0 / this.bpm) * 0.25; 
            this.currentBeat += 0.25;
        }
    }

    _scheduleBeat(beatNum, time) {
        if (this.onBeat) this.onBeat(beatNum, time);
        
        const cycleBeat = beatNum % 8;
        // FATE MOTIF: Da-Da-Da-Duum!
        const motif = [0, 0.25, 0.5, 0.75, 2.5, 2.75, 3.0, 3.25, 5.0, 5.25, 5.5, 5.75, 6.5, 6.75, 7.0, 7.25];
        
        if (motif.some(b => Math.abs(b - cycleBeat) < 0.1)) {
            this._playFateTone(time, cycleBeat >= 0.75 && cycleBeat < 1.0 || cycleBeat >= 3.25 && cycleBeat < 4.0 ? 349.23 : 440.00);
        }
    }

    _playFateTone(time, freq) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.98, time + 0.2);
        
        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(time);
        osc.stop(time + 0.3);
    }

    playChu() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(880, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1760, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 0.1);
    }

    playBlock() {
        if (!this.ctx) return;
        const noise = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        noise.type = 'square';
        noise.frequency.setValueAtTime(120, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.15);
        noise.connect(gain); gain.connect(this.ctx.destination);
        noise.start(); noise.stop(this.ctx.currentTime + 0.15);
    }

    playGameOverSound() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(220, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(55, this.ctx.currentTime + 1.5);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.5);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 1.5);
    }
}
