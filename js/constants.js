const backgroundCanvas = document.getElementById('backgroundCanvas');
const bgCtx = backgroundCanvas.getContext('2d');
const canvas = document.getElementById('gameCanvas');
let ctx = canvas.getContext('2d');
const effectCanvas = document.createElement('canvas');
const effectCtx = effectCanvas.getContext('2d');

const NATIVE_WIDTH = 1000;
const NATIVE_HEIGHT = 720;
const TILE_SIZE_NATIVE = 40;
let TILE_SIZE = TILE_SIZE_NATIVE;
let scale = 1;
const COLS = NATIVE_WIDTH / TILE_SIZE_NATIVE;
const ROWS = NATIVE_HEIGHT / TILE_SIZE_NATIVE;

let money, hp, wave, enemies, towers, projectiles, grid, path = [], effects, soldiers, soldierProjectiles, missileProjectiles, boomerangBlades;
let tanks;
let selectedTowerToPlace, selectedPlacedTower, waveInProgress, frameCount = 0, bossSpawned;
let shieldIconCanvas = null;
let bountyMarkIconCanvas = null;
let freezeIconCanvas = null;
let selectedTowerPool = [];
let selectedMap = null;
const FINAL_WAVE = 30;
let animationFrameId = null;
let gameEnded = false;
let isPaused = false;
let lastFrameTime = 0;
let simulationAccumulator = 0;
const FIXED_TIMESTEP_MS = 1000 / 60;
const MAX_FRAME_DELTA_MS = 1000;
const MAX_SIMULATION_STEPS = 300;
const UI_UPDATE_INTERVAL_FRAMES = 6;
const LOCKED_GAME_SCALE = 1;
const GAME_STAGE_BASE_WIDTH = 1560;
const GAME_STAGE_BASE_HEIGHT = 720;
const GAME_STAGE_MARGIN = 24;
const MODERN_DETAIL_PANEL_HEIGHT = 180;
const MODERN_DETAIL_PANEL_GAP = 20;
const MODERN_DETAIL_RESERVED_HEIGHT = MODERN_DETAIL_PANEL_HEIGHT + MODERN_DETAIL_PANEL_GAP;
const MOBILE_EFFECT_RENDER_SCALE = 0.5;
const mobilePerformanceMedia = window.matchMedia('(pointer: coarse) and (max-width: 1024px)');

function useMobilePerformanceProfile() {
    return mobilePerformanceMedia.matches;
}

function ensureMobileEffectCanvas() {
    const width = Math.ceil(NATIVE_WIDTH * MOBILE_EFFECT_RENDER_SCALE);
    const height = Math.ceil(NATIVE_HEIGHT * MOBILE_EFFECT_RENDER_SCALE);
    if (effectCanvas.width !== width || effectCanvas.height !== height) {
        effectCanvas.width = width;
        effectCanvas.height = height;
    }
}
let strategicStateDirty = true;
let uiDirty = true;
let towerInfoDirty = false;
let lastUiUpdateFrame = -Infinity;
let lastTowerInfoUpdateFrame = -Infinity;
let pendingWaveSpawns = 0;
let pendingEnemyTypes = [];
let spawnFrameCountdown = 0;
let waveStartCountdown = 0;
const FIRST_WAVE_DELAY_FRAMES = 600;
const NEXT_WAVE_DELAY_FRAMES = 300;
const DIRECTION_GUIDE_FRAMES = 300;
const GAME_SPEEDS = [0.5, 1, 2, 4];
const REPLAY_SPEEDS = [1, 4, 8, 16];
function activeSpeedTable() { return isReplayMode ? REPLAY_SPEEDS : GAME_SPEEDS; }
let gameSpeedIndex = 1;
let backgroundTicker = null;
let towerButtonCache = [];
let towerButtonByType = new Map();
const TARGET_MODES = ['closest', 'farthest', 'random', 'strongest', 'weakest', 'front'];
const TARGET_MODE_LABELS = { closest: '最近', farthest: '最远', random: '随机', strongest: '最强', weakest: '最弱', front: '最前' };
const TARGETING_EXCLUDED_TYPES = new Set(['slow', 'gatlingGun', 'tesla', 'electricCore', 'musicStand', 'militaryBase', 'battery', 'gravityBeacon', 'shrineOfMerit', 'pursuit']);

function supportsTargetSelection(tower) {
    return tower && !TARGETING_EXCLUDED_TYPES.has(tower.type);
}

function getEnemyPathProgress(enemy) {
    const from = path[enemy.pathIndex];
    const to = path[Math.min(enemy.pathIndex + 1, path.length - 1)];
    if (!from || !to) return enemy.pathIndex || 0;
    const segmentLength = Math.hypot(to.x - from.x, to.y - from.y) || 1;
    const segmentProgress = Math.min(1, Math.hypot(enemy.x - from.x, enemy.y - from.y) / segmentLength);
    return enemy.pathIndex + segmentProgress;
}

let isTestMode = false;
let damageLog = [];
let moneyInterval = null;
let skillUnlockSequence = 0;

const NORMAL_TOWER_POOL_SIZE = 7;
const BASE_HP_SCORE = 1000;
const SPEED_SCORE_SCALE = 60000;
let matchScore = null;
let replayRecorder = null;
let replayPlayback = null;
let isReplayMode = false;
let lastVictoryResult = null;
let simulationRandomState = null;
let effectRandomState = null;
let visualReplaySeed = null;
let scheduledSimulationEvents = [];

function makeReplaySeed() {
    const values = new Uint32Array(1);
    if (globalThis.crypto?.getRandomValues) {
        globalThis.crypto.getRandomValues(values);
        return values[0] || 0x9e3779b9;
    }
    return ((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0) || 0x9e3779b9;
}

function setSimulationRandomSeed(seed) {
    simulationRandomState = Number.isInteger(seed) ? (seed >>> 0) : null;
}

function nextSeededRandom(state) {
    let value = (state + 0x6D2B79F5) >>> 0;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return { state: (state + 0x6D2B79F5) >>> 0, value: ((value ^ (value >>> 14)) >>> 0) / 4294967296 };
}

function gameRandom() {
    if (simulationRandomState === null) return Math.random();
    const next = nextSeededRandom(simulationRandomState);
    simulationRandomState = next.state;
    return next.value;
}

function setEffectRandomSeed(seed) {
    effectRandomState = Number.isInteger(seed) ? (seed >>> 0) : null;
}

function effectRandom() {
    if (effectRandomState === null) return Math.random();
    const next = nextSeededRandom(effectRandomState);
    effectRandomState = next.state;
    return next.value;
}

function deriveVisualSeed(seed) {
    return Number.isInteger(seed) ? ((seed ^ 0xA5A5A5A5) >>> 0) : null;
}

function makeFrameVisualRandom(seed, logicalFrame) {
    let state = (seed ^ Math.imul((logicalFrame + 1) >>> 0, 0x9E3779B1)) >>> 0;
    return () => {
        const next = nextSeededRandom(state);
        state = next.state;
        return next.value;
    };
}

function scheduleSimulationEvent(delayFrames, callback) {
    scheduledSimulationEvents.push({ frame: frameCount + Math.max(1, Math.round(delayFrames)), callback });
}

function updateScheduledSimulationEvents() {
    if (!scheduledSimulationEvents.length) return;
    const pending = [];
    for (const event of scheduledSimulationEvents) {
        if (event.frame <= frameCount) event.callback();
        else pending.push(event);
    }
    scheduledSimulationEvents = pending;
}

function clearScheduledSimulationEvents() {
    scheduledSimulationEvents = [];
}

function createMatchScore() {
    const missingTowerCount = Math.max(0, NORMAL_TOWER_POOL_SIZE - selectedTowerPool.length);
    return {
        waves: [],
        activeWave: null,
        speedScore: 0,
        baseScore: 0,
        expertBonus: missingTowerCount * 0.1,
        totalScore: 0
    };
}

function beginMatchTracking() {
    matchScore = createMatchScore();
    lastVictoryResult = null;
    const replaySeed = isReplayMode ? replayPlayback?.randomSeed : (isTestMode ? null : makeReplaySeed());
    const replayVisualSeed = isReplayMode
        ? replayPlayback?.visualSeed
        : deriveVisualSeed(replaySeed);
    setSimulationRandomSeed(replaySeed);
    setEffectRandomSeed(replayVisualSeed);
    visualReplaySeed = replayVisualSeed;
    if (!isTestMode && !isReplayMode) {
        replayRecorder = {
            version: 3,
            mapId: selectedMap,
            towerPool: [...selectedTowerPool],
            actions: [],
            randomSeed: replaySeed,
            visualSeed: replayVisualSeed,
            wavePlans: {}
        };
    } else {
        replayRecorder = null;
    }
}

function startWaveScoreTracking() {
    if (isTestMode || !matchScore || wave <= 0 || matchScore.activeWave) return;
    matchScore.activeWave = { wave, startedAt: frameCount };
}

function finishWaveScoreTracking() {
    const activeWave = matchScore?.activeWave;
    if (isTestMode || !activeWave || activeWave.wave !== wave) return;
    const durationFrames = Math.max(1, frameCount - activeWave.startedAt);
    const speedScore = Math.max(1, Math.round(SPEED_SCORE_SCALE / durationFrames));
    matchScore.waves.push({ wave, durationFrames, speedScore });
    matchScore.speedScore += speedScore;
    matchScore.activeWave = null;
}

function finalizeVictoryScore() {
    if (!matchScore) return null;
    matchScore.baseScore = Math.max(0, hp) * BASE_HP_SCORE;
    const rawScore = matchScore.speedScore + matchScore.baseScore;
    matchScore.totalScore = Math.round(rawScore * (1 + matchScore.expertBonus));
    return {
        speedScore: matchScore.speedScore,
        baseScore: matchScore.baseScore,
        expertBonus: matchScore.expertBonus,
        totalScore: matchScore.totalScore,
        waves: matchScore.waves.map(entry => ({ ...entry }))
    };
}

function recordReplayAction(action) {
    if (isTestMode || isReplayMode || gameEnded || !replayRecorder) return;
    replayRecorder.actions.push({ frame: frameCount + 1, order: replayRecorder.actions.length, ...action });
}

function towerGridPosition(tower) {
    return {
        x: Math.floor(tower.x / TILE_SIZE_NATIVE),
        y: Math.floor(tower.y / TILE_SIZE_NATIVE),
        towerType: tower.type
    };
}

function findReplayTower(action) {
    return towers.find(tower => {
        const position = towerGridPosition(tower);
        return position.x === action.x && position.y === action.y && (!action.towerType || position.towerType === action.towerType);
    });
}

function clearReplayTowerActionCues() {
    document.querySelectorAll('.replay-tower-cue').forEach(cue => cue.remove());
}

function showReplayTowerActionCue(tower, actionType) {
    if (!isReplayMode || !tower) return;
    const cueSpec = {
        upgrade: { className: 'upgrade', icon: '↑' },
        skill: { className: 'skill', icon: '✦' },
        deploy: { className: 'deploy', icon: '◉' },
        target: { className: 'target', icon: '◎' }
    }[actionType];
    if (!cueSpec) return;
    const container = document.getElementById('canvas-container');
    if (!container) return;
    const cue = document.createElement('span');
    cue.className = `replay-tower-cue ${cueSpec.className}`;
    cue.style.left = `${tower.x}px`;
    cue.style.top = `${tower.y - TILE_SIZE_NATIVE * .55}px`;
    cue.setAttribute('aria-hidden', 'true');
    cue.innerHTML = `<span>${cueSpec.icon}</span>`;
    const removeCue = () => cue.remove();
    cue.addEventListener('animationend', removeCue, { once: true });
    container.appendChild(cue);
    setTimeout(removeCue, 900);
}

function startReplayFromPayload(payload) {
    const version = Number(payload?.version || 1);
    if (!payload || ![1, 2, 3].includes(version) || !MAP_DATA[payload.mapId] || !Array.isArray(payload.towerPool) || !Array.isArray(payload.actions)) {
        throw new Error('回放数据无效或与当前版本不兼容。');
    }
    selectedMap = payload.mapId;
    selectedTowerPool = payload.towerPool.filter(type => TOWER_DATA[type]).slice(0, NORMAL_TOWER_POOL_SIZE);
    if (selectedTowerPool.length === 0) throw new Error('回放没有可用的防御塔配置。');
    const wavePlans = payload.wavePlans && typeof payload.wavePlans === 'object' ? payload.wavePlans : {};
    const randomSeed = Number.isInteger(payload.randomSeed) ? payload.randomSeed : null;
    replayPlayback = {
        actions: payload.actions.slice().sort((a, b) => Number(a?.frame || 0) - Number(b?.frame || 0) || Number(a?.order || 0) - Number(b?.order || 0)),
        index: 0,
        randomSeed,
        visualSeed: Number.isInteger(payload.visualSeed) ? (payload.visualSeed >>> 0) : deriveVisualSeed(randomSeed),
        wavePlans,
        legacy: version < 2 || Object.keys(wavePlans).length === 0,
        deterministic: version >= 3 && Number.isInteger(randomSeed) && Object.keys(wavePlans).length > 0
    };
    startGame('replay');
}

function applyReplayActions() {
    if (!isReplayMode || !replayPlayback) return;
    while (replayPlayback.index < replayPlayback.actions.length) {
        const action = replayPlayback.actions[replayPlayback.index];
        if (!action || action.frame > frameCount) break;
        replayPlayback.index++;
        if (action.type === 'place') {
            placeTowerAtGrid(action.towerType, action.x, action.y, false);
            continue;
        }
        if (action.type === 'speed') {
            continue;
        }
        const tower = findReplayTower(action);
        if (!tower) continue;
        if (action.type === 'target' && supportsTargetSelection(tower) && TARGET_MODES.includes(action.targetMode)) {
            tower.targetMode = action.targetMode;
            tower.currentTargets = [];
            tower.timeOnTarget = 0;
            if (selectedPlacedTower === tower) updateTowerInfoPanel();
            showReplayTowerActionCue(tower, 'target');
        } else if (action.type === 'skill') {
            if (activateTowerSkill(tower, action.action, { fromReplay: true, record: false })) showReplayTowerActionCue(tower, 'skill');
        } else {
            const applied = executeTowerPanelAction(action.type, { fromReplay: true, record: false, tower, silentPanel: true });
            if (applied && action.type !== 'sell') showReplayTowerActionCue(tower, action.type);
        }
    }
}
