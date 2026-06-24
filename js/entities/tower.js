
class Tower {
    constructor(x, y, type) {
        this.id = performance.now() + Math.random();
        this.x = x; this.y = y; this.type = type; this.level = 0;
        this.data = TOWER_DATA[type];
        this.currentTargets = []; this.fireCooldown = 0; this.timeOnTarget = 0;
        this.targetMode = this.type === 'missileSilo' ? 'front' : this.type === 'annihilator' ? 'weakest' : 'closest';
        this.rotation = -Math.PI / 2;
        this.buffs = { speed: 1, range: 1, discount: 1, damage: 1, matrixDamage: 1, matrixSpeed: 1, matrixRange: 0, matrixOverheat: 0 };
        this.animState = { shakeTime: 0, flashTime: 0, spin: 0, recoilTime: 0 };
        this.attackCounter = 0;
        this.totalDamage = 0;
        this.skillUnlockOrder = null;
        this.spawnCooldown = 0;
        this.salvoRemaining = 0;
        this.salvoCooldown = 0;
        this.isOverheating = false;
        this.overheatCooldown = 0;
        this.linkedTowers = [];
        this.recalculateRange();
        this.stunTimer = 0;

        if (this.type === 'gatlingGun') {
            this.totalShotsFired = 0;
            this.rank = 0;
            this.maxRank = 5;
            this.wingTarget = null;
            this.wingRotation = -Math.PI / 2;
        }
        if (this.type === 'musicStand' || this.type === 'electricCore') {
            this.skillCooldown = 0;
            this.skillActiveTimer = 0;
        }
        if (this.type === 'thiefClaw') {
            this.goldStolen = 0;
        }

        if (this.type === 'destroyer') {
            this.destroyerState = 'closed';
            this.activeTimer = 0;
            this.deployDamage = 0;
            this.animState.unfoldProgress = 0;
            this.cooldownWave = 0;
        }

        if (this.type === 'missileSilo') {
            this.animState.openProgress = 0;
            this.animState.isOpening = false;
            this.animState.isClosing = false;
        }

        if (this.type === 'gravityBeacon') {
            this.gravityActivationTimer = 0;
        }

        if (this.type === 'tesla' && this.level === 4) {
            this.damageBuff = 0;
            this.lastAttackTime = 0;
        }

        if (this.type === 'militaryBase') {
            this.soldierDamageMultiplier = 1.0;
        }

        if (this.type === 'pursuit') {
            this.reloadTimer = this.reloadTime || 600;
            this.salvoRemaining = 0;
            this.salvoCooldown = 0;
            this.salvoTargets = [];
            this.pursuitDelayTimer = 0;
            this.overloadActive = false;
            this.overloadMissilesRemaining = 0;
            this.overloadSalvoCooldown = 0;
            this.overloadMissileCount = 0;
            this.overloadIdleTimer = 0;
            this._overloadSmoke = [];
        }

        if (this.type === 'heavyWeapons') {
            this.gatlingRotation = -Math.PI / 2;
            this.missileRotation = -Math.PI / 2;
            this.gatlingSpin = 0;
            this.gatlingSpinSpeed = 0;
            this.gatlingHeat = 0;
            this.missileCooldown = 0;
            this.missileTarget = null;
            this.missileTube = 0;
            this.barrelRecoil = 0;
            this._gatlingSmoke = [];
            this._gatlingFire = [];
            this._missileExhaust = [];
        }

        this.updateStats();
        if (this.type === 'militaryBase') {
            this.spawnCooldown = this.spawnRate;
            if (this.level === 4) {
                this.tankSpawnCooldown = this.tankSpawnRate;
        }
        }
    }
    updateStats() {
        const levelData = this.data.levels[this.level];
        for (const key in levelData) this[key] = levelData[key];
        this.recalculateRange();
    }
    applyStun(seconds) {
        this.stunTimer = Math.max(this.stunTimer, seconds * 60);
    }
    recalculateRange() {
        const baseRange = this.range || 0;
        const totalRange = (baseRange + this.buffs.matrixRange) * this.buffs.range;
        this.rangePixels = totalRange * TILE_SIZE;
        this.rangePixelsSq = this.rangePixels * this.rangePixels;
    }
    upgrade(options = {}) {
        if (this.level >= this.data.levels.length - 1) {
            return false;
        }

        const nextLevelData = this.data.levels[this.level + 1];
        const finalCost = Math.floor(nextLevelData.cost * this.buffs.discount);

        if (money < finalCost) {
            return false;
        }

        if (this.type === 'thiefClaw' && this.level === 3) {
            if (this.goldStolen < 1500) {
                return false;
            }
        }

        if (this.type === 'pursuit' && this.level === 3) {
            const lv4Count = towers.filter(t => t.type === 'pursuit' && t.level >= 3).length;
            if (lv4Count < 3) {
                return false;
            }
        }

        const isExUpgrade = (this.level === 3 && (this.data.exDescription || (['arrow', 'cannon', 'blast', 'magic', 'slow', 'tesla', 'thiefClaw', 'gatlingGun', 'annihilator', 'militaryBase', 'missileSilo', 'sun', 'spotlight', 'pursuit', 'boomerang'].includes(this.type))));
        if (isExUpgrade && this.data.exLimit) {
            const exCount = towers.filter(t => t.type === this.type && t.level === 4).length;
            if (exCount >= this.data.exLimit) {
                return false;
            }
        }

        money -= finalCost;
        this.level++;
        this.updateStats();
        markStrategicStateDirty();

        if (this.type === 'militaryBase' && this.level === 4) {
            this.tankSpawnCooldown = this.tankSpawnRate;
        }

        if (this.type === 'tesla' && this.level === 4) {
            this.damageBuff = 0;
            this.lastAttackTime = 0;
        }

        updateTowerInfoPanel();
        markUiDirty();
        return true;
    }
    sell() {
        if (this.type === 'destroyer') {
            return Math.floor(this.data.levels[0].cost * 0.7);
        }
        let totalCost = this.data.levels[0].cost;
        for (let i = 1; i <= this.level; i++) totalCost += this.data.levels[i].cost;
        return Math.floor(totalCost * 0.7);
    }
    findTarget() {
        const candidates = [];
        for (const enemy of enemies) {
            const distSq = (this.x - enemy.x) ** 2 + (this.y - enemy.y) ** 2;
            if (enemy.hp > 0 && distSq < this.rangePixelsSq) candidates.push({ enemy, distSq, progress: getEnemyPathProgress(enemy) });
        }
        if (candidates.length === 0) {
            this.currentTargets = [];
            return;
        }

        const mode = supportsTargetSelection(this) ? this.targetMode : 'closest';
        let selected;
        if (mode === 'random') {
            selected = candidates[Math.floor(gameRandom() * candidates.length)].enemy;
        } else {
            selected = candidates.reduce((best, item) => {
                if (!best) return item;
                if (mode === 'farthest') return item.distSq > best.distSq ? item : best;
                if (mode === 'strongest') return item.enemy.hp > best.enemy.hp ? item : best;
                if (mode === 'weakest') return item.enemy.hp < best.enemy.hp ? item : best;
                if (mode === 'front') return item.progress > best.progress ? item : best;
                return item.distSq < best.distSq ? item : best;
            }, null).enemy;
        }
        this.currentTargets = selected ? [selected] : [];
    }
    findMultiTargets() {
        const validEnemies = [];
        for (const e of enemies) {
            const distSq = (this.x - e.x)**2 + (this.y - e.y)**2;
            if (distSq < this.rangePixelsSq) {
                validEnemies.push(e);
            }
        }
        validEnemies.sort((a, b) => b.pathIndex - a.pathIndex);
        this.currentTargets = validEnemies.slice(0, this.targets);
    }
    getPursuitSharedEnemies() {
        const collected = [];
        const seen = new Set();
        for (const e of enemies) {
            if (e.hp <= 0) continue;
            if ((this.x - e.x) ** 2 + (this.y - e.y) ** 2 < this.rangePixelsSq) {
                seen.add(e); collected.push(e);
            }
        }
        if (this.sharedVision) {
            for (const t of towers) {
                if (t.type !== 'pursuit' || t === this) continue;
                for (const e of enemies) {
                    if (e.hp <= 0 || seen.has(e)) continue;
                    if ((t.x - e.x) ** 2 + (t.y - e.y) ** 2 < t.rangePixelsSq) {
                        seen.add(e); collected.push(e);
                    }
                }
            }
        }
        collected.sort((a, b) => b.pathIndex - a.pathIndex);
        return collected;
    }
    startPursuitSalvo() {
        const available = this.getPursuitSharedEnemies();
        if (available.length === 0) return;
        this.salvoTargets = [];
        for (let i = 0; i < this.missileCount; i++) {
            this.salvoTargets.push(available[i % available.length]);
        }
        this.salvoRemaining = this.missileCount;
        this.salvoCooldown = 0;
    }
    update() {
        if (this.type === 'musicStand' || this.type === 'electricCore' || this.type === 'pursuit') {
            if (this.skillCooldown > 0) this.skillCooldown--;
            if (this.skillActiveTimer > 0) {
                this.skillActiveTimer--;
                if (this.skillActiveTimer === 0) markStrategicStateDirty();
            }
        }
        if (this.stunTimer > 0) {
            this.stunTimer--;
            if (frameCount % 4 === 0) {
                effects.push(new TowerStunEffect(this.x, this.y));
            }
            return;
        }

        if (this.animState.shakeTime > 0) this.animState.shakeTime--;
        if (this.animState.flashTime > 0) this.animState.flashTime--;
        if (this.animState.recoilTime > 0) this.animState.recoilTime--;

        if (this.type === 'tesla' && this.level === 4) {
            if (this.damageBuff > 0 && frameCount - this.lastAttackTime > 120) {
                this.damageBuff = 0;
            }
        }

        if (this.type === 'missileSilo') {
            if (this.animState.isOpening) {
                this.animState.openProgress = Math.min(1, this.animState.openProgress + 0.02);
                if (this.animState.openProgress === 1) {
                    this.animState.isOpening = false;
                    if (this.level < 4) {
                        if (this.currentTargets[0]) {
                            missileProjectiles.push(new MissileProjectile(this, this.currentTargets[0]));
                        }
                        scheduleSimulationEvent(30, () => { if (towers.includes(this)) this.animState.isClosing = true; });
                    }
                }
            } else if (this.animState.isClosing) {
                this.animState.openProgress = Math.max(0, this.animState.openProgress - 0.01);
                if (this.animState.openProgress === 0) {
                    this.animState.isClosing = false;
                }
            }
        }

        if (this.type === 'destroyer') {
            if (this.destroyerState === 'opening') {
                this.animState.unfoldProgress += 0.02;
                if (this.animState.unfoldProgress >= 1) {
                    this.animState.unfoldProgress = 1;
                    this.destroyerState = 'active';
                }
            } else if (this.destroyerState === 'active') {
                this.activeTimer--;
                if (this.activeTimer <= 0) {
                    this.destroyerState = 'closing';
                    if (!isTestMode) {
                        this.cooldownWave = wave + 2;
                    }
                }
                if(this.fireCooldown > 0) this.fireCooldown--;
                if (this.fireCooldown <= 0) {
                    const primaryTarget = this.currentTargets[0];
                    if (!primaryTarget || primaryTarget.hp <= 0 || (this.x - primaryTarget.x)**2 + (this.y - primaryTarget.y)**2 > this.rangePixelsSq) {
                        this.findTarget();
                    }
                    if (supportsTargetSelection(this)) this.findTarget();
                    if (this.currentTargets.length > 0) {
                        this.fireCooldown = this.fireRate;
                        this.fire();
                    }
                }
            } else if (this.destroyerState === 'closing') {
                 this.animState.unfoldProgress -= 0.02;
                 if (this.animState.unfoldProgress <= 0) {
                    this.animState.unfoldProgress = 0;
                    this.destroyerState = 'closed';
                 }
            }
            if (this.currentTargets.length > 0) {
                const primaryTarget = this.currentTargets[0];
                const targetAngle = Math.atan2(primaryTarget.y - this.y, primaryTarget.x - this.x);
                let diff = targetAngle - this.rotation;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                this.rotation += diff * 0.1;
            }
            return;
        }

        if (['electricCore', 'musicStand', 'militaryBase', 'battery', 'gravityBeacon', 'tesla','shrineOfMerit'].includes(this.type) || (this.type === 'magic' && this.level === 4)) {
            this.animState.spin += 0.01;
        }
        if (this.type === 'shrineOfMerit') {
            this.animState.spin += 0.005;
        }
        if (this.type === 'gamma') {
            this.animState.spin += 0.002;
        }
        if (this.type === 'boomerang') {
            this.animState.spin += (this.level === 4 ? 0.05 : 0.035);
        }

        if (['electricCore', 'musicStand', 'battery', 'shrineOfMerit'].includes(this.type)) return;

        if (this.type === 'militaryBase') {
            if(this.spawnCooldown > 0) this.spawnCooldown--;
            if (this.spawnCooldown <= 0) {
                this.spawnCooldown = this.spawnRate;
                this.spawnSoldiers();
            }
            if (this.level === 4) {
                if (this.tankSpawnCooldown > 0) this.tankSpawnCooldown--;
                if (this.tankSpawnCooldown <= 0) {
                    this.tankSpawnCooldown = this.tankSpawnRate;
                    this.spawnTanks();
        }
    }
            return;
        }

        if (this.type === 'matrix' && this.isOverheating) {
            this.overheatCooldown--;
            if (this.overheatCooldown <= 0) {
                this.isOverheating = false;
            }
            return;
        }

        if (this.type === 'gatlingGun') {
            if (this.level === 4 && this.rank >= 4) {
                let wingTarget = null;
                for (const e of enemies) {
                    if ((this.x - e.x)**2 + (this.y - e.y)**2 < this.rangePixelsSq) {
                        wingTarget = e;
                        break;
                    }
                }
                this.wingTarget = wingTarget;

                if (this.wingTarget) {
                    const targetAngle = Math.atan2(this.wingTarget.y - this.y, this.wingTarget.x - this.x);
                    let diff = targetAngle - this.wingRotation;
                    while (diff < -Math.PI) diff += Math.PI * 2;
                    while (diff > Math.PI) diff -= Math.PI * 2;
                    this.wingRotation += diff * 0.1;
                }
            }
        }

        if (this.type === 'sun') {
            this.animState.spin += 0.02;
            let target = this.currentTargets[0];
            const shouldRetarget = supportsTargetSelection(this) && (this.targetMode !== 'random' || frameCount % 30 === 0);
            if (shouldRetarget) {
                this.findTarget();
                const nextTarget = this.currentTargets[0];
                if (nextTarget !== target) this.timeOnTarget = 0;
                target = nextTarget;
            }
            if (!target || target.hp <= 0 || (this.x - target.x)**2 + (this.y - target.y)**2 > this.rangePixelsSq) {
                this.findTarget();
                target = this.currentTargets[0];
                this.timeOnTarget = 0;
            }

            if (target) {
                this.timeOnTarget = Math.min(this.timeOnTarget + 1, this.rampUpTime);
                const damageScale = this.timeOnTarget / this.rampUpTime;
                const currentDamage = (this.minDamage + (this.maxDamage - this.minDamage) * damageScale) * this.buffs.damage;
                target.takeDamage(currentDamage / 60, this);
                if (this.level === 4) {
                    const heatFieldRadiusSq = ((1 + (this.heatFieldRangeBonus || 0)) * TILE_SIZE) ** 2;
                    const heatDamageRadiusSq = ((this.heatDamageRadius || 1) * TILE_SIZE) ** 2;
                    const heatShare = 0.1 + 0.3 * Math.min(1, this.timeOnTarget / 300);
                    const sharedPerFrame = (currentDamage / 60) * heatShare;
                    for (const e of enemies) {
                        if (e.hp <= 0) continue;
                        const targetDistanceSq = (target.x - e.x) ** 2 + (target.y - e.y) ** 2;
                        if (targetDistanceSq < heatFieldRadiusSq) {
                            e.heatedZoneTimer = 8;
                            if (e !== target && targetDistanceSq < heatDamageRadiusSq) e.takeDamage(sharedPerFrame, this, { areaDamage: true });
                        }
                    }
                    if (!this._heatFlames) { this._heatFlames = []; this._heatSmoke = []; }
                    const hr = (1 + (this.heatFieldRangeBonus || 0)) * TILE_SIZE;
                    for (let k = 0; k < 2; k++) {
                        const ang = effectRandom() * Math.PI * 2;
                        const rr = Math.sqrt(effectRandom()) * hr * 0.9;
                        this._heatFlames.push({
                            x: target.x + Math.cos(ang) * rr, y: target.y + Math.sin(ang) * rr,
                            vx: (effectRandom() - 0.5) * 0.4 * scale, vy: -(0.5 + effectRandom() * 1.2) * scale,
                            life: 18 + effectRandom() * 12, maxLife: 30,
                            size: (2 + effectRandom() * 3) * scale, seed: effectRandom() * 6.283
                        });
                    }
                    if (frameCount % 4 === 0) {
                        const ang = effectRandom() * Math.PI * 2;
                        const rr = Math.sqrt(effectRandom()) * hr * 0.65;
                        this._heatSmoke.push({
                            x: target.x + Math.cos(ang) * rr, y: target.y + Math.sin(ang) * rr,
                            vx: (effectRandom() - 0.5) * 0.5 * scale, vy: -(0.6 + effectRandom() * 0.8) * scale,
                            life: 38 + effectRandom() * 28, maxLife: 66, size: (4 + effectRandom() * 4) * scale
                        });
                    }
                    for (const f of this._heatFlames) { f.x += f.vx; f.y += f.vy; f.vy *= 0.96; f.life--; }
                    for (const sm of this._heatSmoke) { sm.x += sm.vx; sm.y += sm.vy; sm.vy *= 0.98; sm.size += 0.15 * scale; sm.life--; }
                    this._heatFlames = this._heatFlames.filter(f => f.life > 0);
                    this._heatSmoke = this._heatSmoke.filter(sm => sm.life > 0);
                }
            } else {
                this.timeOnTarget = 0;
                if (this._heatFlames) { this._heatFlames.length = 0; this._heatSmoke.length = 0; }
            }
        } else if (this.type === 'pursuit') {
            this.animState.spin += 0.02;
            if (this.overloadActive) {
                if (this.overloadSalvoCooldown > 0) this.overloadSalvoCooldown--;
                if (this.overloadSalvoCooldown <= 0) {
                    const available = this.getPursuitSharedEnemies();
                    if (available.length > 0) {
                        this.salvoTargets = available.slice();
                        this.fire();
                        this.overloadMissilesRemaining--;
                        this.overloadMissileCount++;
                        this.overloadIdleTimer = 0;
                        for (let k = 0; k < 5; k++) {
                            const sp = (1 + effectRandom() * 1.6) * scale;
                            this._overloadSmoke.push({
                                x: (effectRandom() - 0.5) * 16 * scale,
                                y: -15 * scale + (effectRandom() - 0.5) * 6 * scale,
                                vx: (effectRandom() - 0.5) * sp * 0.4,
                                vy: -(0.8 + effectRandom() * 1.4) * scale,
                                life: 34 + effectRandom() * 26, maxLife: 60,
                                size: (3 + effectRandom() * 4) * scale
                            });
                        }
                        if (this.overloadMissileCount % 10 === 0) {
                            for (const t of towers) {
                                if (t.type === 'pursuit' && t !== this && !t.overloadActive && t.salvoRemaining === 0 && t.reloadTimer > 0) {
                                    t.reloadTimer = Math.max(0, t.reloadTimer - 120);
                                }
                            }
                            effects.push(new OverloadReloadPulseEffect(this.x, this.y));
                        }
                        if (this.overloadMissilesRemaining <= 0) {
                            this.overloadActive = false;
                            this.salvoRemaining = 0;
                            this.salvoTargets = [];
                            this.pursuitDelayTimer = 0;
                            this.reloadTimer = 840;
                            markStrategicStateDirty();
                        } else {
                            this.overloadSalvoCooldown = 8;
                        }
                    } else {
                        this.overloadIdleTimer++;
                        if (this.overloadIdleTimer > 300) {
                            this.overloadActive = false;
                            this.salvoRemaining = 0;
                            this.salvoTargets = [];
                            this.pursuitDelayTimer = 0;
                            this.reloadTimer = 840;
                            markStrategicStateDirty();
                        }
                    }
                }
                if (frameCount % 60 === 0) SFX.play('overloadAlarm');
                for (const sm of this._overloadSmoke) { sm.x += sm.vx; sm.y += sm.vy; sm.vy *= 0.97; sm.size += 0.12 * scale; sm.life--; }
                this._overloadSmoke = this._overloadSmoke.filter(sm => sm.life > 0);
            } else if (this.salvoRemaining === 0) {
                if (this.reloadTimer > 0) {
                    this.reloadTimer--;
                    this.pursuitDelayTimer = 0;
                } else {
                    const available = this.getPursuitSharedEnemies();
                    if (available.length > 0) {
                        this.pursuitDelayTimer++;
                        if (this.pursuitDelayTimer >= 48) {
                            this.pursuitDelayTimer = 0;
                            this.startPursuitSalvo();
                        }
                    } else {
                        this.pursuitDelayTimer = 0;
                    }
                }
            } else {
                if (this.salvoCooldown > 0) this.salvoCooldown--;
                if (this.salvoCooldown <= 0) {
                    this.fire();
                    this.salvoRemaining--;
                    if (this.salvoRemaining > 0) {
                        this.salvoCooldown = 8;
                    } else {
                        this.reloadTimer = this.reloadTime;
                        this.salvoTargets = [];
                        this.pursuitDelayTimer = 0;
                        if (this.reloadSync) {
                            for (const t of towers) {
                                if (t.type === 'pursuit' && t !== this && t.salvoRemaining === 0 && t.reloadTimer > 0) {
                                    t.reloadTimer = Math.max(0, t.reloadTimer - 90);
                                }
                            }
                        }
                    }
                }
            }
        } else if (this.type === 'spotlight') {
            this.animState.spin += 0.015;
            let target = this.currentTargets[0];
            const shouldRetarget = supportsTargetSelection(this) && (this.targetMode !== 'random' || frameCount % 30 === 0);
            if (shouldRetarget) {
                this.findTarget();
                const nextTarget = this.currentTargets[0];
                if (nextTarget !== target) this.fireCooldown = 0;
                target = nextTarget;
            }
            if (!target || target.hp <= 0 || (this.x - target.x)**2 + (this.y - target.y)**2 > this.rangePixelsSq) {
                this.findTarget();
                target = this.currentTargets[0];
                this.fireCooldown = 0;
            }
            if (target) {
                if (this.fireCooldown > 0) this.fireCooldown--;
                if (this.fireCooldown <= 0) {
                    this.fireCooldown = this.fireRate / (this.buffs.speed * this.buffs.matrixSpeed);
                    this.fire();
                }
                const targetAngle = Math.atan2(target.y - this.y, target.x - this.x);
                let diff = targetAngle - this.rotation;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                this.rotation += diff * 0.12;

                if (this.level === 4) {
                    const distToTarget = Math.hypot(target.x - this.x, target.y - this.y) || 1;
                    const halfAngle = Math.atan2(this.beamSpread * TILE_SIZE, distToTarget);
                    const beamLengthSq = (30 * TILE_SIZE) ** 2;
                    for (const enemy of enemies) {
                        if (enemy.hp <= 0) continue;
                        const dx = enemy.x - this.x, dy = enemy.y - this.y;
                        if (dx*dx + dy*dy > beamLengthSq) continue;
                        const enemyAngle = Math.atan2(dy, dx);
                        let angleDiff = Math.abs(enemyAngle - targetAngle);
                        if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
                        if (angleDiff <= halfAngle) {
                            enemy.spotlitCritTimer = 3;
                        }
                    }
                }
            } else {
                this.fireCooldown = 0;
            }
        } else if (this.type === 'heavyWeapons') {
            let target = this.currentTargets[0];
            const shouldRetarget = supportsTargetSelection(this) && (this.targetMode !== 'random' || frameCount % 30 === 0);
            if (shouldRetarget) {
                this.findTarget();
                target = this.currentTargets[0];
            }
            if (!target || target.hp <= 0 || (this.x - target.x) ** 2 + (this.y - target.y) ** 2 > this.rangePixelsSq) {
                this.findTarget();
                target = this.currentTargets[0];
            }
            if (this.fireCooldown > 0) this.fireCooldown--;
            if (target) {
                const aim = Math.atan2(target.y - this.y, target.x - this.x);
                let diff = aim - this.gatlingRotation;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                this.gatlingRotation += diff * 0.2;
                if (this.fireCooldown <= 0) {
                    this.fireCooldown = this.fireRate / (this.buffs.speed * this.buffs.matrixSpeed);
                    this.fireHeavyGatling(target);
                }
            }
            const spinning = this.gatlingHeat > 0.05;
            this.gatlingSpinSpeed += ((spinning ? 0.9 : 0) - this.gatlingSpinSpeed) * 0.15;
            this.gatlingSpin += this.gatlingSpinSpeed;
            this.gatlingHeat = Math.max(0, this.gatlingHeat - 0.06);
            if (this.barrelRecoil > 0) this.barrelRecoil--;

            if (this.missileDamage) {
                const missileRangeSq = (this.rangePixels + 3 * TILE_SIZE) ** 2;
                let best = null, bestHp = -1;
                for (const e of enemies) {
                    if (e.hp <= 0) continue;
                    const dSq = (this.x - e.x) ** 2 + (this.y - e.y) ** 2;
                    if (dSq < missileRangeSq && e.hp > bestHp) { best = e; bestHp = e.hp; }
                }
                this.missileTarget = (best && best.hp > 0) ? best : null;
                if (this.missileTarget) {
                    const aim = Math.atan2(this.missileTarget.y - this.y, this.missileTarget.x - this.x);
                    let diff = aim - this.missileRotation;
                    while (diff < -Math.PI) diff += Math.PI * 2;
                    while (diff > Math.PI) diff -= Math.PI * 2;
                    this.missileRotation += diff * 0.12;
                }
                if (this.missileCooldown > 0) this.missileCooldown--;
                if (this.missileCooldown <= 0 && this.missileTarget) {
                    this.missileCooldown = this.missileFireRate;
                    this.fireHeavyMissile(this.missileTarget);
                }
            } else {
                this.missileTarget = null;
            }

            for (const p of this._gatlingSmoke) { p.x += p.vx; p.y += p.vy; p.vy *= 0.98; p.size += 0.12 * scale; p.life--; }
            this._gatlingSmoke = this._gatlingSmoke.filter(p => p.life > 0);
            for (const p of this._gatlingFire) { p.x += p.vx; p.y += p.vy; p.life--; }
            this._gatlingFire = this._gatlingFire.filter(p => p.life > 0);
            for (const p of this._missileExhaust) { p.x += p.vx; p.y += p.vy; p.vx *= 0.92; p.vy *= 0.92; p.size += 0.1 * scale; p.life--; }
            this._missileExhaust = this._missileExhaust.filter(p => p.life > 0);
        } else {
            if(this.fireCooldown > 0) this.fireCooldown--;
                if (this.salvoRemaining > 0) {
                if (this.salvoCooldown > 0) {
                    this.salvoCooldown--;
                }
                if (this.salvoCooldown <= 0) {
                    this.fire();
                    this.salvoRemaining--;
                 if (this.salvoRemaining > 0) {
                    this.salvoCooldown = this.salvoInterval;
            }
        }
    }
            else if (this.fireCooldown <= 0) {
                if (this.type === 'gatlingGun') {
                    this.fire();
                } else {
                    if (this.type === 'tesla') {
                        this.findMultiTargets();
                    } else if (this.type === 'gravityBeacon') {
                        let hasEnemyInRange = false;
                        for (const e of enemies) {
                            if ((this.x - e.x)**2 + (this.y - e.y)**2 < this.rangePixelsSq) { hasEnemyInRange = true; break; }
                        }
                        if (hasEnemyInRange) {
                            if (this.gravityActivationTimer < 30) {
                                this.gravityActivationTimer++;
                            }
                            if (this.gravityActivationTimer >= 30) {
                                this.fireCooldown = this.fireRate / (this.buffs.speed * this.buffs.matrixSpeed);
                                this.fire();
                                this.gravityActivationTimer = 0;
                            }
                        } else {
                            this.gravityActivationTimer = 0;
                        }
                    } else if (!['slow', 'missileSilo'].includes(this.type)) {
                        const primaryTarget = this.currentTargets[0];
                        if (!primaryTarget || primaryTarget.hp <= 0 || (this.x - primaryTarget.x)**2 + (this.y - primaryTarget.y)**2 > this.rangePixelsSq) {
                           this.findTarget();
                        }
                    } else if (this.type === 'missileSilo') {
                        this.findTarget();
                    }
                    if (supportsTargetSelection(this)) this.findTarget();
                    if (this.type === 'slow' || this.currentTargets.length > 0) {
                        this.fireCooldown = this.fireRate / (this.buffs.speed * this.buffs.matrixSpeed);
                        this.fire();
                    }
                }
            }
        }

        if (this.currentTargets.length > 0 && !['gatlingGun', 'magic', 'slow', 'tesla', 'missileSilo', 'gravityBeacon', 'spotlight', 'pursuit', 'heavyWeapons', 'boomerang'].includes(this.type) && !(this.type === 'magic' && this.level === 4)) {
            const primaryTarget = this.currentTargets[0];
            const targetAngle = Math.atan2(primaryTarget.y - this.y, primaryTarget.x - this.x);
            let diff = targetAngle - this.rotation;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            this.rotation += diff * 0.1;
        }
    }
    spawnSoldiers() {
        const baseHp = wave > 0 ? new Enemy(wave, 'normal').maxHp : 35;
        for (let i = 0; i < this.spawnCount; i++) {
            scheduleSimulationEvent(i * 24, () => {
                if (towers.includes(this) && path.length > 0) {
                    const offsetX = (gameRandom() - 0.5) * TILE_SIZE;
                    const offsetY = (gameRandom() - 0.5) * TILE_SIZE;
                    soldiers.push(new Soldier(this.x + offsetX, this.y + offsetY, this, baseHp));
                }
            });
        }
    }
    spawnTanks() {
    const baseHp = wave > 0 ? new Enemy(wave, 'normal').maxHp : 35;
    for (let i = 0; i < this.tankSpawnCount; i++) {
        scheduleSimulationEvent(i * 102, () => {
            if (towers.includes(this) && path.length > 0) {
                const offsetX = (gameRandom() - 0.5) * TILE_SIZE;
                const offsetY = (gameRandom() - 0.5) * TILE_SIZE;
                tanks.push(new Tank(this.x + offsetX, this.y + offsetY, this, baseHp));
            }
        });
    }
    }
    fireHeavyGatling(target) {
        SFX.tower('heavyWeapons');
        this.gatlingHeat = 1;
        this.barrelRecoil = 4;
        this.animState.shakeTime = 3;
        const muzzle = 40 * scale;
        const perp = this.gatlingRotation + Math.PI / 2;
        const off = (effectRandom() - 0.5) * 12 * scale;
        const jit = (effectRandom() - 0.5) * 6 * scale;
        const mx = this.x + Math.cos(this.gatlingRotation) * (muzzle + jit) + Math.cos(perp) * off;
        const my = this.y + Math.sin(this.gatlingRotation) * (muzzle + jit) + Math.sin(perp) * off;
        projectiles.push(new Projectile(mx, my, target, this));
        for (let i = 0; i < 2; i++) {
            const fa = this.gatlingRotation + (effectRandom() - 0.5) * 0.5;
            const sp = (2 + effectRandom() * 2.5) * scale;
            this._gatlingFire.push({ x: mx, y: my, vx: Math.cos(fa) * sp, vy: Math.sin(fa) * sp, life: 5 + effectRandom() * 4, maxLife: 9, size: (3 + effectRandom() * 3) * scale });
        }
        if (frameCount % 2 === 0) {
            const sa = this.gatlingRotation + (effectRandom() - 0.5) * 0.8;
            const sp = (0.6 + effectRandom() * 1.0) * scale;
            this._gatlingSmoke.push({ x: mx, y: my, vx: Math.cos(sa) * sp, vy: Math.sin(sa) * sp - 0.2 * scale, life: 22 + effectRandom() * 18, maxLife: 40, size: (3 + effectRandom() * 3) * scale });
        }
    }
    fireHeavyMissile(target) {
        missileProjectiles.push(new HeavyMissile(this, target));
        this.missileTube = (this.missileTube + 1) % 6;
        this.animState.shakeTime = 4;
        const back = this.missileRotation + Math.PI;
        const podX = this.x + Math.cos(this.missileRotation) * 6 * scale;
        const podY = this.y + Math.sin(this.missileRotation) * 6 * scale;
        for (let i = 0; i < 7; i++) {
            const ba = back + (effectRandom() - 0.5) * 0.7;
            const sp = (1.5 + effectRandom() * 2.5) * scale;
            this._missileExhaust.push({ x: podX, y: podY, vx: Math.cos(ba) * sp, vy: Math.sin(ba) * sp, life: 16 + effectRandom() * 14, maxLife: 30, size: (3 + effectRandom() * 3) * scale });
        }
    }
    fire() {
        this.attackCounter = (this.attackCounter || 0) + 1;
        if (this.type !== 'gatlingGun') SFX.tower(this.type);

        let specialType = null;
        if (this.type === 'arrow' && this.level === 4) {
            if (this.attackCounter % this.specialSignalRate === 0) {
                specialType = 'arrowSignal';
            } else if (this.attackCounter % this.specialAttackRate === 0) {
                specialType = 'arrowExplosive';
            }
            if (this.attackCounter >= this.specialSignalRate) this.attackCounter = 0;
        } else if (this.type === 'cannon' && this.level === 4 && this.attackCounter >= this.specialAttackRate) {
            this.attackCounter = 0;
            const target = this.currentTargets[0];
            if (target) {
                effects.push(new LaserEffect(this, target));
                const finalDamage = this.damage * this.buffs.matrixDamage * this.buffs.damage;
                target.takeDamage(finalDamage, this);
                if (target.type === 'boss') {
                    target.takeDamage(finalDamage * 5, this);
                } else {
                    const percentDamage = target.hp * this.specialPercentDamage;
                    target.takeDamage(percentDamage, this);
                }
            }
            this.animState.recoilTime = 10;
            return;
        }

        if (this.type === 'arrow') {
            projectiles.push(new Projectile(this.x, this.y, this.currentTargets[0], this, specialType));
            this.animState.shakeTime = 10;
            return;
        }
        if (this.type === 'cannon') {
            projectiles.push(new Projectile(this.x, this.y, this.currentTargets[0], this, null));
            this.animState.recoilTime = 10;
            return;
        }

        switch(this.type) {
            case 'annihilator': {
                const target = this.currentTargets[0];
                if (!target) return;

                if (this.level === 4) {
                    let damageMultiplier = 1.0;
                    const hpRatio = target.hp / target.maxHp;

                    if (hpRatio <= 0.7) {
                        damageMultiplier = 1.6;
                    }

                    const finalDamage = this.damage * damageMultiplier * this.buffs.matrixDamage * this.buffs.damage;
                    target.takeDamage(finalDamage, this);

                    effects.push(new SteamEffect(this.x, this.y, this.rotation));
                    effects.push(new DarkLaserEffect(this, target));
                    this.animState.recoilTime = 20;
                    this.animState.shakeTime = 8;
                }
                else {
                    let damageMultiplier = 1.0;
                    const hpRatio = target.hp / target.maxHp;
                    if (target.type !== 'boss') {
                        if (hpRatio > 0.6) damageMultiplier = 0.5;
                        else if (hpRatio >= 0.3) damageMultiplier = 1.5;
                        else damageMultiplier = 2.0;
                    }
                    const finalDamage = this.damage * damageMultiplier * this.buffs.matrixDamage * this.buffs.damage;
                    target.takeDamage(finalDamage, this);
                    effects.push(new AnnihilatorBeamEffect(this, target));
                    this.animState.recoilTime = 15;
                    this.animState.shakeTime = 5;
                }
                break;
            }
            case 'gamma': {
                this.animState.recoilTime = 20;
                const mainTarget = this.currentTargets[0];
                if (!mainTarget) return;

                const baseDamage = this.damage * this.buffs.damage;
                const mainKinds = mainTarget.getDebuffKinds();
                mainTarget.takeDamage(baseDamage * (1 + 0.1 * mainKinds.length), this);
                effects.push(new LaserEffect(this, mainTarget, '#FF8A80', 15));

                const chainRadiusPixelsSq = (this.chainRadius * TILE_SIZE) ** 2;
                const secondaryTargets = [];
                for(const e of enemies) {
                    if (e !== mainTarget && e.hp > 0 && (mainTarget.x - e.x)**2 + (mainTarget.y - e.y)**2 < chainRadiusPixelsSq) {
                        secondaryTargets.push(e);
                        if (secondaryTargets.length >= this.chainTargets) break;
                    }
                }

                if (secondaryTargets.length > 0) {
                    secondaryTargets.forEach(secondaryTarget => {
                        secondaryTarget.syncDebuffsFrom(mainTarget);
                        const kinds = secondaryTarget.getDebuffKinds();
                        const chainDamage = baseDamage * 0.9 * (1 + 0.1 * kinds.length);
                        secondaryTarget.takeDamage(chainDamage, this, { areaDamage: true });
                    });
                    effects.push(new GammaRayEffect(mainTarget, secondaryTargets));
                }
                break;
            }
            case 'gravityBeacon': {
                effects.push(new GravityPulseEffect(this.x, this.y, this.rangePixels));
                let gravityHitAny = false;
                for (const enemy of enemies) {
                    if ((this.x - enemy.x)**2 + (this.y - enemy.y)**2 < this.rangePixelsSq) {
                        let pushDistance = this.pushback * TILE_SIZE;
                        if (enemy.type === 'boss') {
                            pushDistance = 0.8 * TILE_SIZE;
                        }
                        enemy.pushBack(pushDistance);
                        gravityHitAny = true;
                    }
                }
                if (gravityHitAny) SFX.play('gravity');
                break;
            }
            case 'missileSilo':
                if (this.level === 4) {
                    if (this.salvoRemaining === 0) {
                        const potentialTargets = enemies
                            .filter(e => (this.x - e.x)**2 + (this.y - e.y)**2 < this.rangePixelsSq)
                            .sort((a, b) => b.pathIndex - a.pathIndex);

                        this.currentTargets = [];
                        const targetSet = new Set();
                        for (let i = 0; i < this.salvoCount; i++) {
                            if (potentialTargets.length > 0) {
                                const target = potentialTargets[i % potentialTargets.length];
                                this.currentTargets.push(target);
                            }
                        }

                        this.salvoRemaining = this.salvoCount;
                        this.salvoCooldown = 0;

                        if (!this.animState.isOpening && this.animState.openProgress === 0) {
                            this.animState.isOpening = true;
                        }

                        return;
                    }

                    const targetForThisShot = this.currentTargets.shift();
                    if (targetForThisShot) {
                        missileProjectiles.push(new MissileProjectile(this, targetForThisShot));
                    }

                    if (this.salvoRemaining === 1) {
                        scheduleSimulationEvent(60, () => { if (towers.includes(this)) this.animState.isClosing = true; });
                    }
                }
                else {
                    if (!this.animState.isOpening && !this.animState.isClosing && this.animState.openProgress === 0) {
                        this.animState.isOpening = true;
                    }
                }
                break;
            case 'destroyer': {
                const target = this.currentTargets[0];
                if (target) {
                    effects.push(new DestroyerBeamEffect(this, target));
                    const p1 = { x: this.x, y: this.y };
                    const p2 = { x: target.x, y: target.y };
                    for (const enemy of enemies) {
                        const p3 = { x: enemy.x, y: enemy.y };
                        const radius = enemy.size;
                        const lenSq = (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2;
                        if (lenSq === 0) continue;
                        let t = ((p3.x - p1.x) * (p2.x - p1.x) + (p3.y - p1.y) * (p2.y - p1.y)) / lenSq;
                        t = Math.max(0, Math.min(1, t));
                        const closestPoint = {
                            x: p1.x + t * (p2.x - p1.x),
                            y: p1.y + t * (p2.y - p1.y)
                        };
                        const distSq = (p3.x - closestPoint.x) ** 2 + (p3.y - closestPoint.y) ** 2;
                        if (distSq < radius ** 2) {
                            enemy.takeDamage(this.deployDamage, this, { areaDamage: true });
                            const craterDamage = (this.deployDamage / 1.5) * 0.05;
                            effects.push(new CraterEffect(enemy.x, enemy.y, craterDamage, this));
                        }
                    }
                }
                this.animState.recoilTime = 25;
                break;
            }
            case 'gatlingGun': {
                const targetsInRange = [];
                for(const e of enemies) {
                    if ((this.x - e.x)**2 + (this.y - e.y)**2 < this.rangePixelsSq) {
                        targetsInRange.push(e);
                    }
                }

                if (targetsInRange.length === 0) {
                    this.fireCooldown = 10;
                    return;
                }
                SFX.tower(this.type);

                let finalFireRate = this.fireRate;
                if (this.level === 4) {
                    const fireRateBonus = 1 + (this.rank * 0.05);
                    finalFireRate /= fireRateBonus;
                }
                this.fireCooldown = finalFireRate / (this.buffs.speed * this.buffs.matrixSpeed);
                this.animState.shakeTime = 5;

                for (let i = 0; i < this.shotsPerRound; i++) {
                    const target = targetsInRange[i % targetsInRange.length];
                    const offsetX = (effectRandom() - 0.5) * 16 * scale;
                    const offsetY = (effectRandom() - 0.5) * 16 * scale;
                    projectiles.push(new Projectile(this.x + offsetX, this.y + offsetY, target, this));
                }

                if (this.level === 4) {
                    this.totalShotsFired += this.shotsPerRound;
                    const newRank = Math.min(this.maxRank, Math.floor(this.totalShotsFired / 1500));
                    if (newRank > this.rank) {
                        this.rank = newRank;
                        effects.push(new RankUpEffect(this.x, this.y, this.rank));
                    }
                }
                break;
            }
            case 'thiefClaw':
                this.animState.shakeTime = 5;
                projectiles.push(new Projectile(this.x, this.y, this.currentTargets[0], this));
                if (this.attackCounter >= this.attacksForGold) {
                    this.attackCounter = 0;
                    money += this.goldPerProc;
                    this.goldStolen += this.goldPerProc;
                    effects.push(new GoldEffect(this.x, this.y, this.goldPerProc));
                }
                break;
            case 'tesla':
                this.animState.shakeTime = 10;
                this.animState.flashTime = 10;
                effects.push(new TeslaEffect(this, this.currentTargets));
                let currentDamage = this.damage * this.buffs.damage;
                if (this.level === 4) {
                    this.lastAttackTime = frameCount;
                    this.damageBuff = Math.min(1, this.damageBuff + 0.02);
                    currentDamage *= (1 + this.damageBuff);
                }
                this.currentTargets.forEach(enemy => {
                    enemy.takeDamage(currentDamage, this, { areaDamage: true });
                    enemy.applyStun(this.stun * 60);
                });
                break;
            case 'slow':
                let applySealThisAttack = false;
                let slowHitAny = false;
                if (this.level === 4) {
                    if (this.attackCounter >= 5) {
                        this.attackCounter = 0;
                        applySealThisAttack = true;
                    }
                    effects.push(new EXSlowWaveEffect(this.x, this.y, this.rangePixels));
                } else {
                    effects.push(new SlowAuraEffect(this.x, this.y, this.rangePixels));
                }
                for (const enemy of enemies) {
                    if ((this.x - enemy.x)**2 + (this.y - enemy.y)**2 < this.rangePixelsSq) {
                        enemy.takeDamage(this.damage * this.buffs.damage, this, { areaDamage: true });
                        enemy.applySlow(this.slow, 240, this);
                        if (applySealThisAttack) {
                            enemy.applyIceSeal();
                        }
                        slowHitAny = true;
                    }
                }
                if (slowHitAny) SFX.play('slow');
                break;
            case 'blast':
                this.animState.shakeTime = 15;
                if (this.level === 4) {
                    effects.push(new MuzzleFlashEffect(this.x, this.y, this.rotation));
                    this.animState.recoilTime = 10;
                }
                projectiles.push(new Projectile(this.x, this.y, this.currentTargets[0], this));
                break;
            case 'magic':
                if (this.level === 4) {
                    effects.push(new MagicFireEffect(this.x, this.y));
                } else {
                    this.animState.spin += Math.PI;
                }
                projectiles.push(new Projectile(this.x, this.y, this.currentTargets[0], this));
                break;
            case 'matrix':
                this.animState.shakeTime = 5;
                projectiles.push(new Projectile(this.x, this.y, this.currentTargets[0], this));
                if (this.attackCounter >= this.attacksBeforeOverheat) {
                    this.attackCounter = 0;
                    this.isOverheating = true;
                    this.overheatCooldown = this.overheatDuration - this.buffs.matrixOverheat;
                }
                break;
            case 'spotlight': {
                const target = this.currentTargets[0];
                if (!target) break;
                const distToTarget = Math.hypot(target.x - this.x, target.y - this.y) || 1;
                const halfAngle = Math.atan2(this.beamSpread * TILE_SIZE, distToTarget);
                const beamAngle = Math.atan2(target.y - this.y, target.x - this.x);
                const beamLengthSq = (30 * TILE_SIZE) ** 2;
                const finalDamage = this.damage * this.buffs.damage * this.buffs.matrixDamage;
                const hasBurn = this.level >= 1 && this.burnPercent > 0;
                for (const enemy of enemies) {
                    if (enemy.hp <= 0) continue;
                    const dx = enemy.x - this.x, dy = enemy.y - this.y;
                    if (dx*dx + dy*dy > beamLengthSq) continue;
                    const enemyAngle = Math.atan2(dy, dx);
                    let angleDiff = Math.abs(enemyAngle - beamAngle);
                    if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
                    if (angleDiff <= halfAngle) {
                        enemy.takeDamage(finalDamage, this, { areaDamage: true });
                        if (hasBurn) {
                            enemy.applyBurn(this.burnPercent, this.bossBurnPercent, 360, this);
                        }
                    }
                }
                this.animState.shakeTime = 4;
                break;
            }
            case 'pursuit': {
                const target = this.salvoTargets.shift();
                if (target && target.hp > 0) {
                    missileProjectiles.push(new PursuitMissile(this, target));
                } else {
                    const available = this.getPursuitSharedEnemies();
                    if (available.length > 0) {
                        missileProjectiles.push(new PursuitMissile(this, available[0]));
                    }
                }
                this.animState.shakeTime = 6;
                this.animState.recoilTime = 8;
                break;
            }
            case 'boomerang': {
                const target = this.currentTargets[0];
                if (!target) break;
                boomerangBlades.push(new BoomerangBlade(this, target.x, target.y));
                this.animState.shakeTime = 3;
                break;
            }
            case 'frostPunish': {
                if (!this.currentTargets[0]) break;
                const seal = (this.attackCounter % 5 === 0);
                projectiles.push(new Projectile(this.x, this.y, this.currentTargets[0], this, seal ? 'frostSeal' : null));
                this.animState.shakeTime = 6;
                break;
            }
        }
    }
    draw(context = ctx, customScale = scale) {
        const s = (val) => val * customScale;
        context.save();
        let drawX = this.x; let drawY = this.y;
        if (this.animState.shakeTime > 0 && context === ctx && this.type !== 'heavyWeapons') {
            drawX += (Math.random() - 0.5) * 4 * customScale;
            drawY += (Math.random() - 0.5) * 4 * customScale;
        }
        context.translate(drawX, drawY);

        if (!['electricCore', 'tesla', 'musicStand', 'militaryBase', 'gatlingGun', 'destroyer', 'battery', 'slow', 'missileSilo', 'gravityBeacon', 'shrineOfMerit', 'gamma', 'spotlight', 'pursuit', 'heavyWeapons', 'boomerang'].includes(this.type) && !(this.type === 'magic' && this.level === 4)) {
            context.rotate(this.rotation + Math.PI / 2);
        } else if (this.type === 'destroyer') {
            context.rotate(this.rotation + Math.PI / 2);
        }

        context.lineWidth = 2 * customScale; context.strokeStyle = '#111';

        switch (this.type) {
            case 'frostPunish': {
                const twang = this.animState.shakeTime > 0 ? Math.sin((this.animState.shakeTime / 6) * Math.PI) : 0;
                const baseGrad = context.createRadialGradient(0, 0, s(3), 0, 0, s(13));
                baseGrad.addColorStop(0, '#e1f5fe'); baseGrad.addColorStop(0.6, '#81d4fa'); baseGrad.addColorStop(1, '#0277bd');
                context.fillStyle = baseGrad; context.strokeStyle = '#01579b'; context.lineWidth = s(1.6);
                context.beginPath(); context.arc(0, 0, s(13), 0, Math.PI * 2); context.fill(); context.stroke();
                context.strokeStyle = 'rgba(1,87,155,0.5)'; context.lineWidth = s(0.8);
                for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; context.beginPath(); context.moveTo(0, 0); context.lineTo(Math.cos(a) * s(11), Math.sin(a) * s(11)); context.stroke(); }
                context.lineJoin = 'miter'; context.lineCap = 'butt';
                for (const side of [-1, 1]) {
                    const pts = [[0, -3], [side * 7, -7], [side * 10, -13], [side * 16, -17]];
                    context.strokeStyle = '#4fc3f7'; context.lineWidth = s(3);
                    context.beginPath(); pts.forEach((p, i) => i ? context.lineTo(s(p[0]), s(p[1])) : context.moveTo(s(p[0]), s(p[1]))); context.stroke();
                    context.strokeStyle = '#ffffff'; context.lineWidth = s(1);
                    context.beginPath(); pts.forEach((p, i) => i ? context.lineTo(s(p[0]), s(p[1])) : context.moveTo(s(p[0]), s(p[1]))); context.stroke();
                    context.fillStyle = '#e1f5fe'; context.strokeStyle = '#0288d1'; context.lineWidth = s(0.7);
                    context.beginPath(); context.moveTo(side * s(16), s(-21)); context.lineTo(side * s(19), s(-15)); context.lineTo(side * s(13), s(-15)); context.closePath(); context.fill(); context.stroke();
                }
                context.strokeStyle = '#e3f2fd'; context.lineWidth = s(1.1);
                context.beginPath();
                context.moveTo(s(-16), s(-17)); context.lineTo(0, s(-6 + twang * 6)); context.lineTo(s(16), s(-17));
                context.stroke();
                context.save();
                context.shadowColor = '#4fc3f7'; context.shadowBlur = s(8);
                const coreGrad = context.createLinearGradient(0, s(-7), 0, s(5));
                coreGrad.addColorStop(0, '#ffffff'); coreGrad.addColorStop(1, '#29b6f6');
                context.fillStyle = coreGrad; context.strokeStyle = '#0277bd'; context.lineWidth = s(1);
                context.beginPath(); context.moveTo(0, s(-7)); context.lineTo(s(4), s(-1)); context.lineTo(0, s(5)); context.lineTo(s(-4), s(-1)); context.closePath(); context.fill(); context.stroke();
                context.restore();
                context.save(); context.translate(0, s(twang * 6));
                context.fillStyle = '#b3e5fc'; context.strokeStyle = '#0288d1'; context.lineWidth = s(1);
                context.beginPath(); context.rect(s(-1.3), s(-18), s(2.6), s(18)); context.fill(); context.stroke();
                context.fillStyle = '#e1f5fe';
                context.beginPath(); context.moveTo(0, s(-24)); context.lineTo(s(3.5), s(-17)); context.lineTo(s(-3.5), s(-17)); context.closePath(); context.fill();
                context.restore();
                context.lineCap = 'butt'; context.lineJoin = 'round';
                break;
            }
            case 'boomerang': {
                const isEX = this.level === 4;
                const baseGrad = context.createRadialGradient(0, 0, s(3), 0, 0, s(18));
                baseGrad.addColorStop(0, '#a1887f'); baseGrad.addColorStop(1, '#5d4037');
                context.fillStyle = baseGrad; context.strokeStyle = '#3e2723'; context.lineWidth = s(2);
                context.beginPath(); context.arc(0, 0, s(18), 0, Math.PI * 2); context.fill(); context.stroke();
                context.strokeStyle = 'rgba(62,39,35,0.5)'; context.lineWidth = s(1);
                for (const rr of [13, 9, 5]) { context.beginPath(); context.arc(0, 0, s(rr), 0, Math.PI * 2); context.stroke(); }
                if (isEX) {
                    context.strokeStyle = '#c62828'; context.lineWidth = s(1.4);
                    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; context.beginPath(); context.moveTo(Math.cos(a) * s(6), Math.sin(a) * s(6)); context.lineTo(Math.cos(a) * s(16), Math.sin(a) * s(16)); context.stroke(); }
                    context.beginPath(); context.arc(0, 0, s(11), 0, Math.PI * 2); context.stroke();
                }
                context.fillStyle = '#4e342e';
                for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4; context.beginPath(); context.arc(Math.cos(a) * s(15), Math.sin(a) * s(15), s(1.4), 0, Math.PI * 2); context.fill(); }
                drawSpinBlade(context, s(20), this.animState.spin || 0, isEX ? 4 : 2, isEX);
                break;
            }
            case 'heavyWeapons': {
                const gs = this.gatlingSpin || 0;
                const recoil = (this.barrelRecoil || 0) / 4;
                const heat = this.gatlingHeat || 0;
                const edge = '#3e4348';
                const edgeS = '#5b6166';

                const baseGrad = context.createRadialGradient(0, 0, s(5), 0, 0, s(26));
                baseGrad.addColorStop(0, '#ffffff'); baseGrad.addColorStop(0.5, '#d6d9dc'); baseGrad.addColorStop(1, '#7d8186');
                context.fillStyle = baseGrad; context.strokeStyle = edge; context.lineWidth = s(2);
                context.beginPath();
                for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; const x = Math.cos(a) * s(26), y = Math.sin(a) * s(26); i ? context.lineTo(x, y) : context.moveTo(x, y); }
                context.closePath(); context.fill(); context.stroke();
                context.strokeStyle = edgeS; context.lineWidth = s(1.2);
                context.beginPath(); context.arc(0, 0, s(20), 0, Math.PI * 2); context.stroke();
                context.fillStyle = '#f5f5f5'; context.strokeStyle = '#7d8388'; context.lineWidth = s(0.6);
                for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; context.beginPath(); context.arc(Math.cos(a) * s(22.5), Math.sin(a) * s(22.5), s(1.9), 0, Math.PI * 2); context.fill(); context.stroke(); }
                const hubGrad = context.createRadialGradient(0, 0, s(2), 0, 0, s(15));
                hubGrad.addColorStop(0, '#ffffff'); hubGrad.addColorStop(1, '#9a9ea2');
                context.fillStyle = hubGrad; context.strokeStyle = edge; context.lineWidth = s(1.3);
                context.beginPath(); context.arc(0, 0, s(15), 0, Math.PI * 2); context.fill(); context.stroke();

                context.save();
                context.fillStyle = '#383c40'; context.strokeStyle = edge; context.lineWidth = s(1.5);
                context.beginPath(); context.rect(s(-30), s(8), s(22), s(16)); context.fill(); context.stroke();
                context.strokeStyle = '#cfd3d6'; context.lineWidth = s(1.2);
                for (let i = 0; i < 5; i++) { context.beginPath(); context.moveTo(s(-28 + i * 4.5), s(9)); context.lineTo(s(-28 + i * 4.5), s(23)); context.stroke(); }
                context.fillStyle = '#ffeb3b';
                context.beginPath(); context.rect(s(-9), s(12), s(9), s(4)); context.fill();
                context.restore();

                context.save();
                context.rotate(this.missileRotation);
                const pg = context.createLinearGradient(0, s(-13), 0, s(13));
                pg.addColorStop(0, '#ffffff'); pg.addColorStop(0.5, '#d6d9dc'); pg.addColorStop(1, '#8a8f93');
                context.fillStyle = pg; context.strokeStyle = edge; context.lineWidth = s(1.5);
                context.beginPath(); context.rect(s(3), s(-13), s(23), s(26)); context.fill(); context.stroke();
                context.fillStyle = edgeS;
                context.beginPath(); context.rect(s(13), s(-13), s(2.5), s(26)); context.fill();
                for (let row = 0; row < 2; row++) {
                    for (let col = 0; col < 3; col++) {
                        const tubeIdx = row * 3 + col;
                        const tx = s(9 + col * 6), ty = s(-6.5 + row * 13);
                        context.fillStyle = (tubeIdx === ((this.missileTube + 5) % 6)) ? '#ff7043' : '#2b3035';
                        context.beginPath(); context.arc(tx, ty, s(2.6), 0, Math.PI * 2); context.fill();
                        context.strokeStyle = '#dfe2e4'; context.lineWidth = s(0.8); context.stroke();
                    }
                }
                context.restore();

                context.save();
                context.rotate(this.gatlingRotation);
                const back = s(-recoil * 4);
                const mountGrad = context.createRadialGradient(0, 0, s(2), 0, 0, s(10));
                mountGrad.addColorStop(0, '#f5f5f5'); mountGrad.addColorStop(1, '#7d8186');
                context.fillStyle = mountGrad; context.strokeStyle = edge; context.lineWidth = s(1.3);
                context.beginPath(); context.arc(0, 0, s(10), 0, Math.PI * 2); context.fill(); context.stroke();
                const hg = context.createLinearGradient(0, s(-7), 0, s(7));
                hg.addColorStop(0, '#9a9ea2'); hg.addColorStop(0.5, '#ffffff'); hg.addColorStop(1, '#9a9ea2');
                context.fillStyle = hg; context.strokeStyle = edge; context.lineWidth = s(1.1);
                context.beginPath(); context.rect(s(5) + back, s(-7), s(15), s(14)); context.fill(); context.stroke();
                context.save();
                const vib = heat > 0.05 ? heat : 0;
                const jvx = (Math.random() - 0.5) * 3 * vib;
                const jvy = (Math.random() - 0.5) * 3 * vib;
                context.translate(s(26) + back + s(jvx), s(jvy));
                for (let i = 0; i < 6; i++) {
                    const a = gs + i / 6 * Math.PI * 2;
                    const by = Math.sin(a) * s(4.5);
                    const depth = (Math.cos(a) + 1) / 2;
                    const v = Math.round(130 + depth * 125);
                    context.fillStyle = `rgb(${v},${v},${v})`;
                    context.strokeStyle = edge; context.lineWidth = s(0.5);
                    context.beginPath(); context.ellipse(0, by, s(3.2), s(2.2 + depth * 0.8), 0, 0, Math.PI * 2); context.fill(); context.stroke();
                }
                const bbg = context.createLinearGradient(0, s(-6), 0, s(6));
                bbg.addColorStop(0, '#c4c8cb'); bbg.addColorStop(0.5, '#ffffff'); bbg.addColorStop(1, '#c4c8cb');
                context.fillStyle = bbg; context.strokeStyle = edge; context.lineWidth = s(1);
                context.beginPath(); context.rect(0, s(-6), s(18), s(12)); context.fill(); context.stroke();
                context.strokeStyle = edgeS; context.lineWidth = s(0.8);
                for (const oy of [-3.2, 0, 3.2]) { context.beginPath(); context.moveTo(0, s(oy)); context.lineTo(s(18), s(oy)); context.stroke(); }
                if (heat > 0.1) {
                    context.save();
                    context.globalAlpha = heat;
                    const fg = context.createRadialGradient(s(19), 0, 0, s(19), 0, s(10));
                    fg.addColorStop(0, 'rgba(255,255,235,0.95)');
                    fg.addColorStop(0.5, 'rgba(255,220,120,0.7)');
                    fg.addColorStop(1, 'rgba(255,200,80,0)');
                    context.fillStyle = fg;
                    context.beginPath(); context.arc(s(19), 0, s(10), 0, Math.PI * 2); context.fill();
                    context.restore();
                }
                context.restore();
                context.restore();
                break;
            }
            case 'annihilator': {
                if (this.level === 4) {
                    context.save();
                    let gearRotationSpeed = 0.02;
                    let shakeOffset = { x: 0, y: 0 };
                    if (this.animState.recoilTime > 0) {
                        gearRotationSpeed = 0.5;
                        shakeOffset.x = (Math.random() - 0.5) * s(2.5);
                        shakeOffset.y = (Math.random() - 0.5) * s(2.5);
                    }
                    this.animState.spin = (this.animState.spin || 0) + gearRotationSpeed;
                    context.translate(shakeOffset.x, shakeOffset.y);

                    const baseGrad = context.createRadialGradient(0, 0, s(4), 0, 0, s(23));
                    baseGrad.addColorStop(0, '#6d4c41'); baseGrad.addColorStop(0.7, '#3e2723'); baseGrad.addColorStop(1, '#1c120e');
                    context.fillStyle = baseGrad; context.strokeStyle = '#0d0d0d'; context.lineWidth = s(3);
                    context.beginPath();
                    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const x = Math.cos(a) * s(22), y = Math.sin(a) * s(22); i ? context.lineTo(x, y) : context.moveTo(x, y); }
                    context.closePath(); context.fill(); context.stroke();
                    context.fillStyle = '#211410';
                    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; context.beginPath(); context.arc(Math.cos(a) * s(18), Math.sin(a) * s(18), s(2), 0, Math.PI * 2); context.fill(); }

                    context.save(); context.rotate(this.animState.spin);
                    context.fillStyle = '#6D4C41'; context.strokeStyle = '#3e2723'; context.lineWidth = s(1);
                    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, t = Math.PI / 16; context.beginPath(); context.arc(0, 0, s(16), a - t, a + t, false); context.arc(0, 0, s(18.5), a + t, a - t, true); context.closePath(); context.fill(); context.stroke(); }
                    context.restore();
                    context.save(); context.rotate(-this.animState.spin * 1.7);
                    context.fillStyle = '#A1887F';
                    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2, t = Math.PI / 20; context.beginPath(); context.arc(0, 0, s(10), a - t, a + t, false); context.arc(0, 0, s(12), a + t, a - t, true); context.closePath(); context.fill(); }
                    context.fillStyle = '#2b1c16'; context.beginPath(); context.arc(0, 0, s(6), 0, Math.PI * 2); context.fill();
                    context.restore();

                    let recoilOffset = 0;
                    if (this.animState.recoilTime > 0) { const rp = this.animState.recoilTime / 20; recoilOffset = s(Math.sin(rp * Math.PI) * -7); }
                    for (const dx of [-7, 7]) {
                        context.save(); context.translate(s(dx), 0);
                        const bg = context.createLinearGradient(s(-5), 0, s(5), 0);
                        bg.addColorStop(0, '#4E342E'); bg.addColorStop(0.5, '#8d6e63'); bg.addColorStop(1, '#3e2723');
                        context.fillStyle = bg; context.strokeStyle = '#0d0d0d'; context.lineWidth = s(1.5);
                        context.beginPath(); context.rect(s(-5), s(-30) + recoilOffset, s(10), s(30)); context.fill(); context.stroke();
                        context.fillStyle = 'gold'; context.shadowColor = 'gold'; context.shadowBlur = s(8);
                        context.beginPath(); context.arc(0, s(-30) + recoilOffset, s(2.6), 0, Math.PI * 2); context.fill();
                        context.shadowBlur = 0; context.restore();
                    }
                    context.restore();
                }
                else {
                    context.save();
                    let gearRotationSpeed = 0.01;
                    if (this.animState.recoilTime > 0) gearRotationSpeed = 0.3;
                    this.animState.spin = (this.animState.spin || 0) + gearRotationSpeed;

                    const baseGrad = context.createRadialGradient(0, 0, s(3), 0, 0, s(15));
                    baseGrad.addColorStop(0, '#9e9e9e'); baseGrad.addColorStop(1, '#424242');
                    context.fillStyle = baseGrad; context.strokeStyle = '#212121'; context.lineWidth = s(2);
                    context.beginPath(); context.arc(0, 0, s(15), 0, Math.PI * 2); context.fill(); context.stroke();

                    context.save(); context.rotate(this.animState.spin);
                    context.fillStyle = '#BDBDBD'; context.strokeStyle = '#424242'; context.lineWidth = s(1);
                    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, t = Math.PI / 16; context.beginPath(); context.arc(0, 0, s(16), a - t, a + t, false); context.arc(0, 0, s(18), a + t, a - t, true); context.closePath(); context.fill(); context.stroke(); }
                    context.restore();
                    context.save(); context.rotate(-this.animState.spin * 1.5);
                    context.fillStyle = '#757575';
                    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, t = Math.PI / 12; context.beginPath(); context.arc(0, 0, s(10), a - t, a + t, false); context.arc(0, 0, s(12), a + t, a - t, true); context.closePath(); context.fill(); }
                    context.fillStyle = '#303030'; context.beginPath(); context.arc(0, 0, s(5), 0, Math.PI * 2); context.fill();
                    context.restore();

                    let recoilOffset = 0;
                    if (this.animState.shakeTime > 0) recoilOffset = s(Math.sin((this.animState.shakeTime / 5) * Math.PI) * -4);
                    const bg = context.createLinearGradient(s(-5), 0, s(5), 0);
                    bg.addColorStop(0, '#9e9e9e'); bg.addColorStop(0.5, '#f5f5f5'); bg.addColorStop(1, '#9e9e9e');
                    context.fillStyle = bg; context.strokeStyle = '#212121'; context.lineWidth = s(1.5);
                    context.beginPath(); context.rect(s(-5), s(-26) + recoilOffset, s(10), s(26)); context.fill(); context.stroke();
                    context.fillStyle = '#FFD700'; context.shadowColor = 'gold'; context.shadowBlur = s(6);
                    context.beginPath(); context.arc(0, s(-26) + recoilOffset, s(2.4), 0, Math.PI * 2); context.fill();
                    context.shadowBlur = 0;
                    context.restore();
                }
                break;
            }
            case 'gamma': {
                context.save();
                let recoilOffset = 0;
                if (this.animState.recoilTime > 0) {
                    const recoilProgress = this.animState.recoilTime / 20;
                    recoilOffset = s(Math.sin(recoilProgress * Math.PI) * -10);
                }
                const chargeProgress = 1 - (this.fireCooldown / (this.fireRate / (this.buffs.speed * this.buffs.matrixSpeed)));

                const baseGrad = context.createRadialGradient(0, 0, s(5), 0, 0, s(19));
                baseGrad.addColorStop(0, '#5a5a5a'); baseGrad.addColorStop(1, '#262626');
                context.fillStyle = baseGrad; context.strokeStyle = '#1a1a1a'; context.lineWidth = s(2);
                context.beginPath(); context.arc(0, 0, s(19), 0, Math.PI * 2); context.fill(); context.stroke();

                context.save(); context.rotate(this.animState.spin * 4);
                context.lineWidth = s(3.5);
                for (let i = 0; i < 12; i++) { context.strokeStyle = i % 2 ? '#fbc02d' : '#161616'; const a = i / 12 * Math.PI * 2; context.beginPath(); context.arc(0, 0, s(15.5), a, a + Math.PI / 6); context.stroke(); }
                context.restore();

                context.save(); context.rotate(this.animState.spin);
                context.fillStyle = `rgba(20,12,12,0.9)`;
                for (let i = 0; i < 3; i++) {
                    const a = i / 3 * Math.PI * 2;
                    context.beginPath(); context.moveTo(0, 0);
                    context.arc(0, 0, s(13), a - 0.42, a + 0.42); context.closePath(); context.fill();
                }
                context.restore();

                const corePulse = 0.85 + 0.15 * Math.sin(frameCount * 0.2);
                const coreRadius = s((8 + chargeProgress * 4) * corePulse);
                const coreGrad = context.createRadialGradient(0, 0, 0, 0, 0, coreRadius);
                coreGrad.addColorStop(0, `rgba(255,255,240,${0.9})`);
                coreGrad.addColorStop(0.4, `rgba(255,120,120,${0.85 + chargeProgress * 0.15})`);
                coreGrad.addColorStop(1, `rgba(183,28,28,${0.5 + chargeProgress * 0.4})`);
                context.fillStyle = coreGrad;
                context.shadowColor = 'rgba(255,30,30,0.85)'; context.shadowBlur = s(8 + 16 * chargeProgress);
                context.beginPath(); context.arc(0, 0, coreRadius, 0, Math.PI * 2); context.fill();
                context.shadowBlur = 0;

                context.save();
                context.rotate(this.rotation + Math.PI / 2);
                context.translate(0, recoilOffset);
                const bg = context.createLinearGradient(s(-4.5), 0, s(4.5), 0);
                bg.addColorStop(0, '#4a4a4a'); bg.addColorStop(0.5, '#9e9e9e'); bg.addColorStop(1, '#4a4a4a');
                context.fillStyle = bg; context.strokeStyle = '#1a1a1a'; context.lineWidth = s(1.5);
                context.beginPath(); context.rect(s(-4.5), s(-22), s(9), s(22)); context.fill(); context.stroke();
                context.fillStyle = '#161616';
                context.beginPath(); context.rect(s(-6), s(-24), s(12), s(4)); context.fill(); context.stroke();
                context.fillStyle = `rgba(255,80,80,${0.4 + 0.6 * chargeProgress})`; context.shadowColor = 'red'; context.shadowBlur = s(10 * chargeProgress);
                context.beginPath(); context.arc(0, s(-22), s(2.4), 0, Math.PI * 2); context.fill();
                context.shadowBlur = 0;
                context.restore();

                context.restore();
                break;
            }
            case 'shrineOfMerit': {
                context.save();
                const baseGrad = context.createRadialGradient(0, s(-4), s(4), 0, 0, s(20));
                baseGrad.addColorStop(0, '#6d6d6d'); baseGrad.addColorStop(0.6, '#454545'); baseGrad.addColorStop(1, '#262626');
                context.fillStyle = baseGrad; context.strokeStyle = '#1a1a1a'; context.lineWidth = s(2);
                context.beginPath();
                for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8; const x = Math.cos(a) * s(20), y = Math.sin(a) * s(20); i ? context.lineTo(x, y) : context.moveTo(x, y); }
                context.closePath(); context.fill(); context.stroke();
                context.strokeStyle = 'rgba(255,215,0,0.5)'; context.lineWidth = s(1.5);
                context.beginPath(); context.arc(0, 0, s(16.5), 0, Math.PI * 2); context.stroke();

                const runeAlpha = 0.4 + Math.sin(frameCount * 0.03) * 0.3;
                context.strokeStyle = `rgba(255, 215, 0, ${runeAlpha})`;
                context.shadowColor = `rgba(255, 215, 0, 1)`; context.shadowBlur = s(10); context.lineWidth = s(2.5);
                for (let i = 0; i < 4; i++) { context.beginPath(); const angle = (i / 4) * Math.PI * 2 + frameCount * 0.005; context.arc(0, 0, s(14), angle, angle + Math.PI / 2.5); context.stroke(); }
                context.shadowBlur = 0;

                context.save();
                const trophyY = s(-4 + Math.sin(frameCount * 0.05) * 2.5);
                context.translate(0, trophyY);
                context.rotate(this.animState.spin);
                let trophyColor = this.data.color;
                if (this.animState.flashTime > 0) {
                    const flashProgress = this.animState.flashTime / 20;
                    trophyColor = `rgba(255, 255, 255, ${0.5 + flashProgress * 0.5})`;
                    context.shadowColor = `rgba(255, 255, 255, ${flashProgress})`; context.shadowBlur = s(22);
                } else { context.shadowColor = this.data.color; context.shadowBlur = s(15); }
                context.fillStyle = trophyColor; context.strokeStyle = '#7a5c00'; context.lineWidth = s(1);
                context.beginPath();
                for (let i = 0; i < 8; i++) { let a = i / 8 * Math.PI * 2; const r = i % 2 ? s(4.5) : s(11); const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? context.lineTo(x, y) : context.moveTo(x, y); }
                context.closePath(); context.fill(); context.stroke();
                context.shadowBlur = 0; context.fillStyle = '#fffde7';
                context.beginPath(); context.arc(0, 0, s(3), 0, Math.PI * 2); context.fill();
                context.restore();
                context.restore();
                break;
            }
            case 'gravityBeacon': {
                const chargeProgress = 1 - (this.fireCooldown / (this.fireRate / (this.buffs.speed * this.buffs.matrixSpeed)));
                context.save();
                for (let i = 0; i < 4; i++) {
                    const phase = (frameCount * 0.02 + i / 4) % 1;
                    const r = s(22) * (1 - phase);
                    context.strokeStyle = `rgba(79,195,247,${(1 - phase) * (0.25 + chargeProgress * 0.5)})`;
                    context.lineWidth = s(1.5);
                    context.beginPath(); context.arc(0, 0, r, 0, Math.PI * 2); context.stroke();
                }
                context.save();
                context.rotate(this.animState.spin);
                this.animState.spin += 0.01 + (chargeProgress * 0.05);
                context.strokeStyle = `rgba(129,212,250,${0.5 + chargeProgress * 0.5})`;
                context.lineWidth = s(3); context.shadowColor = '#4fc3f7'; context.shadowBlur = s(6);
                context.beginPath(); context.arc(0, 0, s(16), 0, Math.PI * 1.4); context.stroke();
                context.beginPath(); context.arc(0, 0, s(16), Math.PI * 1.55, Math.PI * 1.85); context.stroke();
                context.shadowBlur = 0;
                context.restore();
                const bg = context.createRadialGradient(0, 0, s(3), 0, 0, s(12));
                bg.addColorStop(0, '#37474f'); bg.addColorStop(1, '#10171b');
                context.fillStyle = bg; context.strokeStyle = '#0a0a0a'; context.lineWidth = s(2);
                context.beginPath(); context.arc(0, 0, s(12), 0, Math.PI * 2); context.fill(); context.stroke();
                const cg = context.createRadialGradient(0, 0, s(1), 0, 0, s(8));
                cg.addColorStop(0, 'rgba(5,15,25,1)');
                cg.addColorStop(0.6, `rgba(79,195,247,${0.3 + chargeProgress * 0.6})`);
                cg.addColorStop(1, `rgba(179,229,252,${chargeProgress})`);
                context.fillStyle = cg; context.shadowColor = '#4fc3f7'; context.shadowBlur = s(4 + 12 * chargeProgress);
                context.beginPath(); context.arc(0, 0, s(8), 0, Math.PI * 2); context.fill();
                context.shadowBlur = 0;
                context.restore();
                break;
            }
            case 'missileSilo': {
                const openProgress = this.animState.openProgress || 0;
                if (this.level === 4) {
                    const pad = context.createRadialGradient(0, 0, s(6), 0, 0, s(24));
                    pad.addColorStop(0, '#5e5e5e'); pad.addColorStop(1, '#2b2b2b');
                    context.fillStyle = pad; context.strokeStyle = '#1a1a1a'; context.lineWidth = s(3);
                    context.beginPath(); context.arc(0, 0, s(24), 0, Math.PI * 2); context.fill(); context.stroke();
                    context.lineWidth = s(3);
                    for (let i = 0; i < 16; i++) { context.strokeStyle = i % 2 ? '#fbc02d' : '#161616'; const a = i / 16 * Math.PI * 2; context.beginPath(); context.arc(0, 0, s(21), a, a + Math.PI / 8); context.stroke(); }
                    context.fillStyle = '#0e0e0e';
                    context.beginPath(); context.arc(0, 0, s(18), 0, Math.PI * 2); context.fill();
                    if (openProgress > 0) {
                        context.save(); context.globalAlpha = Math.min(1, openProgress * 1.3);
                        const d = s(9);
                        for (const [tx, ty] of [[-d, -d], [d, -d], [-d, d], [d, d]]) {
                            context.fillStyle = '#3a3a3a'; context.strokeStyle = '#111'; context.lineWidth = s(1);
                            context.beginPath(); context.arc(tx, ty, s(5.5), 0, Math.PI * 2); context.fill(); context.stroke();
                            context.fillStyle = '#E0E0E0';
                            context.beginPath(); context.arc(tx, ty, s(3), 0, Math.PI * 2); context.fill();
                            context.fillStyle = '#d50000'; context.beginPath(); context.arc(tx, ty, s(1.4), 0, Math.PI * 2); context.fill();
                        }
                        context.restore();
                    }
                    context.fillStyle = '#9E9E9E'; context.strokeStyle = '#111'; context.lineWidth = s(3);
                    for (const dir of [-1, 1]) {
                        context.save(); context.translate(s(10 * openProgress * dir), 0);
                        context.beginPath(); context.arc(0, 0, s(18), dir > 0 ? -Math.PI / 2 : Math.PI / 2, dir > 0 ? Math.PI / 2 : -Math.PI / 2, false); context.closePath(); context.fill(); context.stroke();
                        context.strokeStyle = '#616161'; context.lineWidth = s(1.5);
                        context.beginPath(); context.moveTo(0, s(-14)); context.lineTo(0, s(14)); context.stroke();
                        context.restore();
                    }
                } else {
                    const pad = context.createRadialGradient(0, 0, s(5), 0, 0, s(20));
                    pad.addColorStop(0, '#5a5a5a'); pad.addColorStop(1, '#2e2e2e');
                    context.fillStyle = pad; context.strokeStyle = '#1a1a1a'; context.lineWidth = s(2);
                    context.beginPath(); context.arc(0, 0, s(20), 0, Math.PI * 2); context.fill(); context.stroke();
                    context.lineWidth = s(2.5);
                    for (let i = 0; i < 12; i++) { context.strokeStyle = i % 2 ? '#fbc02d' : '#161616'; const a = i / 12 * Math.PI * 2; context.beginPath(); context.arc(0, 0, s(17.5), a, a + Math.PI / 6); context.stroke(); }
                    context.fillStyle = '#0e0e0e';
                    context.beginPath(); context.arc(0, 0, s(14), 0, Math.PI * 2); context.fill();
                    if (openProgress > 0.2) {
                        context.save(); context.globalAlpha = openProgress;
                        context.fillStyle = '#E0E0E0';
                        context.beginPath(); context.arc(0, 0, s(6), 0, Math.PI * 2); context.fill(); context.stroke();
                        context.fillStyle = '#d50000'; context.beginPath(); context.arc(0, 0, s(2.5), 0, Math.PI * 2); context.fill();
                        context.restore();
                    }
                    context.fillStyle = '#757575'; context.strokeStyle = '#111'; context.lineWidth = s(2);
                    for (const dir of [-1, 1]) {
                        context.save(); context.translate(s(8 * openProgress * dir), 0);
                        context.beginPath(); context.arc(0, 0, s(14), dir > 0 ? -Math.PI / 2 : Math.PI / 2, dir > 0 ? Math.PI / 2 : -Math.PI / 2, false); context.closePath(); context.fill(); context.stroke();
                        context.restore();
                    }
                }
                break;
            }
            case 'battery': {
                context.fillStyle = '#1b5e20'; context.strokeStyle = '#0d2b10'; context.lineWidth = s(2);
                context.beginPath(); context.rect(s(-13), s(-16), s(26), s(32)); context.fill(); context.stroke();
                context.fillStyle = '#9e9e9e'; context.strokeStyle = '#111';
                context.beginPath(); context.rect(s(-6), s(-19), s(12), s(4)); context.fill(); context.stroke();
                const bg = context.createLinearGradient(0, s(-13), 0, s(13));
                bg.addColorStop(0, '#66bb6a'); bg.addColorStop(1, '#2e7d32');
                context.fillStyle = bg;
                context.beginPath(); context.rect(s(-10), s(-13), s(20), s(26)); context.fill();
                const lvl = 0.5 + 0.5 * Math.abs(Math.sin(frameCount * 0.04));
                for (let i = 0; i < 4; i++) {
                    const lit = (3 - i) / 4 < lvl;
                    context.fillStyle = lit ? '#c8e6c9' : 'rgba(0,40,0,0.4)';
                    context.beginPath(); context.rect(s(-7), s(-10) + s(i * 6), s(14), s(4.5)); context.fill();
                }
                context.fillStyle = '#fff59d'; context.shadowColor = '#fff176'; context.shadowBlur = s(5);
                context.beginPath(); context.moveTo(s(1.5), s(-9)); context.lineTo(s(-3.5), s(1)); context.lineTo(s(0), s(1)); context.lineTo(s(-1.5), s(9)); context.lineTo(s(3.5), s(-2)); context.lineTo(s(0), s(-2)); context.closePath(); context.fill();
                context.shadowBlur = 0;
                context.strokeStyle = '#0d2b10'; context.lineWidth = s(2);
                context.beginPath(); context.rect(s(-10), s(-13), s(20), s(26)); context.stroke();
                if (this.animState.flashTime > 0) {
                    context.fillStyle = `rgba(255, 255, 255, ${this.animState.flashTime / 20})`;
                    context.beginPath(); context.rect(s(-13), s(-19), s(26), s(35)); context.fill();
                }
                break;
            }
            case 'destroyer': {
                const unfold = this.animState.unfoldProgress;
                const live = (this.destroyerState === 'active' || this.destroyerState === 'opening');
                context.save();
                context.fillStyle = '#262626'; context.strokeStyle = '#000'; context.lineWidth = s(2);
                for (const side of [-1, 1]) {
                    context.beginPath();
                    context.moveTo(s(side * 8), s(-18));
                    context.lineTo(s(side * (8 + 14 * unfold)), s(-14 - 6 * unfold));
                    context.lineTo(s(side * (8 + 12 * unfold)), s(6 + 6 * unfold));
                    context.lineTo(s(side * 8), s(6));
                    context.closePath(); context.fill(); context.stroke();
                    context.fillStyle = live ? '#ff1744' : '#5a1212';
                    context.beginPath(); context.arc(s(side * (8 + 12 * unfold)), s(-4), s(2 + unfold), 0, Math.PI * 2); context.fill();
                    context.fillStyle = '#262626';
                }
                context.restore();
                const bg = context.createRadialGradient(0, 0, s(4), 0, 0, s(20));
                bg.addColorStop(0, '#2a2a2a'); bg.addColorStop(1, '#080808');
                context.fillStyle = bg; context.strokeStyle = live ? '#d50000' : '#000'; context.lineWidth = s(2.5);
                context.beginPath();
                for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8; const x = Math.cos(a) * s(19), y = Math.sin(a) * s(19); i ? context.lineTo(x, y) : context.moveTo(x, y); }
                context.closePath(); context.fill(); context.stroke();
                let recoilOffset = 0;
                if (this.animState.recoilTime > 0) { const rp = Math.abs(this.animState.recoilTime - 12.5) / 12.5; recoilOffset = (1 - rp) * s(15); }
                context.save(); context.translate(0, recoilOffset);
                const barrelG = context.createLinearGradient(s(-8), 0, s(8), 0);
                barrelG.addColorStop(0, '#1a1a1a'); barrelG.addColorStop(0.5, '#454545'); barrelG.addColorStop(1, '#1a1a1a');
                context.fillStyle = barrelG; context.strokeStyle = '#000'; context.lineWidth = s(2);
                context.beginPath(); context.rect(s(-8), s(-26), s(16), s(28)); context.fill(); context.stroke();
                context.restore();
                const coreA = live ? 1 : 0.35 + unfold * 0.5;
                const cr = s(7 + (live ? 2 * Math.abs(Math.sin(frameCount * 0.2)) : 0));
                const cg = context.createRadialGradient(0, s(-10), 0, 0, s(-10), cr);
                cg.addColorStop(0, `rgba(255,230,200,${coreA})`); cg.addColorStop(0.5, `rgba(255,40,40,${coreA})`); cg.addColorStop(1, 'rgba(120,0,0,0)');
                context.fillStyle = cg; context.shadowColor = 'red'; context.shadowBlur = s(live ? 16 : 6);
                context.beginPath(); context.arc(0, s(-10), cr, 0, Math.PI * 2); context.fill();
                context.shadowBlur = 0;
                if (live) {
                    context.save();
                    context.shadowColor = 'red'; context.shadowBlur = s(15);
                    context.strokeStyle = `rgba(255,60,60,${0.5 + unfold * 0.4})`;
                    context.lineWidth = s(1 + Math.random() * 1.5);
                    for (let i = 0; i < 3; i++) {
                        context.beginPath(); context.moveTo(0, s(-10));
                        let lx = 0, ly = s(-10);
                        for (let j = 0; j < 4; j++) { const a = (Math.random() - 0.5) * Math.PI * 1.5; const r = s(5 + Math.random() * 20); lx += Math.cos(a) * r; ly += Math.sin(a) * r; context.lineTo(lx, ly); }
                        context.stroke();
                    }
                    context.restore();
                }
                break;
            }
            case 'arrow': {
                const twang = this.animState.shakeTime > 0 ? Math.sin((this.animState.shakeTime / 10) * Math.PI) : 0;
                if (this.level === 4) {
                    const baseGrad = context.createLinearGradient(0, s(-8), 0, s(14));
                    baseGrad.addColorStop(0, '#5d4a22'); baseGrad.addColorStop(1, '#2b2110');
                    context.fillStyle = baseGrad; context.strokeStyle = '#111'; context.lineWidth = s(2);
                    context.beginPath();
                    context.moveTo(s(-10), s(14)); context.lineTo(s(10), s(14));
                    context.lineTo(s(8), s(-4)); context.lineTo(s(-8), s(-4));
                    context.closePath(); context.fill(); context.stroke();
                    context.fillStyle = '#1a1a1a';
                    context.beginPath(); context.arc(0, s(-2), s(6), 0, Math.PI * 2); context.fill(); context.stroke();
                    context.lineCap = 'round';
                    for (const w of [4.5, 2]) {
                        context.strokeStyle = w > 3 ? '#7a5e22' : '#e6c14a';
                        context.lineWidth = s(w);
                        for (const side of [-1, 1]) {
                            context.beginPath(); context.moveTo(0, s(-4));
                            context.quadraticCurveTo(side * s(17), s(-10), side * s(21), s(-27));
                            context.stroke();
                        }
                    }
                    context.strokeStyle = '#f5f5f5'; context.lineWidth = s(1.3);
                    context.beginPath();
                    context.moveTo(s(-21), s(-27)); context.lineTo(0, s(-10 + twang * 7)); context.lineTo(s(21), s(-27));
                    context.stroke();
                    for (const dx of [-4.5, 4.5]) {
                        context.save(); context.translate(s(dx), s(twang * 7));
                        context.fillStyle = '#4e342e'; context.strokeStyle = '#111'; context.lineWidth = s(1.5);
                        context.beginPath(); context.rect(s(-1.6), s(-24), s(3.2), s(28)); context.fill(); context.stroke();
                        context.fillStyle = 'gold'; context.shadowColor = 'gold'; context.shadowBlur = s(9);
                        context.beginPath(); context.moveTo(0, s(-32)); context.lineTo(s(4.5), s(-22)); context.lineTo(s(-4.5), s(-22)); context.closePath(); context.fill();
                        context.shadowBlur = 0; context.restore();
                    }
                    context.lineCap = 'butt';
                } else {
                    context.fillStyle = '#37474f'; context.strokeStyle = '#111'; context.lineWidth = s(2);
                    context.beginPath();
                    context.moveTo(s(-8), s(13)); context.lineTo(s(8), s(13));
                    context.lineTo(s(6), s(-2)); context.lineTo(s(-6), s(-2));
                    context.closePath(); context.fill(); context.stroke();
                    context.lineCap = 'round'; context.strokeStyle = '#546e7a'; context.lineWidth = s(3);
                    for (const side of [-1, 1]) {
                        context.beginPath(); context.moveTo(0, s(-2));
                        context.quadraticCurveTo(side * s(13), s(-6), side * s(16), s(-20));
                        context.stroke();
                    }
                    context.strokeStyle = '#eee'; context.lineWidth = s(1);
                    context.beginPath();
                    context.moveTo(s(-16), s(-20)); context.lineTo(0, s(-7 + twang * 6)); context.lineTo(s(16), s(-20));
                    context.stroke();
                    context.lineCap = 'butt';
                    context.save(); context.translate(0, s(twang * 6));
                    context.fillStyle = '#3e2723'; context.strokeStyle = '#111'; context.lineWidth = s(1.5);
                    context.beginPath(); context.rect(s(-1.4), s(-20), s(2.8), s(24)); context.fill(); context.stroke();
                    context.fillStyle = this.data.color;
                    context.beginPath(); context.moveTo(0, s(-26)); context.lineTo(s(4), s(-18)); context.lineTo(s(-4), s(-18)); context.closePath(); context.fill(); context.stroke();
                    context.restore();
                }
                break;
            }
            case 'cannon':
                let cannonRecoilOffset = 0;
                if (this.animState.recoilTime > 0) {
                    const recoilProgress = Math.abs(this.animState.recoilTime - 5) / 5;
                    cannonRecoilOffset = (1 - recoilProgress) * s(5);
                }
                if (this.level === 4) {
                    const cgrad = context.createRadialGradient(0, 0, s(4), 0, 0, s(19));
                    cgrad.addColorStop(0, '#5a5a5a'); cgrad.addColorStop(1, '#2a2a2a');
                    context.fillStyle = cgrad; context.strokeStyle = '#111'; context.lineWidth = s(2.5);
                    context.beginPath(); context.arc(0, 0, s(19), 0, Math.PI * 2); context.fill(); context.stroke();
                    context.fillStyle = '#1a1a1a';
                    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; context.beginPath(); context.arc(Math.cos(a) * s(15), Math.sin(a) * s(15), s(1.6), 0, Math.PI * 2); context.fill(); }
                    context.save(); context.translate(0, cannonRecoilOffset);
                    context.fillStyle = '#3a2a2a';
                    context.beginPath(); context.rect(s(-9), s(-4), s(18), s(14)); context.fill(); context.stroke();
                    context.fillStyle = '#4e342e';
                    context.beginPath(); context.rect(s(-7), s(-24), s(14), s(24)); context.fill(); context.stroke();
                    context.fillStyle = '#6d4c41';
                    context.beginPath(); context.rect(s(-4.5), s(-24), s(9), s(24)); context.fill();
                    context.fillStyle = '#ff3d00'; context.shadowColor = 'red'; context.shadowBlur = s(14);
                    context.beginPath(); context.rect(s(-9), s(-27), s(18), s(5)); context.fill(); context.stroke();
                    context.fillStyle = `rgba(255,200,80,${0.5 + 0.5 * Math.abs(Math.sin(frameCount * 0.1))})`;
                    context.beginPath(); context.arc(0, s(-24), s(3), 0, Math.PI * 2); context.fill();
                    context.shadowBlur = 0; context.restore();
                } else {
                    context.fillStyle = '#5a5a5a'; context.strokeStyle = '#111'; context.lineWidth = s(2);
                    context.beginPath(); context.arc(0, 0, s(14), 0, Math.PI * 2); context.fill(); context.stroke();
                    context.fillStyle = '#3a3a3a';
                    context.beginPath(); context.arc(0, 0, s(8), 0, Math.PI * 2); context.fill();
                    context.save(); context.translate(0, cannonRecoilOffset);
                    context.fillStyle = this.data.color;
                    context.beginPath(); context.rect(s(-5), s(-18), s(10), s(18)); context.fill(); context.stroke();
                    context.fillStyle = '#2b211c';
                    context.beginPath(); context.rect(s(-6.5), s(-20), s(13), s(4)); context.fill(); context.stroke();
                    context.restore();
                }
                break;
            case 'magic':
                if (this.level === 4) {
                    context.save();
                    context.rotate(this.animState.spin * 0.5);
                    const bgrad = context.createRadialGradient(0, 0, s(4), 0, 0, s(20));
                    bgrad.addColorStop(0, '#6a1b9a'); bgrad.addColorStop(1, '#2a0845');
                    context.fillStyle = bgrad; context.strokeStyle = '#12031f'; context.lineWidth = s(2);
                    context.beginPath();
                    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const x = Math.cos(a) * s(19), y = Math.sin(a) * s(19); i ? context.lineTo(x, y) : context.moveTo(x, y); }
                    context.closePath(); context.fill(); context.stroke();
                    context.strokeStyle = 'rgba(225,190,231,0.7)'; context.lineWidth = s(1.5); context.shadowColor = '#ab47bc'; context.shadowBlur = s(8);
                    context.beginPath(); context.arc(0, 0, s(14), 0, Math.PI * 2); context.stroke();
                    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; context.beginPath(); context.moveTo(Math.cos(a) * s(11), Math.sin(a) * s(11)); context.lineTo(Math.cos(a) * s(14), Math.sin(a) * s(14)); context.stroke(); }
                    context.shadowBlur = 0;
                    for (let i = 0; i < 4; i++) {
                        context.save();
                        const a = i / 4 * Math.PI * 2 + frameCount * 0.05;
                        context.rotate(a); context.translate(0, s(-16));
                        context.fillStyle = '#e1bee7'; context.shadowColor = '#ce93d8'; context.shadowBlur = s(10); context.strokeStyle = '#7b1fa2'; context.lineWidth = s(1);
                        context.beginPath(); context.moveTo(0, s(-6)); context.lineTo(s(4), 0); context.lineTo(0, s(6)); context.lineTo(s(-4), 0); context.closePath(); context.fill(); context.stroke();
                        context.restore();
                    }
                    context.shadowBlur = 0;
                    const cp = Math.sin(frameCount * 0.1) * 0.5 + 0.5;
                    const cg = context.createRadialGradient(0, 0, 0, 0, 0, s(9));
                    cg.addColorStop(0, '#ffffff'); cg.addColorStop(0.5, `rgba(225,190,231,${0.7 + cp * 0.3})`); cg.addColorStop(1, 'rgba(156,39,176,0)');
                    context.fillStyle = cg;
                    context.beginPath(); context.arc(0, 0, s(8 + cp * 2), 0, Math.PI * 2); context.fill();
                    context.restore();
                } else {
                    context.save();
                    context.rotate(this.animState.spin); this.animState.spin *= 0.9;
                    const bgrad = context.createRadialGradient(0, 0, s(3), 0, 0, s(14));
                    bgrad.addColorStop(0, '#7b1fa2'); bgrad.addColorStop(1, '#311045');
                    context.fillStyle = bgrad; context.strokeStyle = '#1a0526'; context.lineWidth = s(2);
                    context.beginPath(); context.arc(0, 0, s(13), 0, Math.PI * 2); context.fill(); context.stroke();
                    context.strokeStyle = 'rgba(225,190,231,0.6)'; context.lineWidth = s(1);
                    context.beginPath(); context.arc(0, 0, s(9), 0, Math.PI * 2); context.stroke();
                    context.fillStyle = this.data.color; context.shadowColor = '#ce93d8'; context.shadowBlur = s(8); context.strokeStyle = '#4a148c'; context.lineWidth = s(1.5);
                    context.beginPath(); context.moveTo(0, s(-16)); context.lineTo(s(6), s(-4)); context.lineTo(s(4), s(6)); context.lineTo(s(-4), s(6)); context.lineTo(s(-6), s(-4)); context.closePath(); context.fill(); context.stroke();
                    context.shadowBlur = 0;
                    const cp = Math.sin(frameCount * 0.15) * 0.4 + 0.6;
                    context.fillStyle = `rgba(255,255,255,${cp})`;
                    context.beginPath(); context.arc(0, s(-2), s(3.5), 0, Math.PI * 2); context.fill();
                    context.restore();
                }
                break;
            case 'slow':
                if (this.level === 4) {
                    context.save();
                    const pulse = Math.sin(frameCount * 0.05) * 0.1 + 0.9;
                    const bg = context.createRadialGradient(0, 0, s(3), 0, 0, s(18 * pulse));
                    bg.addColorStop(0, '#1a3a4a'); bg.addColorStop(1, '#06141c');
                    context.fillStyle = bg; context.strokeStyle = '#4fc3f7'; context.lineWidth = s(1.5);
                    context.beginPath(); context.arc(0, 0, s(18 * pulse), 0, Math.PI * 2); context.fill(); context.stroke();
                    context.shadowColor = '#81d4fa'; context.shadowBlur = s(8);
                    for (let i = 0; i < 6; i++) {
                        context.save();
                        const angle = (i / 6) * Math.PI * 2 + frameCount * 0.02;
                        context.rotate(angle); context.translate(0, s(-21));
                        const ig = context.createLinearGradient(0, s(-7), 0, s(6));
                        ig.addColorStop(0, '#e1f5fe'); ig.addColorStop(1, '#4fc3f7');
                        context.fillStyle = ig; context.strokeStyle = '#0277bd'; context.lineWidth = s(1);
                        context.beginPath(); context.moveTo(0, s(-7)); context.lineTo(s(3.5), s(5)); context.lineTo(s(-3.5), s(5)); context.closePath(); context.fill(); context.stroke();
                        context.restore();
                    }
                    context.shadowBlur = 0;
                    const corePulse = Math.sin(frameCount * 0.1) * 0.5 + 0.5;
                    const g = context.createRadialGradient(0, 0, s(2), 0, 0, s(12));
                    g.addColorStop(0, `rgba(255,255,255,${corePulse * 0.5 + 0.5})`);
                    g.addColorStop(0.5, 'rgba(129,212,250,0.8)');
                    g.addColorStop(1, 'rgba(3,169,244,0)');
                    context.fillStyle = g;
                    context.beginPath(); context.arc(0, 0, s(12), 0, Math.PI * 2); context.fill();
                    context.restore();
                } else {
                    context.save();
                    const bg = context.createRadialGradient(0, 0, s(2), 0, 0, s(13));
                    bg.addColorStop(0, '#29638a'); bg.addColorStop(1, '#0a1f2e');
                    context.fillStyle = bg; context.strokeStyle = '#01579b'; context.lineWidth = s(1.5);
                    context.beginPath(); context.arc(0, 0, s(13), 0, Math.PI * 2); context.fill(); context.stroke();
                    context.strokeStyle = this.data.color; context.lineWidth = s(2); context.lineCap = 'round';
                    context.shadowColor = '#81d4fa'; context.shadowBlur = s(6);
                    for (let i = 0; i < 6; i++) {
                        context.save(); context.rotate(i * Math.PI / 3);
                        context.beginPath(); context.moveTo(0, s(-5)); context.lineTo(0, s(-14));
                        context.moveTo(0, s(-11)); context.lineTo(s(-3), s(-13)); context.moveTo(0, s(-11)); context.lineTo(s(3), s(-13));
                        context.stroke(); context.restore();
                    }
                    context.lineCap = 'butt'; context.shadowBlur = 0;
                    const cp = Math.sin(frameCount * 0.12) * 0.4 + 0.6;
                    context.fillStyle = `rgba(225,245,254,${cp})`;
                    context.beginPath(); context.arc(0, 0, s(5), 0, Math.PI * 2); context.fill();
                    context.fillStyle = '#01579b';
                    context.beginPath(); context.arc(0, 0, s(2.5), 0, Math.PI * 2); context.fill();
                    context.restore();
                }
                break;
            case 'blast': {
                let recoilOffset = 0;
                if (this.animState.recoilTime > 0) {
                    const recoilProgress = Math.abs(this.animState.recoilTime - 5) / 5;
                    recoilOffset = (1 - recoilProgress) * s(6);
                }
                if (this.level === 4) {
                    const bg = context.createRadialGradient(0, 0, s(4), 0, 0, s(19));
                    bg.addColorStop(0, '#4a4a4a'); bg.addColorStop(1, '#262626');
                    context.fillStyle = bg; context.strokeStyle = '#111'; context.lineWidth = s(2.5);
                    context.beginPath();
                    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8; const r = s(18); const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? context.lineTo(x, y) : context.moveTo(x, y); }
                    context.closePath(); context.fill(); context.stroke();
                    context.lineWidth = s(3);
                    for (let i = 0; i < 12; i++) { context.strokeStyle = i % 2 ? '#ffca28' : '#1a1a1a'; const a = i / 12 * Math.PI * 2; context.beginPath(); context.arc(0, 0, s(14), a, a + Math.PI / 6); context.stroke(); }
                    context.save(); context.translate(0, recoilOffset);
                    context.fillStyle = '#b71c1c'; context.strokeStyle = '#111'; context.lineWidth = s(2);
                    context.beginPath(); context.rect(s(-8), s(-22), s(16), s(22)); context.fill(); context.stroke();
                    context.fillStyle = '#7f0000';
                    context.beginPath(); context.rect(s(-8), s(-22), s(4), s(22)); context.fill();
                    context.fillStyle = '#1a1a1a';
                    context.beginPath(); context.rect(s(-11), s(-26), s(22), s(6)); context.fill(); context.stroke();
                    context.fillStyle = `rgba(255,120,40,${0.5 + 0.5 * Math.abs(Math.sin(frameCount * 0.12))})`;
                    context.shadowColor = '#ff6e40'; context.shadowBlur = s(12);
                    context.beginPath(); context.arc(0, s(-23), s(4.5), 0, Math.PI * 2); context.fill();
                    context.shadowBlur = 0; context.restore();
                } else {
                    context.fillStyle = '#4a4a4a'; context.strokeStyle = '#111'; context.lineWidth = s(2);
                    context.beginPath();
                    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const x = Math.cos(a) * s(14), y = Math.sin(a) * s(14); i ? context.lineTo(x, y) : context.moveTo(x, y); }
                    context.closePath(); context.fill(); context.stroke();
                    context.save(); context.translate(0, recoilOffset);
                    context.fillStyle = this.data.color;
                    context.beginPath(); context.rect(s(-7), s(-16), s(14), s(16)); context.fill(); context.stroke();
                    context.fillStyle = '#2b2b2b';
                    context.beginPath(); context.rect(s(-8), s(-18), s(16), s(4)); context.fill(); context.stroke();
                    context.fillStyle = '#1a1a1a';
                    context.beginPath(); context.arc(0, s(-15), s(3.5), 0, Math.PI * 2); context.fill();
                    context.restore();
                }
                break;
            }
            case 'sun': {
                context.save();
                if (this.level === 4) {
                    const pulse = 0.85 + 0.15 * Math.sin(frameCount * 0.18);
                    const glow = context.createRadialGradient(0, 0, s(5), 0, 0, s(32 * pulse));
                    glow.addColorStop(0, `rgba(255,94,60,${0.5 * pulse})`);
                    glow.addColorStop(0.5, `rgba(213,0,0,${0.32 * pulse})`);
                    glow.addColorStop(1, 'rgba(80,0,0,0)');
                    context.fillStyle = glow;
                    context.beginPath(); context.arc(0, 0, s(32 * pulse), 0, Math.PI * 2); context.fill();
                    context.save(); context.rotate(this.animState.spin * 1.5);
                    for (let i = 0; i < 16; i++) {
                        const a = i / 16 * Math.PI * 2;
                        const long = i % 2 === 0;
                        const len = s(long ? 29 : 21) * (0.9 + 0.1 * Math.sin(frameCount * 0.3 + i));
                        context.fillStyle = long ? 'rgba(255,87,34,0.92)' : 'rgba(213,0,0,0.85)';
                        context.beginPath();
                        context.moveTo(Math.cos(a - 0.045) * s(13), Math.sin(a - 0.045) * s(13));
                        context.lineTo(Math.cos(a) * len, Math.sin(a) * len);
                        context.lineTo(Math.cos(a + 0.045) * s(13), Math.sin(a + 0.045) * s(13));
                        context.closePath(); context.fill();
                    }
                    context.restore();
                    const ring = context.createRadialGradient(0, 0, s(9), 0, 0, s(15));
                    ring.addColorStop(0, '#1a0000'); ring.addColorStop(0.6, '#2b0a06'); ring.addColorStop(1, '#080000');
                    context.fillStyle = ring; context.beginPath(); context.arc(0, 0, s(15), 0, Math.PI * 2); context.fill();
                    context.strokeStyle = `rgba(255,120,40,${pulse})`; context.lineWidth = s(2.2);
                    context.shadowColor = '#ff3d00'; context.shadowBlur = s(10);
                    context.beginPath(); context.arc(0, 0, s(9.6), 0, Math.PI * 2); context.stroke();
                    context.shadowBlur = 0;
                    const core = context.createRadialGradient(0, 0, 0, 0, 0, s(8.5));
                    core.addColorStop(0, 'rgba(255,255,250,0.97)');
                    core.addColorStop(0.45, 'rgba(255,170,80,0.95)');
                    core.addColorStop(1, 'rgba(216,30,0,0.85)');
                    context.fillStyle = core; context.shadowColor = '#ff5722'; context.shadowBlur = s(16 * pulse);
                    context.beginPath(); context.arc(0, 0, s(8.5), 0, Math.PI * 2); context.fill();
                    context.shadowBlur = 0;
                    context.save(); context.rotate(this.animState.spin * 0.5);
                    context.fillStyle = 'rgba(40,0,0,0.88)';
                    context.beginPath(); context.ellipse(0, 0, s(1.9), s(6.6), 0, 0, Math.PI * 2); context.fill();
                    context.fillStyle = `rgba(255,80,40,${0.6 * pulse})`;
                    context.beginPath(); context.ellipse(0, 0, s(0.8), s(5), 0, 0, Math.PI * 2); context.fill();
                    context.restore();
                    context.restore();
                    break;
                }
                const glow = context.createRadialGradient(0, 0, s(6), 0, 0, s(22));
                glow.addColorStop(0, 'rgba(255,241,118,0.9)'); glow.addColorStop(0.6, 'rgba(255,179,0,0.35)'); glow.addColorStop(1, 'rgba(255,109,0,0)');
                context.fillStyle = glow;
                context.beginPath(); context.arc(0, 0, s(22), 0, Math.PI * 2); context.fill();
                context.save(); context.rotate(this.animState.spin);
                context.fillStyle = 'rgba(255,193,7,0.85)'; context.shadowColor = '#ffb300'; context.shadowBlur = s(10);
                for (let i = 0; i < 12; i++) {
                    const a = i / 12 * Math.PI * 2; const len = s(15 + (i % 2) * 5);
                    context.beginPath();
                    context.moveTo(Math.cos(a - 0.06) * s(11), Math.sin(a - 0.06) * s(11));
                    context.lineTo(Math.cos(a) * len, Math.sin(a) * len);
                    context.lineTo(Math.cos(a + 0.06) * s(11), Math.sin(a + 0.06) * s(11));
                    context.closePath(); context.fill();
                }
                context.restore();
                context.save(); context.rotate(-this.animState.spin * 1.6);
                const body = context.createRadialGradient(s(-3), s(-3), s(2), 0, 0, s(12));
                body.addColorStop(0, '#fffde7'); body.addColorStop(0.6, '#ffeb3b'); body.addColorStop(1, '#fb8c00');
                context.fillStyle = body; context.shadowColor = '#ffd54f'; context.shadowBlur = s(14);
                context.beginPath(); context.arc(0, 0, s(12), 0, Math.PI * 2); context.fill();
                context.shadowBlur = 0;
                context.fillStyle = 'rgba(230,81,0,0.5)';
                context.beginPath(); context.arc(s(4), s(-2), s(2.2), 0, Math.PI * 2); context.fill();
                context.beginPath(); context.arc(s(-3), s(4), s(1.6), 0, Math.PI * 2); context.fill();
                context.restore();
                context.restore();
                break;
            }
            case 'gatlingGun':
                if (this.level < 4) {
                    if (this.animState.shakeTime > 0) {
                        this.animState.spin += 0.4;
                    } else {
                        this.animState.spin *= 0.92;
                    }
                    const bg = context.createRadialGradient(0, 0, s(4), 0, 0, s(16));
                    bg.addColorStop(0, '#546e7a'); bg.addColorStop(1, '#1c262b');
                    context.fillStyle = bg; context.strokeStyle = '#0d0d0d'; context.lineWidth = s(2);
                    context.beginPath(); context.arc(0, 0, s(16), 0, Math.PI * 2); context.fill(); context.stroke();
                    if (this.animState.shakeTime > 0) {
                        context.save();
                        context.fillStyle = `rgba(255,213,79,${this.animState.shakeTime / 10})`;
                        context.shadowColor = '#ffca28'; context.shadowBlur = s(12);
                        context.beginPath(); context.moveTo(0, s(-26)); context.lineTo(s(5), s(-12)); context.lineTo(s(-5), s(-12)); context.closePath(); context.fill();
                        context.restore();
                    }
                    context.save(); context.rotate(this.animState.spin);
                    for (let i = 0; i < 6; i++) {
                        const angle = (i / 6) * Math.PI * 2;
                        const bx = Math.cos(angle) * s(8), by = Math.sin(angle) * s(8);
                        const bgr = context.createRadialGradient(bx, by, 0, bx, by, s(5));
                        bgr.addColorStop(0, '#90a4ae'); bgr.addColorStop(1, this.data.color);
                        context.fillStyle = bgr; context.strokeStyle = '#111'; context.lineWidth = s(1);
                        context.beginPath(); context.arc(bx, by, s(5), 0, Math.PI * 2); context.fill(); context.stroke();
                        context.fillStyle = '#0d0d0d'; context.beginPath(); context.arc(bx, by, s(1.8), 0, Math.PI * 2); context.fill();
                    }
                    context.restore();
                    context.fillStyle = '#cfd8dc'; context.strokeStyle = '#111'; context.lineWidth = s(1);
                    context.beginPath(); context.arc(0, 0, s(4), 0, Math.PI * 2); context.fill(); context.stroke();
                } else {
                    const rankThemes = [
                        { main: '#212121', accent: '#757575', energy: '#FFFFFF' },
                        { main: '#37474F', accent: '#B0BEC5', energy: '#E0E0E0' },
                        { main: '#424242', accent: '#FFD700', energy: '#FFF176' },
                        { main: '#BF360C', accent: '#FFB74D', energy: '#FFD180' },
                        { main: '#880E4F', accent: '#F06292', energy: '#FF80AB' },
                        { main: '#D50000', accent: '#FF5252', energy: '#FF8A80' }
                    ];
                    const rankTheme = rankThemes[this.rank];

                    if (this.rank >= 4) {
                        context.save();
                        context.rotate(this.wingRotation + Math.PI / 2);

                        context.save();
                        context.translate(s(-18 - this.rank), 0);
                        if (this.rank === 4) {
                            context.fillStyle = '#455A64';
                            context.beginPath(); context.moveTo(s(-5), s(-15)); context.lineTo(s(5), s(-15)); context.lineTo(s(3), s(15)); context.lineTo(s(-3), s(15)); context.closePath(); context.fill(); context.stroke();
                            context.fillStyle = '#78909C'; context.beginPath(); context.rect(s(-2), s(-20), s(4), s(5)); context.fill(); context.stroke();
                        } else {
                            context.fillStyle = '#212121';
                            context.beginPath(); context.moveTo(s(-8), s(-20)); context.lineTo(s(8), s(-20)); context.lineTo(s(5), s(20)); context.lineTo(s(-5), s(20)); context.closePath(); context.fill(); context.stroke();
                            context.fillStyle = rankTheme.accent; context.beginPath(); context.rect(s(-3), s(-26), s(6), s(6)); context.fill(); context.stroke();
                            context.fillStyle = rankTheme.energy; context.shadowColor = rankTheme.energy; context.shadowBlur = s(5); context.beginPath(); context.rect(s(-1.5), s(-25), s(3), s(3)); context.fill(); context.shadowBlur = 0;
                        }
                        context.restore();

                        context.save();
                        context.translate(s(18 + this.rank), 0);
                        if (this.rank === 4) {
                            context.fillStyle = '#455A64';
                            context.beginPath(); context.moveTo(s(-5), s(-15)); context.lineTo(s(5), s(-15)); context.lineTo(s(3), s(15)); context.lineTo(s(-3), s(15)); context.closePath(); context.fill(); context.stroke();
                            context.fillStyle = '#78909C'; context.beginPath(); context.rect(s(-2), s(-20), s(4), s(5)); context.fill(); context.stroke();
                        } else {
                            context.fillStyle = '#212121';
                            context.beginPath(); context.moveTo(s(-8), s(-20)); context.lineTo(s(8), s(-20)); context.lineTo(s(5), s(20)); context.lineTo(s(-5), s(20)); context.closePath(); context.fill(); context.stroke();
                            context.fillStyle = rankTheme.accent; context.beginPath(); context.rect(s(-3), s(-26), s(6), s(6)); context.fill(); context.stroke();
                            context.fillStyle = rankTheme.energy; context.shadowColor = rankTheme.energy; context.shadowBlur = s(5); context.beginPath(); context.rect(s(-1.5), s(-25), s(3), s(3)); context.fill(); context.shadowBlur = 0;
                        }
                        context.restore();

                        context.restore();
                    }

                    context.fillStyle = rankTheme.main;
                    context.beginPath();
                    context.arc(0, 0, s(18 + this.rank * 1.2), 0, Math.PI * 2);
                    context.fill();
                    context.stroke();

                    context.save();
                    context.rotate(this.animState.spin * -0.5);
                    context.fillStyle = '#1a1a1a';
                    context.beginPath();
                    context.arc(0, 0, s(15 + this.rank), 0, Math.PI * 2);
                    context.fill();
                    context.restore();

                    if (this.animState.shakeTime > 0) {
                        this.animState.spin += 0.5 + this.rank * 0.1;
                    } else {
                        this.animState.spin *= 0.92;
                    }
                    context.save();
                    context.rotate(this.animState.spin);

                    context.fillStyle = rankTheme.accent;
                    const barrelCount = 7;
                    const barrelRadius = s(4 + this.rank * 0.2);
                    const barrelDist = s(10 + this.rank * 0.5);
                    for (let i = 0; i < barrelCount; i++) {
                        const angle = (i / barrelCount) * Math.PI * 2;
                        const bx = Math.cos(angle) * barrelDist;
                        const by = Math.sin(angle) * barrelDist;
                        context.beginPath();
                        context.arc(bx, by, barrelRadius, 0, Math.PI * 2);
                        context.fill();
                        context.stroke();
                    }
                    context.restore();

                    context.save();
                    const corePulse = Math.sin(frameCount * (0.1 + this.rank * 0.02));
                    const coreSize = s(6 + this.rank * 0.8 + corePulse * this.rank * 0.5);
                    const coreGradient = context.createRadialGradient(0, 0, 0, 0, 0, coreSize);
                    coreGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
                    coreGradient.addColorStop(0.5, rankTheme.energy);
                    coreGradient.addColorStop(1, 'rgba(0,0,0,0)');
                    context.fillStyle = coreGradient;
                    context.beginPath();
                    context.arc(0, 0, coreSize, 0, Math.PI * 2);
                    context.fill();

                    if (this.rank >= 2) {
                        context.globalAlpha = 0.5 + Math.sin(frameCount * 0.1) * 0.3;
                        context.lineWidth = s(1 + this.rank * 0.5);
                        context.strokeStyle = rankTheme.energy;
                        context.shadowColor = rankTheme.energy;
                        context.shadowBlur = s(15);
                        for (let i = 0; i < Math.floor(this.rank / 2) + 1; i++) {
                            context.beginPath();
                            const startAngle = frameCount * 0.02 * (i % 2 === 0 ? 1 : -1) + i * Math.PI;
                            const arcLength = Math.PI * 0.5 + (this.rank * 0.1);
                            context.arc(0, 0, s(18 + this.rank), startAngle, startAngle + arcLength);
                            context.stroke();
                        }
                    }
                    context.restore();
                }
                break;
            case 'electricCore': {
                context.save();
                const bg = context.createRadialGradient(0, 0, s(3), 0, 0, s(15));
                bg.addColorStop(0, '#37474f'); bg.addColorStop(1, '#161e22');
                context.fillStyle = bg; context.strokeStyle = '#0d0d0d'; context.lineWidth = s(2);
                context.beginPath(); context.arc(0, 0, s(15), 0, Math.PI * 2); context.fill(); context.stroke();
                context.save(); context.rotate(this.animState.spin);
                context.fillStyle = '#546e7a'; context.strokeStyle = '#263238'; context.lineWidth = s(1);
                for (let i = 0; i < 4; i++) {
                    context.save(); context.rotate(i * Math.PI / 2);
                    context.beginPath(); context.rect(s(-2), s(-14), s(4), s(8)); context.fill(); context.stroke();
                    context.fillStyle = '#90a4ae'; context.beginPath(); context.arc(0, s(-14), s(2.5), 0, Math.PI * 2); context.fill(); context.stroke();
                    context.fillStyle = '#546e7a';
                    context.restore();
                }
                context.restore();
                context.strokeStyle = this.data.color; context.lineWidth = s(2);
                context.shadowColor = this.data.color; context.shadowBlur = s(8);
                context.beginPath(); context.arc(0, 0, s(8), 0, Math.PI * 2); context.stroke();
                const pulse = 0.6 + 0.4 * Math.abs(Math.sin(frameCount * 0.12));
                const core = context.createRadialGradient(0, 0, 0, 0, 0, s(6));
                core.addColorStop(0, '#ffffff'); core.addColorStop(0.5, this.data.color); core.addColorStop(1, 'rgba(77,208,225,0)');
                context.fillStyle = core;
                context.beginPath(); context.arc(0, 0, s(6 * pulse), 0, Math.PI * 2); context.fill();
                context.strokeStyle = `rgba(178,235,242,0.8)`; context.lineWidth = s(1.2);
                for (let i = 0; i < 2; i++) {
                    const a = (frameCount * 0.3 + i * Math.PI) % (Math.PI * 2);
                    context.beginPath(); context.moveTo(0, 0);
                    let lx = 0, ly = 0;
                    for (let j = 0; j < 3; j++) { const r = s(3 + j * 3); const aa = a + (Math.sin(frameCount * 0.5 + j + i) * 0.5); lx = Math.cos(aa) * r; ly = Math.sin(aa) * r; context.lineTo(lx, ly); }
                    context.stroke();
                }
                context.shadowBlur = 0;
                context.restore();
                break;
            }
            case 'tesla':
                if (this.level === 4) {
                    context.save();
                    const bg = context.createRadialGradient(0, 0, s(4), 0, 0, s(22));
                    bg.addColorStop(0, '#37474f'); bg.addColorStop(1, '#11181c');
                    context.fillStyle = bg; context.strokeStyle = '#0a0a0a'; context.lineWidth = s(2.5);
                    context.beginPath(); context.arc(0, 0, s(20), 0, Math.PI * 2); context.fill(); context.stroke();
                    context.save(); context.rotate(this.animState.spin);
                    context.fillStyle = '#455a64'; context.strokeStyle = '#1a1a1a'; context.lineWidth = s(1.5);
                    for (let i = 0; i < 4; i++) {
                        context.save(); context.rotate(i * Math.PI / 2);
                        context.beginPath(); context.moveTo(s(13), s(-5)); context.lineTo(s(24), s(-7)); context.lineTo(s(24), s(7)); context.lineTo(s(13), s(5)); context.closePath(); context.fill(); context.stroke();
                        context.fillStyle = '#b0bec5'; context.beginPath(); context.arc(s(23), 0, s(3.5), 0, Math.PI * 2); context.fill(); context.stroke();
                        context.fillStyle = '#455a64';
                        context.restore();
                    }
                    context.restore();
                    const buffRatio = this.damageBuff;
                    const coreColor = `rgb(${Math.round(0)}, ${Math.round(229 - 150 * buffRatio)}, ${Math.round(255 - 60 * buffRatio)})`;
                    const cg = context.createRadialGradient(0, 0, s(2), 0, 0, s(13));
                    cg.addColorStop(0, 'white'); cg.addColorStop(0.5, coreColor); cg.addColorStop(1, 'rgba(0,0,0,0)');
                    context.fillStyle = cg; context.shadowColor = coreColor; context.shadowBlur = s(10 + buffRatio * 14);
                    context.beginPath(); context.arc(0, 0, s(13), 0, Math.PI * 2); context.fill();
                    context.shadowBlur = 0;
                    if (this.animState.flashTime > 0) {
                        context.strokeStyle = `rgba(255,255,255,${this.animState.flashTime / 10 * 0.85})`; context.lineWidth = s(2 + Math.random() * 2);
                        context.shadowColor = '#80deea'; context.shadowBlur = s(8);
                        for (let i = 0; i < 4; i++) { const sa = Math.random() * Math.PI * 2; const ea = sa + (Math.random() - 0.5) * Math.PI; context.beginPath(); context.arc(0, 0, s(15 + Math.random() * 9), sa, ea); context.stroke(); }
                        context.shadowBlur = 0;
                    }
                    context.restore();
                } else {
                    context.save();
                    const bg = context.createRadialGradient(0, 0, s(3), 0, 0, s(14));
                    bg.addColorStop(0, '#546e7a'); bg.addColorStop(1, '#1c262b');
                    context.fillStyle = bg; context.strokeStyle = '#0a0a0a'; context.lineWidth = s(2);
                    context.beginPath(); context.arc(0, 0, s(14), 0, Math.PI * 2); context.fill(); context.stroke();
                    context.save(); context.rotate(this.animState.spin);
                    context.strokeStyle = '#90a4ae'; context.lineWidth = s(2);
                    for (let i = 0; i < 4; i++) { context.save(); context.rotate(i * Math.PI / 2); context.beginPath(); context.moveTo(0, s(9)); context.lineTo(0, s(15)); context.stroke(); context.fillStyle = '#cfd8dc'; context.beginPath(); context.arc(0, s(15), s(2), 0, Math.PI * 2); context.fill(); context.restore(); }
                    context.restore();
                    const cg = context.createRadialGradient(0, 0, s(1), 0, 0, s(9));
                    cg.addColorStop(0, 'white'); cg.addColorStop(0.6, this.data.color); cg.addColorStop(1, 'rgba(0,229,255,0)');
                    context.fillStyle = cg; context.shadowColor = this.data.color; context.shadowBlur = s(8);
                    context.beginPath(); context.arc(0, 0, s(8), 0, Math.PI * 2); context.fill();
                    context.shadowBlur = 0;
                    context.restore();
                    if (this.animState.flashTime > 0) {
                        context.save();
                        context.strokeStyle = `rgba(178,235,242,${this.animState.flashTime / 10})`; context.lineWidth = s(1.5 + Math.random() * 1.5);
                        for (let i = 0; i < 3; i++) { const sa = Math.random() * Math.PI * 2; context.beginPath(); context.arc(0, 0, s(11 + Math.random() * 6), sa, sa + (Math.random() - 0.5) * Math.PI); context.stroke(); }
                        context.restore();
                    }
                }
                break;
            case 'thiefClaw':
                if (this.level === 4) {
                    context.save();
                    const rotationSpeed = (this.animState.shakeTime > 0) ? 0.08 : 0.01;
                    this.animState.spin = (this.animState.spin || 0) + rotationSpeed;
                    const bg = context.createRadialGradient(0, 0, s(4), 0, 0, s(20));
                    bg.addColorStop(0, '#5a5a5a'); bg.addColorStop(1, '#1f1f1f');
                    context.fillStyle = bg; context.strokeStyle = '#0d0d0d'; context.lineWidth = s(2);
                    context.beginPath();
                    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const x = Math.cos(a) * s(20), y = Math.sin(a) * s(20); i ? context.lineTo(x, y) : context.moveTo(x, y); }
                    context.closePath(); context.fill(); context.stroke();
                    context.rotate(this.animState.spin);
                    let recoilOffset = 0;
                    if (this.animState.shakeTime > 0) recoilOffset = s(Math.sin((this.animState.shakeTime / 5) * Math.PI) * 4);
                    const cg = context.createLinearGradient(s(6), 0, s(22), 0);
                    cg.addColorStop(0, '#fff59d'); cg.addColorStop(1, '#c79100');
                    context.shadowColor = this.data.color; context.shadowBlur = s(10);
                    context.strokeStyle = '#7a5c00'; context.lineWidth = s(1.5);
                    for (let i = 0; i < 3; i++) {
                        context.save(); context.rotate((i / 3) * Math.PI * 2);
                        context.fillStyle = cg;
                        context.beginPath();
                        context.moveTo(s(7), s(-3));
                        context.quadraticCurveTo(s(16), s(10), s(22 + recoilOffset), s(2));
                        context.quadraticCurveTo(s(24 + recoilOffset), s(-2), s(20 + recoilOffset), s(-6));
                        context.quadraticCurveTo(s(14), s(-8), s(7), s(3));
                        context.closePath(); context.fill(); context.stroke();
                        context.restore();
                    }
                    context.shadowBlur = 0;
                    const corePulse = Math.sin(frameCount * 0.1) * 0.5 + 0.5;
                    const g = context.createRadialGradient(0, 0, 0, 0, 0, s(8));
                    g.addColorStop(0, 'white'); g.addColorStop(0.6, `rgba(255,215,0,${0.6 + corePulse * 0.4})`); g.addColorStop(1, 'rgba(255,193,7,0)');
                    context.fillStyle = g;
                    context.beginPath(); context.arc(0, 0, s(8), 0, Math.PI * 2); context.fill();
                    context.restore();
                } else {
                    let recoilOffset = 0;
                    if (this.animState.shakeTime > 0) recoilOffset = s(Math.sin((this.animState.shakeTime / 10) * Math.PI) * 3);
                    const bg = context.createRadialGradient(0, 0, s(3), 0, 0, s(12));
                    bg.addColorStop(0, '#757575'); bg.addColorStop(1, '#2b2b2b');
                    context.fillStyle = bg; context.strokeStyle = '#111'; context.lineWidth = s(2);
                    context.beginPath(); context.arc(0, 0, s(12), 0, Math.PI * 2); context.fill(); context.stroke();
                    const cg = context.createLinearGradient(0, s(-16), 0, 0);
                    cg.addColorStop(0, '#fff59d'); cg.addColorStop(1, '#bfa000');
                    context.fillStyle = cg; context.strokeStyle = '#7a5c00'; context.lineWidth = s(1.5);
                    context.shadowColor = this.data.color; context.shadowBlur = s(6);
                    for (const off of [-1, 0, 1]) {
                        context.save(); context.rotate(off * 0.5); context.translate(0, -recoilOffset);
                        context.beginPath();
                        context.moveTo(s(-2.5), s(-4)); context.lineTo(s(-2), s(-15)); context.lineTo(0, s(-18)); context.lineTo(s(2), s(-15)); context.lineTo(s(2.5), s(-4));
                        context.closePath(); context.fill(); context.stroke();
                        context.restore();
                    }
                    context.shadowBlur = 0;
                    context.fillStyle = '#ffd700'; context.strokeStyle = '#7a5c00';
                    context.beginPath(); context.arc(0, 0, s(4.5), 0, Math.PI * 2); context.fill(); context.stroke();
                    context.fillStyle = '#fff59d'; context.font = `bold ${s(6)}px Arial`; context.textAlign = 'center'; context.textBaseline = 'middle';
                    context.fillText('$', 0, s(0.5));
                }
                break;
            case 'musicStand': {
                context.save();
                for (let i = 0; i < 3; i++) {
                    const phase = (frameCount * 0.015 + i / 3) % 1;
                    context.strokeStyle = `rgba(233,30,99,${(1 - phase) * 0.5})`;
                    context.lineWidth = s(2);
                    context.beginPath(); context.arc(0, 0, s(14) + phase * s(10), 0, Math.PI * 2); context.stroke();
                }
                context.fillStyle = '#2b2b2b'; context.strokeStyle = '#111'; context.lineWidth = s(2);
                context.beginPath(); context.arc(0, 0, s(15), 0, Math.PI * 2); context.fill(); context.stroke();
                context.save(); context.rotate(this.animState.spin);
                const vinyl = context.createRadialGradient(0, 0, s(3), 0, 0, s(13));
                vinyl.addColorStop(0, '#1a1a1a'); vinyl.addColorStop(1, '#000');
                context.fillStyle = vinyl;
                context.beginPath(); context.arc(0, 0, s(13), 0, Math.PI * 2); context.fill();
                context.strokeStyle = 'rgba(120,120,120,0.4)'; context.lineWidth = s(0.7);
                for (let i = 0; i < 5; i++) { context.beginPath(); context.arc(0, 0, s(6 + i * 1.4), 0, Math.PI * 2); context.stroke(); }
                context.fillStyle = this.data.color; context.strokeStyle = '#880e4f';
                context.beginPath(); context.arc(0, 0, s(5), 0, Math.PI * 2); context.fill(); context.stroke();
                context.fillStyle = '#1a1a1a'; context.beginPath(); context.arc(0, 0, s(1.2), 0, Math.PI * 2); context.fill();
                context.fillStyle = 'rgba(255,255,255,0.12)';
                context.beginPath(); context.arc(s(7), s(-7), s(2.5), 0, Math.PI * 2); context.fill();
                context.restore();
                context.strokeStyle = '#9e9e9e'; context.lineWidth = s(2); context.lineCap = 'round';
                context.beginPath(); context.moveTo(s(13), s(-13)); context.lineTo(s(3), s(-4)); context.stroke();
                context.fillStyle = '#cfd8dc'; context.beginPath(); context.arc(s(13), s(-13), s(2), 0, Math.PI * 2); context.fill();
                context.lineCap = 'butt';
                context.restore();
                break;
            }
case 'militaryBase':
    if (this.level === 4) {
        context.save();
        context.fillStyle = '#37474f'; context.strokeStyle = '#111'; context.lineWidth = s(2);
        context.beginPath(); context.rect(s(-20), s(-20), s(40), s(40)); context.fill(); context.stroke();
        context.strokeStyle = '#cfd8dc'; context.lineWidth = s(1.5); context.setLineDash([s(3), s(3)]);
        context.beginPath(); context.moveTo(s(-16), s(-12)); context.lineTo(s(16), s(-12)); context.moveTo(s(-16), s(12)); context.lineTo(s(16), s(12)); context.stroke();
        context.setLineDash([]);
        context.fillStyle = '#4e5d2b';
        for (const [cx, cy] of [[-16, -16], [16, -16], [-16, 16], [16, 16]]) { context.beginPath(); context.arc(s(cx), s(cy), s(3.5), 0, Math.PI * 2); context.fill(); context.stroke(); }
        context.save(); context.rotate(this.animState.spin * 3);
        const sweep = context.createConicGradient ? null : null;
        context.fillStyle = 'rgba(120,230,140,0.18)';
        context.beginPath(); context.moveTo(0, 0); context.arc(0, 0, s(18), -0.5, 0.5); context.closePath(); context.fill();
        context.restore();
        const cg = context.createRadialGradient(0, 0, s(2), 0, 0, s(12));
        cg.addColorStop(0, '#90a4ae'); cg.addColorStop(1, '#455a64');
        context.fillStyle = cg; context.strokeStyle = '#111';
        context.beginPath(); context.arc(0, 0, s(12), 0, Math.PI * 2); context.fill(); context.stroke();
        context.fillStyle = 'gold'; context.shadowColor = 'gold'; context.shadowBlur = s(6);
        context.textAlign = 'center'; context.textBaseline = 'middle'; context.font = `bold ${s(16)}px Arial`;
        context.fillText('★', 0, s(1));
        context.shadowBlur = 0;
        context.restore();
    } else {
        context.save();
        const bg = context.createLinearGradient(0, s(-14), 0, s(14));
        bg.addColorStop(0, '#788047'); bg.addColorStop(1, '#3e4422');
        context.fillStyle = bg; context.strokeStyle = '#1a1a1a'; context.lineWidth = s(2);
        context.beginPath(); context.rect(s(-14), s(-14), s(28), s(28)); context.fill(); context.stroke();
        context.fillStyle = 'rgba(60,70,30,0.6)';
        context.beginPath(); context.arc(s(-7), s(-6), s(4), 0, Math.PI * 2); context.fill();
        context.beginPath(); context.arc(s(8), s(7), s(3.5), 0, Math.PI * 2); context.fill();
        context.save(); context.rotate(this.animState.spin * 3);
        context.fillStyle = 'rgba(120,230,140,0.16)';
        context.beginPath(); context.moveTo(0, 0); context.arc(0, 0, s(13), -0.5, 0.5); context.closePath(); context.fill();
        context.restore();
        context.fillStyle = '#616161'; context.strokeStyle = '#111';
        context.beginPath(); context.arc(0, 0, s(8), 0, Math.PI * 2); context.fill(); context.stroke();
        context.fillStyle = 'gold';
        context.textAlign = 'center'; context.textBaseline = 'middle'; context.font = `bold ${s(12)}px Arial`;
        context.fillText('★', 0, s(0.5));
        context.restore();
    }
    break;
case 'matrix':
    if (this.level === 4) {
        context.save();
        const bg = context.createRadialGradient(0, 0, s(4), 0, 0, s(20));
        bg.addColorStop(0, '#3a1010'); bg.addColorStop(1, '#0d0606');
        context.fillStyle = bg;
        context.strokeStyle = this.data.color;
        context.lineWidth = s(2);
        context.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const x = Math.cos(angle) * s(20);
            const y = Math.sin(angle) * s(20);
            if (i === 0) context.moveTo(x, y); else context.lineTo(x, y);
        }
        context.closePath();
        context.fill();
        context.stroke();

        this.animState.spin = (this.animState.spin || 0) + 0.02;
        context.save();
        context.rotate(this.animState.spin);
        context.strokeStyle = '#FFD700';
        context.lineWidth = s(3);
        context.shadowColor = '#FFD700';
        context.shadowBlur = s(10);
        for (let i = 0; i < 3; i++) {
            context.beginPath();
            const angle = (i / 3) * Math.PI * 2;
            context.arc(0, 0, s(15), angle, angle + Math.PI / 3);
            context.stroke();
        }
        context.restore();
        context.shadowBlur = 0;

        const pulse = Math.sin(frameCount * 0.1) * 0.5 + 0.5;
        const coreGradient = context.createRadialGradient(0, 0, 0, 0, 0, s(8 + pulse * 4));
        const midColor = pulse < 0.5 ? '255, 60, 60' : '255, 215, 0';
        coreGradient.addColorStop(0, `rgba(255, 255, 255, 1)`);
        coreGradient.addColorStop(0.7, `rgba(${midColor}, 0.8)`);
        coreGradient.addColorStop(1, `rgba(${midColor}, 0)`);
        context.fillStyle = coreGradient;
        context.beginPath();
        context.arc(0, 0, s(8 + pulse * 4), 0, Math.PI * 2);
        context.fill();

        context.restore();

    } else {
        const oh = this.isOverheating;
        const bg = context.createLinearGradient(0, s(-13), 0, s(13));
        if (oh) { bg.addColorStop(0, '#5a5a5a'); bg.addColorStop(1, '#2e2e2e'); }
        else { bg.addColorStop(0, '#ef5350'); bg.addColorStop(1, '#7f1414'); }
        context.fillStyle = bg; context.strokeStyle = '#1a0606'; context.lineWidth = s(2);
        context.beginPath();
        context.moveTo(0, s(-14)); context.lineTo(s(13), 0); context.lineTo(0, s(14)); context.lineTo(s(-13), 0);
        context.closePath(); context.fill(); context.stroke();
        context.strokeStyle = oh ? 'rgba(180,180,180,0.5)' : 'rgba(255,205,210,0.7)'; context.lineWidth = s(1);
        for (const d of [-1, 1]) { context.beginPath(); context.moveTo(0, 0); context.lineTo(s(d * 7), s(-7)); context.lineTo(s(d * 7), s(-11)); context.stroke(); }
        if (!oh) { context.shadowColor = '#ff5252'; context.shadowBlur = s(8); }
        context.fillStyle = oh ? '#888' : '#fff3e0';
        context.beginPath(); context.arc(0, 0, s(5), 0, Math.PI * 2); context.fill();
        context.shadowBlur = 0;
        context.fillStyle = oh ? '#666' : '#8B0000';
        context.beginPath(); context.arc(0, 0, s(2.5), 0, Math.PI * 2); context.fill();
    }
    break;
            case 'spotlight': {
                context.save();
                const isEx = this.level === 4;
                const sz = isEx ? 1.18 : 1;
                const baseGrad = context.createRadialGradient(0, 0, s(5), 0, 0, s(21 * sz));
                baseGrad.addColorStop(0, isEx ? '#3a3a3a' : '#424242'); baseGrad.addColorStop(1, '#1a1a1a');
                context.fillStyle = baseGrad; context.strokeStyle = '#0a0a0a'; context.lineWidth = s(2.2);
                context.beginPath();
                for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8; const r = s(20 * sz); const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? context.lineTo(x, y) : context.moveTo(x, y); }
                context.closePath(); context.fill(); context.stroke();
                context.fillStyle = '#111';
                for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8; context.beginPath(); context.arc(Math.cos(a) * s(17 * sz), Math.sin(a) * s(17 * sz), s(1.6), 0, Math.PI * 2); context.fill(); }

                context.strokeStyle = '#2b2b2b'; context.lineWidth = s(2); context.lineCap = 'round';
                for (const [lx, ly] of [[-15, -13], [-19, 12], [-10, 14]]) {
                    context.beginPath(); context.moveTo(lx * sz, ly * sz); context.lineTo(s(-9 * sz), s(-7 * sz)); context.stroke();
                }
                context.fillStyle = '#37474f'; context.strokeStyle = '#111'; context.lineWidth = s(1.2);
                context.beginPath(); context.rect(s(-13 * sz), s(-16 * sz), s(8 * sz), s(6 * sz)); context.fill(); context.stroke();
                context.fillStyle = '#cfd8dc'; context.beginPath(); context.arc(s(-9 * sz), s(-13 * sz), s(2), 0, Math.PI * 2); context.fill();
                context.lineCap = 'butt';

                context.fillStyle = '#263238'; context.strokeStyle = '#111'; context.lineWidth = s(1.2);
                context.beginPath(); context.rect(s(11 * sz), s(-18 * sz), s(10 * sz), s(7 * sz)); context.fill(); context.stroke();
                context.strokeStyle = '#e0e0e0'; context.lineWidth = s(1);
                for (let i = 0; i < 4; i++) { const bx = s(11 * sz) + s(i * 2.5 * sz + 1.2 * sz); context.beginPath(); context.moveTo(bx, s(-18 * sz)); context.lineTo(bx + s(2 * sz), s(-12 * sz)); context.stroke(); }
                context.beginPath(); context.moveTo(s(11 * sz), s(-14.5 * sz)); context.lineTo(s(21 * sz), s(-14.5 * sz)); context.stroke();

                context.strokeStyle = '#333'; context.lineWidth = s(2.5); context.lineCap = 'round';
                context.beginPath(); context.moveTo(s(-7 * sz), s(8 * sz)); context.lineTo(s(-12 * sz), s(17 * sz)); context.stroke();
                context.beginPath(); context.moveTo(s(7 * sz), s(8 * sz)); context.lineTo(s(12 * sz), s(17 * sz)); context.stroke();
                context.lineCap = 'butt';

                const pg = context.createLinearGradient(s(-3), 0, s(3), 0);
                pg.addColorStop(0, '#424242'); pg.addColorStop(0.5, '#9e9e9e'); pg.addColorStop(1, '#424242');
                context.fillStyle = pg; context.strokeStyle = '#111'; context.lineWidth = s(1.5);
                context.beginPath(); context.rect(s(-3), s(-4), s(6), s(12)); context.fill(); context.stroke();
                context.beginPath(); context.arc(0, s(-4), s(5), 0, Math.PI * 2); context.fill(); context.stroke();

                context.save();
                context.rotate(this.rotation + Math.PI / 2);
                const lampR = s(isEx ? 12 : 10);
                context.fillStyle = '#1c1c1c'; context.strokeStyle = '#000'; context.lineWidth = s(1.5);
                context.beginPath();
                context.moveTo(s(-7), s(-6)); context.lineTo(s(7), s(-6));
                context.lineTo(lampR, s(-16)); context.lineTo(s(-lampR), s(-16));
                context.closePath(); context.fill(); context.stroke();
                context.strokeStyle = '#444'; context.lineWidth = s(1);
                for (let i = -5; i <= 5; i += 2) { context.beginPath(); context.moveTo(s(i), s(-7)); context.lineTo(s(i * 1.6), s(-15)); context.stroke(); }
                context.fillStyle = '#333'; context.strokeStyle = '#111'; context.lineWidth = s(1.2);
                context.beginPath(); context.ellipse(0, s(-16), lampR, s(3), 0, 0, Math.PI * 2); context.fill(); context.stroke();
                const bulbPulse = 0.7 + 0.3 * Math.sin(frameCount * 0.2);
                const bulbGrad = context.createRadialGradient(0, s(-15), 0, 0, s(-15), lampR);
                bulbGrad.addColorStop(0, `rgba(255,255,245,${bulbPulse})`);
                bulbGrad.addColorStop(0.5, `rgba(255,241,118,${0.7 * bulbPulse})`);
                bulbGrad.addColorStop(1, 'rgba(255,193,7,0.15)');
                context.fillStyle = bulbGrad;
                context.shadowColor = '#fffde7'; context.shadowBlur = s(isEx ? 14 : 9);
                context.beginPath(); context.ellipse(0, s(-15.5), lampR * 0.8, s(2.2), 0, 0, Math.PI * 2); context.fill();
                context.shadowBlur = 0;
                context.fillStyle = `rgba(255,255,255,${bulbPulse})`;
                context.beginPath(); context.ellipse(0, s(-15.5), s(2.5), s(1.2), 0, 0, Math.PI * 2); context.fill();
                context.restore();

                if (isEx) {
                    context.save();
                    context.strokeStyle = `rgba(255,241,118,${0.3 + 0.2 * Math.sin(frameCount * 0.1)})`;
                    context.lineWidth = s(2); context.shadowColor = '#ffeb3b'; context.shadowBlur = s(8);
                    context.beginPath(); context.arc(0, 0, s(18 * sz), 0, Math.PI * 2); context.stroke();
                    context.shadowBlur = 0;
                    for (let i = 0; i < 6; i++) {
                        const a = i / 6 * Math.PI * 2;
                        const lit = (frameCount * 0.06 + i) % 2 < 1;
                        context.fillStyle = lit ? '#fff176' : '#3a3a20';
                        context.beginPath(); context.arc(Math.cos(a) * s(13 * sz), Math.sin(a) * s(13 * sz), s(1.8), 0, Math.PI * 2); context.fill();
                    }
                    context.restore();
                }
                context.restore();
                break;
            }
            case 'pursuit': {
                context.save();
                const isEx = this.level === 4;
                const sz = isEx ? 1.15 : 1;

                const baseGrad = context.createRadialGradient(0, 0, s(5), 0, 0, s(20 * sz));
                baseGrad.addColorStop(0, '#eceff1'); baseGrad.addColorStop(0.7, '#cfd8dc'); baseGrad.addColorStop(1, '#78909c');
                context.fillStyle = baseGrad; context.strokeStyle = '#37474f'; context.lineWidth = s(2);
                context.beginPath();
                for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8; const r = s(19 * sz); const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? context.lineTo(x, y) : context.moveTo(x, y); }
                context.closePath(); context.fill(); context.stroke();
                context.fillStyle = '#546e7a';
                for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8; context.beginPath(); context.arc(Math.cos(a) * s(16 * sz), Math.sin(a) * s(16 * sz), s(1.5), 0, Math.PI * 2); context.fill(); }

                const recoilOffset = this.animState.recoilTime > 0 ? s(Math.sin((this.animState.recoilTime / 8) * Math.PI) * 3) : 0;
                context.save();
                context.translate(0, recoilOffset);
                for (const dx of [-8, -3, 3, 8]) {
                    const tubeG = context.createLinearGradient(s(dx - 2.5), 0, s(dx + 2.5), 0);
                    tubeG.addColorStop(0, '#90a4ae'); tubeG.addColorStop(0.5, '#eceff1'); tubeG.addColorStop(1, '#546e7a');
                    context.fillStyle = tubeG; context.strokeStyle = '#37474f'; context.lineWidth = s(1);
                    context.beginPath(); context.rect(s(dx - 2.2), s(-15), s(4.4), s(15)); context.fill(); context.stroke();
                    context.fillStyle = '#263238';
                    context.beginPath(); context.ellipse(s(dx), s(-15), s(2.2), s(1.5), 0, 0, Math.PI * 2); context.fill();
                    context.fillStyle = '#fafafa';
                    context.beginPath(); context.ellipse(s(dx), s(-14), s(1.2), s(0.8), 0, 0, Math.PI * 2); context.fill();
                }
                context.restore();

                context.save();
                context.translate(0, s(2));
                context.fillStyle = '#37474f'; context.strokeStyle = '#1a1a1a'; context.lineWidth = s(1.5);
                context.beginPath(); context.arc(0, 0, s(8), 0, Math.PI * 2); context.fill(); context.stroke();
                context.save();
                context.rotate(this.animState.spin * 3);
                const sweepG = context.createConicGradient ? null : null;
                context.fillStyle = 'rgba(255,40,40,0.22)';
                context.beginPath(); context.moveTo(0, 0); context.arc(0, 0, s(7.5), -0.4, 0.4); context.closePath(); context.fill();
                context.strokeStyle = '#ff5252'; context.lineWidth = s(1.5); context.shadowColor = '#ff1744'; context.shadowBlur = s(5);
                context.beginPath(); context.moveTo(0, 0); context.lineTo(s(7.5), 0); context.stroke();
                context.shadowBlur = 0;
                context.restore();
                const pulse = 0.6 + 0.4 * Math.sin(frameCount * 0.2);
                context.fillStyle = `rgba(255,40,40,${pulse})`;
                context.shadowColor = '#ff1744'; context.shadowBlur = s(6 * pulse);
                context.beginPath(); context.arc(0, 0, s(2.5), 0, Math.PI * 2); context.fill();
                context.shadowBlur = 0;
                context.restore();

                context.fillStyle = '#90a4ae'; context.strokeStyle = '#37474f'; context.lineWidth = s(1);
                for (const side of [-1, 1]) {
                    context.beginPath();
                    context.moveTo(s(side * 15 * sz), s(-6)); context.lineTo(s(side * 20 * sz), s(-3));
                    context.lineTo(s(side * 20 * sz), s(8)); context.lineTo(s(side * 15 * sz), s(6));
                    context.closePath(); context.fill(); context.stroke();
                    context.strokeStyle = '#546e7a'; context.lineWidth = s(0.8);
                    for (let i = 0; i < 3; i++) { context.beginPath(); context.moveTo(s(side * 16 * sz), s(-3 + i * 3)); context.lineTo(s(side * 19 * sz), s(-1.5 + i * 3)); context.stroke(); }
                    context.strokeStyle = '#37474f'; context.lineWidth = s(1);
                }

                if (isEx) {
                    context.strokeStyle = `rgba(255,215,0,${0.3 + 0.2 * Math.sin(frameCount * 0.1)})`;
                    context.lineWidth = s(2); context.shadowColor = '#ffd700'; context.shadowBlur = s(8);
                    context.beginPath(); context.arc(0, 0, s(17 * sz), 0, Math.PI * 2); context.stroke();
                    context.shadowBlur = 0;
                    for (let i = 0; i < 4; i++) {
                        const a = i / 4 * Math.PI * 2 + Math.PI / 4;
                        const lit = (frameCount * 0.05 + i) % 2 < 1;
                        context.fillStyle = lit ? '#ff5252' : '#3a1a1a';
                        context.beginPath(); context.arc(Math.cos(a) * s(12 * sz), Math.sin(a) * s(12 * sz), s(1.5), 0, Math.PI * 2); context.fill();
                    }
                }

                if (this.salvoRemaining === 0 && this.reloadTimer > 0 && !this.overloadActive) {
                    const reloadProgress = 1 - this.reloadTimer / this.reloadTime;
                    context.strokeStyle = 'rgba(255,255,255,0.2)'; context.lineWidth = s(3);
                    context.beginPath(); context.arc(0, 0, s(22 * sz), 0, Math.PI * 2); context.stroke();
                    context.strokeStyle = isEx ? '#ffd700' : '#4dd0e1'; context.lineWidth = s(3);
                    context.beginPath(); context.arc(0, 0, s(22 * sz), -Math.PI / 2, -Math.PI / 2 + reloadProgress * Math.PI * 2); context.stroke();
                }

                if (this.overloadActive) {
                    const alarmPulse = 0.5 + 0.5 * Math.sin(frameCount * 0.35);
                    context.save();
                    context.strokeStyle = `rgba(255,40,40,${0.4 + 0.5 * alarmPulse})`;
                    context.lineWidth = s(3); context.shadowColor = '#ff1744'; context.shadowBlur = s(14 * (0.6 + alarmPulse));
                    context.beginPath(); context.arc(0, 0, s(24 * sz), 0, Math.PI * 2); context.stroke();
                    context.strokeStyle = `rgba(255,90,90,${0.2 + 0.3 * alarmPulse})`;
                    context.lineWidth = s(1.5);
                    context.beginPath(); context.arc(0, 0, s(29 * sz), 0, Math.PI * 2); context.stroke();
                    for (let i = 0; i < 4; i++) {
                        const a = i / 4 * Math.PI * 2 + frameCount * 0.04;
                        const lit = (Math.sin(frameCount * 0.35 + i * 1.6) + 1) * 0.5;
                        context.fillStyle = `rgba(255,${30 + lit * 40},${30 + lit * 40},${0.5 + lit * 0.5})`;
                        context.shadowColor = '#ff1744'; context.shadowBlur = s(8 * lit);
                        context.beginPath(); context.arc(Math.cos(a) * s(24 * sz), Math.sin(a) * s(24 * sz), s(2.5), 0, Math.PI * 2); context.fill();
                    }
                    context.shadowBlur = 0;
                    context.restore();
                    for (const sm of this._overloadSmoke) {
                        const a = (sm.life / sm.maxLife) * 0.55;
                        const g = context.createRadialGradient(sm.x, sm.y, 0, sm.x, sm.y, sm.size);
                        g.addColorStop(0, `rgba(245,245,245,${a})`);
                        g.addColorStop(1, 'rgba(220,220,220,0)');
                        context.fillStyle = g;
                        context.beginPath(); context.arc(sm.x, sm.y, sm.size, 0, Math.PI * 2); context.fill();
                    }
                }

                context.restore();
                break;
            }
        }
        context.restore();

        if (context === ctx) {
            context.fillStyle = 'white';
            context.font = `bold ${s(12)}px Arial`;
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            let levelText;
            if (this.type === 'destroyer') {
                if (this.destroyerState === 'active' || this.destroyerState === 'opening' || this.destroyerState === 'closing') {
                    levelText = `${Math.ceil(this.activeTimer / 60)}`;
                } else if (!isTestMode && wave < this.cooldownWave) {
                    levelText = 'CD';
                } else {
                    levelText = '★';
                }
            } else if (this.type === 'gatlingGun' && this.level === 4) {
                levelText = toRoman(this.rank);
                if (this.rank === 0) levelText = 'EX';
            } else {
                levelText = (['arrow', 'cannon', 'blast', 'magic', 'slow', 'tesla','thiefClaw', 'annihilator', 'militaryBase', 'missileSilo', 'matrix', 'spotlight', 'pursuit'].includes(this.type) && this.level === 4) ? 'X' : this.level + 1;
            }
            context.shadowColor = 'black';
            context.shadowBlur = 4;
            context.fillText(levelText, drawX, drawY);
            context.shadowBlur = 0;
        }
    }
    drawRange() {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'; ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; ctx.lineWidth = 2 * scale; ctx.beginPath(); ctx.arc(this.x, this.y, this.rangePixels, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        if (this.type === 'heavyWeapons' && this.missileDamage) {
            const missileRange = this.rangePixels + 3 * TILE_SIZE;
            ctx.save();
            ctx.fillStyle = 'rgba(255, 82, 82, 0.06)'; ctx.strokeStyle = 'rgba(255, 82, 82, 0.5)'; ctx.lineWidth = 2 * scale;
            ctx.setLineDash([8 * scale, 5 * scale]);
            ctx.beginPath(); ctx.arc(this.x, this.y, missileRange, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }
        if (this.type === 'pursuit' && this.sharedVision) {
            for (const t of towers) {
                if (t.type === 'pursuit' && t !== this) {
                    ctx.fillStyle = 'rgba(255, 82, 82, 0.06)'; ctx.strokeStyle = 'rgba(255, 82, 82, 0.35)'; ctx.lineWidth = 1.5 * scale;
                    ctx.setLineDash([6 * scale, 4 * scale]);
                    ctx.beginPath(); ctx.arc(t.x, t.y, t.rangePixels, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                    ctx.setLineDash([]);
                }
            }
        }
    }
    drawSelection() { ctx.save(); ctx.strokeStyle = '#f0a048'; ctx.lineWidth = 3 * scale; const dashOffset = (frameCount % 30) / 30 * (20 * scale); ctx.setLineDash([10 * scale, 10 * scale]); ctx.lineDashOffset = -dashOffset; ctx.beginPath(); ctx.arc(this.x, this.y, TILE_SIZE / 2 + 4 * scale, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
}
