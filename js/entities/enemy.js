class Enemy {
    constructor(wave, type = 'normal') {
        this.wave = wave;
        this.pathIndex = 0;
        this.x = path.length > 0 ? path[0].x : 0;
        this.y = path.length > 0 ? path[0].y : 0;
        this.type = type;
        this.slowEffects = [];
        this.stunTimer = 0;
        this.isFighting = null;
        this.debuffs = {
            defenseBreak: { timer: 0 },
            bountyMark: { timer: 0 },
            burn: { timer: 0, percent: 0, bossPercent: 0, sourceTower: null }
        };
        this.controlResistanceModifier = 1;
        this.iceSealStacks = 0;
        this.frozenTimer = 0;
        this.heatedZoneTimer = 0;
        this.shieldHp = 0;
        this.maxShieldHp = 0;
        this.hasShield = false;
        this.spotlitCritTimer = 0;
        this.burnResistance = 0;
        this.burnTickTimer = 0;
        this.interferenceStacks = 0;
        this.confusionTimer = 0;
        this.confusionResistance = 0;
        this.vulnerabilityStacks = 0;

        const mapModifier = MAP_DATA[selectedMap]?.modifier || { hp: 1, speed: 1 };

        let baseHp;
        if (wave <= 10) { baseHp = Math.floor(40 * Math.pow(1.15, wave)); }
        else if (wave <= 20) { const hpAt10 = 40 * Math.pow(1.15, 10); baseHp = Math.floor(hpAt10 * Math.pow(1.33, wave - 10)); }
        else { const hpAt10 = 45 * Math.pow(1.15, 10); const hpAt20 = hpAt10 * Math.pow(1.25, 10); baseHp = Math.floor(hpAt20 * Math.pow(1.18, wave - 20)); }

        let moneyBonus;
        if (wave <= 10) { moneyBonus = wave; }
        else if (wave <= 20) { moneyBonus = 10 + (wave - 10) * 2; }
        else { moneyBonus = 10 + 10 * 2 + (wave - 20) * 3; }
        this.moneyValue = 5 + moneyBonus;

        let baseSpeed;
        switch (this.type) {
            case 'fast':
                this.maxHp = baseHp * 0.8;
                baseSpeed = 2.5 * scale;
                this.size = 8 * scale;
                break;
            case 'strong':
                this.maxHp = baseHp * 2.2;
                baseSpeed = 0.7 * scale;
                this.size = 20 * scale;
                break;
            case 'boss':
                this.maxHp = baseHp * 75;
                baseSpeed = 1 * scale;
                this.size = 25 * scale;
                this.skillTriggers = { '75': false, '50': false, '25': false };
                break;
            case 'dummy':
                this.maxHp = 100000;
                baseSpeed = 0;
                this.size = 50 * scale;
                break;
            default:
                this.maxHp = baseHp;
                baseSpeed = 1 * scale;
                this.size = 10 * scale;
                break;
            case 'shield':
                this.maxHp = baseHp * 1.7;
                this.maxShieldHp = baseHp * 0.5;
                this.shieldHp = this.maxShieldHp;
                this.hasShield = true;
                baseSpeed = 0.85 * scale;
                this.size = 15 * scale;
                break;
            case 'summoner':
                this.maxHp = baseHp * 3;
                baseSpeed = 0.5 * scale;
                this.size = 18 * scale;
                this.summonTimer = 50 * 60;
                break;
        }

        this.maxHp *= mapModifier.hp;
        this.speed = baseSpeed * mapModifier.speed;
        this.hp = this.maxHp;
        this.animPhase = effectRandom() * Math.PI * 2;
        this.facing = 0;
        this.hitShake = 0;
    }
    applySlow(amount, duration, source = null, multiplicative = false) {
        if (this.hasShield) return;
        let finalAmount = (this.type === 'boss' ? amount / 2 : amount) * this.controlResistanceModifier;
        if (source && source.type === 'slow' && this.heatedZoneTimer > 0) {
            finalAmount *= 0.2;
        }
        this.slowEffects.push({amount: finalAmount, duration, maxDuration: duration, mult: multiplicative});
    }
    applyStun(duration) {
        if (this.hasShield) return;
        let finalDuration = (this.type === 'boss' ? duration / 2 : duration) * this.controlResistanceModifier;
        this.stunTimer = Math.max(this.stunTimer, finalDuration);
    }
    applyDefenseBreak(duration) {
        if (this.hasShield) return;
        this.debuffs.defenseBreak.timer = Math.max(this.debuffs.defenseBreak.timer, duration);
    }
    applyBurn(percent, bossPercent, duration, sourceTower) {
        if (this.hasShield) return;
        this.debuffs.burn.percent = percent;
        this.debuffs.burn.bossPercent = bossPercent;
        this.debuffs.burn.timer = Math.max(this.debuffs.burn.timer, duration);
        this.debuffs.burn.sourceTower = sourceTower;
    }
    applyIceSeal() {
        if (this.hasShield) return;
        if (this.heatedZoneTimer > 0) return;
        if (this.frozenTimer > 0) return;

        this.iceSealStacks++;
        const threshold = this.type === 'boss' ? 40 : 15;

        if (this.iceSealStacks >= threshold) {
            this.iceSealStacks = 0;
            this.frozenTimer = this.type === 'boss' ? 120 : 240;
            effects.push(new FreezeShatterEffect(this.x, this.y, this.size));
        }
    }
    applyInterference(stacks) {
        if (this.hasShield || this.hp <= 0 || stacks <= 0) return;
        this.interferenceStacks += stacks;
        if (this.interferenceStacks < 80) return;
        this.interferenceStacks = 0;
        this.triggerConfusion();
    }
    triggerConfusion() {
        if (this.confusionResistance >= 100) return false;
        const duration = Math.round(180 * (1 - this.confusionResistance / 100));
        if (duration <= 0) return false;
        this.confusionTimer = Math.max(this.confusionTimer, duration);
        this.confusionResistance = Math.min(100, this.confusionResistance + 10);
        effects.push(new ConfusionEffect(this.x, this.y, this.size));
        return true;
    }
    getDebuffKinds() {
        const kinds = [];
        if (this.slowEffects.length > 0) kinds.push('slow');
        if (this.stunTimer > 0) kinds.push('stun');
        if (this.frozenTimer > 0) kinds.push('frozen');
        if (this.iceSealStacks > 0) kinds.push('iceSeal');
        if (this.debuffs.defenseBreak.timer > 0) kinds.push('defenseBreak');
        if (this.controlResistanceModifier > 1) kinds.push('controlBreak');
        return kinds;
    }
    syncDebuffsFrom(source) {
        if (this.hasShield) return;
        if (source.slowEffects.length > 0) {
            let maxAmt = 0, maxDur = 0;
            for (const e of source.slowEffects) {
                if (e.amount > maxAmt) maxAmt = e.amount;
                if (e.duration > maxDur) maxDur = e.duration;
            }
            if (maxAmt > 0) this.slowEffects.push({ amount: maxAmt, duration: maxDur, maxDuration: maxDur });
        }
        if (source.stunTimer > this.stunTimer) this.stunTimer = source.stunTimer;
        if (source.frozenTimer > this.frozenTimer) this.frozenTimer = source.frozenTimer;
        if (source.iceSealStacks > this.iceSealStacks) this.iceSealStacks = source.iceSealStacks;
        if (source.debuffs.defenseBreak.timer > this.debuffs.defenseBreak.timer) {
            this.debuffs.defenseBreak.timer = source.debuffs.defenseBreak.timer;
        }
        if (source.controlResistanceModifier > this.controlResistanceModifier) {
            this.controlResistanceModifier = source.controlResistanceModifier;
        }
    }
    pushBack(distanceInPixels) {
        if (this.hasShield) return;
        if (this.pathIndex <= 0) return;

        let remainingPush = distanceInPixels;

        while (remainingPush > 0 && this.pathIndex > 0) {
            const prevNode = path[this.pathIndex - 1];
            const distToPrevNode = Math.hypot(this.x - prevNode.x, this.y - prevNode.y);

            if (remainingPush >= distToPrevNode) {
                remainingPush -= distToPrevNode;
                this.x = prevNode.x;
                this.y = prevNode.y;
                this.pathIndex--;
                if (this.pathIndex === 0) {
                    const startNode = path[0];
                    this.x = startNode.x;
                    this.y = startNode.y;
                    return;
                }
            } else {
                const dx = this.x - prevNode.x;
                const dy = this.y - prevNode.y;
                const ratio = remainingPush / distToPrevNode;
                this.x -= dx * ratio;
                this.y -= dy * ratio;
                remainingPush = 0;
            }
        }
    }
    update() {
        if (this.hitShake > 0) this.hitShake *= 0.82;
        if (this.heatedZoneTimer > 0) this.heatedZoneTimer--;
        if (this.spotlitCritTimer > 0) this.spotlitCritTimer--;
        if (this.type === 'summoner' && this.hp > 0) {
            this.summonTimer--;
            if (this.summonTimer <= 0) {
                this.summonTimer = 50 * 60;
                const spawnCount = 2 + 1;
                const types = ['normal', 'normal', 'shield'];
                for (let i = 0; i < spawnCount; i++) {
                    scheduleSimulationEvent(i * 12, () => {
                        if (this.hp <= 0) return;
                        const baby = new Enemy(this.wave, types[i]);
                        baby.x = this.x;
                        baby.y = this.y;
                        baby.pathIndex = this.pathIndex;
                        enemies.push(baby);
                        effects.push(new ConfusionEffect(this.x, this.y, this.size));
                    });
                }
            }
        }
        if (this.debuffs.burn && this.debuffs.burn.timer > 0) {
            this.debuffs.burn.timer--;
            this.burnResistance = Math.min(0.5, this.burnResistance + 5 / 100 / 60);
            if (this.burnTickTimer > 0) this.burnTickTimer--;
            if (this.burnTickTimer <= 0) {
                this.burnTickTimer = 15;
                const burnPct = this.type === 'boss' ? this.debuffs.burn.bossPercent : this.debuffs.burn.percent;
                const base = this.type === 'boss' ? this.hp : this.maxHp;
                const burnDamage = base * burnPct * (1 - this.burnResistance);
                this.takeDamage(burnDamage, this.debuffs.burn.sourceTower);
            }
        } else {
            this.burnResistance = Math.max(0, this.burnResistance - 5 / 100 / 60);
        }
        const isConfused = this.confusionTimer > 0;
        if (isConfused) this.confusionTimer--;
        if (this.frozenTimer > 0) {
            this.frozenTimer--;
            return;
        }
        if (this.debuffs.defenseBreak.timer > 0) this.debuffs.defenseBreak.timer--;
            if (this.debuffs.bountyMark.timer > 0) this.debuffs.bountyMark.timer--;

        if (this.isFighting || this.stunTimer > 0) {
            if (this.stunTimer > 0) this.stunTimer--;
            if (this.isFighting || !isConfused) return;
        }

        let currentSpeed = this.speed;
        let maxSlow = 0;
        let maxMultSlow = 0;
        this.slowEffects = this.slowEffects.filter(effect => {
            if (effect.duration > 0) {
                if (effect.mult) { if (effect.amount > maxMultSlow) maxMultSlow = effect.amount; }
                else if (effect.amount > maxSlow) maxSlow = effect.amount;
                effect.duration--; return true;
            }
            return false;
        });
        currentSpeed *= Math.max(0, 1 - maxSlow) * Math.max(0, 1 - maxMultSlow);

        if (path.length > 0 && isConfused) {
            const target = path[this.pathIndex];
            const dx = target.x - this.x; const dy = target.y - this.y;
            const dist = Math.hypot(dx, dy);
            if (dist <= 0.01) {
                if (this.pathIndex > 0) this.pathIndex--;
            } else {
                this.facing = Math.atan2(dy, dx);
                if (dist < currentSpeed) {
                    this.x = target.x; this.y = target.y;
                    if (this.pathIndex > 0) this.pathIndex--;
                } else {
                    this.x += (dx / dist) * currentSpeed; this.y += (dy / dist) * currentSpeed;
                }
            }
        } else if (path.length > 0 && this.pathIndex < path.length - 1) {
            const target = path[this.pathIndex + 1];
            const dx = target.x - this.x; const dy = target.y - this.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 0.01) this.facing = Math.atan2(dy, dx);
            if (dist < currentSpeed) {
                this.pathIndex++; this.x = target.x; this.y = target.y;
            } else {
                this.x += (dx / dist) * currentSpeed; this.y += (dy / dist) * currentSpeed;
            }
        } else if (path.length > 0) {
            if (this.type === 'boss') {
                hp = 0;
            } else {
                hp--;
            }
            this.hp = 0;
            if (hp <= 0) {
                gameOver(false);
            }
        }
    }
    takeDamage(amount, sourceTower = null, options = {}) {
        if (this.hp <= 0) return;
        this.hitShake = Math.min(5, this.hitShake + 2.2);

        if (sourceTower && sourceTower.type !== 'spotlight' && this.spotlitCritTimer > 0 && !options.suppressSpotlightCrit) {
            const critChance = 0.25;
            if (gameRandom() < critChance) {
                const critMult = options.areaDamage ? 1.25 : 2.0;
                amount *= critMult;
                effects.push(new SpotlightCritEffect(this.x, this.y - this.size, critMult));
            }
        }

        let damageApplied = 0;
        if (this.hasShield && this.shieldHp > 0) {
            const shieldBefore = this.shieldHp;
            this.shieldHp -= amount;
            damageApplied = Math.min(amount, shieldBefore);
            if (this.shieldHp <= 0) {
                this.hasShield = false;
                effects.push(new ShieldBreakEffect(this.x, this.y, this.size));
            }
        }
        else {
            if (this.debuffs.defenseBreak.timer > 0) {
                amount *= 1.15;
            }
            if (this.vulnerabilityStacks > 0) {
                amount *= (1 + this.vulnerabilityStacks * 0.01);
            }
            const hpBefore = this.hp;
            this.hp -= amount;
            damageApplied = Math.min(amount, hpBefore);
        }
        if (sourceTower && damageApplied > 0) {
            sourceTower.totalDamage = (sourceTower.totalDamage || 0) + damageApplied;
        }
                if (this.type === 'boss') {
            const currentHpPercent = (this.hp / this.maxHp) * 100;
            const thresholds = [75, 50, 25];

            for (const threshold of thresholds) {
                if (currentHpPercent <= threshold && !this.skillTriggers[threshold]) {
                    this.skillTriggers[threshold] = true;

                    towers.forEach(t => {
                        if (t.type === 'destroyer' && t.destroyerState !== 'closed') {
                            return;
                        }
                        t.applyStun(6);
                    });

                    effects.push(new BossShockwaveEffect(this.x, this.y));

                    break;
                }
            }
        }

        if (isTestMode && sourceTower) {
            damageLog.push({
                amount: damageApplied,
                towerId: sourceTower.id,
                timestamp: performance.now()
            });
        }
        if (this.hp <= 0) {
            if (this.debuffs.bountyMark.timer > 0) {
                money += 30;
                effects.push(new GoldEffect(this.x, this.y, 30));
            }
            for (const t of towers) {
                if (t.type === 'shrineOfMerit' && (this.x - t.x)**2 + (this.y - t.y)**2 < t.rangePixelsSq) {
                    const bonusGold = Math.floor(t.baseGold + (this.moneyValue * t.moneyMultiplier));
                    if (bonusGold > 0) {
                        money += bonusGold;
                        effects.push(new GoldEffect(t.x, t.y, bonusGold));
                        t.animState.flashTime = 20;
                    }
                }
            }
            if (isTestMode) {
                this.hp = this.maxHp;
                this.iceSealStacks = 0;
                this.frozenTimer = 0;
            } else {
                money += this.moneyValue;
                markUiDirty();
                markTowerInfoDirty();
            }
        }
    }
    drawNormalModel(ctx, t, hp) {
        const s = this.size;
        const sq = 1 + Math.sin(t) * 0.09;
        const hue = 12 + hp * 100;
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.beginPath(); ctx.ellipse(0, s * 0.92, s * 0.78, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.save();
        ctx.scale(1 / sq, sq);
        ctx.fillStyle = `hsl(${hue}, 62%, 50%)`;
        ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 1.6 * scale; ctx.strokeStyle = `hsl(${hue}, 60%, 30%)`; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        ctx.beginPath(); ctx.ellipse(-s * 0.32, -s * 0.4, s * 0.3, s * 0.16, -0.6, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        const dir = Math.cos(this.facing) * s * 0.12;
        const ex = s * 0.3, ey = -s * 0.02, er = s * 0.19;
        ctx.fillStyle = '#181818';
        ctx.beginPath(); ctx.arc(-ex + dir, ey, er, 0, Math.PI * 2); ctx.arc(ex + dir, ey, er, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-ex + dir + er * 0.3, ey - er * 0.3, er * 0.38, 0, Math.PI * 2); ctx.arc(ex + dir + er * 0.3, ey - er * 0.3, er * 0.38, 0, Math.PI * 2); ctx.fill();
    }

    drawFastModel(ctx, t, hp) {
        const s = this.size;
        ctx.save();
        ctx.rotate(this.facing);
        ctx.strokeStyle = 'rgba(255, 235, 130, 0.35)'; ctx.lineWidth = 1.5 * scale;
        ctx.beginPath();
        ctx.moveTo(-s * 1.3, -s * 0.4); ctx.lineTo(-s * 2.7, -s * 0.4);
        ctx.moveTo(-s * 1.3, s * 0.4); ctx.lineTo(-s * 2.7, s * 0.4);
        ctx.stroke();
        const wing = 0.45 + Math.abs(Math.sin(t * 2.6)) * 0.95;
        ctx.fillStyle = 'rgba(190, 225, 255, 0.55)';
        ctx.save(); ctx.scale(1, wing);
        ctx.beginPath();
        ctx.ellipse(-s * 0.1, -s * 1.1, s * 0.75, s * 0.45, -0.5, 0, Math.PI * 2);
        ctx.ellipse(-s * 0.1, s * 1.1, s * 0.75, s * 0.45, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#f9a825';
        ctx.beginPath(); ctx.ellipse(0, 0, s * 1.5, s * 0.7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3a2a00';
        for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.ellipse(i * s * 0.5 - s * 0.1, 0, s * 0.14, s * 0.6, 0, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.moveTo(-s * 1.5, 0); ctx.lineTo(-s * 2.15, -s * 0.18); ctx.lineTo(-s * 2.15, s * 0.18); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(s * 1.45, 0, s * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff5252';
        ctx.beginPath(); ctx.arc(s * 1.55, -s * 0.2, s * 0.14, 0, Math.PI * 2); ctx.arc(s * 1.55, s * 0.2, s * 0.14, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    drawStrongModel(ctx, t, hp) {
        const s = this.size;
        const bob = Math.sin(t * 0.7) * s * 0.05;
        ctx.save();
        ctx.translate(0, bob);
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.beginPath(); ctx.ellipse(0, s * 0.95 - bob, s * 0.95, s * 0.22, 0, 0, Math.PI * 2); ctx.fill();
        const w = s * 0.95, h = s;
        ctx.fillStyle = `hsl(${4 + hp * 8}, ${52 + hp * 16}%, ${32 + hp * 9}%)`;
        ctx.beginPath();
        ctx.moveTo(-w, -h * 0.4); ctx.lineTo(-w * 0.6, -h); ctx.lineTo(w * 0.6, -h);
        ctx.lineTo(w, -h * 0.4); ctx.lineTo(w * 0.7, h * 0.9); ctx.lineTo(-w * 0.7, h * 0.9);
        ctx.closePath(); ctx.fill();
        ctx.lineWidth = 2 * scale; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.10)';
        ctx.beginPath(); ctx.moveTo(-w * 0.5, -h * 0.5); ctx.lineTo(w * 0.5, -h * 0.5); ctx.lineTo(w * 0.35, h * 0.2); ctx.lineTo(-w * 0.35, h * 0.2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = `hsl(6, 48%, ${24 + hp * 7}%)`;
        ctx.beginPath(); ctx.arc(-w, -h * 0.45, s * 0.42, 0, Math.PI * 2); ctx.arc(w, -h * 0.45, s * 0.42, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffca28';
        ctx.beginPath();
        ctx.moveTo(-s * 0.5, -h * 0.55); ctx.lineTo(-s * 0.12, -h * 0.45); ctx.lineTo(-s * 0.5, -h * 0.35); ctx.closePath();
        ctx.moveTo(s * 0.5, -h * 0.55); ctx.lineTo(s * 0.12, -h * 0.45); ctx.lineTo(s * 0.5, -h * 0.35); ctx.closePath();
        ctx.fill();
        if (hp < 0.5) {
            ctx.strokeStyle = `rgba(255,${Math.floor(140 * hp)},0,${0.85 - hp})`; ctx.lineWidth = 1.6 * scale;
            ctx.beginPath();
            ctx.moveTo(-s * 0.2, -h * 0.2); ctx.lineTo(0, 0); ctx.lineTo(-s * 0.1, h * 0.45);
            ctx.moveTo(0, 0); ctx.lineTo(s * 0.28, h * 0.12);
            ctx.stroke();
        }
        ctx.restore();
    }

    drawShieldModel(ctx, t, hp) {
        const s = this.size;
        const bob = Math.sin(t) * s * 0.06;
        ctx.save();
        ctx.translate(0, bob);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath(); ctx.ellipse(0, s * 0.95 - bob, s * 0.8, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `hsl(210, 18%, ${42 + hp * 10}%)`;
        ctx.beginPath(); ctx.moveTo(-s * 0.6, -s * 0.7); ctx.lineTo(s * 0.6, -s * 0.7); ctx.lineTo(s * 0.72, s * 0.8); ctx.lineTo(-s * 0.72, s * 0.8); ctx.closePath(); ctx.fill();
        ctx.lineWidth = 1.6 * scale; ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.stroke();
        ctx.fillStyle = 'hsl(210,15%,58%)';
        ctx.beginPath(); ctx.arc(0, -s * 0.68, s * 0.45, Math.PI, 0); ctx.fill();
        ctx.fillRect(-s * 0.45, -s * 0.7, s * 0.9, s * 0.32);
        ctx.fillStyle = '#0a0a0a'; ctx.fillRect(-s * 0.4, -s * 0.6, s * 0.8, s * 0.1);
        ctx.save();
        ctx.rotate(this.facing);
        const sx = s * 0.85;
        if (this.hasShield && this.shieldHp > 0) {
            ctx.fillStyle = '#90a4ae'; ctx.strokeStyle = '#cfd8dc'; ctx.lineWidth = 2 * scale;
            ctx.beginPath();
            ctx.moveTo(sx, -s * 0.85); ctx.lineTo(sx + s * 0.5, -s * 0.55); ctx.lineTo(sx + s * 0.5, s * 0.55);
            ctx.lineTo(sx, s * 0.85); ctx.lineTo(sx - s * 0.12, 0); ctx.closePath();
            ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#ffd54a'; ctx.beginPath(); ctx.arc(sx + s * 0.2, 0, s * 0.16, 0, Math.PI * 2); ctx.fill();
        } else {
            ctx.strokeStyle = '#607d8b'; ctx.lineWidth = 2 * scale;
            ctx.beginPath();
            ctx.moveTo(sx, -s * 0.5); ctx.lineTo(sx + s * 0.3, -s * 0.1);
            ctx.moveTo(sx + s * 0.3, s * 0.1); ctx.lineTo(sx, s * 0.5);
            ctx.stroke();
        }
        ctx.restore();
        ctx.restore();
    }

    drawBossModel(ctx, t, hp) {
        const s = this.size;
        const pulse = 1 + Math.sin(frameCount * 0.08) * 0.05;
        const spin = frameCount * 0.01;
        ctx.save();
        const aura = ctx.createRadialGradient(0, 0, s * 0.5, 0, 0, s * 2.2 * pulse);
        aura.addColorStop(0, 'rgba(180, 20, 40, 0.35)');
        aura.addColorStop(0.6, 'rgba(120, 10, 60, 0.16)');
        aura.addColorStop(1, 'rgba(80, 0, 50, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath(); ctx.arc(0, 0, s * 2.2 * pulse, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.rotate(spin);
        ctx.fillStyle = '#4a0d1f';
        const spikes = 10;
        for (let i = 0; i < spikes; i++) {
            const a = (i / spikes) * Math.PI * 2, r1 = s * 1.05, r2 = s * 1.6;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a - 0.12) * r1, Math.sin(a - 0.12) * r1);
            ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
            ctx.lineTo(Math.cos(a + 0.12) * r1, Math.sin(a + 0.12) * r1);
            ctx.closePath(); ctx.fill();
        }
        ctx.restore();
        ctx.fillStyle = '#8e1230';
        ctx.beginPath(); ctx.arc(0, 0, s * 1.05, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 3 * scale; ctx.strokeStyle = '#3a0512'; ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * s * 1.05, Math.sin(a) * s * 1.05); }
        ctx.stroke();
        const core = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.62 * pulse);
        core.addColorStop(0, '#fff3b0'); core.addColorStop(0.5, '#ff5252'); core.addColorStop(1, '#7a0a1e');
        ctx.fillStyle = core;
        ctx.beginPath(); ctx.arc(0, 0, s * 0.62 * pulse, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.rotate(this.facing);
        ctx.fillStyle = '#1a0000';
        ctx.beginPath(); ctx.ellipse(s * 0.1, 0, s * 0.18, s * 0.42, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        if (hp < 0.5) {
            ctx.strokeStyle = `rgba(255,180,40,${0.7 - hp})`; ctx.lineWidth = 2 * scale;
            ctx.beginPath();
            for (let i = 0; i < 4; i++) { const a = -spin + i * 1.7; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s); }
            ctx.stroke();
        }
        ctx.restore();
    }

    drawSummonerModel(ctx, t, hp) {
        const s = this.size;
        const bob = Math.sin(t * 0.9) * s * 0.08;
        const robeHue = 275;
        ctx.save();
        ctx.translate(0, bob);
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.beginPath(); ctx.ellipse(0, s * 0.95 - bob, s * 0.8, s * 0.22, 0, 0, Math.PI * 2); ctx.fill();
        const auraR = s * (1.25 + Math.sin(t * 1.4) * 0.12);
        const aura = ctx.createRadialGradient(0, 0, s * 0.3, 0, 0, auraR);
        aura.addColorStop(0, 'rgba(186,104,255,0.32)');
        aura.addColorStop(0.7, 'rgba(149,76,233,0.14)');
        aura.addColorStop(1, 'rgba(103,58,183,0)');
        ctx.fillStyle = aura;
        ctx.beginPath(); ctx.arc(0, 0, auraR, 0, Math.PI * 2); ctx.fill();
        const robeShade = 28 + hp * 18;
        ctx.fillStyle = `hsl(${robeHue}, 60%, ${robeShade}%)`;
        ctx.beginPath();
        ctx.moveTo(-s * 0.5, -s * 0.35); ctx.lineTo(s * 0.5, -s * 0.35);
        ctx.lineTo(s * 0.95, s * 0.9); ctx.lineTo(-s * 0.95, s * 0.9);
        ctx.closePath(); ctx.fill();
        ctx.lineWidth = 1.6 * scale; ctx.strokeStyle = `hsl(${robeHue}, 55%, 16%)`; ctx.stroke();
        ctx.strokeStyle = `hsla(${robeHue}, 70%, 60%, 0.4)`; ctx.lineWidth = 1.4 * scale;
        ctx.beginPath();
        ctx.moveTo(-s * 0.3, -s * 0.2); ctx.lineTo(-s * 0.45, s * 0.85);
        ctx.moveTo(s * 0.3, -s * 0.2); ctx.lineTo(s * 0.45, s * 0.85);
        ctx.moveTo(0, -s * 0.2); ctx.lineTo(0, s * 0.85);
        ctx.stroke();
        ctx.fillStyle = '#ffca28';
        ctx.fillRect(-s * 0.7, s * 0.12, s * 1.4, s * 0.16);
        ctx.strokeStyle = '#7a5e00'; ctx.lineWidth = 1.2 * scale; ctx.strokeRect(-s * 0.7, s * 0.12, s * 1.4, s * 0.16);
        ctx.fillStyle = `hsl(${robeHue}, 45%, ${22 + hp * 10}%)`;
        ctx.beginPath(); ctx.arc(0, -s * 0.55, s * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 1.4 * scale; ctx.strokeStyle = `hsl(${robeHue}, 40%, 12%)`; ctx.stroke();
        ctx.fillStyle = 'rgba(10,0,25,0.55)';
        ctx.beginPath(); ctx.arc(0, -s * 0.5, s * 0.36, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ce93d8'; ctx.shadowColor = '#ba68c8'; ctx.shadowBlur = s * 0.4;
        ctx.beginPath(); ctx.arc(-s * 0.15, -s * 0.5, s * 0.09, 0, Math.PI * 2); ctx.arc(s * 0.15, -s * 0.5, s * 0.09, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.save();
        ctx.rotate(-0.35);
        ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 2.4 * scale; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(s * 0.6, -s * 0.5); ctx.lineTo(s * 0.95, s * 0.7); ctx.stroke();
        ctx.fillStyle = '#ab47bc'; ctx.shadowColor = '#ce93d8'; ctx.shadowBlur = s * 0.5;
        ctx.beginPath(); ctx.arc(s * 0.6, -s * 0.55, s * 0.18, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s * 0.55, -s * 0.6, s * 0.06, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        if (this.summonTimer !== undefined && this.summonTimer < 60) {
            const prog = 1 - this.summonTimer / 60;
            for (let i = 0; i < 6; i++) {
                const a = t * 2 + i * Math.PI / 3;
                const rr = s * 0.8 * (1 - prog * 0.7);
                ctx.fillStyle = `rgba(206,147,216,${0.5 + prog * 0.5})`;
                ctx.beginPath(); ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr - s * 0.1, s * 0.08, 0, Math.PI * 2); ctx.fill();
            }
        }
        ctx.restore();
    }

    drawDummyModel(ctx, t) {
        const s = this.size;
        const u = s / 50;
        const lean = Math.sin(t * 0.6) * 0.02 + (this.hitShake / 5) * Math.sin(frameCount * 0.9) * 0.13;
        ctx.save();
        ctx.rotate(lean);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath(); ctx.ellipse(0, s * 0.95, s * 0.72, s * 0.16, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 6 * u; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-s * 0.05, s * 0.25); ctx.lineTo(-s * 0.4, s * 0.95);
        ctx.moveTo(s * 0.05, s * 0.25); ctx.lineTo(s * 0.4, s * 0.95);
        ctx.stroke();
        ctx.fillStyle = '#795548';
        ctx.fillRect(-s * 0.85, -s * 0.28, s * 1.7, s * 0.24);
        ctx.strokeStyle = '#4e342e'; ctx.lineWidth = 1.6 * u; ctx.strokeRect(-s * 0.85, -s * 0.28, s * 1.7, s * 0.24);
        const bodyGrad = ctx.createLinearGradient(-s * 0.42, 0, s * 0.42, 0);
        bodyGrad.addColorStop(0, '#6d4c41'); bodyGrad.addColorStop(0.5, '#8d6e63'); bodyGrad.addColorStop(1, '#5d4037');
        ctx.fillStyle = bodyGrad;
        ctx.fillRect(-s * 0.42, -s * 0.6, s * 0.84, s * 1.42);
        ctx.strokeStyle = '#4e342e'; ctx.lineWidth = 2.5 * u; ctx.strokeRect(-s * 0.42, -s * 0.6, s * 0.84, s * 1.42);
        ctx.strokeStyle = 'rgba(62,39,35,0.5)'; ctx.lineWidth = 1.2 * u;
        ctx.beginPath();
        ctx.moveTo(-s * 0.2, -s * 0.55); ctx.lineTo(-s * 0.2, s * 0.78);
        ctx.moveTo(s * 0.13, -s * 0.55); ctx.lineTo(s * 0.13, s * 0.78);
        ctx.stroke();
        ctx.strokeStyle = '#c8a24a'; ctx.lineWidth = 3 * u;
        ctx.beginPath();
        ctx.moveTo(-s * 0.42, -s * 0.06); ctx.lineTo(s * 0.42, -s * 0.06);
        ctx.moveTo(-s * 0.42, s * 0.04); ctx.lineTo(s * 0.42, s * 0.04);
        ctx.stroke();
        const rings = [[s * 0.27, '#eceff1'], [s * 0.2, '#e53935'], [s * 0.13, '#eceff1'], [s * 0.06, '#e53935']];
        for (const [r, c] of rings) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, s * 0.2, r, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#d7ccc8';
        ctx.beginPath(); ctx.arc(0, -s * 0.74, s * 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#a1887f'; ctx.lineWidth = 1.5 * u; ctx.stroke();
        ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 3 * u;
        ctx.beginPath(); ctx.moveTo(-s * 0.18, -s * 0.52); ctx.lineTo(s * 0.18, -s * 0.52); ctx.stroke();
        ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 2 * u;
        ctx.beginPath();
        ctx.moveTo(-s * 0.16, -s * 0.8); ctx.lineTo(-s * 0.06, -s * 0.7);
        ctx.moveTo(-s * 0.06, -s * 0.8); ctx.lineTo(-s * 0.16, -s * 0.7);
        ctx.moveTo(s * 0.06, -s * 0.8); ctx.lineTo(s * 0.16, -s * 0.7);
        ctx.moveTo(s * 0.16, -s * 0.8); ctx.lineTo(s * 0.06, -s * 0.7);
        ctx.stroke();
        ctx.lineCap = 'butt';
        ctx.restore();
    }

    draw() {
        if(this.slowEffects.length > 0){
            ctx.save();
            const effect = this.slowEffects[0];
            const ratio = effect.duration / effect.maxDuration;
            const alpha = ratio * 0.45;
            const radius = this.size + 6 * scale * (1 - ratio);
            const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, radius);
            gradient.addColorStop(0, `rgba(3, 169, 244, ${alpha})`);
            gradient.addColorStop(0.7, `rgba(79, 195, 247, ${alpha * 0.6})`);
            gradient.addColorStop(1, `rgba(3, 169, 244, 0)`);
            ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(this.x, this.y, radius, 0, Math.PI * 2); ctx.fill();
            ctx.translate(this.x, this.y); ctx.rotate(frameCount * 0.02);
            ctx.strokeStyle = `rgba(225,245,254,${ratio * 0.7})`; ctx.lineWidth = 1.2 * scale;
            ctx.setLineDash([4 * scale, 4 * scale]);
            ctx.beginPath(); ctx.arc(0, 0, this.size + 2 * scale, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        ctx.save();
        const shakeAmt = this.hitShake > 0.2 ? this.hitShake * scale : 0;
        const shX = shakeAmt ? (Math.random() - 0.5) * shakeAmt : 0;
        const shY = shakeAmt ? (Math.random() - 0.5) * shakeAmt : 0;
        ctx.translate(this.x + shX, this.y + shY);
        const animT = frameCount * 0.16 + this.animPhase;
        const hpRatio = Math.max(0, this.hp / this.maxHp);
        switch (this.type) {
            case 'shield':  this.drawShieldModel(ctx, animT, hpRatio); break;
            case 'fast':    this.drawFastModel(ctx, animT, hpRatio); break;
            case 'strong':  this.drawStrongModel(ctx, animT, hpRatio); break;
            case 'boss':    this.drawBossModel(ctx, animT, hpRatio); break;
            case 'summoner':this.drawSummonerModel(ctx, animT, hpRatio); break;
            case 'dummy':   this.drawDummyModel(ctx, animT); break;
            default:        this.drawNormalModel(ctx, animT, hpRatio); break;
        }
        ctx.restore();

    const healthBarWidth = (this.type === 'boss' || this.type === 'dummy' ? 100 : 30) * scale;
        const healthBarHeight = (this.type === 'boss' || this.type === 'dummy' ? 8 : 5) * scale;
        const healthBarY = this.y - this.size - (12 * scale);

        ctx.fillStyle = '#c0392b';
        ctx.fillRect(this.x - healthBarWidth / 2, healthBarY, healthBarWidth, healthBarHeight);
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(this.x - healthBarWidth / 2, healthBarY, healthBarWidth * (this.hp / this.maxHp), healthBarHeight);

        if (this.shieldHp > 0) {
            const shieldBarY = healthBarY - healthBarHeight - (2 * scale);
            ctx.fillStyle = '#6495ED';
            ctx.fillRect(this.x - healthBarWidth / 2, shieldBarY, healthBarWidth, healthBarHeight);
            ctx.fillStyle = '#00BFFF';
            ctx.fillRect(this.x - healthBarWidth / 2, shieldBarY, healthBarWidth * (this.shieldHp / this.maxShieldHp), healthBarHeight);

            if (shieldIconCanvas) {
                const iconDrawSize = 16 * scale;
                ctx.drawImage(
                    shieldIconCanvas,
                    this.x - iconDrawSize / 2,
                    shieldBarY - iconDrawSize,
                    iconDrawSize,
                    iconDrawSize
                );
            }
        }

        if (this.stunTimer > 0) {
            ctx.save();
            const cy = this.y - this.size - 7 * scale;
            const orbit = frameCount * 0.13;
            for (let i = 0; i < 3; i++) {
                const a = orbit + i * (Math.PI * 2 / 3);
                const px = this.x + Math.cos(a) * 10 * scale;
                const py = cy + Math.sin(a) * 3.5 * scale;
                const depth = 0.6 + 0.4 * ((Math.sin(a) + 1) / 2);
                ctx.save();
                ctx.translate(px, py);
                ctx.scale(depth * scale, depth * scale);
                ctx.globalAlpha = 0.55 + depth * 0.45;
                ctx.fillStyle = '#ffe082'; ctx.strokeStyle = '#f9a825'; ctx.lineWidth = 1;
                ctx.beginPath();
                for (let k = 0; k < 5; k++) {
                    const aa = -Math.PI / 2 + k * (Math.PI * 2 / 5);
                    ctx.lineTo(Math.cos(aa) * 5, Math.sin(aa) * 5);
                    const ab = aa + Math.PI / 5;
                    ctx.lineTo(Math.cos(ab) * 2.2, Math.sin(ab) * 2.2);
                }
                ctx.closePath(); ctx.fill(); ctx.stroke();
                ctx.restore();
            }
            ctx.restore();
        }

        if (this.debuffs.defenseBreak.timer > 0) {
            ctx.save();
            ctx.globalAlpha = Math.min(1, this.debuffs.defenseBreak.timer / 60);
            ctx.shadowColor = '#ce93d8'; ctx.shadowBlur = 6 * scale;
            const d = this.size * 0.55;
            for (const [w, col] of [[3.2, 'rgba(186,104,200,0.7)'], [1.4, '#f3e5f5']]) {
                ctx.strokeStyle = col; ctx.lineWidth = w * scale; ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(this.x - d, this.y - d); ctx.lineTo(this.x + d, this.y + d);
                ctx.moveTo(this.x + d, this.y - d); ctx.lineTo(this.x - d, this.y + d);
                ctx.stroke();
            }
            ctx.strokeStyle = 'rgba(225,190,231,0.6)'; ctx.lineWidth = 1 * scale;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y - d * 0.4); ctx.lineTo(this.x + d * 0.3, this.y - d);
            ctx.moveTo(this.x, this.y + d * 0.4); ctx.lineTo(this.x - d * 0.3, this.y + d);
            ctx.stroke();
            ctx.lineCap = 'butt';
            ctx.restore();
        }

        if (this.debuffs.burn && this.debuffs.burn.timer > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const bs = this.size;
            for (let i = 0; i < 4; i++) {
                const ang = (frameCount * 0.08 + i * Math.PI / 2) % (Math.PI * 2);
                const fx = this.x + Math.cos(ang) * bs * 0.5;
                const fy = this.y + Math.sin(ang) * bs * 0.4 - bs * 0.2;
                const flick = 0.7 + 0.3 * Math.sin(frameCount * 0.6 + i * 1.7);
                const fr = bs * (0.35 + 0.15 * Math.sin(frameCount * 0.4 + i)) * flick;
                const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr);
                fg.addColorStop(0, 'rgba(255,235,150,0.6)');
                fg.addColorStop(0.5, 'rgba(255,120,20,0.4)');
                fg.addColorStop(1, 'rgba(213,0,0,0)');
                ctx.fillStyle = fg;
                ctx.beginPath(); ctx.arc(fx, fy, fr, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }

    const statusIconY = this.y - this.size - (22 * scale);
    const statusIconDrawSize = 14 * scale;

    if (this.iceSealStacks > 0) {
        if (freezeIconCanvas) {
            const iconX = this.x - healthBarWidth / 2;
            const iconY = statusIconY - (statusIconDrawSize / 2);

            ctx.drawImage(freezeIconCanvas, iconX, iconY, statusIconDrawSize, statusIconDrawSize);
        }
    }

        if (this.debuffs.bountyMark.timer > 0) {
            if (bountyMarkIconCanvas) {
                const iconX = (this.x + healthBarWidth / 2) - statusIconDrawSize;
                const iconY = statusIconY - (statusIconDrawSize / 2);

                ctx.drawImage(
                    bountyMarkIconCanvas,
                    iconX,
                    iconY,
                    statusIconDrawSize,
                    statusIconDrawSize
                );
            }
        }

        if (this.frozenTimer > 0) {
            ctx.save();
            const s = this.size * 1.2;
            const pts = [[-s,-s*0.8],[-s*0.5,-s*1.2],[s*0.5,-s*1.2],[s,-s*0.8],[s*0.8,0],[s,s*0.8],[s*0.5,s*1.2],[-s*0.5,s*1.2],[-s,s*0.8],[-s*0.8,0]];
            const grad = ctx.createLinearGradient(this.x - s, this.y - s, this.x + s, this.y + s);
            grad.addColorStop(0, 'rgba(225,245,254,0.85)');
            grad.addColorStop(0.5, 'rgba(129,212,250,0.6)');
            grad.addColorStop(1, 'rgba(2,119,189,0.7)');
            ctx.fillStyle = grad; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2 * scale;
            ctx.beginPath();
            pts.forEach((p, i) => { const x = this.x + p[0], y = this.y + p[1]; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
            ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1 * scale;
            ctx.beginPath();
            ctx.moveTo(this.x - s * 0.5, this.y - s * 0.6); ctx.lineTo(this.x, this.y); ctx.lineTo(this.x + s * 0.4, this.y - s * 0.7);
            ctx.moveTo(this.x, this.y); ctx.lineTo(this.x - s * 0.2, this.y + s * 0.7);
            ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.beginPath(); ctx.ellipse(this.x - s * 0.35, this.y - s * 0.5, s * 0.16, s * 0.4, -0.5, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
    }
}
