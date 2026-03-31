// ============================================
// 💋 KISS DEFENSE — CANVAS RENDERER
// ============================================

class GameRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.particles = [];
        this.hands = [];      // tap hand animations
        this.bgParticles = []; // gold background particles
        
        // --- Image Assets ---
        this.images = {
            lips: new Image(),
            hand: new Image()
        };
        this.images.lips.src = 'assets/lips.png';
        this.images.hand.src = 'assets/hand.png';
        this.imagesLoaded = false;
        
        const loadPromises = Object.values(this.images).map(img => {
            return new Promise(resolve => {
                img.onload = resolve;
                img.onerror = resolve; // Continue anyway
            });
        });
        Promise.all(loadPromises).then(() => {
            this.imagesLoaded = true;
        });

        this._initBgParticles();
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.ctx.scale(dpr, dpr);
        this.w = window.innerWidth;
        this.h = window.innerHeight;
        this.vanishX = this.w / 2;
        this.vanishY = this.h * 0.28;
    }

    _initBgParticles() {
        this.bgParticles = [];
        for (let i = 0; i < 35; i++) {
            this.bgParticles.push({
                x: Math.random() * 1000,
                y: Math.random() * 1000,
                size: 0.5 + Math.random() * 2,
                speed: 0.1 + Math.random() * 0.3,
                opacity: 0.1 + Math.random() * 0.2,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    clear() {
        const ctx = this.ctx;
        const grad = ctx.createRadialGradient(
            this.vanishX, this.vanishY, 0,
            this.vanishX, this.vanishY, this.h * 0.8
        );
        grad.addColorStop(0, '#0f0808');
        grad.addColorStop(0.5, '#080404');
        grad.addColorStop(1, '#050202');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.w, this.h);
    }

    drawBackground(time) {
        const ctx = this.ctx;
        ctx.save();
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.03)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + time * 0.05;
            const ex = this.vanishX + Math.cos(angle) * this.w;
            const ey = this.vanishY + Math.sin(angle) * this.h;
            ctx.beginPath();
            ctx.moveTo(this.vanishX, this.vanishY);
            ctx.lineTo(ex, ey);
            ctx.stroke();
        }
        ctx.restore();

        ctx.save();
        this.bgParticles.forEach(p => {
            const px = (p.x / 1000) * this.w;
            const py = (p.y / 1000) * this.h;
            p.y -= p.speed * 0.5;
            p.x += Math.sin(time * 0.5 + p.phase) * 0.3;
            if (p.y < 0) { p.y = 1000; p.x = Math.random() * 1000; }
            ctx.globalAlpha = p.opacity * (0.7 + 0.3 * Math.sin(time + p.phase));
            ctx.fillStyle = '#D4AF37';
            ctx.beginPath();
            ctx.arc(px, py, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }

    drawKiss(kiss, time) {
        const ctx = this.ctx;
        const p = kiss.progress;
        if (p < 0 || p > 1.2) return;

        const perspective = Math.pow(p, 2.2);
        const x = this.vanishX + (kiss.targetX - this.vanishX) * perspective;
        const y = this.vanishY + (kiss.targetY - this.vanishY) * perspective;
        // Size significantly increased
        const size = 15 + 140 * perspective;

        ctx.save();
        ctx.translate(x, y);

        // Strong Red Glow for Lips
        ctx.shadowColor = 'rgba(220, 20, 60, 0.8)';
        ctx.shadowBlur = 15 + perspective * 30;

        const wobble = Math.sin(time * 8 + kiss.id * 2) * 5 * perspective;
        ctx.rotate(wobble * 0.03);

        ctx.globalAlpha = Math.min(1, p * 4);

        if (this.imagesLoaded) {
            const img = this.images.lips;
            const aspect = img.width / img.height;
            const iw = size * aspect;
            const ih = size;
            ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);
        } else {
            ctx.font = `${size}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('💋\uFE0F', 0, 0);
        }

        ctx.restore();
    }

    drawHand(hand) {
        const ctx = this.ctx;
        if (hand.life <= 0) return;

        ctx.save();
        ctx.translate(hand.x, hand.y);

        const t = 1 - hand.life;
        let scale;
        let offsetZ;

        if (t < 0.15) {
            // Thrust forward surge
            const surge = t / 0.15;
            scale = 0.5 + surge * 1.5; 
            offsetZ = -30 * surge * (2 - surge);
        } else {
            // Slower recoil
            const fade = (t - 0.15) / 0.85;
            scale = 2.0 - fade * 0.8;
            offsetZ = -30 + fade * 15;
        }

        ctx.globalAlpha = Math.min(1, hand.life * 1.5);
        ctx.translate(0, offsetZ);

        if (this.imagesLoaded) {
            const img = this.images.hand;
            const aspect = img.width / img.height;
            const baseSize = 130 * scale;
            const iw = baseSize * aspect;
            const ih = baseSize;
            
            // Thrust Aura
            if (t < 0.25) {
                ctx.save();
                ctx.globalCompositeOperation = 'screen';
                ctx.shadowColor = '#D4AF37';
                ctx.shadowBlur = 40 * (1 - t / 0.25);
                ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);
                ctx.restore();
            }

            ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);
        } else {
            ctx.font = `${90 * scale}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('✋', 0, 0);
        }

        // --- Shockwave Circle ---
        if (t < 0.45) {
            ctx.beginPath();
            const ringSize = (t / 0.45) * 180;
            ctx.arc(0, 0, ringSize, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(212, 175, 55, ${0.6 * (1 - t / 0.45)})`;
            ctx.lineWidth = 4;
            ctx.stroke();
        }

        ctx.restore();
    }

    addHand(x, y) {
        this.hands.push({ x, y, life: 1.0 });
    }

    addParticles(x, y, count, color = '#D4AF37') {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 4 + Math.random() * 12;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                decay: 0.02 + Math.random() * 0.04,
                size: 2 + Math.random() * 6,
                color
            });
        }
    }

    updateEffects(dt) {
        this.hands = this.hands.filter(h => {
            h.life -= dt * 2.8;
            return h.life > 0;
        });
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.15;
            p.life -= p.decay;
            return p.life > 0;
        });
    }

    drawParticles() {
        const ctx = this.ctx;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        this.particles.forEach(p => {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }

    render(state) {
        const { kisses, time, dt } = state;
        this.clear();
        this.drawBackground(time);
        
        const activeKisses = kisses.filter(k => !k.hit && !k.missed);
        activeKisses.sort((a, b) => a.progress - b.progress);
        activeKisses.forEach(k => this.drawKiss(k, time));

        this.hands.forEach(h => this.drawHand(h));
        this.drawParticles();
        this.updateEffects(dt || 0.016);
    }
}
