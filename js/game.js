// ============================================
// 💋NUMARIN — PERFORMANCE LOGIC
// Branding: NUMARIN | Safari & iOS Touch Fix
// ============================================

class Game {
    constructor() {
        this.audio = new AudioEngine();
        this.canvas = document.getElementById('game-canvas');
        this.renderer = new GameRenderer(this.canvas);
        this.state = 'title';
        this.kisses = [];
        this.stats = { score: 0, combo: 0, maxCombo: 0, blocked: 0 };
        this.nextKissId = 0;
        this.gameTime = 0;
        this.lastFrameTime = 0;
        this.audioStartTime = 0;
        
        this.baseBPM = 108;
        this.currentBPM = 108;
        this.approachBeats = 4;
        this.lastBeatSpawned = -1;

        this._setupInput();
        this._setupButtons();
    }

    _setupButtons() {
        const startBtn = document.getElementById('btn-start');
        const retryBtn = document.getElementById('btn-retry');
        
        // --- Safari/iOS Specific Start Handler ---
        const handleStart = (e) => {
            if (this.state === 'title') {
                // Ensure audio is initialized and unlocked inside the same user gesture
                this.audio.init(); 
                this.audio.unlock(); // Silent play for Safari
                this.start();
            }
        };

        const handleRetry = (e) => {
            if (this.state === 'gameover') {
                this.audio.resume();
                this.restart();
            }
        };

        // Use touchstart for immediate response on mobile
        startBtn.addEventListener('touchstart', (e) => { handleStart(e); }, { passive: true });
        startBtn.addEventListener('click', (e) => { handleStart(e); });
        
        retryBtn.addEventListener('touchstart', (e) => { handleRetry(e); }, { passive: true });
        retryBtn.addEventListener('click', (e) => { handleRetry(e); });
    }

    _setupInput() {
        const handleTap = (x, y) => { if (this.state === 'playing') this._handleTap(x, y); };
        // iOS requires touchstart for prompt hit response
        this.canvas.addEventListener('touchstart', (e) => {
            // Prevent scrolling/zooming during play
            if (this.state === 'playing') e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                handleTap(t.clientX, t.clientY);
            }
        }, { passive: false });
        this.canvas.addEventListener('mousedown', (e) => { handleTap(e.clientX, e.clientY); });
    }

    _handleTap(x, y) {
        this.renderer.addHand(x, y);
        const audioTime = this.audio.getTime();
        let bestKiss = null;
        let bestDist = Infinity;
        const hitRadius = Math.max(150, this.renderer.w * 0.32); // Slightly larger for mobile fingers

        this.kisses.forEach(kiss => {
            if (kiss.hit || kiss.missed) return;
            const timeDiff = Math.abs(audioTime - kiss.targetTime);
            if (timeDiff > 0.6) return; // Generous 600ms window for mobile

            const p = kiss.progress;
            const perspective = Math.pow(p, 2.5);
            const bx = this.renderer.vanishX + (kiss.targetX - this.renderer.vanishX) * perspective;
            const by = this.renderer.vanishY + (kiss.targetY - this.renderer.vanishY) * perspective;
            const arcHeight = -240 * Math.sin(Math.PI * p) * (1 - p * 0.5);
            const kx = bx; const ky = by + arcHeight;

            const dist = Math.sqrt((x - kx) ** 2 + (y - ky) ** 2);
            if (dist < hitRadius && dist < bestDist) {
                bestDist = dist; bestKiss = kiss;
            }
        });

        if (bestKiss) {
            bestKiss.hit = true;
            this.stats.blocked++; this.stats.combo++;
            this.stats.maxCombo = Math.max(this.stats.maxCombo, this.stats.combo);
            this.stats.score += 100 * (1 + Math.floor(this.stats.combo / 10) * 0.5);
            this.audio.playBlock();
            
            const p = bestKiss.progress;
            const kx = this.renderer.vanishX + (bestKiss.targetX - this.renderer.vanishX) * Math.pow(p, 2.5);
            const ky = (this.renderer.vanishY + (bestKiss.targetY - this.renderer.vanishY) * Math.pow(p, 2.5)) + (-240 * Math.sin(Math.PI * p) * (1 - p * 0.5));
            this.renderer.addParticles(kx, ky, 35, '#D4AF37');
            this._updateHUD();
        }
    }

    start() {
        this.state = 'playing';
        this.kisses = [];
        this.stats = { score: 0, combo: 0, maxCombo: 0, blocked: 0 };
        this.nextKissId = 0;
        this.currentBPM = this.baseBPM;
        this.lastBeatSpawned = -1;
        this.renderer.gameOverKisses = [];
        this.renderer.gameOverTextAlpha = 0;
        this._showScreen('game-screen');
        this._updateHUD();

        this.audio.startMusic(this.currentBPM);
        this.audioStartTime = this.audio.getTime();
        
        const activeBeats = [0, 0.25, 0.5, 0.75, 2.5, 2.75, 3.0, 3.25, 5.0, 5.25, 5.5, 5.75, 6.5, 6.75, 7.0, 7.25];
        this.audio.onBeat = (beatNum, currentTime) => {
            if (beatNum <= this.lastBeatSpawned) return;
            this.lastBeatSpawned = beatNum;
            const beatsToTarget = this.approachBeats;
            const targetBeatAt = (beatNum + beatsToTarget) % 8;
            if (activeBeats.some(b => Math.abs(b - targetBeatAt) < 0.1)) {
                const secPerBeat = 60 / this.currentBPM;
                const targetTime = currentTime + beatsToTarget * secPerBeat;
                this._spawnKiss(targetTime, beatsToTarget * secPerBeat);
            }
        };

        this.lastFrameTime = performance.now();
        requestAnimationFrame((t) => this._gameLoop(t));
    }

    _spawnKiss(targetTime, travelTime) {
        const margin = 100;
        const tx = margin + Math.random() * (this.renderer.w - margin * 2);
        const ty = this.renderer.h * 0.7 + Math.random() * (this.renderer.h * 0.25);
        this.kisses.push({ id: this.nextKissId++, targetX: tx, targetY: ty, targetTime: targetTime, spawnTime: targetTime - travelTime, progress: 0, hit: false, missed: false, chuPlayed: false });
    }

    _updateDifficulty(elapsed) {
        this.currentBPM = this.baseBPM + Math.floor(elapsed / 25) * 4;
        this.currentBPM = Math.min(this.currentBPM, 180);
        this.audio.setBPM(this.currentBPM);
    }

    _gameLoop(timestamp) {
        const dt = (timestamp - this.lastFrameTime) / 1000;
        this.lastFrameTime = timestamp;
        const audioTime = this.audio.getTime();
        if (this.state === 'playing') {
            const elapsed = Math.max(0, audioTime - this.audioStartTime);
            this.gameTime = elapsed;
            this._updateDifficulty(elapsed);
            let missedKiss = null;
            this.kisses.forEach(kiss => {
                if (kiss.hit || kiss.missed) return;
                const travelTime = kiss.targetTime - kiss.spawnTime;
                const timeRemaining = kiss.targetTime - audioTime;
                kiss.progress = Math.max(0, Math.min(1.2, 1.0 - (timeRemaining / travelTime)));
                if (!kiss.chuPlayed && kiss.progress > 0.2) { kiss.chuPlayed = true; this.audio.playChu(); }
                if (audioTime >= kiss.targetTime + 0.6) { kiss.missed = true; missedKiss = kiss; } // Generous mobile buffer
            });
            if (missedKiss) { this._gameOver(missedKiss); }
            this._updateHUD();
        }
        this.renderer.render({ kisses: this.kisses, time: audioTime - this.audioStartTime, dt: dt, isGameOver: this.state === 'gameover' });
        requestAnimationFrame((t) => this._gameLoop(t));
    }

    _showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    }

    _updateHUD() {
        document.getElementById('hud-score').textContent = this.stats.score.toLocaleString();
        document.getElementById('hud-combo').textContent = this.stats.combo;
        document.getElementById('hud-bpm').textContent = Math.round(this.currentBPM);
    }

    _gameOver(missedKiss) {
        if (this.state === 'gameover') return;
        this.state = 'gameover';
        this.audio.stopMusic();
        this.audio.playGameOverSound();
        const p = missedKiss.progress;
        const perspective = Math.pow(p, 2.5);
        const kx = this.renderer.vanishX + (missedKiss.targetX - this.renderer.vanishX) * perspective;
        const ky = (this.renderer.vanishY + (missedKiss.targetY - this.renderer.vanishY) * perspective) + (-240 * Math.sin(Math.PI * p) * (1 - p * 0.5));
        this.renderer.startGameOverExplosion(kx, ky);
        setTimeout(() => { if (this.state === 'gameover') this._showScreen('gameover-screen'); }, 2200);
    }

    restart() { this.start(); }
}

let game;
document.addEventListener('DOMContentLoaded', () => { game = new Game(); });
