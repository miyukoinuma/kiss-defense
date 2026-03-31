// ============================================
// 💋NUMARIN — PERFORMANCE RENDERER (FIXED TRANS)
// Restoring perfect transparency for lips/hand
// ============================================

class GameRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.particles = [];
        this.hands = [];
        this.bgParticles = [];
        this.gameOverKisses = [];
        this.gameOverTextAlpha = 0;
        
        this.images = { lips: new Image(), hand: new Image() };
        this.processedImages = { lips: null, hand: null };
        
        const v = Date.now();
        this.images.lips.crossOrigin = 'anonymous';
        this.images.hand.crossOrigin = 'anonymous';
        this.images.lips.src = `assets/lips_white.png?v=${v}`;
        this.images.hand.src = `assets/hand_back_white.png?v=${v}`;
        this.imagesLoaded = false;
        
        const loadPromises = Object.entries(this.images).map(([key, img]) => {
            return new Promise(resolve => {
                img.onload = () => { this._processImage(key, img); resolve(); };
                img.onerror = resolve;
            });
        });

        Promise.all(loadPromises).then(() => { this.imagesLoaded = true; });
        this._initBgParticles();
    }

    _processImage(key, img) {
        if (!img.complete || img.naturalWidth === 0) return;
        
        // 1. Create a work canvas at original size
        const workCanvas = document.createElement('canvas');
        workCanvas.width = img.width;
        workCanvas.height = img.height;
        const workCtx = workCanvas.getContext('2d');
        workCtx.drawImage(img, 0, 0);
        
        const imageData = workCtx.getImageData(0, 0, workCanvas.width, workCanvas.height);
        const data = imageData.data;
        
        // 2. High-Precision Robust Transparency Keying
        // Catches even compression-noise white/gray
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i+1], b = data[i+2];
            const avg = (r + g + b) / 3;
            
            // Aggressive white removal
            if (r > 200 && g > 200 && b > 200) {
                // If it's bright AND mostly white, make it transparent
                // Threshold 230 is strict white, 200 covers shadows
                if (avg > 235) {
                    data[i+3] = 0;
                } else {
                    // Smooth falloff for edges to avoid jagged white lines
                    data[i+3] = Math.max(0, 255 - (avg - 200) * 7);
                }
            }
        }
        workCtx.putImageData(imageData, 0, 0);
        
        // 3. Store the result (Skip resizing here to preserve clean edges)
        this.processedImages[key] = workCanvas;
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.ctx.scale(dpr, dpr);
        this.w = window.innerWidth;
        this.h = window.innerHeight;
        this.vanishX = this.w / 2;
        this.vanishY = this.h * 0.35;
    }

    _initBgParticles() {
        this.bgParticles = [];
        for (let i = 0; i < 30; i++) {
            this.bgParticles.push({
                x: Math.random() * this.w, y: Math.random() * this.h,
                size: 0.5 + Math.random() * 2, speed: 0.5 + Math.random() * 1.5,
                opacity: 0.1 + Math.random() * 0.2
            });
        }
    }

    clear() {
        const ctx = this.ctx;
        ctx.fillStyle = '#080505';
        ctx.fillRect(0, 0, this.w, this.h);
        const grad = ctx.createRadialGradient(this.vanishX, this.vanishY, 0, this.vanishX, this.vanishY, this.h * 1.2);
        grad.addColorStop(0, 'rgba(212, 175, 55, 0.08)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.w, this.h);
    }

    drawBackground(time) {
        const ctx = this.ctx;
        ctx.save();
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.04)';
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2 + time * 0.015;
            ctx.beginPath(); ctx.moveTo(this.vanishX, this.vanishY);
            ctx.lineTo(this.vanishX + Math.cos(angle) * this.w * 1.5, this.vanishY + Math.sin(angle) * this.h * 1.5);
            ctx.stroke();
        }
        ctx.restore();
    }

    drawKiss(kiss, time) {
        const ctx = this.ctx;
        const p = kiss.progress; if (p < 0 || p > 1.2) return;
        const perspective = Math.pow(p, 2.5);
        const bx = this.vanishX + (kiss.targetX - this.vanishX) * perspective;
        const by = this.vanishY + (kiss.targetY - this.vanishY) * perspective;
        const arcHeight = -240 * Math.sin(Math.PI * p) * (1 - p * 0.5);
        const x = bx; const y = by + arcHeight;
        const size = 30 + 550 * perspective;

        ctx.save();
        ctx.translate(x, y);
        if (p > 0.45) { ctx.shadowColor = '#DC143C'; ctx.shadowBlur = perspective * 50; }
        ctx.rotate(Math.sin(time * 8 + kiss.id) * 0.2 * p);
        ctx.globalAlpha = Math.min(1, p * 6);
        const img = this.processedImages.lips;
        if (img) {
            const aspect = img.width / img.height;
            ctx.drawImage(img, -size * aspect / 2, -size / 2, size * aspect, size);
        } else {
            ctx.font = `${size}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('💋\uFE0F', 0, 0);
        }
        ctx.restore();
    }

    drawHand(hand) {
        const ctx = this.ctx; if (hand.life <= 0) return;
        ctx.save(); ctx.translate(hand.x, hand.y);
        const t = 1 - hand.life;
        const scale = t < 0.15 ? 0.6 + (t / 0.15) * 1.7 : 2.3 - ((t - 0.15) / 0.85) * 1.1;
        ctx.globalAlpha = Math.min(1, hand.life * 2.5);
        ctx.translate(0, -65 * Math.sin(t * Math.PI));
        const img = this.processedImages.hand;
        if (img) {
            const aspect = img.width / img.height;
            const bSize = 180 * scale;
            if (t < 0.25) { ctx.shadowColor = '#D4AF37'; ctx.shadowBlur = 40; }
            ctx.drawImage(img, -(bSize * aspect) / 2, -bSize / 2, bSize * aspect, bSize);
        }
        if (t < 0.4) {
            ctx.beginPath(); ctx.arc(0, 0, (t / 0.4) * 280, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(212, 175, 55, ${0.8 * (1 - t / 0.4)})`; ctx.lineWidth = 4; ctx.stroke();
        }
        ctx.restore();
    }

    startGameOverExplosion(x, y) {
        this.gameOverKisses = [];
        this.gameOverTextAlpha = 0;
        for (let i = 0; i < 450; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 150 + Math.random() * 2400;
            this.gameOverKisses.push({
                x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 20,
                size: 20 + Math.random() * 200, opacity: 1, gravity: 1000 + Math.random() * 1600
            });
        }
    }

    updateGameOverKisses(dt) {
        this.gameOverKisses.forEach(k => {
            k.x += k.vx * dt; k.y += k.vy * dt; k.vy += k.gravity * dt;
            k.rotation += k.rotVel * dt; k.vx *= 0.98; k.vy *= 0.98;
            k.opacity -= 0.35 * dt;
        });
        if (this.gameOverKisses.length > 0) {
            this.gameOverTextAlpha = Math.min(1, this.gameOverTextAlpha + dt * 1.5);
        }
    }

    drawGameOverText() {
        if (this.gameOverTextAlpha <= 0) return;
        const ctx = this.ctx;
        ctx.save();
        ctx.globalAlpha = this.gameOverTextAlpha;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '900 6rem "Playfair Display", serif';
        ctx.shadowColor = '#D4AF37'; ctx.shadowBlur = 40;
        ctx.fillStyle = '#fff';
        ctx.fillText('MISSION OVER', this.w / 2, this.h / 2);
        ctx.font = '700 1rem "Inter", sans-serif';
        ctx.fillStyle = '#D4AF37';
        ctx.fillText('N U M A R I N', this.w / 2, this.h / 2 + 80);
        ctx.restore();
    }

    render(state) {
        const { kisses, time, dt, isGameOver } = state;
        this.clear();
        this.drawBackground(time);
        if (!isGameOver) {
            kisses.filter(k => !k.hit && !k.missed).sort((a,b)=>a.progress-b.progress).forEach(k => this.drawKiss(k, time));
        } else {
            this.updateGameOverKisses(dt || 0.016);
            this.drawGameOverKisses();
            this.drawGameOverText();
        }
        this.hands.forEach(h => this.drawHand(h));
        this.particles = this.particles.filter(p => {
            p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life -= p.decay;
            if (p.life > 0) {
                this.ctx.globalAlpha = p.life; this.ctx.fillStyle = p.color;
                this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); this.ctx.fill();
            }
            return p.life > 0;
        });
        this.hands = this.hands.filter(h => { h.life -= (dt || 0.016) * 2.8; return h.life > 0; });
    }

    drawGameOverKisses() {
        const ctx = this.ctx;
        const img = this.processedImages.lips;
        this.gameOverKisses.forEach(k => {
            if (k.opacity <= 0) return;
            ctx.save(); ctx.translate(k.x, k.y); ctx.rotate(k.rotation); ctx.globalAlpha = k.opacity;
            if (img) {
                const aspect = img.width / img.height;
                ctx.drawImage(img, -k.size * aspect / 2, -k.size / 2, k.size * aspect, k.size);
            }
            ctx.restore();
        });
    }

    addHand(x, y) { this.hands.push({ x, y, life: 1.0 }); }
    addParticles(x, y, count, color = '#D4AF37') {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 5 + Math.random() * 18;
            this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1.0, decay: 0.03 + Math.random() * 0.06, size: 3 + Math.random() * 7, color });
        }
    }
}
