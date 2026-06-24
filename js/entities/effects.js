class Effect {
    constructor(x, y) { this.x = x; this.y = y; this.life = 1; }
    update() { this.life--; return this.life > 0; }
    draw() {}
}

class ConfusionEffect extends Effect {
    constructor(x, y, size) {
        super(x, y);
        this.life = 42;
        this.maxLife = 42;
        this.size = size;
    }
    draw() {
        const alpha = this.life / this.maxLife;
        const rise = (1 - alpha) * 14 * scale;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `900 ${18 * scale}px Arial`;
        ctx.fillStyle = '#ce93d8';
        ctx.strokeStyle = '#4a148c';
        ctx.lineWidth = 2 * scale;
        const labelY = this.y - this.size - 10 * scale - rise;
        ctx.strokeText('↶ 迷乱', this.x, labelY);
        ctx.fillText('↶ 迷乱', this.x, labelY);
        ctx.restore();
    }
}

class OverloadAlertEffect extends Effect {
    constructor(x, y) { super(x, y); this.life = 44; this.maxLife = 44; }
    draw() {
        const p = 1 - this.life / this.maxLife;
        const a = (1 - p) * 0.85;
        const r = p * 40 * scale;
        ctx.save();
        ctx.strokeStyle = `rgba(255,40,40,${a})`;
        ctx.lineWidth = (4 * (1 - p)) * scale;
        ctx.shadowColor = '#ff1744'; ctx.shadowBlur = 16 * scale;
        ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = `rgba(255,120,120,${a * 0.5})`;
        ctx.lineWidth = (2 * (1 - p)) * scale;
        ctx.beginPath(); ctx.arc(this.x, this.y, r * 1.4, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    }
}

class OverloadReloadPulseEffect extends Effect {
    constructor(x, y) { super(x, y); this.life = 28; this.maxLife = 28; }
    draw() {
        const p = 1 - this.life / this.maxLife;
        const a = (1 - p) * 0.6;
        const r = p * 30 * scale;
        ctx.save();
        ctx.strokeStyle = `rgba(255,235,130,${a})`;
        ctx.lineWidth = (3 * (1 - p)) * scale;
        ctx.setLineDash([5 * scale, 4 * scale]);
        ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }
}

class GoldEffect extends Effect {
    constructor(x, y, amount) { super(x, y); this.amount = amount; this.life = 60; this.initialY = y; }
    update() { this.y = this.initialY - (30 * scale * (1 - this.life / 60)); return super.update(); }
    draw() { const alpha = this.life / 60; ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`; ctx.font = `bold ${16 * scale}px Arial`; ctx.textAlign = 'center'; ctx.fillText(`+$${this.amount}`, this.x, this.y); }
}

class SpotlightCritEffect extends Effect {
    constructor(x, y, mult) { super(x, y); this.life = 26; this.maxLife = 26; this.mult = mult; this.startY = y; }
    update() { return super.update(); }
    draw() {
        const a = this.life / this.maxLife;
        const pop = 1 - a;
        ctx.save();
        ctx.font = `bold ${14 * scale}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.strokeStyle = `rgba(255,170,0,${a})`;
        ctx.lineWidth = 2 * scale;
        const label = this.mult >= 2 ? '暴击!' : '暴击!';
        ctx.strokeText(label, this.x, this.startY - pop * 10 * scale);
        ctx.fillText(label, this.x, this.startY - pop * 10 * scale);
        ctx.restore();
    }
}

class ExplosionEffect extends Effect {
    constructor(x, y, radius) {
        super(x, y);
        this.maxRadius = radius; this.life = 32; this.maxLife = 32;
        this.sparks = [];
        const n = Math.min(14, Math.max(6, Math.round(radius / 6)));
        for (let i = 0; i < n; i++) {
            const a = effectRandom() * Math.PI * 2;
            const sp = (1 + effectRandom() * 3.5) * scale * (radius / 100 + 0.8);
            this.sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 12 + effectRandom() * 14, size: (1 + effectRandom() * 1.8) * scale });
        }
        SFX.play('explosion');
    }
    update() {
        this.currentRadius = this.maxRadius * Math.sqrt(1 - this.life / this.maxLife);
        this.sparks.forEach(p => { p.x += p.vx; p.y += p.vy; p.vx *= 0.9; p.vy *= 0.9; p.life--; });
        this.sparks = this.sparks.filter(p => p.life > 0);
        return super.update();
    }
    draw() {
        const progress = 1 - this.life / this.maxLife;
        const alpha = Math.sin((this.life / this.maxLife) * Math.PI * 0.5 + 0.0001);
        ctx.save();
        const r = Math.max(0.1, this.currentRadius);
        const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r);
        g.addColorStop(0, `rgba(255,255,245,${alpha * 0.95})`);
        g.addColorStop(0.35, `rgba(255,213,79,${alpha * 0.85})`);
        g.addColorStop(0.7, `rgba(255,111,0,${alpha * 0.55})`);
        g.addColorStop(1, 'rgba(120,30,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(255,236,179,${(1 - progress) * 0.9})`;
        ctx.lineWidth = (1 + (1 - progress) * 3) * scale;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.currentRadius * (0.6 + progress * 0.5), 0, Math.PI * 2); ctx.stroke();
        this.sparks.forEach(p => {
            const pa = Math.max(0, p.life / 26);
            ctx.strokeStyle = `rgba(255,${180 + Math.floor(pa * 60)},120,${pa})`;
            ctx.lineWidth = p.size;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 1.5, p.y - p.vy * 1.5); ctx.stroke();
        });
        ctx.restore();
    }
}

class SignalFlareEffect extends Effect {
    constructor(x, y, tower) {
        super(x, y);
        this.tower = tower;
        this.life = 120;
        this.maxLife = 120;
        this.triggered = false;
    }
    update() {
        this.life--;
        if (this.life <= 0 && !this.triggered) {
            this.triggered = true;
            effects.push(new ArrowRainEffect(this.x, this.y, this.tower));
        }
        return this.life > 0;
    }
    draw() {
        const t = 1 - this.life / this.maxLife;
        ctx.save();
        const warnR = 2.5 * TILE_SIZE * (1 - t * 0.85);
        ctx.strokeStyle = `rgba(64,196,255,${0.35 + 0.35 * Math.sin(frameCount * 0.3)})`;
        ctx.lineWidth = 2 * scale; ctx.setLineDash([6 * scale, 6 * scale]);
        ctx.beginPath(); ctx.arc(this.x, this.y, Math.max(2 * scale, warnR), 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        const pulse = 0.7 + 0.3 * Math.sin(frameCount * 0.4);
        const r = 5 * scale * pulse;
        const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r * 2.5);
        g.addColorStop(0, 'rgba(225,245,254,0.95)');
        g.addColorStop(0.4, 'rgba(64,196,255,0.85)');
        g.addColorStop(1, 'rgba(2,136,209,0)');
        ctx.fillStyle = g; ctx.shadowColor = '#40c4ff'; ctx.shadowBlur = 12 * scale;
        ctx.beginPath(); ctx.arc(this.x, this.y, r * 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `rgba(64,196,255,${0.5 * pulse})`; ctx.lineWidth = 3 * scale;
        ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x, this.y - 42 * scale * pulse); ctx.stroke();
        ctx.restore();
    }
}

class ArrowRainEffect extends Effect {
    constructor(x, y, tower) {
        super(x, y);
        this.tower = tower;
        this.life = 180;
        this.maxLife = 180;
        this.radius = 2.5 * TILE_SIZE;
        this.radiusSq = this.radius * this.radius;
        this.arrows = [];
    }
    update() {
        this.life--;
        if (frameCount % 9 === 0 && this.life > 0) {
            for (const enemy of enemies) {
                if (enemy.hp <= 0) continue;
                if (enemy._arrowRainFrame === frameCount) continue;
                if ((this.x - enemy.x) ** 2 + (this.y - enemy.y) ** 2 < this.radiusSq) {
                    enemy._arrowRainFrame = frameCount;
                    enemy.takeDamage(15, this.tower, { areaDamage: true });
                    enemy.applySlow(0.2, 15);
                }
            }
        }
        if (this.life > 0 && frameCount % 2 === 0) {
            const ang = effectRandom() * Math.PI * 2;
            const rr = Math.sqrt(effectRandom()) * this.radius;
            this.arrows.push({
                x: this.x + Math.cos(ang) * rr,
                y: this.y + Math.sin(ang) * rr,
                h: (55 + effectRandom() * 45) * scale,
                v: (9 + effectRandom() * 4) * scale
            });
        }
        this.arrows.forEach(a => { a.h -= a.v; });
        this.arrows = this.arrows.filter(a => a.h > -8 * scale);
        return this.life > 0 || this.arrows.length > 0;
    }
    draw() {
        const lifeRatio = Math.max(0, this.life / this.maxLife);
        ctx.save();
        if (this.life > 0) {
            const pulse = 0.6 + 0.4 * Math.sin(frameCount * 0.2);
            const zoneAlpha = 0.16 * (0.6 + 0.4 * pulse);
            const g = ctx.createRadialGradient(this.x, this.y, this.radius * 0.2, this.x, this.y, this.radius);
            g.addColorStop(0, `rgba(255,193,7,${zoneAlpha})`);
            g.addColorStop(0.7, `rgba(255,87,34,${zoneAlpha * 0.8})`);
            g.addColorStop(1, 'rgba(183,28,28,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = `rgba(255,138,101,${0.5 * lifeRatio})`;
            ctx.lineWidth = 2 * scale;
            ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.lineCap = 'round';
        ctx.shadowColor = '#ff6f00'; ctx.shadowBlur = 4 * scale;
        this.arrows.forEach(a => {
            const tipY = a.y - Math.max(0, a.h);
            ctx.strokeStyle = '#ffd180'; ctx.lineWidth = 2 * scale;
            ctx.beginPath(); ctx.moveTo(a.x, tipY - 11 * scale); ctx.lineTo(a.x, tipY); ctx.stroke();
            ctx.fillStyle = '#ffab40';
            ctx.beginPath();
            ctx.moveTo(a.x, tipY + 3 * scale);
            ctx.lineTo(a.x - 2.5 * scale, tipY - 2 * scale);
            ctx.lineTo(a.x + 2.5 * scale, tipY - 2 * scale);
            ctx.closePath(); ctx.fill();
        });
        ctx.shadowBlur = 0; ctx.lineCap = 'butt';
        ctx.restore();
    }
}
class DebrisEffect extends Effect {
    constructor(x, y, radius) {
        super(x, y);
        this.life = 26; this.maxLife = 26;
        this.radius = radius;
        this.chunks = [];
        const n = 9;
        for (let i = 0; i < n; i++) {
            const a = effectRandom() * Math.PI * 2;
            const sp = (1.5 + effectRandom() * 3) * scale;
            this.chunks.push({
                x, y,
                vx: Math.cos(a) * sp,
                vy: Math.sin(a) * sp - 1.5 * scale,
                life: 14 + effectRandom() * 12,
                size: (1.5 + effectRandom() * 2.5) * scale,
                rot: effectRandom() * Math.PI,
                vr: (effectRandom() - 0.5) * 0.4,
                shade: effectRandom() < 0.5 ? '#6d4c41' : '#8d6e63'
            });
        }
    }
    update() {
        this.chunks.forEach(c => {
            c.x += c.vx; c.y += c.vy;
            c.vy += 0.35 * scale;
            c.vx *= 0.96;
            c.rot += c.vr;
            c.life--;
        });
        this.chunks = this.chunks.filter(c => c.life > 0);
        return super.update();
    }
    draw() {
        const t = this.life / this.maxLife;
        ctx.save();
        const dustR = this.radius * (1 - t) * 0.9 + 4 * scale;
        const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, dustR);
        g.addColorStop(0, `rgba(150,130,108,${0.30 * t})`);
        g.addColorStop(1, 'rgba(120,100,80,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(this.x, this.y, dustR, 0, Math.PI * 2); ctx.fill();
        this.chunks.forEach(c => {
            const a = Math.max(0, c.life / 24);
            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.rotate(c.rot);
            ctx.globalAlpha = a;
            ctx.fillStyle = c.shade;
            ctx.fillRect(-c.size, -c.size * 0.7, c.size * 2, c.size * 1.4);
            ctx.strokeStyle = 'rgba(40,28,20,0.6)'; ctx.lineWidth = 1 * scale;
            ctx.strokeRect(-c.size, -c.size * 0.7, c.size * 2, c.size * 1.4);
            ctx.restore();
        });
        ctx.restore();
    }
}
class DarkLaserEffect extends Effect {
    constructor(tower, target) {
        super(tower.x, tower.y);
        this.tower = tower;
        this.target = target;
        this.life = 25;
        this.maxLife = 25;
    }

    draw() {
        if (!this.target || this.target.hp <= 0) return;

        const alpha = this.life / this.maxLife;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(this.tower.x, this.tower.y);
        ctx.lineTo(this.target.x, this.target.y);

        ctx.lineCap = 'round';
        ctx.globalAlpha = alpha;

        ctx.strokeStyle = '#660000';
        ctx.lineWidth = 12 * scale;
        ctx.shadowColor = '#FF0000';
        ctx.shadowBlur = 15 * scale;
        ctx.stroke();

        ctx.strokeStyle = '#FF6347';
        ctx.lineWidth = 5 * scale;
        ctx.shadowBlur = 0;
        ctx.stroke();

        ctx.restore();
    }
}
class SteamEffect extends Effect {
    constructor(x, y, rotation) {
        super(x, y);
        this.life = 40;
        this.maxLife = 40;
        this.particles = [];
        const particleCount = 15;
        const emissionPointX = x + Math.cos(rotation) * 20 * scale;
        const emissionPointY = y + Math.sin(rotation) * 20 * scale;

        for (let i = 0; i < particleCount; i++) {
            const angle = rotation + (effectRandom() - 0.5) * 0.8;
            const speed = (effectRandom() * 2 + 1) * scale;
            this.particles.push({
                x: emissionPointX,
                y: emissionPointY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: effectRandom() * 20 + 20,
                size: (effectRandom() * 3 + 2) * scale
            });
        }
    }

    update() {
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.95;
            p.vy *= 0.95;
            p.life--;
        });
        this.particles = this.particles.filter(p => p.life > 0);
        return super.update();
    }

    draw() {
        const globalAlpha = Math.min(1, this.life / (this.maxLife / 2));
        ctx.save();
        ctx.globalAlpha = globalAlpha;
        this.particles.forEach(p => {
            const particleAlpha = p.life / 40;
            ctx.fillStyle = `rgba(200, 200, 200, ${particleAlpha * 0.5})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }
}
class ShieldBreakEffect extends Effect {
    constructor(x, y, size) {
        super(x, y);
        this.life = 25;
        this.maxLife = 25;
        this.radius = size * 0.8;
    }
    draw() {
        const progress = (this.maxLife - this.life) / this.maxLife;
        const alpha = 1 - progress;
        ctx.save();
        ctx.strokeStyle = `rgba(0, 191, 255, ${alpha})`;
        ctx.lineWidth = (4 * (1 - progress)) * scale;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + progress * 10 * scale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}
class MissileExplosionEffect extends Effect {
    constructor(x, y, radius) {
        super(x, y);
        this.maxRadius = radius;
        this.life = 60;
        this.maxLife = 60;
        SFX.play('missileBoom');
    }
    update() {
        this.currentRadius = this.maxRadius * (1 - (this.life / this.maxLife)**2);
        return super.update();
    }
    draw() {
        const progress = 1 - this.life / this.maxLife;
        const alpha = Math.sin(progress * Math.PI);

        ctx.save();
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.currentRadius);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.9})`);
        gradient.addColorStop(0.5, `rgba(255, 165, 0, ${alpha * 0.8})`);
        gradient.addColorStop(1, `rgba(255, 69, 0, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (progress < 0.5) {
            ctx.save();
            ctx.strokeStyle = `rgba(255, 255, 255, ${1 - (progress / 0.5)})`;
            ctx.lineWidth = 4 * scale;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.currentRadius * 1.2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }
}

class HeavyDebrisExplosion extends Effect {
    constructor(x, y, radius) {
        super(x, y);
        this.maxRadius = radius;
        this.life = 48; this.maxLife = 48;
        SFX.play('missileBoom');
        const intensity = radius / (3 * TILE_SIZE) + 0.5;
        this.debris = [];
        const n = Math.min(40, Math.max(14, Math.round(radius / 4)));
        for (let i = 0; i < n; i++) {
            const a = effectRandom() * Math.PI * 2;
            const sp = (1.5 + effectRandom() * 5) * scale * intensity;
            this.debris.push({
                x: x + Math.cos(a) * radius * 0.1, y: y + Math.sin(a) * radius * 0.1,
                vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
                size: (1.5 + effectRandom() * 3.5) * scale,
                rot: effectRandom() * Math.PI * 2, vrot: (effectRandom() - 0.5) * 0.5,
                life: 30 + effectRandom() * 18,
                shade: 90 + Math.floor(effectRandom() * 80)
            });
        }
        this.sparks = [];
        const sn = Math.min(26, Math.max(8, Math.round(radius / 6)));
        for (let i = 0; i < sn; i++) {
            const a = effectRandom() * Math.PI * 2;
            const sp = (4 + effectRandom() * 7) * scale * intensity;
            this.sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 10 + effectRandom() * 12, maxLife: 22 });
        }
    }
    update() {
        for (const d of this.debris) { d.x += d.vx; d.y += d.vy; d.vx *= 0.9; d.vy *= 0.9; d.vy += 0.12 * scale; d.rot += d.vrot; d.life--; }
        for (const s of this.sparks) { s.x += s.vx; s.y += s.vy; s.vx *= 0.86; s.vy *= 0.86; s.life--; }
        return super.update();
    }
    draw() {
        const p = 1 - this.life / this.maxLife;
        ctx.save();
        const ringR = this.maxRadius * (0.2 + p * 1.15);
        const ringA = Math.max(0, 1 - p) ** 1.5;
        ctx.strokeStyle = `rgba(255,255,255,${ringA})`;
        ctx.lineWidth = (6 * (1 - p) + 1) * scale;
        ctx.shadowColor = 'rgba(255,255,255,0.9)'; ctx.shadowBlur = 12 * scale;
        ctx.beginPath(); ctx.arc(this.x, this.y, ringR, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,255,${ringA * 0.5})`;
        ctx.lineWidth = 2 * scale;
        ctx.beginPath(); ctx.arc(this.x, this.y, ringR * 1.25, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
        if (p < 0.5) {
            const fa = (1 - p / 0.5);
            const fr = this.maxRadius * (0.5 + p) * 0.85;
            const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, fr);
            g.addColorStop(0, `rgba(255,255,255,${fa})`);
            g.addColorStop(0.6, `rgba(255,255,255,${fa * 0.5})`);
            g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(this.x, this.y, fr, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalCompositeOperation = 'lighter';
        for (const sp of this.sparks) {
            if (sp.life <= 0) continue;
            const a = sp.life / sp.maxLife;
            ctx.strokeStyle = `rgba(255,255,255,${a})`;
            ctx.lineWidth = 1.5 * scale;
            ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(sp.x - sp.vx * 1.5, sp.y - sp.vy * 1.5); ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
        for (const d of this.debris) {
            if (d.life <= 0) continue;
            const a = Math.min(1, d.life / 14);
            ctx.save();
            ctx.translate(d.x, d.y); ctx.rotate(d.rot);
            ctx.globalAlpha = a;
            ctx.fillStyle = `rgb(${d.shade},${Math.round(d.shade * 0.92)},${Math.round(d.shade * 0.82)})`;
            ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 0.6 * scale;
            ctx.beginPath();
            ctx.moveTo(-d.size, -d.size * 0.6); ctx.lineTo(d.size * 0.8, -d.size); ctx.lineTo(d.size, d.size * 0.7); ctx.lineTo(-d.size * 0.6, d.size); ctx.closePath();
            ctx.fill(); ctx.stroke();
            ctx.restore();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }
}

class FrostThunderEffect extends Effect {
    constructor(x, y, size) {
        super(x, y);
        this.size = size || 12 * scale;
        this.life = 32; this.maxLife = 32;
        SFX.play('thunder');
        this.bolt = [];
        const topY = y - 340 * scale;
        const segs = 9;
        for (let i = 0; i <= segs; i++) {
            const t = i / segs;
            const yy = topY + (y - topY) * t;
            const jitter = i === 0 || i === segs ? 0 : (effectRandom() - 0.5) * 30 * scale * (1 - t * 0.6);
            this.bolt.push({ x: x + jitter, y: yy });
        }
        this.bolt[this.bolt.length - 1] = { x, y };
        this.shards = [];
        const n = 22;
        for (let i = 0; i < n; i++) {
            const a = effectRandom() * Math.PI * 2;
            const sp = (1 + effectRandom() * 4.5) * scale;
            this.shards.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.2 * scale, life: 10 + effectRandom() * 16, size: (0.8 + effectRandom() * 1.8) * scale });
        }
    }
    update() {
        for (const sd of this.shards) { if (sd.life > 0) { sd.x += sd.vx; sd.y += sd.vy; sd.vx *= 0.95; sd.vy += 0.2 * scale; sd.life--; } }
        return super.update();
    }
    draw() {
        ctx.save();
        if (this.life > this.maxLife - 12) {
            const la = (this.life - (this.maxLife - 12)) / 12;
            ctx.lineJoin = 'round'; ctx.lineCap = 'round';
            ctx.shadowColor = '#4fc3f7'; ctx.shadowBlur = 14 * scale;
            ctx.strokeStyle = `rgba(79,195,247,${0.6 * la})`; ctx.lineWidth = (5 * la + 1) * scale;
            ctx.beginPath(); this.bolt.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = `rgba(255,255,255,${la})`; ctx.lineWidth = (2 * la + 0.5) * scale;
            ctx.beginPath(); this.bolt.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
            const fr = (14 + (1 - la) * 14) * scale;
            const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, fr);
            g.addColorStop(0, `rgba(255,255,255,${la})`);
            g.addColorStop(0.5, `rgba(129,212,250,${la * 0.7})`);
            g.addColorStop(1, 'rgba(79,195,247,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(this.x, this.y, fr, 0, Math.PI * 2); ctx.fill();
        }
        for (const sd of this.shards) {
            if (sd.life <= 0) continue;
            const a = Math.min(1, sd.life / 12);
            ctx.fillStyle = `rgba(225,245,254,${a})`;
            ctx.beginPath(); ctx.arc(sd.x, sd.y, sd.size, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
}

class SlowAuraEffect extends Effect {
    constructor(x, y, radius) { super(x, y); this.maxRadius = radius; this.life = 20; }
    update() { this.currentRadius = this.maxRadius * (1 - this.life / 20); return super.update(); }
    draw() { const alpha = this.life / 20; ctx.strokeStyle = `rgba(3, 169, 244, ${alpha})`; ctx.lineWidth = 4 * scale; ctx.beginPath(); ctx.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2); ctx.stroke(); }
}

class EXSlowWaveEffect extends Effect {
    constructor(x, y, radius) {
        super(x, y);
        this.maxRadius = radius;
        this.life = 30;
        this.maxLife = 30;
    }
    update() {
        this.currentRadius = this.maxRadius * (1 - (this.life / this.maxLife)**2);
        return super.update();
    }
    draw() {
        const alpha = (this.life / this.maxLife) * 0.8;
        ctx.save();
        ctx.strokeStyle = `rgba(0, 150, 255, ${alpha})`;
        ctx.lineWidth = (2 + (1 - this.life / this.maxLife) * 4) * scale;
        ctx.shadowColor = '#00f';
        ctx.shadowBlur = 10 * scale;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

class FreezeShatterEffect extends Effect {
    constructor(x, y, size) {
        super(x, y);
        this.life = 20;
        this.maxLife = 20;
        this.size = size;
    }
    draw() {
        const progress = (this.maxLife - this.life) / this.maxLife;
        const alpha = 1 - progress;
        ctx.save();
        ctx.strokeStyle = `rgba(173, 216, 230, ${alpha})`;
        ctx.lineWidth = (3 * (1-progress)) * scale;
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 10 * scale;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size + progress * 15 * scale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

class MuzzleFlashEffect extends Effect {
    constructor(x, y, rotation) {
        super(x, y);
        this.rotation = rotation;
        this.life = 60;
        this.maxLife = 60;
    }
    draw() {
        const progress = (this.maxLife - this.life) / this.maxLife;
        const alpha = Math.sin(progress * Math.PI);
        const scaleFactor = progress * 1.5;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation + Math.PI / 2);
        ctx.globalAlpha = alpha;
        const gradient = ctx.createRadialGradient(0, -25 * scale, 0, 0, -25 * scale, 30 * scale * scaleFactor);
        gradient.addColorStop(0, 'rgba(255, 255, 180, 1)');
        gradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 165, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0, -25 * scale);
        ctx.lineTo(-15 * scale * scaleFactor, -50 * scale * scaleFactor);
        ctx.lineTo(15 * scale * scaleFactor, -50 * scale * scaleFactor);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

class MagicFireEffect extends Effect {
    constructor(x, y) {
        super(x, y);
        this.life = 30;
        this.maxLife = 30;
    }
    draw() {
        const progress = (this.maxLife - this.life) / this.maxLife;
        const alpha = Math.sin(progress * Math.PI);
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#ab47bc';
        ctx.lineWidth = (2 + 2 * (1-progress)) * scale;
        ctx.shadowColor = '#e1bee7';
        ctx.shadowBlur = 15 * scale;
        ctx.beginPath();
        ctx.arc(0, 0, progress * 25 * scale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

class TeslaEffect extends Effect {
    constructor(tower, targets) { super(tower.x, tower.y); this.tower = tower; this.targets = targets; this.life = 10; }
    draw() {
        const alpha = this.life / 10;
        this.targets.forEach(target => {
            ctx.beginPath(); ctx.moveTo(this.x, this.y);
            const dx = target.x - this.x; const dy = target.y - this.y;
            const dist = Math.hypot(dx, dy); const segments = Math.floor(dist / (15 * scale));
            for (let i = 1; i <= segments; i++) {
                let currentX = this.x + (dx / segments) * i; let currentY = this.y + (dy / segments) * i;
                if (i < segments) { currentX += (Math.random() - 0.5) * 10 * scale; currentY += (Math.random() - 0.5) * 10 * scale; }
                ctx.lineTo(currentX, currentY);
            }
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`; ctx.lineWidth = 3 * scale; ctx.stroke();
            ctx.strokeStyle = `rgba(0, 229, 255, ${alpha})`; ctx.lineWidth = 1.5 * scale; ctx.stroke();
        });
    }
}

class GammaRayEffect extends Effect {
    constructor(mainTarget, secondaryTargets) {
        super(mainTarget.x, mainTarget.y);
        this.mainTarget = mainTarget;
        this.secondaryTargets = secondaryTargets;
        this.life = 120;
        this.maxLife = 120;
    }
    update() {
        this.secondaryTargets = this.secondaryTargets.filter(t => t.hp > 0);
        return super.update();
    }
    draw() {
        if (!this.mainTarget || this.mainTarget.hp <= 0) return;
        const progress = (this.maxLife - this.life) / this.maxLife;
        const alpha = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowColor = 'red';
        ctx.shadowBlur = 10 * scale;
        this.secondaryTargets.forEach(target => {
            ctx.beginPath();
            ctx.moveTo(this.mainTarget.x, this.mainTarget.y);
            const dx = target.x - this.mainTarget.x;
            const dy = target.y - this.mainTarget.y;
            const dist = Math.hypot(dx, dy);
            const segments = Math.max(3, Math.floor(dist / (20 * scale)));
            for (let i = 1; i < segments; i++) {
                const segmentProgress = i / segments;
                let currentX = this.mainTarget.x + dx * segmentProgress + (Math.random() - 0.5) * 15 * scale;
                let currentY = this.mainTarget.y + dy * segmentProgress + (Math.random() - 0.5) * 15 * scale;
                ctx.lineTo(currentX, currentY);
            }
            ctx.lineTo(target.x, target.y);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 3 * scale;
            ctx.stroke();
            ctx.strokeStyle = 'rgba(255, 82, 82, 1)';
            ctx.lineWidth = 1.5 * scale;
            ctx.stroke();
        });
        ctx.restore();
    }
}

class LaserEffect extends Effect {
    constructor(tower, target, color = 'red', life = 20) {
        super(tower.x, tower.y);
        this.tower = tower;
        this.target = target;
        this.life = life;
        this.maxLife = life;
        this.color = color;
    }
    draw() {
        if (!this.target) return;
        const alpha = this.life / this.maxLife;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(this.tower.x, this.tower.y);
        ctx.lineTo(this.target.x, this.target.y);
        ctx.strokeStyle = `rgba(255, 200, 200, ${alpha})`;
        ctx.lineWidth = 2 * scale;
        ctx.stroke();
        ctx.strokeStyle = `rgba(255, 0, 0, ${alpha * 0.8})`;
        if (this.color) { ctx.strokeStyle = this.color; }
        ctx.lineWidth = 4 * scale;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 15 * scale;
        ctx.stroke();
        ctx.restore();
    }
}
class AnnihilatorBeamEffect extends Effect {
    constructor(tower, target) {
        super(tower.x, tower.y);
        this.tower = tower;
        this.target = target;
        this.life = 15;
        this.maxLife = 15;
    }
    draw() {
        if (!this.target) return;
        const alpha = this.life / this.maxLife;
        const progress = 1 - alpha;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(this.tower.x, this.tower.y);
        ctx.lineTo(this.target.x, this.target.y);
        const gradient = ctx.createLinearGradient(this.tower.x, this.tower.y, this.target.x, this.target.y);
        gradient.addColorStop(0, `rgba(255, 235, 59, ${alpha})`);
        gradient.addColorStop(0.5, `rgba(255, 255, 255, ${alpha})`);
        gradient.addColorStop(1, `rgba(255, 215, 0, ${alpha})`);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = (4 + progress * 6) * scale;
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 20 * scale;
        ctx.stroke();
        ctx.restore();
    }
}

class DestroyerBeamEffect extends Effect {
    constructor(tower, target) {
        super(tower.x, tower.y);
        this.tower = tower;
        this.target = target;
        this.life = 30;
    }
    update() { return super.update(); }
    draw() {
        if (!this.target) return;
        const alpha = this.life / 30;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(this.tower.x, this.tower.y);
        ctx.lineTo(this.target.x, this.target.y);
        ctx.strokeStyle = `rgba(0, 0, 0, ${alpha * 0.9})`;
        ctx.lineWidth = 15 * scale;
        ctx.shadowColor = 'rgba(255, 0, 0, 0.7)';
        ctx.shadowBlur = 20 * scale;
        ctx.stroke();
        ctx.strokeStyle = `rgba(30, 0, 0, ${alpha})`;
        ctx.lineWidth = 8 * scale;
        ctx.stroke();
        ctx.restore();
    }
}

class CraterEffect extends Effect {
    constructor(x, y, damage, sourceTower) {
        super(x, y);
        this.life = 90;
        this.maxLife = 90;
        this.maxRadius = 3 * TILE_SIZE;
        this.damage = damage;
        this.sourceTower = sourceTower;
        this.damagedEnemies = new Set();
        this.currentRadius = 0;
        SFX.play('crater');
    }
    update() {
        const progress = (this.maxLife - this.life) / this.maxLife;
        this.currentRadius = this.maxRadius * progress;
        const currentRadiusSq = this.currentRadius*this.currentRadius;
        for (const enemy of enemies) {
            if (!this.damagedEnemies.has(enemy) && (this.x - enemy.x)**2 + (this.y - enemy.y)**2 < currentRadiusSq) {
                enemy.takeDamage(this.damage, this.sourceTower, { areaDamage: true });
                this.damagedEnemies.add(enemy);
            }
        }
        return super.update();
    }
    draw() {
        const alpha = (this.life / this.maxLife) * 0.7;
        ctx.save();
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.currentRadius);
        gradient.addColorStop(0, `rgba(10, 0, 0, ${alpha})`);
        gradient.addColorStop(0.7, `rgba(5, 0, 0, ${alpha * 0.8})`);
        gradient.addColorStop(1, `rgba(0, 0, 0, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
        ctx.fill();
        if (this.life > 0 && frameCount % 4 === 0) {
            ctx.strokeStyle = `rgba(255, 20, 20, ${alpha})`;
            ctx.lineWidth = (1 + Math.random()) * scale;
            ctx.shadowColor = '#d50000';
            ctx.shadowBlur = 15 * scale;
            for (let i = 0; i < 2; i++) {
                ctx.beginPath();
                const startAngle = Math.random() * Math.PI * 2;
                const endAngle = startAngle + (Math.random() - 0.5) * Math.PI;
                const startRadius = Math.random() * this.currentRadius * 0.6;
                const endRadius = startRadius + Math.random() * this.currentRadius * 0.4;
                const startX = this.x + Math.cos(startAngle) * startRadius;
                const startY = this.y + Math.sin(startAngle) * startRadius;
                ctx.moveTo(startX, startY);
                const midX = this.x + Math.cos(endAngle) * endRadius;
                const midY = this.y + Math.sin(endAngle) * endRadius;
                const jagX = (startX + midX) / 2 + (Math.random() - 0.5) * 25 * scale;
                const jagY = (startY + midY) / 2 + (Math.random() - 0.5) * 25 * scale;
                ctx.quadraticCurveTo(jagX, jagY, midX, midY);
                ctx.stroke();
            }
        }
        ctx.restore();
    }
}

class GravityPulseEffect extends Effect {
    constructor(x, y, radius) {
        super(x, y);
        this.maxRadius = radius;
        this.life = 25;
        this.maxLife = 25;
    }
    update() {
        this.currentRadius = this.maxRadius * (1 - (this.life / this.maxLife));
        return super.update();
    }
    draw() {
        const alpha = this.life / this.maxLife;
        ctx.save();
        ctx.strokeStyle = `rgba(128, 0, 128, ${alpha * 0.8})`;
        ctx.lineWidth = (1 + (1 - alpha) * 4) * scale;
        ctx.shadowColor = '#9c27b0';
        ctx.shadowBlur = 10 * scale;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

class GatlingHitEffect extends Effect {
    constructor(x, y, rank) {
        super(x, y);
        this.life = 25;
        this.maxLife = 25;
        this.particles = [];
        const rankColors = ['#FFFFFF', '#C0C0C0', '#FFFF00', '#FFD700', '#FF0000', '#B22222'];
        const color = rankColors[rank];
        const count = 5 + rank * 2;
        for (let i = 0; i < count; i++) {
            const angle = effectRandom() * Math.PI * 2;
            const speed = (effectRandom() * 2 + 1 + rank * 0.2) * scale;
            this.particles.push({
                x: 0, y: 0,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: (effectRandom() * 1.5 + 1) * scale,
                color: color
            });
        }
    }
    update() {
        this.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vx *= 0.96; p.vy *= 0.96; });
        return super.update();
    }
    draw() {
        const alpha = this.life / this.maxLife;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.globalAlpha = alpha;
        this.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 2 * scale;
            ctx.beginPath();
            ctx.rect(p.x, p.y, p.size, p.size);
            ctx.fill();
        });
        ctx.restore();
    }
}

class RankUpEffect extends Effect {
    constructor(x, y, rank) {
        super(x, y);
        this.life = 60;
        this.maxLife = 60;
        this.rank = rank;
        this.romanNumeral = toRoman(rank);
    }
    update() { return super.update(); }
    draw() {
        const progress = (this.maxLife - this.life) / this.maxLife;
        const alpha = Math.sin(progress * Math.PI);
        const scaleFactor = 1 + progress * 0.5;
        const s = (val) => val * scale;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = s(3);
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = s(10);
        ctx.beginPath();
        ctx.arc(0, 0, s(25 * progress), 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = s(5);
        ctx.font = `bold ${s(25 * scaleFactor)}px 'Times New Roman'`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.romanNumeral, 0, 0);
        ctx.restore();
    }
}
class MusicPulseEffect extends Effect {
    constructor(x, y, radius) {
        super(x, y);
        this.maxRadius = radius;
        this.life = 120;
        this.maxLife = 120;
    }
    update() {
        this.currentRadius = this.maxRadius * (1 - (this.life / this.maxLife));
        return super.update();
    }
    draw() {
        const alpha = (this.life / this.maxLife) * 0.8;
        ctx.save();
        ctx.strokeStyle = `rgba(233, 30, 99, ${alpha})`;
        ctx.lineWidth = (1 + (1 - this.life / this.maxLife) * 6) * scale;
        ctx.shadowColor = '#e91e63';
        ctx.shadowBlur = 15 * scale;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}
class ElectricOverloadEffect extends Effect {
    constructor(tower) {
        super(tower.x, tower.y);
        this.tower = tower;
        this.life = 10 * 60;
        this.maxLife = this.life;
    }
    update() {
        if (!this.tower || !towers.includes(this.tower) || this.tower.skillActiveTimer <= 0) return false;
        this.x = this.tower.x;
        this.y = this.tower.y;
        return super.update();
    }
    draw() {
        const radius = this.tower.rangePixels;
        const intensity = 0.72 + Math.sin(frameCount * 0.65) * 0.2;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowColor = '#36eaff';
        ctx.shadowBlur = 14 * scale;
        for (let bolt = 0; bolt < 7; bolt++) {
            const angle = Math.random() * Math.PI * 2;
            const length = radius * (0.35 + Math.random() * 0.65);
            const endX = this.x + Math.cos(angle) * length;
            const endY = this.y + Math.sin(angle) * length;
            const segments = 7;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            for (let i = 1; i < segments; i++) {
                const t = i / segments;
                const jitter = (Math.random() - 0.5) * 28 * scale;
                ctx.lineTo(this.x + Math.cos(angle) * length * t - Math.sin(angle) * jitter, this.y + Math.sin(angle) * length * t + Math.cos(angle) * jitter);
            }
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = `rgba(70, 231, 255, ${intensity})`;
            ctx.lineWidth = 2.8 * scale;
            ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,.95)';
            ctx.lineWidth = .9 * scale;
            ctx.stroke();
        }
        ctx.fillStyle = 'rgba(107, 241, 255, .9)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 9 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
class BossShockwaveEffect extends Effect {
    constructor(x, y) {
        super(x, y);
        this.life = 90;
        this.maxLife = 90;
        this.maxRadius = Math.hypot(NATIVE_WIDTH, NATIVE_HEIGHT);
        SFX.play('shockwave');
    }

    update() {
        const progress = 1 - this.life / this.maxLife;
        this.currentRadius = this.maxRadius * (1 - (1 - progress)**3);
        return super.update();
    }

    draw() {
        const progress = 1 - this.life / this.maxLife;
        const alpha = Math.sin(progress * Math.PI);

        ctx.save();
        ctx.globalAlpha = alpha * 0.7;

        const gradient = ctx.createRadialGradient(
            this.x, this.y, this.currentRadius * 0.8,
            this.x, this.y, this.currentRadius
        );
        gradient.addColorStop(0, 'rgba(255, 40, 40, 0)');
        gradient.addColorStop(0.8, 'rgba(220, 20, 60, 0.8)');
        gradient.addColorStop(1, 'rgba(139, 0, 0, 0.5)');

        ctx.strokeStyle = gradient;
        ctx.lineWidth = (30 * (1 - progress)) * scale;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}
class TowerStunEffect extends Effect {
    constructor(x, y) {
        super(x, y);
        this.life = 10;
        this.maxLife = 10;
        this.angle = effectRandom() * Math.PI * 2;
    }

    draw() {
        const alpha = this.life / this.maxLife;
        const s = (val) => val * scale;

        ctx.save();
        ctx.translate(this.x, this.y - s(25));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = 'yellow';
        ctx.font = `bold ${s(20)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let i = 0; i < 3; i++) {
            const rotation = this.angle + (i * Math.PI * 2 / 3) + (frameCount * 0.1);
            const radius = s(8);
            ctx.fillText('?', Math.cos(rotation) * radius, Math.sin(rotation) * radius);
        }

        ctx.restore();
    }
}
