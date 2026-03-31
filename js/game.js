// ============================================
// 💋 KISS DEFENSE — GAME LOGIC
// High-Tempo (BPM 160) + Precise Audio Sync
// ============================================

class Game {
    constructor() {
        this.audio = new AudioEngine();
        this.canvas = document.getElementById('game-canvas');
        this.renderer = new GameRenderer(this.canvas);
        this.state = 'title'; // title | playing | gameover
        this.kisses = [];
        this.stats = { score: 0, combo: 0, maxCombo: 0, blocked: 0 };
        this.nextKissId = 0;
        this.gameTime = 0;
        this.lastFrameTime = 0;
        
        // --- Difficulty & Timing ---
        this.baseBPM = 160; // Normal tempo for Can-Can
        this.currentBPM = 160;
        this.approachTime = 2.0; // Seconds for kiss to reach target (slightly faster for 160bpm)
        this.kissesPerBeat = 1;
        this.lastBeatSpawned = -1;

        this._setupInput();
        this._setupButtons();
    }

    _setupButtons() {
        const startBtn = document.getElementById('btn-start');
        const retryBtn = document.getElementById('btn-retry');

        const handleStart = () => { if (this.state === 'title') this.startFromTitle(); };
        const handleRetry = () => { if (this.state === 'gameover') this.restart(); };

        startBtn.addEventListener('click', handleStart);
        startBtn.addEventListener('touchstart', (e) => { e.preventDefault(); handleStart(); }, { passive: false });
        retryBtn.addEventListener('click', handleRetry);
        retryBtn.addEventListener('touchstart', (e) => { e.preventDefault(); handleRetry(); }, { passive: false });
    }

    _setupInput() {
        const handleTap = (x, y) => {
            if (this.state !== 'playing') return;
            this._handleTap(x, y);
        };

        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                handleTap(t.clientX, t.clientY);
            }
        }, { passive: false });

        this.canvas.addEventListener('mousedown', (e) => {
            handleTap(e.clientX, e.clientY);
        });
    }

    _handleTap(x, y) {
        this.renderer.addHand(x, y);

        const audioTime = this.audio.getTime();
        let bestKiss = null;
        let bestDist = Infinity;
        const hitRadius = Math.max(70, this.renderer.w * 0.15); // Large hit area for mobile

        this.kisses.forEach(kiss => {
            if (kiss.hit || kiss.missed) return;
            // Timing window: must be close to targetTime (progress near 1.0)
            const timeDiff = Math.abs(audioTime - kiss.targetTime);
            if (timeDiff > 0.4) return; // Must be within 400ms of the beat

            // Screen position check
            const perspective = Math.pow(kiss.progress, 2.2);
            const kx = this.renderer.vanishX + (kiss.targetX - this.renderer.vanishX) * perspective;
            const ky = this.renderer.vanishY + (kiss.targetY - this.renderer.vanishY) * perspective;
            const size = 15 + 140 * perspective;

            const dist = Math.sqrt((x - kx) ** 2 + (y - ky) ** 2);
            if (dist < hitRadius + size * 0.5 && dist < bestDist) {
                bestDist = dist;
                bestKiss = kiss;
            }
        });

        if (bestKiss) {
            bestKiss.hit = true;
            this.stats.blocked++;
            this.stats.combo++;
            this.stats.maxCombo = Math.max(this.stats.maxCombo, this.stats.combo);

            const comboMultiplier = 1 + Math.floor(this.stats.combo / 10) * 0.2;
            this.stats.score += Math.round(100 * comboMultiplier);

            this.audio.playBlock();
            
            // Effect at hit position
            const p = Math.pow(bestKiss.progress, 2.2);
            const kx = this.renderer.vanishX + (bestKiss.targetX - this.renderer.vanishX) * p;
            const ky = this.renderer.vanishY + (bestKiss.targetY - this.renderer.vanishY) * p;
            this.renderer.addParticles(kx, ky, 22, '#D4AF37');
            this.renderer.addParticles(kx, ky, 12, '#DC143C');

            this._updateHUD();
        }
    }

    _showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    }

    startFromTitle() {
        this.audio.init();
        this.audio.resume();
        this.start();
    }

    start() {
        this.state = 'playing';
        this.kisses = [];
        this.stats = { score: 0, combo: 0, maxCombo: 0, blocked: 0 };
        this.nextKissId = 0;
        this.currentBPM = this.baseBPM;
        this.approachTime = 2.0; 
        this.lastBeatSpawned = -1;

        this._showScreen('game-screen');
        this._updateHUD();

        // --- RHYTHM SYNC SPAWNING ---
        this.audio.onBeat = (beatNum, targetTime) => {
            // Spawn kiss on every beat (or more as difficulty increases)
            if (beatNum <= this.lastBeatSpawned) return;
            this.lastBeatSpawned = beatNum;
            
            // Randomly decide counts based on current difficulty
            const baseCount = Math.floor(this.kissesPerBeat);
            const extraChance = this.kissesPerBeat % 1;
            const count = baseCount + (Math.random() < extraChance ? 1 : 0);

            for (let i = 0; i < count; i++) {
                this._spawnKiss(targetTime);
            }
        };

        this.audio.startMusic(this.currentBPM);
        const now = performance.now();
        this.startTime = now;
        this.lastFrameTime = now;

        requestAnimationFrame((t) => this._gameLoop(t));
    }

    _spawnKiss(targetTime) {
        const margin = 60;
        const tx = margin + Math.random() * (this.renderer.w - margin * 2);
        const ty = this.renderer.h * 0.4 + Math.random() * (this.renderer.h * 0.5);

        this.kisses.push({
            id: this.nextKissId++,
            targetX: tx,
            targetY: ty,
            targetTime: targetTime, // Time in AudioContext when it should hit
            progress: 0,
            hit: false,
            missed: false,
            chuPlayed: false
        });
    }

    _updateDifficulty(elapsed) {
        // BPM 160 start, increase slightly every 15s
        this.currentBPM = this.baseBPM + Math.floor(elapsed / 15) * 4;
        this.currentBPM = Math.min(this.currentBPM, 230);
        this.audio.setBPM(this.currentBPM);

        // Faster approach: 2.0s -> 1.2s
        this.approachTime = Math.max(1.2, 2.0 - elapsed * 0.015);

        // Density: 1 -> 4
        this.kissesPerBeat = 1 + Math.floor(elapsed / 30) * 0.5;
    }

    _gameLoop(timestamp) {
        if (this.state !== 'playing') return;

        const dt = (timestamp - this.lastFrameTime) / 1000;
        this.lastFrameTime = timestamp;
        
        const audioTime = this.audio.getTime();
        const elapsed = (timestamp - this.startTime) / 1000;
        this.gameTime = elapsed;

        this._updateDifficulty(elapsed);

        let missed = false;
        this.kisses.forEach(kiss => {
            if (kiss.hit || kiss.missed) return;

            // PRECISE PROGRESS CALCULATION
            // progress = 1.0 when audioTime reaches targetTime
            const timeUntilHit = kiss.targetTime - audioTime;
            kiss.progress = 1.0 - (timeUntilHit / this.approachTime);

            // Play sound effect when kiss starts zooming
            if (!kiss.chuPlayed && kiss.progress > 0.1) {
                kiss.chuPlayed = true;
                this.audio.playChu();
            }

            // GAME OVER CONDITION: exact hit point
            if (audioTime >= kiss.targetTime) {
                kiss.missed = true;
                missed = true;
            }
        });

        // Filter out finished notes
        this.kisses = this.kisses.filter(k => {
            if (k.hit && k.progress > 1.3) return false;
            return !k.missed; 
        });

        if (missed) {
            this._gameOver();
            return;
        }

        this._updateHUD();
        this.renderer.render({
            kisses: this.kisses,
            time: elapsed,
            dt: dt
        });

        requestAnimationFrame((t) => this._gameLoop(t));
    }

    _updateHUD() {
        document.getElementById('hud-score').textContent = this.stats.score.toLocaleString();
        document.getElementById('hud-combo').textContent = this.stats.combo;
        document.getElementById('hud-bpm').textContent = Math.round(this.currentBPM);
    }

    _gameOver() {
        this.state = 'gameover';
        this.audio.stopMusic();
        this.audio.playGameOverSound();

        setTimeout(() => {
            this._showScreen('gameover-screen');
            const container = document.getElementById('gameover-kisses');
            container.innerHTML = '';
            for (let i = 0; i < 90; i++) {
                const el = document.createElement('div');
                el.className = 'gameover-kiss-item';
                el.textContent = '💋';
                el.style.left = Math.random() * 95 + '%';
                el.style.top = Math.random() * 92 + '%';
                el.style.fontSize = (1.5 + Math.random() * 3.5) + 'rem';
                el.style.animationDelay = (Math.random() * 2) + 's';
                container.appendChild(el);
            }

            document.getElementById('gameover-score').textContent = this.stats.score.toLocaleString();
            document.getElementById('gameover-blocked').textContent = this.stats.blocked;
            document.getElementById('gameover-maxcombo').textContent = this.stats.maxCombo;
            const s = Math.floor(this.gameTime);
            document.getElementById('gameover-time').textContent = `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
        }, 700);
    }

    restart() {
        document.getElementById('gameover-kisses').innerHTML = '';
        this.start();
    }
}

let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new Game();
});
