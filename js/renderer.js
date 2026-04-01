// ============================================
// 💋NUMARIN — 3D PERSPECTIVE RENDERER
// Z-Sorting & Responsive UI Optimization
// ============================================

class GameRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.particles = [];
        this.hands = [];
        this.gameOverKisses = [];
        this.gameOverTextAlpha = 0;
        
        this.images = { lips: new Image(), hand: new Image() };
        this.processedImages = { lips: null, hand: null };
        
        const v = Date.now();
        this.images.lips.crossOrigin = 'anonymous';
        this.images.hand.crossOrigin = 'anonymous';
        this.images.lips.src = `assets/lips_white.png?v=${v}`;
        this.images.hand.src = `assets/hand_back_white.png?v=${v}`;
        
        Object.entries(this.images).forEach(([key, img]) => {
            img.onload = () => { this._processImage(key, img); };
            img.onerror = () => { console.warn(`Asset ${key} failed to load.`); };
        });
    }

    _processImage(key, img) {
        if (!img.complete || img.naturalWidth === 0) return;
        const workCanvas = document.createElement('canvas');
        workCanvas.width = img.width; workCanvas.height = img.height;
        const workCtx = workCanvas.getContext('2d');
        workCtx.drawImage(img, 0, 0);
        const imageData = workCtx.getImageData(0, 0, workCanvas.width, workCanvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i+1], b = data[i+2];
            if (r > 210 && g > 210 && b > 210) {
                const avg = (r+g+b)/3;
                data[i+3] = avg > 240 ? 0 : Math.max(0, 255 - (avg-210)*6);
            }
        }
        workCtx.putImageData(imageData, 0, 0);
        this.processedImages[key] = workCanvas;
    }

    resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.ctx.scale(dpr, dpr);
        this.w = window.innerWidth;
        this.h = window.innerHeight;
        this.vanishX = this.w / 2;
        this.vanishY = this.h * 0.35;
    }

    reset() {
        this.particles = [];
        this.hands = [];
        this.gameOverKisses = [];
        this.gameOverTextAlpha = 0;
    }

    clear() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.w, this.h);
        ctx.fillStyle = '#080505';
        ctx.fillRect(0, 0, this.w, this.h);
        const grad = ctx.createRadialGradient(this.vanishX, this.vanishY, 0, this.vanishX, this.vanishY, this.h * 0.8);
        grad.addColorStop(0, 'rgba(212, 175, 55, 0.08)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.w, this.h);
    }

    drawKiss(kiss, time) {
        const ctx = this.ctx;
        const p = kiss.progress; if (p < 0 || p > 1.2) return;
        const perspective = Math.pow(p, 2.5);
        const bx = this.vanishX + (kiss.targetX - this.vanishX) * perspective;
        const by = this.vanishY + (kiss.targetY - this.vanishY) * perspective;
        const arcHeight = -240 * Math.sin(Math.PI * p) * Math.max(0, 1 - p * 1.1);
        const x = bx; const y = by + arcHeight;
        const size = (10 + 280 * perspective); 

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.sin(time * 8 + kiss.id) * 0.15 * p);
        ctx.globalAlpha = Math.min(1, p * 8);
        
        const img = this.processedImages.lips;
        if (img) {
            const aspect = img.width / img.height;
            ctx.drawImage(img, -size * aspect / 2, -size / 2, size * aspect, size);
        } else {
            ctx.font = `${Math.floor(size)}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
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
        // REDUCED BOUNCE: From 65 down to 30 to prevent "flying hand" feel
        ctx.translate(0, -30 * Math.sin(t * Math.PI));
        const img = this.processedImages.hand;
        if (img) {
            const aspect = img.width / img.height;
            const bSize = 65 * scale;
            ctx.drawImage(img, -(bSize * aspect) / 2, -bSize / 2, bSize * aspect, bSize);
        }
        ctx.restore();
    }

    startGameOverExplosion(x, y) {
        this.gameOverKisses = [];
        this.gameOverTextAlpha = 0;
        for (let i = 0; i < 350; i++) { 
            const angle = Math.random() * Math.PI * 2;
            const speed = 100 + Math.random() * 2000;
            this.gameOverKisses.push({
                x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 20,
                size: 20 + Math.random() * 180, opacity: 1, gravity: 1000 + Math.random() * 1600
            });
        }
    }

    render(state) {
        const { kisses, time, dt, isGameOver } = state;
        this.clear();
        
        if (!isGameOver) {
            // --- Z-SORTING: Furthest (low p) drawn first, Nearest (high p) drawn last ---
            const sortedKisses = [...kisses].filter(k => !k.hit && !k.missed).sort((a,b) => a.progress - b.progress);
            sortedKisses.forEach(k => this.drawKiss(k, time));
        } else {
            this.gameOverKisses.forEach(k => {
                k.x += k.vx * dt; k.y += k.vy * dt; k.vy += k.gravity * dt;
                k.rotation += k.rotVel * dt; k.vx *= 0.98; k.vy *= 0.98;
                k.opacity -= 0.35 * dt;
                if (k.opacity > 0) {
                    this.ctx.save(); this.ctx.translate(k.x, k.y); this.ctx.rotate(k.rotation); this.ctx.globalAlpha = k.opacity;
                    const img = this.processedImages.lips;
                    if (img) { const aspect = img.width/img.height; this.ctx.drawImage(img, -k.size*aspect/2, -k.size/2, k.size*aspect, k.size); }
                    this.ctx.restore();
                }
            });
            this.gameOverTextAlpha = Math.min(1, this.gameOverTextAlpha + dt * 1.5);
            this._drawGameOverText();
        }
        
        this.hands.forEach(h => this.drawHand(h));
        this.hands = this.hands.filter(h => { h.life -= (dt || 0.016) * 2.8; return h.life > 0; });
        this.particles = this.particles.filter(p => {
            p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life -= p.decay;
            if (p.life > 0) {
                this.ctx.globalAlpha = p.life; this.ctx.fillStyle = p.color;
                this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); this.ctx.fill();
            }
            return p.life > 0;
        });
    }

    _drawGameOverText() {
        if (this.gameOverTextAlpha <= 0) return;
        const ctx = this.ctx; ctx.save(); ctx.globalAlpha = this.gameOverTextAlpha;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        
        // RESPONSIVE LOGO SIZE: Adjust based on screen width (max-limited for desktop)
        const baseSize = Math.min(3.2, this.w / 100);
        ctx.font = `900 ${baseSize}rem "Playfair Display", serif`;
        ctx.fillStyle = '#fff'; ctx.fillText('MISSION OVER', this.w / 2, this.h / 2);
        
        ctx.font = `700 ${Math.min(1.2, baseSize/3)}rem "Inter", sans-serif`;
        ctx.fillStyle = '#D4AF37';
        ctx.fillText('N U M A R I N', this.w / 2, this.h / 2 + (baseSize * 15));
        ctx.restore();
    }

    addHand(x, y) { this.hands.push({ x, y, life: 1.0 }); }
    addParticles(x, y, count, color = '#D4AF37') {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 5 + Math.random() * 18;
            this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1.0, decay: 0.03 + Math.random() * 0.06, size: 2 + Math.random() * 6, color });
        }
    }
}
