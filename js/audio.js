// ============================================
// 💋NUMARIN — PASSIVE AUDIO ENGINE
// Lightweight & Safari Resilient
// ============================================

class AudioEngine {
    constructor() {
        this.ctx = null;
        this.unlocked = false;
    }

    init() {
        if (this.ctx) return;
        try {
            const SelectedContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new SelectedContext();
            this.unlock();
        } catch (e) {
            console.error("Audio initialization failed:", e);
        }
    }

    unlock() {
        if (!this.ctx || this.unlocked) return;
        const buffer = this.ctx.createBuffer(1, 1, 22050);
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.ctx.destination);
        source.start(0);
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().then(() => { this.unlocked = true; });
        } else {
            this.unlocked = true;
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playFateTone(freq, timeOffset = 0) {
        if (!this.ctx || this.ctx.state !== 'active') return;
        const time = this.ctx.currentTime + timeOffset;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.1, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(time); osc.stop(time + 0.3);
    }

    playChu() {
        if (!this.ctx || this.ctx.state !== 'active') return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(900, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1800, this.ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.05);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 0.05);
    }

    playBlock() {
        if (!this.ctx || this.ctx.state !== 'active') return;
        const noise = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        noise.type = 'square';
        noise.frequency.setValueAtTime(140, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);
        noise.connect(gain); gain.connect(this.ctx.destination);
        noise.start(); noise.stop(this.ctx.currentTime + 0.1);
    }

    playGameOverSound() {
        if (!this.ctx || this.ctx.state !== 'active') return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 1.2);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.2);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 1.2);
    }
}
