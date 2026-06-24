class Soldier {
    constructor(x, y, tower, baseHp) {
        this.x = x;
        this.y = y;
        this.tower = tower;
        this.level = tower.level;

        this.pathIndex = 0;
        if (reversedPath && reversedPath.length > 0) {
            let closestDistSq = Infinity;
            for (let i = 0; i < reversedPath.length; i++) {
                const node = reversedPath[i];
                const distSq = (this.x - node.x)**2 + (this.y - node.y)**2;
                if (distSq < closestDistSq) {
                    closestDistSq = distSq;
                    this.pathIndex = i;
                }
            }
        }

        this.target = null;
        this.isFighting = null;
        this.fireCooldown = 0;
        this.targetScanCooldown = Math.floor(gameRandom() * 6);
        this.rotation = -Math.PI / 2;
        this.size = 8 * scale;

        const stats = [
            { hp: baseHp * 0.29, damage: 3,  range: 7.5, fireRate: 100, speed: 1.5 },
            { hp: baseHp * 0.31, damage: 5,  range: 7.7, fireRate: 90, speed: 1.5 },
            { hp: baseHp * 0.33, damage: 7,  range: 7.9, fireRate: 80, speed: 1.5 },
            { hp: baseHp * 0.35, damage: 9,  range: 8, fireRate: 60, speed: 1.4 }
        ][Math.min(this.level, 3)];

        this.maxHp = stats.hp;
        this.hp = this.maxHp;
        this.damage = stats.damage * this.tower.soldierDamageMultiplier;
        this.range = stats.range;
        this.rangePixels = this.range * TILE_SIZE;
        this.rangePixelsSq = this.rangePixels * this.rangePixels;
        this.fireRate = stats.fireRate;
        this.speed = stats.speed * scale;
    }

update() {
    if (this.hp <= 0) return;
    if (this.isFighting) return;
    if (this.fireCooldown > 0) this.fireCooldown--;

    const currentTargetValid = this.target && this.target.hp > 0 && !this.target.isFighting &&
        (this.x - this.target.x)**2 + (this.y - this.target.y)**2 < this.rangePixelsSq;
    if (!currentTargetValid || this.targetScanCooldown <= 0) {
        this.target = null;
        let minAttackDistSq = Infinity;
        for (const enemy of enemies) {
            if (enemy.isFighting) continue;
            const distSq = (this.x - enemy.x)**2 + (this.y - enemy.y)**2;
            if (distSq < this.rangePixelsSq && distSq < minAttackDistSq) {
                minAttackDistSq = distSq;
                this.target = enemy;
            }
        }
        this.targetScanCooldown = 6 + (frameCount % 3);
    } else {
        this.targetScanCooldown--;
    }

    let currentSpeed = this.speed;
    if (this.target) {
        currentSpeed *= 0.20;

        const targetAngle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
        let diff = targetAngle - this.rotation;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.rotation += diff * 0.1;

        if (this.fireCooldown <= 0) {
            this.fire();
            this.fireCooldown = this.fireRate;
        }
    }

    if (reversedPath.length > 0 && this.pathIndex < reversedPath.length - 1) {
        const targetNode = reversedPath[this.pathIndex + 1];
        const dx = targetNode.x - this.x;
        const dy = targetNode.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < currentSpeed) {
            this.pathIndex++;
            this.x = targetNode.x;
            this.y = targetNode.y;
        } else {
            this.x += (dx / dist) * currentSpeed;
            this.y += (dy / dist) * currentSpeed;
        }
    } else {
        this.hp = 0;
    }
}

    fire() {
        if (this.target && this.target.hp > 0) {
            soldierProjectiles.push(new SoldierProjectile(this.x, this.y, this.target, this));
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        ctx.fillStyle = '#b0bec5';
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#546e7a';
        ctx.lineWidth = 1.5 * scale;
        ctx.stroke();

        ctx.rotate(this.rotation + Math.PI / 2);
        ctx.fillStyle = '#455a64';
        ctx.beginPath();
        ctx.rect(-2 * scale, -10 * scale, 4 * scale, 8 * scale);
        ctx.fill();

        ctx.restore();

        const healthBarWidth = 20 * scale;
        const healthBarHeight = 4 * scale;
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(this.x - healthBarWidth / 2, this.y - this.size - (8 * scale), healthBarWidth, healthBarHeight);
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(this.x - healthBarWidth / 2, this.y - this.size - (8 * scale), healthBarWidth * (this.hp / this.maxHp), healthBarHeight);
    }
}

class Projectile {
    constructor(x, y, target, tower, specialType = null) {
        this.x = x; this.y = y; this.target = target;
        this.tower = tower;
        this.specialType = specialType;
        this.speed = 10 * scale;
        if (this.tower.type === 'matrix' || this.tower.type === 'gatlingGun') this.speed = 15 * scale;
        this.rotation = Math.atan2(target.y - y, target.x - x);
        this.trail = [];
    }
    update() {
        if (!this.target || this.target.hp <= 0) return false;
        const dx = this.target.x - this.x; const dy = this.target.y - this.y;
        const distSq = dx*dx + dy*dy;
        const speedSq = this.speed * this.speed;
        if (distSq < speedSq) { this.hitTarget(); return false; }
        else {
            const dist = Math.sqrt(distSq);
            this.x += (dx / dist) * this.speed; this.y += (dy / dist) * this.speed;
            return true;
        }
    }
    hitTarget() {
        if (this.tower.type === 'thiefClaw' && this.tower.level === 4) {
            if (this.target.debuffs.bountyMark.timer > 0) {
                this.target.debuffs.bountyMark.timer = 5 * 60;
            } else {
                this.target.debuffs.bountyMark.timer = 3 * 60;
            }
        }
        if (this.tower.type === 'magic') {
            this.target.applyDefenseBreak(180);
            if (this.tower.level === 4) {
                this.target.vulnerabilityStacks = Math.min(50, this.target.vulnerabilityStacks + 1);
            }
        }

        if (this.specialType === 'arrowSignal') {
            effects.push(new SignalFlareEffect(this.target.x, this.target.y, this.tower));
            return;
        }
        if (this.specialType === 'arrowExplosive') {
            const exStats = this.tower.data.levels[4];
            const blastRadiusSq = (exStats.specialBlastRadius * TILE_SIZE)**2;
            effects.push(new ExplosionEffect(this.target.x, this.target.y, exStats.specialBlastRadius * TILE_SIZE));
            for (const enemy of enemies) {
                if ((this.target.x - enemy.x)**2 + (this.target.y - enemy.y)**2 < blastRadiusSq) {
                    enemy.takeDamage(exStats.specialDamage, this.tower, { areaDamage: true });
                }
            }
            return;
        }

        let finalDamage = this.tower.damage;
        finalDamage *= this.tower.buffs.damage;
        if (this.tower.type === 'gatlingGun' && this.tower.level === 4) {
            const damageBonus = 1 + (this.tower.rank * 0.05);
            finalDamage *= damageBonus;
        }
        finalDamage *= this.tower.buffs.matrixDamage;

        if (this.tower.type === 'blast') {
            const blastCenter = { x: this.target.x, y: this.target.y };
            const blastRadiusSq = (this.tower.blastRadius * TILE_SIZE)**2;
            effects.push(new ExplosionEffect(blastCenter.x, blastCenter.y, this.tower.blastRadius * TILE_SIZE));

            const hitEnemies = [];
            for (const enemy of enemies) {
                if ((blastCenter.x - enemy.x)**2 + (blastCenter.y - enemy.y)**2 < blastRadiusSq) {
                    hitEnemies.push(enemy);
                }
            }

            let extraDamage = 0;
            if (this.tower.level === 4 && hitEnemies.length > 1) {
                const exStats = this.tower.data.levels[4];
                extraDamage = exStats.specialMultiplier * hitEnemies.length;
            }
            hitEnemies.forEach(enemy => { enemy.takeDamage(finalDamage + extraDamage, this.tower, { areaDamage: true }); });

        } else if (this.tower.type === 'cannon') {
            this.target.takeDamage(finalDamage, this.tower);
            const splashRadiusSq = (1 * TILE_SIZE) ** 2;
            for (const enemy of enemies) {
                if (enemy === this.target || enemy.hp <= 0) continue;
                if ((this.target.x - enemy.x) ** 2 + (this.target.y - enemy.y) ** 2 < splashRadiusSq) {
                    enemy.takeDamage(finalDamage * 0.6, this.tower, { areaDamage: true });
                }
            }
            effects.push(new DebrisEffect(this.target.x, this.target.y, 1 * TILE_SIZE));
        } else if (this.tower.type === 'frostPunish') {
            const e = this.target;
            const hasStrongSlow = e.slowEffects.some(s => s.amount >= 0.4 && s.duration > 0);
            const triggered = hasStrongSlow || e.frozenTimer > 0;
            let dmg = finalDamage;
            if (triggered) {
                dmg *= 2;
                effects.push(new FrostThunderEffect(e.x, e.y, e.size));
                const aoeRSq = (2 * TILE_SIZE) ** 2;
                const splash = dmg * 0.6;
                for (const o of enemies) {
                    if (o === e || o.hp <= 0) continue;
                    if ((e.x - o.x) ** 2 + (e.y - o.y) ** 2 < aoeRSq) {
                        o.takeDamage(splash, this.tower, { areaDamage: true });
                    }
                }
            }
            e.takeDamage(dmg, this.tower);
            let slowAmt = this.tower.slow;
            if (e.debuffs.burn && e.debuffs.burn.timer > 0) slowAmt *= 0.5;
            e.applySlow(slowAmt, 300, this.tower, true);
            if (this.specialType === 'frostSeal') e.applyIceSeal();
        } else {
            this.target.takeDamage(finalDamage, this.tower);
        }

        if (this.tower.type === 'gatlingGun' && this.tower.level === 4) {
        }
    }
    draw() {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rotation);
        ctx.fillStyle = this.tower.data.projectileColor;
        const s = (val) => val * scale;

        if (this.tower.type === 'arrow') {
            const explosive = this.specialType === 'arrowExplosive';
            const signal = this.specialType === 'arrowSignal';
            const col = signal ? '#40c4ff' : (explosive ? '#ffeb3b' : (this.tower.data.projectileColor || '#dcedc8'));
            ctx.shadowColor = signal ? '#40c4ff' : (explosive ? '#ffeb3b' : 'rgba(180,220,140,0.8)');
            ctx.shadowBlur = s(signal ? 14 : (explosive ? 12 : 6));
            ctx.strokeStyle = '#6d4c41'; ctx.lineWidth = s(1.5);
            ctx.beginPath(); ctx.moveTo(s(6), 0); ctx.lineTo(s(-8), 0); ctx.stroke();
            ctx.fillStyle = (explosive || signal) ? col : '#cfd8dc';
            ctx.beginPath(); ctx.moveTo(s(11), 0); ctx.lineTo(s(4), s(-3.5)); ctx.lineTo(s(4), s(3.5)); ctx.closePath(); ctx.fill();
            ctx.fillStyle = (explosive || signal) ? col : '#a5d6a7';
            ctx.beginPath(); ctx.moveTo(s(-8), 0); ctx.lineTo(s(-12), s(-3)); ctx.lineTo(s(-6), 0); ctx.lineTo(s(-12), s(3)); ctx.closePath(); ctx.fill();
            ctx.shadowBlur = 0;
        } else if (this.tower.type === 'gatlingGun') {
            if (this.tower.level < 4) {
                ctx.shadowBlur = 8 * scale;
                ctx.shadowColor = this.tower.data.projectileColor;
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = s(2);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(s(-10), 0);
                ctx.stroke();
                ctx.shadowBlur = 0;
            } else {
                const rankColors = ['#FFFFFF', '#E0E0E0', '#FFF176', '#FFD180', '#FF80AB', '#FF5252'];
                const color = rankColors[this.tower.rank];

                this.trail.push({x: this.x, y: this.y, life: 15});
                this.trail.forEach((p, index) => {
                    p.life--;
                    const alpha = p.life / 15;
                    ctx.save();
                    ctx.translate(p.x - this.x, p.y - this.y);
                    ctx.globalAlpha = alpha * 0.8;
                    const trailGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, s(2 + alpha * 3));
                    trailGradient.addColorStop(0, 'rgba(255,255,255,0.8)');
                    trailGradient.addColorStop(1, color + '00');
                    ctx.fillStyle = trailGradient;
                    ctx.beginPath();
                    ctx.arc(0, 0, s(2 + alpha * 3), 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                });
                this.trail = this.trail.filter(p => p.life > 0);

                ctx.shadowBlur = s(12);
                ctx.shadowColor = color;
                ctx.strokeStyle = color;
                ctx.lineWidth = s(2.5);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(s(-12), 0);
                ctx.stroke();
                ctx.shadowBlur = 0;
            }
        } else if (this.tower.type === 'heavyWeapons') {
            ctx.shadowBlur = s(6); ctx.shadowColor = '#ffeb3b';
            ctx.fillStyle = '#fff59d';
            ctx.beginPath(); ctx.moveTo(s(9), 0); ctx.lineTo(s(-7), s(-1.3)); ctx.lineTo(s(-7), s(1.3)); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#ffeb3b';
            ctx.beginPath(); ctx.moveTo(s(6), 0); ctx.lineTo(s(-7), s(-0.8)); ctx.lineTo(s(-7), s(0.8)); ctx.closePath(); ctx.fill();
            ctx.shadowBlur = 0;
        } else if (this.tower.type === 'frostPunish') {
            ctx.shadowColor = '#4fc3f7'; ctx.shadowBlur = s(6);
            ctx.strokeStyle = '#e1f5fe'; ctx.lineWidth = s(2);
            ctx.beginPath(); ctx.moveTo(s(7), 0); ctx.lineTo(s(-7), 0); ctx.stroke();
            ctx.fillStyle = '#b3e5fc'; ctx.strokeStyle = '#0288d1'; ctx.lineWidth = s(0.8);
            ctx.beginPath(); ctx.moveTo(s(11), 0); ctx.lineTo(s(5), s(-3.2)); ctx.lineTo(s(7), 0); ctx.lineTo(s(5), s(3.2)); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#81d4fa'; ctx.shadowBlur = 0;
            ctx.beginPath(); ctx.moveTo(s(-7), 0); ctx.lineTo(s(-11), s(-3)); ctx.lineTo(s(-6), 0); ctx.lineTo(s(-11), s(3)); ctx.closePath(); ctx.fill();
        } else if (this.tower.type === 'matrix') {
            ctx.shadowBlur = 10 * scale;
            ctx.shadowColor = this.tower.data.color;
            ctx.beginPath(); ctx.moveTo(s(8), 0); ctx.lineTo(s(-8), 0);
            ctx.lineWidth = s(3); ctx.strokeStyle = this.tower.data.projectileColor; ctx.stroke();
        } else if (this.tower.type === 'magic' && this.tower.level === 4) {
             ctx.shadowBlur = 15 * scale;
             ctx.shadowColor = '#ab47bc';
             ctx.fillStyle = '#fff';
             ctx.beginPath();
             ctx.arc(0, 0, s(7), 0, Math.PI * 2);
             ctx.fill();
             ctx.shadowBlur = 0;

        } else {
            const col = this.tower.data.projectileColor || '#ffffff';
            ctx.shadowColor = col; ctx.shadowBlur = s(8);
            const tg = ctx.createLinearGradient(s(-13), 0, s(4), 0);
            tg.addColorStop(0, 'rgba(255,255,255,0)');
            tg.addColorStop(1, col);
            ctx.fillStyle = tg;
            ctx.beginPath(); ctx.moveTo(s(3), s(-3.2)); ctx.lineTo(s(3), s(3.2)); ctx.lineTo(s(-13), 0); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(s(2), 0, s(3.6), 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = col;
            ctx.beginPath(); ctx.arc(s(2), 0, s(2.1), 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
        }
        ctx.restore();
    }
}

class SoldierProjectile {
    constructor(x, y, target, soldier) {
        this.x = x; this.y = y; this.target = target; this.soldier = soldier;
        this.speed = 8 * scale;
        this.rotation = Math.atan2(target.y - y, target.x - x);
        SFX.play('soldier');
    }
    update() {
        if (!this.target || this.target.hp <= 0) return false;
        const dx = this.target.x - this.x; const dy = this.target.y - this.y;
        const distSq = dx*dx + dy*dy;
        const speedSq = this.speed * this.speed;
        if (distSq < speedSq) { this.hitTarget(); return false; }
        else {
            const dist = Math.sqrt(distSq);
            this.x += (dx / dist) * this.speed; this.y += (dy / dist) * this.speed;
            return true;
        }
    }
    hitTarget() { this.target.takeDamage(this.soldier.damage, this.soldier.tower); }
    draw() {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rotation);
        ctx.fillStyle = '#fff9c4';
        const s = (val) => val * scale;
        ctx.beginPath(); ctx.rect(s(-4), s(-1.5), s(8), s(3)); ctx.fill();
        ctx.restore();
    }
}
class Tank {
    constructor(x, y, tower, baseHp) {
        this.x = x;
        this.y = y;
        this.tower = tower;
        this.level = tower.level;
        this.size = 18 * scale;
        this.rotation = -Math.PI / 2;
        this.turretRotation = -Math.PI / 2;
        this.fireCooldown = 0;
        this.target = null;
        this.targetScanCooldown = Math.floor(gameRandom() * 8);
        this.isFighting = null;

        this.maxHp = baseHp * 4.4;
        this.hp = this.maxHp;

        const lv4SoldierBaseDamage = 9;
        this.damage = (lv4SoldierBaseDamage * this.tower.soldierDamageMultiplier) * 8;

        this.range = 8.5;
        this.rangePixels = this.range * TILE_SIZE;
        this.rangePixelsSq = this.rangePixels * this.rangePixels;
        this.fireRate = 130;
        this.speed = 0.4 * scale;
        this.blastRadius = 2.5;

        this.pathIndex = 0;
        if (reversedPath && reversedPath.length > 0) {
            let closestDistSq = Infinity;
            for (let i = 0; i < reversedPath.length; i++) {
                const node = reversedPath[i];
                const distSq = (this.x - node.x)**2 + (this.y - node.y)**2;
                if (distSq < closestDistSq) {
                    closestDistSq = distSq;
                    this.pathIndex = i;
                }
            }
        }
    }

    findTarget() {
        let closestEnemy = null;
        let minAttackDistSq = Infinity;

        for (const enemy of enemies) {
            const distSq = (this.x - enemy.x)**2 + (this.y - enemy.y)**2;
            if (distSq < this.rangePixelsSq && distSq < minAttackDistSq) {
                minAttackDistSq = distSq;
                closestEnemy = enemy;
            }
        }
        this.target = closestEnemy;
    }

    update() {
        if (this.hp <= 0) return;
        if (this.isFighting) return;
        if (this.fireCooldown > 0) this.fireCooldown--;

        const currentTargetValid = this.target && this.target.hp > 0 &&
            (this.x - this.target.x)**2 + (this.y - this.target.y)**2 < this.rangePixelsSq;
        if (!currentTargetValid || this.targetScanCooldown <= 0) {
            this.findTarget();
            this.targetScanCooldown = 8 + (frameCount % 4);
        } else {
            this.targetScanCooldown--;
        }
        if (this.target) {
            const targetAngle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
            let diff = targetAngle - this.turretRotation;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            this.turretRotation += diff * 0.05;

            if (this.fireCooldown <= 0) {
                this.fire();
                this.fireCooldown = this.fireRate;
            }
        }

        if (reversedPath.length > 0 && this.pathIndex < reversedPath.length - 1) {
            const targetNode = reversedPath[this.pathIndex + 1];
            const dx = targetNode.x - this.x;
            const dy = targetNode.y - this.y;
            const dist = Math.hypot(dx, dy);

            const moveAngle = Math.atan2(dy, dx);
            let rotDiff = moveAngle - this.rotation;
            while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
            while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
            this.rotation += rotDiff * 0.04;

            if (dist < this.speed) {
                this.pathIndex++;
                this.x = targetNode.x;
                this.y = targetNode.y;
            } else {
                this.x += (dx / dist) * this.speed;
                this.y += (dy / dist) * this.speed;
            }
        } else {
            this.hp = 0;
        }
    }

    fire() {
        if (this.target && this.target.hp > 0) {
            projectiles.push(new TankShell(this, this.target));
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        ctx.rotate(this.rotation);
        ctx.fillStyle = '#616161';
        ctx.strokeStyle = '#424242';
        ctx.lineWidth = 1 * scale;
        ctx.fillRect(-this.size * 0.8, -this.size * 0.6, this.size * 1.6, this.size * 1.2);
        ctx.strokeRect(-this.size * 0.8, -this.size * 0.6, this.size * 1.6, this.size * 1.2);

        ctx.fillStyle = '#373737';
        ctx.fillRect(-this.size * 0.7, -this.size * 0.8, this.size * 1.4, this.size * 0.2);
        ctx.fillRect(-this.size * 0.7, this.size * 0.6, this.size * 1.4, this.size * 0.2);

        ctx.rotate(this.turretRotation - this.rotation);
        ctx.fillStyle = '#757575';
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#455a64';
        ctx.fillRect(0, -this.size * 0.1, this.size * 1.5, this.size * 0.2);
        ctx.strokeRect(0, -this.size * 0.1, this.size * 1.5, this.size * 0.2);

        ctx.restore();

        const healthBarWidth = 30 * scale;
        const healthBarHeight = 5 * scale;
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(this.x - healthBarWidth / 2, this.y - this.size - (8 * scale), healthBarWidth, healthBarHeight);
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(this.x - healthBarWidth / 2, this.y - this.size - (8 * scale), healthBarWidth * (this.hp / this.maxHp), healthBarHeight);
    }
}

class TankShell extends Projectile {
    constructor(tank, target) {
        const startX = tank.x + Math.cos(tank.turretRotation) * tank.size * 1.5;
        const startY = tank.y + Math.sin(tank.turretRotation) * tank.size * 1.5;

        super(startX, startY, target, tank, 'tankExplosive');
        this.speed = 12 * scale;
        SFX.play('tank');
    }

    hitTarget() {
        const blastRadiusSq = (this.tower.blastRadius * TILE_SIZE)**2;
        effects.push(new ExplosionEffect(this.target.x, this.target.y, this.tower.blastRadius * TILE_SIZE));

        for (const enemy of enemies) {
            if ((this.target.x - enemy.x)**2 + (this.y - enemy.y)**2 < blastRadiusSq) {
                enemy.takeDamage(this.tower.damage, this.tower, { areaDamage: true });
            }
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.fillStyle = '#ffcc80';
        ctx.beginPath();
        ctx.arc(0, 0, 4 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class MissileProjectile {
    constructor(tower, target) {
        SFX.play('missile');
        this.tower = tower;
        this.startX = tower.x;
        this.startY = tower.y;
        this.targetX = target.x;
        this.targetY = target.y;
        this.flightTimer = tower.flightTime;
        this.maxFlightTime = tower.flightTime;
        this.x = this.startX;
        this.y = this.startY;
        this.angle = -Math.PI / 2;
        this.trail = [];
        this.altitude = 300 * scale;
    }

    update() {
        this.flightTimer--;

        const progress = 1 - (this.flightTimer / this.maxFlightTime);
        const peakProgress = 0.7;

        if (progress < peakProgress) {
            const upProgress = progress / peakProgress;
            this.y = this.startY - (this.altitude * Math.sin(upProgress * Math.PI / 2));
        } else {
            const downProgress = (progress - peakProgress) / (1 - peakProgress);
            this.x = this.startX + (this.targetX - this.startX) * downProgress;
            const startY = this.startY - this.altitude;
            this.y = startY + (this.targetY - startY) * downProgress;

            const nextX = this.startX + (this.targetX - this.startX) * (downProgress + 0.01);
            const nextY = startY + (this.targetY - startY) * (downProgress + 0.01);
            this.angle = Math.atan2(nextY - this.y, nextX - this.x);
        }
        this.trail.push({x: this.x, y: this.y, life: 20});
        this.trail = this.trail.filter(p => p.life > 0);
        this.trail.forEach(p => p.life--);
        if (this.flightTimer <= 0) {
            this.hitTarget();
            return false;
        }
        return true;
    }

    hitTarget() {
        const blastRadiusSq = (this.tower.blastRadius * TILE_SIZE)**2;
        effects.push(new MissileExplosionEffect(this.targetX, this.targetY, this.tower.blastRadius * TILE_SIZE));
        for (const enemy of enemies) {
            if ((this.targetX - enemy.x)**2 + (this.targetY - enemy.y)**2 < blastRadiusSq) {
                let damage;
                if (this.tower.level === 4) {
                    const percentMul = enemy.type === 'boss' ? 0.03 : 0.05;
                    damage = 200 + enemy.hp * percentMul;
                } else {
                    damage = this.tower.damage;
                }
                enemy.takeDamage(damage, this.tower, { areaDamage: true });
                const stunSeconds = enemy.type === 'boss' ? this.tower.stun * 0.7 : this.tower.stun;
                enemy.applyStun(stunSeconds * 60);
            }
        }
    }

    draw() {
        ctx.save();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3 * scale;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        for (let i = 0; i < this.trail.length; i++) {
            const p = this.trail[i];
            const alpha = p.life / 20;
            ctx.globalAlpha = alpha * 0.5;
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        const s = (val) => val * scale;
        ctx.fillStyle = '#E0E0E0';
        ctx.beginPath();
        ctx.rect(s(-15), s(-4), s(30), s(8));
        ctx.fill();
        ctx.fillStyle = '#BDBDBD';
        ctx.beginPath();
        ctx.moveTo(s(20), 0);
        ctx.lineTo(s(15), s(-4));
        ctx.lineTo(s(15), s(4));
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#9E9E9E';
        ctx.beginPath();
        ctx.moveTo(s(-10), s(-4)); ctx.lineTo(s(-18), s(-8)); ctx.lineTo(s(-15), s(-4)); ctx.closePath();
        ctx.moveTo(s(-10), s(4)); ctx.lineTo(s(-18), s(8)); ctx.lineTo(s(-15), s(4)); ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

class PursuitMissile {
    constructor(tower, target) {
        SFX.play('pursuitMissile');
        this.tower = tower;
        this.target = target;
        this.x = tower.x + (gameRandom() - 0.5) * 8 * scale;
        this.y = tower.y + (gameRandom() - 0.5) * 8 * scale;
        this.angle = Math.atan2(target.y - this.y, target.x - this.x);
        this.speed = 6 * scale;
        this.turnSpeed = 0.18;
        this.smokeTrail = [];
        this.life = 300;
    }
    update() {
        if (this.life-- <= 0) { this.hitTarget(); return false; }
        if (!this.target || this.target.hp <= 0) {
            this.hitTarget();
            return false;
        }
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < this.speed) {
            this.x = this.target.x;
            this.y = this.target.y;
            this.hitTarget();
            return false;
        }
        const targetAngle = Math.atan2(dy, dx);
        let diff = targetAngle - this.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.angle += diff * this.turnSpeed;
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.smokeTrail.push({ x: this.x - Math.cos(this.angle) * 6 * scale, y: this.y - Math.sin(this.angle) * 6 * scale, life: 30, maxLife: 30, size: (2 + effectRandom() * 2) * scale, vx: (effectRandom() - 0.5) * 0.3 * scale, vy: (effectRandom() - 0.5) * 0.3 * scale });
        if (this.smokeTrail.length > 40) this.smokeTrail.shift();
        this.smokeTrail.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; p.size += 0.08 * scale; });
        this.smokeTrail = this.smokeTrail.filter(p => p.life > 0);
        return true;
    }
    hitTarget() {
        const tx = this.target ? this.target.x : this.x;
        const ty = this.target ? this.target.y : this.y;
        const blastRadiusPx = this.tower.blastRadius * TILE_SIZE;
        const blastRadiusSq = blastRadiusPx * blastRadiusPx;
        effects.push(new MissileExplosionEffect(tx, ty, blastRadiusPx));
        const finalDamage = this.tower.damage * this.tower.buffs.damage * this.tower.buffs.matrixDamage * (this.tower.overloadActive ? 1.2 : 1);
        if (this.target && this.target.hp > 0) this.target.applyInterference(0.5);
        for (const enemy of enemies) {
            if (enemy.hp <= 0) continue;
            if ((tx - enemy.x) ** 2 + (ty - enemy.y) ** 2 < blastRadiusSq) {
                enemy.applyInterference(0.5);
                enemy.takeDamage(finalDamage, this.tower, { areaDamage: true });
            }
        }
    }
    draw() {
        for (const p of this.smokeTrail) {
            const a = (p.life / p.maxLife) * 0.4;
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            g.addColorStop(0, `rgba(220,220,220,${a})`);
            g.addColorStop(1, 'rgba(180,180,180,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        }
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        const s = (val) => val * scale;
        ctx.fillStyle = '#f5f5f5'; ctx.strokeStyle = '#9e9e9e'; ctx.lineWidth = s(1);
        ctx.beginPath(); ctx.rect(s(-6), s(-2.5), s(12), s(5)); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#e0e0e0';
        ctx.beginPath(); ctx.moveTo(s(8), 0); ctx.lineTo(s(6), s(-2.5)); ctx.lineTo(s(6), s(2.5)); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#bdbdbd';
        ctx.beginPath(); ctx.moveTo(s(-6), s(-2.5)); ctx.lineTo(s(-9), s(-4.5)); ctx.lineTo(s(-5), s(-2.5)); ctx.closePath();
        ctx.moveTo(s(-6), s(2.5)); ctx.lineTo(s(-9), s(4.5)); ctx.lineTo(s(-5), s(2.5)); ctx.closePath();
        ctx.fill();
        ctx.fillStyle = `rgba(255,180,60,${0.6 + Math.random() * 0.3})`;
        ctx.shadowColor = '#ff9800'; ctx.shadowBlur = s(6);
        ctx.beginPath(); ctx.moveTo(s(-6), 0); ctx.lineTo(s(-12), s(-2)); ctx.lineTo(s(-12), s(2)); ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

class HeavyMissile {
    constructor(tower, target) {
        SFX.play('missile');
        this.tower = tower;
        this.target = target;
        this.damage = tower.missileDamage;
        this.blastRadius = tower.missileBlastRadius;
        this.x = tower.x + (gameRandom() - 0.5) * 8 * scale;
        this.y = tower.y - 8 * scale + (gameRandom() - 0.5) * 6 * scale;
        this.angle = -Math.PI / 2;
        this.speed = 2.5 * scale;
        this.maxSpeed = 8.5 * scale;
        this.turnSpeed = 0.09;
        this.smokeTrail = [];
        this.life = 300;
        this.prevDist = Infinity;
        this.age = 0;
    }
    update() {
        this.age++;
        if (this.life-- <= 0) { this.hitTarget(); return false; }
        if (!this.target || this.target.hp <= 0) { this.hitTarget(); return false; }
        this.speed = Math.min(this.maxSpeed, this.speed + 0.3 * scale);
        const dx = this.target.x - this.x, dy = this.target.y - this.y;
        const dist = Math.hypot(dx, dy);
        const proximity = this.speed + (this.target.size || 10 * scale);
        const passedClosest = this.age > 2 && dist > this.prevDist && dist < 1.2 * TILE_SIZE;
        if (dist < proximity || passedClosest) {
            this.x = this.target.x; this.y = this.target.y;
            this.hitTarget();
            return false;
        }
        this.prevDist = dist;
        const targetAngle = Math.atan2(dy, dx);
        let diff = targetAngle - this.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        const near = Math.max(0, 1 - dist / (3 * TILE_SIZE));
        const turn = Math.min(0.4, this.turnSpeed + near * 0.32);
        this.angle += diff * turn;
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.smokeTrail.push({ x: this.x - Math.cos(this.angle) * 10 * scale, y: this.y - Math.sin(this.angle) * 10 * scale, life: 26, maxLife: 26, size: (3 + effectRandom() * 2.5) * scale, vx: (effectRandom() - 0.5) * 0.3 * scale, vy: (effectRandom() - 0.5) * 0.3 * scale });
        if (this.smokeTrail.length > 50) this.smokeTrail.shift();
        this.smokeTrail.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; p.size += 0.1 * scale; });
        this.smokeTrail = this.smokeTrail.filter(p => p.life > 0);
        return true;
    }
    hitTarget() {
        const tx = this.target ? this.target.x : this.x;
        const ty = this.target ? this.target.y : this.y;
        const blastPx = this.blastRadius * TILE_SIZE;
        const blastSq = blastPx * blastPx;
        effects.push(new HeavyDebrisExplosion(tx, ty, blastPx));
        const dmg = this.damage * this.tower.buffs.damage * this.tower.buffs.matrixDamage;
        for (const enemy of enemies) {
            if (enemy.hp <= 0) continue;
            if ((tx - enemy.x) ** 2 + (ty - enemy.y) ** 2 < blastSq) {
                enemy.takeDamage(dmg, this.tower, { areaDamage: true });
            }
        }
    }
    draw() {
        for (const p of this.smokeTrail) {
            const a = (p.life / p.maxLife) * 0.4;
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            g.addColorStop(0, `rgba(235,235,235,${a})`);
            g.addColorStop(1, 'rgba(200,200,200,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        }
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        const s = (val) => val * scale;
        const flick = 0.6 + Math.random() * 0.4;
        ctx.fillStyle = `rgba(255,180,60,${flick})`;
        ctx.shadowColor = '#ffb300'; ctx.shadowBlur = s(12);
        ctx.beginPath(); ctx.moveTo(s(-11), 0); ctx.lineTo(s(-26), s(-5)); ctx.lineTo(s(-21), 0); ctx.lineTo(s(-26), s(5)); ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
        const bg = ctx.createLinearGradient(0, s(-5), 0, s(5));
        bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.5, '#e0e0e0'); bg.addColorStop(1, '#9e9e9e');
        ctx.fillStyle = bg; ctx.strokeStyle = '#454a4e'; ctx.lineWidth = s(1);
        ctx.beginPath(); ctx.rect(s(-11), s(-5), s(22), s(10)); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#5b6166';
        ctx.beginPath(); ctx.rect(s(-2), s(-5), s(3), s(10)); ctx.fill();
        ctx.fillStyle = '#454a4e';
        ctx.beginPath(); ctx.moveTo(s(18), 0); ctx.lineTo(s(11), s(-5)); ctx.lineTo(s(11), s(5)); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#bdbdbd'; ctx.strokeStyle = '#454a4e'; ctx.lineWidth = s(0.7);
        ctx.beginPath(); ctx.moveTo(s(-11), s(-5)); ctx.lineTo(s(-16), s(-8)); ctx.lineTo(s(-9), s(-5)); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(s(-11), s(5)); ctx.lineTo(s(-16), s(8)); ctx.lineTo(s(-9), s(5)); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
    }
}

function drawSpinBlade(c, radius, spin, blades, isEX) {
    const lw = Math.max(0.6, radius * 0.045);
    for (let i = 0; i < blades; i++) {
        const a = spin + i * (Math.PI * 2 / blades);
        if (isEX) {
            const sweep = 1.0;
            const tg = c.createLinearGradient(Math.cos(a) * radius, Math.sin(a) * radius, Math.cos(a - sweep) * radius, Math.sin(a - sweep) * radius);
            tg.addColorStop(0, 'rgba(255,82,82,0.5)');
            tg.addColorStop(1, 'rgba(183,28,28,0)');
            c.fillStyle = tg;
            c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, radius, a, a - sweep, true); c.closePath(); c.fill();
        }
        c.save();
        c.rotate(a);
        const grad = c.createLinearGradient(0, 0, radius, 0);
        if (isEX) { grad.addColorStop(0, '#ff8a80'); grad.addColorStop(0.6, '#e53935'); grad.addColorStop(1, '#b71c1c'); }
        else { grad.addColorStop(0, '#eceff1'); grad.addColorStop(0.6, '#cfd8dc'); grad.addColorStop(1, '#90a4ae'); }
        c.fillStyle = grad; c.strokeStyle = isEX ? '#7f0000' : '#607d8b'; c.lineWidth = lw;
        const w = radius * 0.15;
        c.beginPath();
        c.moveTo(0, -w * 0.5);
        c.lineTo(radius * 0.6, -w);
        c.lineTo(radius, 0);
        c.lineTo(radius * 0.6, w);
        c.lineTo(0, w * 0.5);
        c.closePath();
        c.fill(); c.stroke();
        c.restore();
    }
    c.fillStyle = isEX ? '#4e342e' : '#5d4037'; c.strokeStyle = isEX ? '#7f0000' : '#3e2723'; c.lineWidth = lw;
    c.beginPath(); c.arc(0, 0, radius * 0.18, 0, Math.PI * 2); c.fill(); c.stroke();
}

class BoomerangBlade {
    constructor(tower, tx, ty) {
        this.tower = tower;
        this.damage = tower.damage;
        this.isEX = tower.level === 4;
        this.blades = this.isEX ? 4 : 2;
        this.radius = TILE_SIZE / 2;
        this.x = tower.x; this.y = tower.y;
        this.targetX = tx; this.targetY = ty;
        const dx = tx - this.x, dy = ty - this.y;
        const dist = Math.hypot(dx, dy) || 1;
        this.speed = (this.isEX ? 8 : 5) * scale;
        this.vx = dx / dist * this.speed;
        this.vy = dy / dist * this.speed;
        this.phase = 'flight';
        this.lingerTimer = tower.lingerTime || 72;
        this.spin = 0;
        this.spinSpeed = this.isEX ? 0.55 : 0.4;
        this.critCount = 0;
        this.hitInfo = new Map();
    }
    update() {
        for (const info of this.hitInfo.values()) { if (info.cd > 0) info.cd--; }
        this.spin += this.spinSpeed;
        if (this.phase === 'flight') {
            const remX = this.targetX - this.x, remY = this.targetY - this.y;
            if (remX * this.vx + remY * this.vy <= 0 || (remX * remX + remY * remY) < this.speed * this.speed) {
                this.x = this.targetX; this.y = this.targetY;
                this.phase = 'linger';
            } else {
                this.x += this.vx; this.y += this.vy;
            }
            this.damageContacts(true);
        } else {
            this.damageContacts(false);
            if (--this.lingerTimer <= 0) return false;
        }
        return true;
    }
    damageContacts(isFlight) {
        for (const e of enemies) {
            if (e.hp <= 0) continue;
            const cr = this.radius + e.size;
            if ((this.x - e.x) ** 2 + (this.y - e.y) ** 2 > cr * cr) continue;
            let info = this.hitInfo.get(e);
            if (!info) { info = { fhits: 0, cd: 0 }; this.hitInfo.set(e, info); }
            if (info.cd > 0) continue;
            if (isFlight) {
                if (info.fhits >= 3) continue;
                info.fhits++; info.cd = 6;
            } else {
                info.cd += 10.5;
            }
            this.applyDamage(e);
        }
    }
    applyDamage(e) {
        let dmg = this.damage * this.tower.buffs.damage * this.tower.buffs.matrixDamage;
        if (this.isEX) {
            const controlled = (e.slowEffects && e.slowEffects.length > 0) || e.frozenTimer > 0 || e.stunTimer > 0 || (e.debuffs && e.debuffs.burn.timer > 0);
            if (controlled) dmg *= 2;
        }
        if (e.spotlitCritTimer > 0 && this.critCount < 5 && gameRandom() < 0.25) {
            dmg *= 1.25;
            this.critCount++;
            effects.push(new SpotlightCritEffect(e.x, e.y - e.size, 1.25));
        }
        e.takeDamage(dmg, this.tower, { areaDamage: true, suppressSpotlightCrit: true });
    }
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        drawSpinBlade(ctx, this.radius, this.spin, this.blades, this.isEX);
        ctx.restore();
    }
}
