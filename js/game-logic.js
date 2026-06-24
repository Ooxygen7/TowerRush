function toRoman(num) {
    if (num <= 0) return '';
    const map = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V' };
    return map[num] || '';
}

function resizeCanvas() {
    const container = document.getElementById('canvas-container');
    const uiPanel = document.getElementById('ui-panel');
    const width = container.offsetWidth || NATIVE_WIDTH;
    const height = container.offsetHeight || NATIVE_HEIGHT;

    backgroundCanvas.width = canvas.width = NATIVE_WIDTH;
    backgroundCanvas.height = canvas.height = NATIVE_HEIGHT;

    scale = width / NATIVE_WIDTH;
    TILE_SIZE = TILE_SIZE_NATIVE * scale;
    markStrategicStateDirty();

    if (uiPanel.style.display !== 'none') {
        uiPanel.style.height = `${height}px`;
    }

    if (!isTestMode) {
        generatePath();
    }
    for (const t of towers) {
        const gx = Math.floor(t.x / TILE_SIZE_NATIVE);
        const gy = Math.floor(t.y / TILE_SIZE_NATIVE);
        if (gx >= 0 && gx < COLS && gy >= 0 && gy < ROWS && grid[gy][gx] !== 1) {
            grid[gy][gx] = 2;
        }
    }

    drawBackground();

    if (animationFrameId) {
        draw();
    }
}

function generatePath() {
    if (!selectedMap) return;

    grid = Array(ROWS).fill(0).map(() => Array(COLS).fill(0));
    path = [];
    const addedCoords = new Set();
    const addPoint = (c, r) => {
        const key = `${c},${r}`;
        if (c < 0 || c >= COLS || r < 0 || r >= ROWS || addedCoords.has(key)) return;
        grid[r][c] = 1;
        path.push({ x: c * TILE_SIZE + TILE_SIZE / 2, y: r * TILE_SIZE + TILE_SIZE / 2 });
        addedCoords.add(key);
    };

    const pathSegments = MAP_DATA[selectedMap].path;
    for (let i = 0; i < pathSegments.length - 1; i++) {
        let [x1, y1] = pathSegments[i];
        let [x2, y2] = pathSegments[i+1];
        if (x1 === x2) {
            const dir = Math.sign(y2 - y1);
            for (let y = y1; y !== y2 + dir; y += dir) addPoint(x1, y);
        } else if (y1 === y2) {
            const dir = Math.sign(x2 - x1);
            for (let x = x1; x !== x2 + dir; x += dir) addPoint(x, y1);
        }
    reversedPath = [...path].reverse();
    }
}

function spawnWave() {
    if (waveInProgress || isTestMode) return;
    clearSpawnInterval();
    waveInProgress = true;
    wave++;
    markUiDirty();
    const batteries = towers.filter(t => t.type === 'battery');
    const hasFullBatteryGrid = batteries.length === 6 && batteries.every(t => t.level === t.data.levels.length - 1);
    towers.forEach(t => {
        if (t.type === 'battery') {
            const income = t.data.levels[t.level].goldPerWave + (hasFullBatteryGrid ? 240 : 0);
            money += income;
            effects.push(new GoldEffect(t.x, t.y, income));
            t.animState.flashTime = 20;
        }
        if (t.type === 'militaryBase') {
            t.soldierDamageMultiplier *= 1.03;
        }
    });
    if (selectedPlacedTower && selectedPlacedTower.type === 'musicStand') {
        updateTowerInfoPanel();
    }

    if (wave > FINAL_WAVE) {
        waveInProgress = false;
        return;
    }
    startWaveScoreTracking();
    if (wave === FINAL_WAVE) {
        enemies.push(new Enemy(wave, 'boss'));
        bossSpawned = true;
        return;
    }

    let totalEnemies;
    if (wave <= 5) { totalEnemies = 4 + (wave * 2); }
    else if (wave <= 10) { totalEnemies = 6 + (wave * 2); }
    else if (wave <= 20) { totalEnemies = 8 + (wave * 2); }
    else { totalEnemies = 4 + (wave * 2); }

    const replayWavePlan = isReplayMode ? replayPlayback?.wavePlans?.[String(wave)] : null;
    const validEnemyTypes = new Set(['normal', 'shield', 'fast', 'strong', 'summoner']);
    let enemyTypes = Array.isArray(replayWavePlan) && replayWavePlan.length > 0 && replayWavePlan.every(type => validEnemyTypes.has(type))
        ? [...replayWavePlan]
        : null;

    if (!enemyTypes) {
        enemyTypes = [];
        let shieldCount = 0;
        if (wave <= 10) { shieldCount = 1; }
        else if (wave <= 15) { shieldCount = 2; }
        else if (wave <= 20) { shieldCount = 3; }
        else if (wave <= 30) { shieldCount = 4; }

        for (let i = 0; i < shieldCount; i++) enemyTypes.push('shield');
        const fastCount = wave >= 11 ? Math.min(5, Math.floor(totalEnemies * 0.25)) : 0;
        const strongCount = wave >= 21 ? Math.min(5, Math.floor(totalEnemies * 0.25)) : 0;
        for (let i = 0; i < fastCount; i++) enemyTypes.push('fast');
        for (let i = 0; i < strongCount; i++) enemyTypes.push('strong');

        const normalCount = totalEnemies - shieldCount - fastCount - strongCount;
        for (let i = 0; i < normalCount; i++) enemyTypes.push('normal');
        let hasSummoner = false;
        if ([10, 15, 20, 25].includes(wave)) {
            hasSummoner = true;
        }
        for (let i = enemyTypes.length - 1; i > 0; i--) {
            const j = Math.floor(gameRandom() * (i + 1));
            [enemyTypes[i], enemyTypes[j]] = [enemyTypes[j], enemyTypes[i]];
        }
        if (hasSummoner) {
            const idx = enemyTypes.indexOf('summoner');
            if (idx >= 0) enemyTypes.splice(idx, 1);
            enemyTypes.push('summoner');
        }
    } else {
        const hadSummoner = enemyTypes.includes('summoner');
        const shuffleDrawCount = Math.max(0, enemyTypes.length - (hadSummoner ? 2 : 1));
        for (let i = 0; i < shuffleDrawCount; i++) gameRandom();
    }
    if (!isReplayMode && replayRecorder) replayRecorder.wavePlans[String(wave)] = [...enemyTypes];

    pendingEnemyTypes = [...enemyTypes];
    pendingWaveSpawns = pendingEnemyTypes.length;
    spawnFrameCountdown = 30;
}

function updateWaveSpawning() {
    if (pendingWaveSpawns <= 0) return;
    spawnFrameCountdown--;
    if (spawnFrameCountdown > 0) return;

    enemies.push(new Enemy(wave, pendingEnemyTypes.shift()));
    pendingWaveSpawns--;
    spawnFrameCountdown = 30;
    if (pendingWaveSpawns === 0) {
        pendingEnemyTypes = [];
    }
}

function updateAutomaticWaveFlow() {
    if (isTestMode || gameEnded) return;

    if (waveStartCountdown > 0) {
        waveStartCountdown--;
        if (waveStartCountdown === 0) spawnWave();
        return;
    }

    if (!waveInProgress || pendingWaveSpawns > 0) return;
    const enemiesInCurrentWave = enemies.filter(enemy => enemy.wave === wave).length;

    if (wave === FINAL_WAVE) {
        if (enemiesInCurrentWave === 0 && hp > 0) {
            finishWaveScoreTracking();
            gameOver(true);
        }
        return;
    }

    if (enemiesInCurrentWave === 0) {
        finishWaveScoreTracking();
        waveInProgress = false;
        money += 150 + wave * 20;
        markUiDirty();
        updateTowerInfoPanel();
        scheduleWaveStart(NEXT_WAVE_DELAY_FRAMES);
    }
}

function handleUnitCollisions(units) {
    if (isTestMode) return;

    for (const unit of units) {
        if (unit.isFighting) continue;

        for (const enemy of enemies) {
            if (enemy.isFighting) continue;

            const distSq = (unit.x - enemy.x)**2 + (unit.y - enemy.y)**2;
            const collisionDist = (unit.size + enemy.size) / 2;

            if (distSq < collisionDist * collisionDist) {
                unit.isFighting = enemy;
                enemy.isFighting = unit;

                const impactDamage = unit instanceof Tank ? unit.hp * 0.6 : unit.hp;
                if (impactDamage >= enemy.hp) {
                    unit.hp -= enemy.hp;
                    enemy.hp = 0;
                } else {
                    enemy.hp -= impactDamage;
                    unit.hp = 0;
                }

                unit.isFighting = null;
                enemy.isFighting = null;

                break;
            }
        }
        if (unit.hp <= 0) continue;
    }
}

function updateMatrixLinks() {
    const matrixTowers = towers.filter(t => t.type === 'matrix');
    matrixTowers.forEach(t => {
        t.buffs.matrixDamage = 1; t.buffs.matrixSpeed = 1; t.buffs.matrixRange = 0; t.buffs.matrixOverheat = 0;
        t.linkedTowers = [];
        t.groupHasEX = false;
        t.recalculateRange();
    });

    const visited = new Set();
    for (const startNode of matrixTowers) {
        if (visited.has(startNode)) continue;

        const group = [];
        const queue = [startNode];
        visited.add(startNode);

        let head = 0;
        while(head < queue.length) {
            const current = queue[head++];
            group.push(current);

            for (const other of matrixTowers) {
                if (!visited.has(other)) {
                    const distSq = (current.x - other.x)**2 + (current.y - other.y)**2;
                    if (distSq < current.rangePixelsSq) {
                        visited.add(other);
                        queue.push(other);
                    }
                }
            }
        }

        const linkCount = group.length - 1;
        const hasEX = group.some(tower => tower.level === 4);

        if (linkCount > 0) {
            const exDamageBonus = hasEX ? 1.25 : 1.0;
            const exSpeedBonus = hasEX ? 1.15 : 1.0;

            group.forEach(tower => {
                tower.buffs.matrixDamage = (1 + 0.1 * linkCount) * exDamageBonus;
                tower.buffs.matrixSpeed = (1 + 0.1 * linkCount) * exSpeedBonus;
                tower.buffs.matrixRange = 0.2 * linkCount;
                tower.buffs.matrixOverheat = 30 * linkCount;
                if (hasEX) {
                    tower.groupHasEX = true;
                }

                tower.recalculateRange();

                group.forEach(otherInGroup => {
                    if (tower !== otherInGroup) {
                        const distSq = (tower.x - otherInGroup.x)**2 + (tower.y - otherInGroup.y)**2;
                        if (distSq < tower.rangePixelsSq) {
                            tower.linkedTowers.push(otherInGroup);
                        }
                    }
                });
            });
        }
    }
}

function updateStrategicTowerState() {
    towers.forEach(t => { t.buffs.speed = 1; t.buffs.range = 1; t.buffs.discount = 1; t.buffs.damage = 1;});
    updateMatrixLinks();
    const buffTowers = towers.filter(t => t.type === 'electricCore' || t.type === 'musicStand');
    const otherTowers = towers.filter(t => !['electricCore', 'musicStand'].includes(t.type));
    otherTowers.forEach(tower => {
        if (tower.type === 'destroyer') return;
        let bestSpeedBuff = 1.0; let bestRangeBuff = 1.0; let bestDiscount = 1.0;let bestDamageBuff = 1.0;
        buffTowers.forEach(buffTower => {
            if ((tower.x - buffTower.x)**2 + (tower.y - buffTower.y)**2 < buffTower.rangePixelsSq) {
                if (buffTower.type === 'electricCore' && tower.type !== 'pursuit') {
                    const speedBuff = 1 + (buffTower.buff - 1) * (buffTower.skillActiveTimer > 0 ? 3 : 1);
                    bestSpeedBuff = Math.max(bestSpeedBuff, speedBuff);
                }
                else if (buffTower.type === 'musicStand') {
                    if (!(tower.type === 'slow' && tower.level >= 3)) {
                        bestRangeBuff = Math.max(bestRangeBuff, buffTower.rangeBuff);
                    }
                    bestDiscount = Math.min(bestDiscount, buffTower.upgradeDiscount);
                    const damageBuff = buffTower.damageBuff * (buffTower.skillActiveTimer > 0 ? 2 : 1);
                    bestDamageBuff = Math.max(bestDamageBuff, damageBuff);
                }
            }
        });
        tower.buffs.speed = bestSpeedBuff; tower.buffs.range = bestRangeBuff; tower.buffs.discount = bestDiscount; tower.buffs.damage = bestDamageBuff;
        tower.recalculateRange();
    });
    strategicStateDirty = false;
    towerInfoDirty = true;
}

function update() {
    applyReplayActions();
    updateScheduledSimulationEvents();
    if (strategicStateDirty) updateStrategicTowerState();
    updateWaveSpawning();

    towers.forEach(t => t.update());
    enemies.forEach(e => e.update());
    soldiers.forEach(s => s.update());
    tanks.forEach(t => t.update());

    handleUnitCollisions(soldiers);
    handleUnitCollisions(tanks);

    updateAndCompact(projectiles);
    updateAndCompact(soldierProjectiles);
    updateAndCompact(missileProjectiles);
    updateAndCompact(boomerangBlades);
    updateAndCompact(effects);
    compactInPlace(enemies, e => e.hp > 0);
    compactInPlace(soldiers, s => s.hp > 0);
    compactInPlace(tanks, t => t.hp > 0);

    updateAutomaticWaveFlow();
    flushUi();
    flushTowerInfo();
}

function updateDPSDisplays() {
    const now = performance.now();
    damageLog = damageLog.filter(log => now - log.timestamp < 1000);

    const totalDps = damageLog.reduce((sum, log) => sum + log.amount, 0);
    hpDisplay.textContent = `当前总DPS: ${totalDps.toFixed(2)}`;

    if (selectedPlacedTower) {
        const selectedDps = damageLog
            .filter(log => log.towerId === selectedPlacedTower.id)
            .reduce((sum, log) => sum + log.amount, 0);
        waveDisplay.textContent = `该塔当前DPS: ${selectedDps.toFixed(2)}`;
    } else {
        waveDisplay.textContent = '该塔当前DPS: 等待选中';
    }
}
function drawBackground() {
    bgCtx.clearRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
    bgCtx.lineCap = 'round';
    bgCtx.lineJoin = 'round';

    if (!isTestMode && path.length > 0) {
        bgCtx.save();
        bgCtx.scale(scale, scale);
        bgCtx.beginPath();
        for(let i = 0; i < path.length; i++) {
            const p = path[i];
            const nativeX = p.x / scale;
            const nativeY = p.y / scale;
            if (i === 0) bgCtx.moveTo(nativeX, nativeY);
            else bgCtx.lineTo(nativeX, nativeY);
        }
        bgCtx.strokeStyle = '#3d3d3d';
        bgCtx.lineWidth = TILE_SIZE_NATIVE + 4;
        bgCtx.stroke();
        bgCtx.strokeStyle = '#555';
        bgCtx.lineWidth = TILE_SIZE_NATIVE;
        bgCtx.stroke();

        const startNode = path[0];
        const endNode = path[path.length - 1];
        bgCtx.fillStyle = 'rgba(0, 255, 0, 0.3)';
        bgCtx.beginPath();
        bgCtx.arc(startNode.x / scale, startNode.y / scale, TILE_SIZE_NATIVE/2, 0, 2 * Math.PI);
        bgCtx.fill();
        bgCtx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        bgCtx.beginPath();
        bgCtx.arc(endNode.x / scale, endNode.y / scale, TILE_SIZE_NATIVE/2, 0, 2 * Math.PI);
        bgCtx.fill();
        bgCtx.restore();
    }

    bgCtx.save();
    bgCtx.scale(scale, scale);
    bgCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    bgCtx.lineWidth = 1;
    for (let i = 0; i <= COLS; i++) { bgCtx.beginPath(); bgCtx.moveTo(i * TILE_SIZE_NATIVE, 0); bgCtx.lineTo(i * TILE_SIZE_NATIVE, NATIVE_HEIGHT); bgCtx.stroke(); }
    for (let i = 0; i <= ROWS; i++) { bgCtx.beginPath(); bgCtx.moveTo(0, i * TILE_SIZE_NATIVE); bgCtx.lineTo(NATIVE_WIDTH, i * TILE_SIZE_NATIVE); bgCtx.stroke(); }
    bgCtx.restore();
}

function getPathMetrics() {
    const segments = [];
    let totalLength = 0;
    for (let i = 1; i < path.length; i++) {
        const from = path[i - 1], to = path[i];
        const length = Math.hypot(to.x - from.x, to.y - from.y);
        if (length > 0) {
            segments.push({ from, to, length });
            totalLength += length;
        }
    }
    return { segments, totalLength };
}

function getPointAtPathDistance(distance, metrics) {
    if (!metrics || metrics.segments.length === 0) return null;
    let remaining = Math.max(0, Math.min(metrics.totalLength, distance));
    for (const segment of metrics.segments) {
        if (remaining <= segment.length) {
            const t = remaining / segment.length;
            return {
                x: segment.from.x + (segment.to.x - segment.from.x) * t,
                y: segment.from.y + (segment.to.y - segment.from.y) * t,
                angle: Math.atan2(segment.to.y - segment.from.y, segment.to.x - segment.from.x)
            };
        }
        remaining -= segment.length;
    }
    const last = metrics.segments[metrics.segments.length - 1];
    return { x: last.to.x, y: last.to.y, angle: Math.atan2(last.to.y - last.from.y, last.to.x - last.from.x) };
}

function drawWaveDirectionGuide() {
    if (isTestMode || waveStartCountdown <= 0 || waveStartCountdown > DIRECTION_GUIDE_FRAMES || path.length < 2) return;
    const rawProgress = (DIRECTION_GUIDE_FRAMES - waveStartCountdown) / DIRECTION_GUIDE_FRAMES;
    const progress = rawProgress * rawProgress * (3 - 2 * rawProgress);
    const metrics = getPathMetrics();
    if (metrics.totalLength === 0) return;
    const headDistance = metrics.totalLength * progress;
    const tailDistance = Math.max(0, headDistance - 6 * TILE_SIZE);
    const samples = 30;
    const visibleLength = Math.max(1, headDistance - tailDistance);

    const pts = [];
    for (let i = 0; i <= samples; i++) {
        pts.push(getPointAtPathDistance(tailDistance + visibleLength * (i / samples), metrics));
    }

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';
    ctx.lineWidth = TILE_SIZE * 1.45;
    for (let i = 0; i < samples; i++) {
        const from = pts[i], to = pts[i + 1];
        if (!from || !to) continue;
        const fade = (i + 1) / samples;
        ctx.strokeStyle = `rgba(42, 140, 255, ${0.02 + 0.16 * fade * fade})`;
        ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
    }
    ctx.lineWidth = TILE_SIZE * 0.5;
    for (let i = 0; i < samples; i++) {
        const from = pts[i], to = pts[i + 1];
        if (!from || !to) continue;
        const fade = (i + 1) / samples;
        ctx.strokeStyle = `rgba(125, 208, 255, ${0.05 + 0.6 * fade * fade})`;
        ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
    }
    ctx.restore();
}

function drawEffects() {
    if (!useMobilePerformanceProfile()) {
        effects.forEach(e => e.draw());
        return;
    }

    ensureMobileEffectCanvas();
    effectCtx.setTransform(MOBILE_EFFECT_RENDER_SCALE, 0, 0, MOBILE_EFFECT_RENDER_SCALE, 0, 0);
    effectCtx.clearRect(0, 0, NATIVE_WIDTH, NATIVE_HEIGHT);
    effectCtx.globalAlpha = 1;
    effectCtx.globalCompositeOperation = 'source-over';
    effectCtx.imageSmoothingEnabled = false;
    effectCtx.filter = 'none';
    effectCtx.setLineDash([]);

    const mainCtx = ctx;
    ctx = effectCtx;
    try {
        effects.forEach(e => e.draw());
    } finally {
        ctx = mainCtx;
    }

    mainCtx.save();
    mainCtx.imageSmoothingEnabled = false;
    mainCtx.drawImage(effectCanvas, 0, 0, NATIVE_WIDTH, NATIVE_HEIGHT);
    mainCtx.restore();
}

function draw() {
    const nativeRandom = Math.random;
    if (Number.isInteger(visualReplaySeed)) Math.random = makeFrameVisualRandom(visualReplaySeed, frameCount);
    try {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (selectedPlacedTower) {
        selectedPlacedTower.drawRange();
        selectedPlacedTower.drawSelection();
    }
    if (selectedTowerToPlace) {
        drawPlacementPreview();
    }
    drawWaveDirectionGuide();

    projectiles.forEach(p => p.draw());
    soldierProjectiles.forEach(p => p.draw());

    towers.forEach(t => {
        if(t.buffs.speed > 1) {
            const alpha = 0.3 + Math.sin(frameCount * 0.1) * 0.2;
            ctx.fillStyle = `rgba(77, 208, 225, ${alpha})`;
            ctx.beginPath();
            ctx.arc(t.x, t.y, TILE_SIZE / 2, 0, Math.PI * 2);
            ctx.fill();
        }
        if(t.buffs.range > 1) {
            ctx.save();
            ctx.fillStyle = '#e91e63';
            ctx.font = `${16 * scale}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const angle = (frameCount * 0.05) % (Math.PI * 2);
            const radius = TILE_SIZE / 2 + 5 * scale;
            ctx.translate(t.x + Math.cos(angle) * radius, t.y + Math.sin(angle) * radius);
            ctx.rotate(angle + Math.PI / 2); ctx.fillText('♪', 0, 0);
            ctx.restore();
        }
    });

ctx.save();
ctx.globalAlpha = 0.5;
const matrixTowers = towers.filter(t => t.type === 'matrix');
const drawnLinks = new Set();
matrixTowers.forEach(tower => {
    if (tower.groupHasEX) {
        const colorProgress = Math.sin(frameCount * 0.08) * 0.5 + 0.5;
        const hue = colorProgress * 45;
        ctx.strokeStyle = `hsl(${hue}, 100%, 60%)`;
        ctx.lineWidth = (2 + colorProgress) * scale;
        ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
        ctx.shadowBlur = 10 * scale;
    } else {
        ctx.strokeStyle = '#f44336';
        ctx.lineWidth = 2 * scale;
        ctx.shadowBlur = 0;
    }

    tower.linkedTowers.forEach(linked => {
        const key1 = `${tower.id}-${linked.id}`;
        const key2 = `${linked.id}-${tower.id}`;
        if (!drawnLinks.has(key1) && !drawnLinks.has(key2)) {
            ctx.beginPath();
            ctx.moveTo(tower.x, tower.y);
            ctx.lineTo(linked.x, linked.y);
            ctx.stroke();
            drawnLinks.add(key1);
        }
    });
});
ctx.restore();

    towers.forEach(t => t.draw());
    towers.forEach(t => {
        if (t.type === 'sun' && t.currentTargets[0] && t.timeOnTarget > 0) {
            const tgt = t.currentTargets[0];
            const ratio = t.timeOnTarget / t.rampUpTime;
            if (t.level === 4) {
                const hr = (1 + (t.heatFieldRangeBonus || 0)) * TILE_SIZE;
                const pulse = 0.6 + 0.4 * Math.sin(frameCount * 0.2);
                ctx.save();
                const baseG = ctx.createRadialGradient(tgt.x, tgt.y, 0, tgt.x, tgt.y, hr);
                baseG.addColorStop(0, `rgba(255,60,20,${0.28 * pulse})`);
                baseG.addColorStop(1, 'rgba(120,0,0,0)');
                ctx.fillStyle = baseG;
                ctx.beginPath(); ctx.arc(tgt.x, tgt.y, hr, 0, Math.PI * 2); ctx.fill();
                ctx.save();
                ctx.translate(tgt.x, tgt.y);
                ctx.rotate(frameCount * 0.04);
                ctx.lineCap = 'round';
                for (let a = 0; a < 3; a++) {
                    ctx.beginPath();
                    for (let u = 0; u <= 1.0001; u += 0.08) {
                        const ang = a / 3 * Math.PI * 2 + u * Math.PI * 1.7;
                        const rad = u * hr;
                        const px = Math.cos(ang) * rad, py = Math.sin(ang) * rad;
                        u === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
                    }
                    ctx.strokeStyle = `rgba(200,0,0,${0.32 * pulse})`;
                    ctx.lineWidth = 2.5 * scale;
                    ctx.stroke();
                }
                ctx.restore();
                if (t._heatSmoke) {
                    for (const sm of t._heatSmoke) {
                        const a = (sm.life / sm.maxLife) * 0.16;
                        if (a <= 0) continue;
                        const g = ctx.createRadialGradient(sm.x, sm.y, 0, sm.x, sm.y, sm.size);
                        g.addColorStop(0, `rgba(245,245,245,${a})`);
                        g.addColorStop(1, 'rgba(245,245,245,0)');
                        ctx.fillStyle = g;
                        ctx.beginPath(); ctx.arc(sm.x, sm.y, sm.size, 0, Math.PI * 2); ctx.fill();
                    }
                }
                ctx.globalCompositeOperation = 'lighter';
                if (t._heatFlames) {
                    for (const f of t._heatFlames) {
                        const lr = f.life / f.maxLife;
                        const flick = 0.7 + 0.3 * Math.sin(frameCount * 0.5 + f.seed);
                        const r = f.size * (0.6 + lr * 0.6) * flick;
                        ctx.fillStyle = `rgba(255,120,20,${0.35 * lr})`;
                        ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, Math.PI * 2); ctx.fill();
                        ctx.fillStyle = `rgba(255,235,150,${0.55 * lr})`;
                        ctx.beginPath(); ctx.arc(f.x, f.y, r * 0.5, 0, Math.PI * 2); ctx.fill();
                    }
                }
                ctx.restore();

                ctx.save();
                ctx.lineCap = 'round';
                const dx = tgt.x - t.x, dy = tgt.y - t.y;
                const len = Math.hypot(dx, dy) || 1;
                const nx = -dy / len, ny = dx / len;
                ctx.globalCompositeOperation = 'lighter';
                for (let w = 0; w < 3; w++) {
                    const off = Math.sin(frameCount * 0.5 + w * 2) * (3 + ratio * 4) * scale;
                    ctx.strokeStyle = `rgba(183,0,0,${0.16 + ratio * 0.22})`;
                    ctx.lineWidth = (6 + ratio * 10) * scale;
                    ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(tgt.x + nx * off, tgt.y + ny * off); ctx.stroke();
                }
                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = `rgba(213,0,0,${0.5 + ratio * 0.45})`;
                ctx.lineWidth = (4 + ratio * 8) * scale;
                ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(tgt.x, tgt.y); ctx.stroke();
                ctx.strokeStyle = `rgba(255,240,235,${0.6 + ratio * 0.4})`;
                ctx.lineWidth = (1.5 + ratio * 3) * scale;
                ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(tgt.x, tgt.y); ctx.stroke();
                const burst = (3 + ratio * 7) * (0.8 + 0.2 * Math.sin(frameCount * 0.6)) * scale;
                const burstG = ctx.createRadialGradient(tgt.x, tgt.y, 0, tgt.x, tgt.y, burst);
                burstG.addColorStop(0, 'rgba(255,255,245,0.85)');
                burstG.addColorStop(0.4, 'rgba(255,120,40,0.7)');
                burstG.addColorStop(1, 'rgba(213,0,0,0)');
                ctx.fillStyle = burstG;
                ctx.beginPath(); ctx.arc(tgt.x, tgt.y, burst, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            } else {
                ctx.beginPath();
                ctx.moveTo(t.x, t.y);
                ctx.lineTo(tgt.x, tgt.y);
                const beamWidth = (1 + ratio * 4) * scale;
                ctx.lineWidth = beamWidth;
                ctx.strokeStyle = `rgba(255, 235, 59, ${0.2 + ratio * 0.8})`;
                ctx.stroke();
            }
        }
        if (t.type === 'spotlight' && t.currentTargets[0]) {
            const tgt = t.currentTargets[0];
            const isEx = t.level === 4;
            const pulse = 0.7 + 0.3 * Math.sin(frameCount * 0.15);
            const beamAngle = Math.atan2(tgt.y - t.y, tgt.x - t.x);
            const distToTarget = Math.hypot(tgt.x - t.x, tgt.y - t.y) || 1;
            const halfAngle = Math.atan2(t.beamSpread * TILE_SIZE, distToTarget);
            const beamLen = 30 * TILE_SIZE;
            const headX = t.x + Math.cos(beamAngle) * 16 * scale;
            const headY = t.y + Math.sin(beamAngle) * 16 * scale;
            const beamEndX = t.x + Math.cos(beamAngle) * beamLen;
            const beamEndY = t.y + Math.sin(beamAngle) * beamLen;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';

            const fanG = ctx.createLinearGradient(headX, headY, beamEndX, beamEndY);
            fanG.addColorStop(0, `rgba(255,250,220,${0.35 * pulse})`);
            fanG.addColorStop(0.3, `rgba(255,241,118,${0.18 * pulse})`);
            fanG.addColorStop(1, 'rgba(255,193,7,0)');
            ctx.fillStyle = fanG;
            ctx.beginPath();
            ctx.moveTo(headX, headY);
            ctx.arc(t.x, t.y, beamLen, beamAngle - halfAngle, beamAngle + halfAngle);
            ctx.closePath(); ctx.fill();
            const innerHalf = halfAngle * 0.45;
            const fanG2 = ctx.createLinearGradient(headX, headY, beamEndX, beamEndY);
            fanG2.addColorStop(0, `rgba(255,255,250,${0.4 * pulse})`);
            fanG2.addColorStop(0.3, `rgba(255,245,180,${0.18 * pulse})`);
            fanG2.addColorStop(1, 'rgba(255,224,130,0)');
            ctx.fillStyle = fanG2;
            ctx.beginPath();
            ctx.moveTo(headX, headY);
            ctx.arc(t.x, t.y, beamLen, beamAngle - innerHalf, beamAngle + innerHalf);
            ctx.closePath(); ctx.fill();
            ctx.globalCompositeOperation = 'source-over';

            if (isEx) {
                if (!t._spotParticles) t._spotParticles = [];
                for (let k = 0; k < 2; k++) {
                    const prog = Math.random();
                    const perp = (Math.random() - 0.5) * 2 * (prog * beamLen * 0.08);
                    const px = headX + (beamEndX - headX) * prog + Math.cos(beamAngle + Math.PI / 2) * perp;
                    const py = headY + (beamEndY - headY) * prog + Math.sin(beamAngle + Math.PI / 2) * perp;
                    t._spotParticles.push({ x: px, y: py, vx: (Math.random() - 0.5) * 0.6 * scale, vy: -(0.3 + Math.random() * 0.5) * scale, life: 14 + Math.random() * 10, maxLife: 24, size: (1 + Math.random() * 1.8) * scale });
                }
                ctx.globalCompositeOperation = 'lighter';
                for (const p of t._spotParticles) {
                    const a = p.life / p.maxLife;
                    ctx.fillStyle = `rgba(255,255,255,${0.8 * a})`;
                    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = `rgba(255,249,196,${0.4 * a})`;
                    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a * 1.8, 0, Math.PI * 2); ctx.fill();
                }
                ctx.globalCompositeOperation = 'source-over';
                for (const p of t._spotParticles) { p.x += p.vx; p.y += p.vy; p.life--; }
                t._spotParticles = t._spotParticles.filter(p => p.life > 0);
            } else if (t._spotParticles) {
                t._spotParticles.length = 0;
            }
            ctx.restore();
        }
    });

    towers.forEach(t => {
        if (t.type !== 'heavyWeapons') return;
        ctx.save();
        for (const p of t._gatlingSmoke) {
            const a = (p.life / p.maxLife) * 0.35;
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            g.addColorStop(0, `rgba(120,120,120,${a})`);
            g.addColorStop(1, 'rgba(120,120,120,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        }
        for (const p of t._missileExhaust) {
            const a = (p.life / p.maxLife) * 0.4;
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            g.addColorStop(0, `rgba(235,235,235,${a})`);
            g.addColorStop(1, 'rgba(210,210,210,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalCompositeOperation = 'lighter';
        for (const p of t._gatlingFire) {
            const lr = p.life / p.maxLife;
            ctx.fillStyle = `rgba(255,180,40,${0.6 * lr})`;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.6 + lr * 0.6), 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = `rgba(255,245,200,${0.7 * lr})`;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        {
            const dir = t.gatlingRotation;
            const sx = t.x + Math.cos(dir) * 42 * scale;
            const sy = t.y + Math.sin(dir) * 42 * scale;
            const ex = sx + Math.cos(dir) * 3 * TILE_SIZE;
            const ey = sy + Math.sin(dir) * 3 * TILE_SIZE;
            const lg = ctx.createLinearGradient(sx, sy, ex, ey);
            lg.addColorStop(0, 'rgba(255,40,40,0.55)');
            lg.addColorStop(1, 'rgba(255,40,40,0)');
            ctx.strokeStyle = lg;
            ctx.lineWidth = 1 * scale;
            ctx.shadowColor = 'rgba(255,30,30,0.8)'; ctx.shadowBlur = 3 * scale;
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(255,70,70,0.85)';
            ctx.beginPath(); ctx.arc(sx, sy, 1.4 * scale, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    });

    drawEffects();
    enemies.forEach(e => e.draw());
    soldiers.forEach(s => s.draw());
    tanks.forEach(t => t.draw());
    missileProjectiles.forEach(p => p.draw());
    boomerangBlades.forEach(b => b.draw());

    towers.forEach(t => {
        if (t.type !== 'heavyWeapons') return;
        const tgt = t.missileTarget;
        if (!tgt || tgt.hp <= 0) return;
        ctx.save();
        ctx.translate(tgt.x, tgt.y);
        ctx.rotate(frameCount * 0.06);
        const pulse = 0.75 + 0.25 * Math.sin(frameCount * 0.25);
        const r = (tgt.size + 8 * scale) * (0.95 + 0.1 * Math.sin(frameCount * 0.25));
        ctx.strokeStyle = `rgba(255,30,30,${pulse})`;
        ctx.shadowColor = '#ff1744'; ctx.shadowBlur = 6 * scale;
        ctx.lineWidth = 2 * scale;
        for (let i = 0; i < 4; i++) {
            const a0 = i * Math.PI / 2 + 0.3;
            ctx.beginPath();
            ctx.arc(0, 0, r, a0, a0 + Math.PI / 2 - 0.6);
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(-r - 4 * scale, 0); ctx.lineTo(-r + 5 * scale, 0);
        ctx.moveTo(r - 5 * scale, 0); ctx.lineTo(r + 4 * scale, 0);
        ctx.moveTo(0, -r - 4 * scale); ctx.lineTo(0, -r + 5 * scale);
        ctx.moveTo(0, r - 5 * scale); ctx.lineTo(0, r + 4 * scale);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(255,30,30,${pulse})`;
        ctx.beginPath(); ctx.arc(0, 0, 1.6 * scale, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    });
    } finally {
        Math.random = nativeRandom;
    }
}

function runSimulationFrame(timestamp, shouldDraw) {
    if (isPaused) {
        lastFrameTime = timestamp;
        simulationAccumulator = 0;
        if (shouldDraw) draw();
        return;
    }
    if (!lastFrameTime) lastFrameTime = timestamp;
    const elapsed = Math.min(timestamp - lastFrameTime, MAX_FRAME_DELTA_MS);
    lastFrameTime = timestamp;
    simulationAccumulator += elapsed * activeSpeedTable()[gameSpeedIndex];

    let steps = 0;
    while (simulationAccumulator >= FIXED_TIMESTEP_MS && steps < MAX_SIMULATION_STEPS && !gameEnded) {
        frameCount++;
        update();
        if (isTestMode && frameCount % UI_UPDATE_INTERVAL_FRAMES === 0) {
            updateDPSDisplays();
        }
        simulationAccumulator -= FIXED_TIMESTEP_MS;
        steps++;
    }

    if (steps === MAX_SIMULATION_STEPS && simulationAccumulator >= FIXED_TIMESTEP_MS) {
        simulationAccumulator = Math.min(simulationAccumulator, FIXED_TIMESTEP_MS * MAX_SIMULATION_STEPS);
    }

    if (shouldDraw) draw();
}

function gameLoop(timestamp) {
    runSimulationFrame(timestamp, true);
    if (!gameEnded && (hp > 0 || isTestMode)) {
        animationFrameId = requestAnimationFrame(gameLoop);
    } else {
        animationFrameId = null;
    }
}

function stopBackgroundTicker() {
    if (backgroundTicker !== null) {
        clearInterval(backgroundTicker);
        backgroundTicker = null;
    }
}

function startBackgroundTicker() {
    if (backgroundTicker !== null || gameEnded) return;
    lastFrameTime = performance.now();
    backgroundTicker = setInterval(() => {
        if (document.hidden && !gameEnded && (hp > 0 || isTestMode)) {
            runSimulationFrame(performance.now(), false);
        }
    }, 100);
}

function resumeForegroundLoop() {
    stopBackgroundTicker();
    lastFrameTime = performance.now();
    if (!gameEnded && !animationFrameId && (hp > 0 || isTestMode)) {
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        startBackgroundTicker();
    } else {
        resumeForegroundLoop();
    }
});

const moneyDisplay = document.getElementById('money-display');
const hpDisplay = document.getElementById('hp-display');
const waveDisplay = document.getElementById('wave-display');
const towerSelectionDiv = document.getElementById('tower-selection');
const floatingInfoPanel = document.getElementById('floating-info-panel');
const tooltip = document.getElementById('tooltip');
document.body.appendChild(tooltip);
const startWaveBtn = document.getElementById('start-wave-btn');
const speedControls = document.getElementById('speed-controls');
const modal = document.getElementById('modal');
const waveCountdownBubble = document.getElementById('wave-countdown');
const pauseButton = document.getElementById('pause-button');
const settingsButton = document.getElementById('settings-button');
const pauseRow = document.getElementById('pause-row');
const settingsRow = document.getElementById('settings-row');
const quickRestartButton = document.getElementById('quick-restart-btn');
const abandonButton = document.getElementById('abandon-button');
const openSettingsButton = document.getElementById('open-settings-btn');
const preferencesModal = document.getElementById('preferences-modal');
const bgmVolumeInput = document.getElementById('bgm-volume');
const sfxVolumeInput = document.getElementById('sfx-volume');
const bgmVolumeValue = document.getElementById('bgm-volume-value');
const sfxVolumeValue = document.getElementById('sfx-volume-value');

function syncMatchControlVisibility() {
    const hideRestartAndAbandon = isTestMode || isReplayMode;
    quickRestartButton.hidden = hideRestartAndAbandon;
    abandonButton.hidden = hideRestartAndAbandon;
    pauseRow.classList.toggle('single-control', hideRestartAndAbandon);
    settingsRow.classList.toggle('single-control', hideRestartAndAbandon);
}

function syncPauseButton() {
    pauseButton.classList.toggle('is-paused', isPaused);
    pauseButton.setAttribute('aria-pressed', String(isPaused));
    pauseButton.title = isPaused ? '继续游戏' : '暂停游戏';
    pauseButton.querySelector('span').textContent = isPaused ? '继续' : '暂停';
    pauseButton.querySelector('svg').innerHTML = isPaused
        ? '<path fill="currentColor" d="M12 8v32l26-16z"/>'
        : '<path fill="currentColor" d="M10 8h10v32H10zm18 0h10v32H28z"/>';
}

function setGamePaused(paused) {
    if (gameEnded) return;
    isPaused = paused;
    simulationAccumulator = 0;
    lastFrameTime = performance.now();
    syncPauseButton();
}

pauseButton.addEventListener('click', () => setGamePaused(!isPaused));
syncPauseButton();

function syncAudioControls() {
    const bgmValue = Math.round(AudioDirector.getBgmVolume() * 100);
    const sfxValue = Math.round(AudioDirector.getSfxVolume() * 100);
    bgmVolumeInput.value = bgmValue;
    sfxVolumeInput.value = sfxValue;
    bgmVolumeValue.textContent = `${bgmValue}%`;
    sfxVolumeValue.textContent = `${sfxValue}%`;
}

function syncPreferenceControls() {
    document.querySelectorAll('.keybinding-capture').forEach(button => {
        const key = button.dataset.keyBinding;
        button.textContent = shortcutLabel(gamePreferences.keyBindings[key]);
        button.classList.remove('is-capturing');
        button.removeAttribute('aria-label');
    });
    document.querySelectorAll('input[name="tower-detail-mode"]').forEach(input => {
        input.checked = input.value === gamePreferences.towerDetailMode;
    });
}

function openPreferences() {
    syncAudioControls();
    syncPreferenceControls();
    preferencesModal.style.display = 'flex';
}

function closePreferences() {
    preferencesModal.style.display = 'none';
    document.querySelectorAll('.keybinding-capture.is-capturing').forEach(button => button.classList.remove('is-capturing'));
}

settingsButton.addEventListener('click', openPreferences);
openSettingsButton.addEventListener('click', openPreferences);
document.getElementById('preferences-close-x').addEventListener('click', closePreferences);
preferencesModal.addEventListener('click', event => { if (event.target === preferencesModal) closePreferences(); });
window.addEventListener('keydown', event => { if (event.key === 'Escape' && preferencesModal.style.display === 'flex') closePreferences(); });
document.querySelectorAll('input[name="tower-detail-mode"]').forEach(input => input.addEventListener('change', () => {
    if (!input.checked) return;
    gamePreferences.towerDetailMode = input.value;
    saveGamePreferences();
    applyTowerDetailMode();
    syncPreferenceControls();
}));
document.querySelectorAll('.keybinding-capture').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.keybinding-capture.is-capturing').forEach(other => other.classList.remove('is-capturing'));
        button.classList.add('is-capturing');
        button.setAttribute('aria-label', '请按下新的快捷键，按 Escape 取消');
        button.focus();
    });
    button.addEventListener('keydown', event => {
        if (!button.classList.contains('is-capturing')) return;
        event.preventDefault();
        event.stopPropagation();
        if (event.key === 'Escape') {
            syncPreferenceControls();
            return;
        }
        if (event.ctrlKey || event.metaKey || event.altKey || ['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(event.key)) return;
        const key = normalizeShortcut(event.key);
        if (!key) return;
        gamePreferences.keyBindings[button.dataset.keyBinding] = key;
        saveGamePreferences();
        syncPreferenceControls();
    });
});
document.getElementById('restore-shortcuts-btn').addEventListener('click', () => {
    gamePreferences.keyBindings = { ...DEFAULT_KEY_BINDINGS };
    saveGamePreferences();
    syncPreferenceControls();
});
bgmVolumeInput.addEventListener('input', () => {
    const value = Number(bgmVolumeInput.value) / 100;
    AudioDirector.setBgmVolume(value);
    bgmVolumeValue.textContent = `${Math.round(value * 100)}%`;
});
sfxVolumeInput.addEventListener('input', () => {
    const value = Number(sfxVolumeInput.value) / 100;
    AudioDirector.setSfxVolume(value);
    sfxVolumeValue.textContent = `${Math.round(value * 100)}%`;
});
syncAudioControls();
syncPreferenceControls();

function updateWaveCountdownBubble() {
    const isWaitingForWave = !isTestMode && waveStartCountdown > 0 && !gameEnded;
    waveCountdownBubble.classList.toggle('visible', isWaitingForWave);
    if (!isWaitingForWave) return;
    const seconds = Math.ceil(waveStartCountdown / 60);
    waveCountdownBubble.textContent = wave === 0
        ? `距离开始还有 ${seconds} 秒`
        : `距离下一波还有 ${seconds} 秒`;
}

function buildSpeedControls() {
    if (!speedControls) return;
    const speeds = activeSpeedTable();
    speedControls.innerHTML = speeds.map((sp, i) =>
        `<button type="button" class="speed-opt" data-speed-index="${i}" aria-label="速度 ${sp} 倍">${sp}×</button>`
    ).join('');
}
function updateSpeedButton() {
    if (!speedControls) return;
    const btns = speedControls.querySelectorAll('.speed-opt');
    btns.forEach((b, i) => {
        const on = i === gameSpeedIndex;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
}

const skillRail = document.getElementById('skill-rail');
const SKILL_ICONS = {
    'electric-skill': '<svg class="skill-rail-icon" viewBox="0 0 48 48" aria-hidden="true"><path fill="currentColor" d="M28 2 9 27h12l-2 19 20-28H27z"/><path fill="#e7ffff" d="m26 10-8 16h9l-1 9 11-16h-9z"/></svg>',
    'music-skill': '<svg class="skill-rail-icon" viewBox="0 0 48 48" aria-hidden="true"><path fill="currentColor" d="M33 5v26.2a8.5 8.5 0 1 1-4-7.2V13l-14 4v18.2a8.5 8.5 0 1 1-4-7.2V14.1z"/><path fill="#ffe5f0" d="M17 15.6 31 12v4L17 19.6z"/></svg>',
    'pursuit-overload': '<svg class="skill-rail-icon" viewBox="0 0 48 48" aria-hidden="true"><path fill="currentColor" d="M24 4c-2.2 4.4-4.4 9-4.4 15.4 0 4.4 1.1 7.7 2.2 11h4.4c1.1-3.3 2.2-6.6 2.2-11C28.4 13 26.2 8.4 24 4z"/><path fill="#ffcccc" d="M21.6 30.4h4.8l-1.2 7.2h-2.4z"/><path fill="currentColor" d="M17.6 37.6h12.8v3.2H17.6z"/></svg>'
};

function getTowerSkillAction(tower) {
    if (tower.type === 'electricCore' && tower.level >= 1) return { action: 'electric-skill', label: '超频', color: '#4dd0e1' };
    if (tower.type === 'musicStand' && tower.level >= 2) return { action: 'music-skill', label: '电音', color: '#e91e63' };
    if (tower.type === 'pursuit' && tower.level === 4) return { action: 'pursuit-overload', label: '过载', color: '#ff5252' };
    return null;
}

function getAvailableSkillEntries() {
    const entries = towers.map(tower => ({ tower, skill: getTowerSkillAction(tower) })).filter(entry => entry.skill);
    entries.forEach(entry => {
        if (!Number.isFinite(entry.tower.skillUnlockOrder)) entry.tower.skillUnlockOrder = ++skillUnlockSequence;
    });
    return entries.sort((a, b) => a.tower.skillUnlockOrder - b.tower.skillUnlockOrder);
}

function getSkillShortcut(index) {
    return gamePreferences.keyBindings[`skill${index + 1}`] || '';
}

function renderSkillRail() {
    if (!skillRail) return;
    const entries = getAvailableSkillEntries();
    if (entries.length === 0) {
        skillRail.replaceChildren();
        return;
    }
    skillRail.innerHTML = entries.map(({ tower, skill }, index) => {
        const active = tower.skillActiveTimer > 0 || !!tower.overloadActive;
        const cooling = tower.skillCooldown > 0;
        const ready = !cooling;
        const countdown = active ? (tower.overloadActive ? `${tower.overloadMissilesRemaining}发` : Math.ceil(tower.skillActiveTimer / 60)) : Math.ceil(tower.skillCooldown / 60);
        const state = active ? 'active' : ready ? 'ready' : 'cooldown';
        const sameSkillCount = entries.filter(entry => entry.skill.action === skill.action).length;
        const sameSkillIndex = entries.slice(0, index + 1).filter(entry => entry.skill.action === skill.action).length;
        const towerLabel = `${tower.data.name}${sameSkillCount > 1 ? ` ${sameSkillIndex}` : ''}`;
        const hotkey = shortcutLabel(getSkillShortcut(index));
        return `<button type="button" class="skill-rail-slot ${state}" data-skill-tower-id="${tower.id}" data-skill-action="${skill.action}" style="--skill-color:${skill.color}" ${ready ? '' : 'disabled'} aria-label="${towerLabel} ${skill.label}，快捷键 ${hotkey}${ready ? '可用' : `冷却 ${countdown} 秒`}">${SKILL_ICONS[skill.action]}<span class="skill-rail-name">${towerLabel} · ${skill.label} [${hotkey}]</span>${ready ? '' : `<span class="skill-cooldown">${countdown}</span>`}</button>`;
    }).join('');
}

skillRail.addEventListener('pointerdown', event => {
    if (isReplayMode) return;
    const button = event.target.closest('button[data-skill-tower-id]');
    if (!button || button.disabled) return;
    event.preventDefault();
    button.dataset.pointerHandled = 'true';
    const tower = towers.find(item => String(item.id) === button.dataset.skillTowerId);
    activateTowerSkill(tower, button.dataset.skillAction);
});
skillRail.addEventListener('click', event => {
    if (isReplayMode) return;
    const button = event.target.closest('button[data-skill-tower-id]');
    if (!button || button.disabled || button.dataset.pointerHandled === 'true') return;
    activateTowerSkill(towers.find(item => String(item.id) === button.dataset.skillTowerId), button.dataset.skillAction);
});

function isGameShortcutAvailable() {
    if (isReplayMode || gameEnded || gameWrapper.style.display === 'none') return false;
    return !['preferences-modal', 'announcement-modal', 'leaderboard-modal', 'wiki-modal', 'confirm-modal', 'abandon-confirm-modal', 'modal']
        .some(id => document.getElementById(id)?.style.display === 'flex');
}

window.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey || !isGameShortcutAvailable()) return;
    const key = normalizeShortcut(event.key);
    let handled = false;
    if (selectedPlacedTower) {
        if (key === gamePreferences.keyBindings.upgrade) handled = executeTowerPanelAction('upgrade');
        else if (key === gamePreferences.keyBindings.sell) handled = executeTowerPanelAction('sell');
        else if (key === gamePreferences.keyBindings.targetPrevious) handled = executeTowerPanelAction('target-prev');
        else if (key === gamePreferences.keyBindings.targetNext) handled = executeTowerPanelAction('target-next');
    }
    if (!handled) {
        const skillIndex = Array.from({ length: 7 }, (_, index) => index).find(index => key === getSkillShortcut(index));
        if (skillIndex !== undefined) {
            const entry = getAvailableSkillEntries()[skillIndex];
            if (entry) handled = activateTowerSkill(entry.tower, entry.skill.action);
        }
    }
    if (handled) event.preventDefault();
});

speedControls.addEventListener('click', (e) => {
    const b = e.target.closest('.speed-opt');
    if (!b) return;
    const idx = parseInt(b.dataset.speedIndex, 10);
    const speeds = activeSpeedTable();
    if (!Number.isNaN(idx) && idx >= 0 && idx < speeds.length) {
        gameSpeedIndex = idx;
        updateSpeedButton();
    }
});
buildSpeedControls();
updateSpeedButton();

let _uiPrev = { money: null, hp: null, wave: null };
function flashStat(el, cls) {
    if (useMobilePerformanceProfile()) return;
    el.classList.remove('stat-gain', 'stat-loss');
    void el.offsetWidth;
    el.classList.add(cls);
}

function updateUI() {
    updateWaveCountdownBubble();
    const prevMoney = _uiPrev.money;
    moneyDisplay.textContent = `金钱: ${money}`;
    if (prevMoney !== null && money !== prevMoney) flashStat(moneyDisplay, money > prevMoney ? 'stat-gain' : 'stat-loss');
    _uiPrev.money = money;
    if (!isTestMode) {
        const prevHp = _uiPrev.hp, prevWave = _uiPrev.wave;
        hpDisplay.textContent = `基地生命: ${hp}`;
        waveDisplay.textContent = `波次: ${wave}/${FINAL_WAVE}`;
        if (prevHp !== null && hp !== prevHp) flashStat(hpDisplay, hp < prevHp ? 'stat-loss' : 'stat-gain');
        if (prevWave !== null && wave !== prevWave) flashStat(waveDisplay, 'stat-gain');
        _uiPrev.hp = hp; _uiPrev.wave = wave;
    }
    const buttons = towerButtonCache.length ? towerButtonCache : Array.from(document.querySelectorAll('.tower-btn'));
    buttons.forEach(btn => {
        const type = btn.dataset.type;
        const data = TOWER_DATA[type];
        const cost = data.levels[0].cost;
        let limitReached = false;
        if (data.limit) {
            const count = countTowersOfType(type);
            if (count >= data.limit) {
                limitReached = true;
            }
        }
        btn.disabled = money < cost || limitReached;
    });
}

function renderReplayCommandPanel() {
    const replayOutdated = !replayPlayback?.deterministic;
    towerButtonCache = [];
    towerButtonByType = new Map();
    towerSelectionDiv.innerHTML = `<section id="replay-command-panel" role="status" aria-live="polite"><div class="replay-command-loader" aria-hidden="true"><span></span><span></span><span></span></div><div class="replay-command-copy"><h4>代理指挥运行中</h4><p>代理指挥可能出错</p></div>${replayOutdated ? '<p class="replay-command-stale">回放版本过时</p>' : ''}<button id="replay-return-btn" class="action-btn" type="button">← 返回主界面</button></section>`;
    document.getElementById('replay-return-btn').addEventListener('click', returnToSelectionScreen);
}

function setupTowerButtons() {
    if (isReplayMode) {
        renderReplayCommandPanel();
        return;
    }
    towerSelectionDiv.innerHTML = '<div id="tower-buttons-list"></div>';
    const towerButtonsList = document.getElementById('tower-buttons-list');
    towerButtonCache = [];
    towerButtonByType = new Map();
    let pool = selectedTowerPool;
    for (const type of pool) {
        const data = TOWER_DATA[type];
        const btn = document.createElement('button');
        btn.className = 'tower-btn';
        btn.dataset.type = type;

        const canvasEl = document.createElement('canvas');
        canvasEl.className = 'btn-canvas';
        canvasEl.width = 40;
        canvasEl.height = 40;

        const infoDiv = document.createElement('div');
        infoDiv.className = 'btn-info';

        let nameDisplay = data.name;
        if (data.limit) {
            const count = countTowersOfType(type);
            nameDisplay += ` (${count}/${data.limit})`;
        }

        infoDiv.innerHTML = `${nameDisplay} <span class="cost">${data.levels[0].cost}</span>`;

        btn.appendChild(canvasEl);
        btn.appendChild(infoDiv);

        btn.onclick = () => selectTowerToPlace(type);

        btn.onmouseenter = (e) => { tooltip.innerHTML = data.description; tooltip.style.display = 'block'; positionTooltip(e); };
        btn.onmousemove = positionTooltip;
        btn.onmouseleave = () => { tooltip.style.display = 'none'; };

        towerButtonsList.appendChild(btn);
        towerButtonCache.push(btn);
        towerButtonByType.set(type, btn);

        const tempTower = new Tower(canvasEl.width / 2, canvasEl.height / 2, type);
        const btnCtx = canvasEl.getContext('2d');
        tempTower.draw(btnCtx, 0.8);
    }
}

function updateTowerButtonsCount() {
    let pool = selectedTowerPool;
     for (const type of pool) {
        const data = TOWER_DATA[type];
        if (data.limit) {
            const btn = towerButtonByType.get(type) || document.querySelector(`.tower-btn[data-type="${type}"]`);
            if (btn) {
                const infoDiv = btn.querySelector('.btn-info');
                const count = countTowersOfType(type);
                infoDiv.innerHTML = `${data.name} (${count}/${data.limit}) <span class="cost">${data.levels[0].cost}</span>`;
            }
        }
    }
}

function selectTowerToPlace(type) {
    if (isReplayMode) return;
    if (selectedTowerToPlace === type) {
        selectedTowerToPlace = null;
        document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
        updateTowerInfoPanel();
        return;
    }
    const data = TOWER_DATA[type];
    if (data.limit && countTowersOfType(type) >= data.limit) {
        return;
    }
    if (money >= data.levels[0].cost) {
        selectedTowerToPlace = type; selectedPlacedTower = null;
        updateTowerInfoPanel();
        document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
        document.querySelector(`.tower-btn[data-type="${type}"]`).classList.add('selected');
    }
}

function renderTowerTargetSelector(tower, readOnly = false) {
    if (!supportsTargetSelection(tower)) return '';
    const targetIndex = TARGET_MODES.indexOf(tower.targetMode);
    const currentTargetMode = TARGET_MODE_LABELS[tower.targetMode] || TARGET_MODE_LABELS.closest;
    if (readOnly) {
        return `<div class="target-selector target-selector-readonly" aria-label="当前目标模式"><span class="target-selector-label">目标：${currentTargetMode}</span></div>`;
    }
    return `<div class="target-selector" aria-label="目标选择"><button type="button" class="target-cycle" data-tower-action="target-prev" aria-label="上一个目标模式">‹</button><span class="target-selector-label">目标：${currentTargetMode}</span><button type="button" class="target-cycle" data-tower-action="target-next" aria-label="下一个目标模式" data-target-index="${targetIndex}">›</button></div>`;
}

function formatTowerTotalDamage(totalDamage) {
    return Math.max(0, Number(totalDamage) || 0).toLocaleString('zh-CN', { maximumFractionDigits: 1 });
}

function buildTowerInfoHeader(tower, title) {
    const damageHTML = `<span class="tower-total-damage">累计伤害：<span>${formatTowerTotalDamage(tower.totalDamage)}</span></span>`;
    if (isModernTowerDetailMode()) {
        return `<h4><span class="tower-name">${title}</span>${damageHTML}</h4>`;
    }
    return `${damageHTML}<h4>${title}</h4>`;
}

function updateModernPanelPosition() {
    if (!isModernTowerDetailMode() || floatingInfoPanel.style.display === 'none') return;
    const mapFrame = document.getElementById('canvas-container');
    if (!mapFrame) return;
    const rect = mapFrame.getBoundingClientRect();
    floatingInfoPanel.style.setProperty('--modern-panel-left', `${Math.round(rect.left)}px`);
    floatingInfoPanel.style.setProperty('--modern-panel-top', `${Math.round(rect.bottom + MODERN_DETAIL_PANEL_GAP)}px`);
    floatingInfoPanel.style.setProperty('--modern-panel-width', `${Math.round(rect.width)}px`);
}

function applyTowerInfoPresentation(tower) {
    floatingInfoPanel.classList.remove('modern-detail');
    const gameContainer = document.getElementById('game-container');
    if (!isModernTowerDetailMode()) {
        if (gameContainer && floatingInfoPanel.parentElement !== gameContainer) {
            gameContainer.appendChild(floatingInfoPanel);
        }
        return;
    }
    if (floatingInfoPanel.parentElement !== document.body) {
        document.body.appendChild(floatingInfoPanel);
    }
    const actions = Array.from(floatingInfoPanel.children).find(child => child.classList.contains('actions'));
    const detailContent = document.createElement('div');
    detailContent.className = 'modern-detail-content';
    Array.from(floatingInfoPanel.childNodes).forEach(node => {
        if (node !== actions) detailContent.appendChild(node);
    });
    const visual = document.createElement('div');
    visual.className = 'modern-tower-visual';
    const modelCanvas = document.createElement('canvas');
    modelCanvas.width = 128;
    modelCanvas.height = 128;
    const modelCtx = modelCanvas.getContext('2d');
    modelCtx.translate(modelCanvas.width / 2 - tower.x, modelCanvas.height / 2 - tower.y);
    tower.draw(modelCtx, 1.35);
    visual.appendChild(modelCanvas);
    floatingInfoPanel.replaceChildren(visual, detailContent, actions || document.createElement('div'));
    floatingInfoPanel.classList.add('modern-detail');
    updateModernPanelPosition();
}

function updateTowerInfoPanel() {
    if (selectedPlacedTower) {
        const tower = selectedPlacedTower; const level = tower.level;
        const data = tower.data; const currentStats = data.levels[level];
        const savedModernScroll = (floatingInfoPanel.classList.contains('modern-detail')
            ? (floatingInfoPanel.querySelector('.modern-detail-content ul')?.scrollTop || 0)
            : 0);

        if (tower.type === 'destroyer') {
            let infoHTML = `${buildTowerInfoHeader(tower, data.name)}<ul>`;
            infoHTML += `<li>状态: ${translateDestroyerState(tower.destroyerState)}</li>`;
            infoHTML += `<li>激光: 金钱×1.5</li>`;
            infoHTML += `<li>扩散: 金钱×0.05</li>`;
            infoHTML += `<li>射程: ${tower.range}</li>`;
            infoHTML += `<li>攻速: 1/秒</li>`;
            infoHTML += `</ul>`;
            if (isReplayMode) {
                infoHTML += `<div class="actions">${renderTowerTargetSelector(tower, true)}</div>`;
            } else {
                infoHTML += `<div class="actions">`;
            if (supportsTargetSelection(tower)) {
                const targetIndex = TARGET_MODES.indexOf(tower.targetMode);
                const currentTargetMode = TARGET_MODE_LABELS[tower.targetMode] || TARGET_MODE_LABELS.closest;
                infoHTML += `<div class="target-selector" aria-label="目标选择"><button type="button" class="target-cycle" data-tower-action="target-prev" aria-label="上一个目标模式">‹</button><span class="target-selector-label">目标：${currentTargetMode}</span><button type="button" class="target-cycle" data-tower-action="target-next" aria-label="下一个目标模式" data-target-index="${targetIndex}">›</button></div>`;
            }

            let deployBtnHTML;
            if (!isTestMode && wave < tower.cooldownWave) {
                deployBtnHTML = `<button class="action-btn" id="deploy-btn" data-tower-action="deploy" disabled>冷却中 (至第 ${tower.cooldownWave} 波)</button>`;
            } else if (tower.destroyerState === 'closed') {
                deployBtnHTML = `<button class="action-btn" id="deploy-btn" data-tower-action="deploy" ${money <= 0 ? 'disabled' : ''}>部署</button>`;
            } else if (tower.destroyerState === 'active' || tower.destroyerState === 'opening' || tower.destroyerState === 'closing') {
                deployBtnHTML = `<button class="action-btn" id="deploy-btn" data-tower-action="deploy" disabled>攻击中... (${Math.ceil(tower.activeTimer / 60)}s)</button>`;
            }

            infoHTML += deployBtnHTML;
            const isWaveCooldown = !isTestMode && wave < tower.cooldownWave;
            const isActiveState = tower.destroyerState !== 'closed';
            const sellDisabled = isWaveCooldown || isActiveState;

                infoHTML += `<button class="action-btn" id="sell-btn" data-tower-action="sell" ${sellDisabled ? 'disabled' : ''}>出售 (<span class="cost">${tower.sell()}</span>)</button></div>`;
            }

            floatingInfoPanel.innerHTML = infoHTML;

        } else {
            const isExTower = ['arrow', 'cannon', 'blast', 'magic', 'slow', 'gatlingGun', 'tesla', 'thiefClaw', 'annihilator', 'militaryBase', 'missileSilo', 'matrix', 'sun', 'spotlight', 'pursuit', 'boomerang'].includes(tower.type);
            let levelDisplay;
            if (tower.type === 'gatlingGun' && level === 4) {
                levelDisplay = `EX (等阶: ${toRoman(tower.rank) || '0'})`;
            } else {
                levelDisplay = (isExTower && level === 4) ? 'EX' : level + 1;
            }

            let infoHTML = `${buildTowerInfoHeader(tower, `${data.name} (等级 ${levelDisplay})`)}<ul>`;

            Object.keys(currentStats).forEach(stat => {
                if (stat === 'cost' || stat.startsWith('special') || stat === 'overheatDuration' || stat === 'flightTime' || stat === 'burnPercent' || stat === 'bossBurnPercent' || stat === 'critChance' || stat === 'beamSpread' || stat === 'reloadTime' || stat === 'missileCount' || stat === 'sharedVision' || stat === 'reloadSync' || stat === 'missileDamage' || stat === 'missileBlastRadius' || stat === 'missileFireRate' || stat === 'lingerTime') return;
                let statValue = currentStats[stat]; let statText = translateStat(stat);

                if (stat === 'damage' && tower.damage > 0) {
                    let baseDamage = tower.damage;
                    let totalMultiplier = tower.buffs.damage * tower.buffs.matrixDamage;

                    if (tower.type === 'gatlingGun' && tower.level === 4) {
                        const rankDamageBonus = 1 + (tower.rank * 0.05);
                        totalMultiplier *= rankDamageBonus;
                    }

                    if (totalMultiplier > 1.01) {
                        const finalDamage = (baseDamage * totalMultiplier).toFixed(2);
                        statValue = `${baseDamage} <span class="stat-buffed">(${finalDamage})</span>`;
                    } else {
                        statValue = baseDamage;
                    }
                }
                else if (stat === 'range' && !['electricCore', 'musicStand', 'militaryBase', 'battery', 'shrineOfMerit'].includes(tower.type)) {
                     const baseRange = tower.range;
                     const finalRange = (baseRange + tower.buffs.matrixRange) * tower.buffs.range;
                     if (Math.abs(finalRange - baseRange) > 0.01) {
                         const finalRangeDisplay = finalRange.toFixed(2).replace(/\.00$/, '');
                         statValue = `${baseRange} <span class="stat-buffed">(${finalRangeDisplay})</span>`;
                     }
                }
                else if (stat === 'fireRate') {
                    if (['blast', 'slow', 'missileSilo', 'gravityBeacon', 'gamma', 'spotlight', 'boomerang', 'frostPunish'].includes(tower.type)) {
                        statText = '攻击间隔';
                        statValue = `${(tower.fireRate/60).toFixed(2)}s`;
                    } else if (tower.type === 'gatlingGun') {
                        statText = '射速';
                        let baseRoundsPerSecond = (60 / tower.fireRate);
                        let totalMultiplier = tower.buffs.speed * tower.buffs.matrixSpeed;
                         if (tower.level === 4) {
                            const rankSpeedBonus = 1 + (tower.rank * 0.05);
                            totalMultiplier *= rankSpeedBonus;
                        }
                        const finalRoundsPerSecond = baseRoundsPerSecond * totalMultiplier;
                        if (totalMultiplier > 1.01) {
                            statValue = `${baseRoundsPerSecond.toFixed(1)} 轮/秒 <span class="stat-buffed">(${finalRoundsPerSecond.toFixed(1)})</span>`;
                        } else {
                            statValue = `${baseRoundsPerSecond.toFixed(1)} 轮/秒`;
                        }
                    } else if (!['electricCore', 'musicStand', 'militaryBase', 'battery', 'shrineOfMerit'].includes(tower.type)) {
                        statText = '攻击速度';
                        const baseAPS = (60 / tower.fireRate).toFixed(2);
                        const totalMultiplier = tower.buffs.speed * tower.buffs.matrixSpeed;
                        if (totalMultiplier > 1.01) {
                            const finalAPS = (60 / (tower.fireRate / totalMultiplier)).toFixed(2);
                            statValue = `${baseAPS}/s <span class="stat-buffed">(${finalAPS})</span>`;
                        } else {
                            statValue = `${baseAPS}/s`;
                        }
                    }
                }
                else if (stat === 'stun') {
                    statValue += 's';
                } else if (stat === 'slow') {
                    statValue = `${Math.round(statValue * 100)}%`;
                } else if (tower.type === 'thiefClaw' && stat === 'attacksForGold') {
                    infoHTML += `<li>特殊: ${currentStats.attacksForGold}次/+$${currentStats.goldPerProc}</li>`;
                    return;
                } else if (tower.type === 'thiefClaw' && stat === 'goldPerProc') {
                    return;
                } else if (tower.type === 'militaryBase' && stat === 'spawnRate') {
                    statValue = `${(statValue/60).toFixed(1)}s`;
                } else if (tower.type === 'militaryBase' && stat === 'tankSpawnRate') {
                    statValue = `${(statValue/60).toFixed(1)}s`;
                }

                infoHTML += `<li>${statText}: ${statValue}</li>`;
            });

            if (tower.type === 'missileSilo') {
                infoHTML += `<li>巡飞: ${(currentStats.flightTime / 60).toFixed(2)}秒</li>`;
            }
            if (tower.type === 'gamma') {
                 infoHTML += `<li>蔓延: 90%伤害</li>`;
                 infoHTML += `<li><span style="color:gold;">连锁:</span> 同步debuff, 每种+10%伤害</li>`;
            }

            if (tower.type === 'gatlingGun' && tower.level === 4) {
                infoHTML += `<li style="color: gold;">总射击: ${tower.totalShotsFired}</li>`;
                infoHTML += `<li style="color: gold;">下阶: ${tower.rank < tower.maxRank ? 1500 - (tower.totalShotsFired % 1500) : 'MAX'}</li>`;
            }

            if (tower.type === 'arrow' && tower.level === 4) {
                infoHTML += `<li>爆炸箭: 每${currentStats.specialAttackRate}次/30范围伤害</li>`;
                infoHTML += `<li><span style="color:gold;">信号箭:</span> 每${currentStats.specialSignalRate}次→箭雨3秒</li>`;
            }
            if (tower.type === 'cannon') {
                infoHTML += `<li>溅射: 周围1格60%伤害</li>`;
            }
            if (tower.type === 'cannon' && tower.level === 4) {
                infoHTML += `<li><span style="color:gold;">激光:</span> 每${currentStats.specialAttackRate}次, +${currentStats.specialPercentDamage * 100}%当前生命/首领5倍</li>`;
            }
            if (tower.type === 'blast' && tower.level === 4) {
                infoHTML += `<li>多目标: 每敌+(${currentStats.specialMultiplier}×命中数)伤害</li>`;
            }
            if (tower.type === 'magic') {
                infoHTML += `<li>破防: 受伤+15%, 3秒</li>`;
                if (tower.level === 4) {
                    infoHTML += `<li><span style="color:gold;font-weight:bold;">EX:</span> 叠加易伤(50层), 每层+1%受伤</li>`;
                }
            }
            if (tower.type === 'slow' && tower.level === 4) {
                infoHTML += `<li><span style="color:gold;font-weight:bold;">EX:</span> 每5次附加冰寒刻印</li>`;
                infoHTML += `<li><span style="color:gold;font-weight:bold;"></span> 冻结: 普通15层4秒/首领40层2秒</li>`;
            }
            if (tower.type === 'tesla' && tower.level === 4) {
                infoHTML += `<li style="color:gold;font-weight:bold;">伤害加成: +${(tower.damageBuff * 100).toFixed(0)}%</li>`;
            }
            if (tower.type === 'sun' && tower.level === 4) {
                infoHTML += `<li><span style="color:gold;font-weight:bold;">EX:</span> 领域+35%, 邻格+10-40%承伤</li>`;
                infoHTML += `<li>领域内减速-80%, 免疫冰霜刻印</li>`;
            }
            if (tower.type === 'spotlight') {
                if (currentStats.burnPercent) {
                    infoHTML += `<li>燃烧: 0.25秒/${(currentStats.burnPercent * 100).toFixed(1)}%最大生命, 6秒</li>`;
                    infoHTML += `<li>燃烧抗性: 每秒+5%, 上限50%</li>`;
                }
                if (tower.level === 4) {
                    infoHTML += `<li><span style="color:gold;font-weight:bold;">EX:</span> 友方25%暴击(单体2倍/范围1.25倍)</li>`;
                }
            }
            if (tower.type === 'pursuit') {
                infoHTML += `<li>导弹: ${currentStats.missileCount}枚${currentStats.sharedVision ? '/共享视野' : ''}</li>`;
                infoHTML += `<li>装填: ${(currentStats.reloadTime / 60).toFixed(1)}秒</li>`;
                if (tower.overloadActive) {
                    infoHTML += `<li style="color:#ff1744;font-weight:bold;">过载中: 剩余${tower.overloadMissilesRemaining}发</li>`;
                } else if (tower.salvoRemaining === 0 && tower.reloadTimer > 0) {
                    infoHTML += `<li style="color:#4dd0e1;">装填中: ${Math.ceil(tower.reloadTimer / 60)}秒</li>`;
                } else if (tower.salvoRemaining > 0) {
                    infoHTML += `<li style="color:#ff5252;">射击中: 剩余${tower.salvoRemaining}枚</li>`;
                } else {
                    infoHTML += `<li style="color:#4caf50;">就绪</li>`;
                }
                if (tower.level === 4) {
                    if (tower.overloadActive) {
                        infoHTML += `<li style="color:#ff1744;font-weight:bold;">EX过载: ${tower.overloadMissilesRemaining}发/+20%</li>`;
                    } else if (tower.skillCooldown > 0) {
                        infoHTML += `<li style="color:#ff5252;">EX过载冷却: ${Math.ceil(tower.skillCooldown / 60)}秒</li>`;
                    } else {
                        infoHTML += `<li style="color:#ff5252;">EX过载: 就绪(装填同步)</li>`;
                    }
                }
            }
            if (tower.type === 'heavyWeapons') {
                if (currentStats.missileDamage) {
                    const mDmg = tower.missileDamage * tower.buffs.damage * tower.buffs.matrixDamage;
                    const mDmgStr = mDmg > tower.missileDamage + 0.01
                        ? `${tower.missileDamage} <span class="stat-buffed">(${mDmg.toFixed(0)})</span>`
                        : `${tower.missileDamage}`;
                    const effGat = (tower.range + tower.buffs.matrixRange) * tower.buffs.range;
                    const missRange = (effGat + 3).toFixed(2).replace(/\.?0+$/, '');
                    infoHTML += `<li><span style="color:#ff8a80;font-weight:bold;">导弹伤害:</span> ${mDmgStr}</li>`;
                    infoHTML += `<li><span style="color:#ff8a80;">导弹爆炸范围:</span> ${tower.missileBlastRadius}</li>`;
                    infoHTML += `<li><span style="color:#ff8a80;">导弹间隔:</span> ${(tower.missileFireRate / 60).toFixed(2)}s</li>`;
                    infoHTML += `<li><span style="color:#ff8a80;">导弹射程:</span> ${missRange} (锁定最高生命)</li>`;
                }
            }
            if (tower.type === 'boomerang') {
                infoHTML += `<li>停留时长: ${(currentStats.lingerTime / 60).toFixed(1)}s</li>`;
                infoHTML += `<li>飞行命中3次 / 停留每0.175秒</li>`;
                infoHTML += `<li>单刃最多暴击5次</li>`;
                if (tower.level === 4) {
                    infoHTML += `<li><span style="color:gold;font-weight:bold;">EX:</span> 飞行更快；对减速/冰冻/燃烧/眩晕敌人2倍伤害</li>`;
                }
            }
            if (tower.type === 'frostPunish') {
                infoHTML += `<li><span style="color:#4fc3f7;">惩戒:</span> 对被高额减速的敌人触发范围伤害</li>`;
            }
            if (tower.type === 'electricCore') {
                const baseBonus = Math.round((tower.buff - 1) * 100);
                const activeBonus = Math.round(baseBonus * 3);
                infoHTML += `<li>攻速加成: +${tower.skillActiveTimer > 0 ? activeBonus : baseBonus}%</li>`;
                if (tower.level >= 1) infoHTML += `<li>超频: ${tower.skillActiveTimer > 0 ? `生效${Math.ceil(tower.skillActiveTimer / 60)}秒` : tower.skillCooldown > 0 ? `冷却${Math.ceil(tower.skillCooldown / 60)}秒` : '就绪'}</li>`;
            }
            if (tower.type === 'musicStand' && tower.level >= 2) {
                infoHTML += `<li>电音: ${tower.skillActiveTimer > 0 ? `翻倍${Math.ceil(tower.skillActiveTimer / 60)}秒` : tower.skillCooldown > 0 ? `冷却${Math.ceil(tower.skillCooldown / 60)}秒` : '就绪'}</li>`;
            }
            if (tower.type === 'militaryBase') {
                infoHTML += `<li>下批士兵: ${Math.ceil(tower.spawnCooldown / 60)}秒</li>`;
                if (tower.level === 4 && tower.tankSpawnCooldown !== undefined) {
                    infoHTML += `<li>下批坦克: ${Math.ceil(tower.tankSpawnCooldown / 60)}秒</li>`;
                }
            }

            infoHTML += `</ul>`;
            if (isReplayMode) {
                infoHTML += `<div class="actions">${renderTowerTargetSelector(tower, true)}</div>`;
            } else {
                infoHTML += `<div class="actions">`;
            let upgradeButtonHTML = '';
            if (level < data.levels.length - 1) {
                const nextLevelStats = data.levels[level + 1];
                const finalCost = Math.floor(nextLevelStats.cost * tower.buffs.discount);
                let upgradeText = '升级';
                let limitReached = false;
                let specialRequirementMet = true;

                if (tower.type === 'thiefClaw' && level === 3) {
                    const stolenAmount = tower.goldStolen || 0;
                    infoHTML += `<li style="color: gold; font-weight: bold;">累计窃取: ${stolenAmount}/1500</li>`;

                    if (stolenAmount < 1500) {
                        specialRequirementMet = false;
                    }
                }
                if (tower.type === 'pursuit' && level === 3) {
                    const lv4Count = towers.filter(t => t.type === 'pursuit' && t.level >= 3).length;
                    infoHTML += `<li style="color: gold; font-weight: bold;">4级追击: ${lv4Count}/3</li>`;
                    if (lv4Count < 3) {
                        specialRequirementMet = false;
                    }
                }

                if (isExTower && level === 3) {
                    const exCount = towers.filter(t => t.type === tower.type && t.level === 4).length;
                    upgradeText = `EX 升级 (${exCount}/${data.exLimit || '∞'})`;
                    if (data.exLimit && exCount >= data.exLimit) {
                        limitReached = true;
                    }
                }

                const upgradeDisabled = limitReached || !specialRequirementMet || money < finalCost;
                upgradeButtonHTML = `<button class="action-btn" id="upgrade-btn" data-tower-action="upgrade" ${upgradeDisabled ? 'disabled' : ''}>${upgradeText} (<span class="cost">${finalCost}</span>)</button>`;
            }
            const hasMusicSkill = tower.type === 'musicStand' && tower.level >= 2;
            const hasElectricSkill = tower.type === 'electricCore' && tower.level >= 1;
            const hasPursuitOverload = tower.type === 'pursuit' && tower.level === 4;
            if (supportsTargetSelection(tower)) {
                const targetIndex = TARGET_MODES.indexOf(tower.targetMode);
                const currentTargetMode = TARGET_MODE_LABELS[tower.targetMode] || TARGET_MODE_LABELS.closest;
                infoHTML += `<div class="target-selector" aria-label="目标选择"><button type="button" class="target-cycle" data-tower-action="target-prev" aria-label="上一个目标模式">‹</button><span class="target-selector-label">目标：${currentTargetMode}</span><button type="button" class="target-cycle" data-tower-action="target-next" aria-label="下一个目标模式" data-target-index="${targetIndex}">›</button></div>`;
            }
            if (hasMusicSkill) {
                const label = tower.skillActiveTimer > 0 ? `电音生效中 (${Math.ceil(tower.skillActiveTimer / 60)}s)` : tower.skillCooldown > 0 ? `电音冷却 (${Math.ceil(tower.skillCooldown / 60)}s)` : '电音';
                infoHTML += `<button class="action-btn" data-tower-action="music-skill" ${tower.skillCooldown > 0 ? 'disabled' : ''}>${label}</button>`;
            }
            if (hasElectricSkill) {
                const label = tower.skillActiveTimer > 0 ? `超频生效中 (${Math.ceil(tower.skillActiveTimer / 60)}s)` : tower.skillCooldown > 0 ? `超频冷却 (${Math.ceil(tower.skillCooldown / 60)}s)` : '超频';
                infoHTML += `<button class="action-btn" data-tower-action="electric-skill" ${tower.skillCooldown > 0 ? 'disabled' : ''}>${label}</button>`;
            }
            if (hasPursuitOverload) {
                const label = tower.overloadActive ? `过载射击中 (${tower.overloadMissilesRemaining}发)` : tower.skillCooldown > 0 ? `过载冷却 (${Math.ceil(tower.skillCooldown / 60)}s)` : '过载';
                infoHTML += `<button class="action-btn" data-tower-action="pursuit-overload" ${tower.skillCooldown > 0 ? 'disabled' : ''}>${label}</button>`;
            }
            if (upgradeButtonHTML) {
                infoHTML += upgradeButtonHTML;
            } else if (level >= data.levels.length - 1 && !hasMusicSkill && !hasElectricSkill && !hasPursuitOverload) {
                infoHTML += `<button class="action-btn" disabled>MAX</button>`;
            }
                infoHTML += `<button class="action-btn" id="sell-btn" data-tower-action="sell">出售 (<span class="cost">${tower.sell()}</span>)</button></div>`;
            }

            floatingInfoPanel.innerHTML = infoHTML;
        }

        floatingInfoPanel.style.display = 'block';
        applyTowerInfoPresentation(tower);
        if (isModernTowerDetailMode()) {
            if (savedModernScroll) {
                const modernUl = floatingInfoPanel.querySelector('.modern-detail-content ul');
                if (modernUl) modernUl.scrollTop = savedModernScroll;
            }
            return;
        }
        const panelRect = {
            width: floatingInfoPanel.offsetWidth,
            height: floatingInfoPanel.offsetHeight
        };
        const gameContainer = document.getElementById('game-container');
        const gameContainerRect = {
            width: gameContainer.offsetWidth,
            height: gameContainer.offsetHeight
        };

        const towerCanvasX = tower.x; const towerCanvasY = tower.y;
        let panelX = canvas.offsetLeft + towerCanvasX + TILE_SIZE;

        if (panelX + panelRect.width > gameContainerRect.width) { panelX = canvas.offsetLeft + towerCanvasX - panelRect.width - TILE_SIZE; }
        if (panelX < 0) { panelX = canvas.offsetLeft + towerCanvasX + TILE_SIZE; }

        let panelY = canvas.offsetTop + towerCanvasY - panelRect.height / 2;
        panelY = Math.max(0, Math.min(panelY, gameContainerRect.height - panelRect.height));

        floatingInfoPanel.style.left = `${panelX}px`; floatingInfoPanel.style.top = `${panelY}px`;
    } else {
        floatingInfoPanel.classList.remove('modern-detail');
        floatingInfoPanel.style.display = 'none';
    }
}

function activateTowerSkill(tower, action, options = {}) {
    if (isReplayMode && !options.fromReplay) return false;
    if (!tower || !towers.includes(tower)) return false;
    if (action === 'music-skill') {
        if (tower.type !== 'musicStand' || tower.level < 2 || tower.skillCooldown > 0) return false;
        tower.skillCooldown = 60 * 60;
        tower.skillActiveTimer = 4 * 60;
        let towerCount = 0;
        for (const otherTower of towers) {
            if (otherTower.id !== tower.id && (tower.x - otherTower.x) ** 2 + (tower.y - otherTower.y) ** 2 < tower.rangePixelsSq) towerCount++;
        }
        const goldEarned = towerCount * 30;
        if (goldEarned > 0) {
            money += goldEarned;
            effects.push(new GoldEffect(tower.x, tower.y, goldEarned));
        }
        effects.push(new MusicPulseEffect(tower.x, tower.y, tower.rangePixels));
    } else if (action === 'electric-skill') {
        if (tower.type !== 'electricCore' || tower.level < 1 || tower.skillCooldown > 0) return false;
        tower.skillCooldown = 45 * 60;
        tower.skillActiveTimer = 10 * 60;
        effects.push(new ElectricOverloadEffect(tower));
        SFX.play('tesla');
    } else if (action === 'pursuit-overload') {
        if (tower.type !== 'pursuit' || tower.level !== 4 || tower.skillCooldown > 0 || tower.overloadActive) return false;
        tower.skillCooldown = 60 * 60;
        tower.overloadActive = true;
        tower.overloadMissilesRemaining = 50;
        tower.overloadSalvoCooldown = 0;
        tower.overloadMissileCount = 0;
        tower.overloadIdleTimer = 0;
        tower.salvoRemaining = 0;
        tower.pursuitDelayTimer = 0;
        tower._overloadSmoke = [];
        SFX.play('overloadAlarm');
        effects.push(new OverloadAlertEffect(tower.x, tower.y));
    } else {
        return false;
    }
    markStrategicStateDirty();
    if (options.record !== false) recordReplayAction({ type: 'skill', action, ...towerGridPosition(tower) });
    if (selectedPlacedTower === tower) updateTowerInfoPanel();
    flushUi(true);
    return true;
}

function executeTowerPanelAction(action, options = {}) {
    if (isReplayMode && !options.fromReplay) return false;
    const tower = options.tower || selectedPlacedTower;
    if (!tower || !towers.includes(tower)) return false;

    if (action === 'upgrade') {
        if (tower.upgrade({ silentPanel: Boolean(options.silentPanel) })) {
            if (options.record !== false) recordReplayAction({ type: 'upgrade', ...towerGridPosition(tower) });
            flushUi(true);
            return true;
        }
        return false;
    }

    if (action === 'target-prev' || action === 'target-next') {
        if (!supportsTargetSelection(tower)) return false;
        const currentIndex = Math.max(0, TARGET_MODES.indexOf(tower.targetMode));
        const direction = action === 'target-next' ? 1 : -1;
        tower.targetMode = TARGET_MODES[(currentIndex + direction + TARGET_MODES.length) % TARGET_MODES.length];
        tower.currentTargets = [];
        tower.timeOnTarget = 0;
        if (options.record !== false) recordReplayAction({ type: 'target', targetMode: tower.targetMode, ...towerGridPosition(tower) });
        if (!options.silentPanel && selectedPlacedTower === tower) updateTowerInfoPanel();
        return true;
    }

    if (action === 'deploy') {
        if (tower.type !== 'destroyer' || tower.destroyerState !== 'closed' || money <= 0 || (!isTestMode && wave < tower.cooldownWave)) return false;
        tower.deployDamage = money * 1.5;
        money = 0;
        tower.destroyerState = 'opening';
        tower.activeTimer = 30 * 60;
        if (options.record !== false) recordReplayAction({ type: 'deploy', ...towerGridPosition(tower) });
        markUiDirty();
        if (!options.silentPanel && selectedPlacedTower === tower) updateTowerInfoPanel();
        flushUi(true);
        return true;
    }

    if (action === 'music-skill' || action === 'electric-skill' || action === 'pursuit-overload') {
        return activateTowerSkill(tower, action, options);
    }

    if (action === 'sell') {
        if (options.record !== false) recordReplayAction({ type: 'sell', ...towerGridPosition(tower) });
        money += tower.sell();
        towers = towers.filter(item => item !== tower);
        const gridX = Math.floor(tower.x / TILE_SIZE_NATIVE);
        const gridY = Math.floor(tower.y / TILE_SIZE_NATIVE);
        grid[gridY][gridX] = 0;
        markStrategicStateDirty();
        if (selectedPlacedTower === tower) {
            selectedPlacedTower = null;
            if (!options.silentPanel) updateTowerInfoPanel();
        }
        updateTowerButtonsCount();
        flushUi(true);
        return true;
    }
    return false;
}

const handledTowerPanelPointers = new WeakSet();
const mobileTowerPanelActionCooldowns = new Map();
const MOBILE_TOWER_PANEL_ACTION_COOLDOWN_MS = 300;

function isMobileTowerPanelActionCoolingDown(button) {
    if (!useMobilePerformanceProfile()) return false;
    const tower = selectedPlacedTower;
    if (!tower) return false;
    const key = `${tower.id}:${button.dataset.towerAction}`;
    const now = performance.now();
    const lockedUntil = mobileTowerPanelActionCooldowns.get(key) || 0;
    if (now < lockedUntil) return true;
    const nextUnlockAt = now + MOBILE_TOWER_PANEL_ACTION_COOLDOWN_MS;
    mobileTowerPanelActionCooldowns.set(key, nextUnlockAt);
    setTimeout(() => {
        if (mobileTowerPanelActionCooldowns.get(key) === nextUnlockAt) mobileTowerPanelActionCooldowns.delete(key);
    }, MOBILE_TOWER_PANEL_ACTION_COOLDOWN_MS);
    return false;
}

function handleTowerPanelInteraction(event) {
    const button = event.target.closest('button[data-tower-action]');
    if (!button || !floatingInfoPanel.contains(button) || button.disabled) return;
    if (event.type === 'click' && handledTowerPanelPointers.has(button)) {
        handledTowerPanelPointers.delete(button);
        return;
    }
    if (event.type === 'pointerdown') {
        if (isMobileTowerPanelActionCoolingDown(button)) {
            event.preventDefault();
            return;
        }
        handledTowerPanelPointers.add(button);
        setTimeout(() => handledTowerPanelPointers.delete(button), 700);
    }
    event.preventDefault();
    executeTowerPanelAction(button.dataset.towerAction);
}

floatingInfoPanel.addEventListener('pointerdown', handleTowerPanelInteraction);
floatingInfoPanel.addEventListener('click', handleTowerPanelInteraction);

function translateDestroyerState(state) {
    const states = {
        closed: '待机',
        opening: '展开中',
        active: '攻击中',
        closing: '关闭中'
    };
    return states[state] || '未知';
}

function translateStat(stat) {
    const translations = { damage: '伤害', range: '射程', fireRate: '射速', cost: '价格', slow: '减速', blastRadius: '爆炸半径', minDamage: '最小伤害', maxDamage: '最大伤害', rampUpTime: '蓄力时间', buff: '攻速加成', targets: '目标数', stun: '眩晕', attacksForGold: '攻击次数/金钱', goldPerProc: '每次金钱', upgradeDiscount: '升级折扣', rangeBuff: '范围加成', spawnRate: '产生速度', spawnCount: '产生数量', attacksBeforeOverheat: '过热前攻击', shotsPerRound: '每轮射击', goldPerWave: '每波收入', pushback: '推回距离', moneyMultiplier: '额外金钱倍率', baseGold: '基础金钱', tankSpawnRate: '坦克产生速度', tankSpawnCount: '坦克数量',chainTargets: '蔓延目标', chainRadius: '蔓延范围' ,damageBuff: '伤害加成', salvoCount: '连射数量',salvoInterval: '连射间隔',Infinity:'无限', beamSpread: '光束扩散', burnPercent: '燃烧伤害', bossBurnPercent: '首领燃烧伤害', critChance: '暴击几率', reloadTime: '装填时间', missileCount: '导弹数量' };
    return translations[stat] || stat;
}

let mouse = { x: 0, y: 0 };
function getMousePos(canvas, evt) { const rect = canvas.getBoundingClientRect(); const scaleX = canvas.width / rect.width; const scaleY = canvas.height / rect.height; return { x: (evt.clientX - rect.left) * scaleX, y: (evt.clientY - rect.top) * scaleY }; }
canvas.addEventListener('mousemove', e => { mouse = getMousePos(canvas, e); });
canvas.addEventListener('touchstart', e => { if (e.touches && e.touches[0]) mouse = getMousePos(canvas, e.touches[0]); }, { passive: true });
canvas.addEventListener('touchmove', e => { if (e.touches && e.touches[0]) mouse = getMousePos(canvas, e.touches[0]); }, { passive: true });
function cancelTowerPlacementSelection() {
    if (!selectedTowerToPlace) return false;
    selectedTowerToPlace = null;
    document.querySelectorAll('.tower-btn').forEach(button => button.classList.remove('selected'));
    updateTowerInfoPanel();
    return true;
}

function cancelMobilePlacementOutsideMap(event) {
    if (!useMobilePerformanceProfile() || !selectedTowerToPlace || !(event.target instanceof Element)) return;
    if (event.target.closest('#canvas-container, #ui-panel, #floating-info-panel, #skill-rail, #settings-dock')) return;
    cancelTowerPlacementSelection();
}

function cancelReplayTowerInspection() {
    if (!isReplayMode || !selectedPlacedTower) return false;
    selectedPlacedTower = null;
    updateTowerInfoPanel();
    return true;
}

function cancelReplayTowerInspectionOutsideMap(event) {
    if (!isReplayMode || !selectedPlacedTower || !(event.target instanceof Element)) return;
    if (event.target.closest('#canvas-container, #floating-info-panel')) return;
    cancelReplayTowerInspection();
}

document.addEventListener('pointerdown', cancelMobilePlacementOutsideMap, true);
document.addEventListener('pointerdown', cancelReplayTowerInspectionOutsideMap, true);
document.addEventListener('contextmenu', e => {
    e.preventDefault();
    if (cancelReplayTowerInspection()) return;
    if (cancelTowerPlacementSelection()) return;
    if (selectedPlacedTower) {
        selectedPlacedTower = null;
        updateTowerInfoPanel();
    }
});

function placeTowerAtGrid(type, gridX, gridY, record = true) {
    if (!TOWER_DATA[type] || gridX < 0 || gridX >= COLS || gridY < 0 || gridY >= ROWS) return null;
    if (grid[gridY][gridX] !== 0) return null;
    const data = TOWER_DATA[type];
    const cost = data.levels[0].cost;
    if ((data.limit && countTowersOfType(type) >= data.limit) || money < cost) return null;

    money -= cost;
    const tower = new Tower(
        gridX * TILE_SIZE_NATIVE + TILE_SIZE_NATIVE / 2,
        gridY * TILE_SIZE_NATIVE + TILE_SIZE_NATIVE / 2,
        type
    );
    towers.push(tower);
    grid[gridY][gridX] = 2;
    markStrategicStateDirty();
    updateUI();
    updateTowerButtonsCount();
    if (record) recordReplayAction({ type: 'place', towerType: type, x: gridX, y: gridY });
    return tower;
}

canvas.addEventListener('click', e => {
    const pos = getMousePos(canvas, e);
    const gridX = Math.floor(pos.x / TILE_SIZE_NATIVE);
    const gridY = Math.floor(pos.y / TILE_SIZE_NATIVE);

    if (gridX < 0 || gridX >= COLS || gridY < 0 || gridY >= ROWS) return;

    let clickedOnTower = false;
    for (const t of towers) {
        if (Math.hypot(t.x - pos.x, t.y - pos.y) < TILE_SIZE_NATIVE / 2) {
            if (isReplayMode && selectedPlacedTower === t) {
                cancelReplayTowerInspection();
                clickedOnTower = true;
                break;
            }
            selectedPlacedTower = t;
            selectedTowerToPlace = null;
            document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
            updateTowerInfoPanel();
            clickedOnTower = true;
            break;
        }
    }

    if (clickedOnTower) return;

    if (isReplayMode) return;

    if (selectedTowerToPlace) {
        placeTowerAtGrid(selectedTowerToPlace, gridX, gridY);
    } else {
        selectedPlacedTower = null;
        updateTowerInfoPanel();
    }
});

function drawPlacementPreview() {
    const gridX = Math.floor(mouse.x / TILE_SIZE_NATIVE); const gridY = Math.floor(mouse.y / TILE_SIZE_NATIVE);
    if (gridX < 0 || gridX >= COLS || gridY < 0 || gridY >= ROWS) return;
    const centerX = gridX * TILE_SIZE_NATIVE + TILE_SIZE_NATIVE / 2; const centerY = gridY * TILE_SIZE_NATIVE + TILE_SIZE_NATIVE / 2;
    const canPlace = grid[gridY][gridX] === 0;

    ctx.globalAlpha = 0.6;
    const tempTower = new Tower(centerX, centerY, selectedTowerToPlace);
    tempTower.draw();
    if (!canPlace) { ctx.fillStyle = 'rgba(255, 0, 0, 0.4)'; ctx.beginPath(); ctx.arc(centerX, centerY, TILE_SIZE / 2, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1.0;

    const range = TOWER_DATA[selectedTowerToPlace].levels[0].range * TILE_SIZE;
    if (range) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath(); ctx.arc(centerX, centerY, range, 0, Math.PI * 2); ctx.fill();
    }
}

function gameOver(isVictory) {
    gameEnded = true;
    isPaused = false;
    syncPauseButton();
    clearSpawnInterval();
    clearWaveSchedule();
    clearScheduledSimulationEvents();
    clearReplayTowerActionCues();
    stopBackgroundTicker();
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    const modalTitle = document.getElementById('modal-title');
    const modalText = document.getElementById('modal-text');
    const scoreSummary = document.getElementById('score-summary');
    const uploadScoreBtn = document.getElementById('upload-score-btn');
    if (isVictory) {
        lastVictoryResult = finalizeVictoryScore();
        modalTitle.textContent = isReplayMode ? '代理回放完成' : '胜利！';
        modalText.textContent = isReplayMode ? `已自动还原全部 ${wave} 波操作。` : `恭喜你！你成功守住了全部 ${wave} 波攻击！`;
        if (lastVictoryResult) {
            const bonusPercent = Math.round(lastVictoryResult.expertBonus * 100);
            scoreSummary.innerHTML = `<span class="score-total">本局总分：${lastVictoryResult.totalScore.toLocaleString()}</span><div class="score-breakdown"><span>速度分<b>${lastVictoryResult.speedScore.toLocaleString()}</b></span><span>基地分<b>${lastVictoryResult.baseScore.toLocaleString()}</b></span><span>高手倍率<b>+${bonusPercent}%</b></span></div>`;
            scoreSummary.style.display = 'block';
        }
        uploadScoreBtn.style.display = isReplayMode || isTestMode ? 'none' : 'inline-block';
        uploadScoreBtn.disabled = false;
        uploadScoreBtn.textContent = '上传到排行榜';
    } else {
        lastVictoryResult = null;
        modalTitle.textContent = "游戏结束";
        modalText.textContent = `你的基地在第 ${wave} 波被摧毁了。`;
        scoreSummary.style.display = 'none';
        uploadScoreBtn.style.display = 'none';
    }
    modal.style.display = 'flex';
}

function setupTestField() {
    grid = Array(ROWS).fill(0).map(() => Array(COLS).fill(0));
    path = [];
    const dummy = new Enemy(1, 'dummy');
    dummy.x = NATIVE_WIDTH / 2;
    dummy.y = NATIVE_HEIGHT / 2;
    enemies.push(dummy);

    hpDisplay.textContent = '当前总DPS: 0.00';
    waveDisplay.textContent = '该塔当前DPS: 等待选中';
    startWaveBtn.style.display = 'block';
    startWaveBtn.textContent = '退出测试场';
    startWaveBtn.onclick = returnToSelectionScreen;

    moneyInterval = setInterval(() => {
        money += 5000;
    }, 1000);
}

function resetGame() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    clearSpawnInterval();
    clearWaveSchedule();
    clearScheduledSimulationEvents();
    clearReplayTowerActionCues();
    stopBackgroundTicker();
    resetTimingState();
        if (!shieldIconCanvas) {
        shieldIconCanvas = document.createElement('canvas');
        const iconSize = 32;
        shieldIconCanvas.width = iconSize;
        shieldIconCanvas.height = iconSize;
        const shieldCtx = shieldIconCanvas.getContext('2d');

        shieldCtx.shadowColor = 'black';
        shieldCtx.shadowBlur = 4;
        shieldCtx.font = `bold 24px Arial`;
        shieldCtx.textAlign = 'center';
        shieldCtx.textBaseline = 'middle';
        shieldCtx.fillText('🛡️', iconSize / 2, iconSize / 2 + 2);
    }

    if (!bountyMarkIconCanvas) {
        bountyMarkIconCanvas = document.createElement('canvas');
        const iconSize = 32;
        bountyMarkIconCanvas.width = iconSize;
        bountyMarkIconCanvas.height = iconSize;
        const bountyCtx = bountyMarkIconCanvas.getContext('2d');

        bountyCtx.shadowColor = 'black';
        bountyCtx.shadowBlur = 4;
        bountyCtx.font = `bold 24px Arial`;
        bountyCtx.textAlign = 'center';
        bountyCtx.textBaseline = 'middle';
        bountyCtx.fillText('🎯', iconSize / 2, iconSize / 2);
    }
        if (!freezeIconCanvas) {
        freezeIconCanvas = document.createElement('canvas');
        const iconSize = 32;
        freezeIconCanvas.width = iconSize;
        freezeIconCanvas.height = iconSize;
        const freezeCtx = freezeIconCanvas.getContext('2d');
        freezeCtx.shadowColor = '#003366';
        freezeCtx.shadowBlur = 4;
        freezeCtx.font = `bold 24px Arial`;
        freezeCtx.textAlign = 'center';
        freezeCtx.textBaseline = 'middle';
        freezeCtx.fillText('❄️', iconSize / 2, iconSize / 2 + 1);
    }
    if (moneyInterval) clearInterval(moneyInterval);
    moneyInterval = null;

    money = 2000; hp = 3; wave = 0;
    _uiPrev = { money: null, hp: null, wave: null };
    enemies = []; towers = []; projectiles = []; effects = []; soldiers = []; soldierProjectiles = []; missileProjectiles = [];boomerangBlades = [];reversedPath = [];tanks = [];
    selectedTowerToPlace = null; selectedPlacedTower = null; waveInProgress = false; frameCount = 0;
    bossSpawned = false;
    gameEnded = false;
    skillUnlockSequence = 0;
    isPaused = false;
    syncPauseButton();
    gameSpeedIndex = isReplayMode ? 0 : 1;
    buildSpeedControls();
    updateSpeedButton();
    strategicStateDirty = true;
    uiDirty = true;
    towerInfoDirty = false;
    damageLog = [];
    beginMatchTracking();

    resizeCanvas();

    if (isTestMode) {
        setupTestField();
    } else {
        hpDisplay.textContent = `基地生命: ${hp}`;
        waveDisplay.textContent = `波次: ${wave}/${FINAL_WAVE}`;
        startWaveBtn.style.display = 'none';
        scheduleWaveStart(FIRST_WAVE_DELAY_FRAMES);
    }

    setupTowerButtons();
    updateTowerInfoPanel();
    modal.style.display = 'none';

    if (hp > 0 || isTestMode) {
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}
