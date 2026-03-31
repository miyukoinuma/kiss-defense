// ============================================
// 💋 KISS DEFENSE — GAME LOGIC
// Endless mode with gradual acceleration
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
        this.startTime = 0;
        this.gameTime = 0;
        this.lastFrameTime = 0;
        this.baseBPM = 80;
        this.currentBPM = 80;
        this.approachTime = 3.0; // seconds for kiss to travel
        this.kissesPerBeat = 1;
        this.lastBeatKissed = -1;
        this._setupInput();
        this._setupButtons();
    }

    _setupButtons() {
        document.getElementById('btn-start').addEventListener('click', () => this.startFromTitle());
        document.getElementById('btn-start').addEventListener('touchend', (e) => {
            e.preventDefault(); this.startFromTitle();
        });
        document.getElementById('btn-retry').addEventListener('click', () => this.restart());
        document.getElementById('btn-retry').addEventListener('touchend', (e) => {
            e.preventDefault(); this.restart();
        });
    }

    _setupInput() {
        // Touch input
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.state !== 'playing') return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                this._handleTap(t.clientX, t.clientY);
            }
        }, { passive: false });

        // Mouse fallback (for testing on PC)
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.state !== 'playing') return;
            this._handleTap(e.clientX, e.clientY);
        });
    }

    _handleTap(x, y) {
        // Show hand at tap position
        this.renderer.addHand(x, y);

        // Find closest hittable kiss
        let bestKiss = null;
        let bestDist = Infinity;
        const hitRadius = Math.max(60, this.renderer.w * 0.12); // generous hit radius

        this.kisses.forEach(kiss => {
            if (kiss.hit || kiss.missed) return;
            if (kiss.progress < 0.45 || kiss.progress > 1.05) return;

            // Calculate screen position of kiss
            const perspective = Math.pow(kiss.progress, 2.2);
            const kx = this.renderer.vanishX + (kiss.targetX - this.renderer.vanishX) * perspective;
            const ky = this.renderer.vanishY + (kiss.targetY - this.renderer.vanishY) * perspective;
            const size = 8 + 52 * perspective;

            const dx = x - kx;
            const dy = y - ky;
            const dist = Math.sqrt(dx * dx + dy * dy);

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

            // Score with combo multiplier
            const comboMultiplier = 1 + Math.floor(this.stats.combo / 5) * 0.2;
            this.stats.score += Math.round(100 * comboMultiplier);

            // Effects
            this.audio.playBlock();
            const perspective = Math.pow(bestKiss.progress, 2.2);
            const kx = this.renderer.vanishX + (bestKiss.targetX - this.renderer.vanishX) * perspective;
            const ky = this.renderer.vanishY + (bestKiss.targetY - this.renderer.vanishY) * perspective;
            this.renderer.addParticles(kx, ky, 15, '#D4AF37');
            this.renderer.addParticles(kx, ky, 8, '#DC143C');

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
        this.gameTime = 0;
        this.currentBPM = this.baseBPM;
        this.approachTime = 3.0;
        this.kissesPerBeat = 1;
        this.lastBeatKissed = -1;

        this._showScreen('game-screen');
        this._updateHUD();

        // Setup audio beat callback to spawn kisses
        this.audio.onBeat = (beatNum, time) => {
            // Spawn on whole beats only
            if (beatNum % 1 !== 0) return;
            if (beatNum <= this.lastBeatKissed) return;
            this.lastBeatKissed = beatNum;
            this._spawnKisses(beatNum);
        };

        this.audio.startMusic(this.currentBPM);
        this.startTime = performance.now();
        this.lastFrameTime = this.startTime;

        requestAnimationFrame((t) => this._gameLoop(t));
    }

    _spawnKisses(beatNum) {
        const count = this.kissesPerBeat + (Math.random() < 0.3 ? 1 : 0);
        for (let i = 0; i < count; i++) {
            // Random target position, avoiding edges
            const margin = 60;
            const tx = margin + Math.random() * (this.renderer.w - margin * 2);
            const ty = this.renderer.h * 0.45 + Math.random() * (this.renderer.h * 0.45);

            this.kisses.push({
                id: this.nextKissId++,
                targetX: tx,
                targetY: ty,
                spawnTime: performance.now(),
                progress: 0,
                hit: false,
                missed: false,
                chuPlayed: false
            });
        }
    }

    _updateDifficulty() {
        // Accelerate over time
        const elapsed = this.gameTime;
        // BPM: 80 → increases by 4 every 12 seconds
        this.currentBPM = this.baseBPM + Math.floor(elapsed / 12) * 4;
        this.currentBPM = Math.min(this.currentBPM, 200);
        this.audio.setBPM(this.currentBPM);

        // Approach time: 3.0 → decreases
        this.approachTime = Math.max(1.0, 3.0 - elapsed * 0.02);

        // Kisses per beat: increases every 25 seconds
        this.kissesPerBeat = 1 + Math.floor(elapsed / 25);
        this.kissesPerBeat = Math.min(this.kissesPerBeat, 5);
    }

    _gameLoop(timestamp) {
        if (this.state !== 'playing') return;

        const dt = (timestamp - this.lastFrameTime) / 1000;
        this.lastFrameTime = timestamp;
        this.gameTime = (timestamp - this.startTime) / 1000;

        this._updateDifficulty();

        // Update kiss progress
        let missed = false;
        this.kisses.forEach(kiss => {
            if (kiss.hit || kiss.missed) return;
            const elapsed = (timestamp - kiss.spawnTime) / 1000;
            kiss.progress = elapsed / this.approachTime;

            // Play chu sound when kiss becomes visible
            if (!kiss.chuPlayed && kiss.progress > 0.05) {
                kiss.chuPlayed = true;
                this.audio.playChu();
            }

            // Check if kiss got through
            if (kiss.progress >= 1.0) {
                kiss.missed = true;
                missed = true;
            }
        });

        // Clean up old hit kisses
        this.kisses = this.kisses.filter(k => {
            if (k.hit && k.progress > 1.5) return false;
            if (k.missed && !missed) return false;
            return true;
        });

        if (missed) {
            this._gameOver();
            return;
        }

        // Update HUD
        this._updateHUD();

        // Render
        this.renderer.render({
            kisses: this.kisses,
            time: this.gameTime,
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

        // Show game over screen
        setTimeout(() => {
            this._showScreen('gameover-screen');

            // Fill screen with 💋
            const container = document.getElementById('gameover-kisses');
            container.innerHTML = '';
            const count = 80;
            for (let i = 0; i < count; i++) {
                const el = document.createElement('div');
                el.className = 'gameover-kiss-item';
                el.textContent = '💋';
                el.style.left = Math.random() * 95 + '%';
                el.style.top = Math.random() * 90 + '%';
                el.style.fontSize = (1.2 + Math.random() * 3) + 'rem';
                el.style.animationDelay = (Math.random() * 1.5) + 's';
                container.appendChild(el);
            }

            // Show stats
            document.getElementById('gameover-score').textContent = this.stats.score.toLocaleString();
            document.getElementById('gameover-blocked').textContent = this.stats.blocked;
            document.getElementById('gameover-maxcombo').textContent = this.stats.maxCombo;
            const secs = Math.floor(this.gameTime);
            const min = Math.floor(secs / 60);
            const sec = String(secs % 60).padStart(2, '0');
            document.getElementById('gameover-time').textContent = `${min}:${sec}`;
        }, 600);
    }

    restart() {
        document.getElementById('gameover-kisses').innerHTML = '';
        this.start();
    }
}

// --- Initialize ---
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new Game();
});
