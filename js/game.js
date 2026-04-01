// ============================================
// 💋NUMARIN — GLOBAL LEADERBOARD ENGINE (dreamlo)
// Resilient & Multi-device Sync
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
        this.playerName = 'GUEST';

        // --- dreamlo Configuration ---
        // NOTE: These are public/private keys for the NUMARIN global board.
        this.dreamloPublicK = "660a5f1e8f407b122822a98f";
        this.dreamloPrivateK = "m3W-Cj-rME-H6p-Z9W-ZswW0-kEqV-13009pC9Q7vXyA"; 

        this.baseBPM = 108;
        this.currentBPM = 108;
        this.gameTime = 0; 
        this.startTime = 0;
        this.lastFrameTimestamp = 0;
        this.lastBeatProcessed = -1;

        this._setupInput();
        this._setupButtons();
        
        // Initial leaderboard load
        this._updateLeaderboardUI();
    }

    _setupButtons() {
        const startBtn = document.getElementById('btn-start');
        const retryBtn = document.getElementById('btn-retry');
        
        const handleStart = (e) => {
            if (this.state === 'title') {
                const nameInput = document.getElementById('player-name');
                this.playerName = nameInput.value.trim().substring(0, 10).toUpperCase() || 'ANONYMOUS';
                try { this.audio.init(); } catch (e) {} 
                this.start();
            }
        };

        const handleRetry = (e) => {
            if (this.state === 'gameover') {
                try { this.audio.resume(); } catch (e) {}
                this.restart();
            }
        };

        startBtn.addEventListener('touchstart', (e) => { handleStart(e); }, { passive: true });
        startBtn.addEventListener('click', (e) => { handleStart(e); });
        retryBtn.addEventListener('touchstart', (e) => { handleRetry(e); }, { passive: true });
        retryBtn.addEventListener('click', (e) => { handleRetry(e); });
    }

    _setupInput() {
        const handleTap = (x, y) => { if (this.state === 'playing') this._handleTap(x, y); };
        this.canvas.addEventListener('touchstart', (e) => {
            if (this.state === 'playing') e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                handleTap(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
            }
        }, { passive: false });
        this.canvas.addEventListener('mousedown', (e) => { handleTap(e.clientX, e.clientY); });
    }

    _handleTap(x, y) {
        this.renderer.addHand(x, y);
        let bestKiss = null;
        let bestDist = Infinity;
        const hitRadius = Math.max(80, this.renderer.w * 0.15);

        this.kisses.forEach(kiss => {
            if (kiss.hit || kiss.missed) return;
            const timeDiff = Math.abs(this.gameTime - kiss.targetTime);
            if (timeDiff > 0.7) return;

            const p = kiss.progress;
            const perspective = Math.pow(p, 2.5);
            const bx = this.renderer.vanishX + (kiss.targetX - this.renderer.vanishX) * perspective;
            const by = this.renderer.vanishY + (kiss.targetY - this.renderer.vanishY) * perspective;
            const arcHeight = -240 * Math.sin(Math.PI * p) * Math.max(0, 1 - p * 1.1);
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
            try { this.audio.playBlock(); } catch (e) {}

            const p = bestKiss.progress;
            const kx = this.renderer.vanishX + (bestKiss.targetX - this.renderer.vanishX) * Math.pow(p, 2.5);
            const ky = (this.renderer.vanishY + (bestKiss.targetY - this.renderer.vanishY) * Math.pow(p, 2.5)) + (-240 * Math.sin(Math.PI * p) * Math.max(0, 1 - p * 1.1));
            this.renderer.addParticles(kx, ky, 35, '#D4AF37');
            this._updateHUD();
        }
    }

    start() {
        console.log("NUMARIN Session Started (World Ranking Enabled)");
        this.state = 'playing';
        this.kisses = [];
        this.stats = { score: 0, combo: 0, maxCombo: 0, blocked: 0 };
        this.nextKissId = 0;
        this.currentBPM = this.baseBPM;
        this.startTime = performance.now();
        this.lastFrameTimestamp = this.startTime;
        this.lastBeatProcessed = -1;
        this.gameTime = 0;

        this.renderer.reset(); 
        this._showScreen('game-screen');
        this._updateHUD();

        requestAnimationFrame((t) => this._gameLoop(t));
    }

    _gameLoop(timestamp) {
        const dt = (timestamp - this.lastFrameTimestamp) / 1000;
        this.lastFrameTimestamp = timestamp;
        
        if (this.state === 'playing') {
            this.gameTime = (timestamp - this.startTime) / 1000;
            const secPerBeat = 60 / this.currentBPM;
            const currentBeat = this.gameTime / secPerBeat;
            const beatInt = Math.floor(currentBeat * 4);

            if (beatInt > this.lastBeatProcessed) {
                this.lastBeatProcessed = beatInt;
                this._processBeat(beatInt / 4);
            }

            let missedKiss = null;
            this.kisses.forEach(kiss => {
                if (kiss.hit || kiss.missed) return;
                const travelTime = kiss.targetTime - kiss.spawnTime;
                const timeRemaining = kiss.targetTime - this.gameTime;
                kiss.progress = Math.max(0, Math.min(1.2, 1.0 - (timeRemaining / travelTime)));

                if (!kiss.chuPlayed && kiss.progress > 0.2) {
                    kiss.chuPlayed = true; try { this.audio.playChu(); } catch (e) {}
                }
                if (kiss.progress > 1.05) {
                    kiss.missed = true; missedKiss = kiss;
                }
            });

            if (missedKiss) { this._gameOver(missedKiss); }
            this._updateHUD();
        }

        this.renderer.render({
            kisses: this.kisses,
            time: this.gameTime,
            dt: dt,
            isGameOver: this.state === 'gameover'
        });

        requestAnimationFrame((t) => this._gameLoop(t));
    }

    _processBeat(beatNum) {
        const cycleBeat = beatNum % 8;
        const motif = [0, 0.25, 0.5, 0.75, 2.5, 2.75, 3.0, 3.25, 5.0, 5.25, 5.5, 5.75, 6.5, 6.75, 7.0, 7.25];
        if (motif.some(b => Math.abs(b - cycleBeat) < 0.1)) {
            const freq = cycleBeat >= 0.75 && cycleBeat < 1.0 || cycleBeat >= 3.25 && cycleBeat < 4.0 ? 349.23 : 440.00;
            try { this.audio.playFateTone(freq); } catch (e) {}
        }
        const beatsToTarget = 4;
        const spawnBeat = (beatNum + beatsToTarget) % 8;
        if (motif.some(b => Math.abs(b - spawnBeat) < 0.1)) {
            const secPerBeat = 60 / this.currentBPM;
            const targetTime = this.gameTime + beatsToTarget * secPerBeat;
            this._spawnKiss(targetTime, beatsToTarget * secPerBeat);
        }
    }

    _spawnKiss(targetTime, travelTime) {
        const margin = 40;
        const tx = margin + Math.random() * (this.renderer.w - margin * 2);
        const ty = this.renderer.h * 0.8 + Math.random() * (this.renderer.h * 0.15);
        this.kisses.push({ id: this.nextKissId++, targetX: tx, targetY: ty, targetTime: targetTime, spawnTime: targetTime - travelTime, progress: 0, hit: false, missed: false, chuPlayed: false });
    }

    _updateHUD() {
        document.getElementById('hud-score').textContent = this.stats.score.toLocaleString();
        document.getElementById('hud-combo').textContent = this.stats.combo;
        document.getElementById('hud-bpm').textContent = Math.round(this.currentBPM);
    }

    _gameOver(missedKiss) {
        if (this.state === 'gameover') return;
        this.state = 'gameover';
        try { this.audio.playGameOverSound(); } catch (e) {}
        
        const p = missedKiss.progress;
        const perspective = Math.pow(p, 2.5);
        const kx = this.renderer.vanishX + (missedKiss.targetX - this.renderer.vanishX) * perspective;
        const ky = (this.renderer.vanishY + (missedKiss.targetY - this.renderer.vanishY) * perspective);
        
        this.renderer.startGameOverExplosion(kx, ky);

        // --- UPDATE RESULT DISPLAY (FIX SCORE 0) ---
        // Force update DOM immediately
        const finalScore = this.stats.score;
        document.getElementById('gameover-score').textContent = finalScore.toLocaleString();
        document.getElementById('gameover-blocked').textContent = this.stats.blocked;
        document.getElementById('gameover-maxcombo').textContent = this.stats.maxCombo;

        const duration = (performance.now() - this.startTime) / 1000;
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60).toString().padStart(2, '0');
        document.getElementById('gameover-time').textContent = `${minutes}:${seconds}`;

        // Global Save & Refresh
        this._saveScoreToCloud(this.playerName, finalScore);
        
        setTimeout(() => { 
            if (this.state === 'gameover') this._showScreen('gameover-screen'); 
        }, 2200);
    }

    // --- dreamlo World Leaderboard Integration ---
    async _saveScoreToCloud(name, score) {
        if (score <= 0) return;
        const url = `https://www.dreamlo.com/lb/${this.dreamloPrivateK}/add/${encodeURIComponent(name)}/${score}`;
        try {
            await fetch(url);
            this._updateLeaderboardUI(); // Refresh list after saving
        } catch (e) {
            console.error("Cloud save failed:", e);
        }
    }

    async _updateLeaderboardUI() {
        const list = document.getElementById('leaderboard-list');
        list.innerHTML = '<p style="opacity: 0.3; font-size: 0.7rem;">SYNCING GLOBAL RECORDS...</p>';
        
        const url = `https://www.dreamlo.com/lb/${this.dreamloPublicK}/json`;
        try {
            const resp = await fetch(url);
            const data = await resp.json();
            let scores = data.dreamlo.leaderboard.entry;
            
            // Handle single entry or empty case
            if (!scores) scores = [];
            else if (!Array.isArray(scores)) scores = [scores];

            list.innerHTML = scores.slice(0, 5).map((s, i) => `
                <div class="leaderboard-item ${s.name === this.playerName && parseInt(s.score) === this.stats.score ? 'current-player' : ''}">
                    <span class="leaderboard-rank">#${i + 1}</span>
                    <span class="leaderboard-name">${s.name}</span>
                    <span class="leaderboard-score">${parseInt(s.score).toLocaleString()}</span>
                </div>
            `).join('') || '<p style="opacity: 0.3; font-size: 0.8rem;">NO RECORDS YET</p>';
        } catch (e) {
            list.innerHTML = '<p style="opacity: 0.3; font-size: 0.7rem;">OFFLINE MODE</p>';
        }
    }

    _showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    }

    restart() { this.start(); }
}

let game;
document.addEventListener('DOMContentLoaded', () => { game = new Game(); });
