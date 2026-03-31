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
        // Deep black with subtle gradient
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
        // Subtle perspective tunnel lines
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

        // Gold floating particles
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

        // Vanishing point glow
        ctx.save();
        const vpGrad = ctx.createRadialGradient(
            this.vanishX, this.vanishY, 0,
            this.vanishX, this.vanishY, 60
        );
        vpGrad.addColorStop(0, 'rgba(220, 20, 60, 0.15)');
        vpGrad.addColorStop(1, 'rgba(220, 20, 60, 0)');
        ctx.fillStyle = vpGrad;
        ctx.fillRect(this.vanishX - 60, this.vanishY - 60, 120, 120);
        ctx.restore();
    }

    drawKiss(kiss, time) {
        const ctx = this.ctx;
        const p = kiss.progress;
        if (p < 0 || p > 1.2) return;

        // 3D perspective interpolation
        const perspective = Math.pow(p, 2.2);
        const x = this.vanishX + (kiss.targetX - this.vanishX) * perspective;
        const y = this.vanishY + (kiss.targetY - this.vanishY) * perspective;
        const size = 8 + 52 * perspective;

        ctx.save();
        ctx.translate(x, y);

        // Glow behind kiss
        if (p > 0.3) {
            ctx.shadowColor = 'rgba(220, 20, 60, 0.5)';
            ctx.shadowBlur = 10 + perspective * 20;
        }

        // Wobble animation
        const wobble = Math.sin(time * 8 + kiss.id * 2) * 3 * perspective;
        ctx.rotate(wobble * 0.03);

        // Draw 💋 emoji
        ctx.font = `${size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = Math.min(1, p * 3);
        ctx.fillText('💋', wobble, 0);

        ctx.restore();
    }

    drawHand(hand) {
        const ctx = this.ctx;
        if (hand.life <= 0) return;

        ctx.save();
        ctx.translate(hand.x, hand.y);

        // Scale: starts small, grows, then shrinks
        const t = 1 - hand.life;
        let scale;
        if (t < 0.2) {
            scale = 0.4 + (t / 0.2) * 0.9; // 0.4 → 1.3
        } else {
            scale = 1.3 - ((t - 0.2) / 0.8) * 0.6; // 1.3 → 0.7
        }

        ctx.globalAlpha = hand.life;

        // Push-forward effect: slight upward shift
        const pushY = -15 * (t < 0.3 ? t / 0.3 : 1);
        ctx.translate(0, pushY);

        // Draw hand emoji in skin color
        ctx.font = `${65 * scale}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Glow effect
        ctx.shadowColor = 'rgba(255, 220, 180, 0.6)';
        ctx.shadowBlur = 15 * hand.life;

        ctx.fillText('✋', 0, 0);

        ctx.restore();
    }

    addHand(x, y) {
        this.hands.push({ x, y, life: 1.0 });
    }

    addParticles(x, y, count, color = '#D4AF37') {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 6;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                decay: 0.015 + Math.random() * 0.025,
                size: 1 + Math.random() * 4,
                color
            });
        }
    }

    updateEffects(dt) {
        // Update hands
        this.hands = this.hands.filter(h => {
            h.life -= dt * 3;
            return h.life > 0;
        });
        // Update particles
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.12;
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

    // Render one full frame
    render(state) {
        const { kisses, time, dt } = state;
        this.clear();
        this.drawBackground(time);

        // Draw kisses sorted by depth (furthest first)
        const activeKisses = kisses.filter(k => !k.hit && !k.missed);
        activeKisses.sort((a, b) => a.progress - b.progress);
        activeKisses.forEach(k => this.drawKiss(k, time));

        // Draw hit effects (hands)
        this.hands.forEach(h => this.drawHand(h));

        // Draw particles
        this.drawParticles();

        // Update animations
        this.updateEffects(dt || 0.016);
    }
}
