const SFX = (() => {
    let actx = null, master = null, comp = null, noiseBuffer = null;
    let volume = 0.5;
    let voices = 0;
    const MAX_VOICES = 22;
    const lastAt = Object.create(null);

    function init() {
        if (actx) return actx;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try { actx = new AC(); } catch (e) { actx = null; return null; }
        comp = actx.createDynamicsCompressor();
        comp.threshold.value = -16; comp.knee.value = 26; comp.ratio.value = 12;
        comp.attack.value = 0.003; comp.release.value = 0.2;
        master = actx.createGain();
        master.gain.value = volume;
        master.connect(comp); comp.connect(actx.destination);
        const len = Math.floor(actx.sampleRate * 0.6);
        noiseBuffer = actx.createBuffer(1, len, actx.sampleRate);
        const d = noiseBuffer.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        return actx;
    }
    function unlock() {
        const c = init();
        if (!c) return;
        if (c.state === 'suspended') c.resume();
    }
    function ready() { return actx && actx.state === 'running' && voices < MAX_VOICES; }
    function setVolume(value) {
        volume = Math.max(0, Math.min(1, Number(value) || 0));
        if (master) master.gain.value = volume;
    }
    function gate(key, minMs) {
        const now = actx.currentTime * 1000;
        if (lastAt[key] !== undefined && now - lastAt[key] < minMs) return false;
        lastAt[key] = now; return true;
    }
    function track(node) { voices++; node.onended = () => { voices = Math.max(0, voices - 1); }; }

    function tone(o) {
        const t = actx.currentTime;
        const osc = actx.createOscillator(), g = actx.createGain();
        osc.type = o.type || 'sine';
        const dur = o.dur || 0.15;
        osc.frequency.setValueAtTime(o.f0 || 440, t);
        if (o.f1 != null) {
            if (o.exp) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t + dur);
            else osc.frequency.linearRampToValueAtTime(o.f1, t + dur);
        }
        const peak = o.gain != null ? o.gain : 0.2;
        const atk = o.attack != null ? o.attack : 0.004;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(peak, t + atk);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        if (o.filter) {
            const f = actx.createBiquadFilter();
            f.type = o.filter; f.frequency.value = o.fc || 1200;
            if (o.q != null) f.Q.value = o.q;
            osc.connect(f); f.connect(g);
        } else { osc.connect(g); }
        g.connect(master); track(osc); osc.start(t); osc.stop(t + dur + 0.02);
    }
    function noise(o) {
        const t = actx.currentTime;
        const src = actx.createBufferSource(); src.buffer = noiseBuffer; src.loop = true;
        const f = actx.createBiquadFilter();
        f.type = o.filter || 'lowpass';
        const dur = o.dur || 0.2;
        f.frequency.setValueAtTime(o.fc0 || 1200, t);
        if (o.fc1 != null) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.fc1), t + dur);
        if (o.q != null) f.Q.value = o.q;
        const g = actx.createGain();
        const peak = o.gain != null ? o.gain : 0.3;
        const atk = o.attack != null ? o.attack : 0.002;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(peak, t + atk);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(f); f.connect(g); g.connect(master);
        track(src); src.start(t); src.stop(t + dur + 0.02);
    }

    const SOUNDS = {
        arrow()   { tone({type:'triangle', f0:1000, f1:1750, exp:true, dur:0.08, gain:0.15}); noise({filter:'highpass', fc0:2200, dur:0.05, gain:0.05}); },
        cannon()  { tone({type:'square', f0:230, f1:90, exp:true, dur:0.14, gain:0.22}); noise({filter:'lowpass', fc0:900, fc1:200, dur:0.12, gain:0.17}); },
        magic()   { tone({type:'sine', f0:720, f1:1320, exp:true, dur:0.18, gain:0.13}); tone({type:'sine', f0:1080, f1:1980, exp:true, dur:0.16, gain:0.07}); noise({filter:'bandpass', fc0:2600, dur:0.12, gain:0.04, q:2}); },
        slow()    { tone({type:'sine', f0:380, f1:580, exp:true, dur:0.3, gain:0.12}); tone({type:'sine', f0:190, f1:290, exp:true, dur:0.3, gain:0.07}); },
        blast()   { tone({type:'sawtooth', f0:170, f1:70, exp:true, dur:0.14, gain:0.2}); noise({filter:'lowpass', fc0:760, fc1:150, dur:0.1, gain:0.15}); },
        gamma()   { tone({type:'sawtooth', f0:1320, f1:880, dur:0.16, gain:0.11, filter:'bandpass', fc:1600, q:4}); noise({filter:'bandpass', fc0:3200, fc1:1500, dur:0.14, gain:0.05, q:3}); },
        gatling() { noise({filter:'bandpass', fc0:1900, dur:0.05, gain:0.12, q:1.4}); tone({type:'square', f0:190, f1:120, exp:true, dur:0.04, gain:0.09}); },
        tesla()   { tone({type:'square', f0:600 + (frameCount % 7) * 95, dur:0.1, gain:0.09, filter:'highpass', fc:800}); noise({filter:'bandpass', fc0:3600, fc1:1200, dur:0.12, gain:0.1, q:0.7}); },
        thiefClaw(){ noise({filter:'bandpass', fc0:3600, fc1:600, dur:0.12, gain:0.12, q:0.8}); },
        matrix()  { tone({type:'square', f0:880, f1:1320, dur:0.06, gain:0.1}); tone({type:'square', f0:1320, dur:0.04, gain:0.05}); },
        destroyer(){ tone({type:'sawtooth', f0:90, dur:0.26, gain:0.16}); tone({type:'sine', f0:1400, f1:1850, dur:0.26, gain:0.05}); noise({filter:'bandpass', fc0:2000, dur:0.2, gain:0.05, q:2}); },
        annihilator(){ tone({type:'sawtooth', f0:120, f1:60, exp:true, dur:0.2, gain:0.2}); noise({filter:'lowpass', fc0:1200, fc1:300, dur:0.18, gain:0.11}); },
        missile() { noise({filter:'bandpass', fc0:600, fc1:2600, dur:0.3, gain:0.11, q:0.6}); tone({type:'sawtooth', f0:200, f1:400, exp:true, dur:0.25, gain:0.09}); },
        gravity() { tone({type:'sine', f0:95, f1:45, exp:true, dur:0.36, gain:0.18}); tone({type:'triangle', f0:150, f1:70, exp:true, dur:0.3, gain:0.07}); },
        tank()    { tone({type:'sawtooth', f0:150, f1:55, exp:true, dur:0.18, gain:0.22}); noise({filter:'lowpass', fc0:1000, fc1:160, dur:0.16, gain:0.2}); },
        spotlight(){ tone({type:'sine', f0:85, f1:72, dur:0.9, gain:0.07}); tone({type:'sine', f0:170, f1:144, dur:0.9, gain:0.03}); noise({filter:'lowpass', fc0:120, fc1:80, dur:0.85, gain:0.04}); },
        pursuit(){ tone({type:'sawtooth', f0:180, f1:60, exp:true, dur:0.2, gain:0.14}); noise({filter:'lowpass', fc0:1000, fc1:200, dur:0.15, gain:0.1}); },
        boomerang(){ noise({filter:'bandpass', fc0:1100, fc1:2800, dur:0.2, gain:0.09, q:1.3}); tone({type:'triangle', f0:620, f1:300, exp:true, dur:0.14, gain:0.06}); },
        frostPunish(){ tone({type:'triangle', f0:165, f1:70, exp:true, dur:0.13, gain:0.17}); tone({type:'sine', f0:90, f1:55, exp:true, dur:0.1, gain:0.1}); noise({filter:'bandpass', fc0:1900, fc1:420, dur:0.2, gain:0.09, q:0.8}); },
        thunder(){ noise({filter:'lowpass', fc0:900, fc1:55, dur:0.6, gain:0.32}); tone({type:'sine', f0:95, f1:38, exp:true, dur:0.5, gain:0.24}); tone({type:'sawtooth', f0:150, f1:48, exp:true, dur:0.34, gain:0.1}); },
        pursuitMissile(){ tone({type:'sawtooth', f0:300, f1:600, exp:true, dur:0.12, gain:0.06}); noise({filter:'bandpass', fc0:2000, fc1:4000, dur:0.1, gain:0.04, q:1.5}); },
        overloadAlarm(){ tone({type:'square', f0:112, f1:100, dur:0.5, gain:0.18, filter:'lowpass', fc:260}); tone({type:'square', f0:168, f1:150, dur:0.5, gain:0.10, filter:'lowpass', fc:320}); noise({filter:'lowpass', fc0:140, fc1:90, dur:0.5, gain:0.05}); },
        soldier() { noise({filter:'bandpass', fc0:2300, fc1:800, dur:0.06, gain:0.08, q:1.2}); tone({type:'square', f0:300, f1:160, exp:true, dur:0.05, gain:0.07}); },
        explosion(){ noise({filter:'lowpass', fc0:1500, fc1:90, dur:0.35, gain:0.32}); tone({type:'sine', f0:150, f1:50, exp:true, dur:0.3, gain:0.22}); },
        missileBoom(){ noise({filter:'lowpass', fc0:1900, fc1:70, dur:0.55, gain:0.36}); tone({type:'sine', f0:120, f1:38, exp:true, dur:0.5, gain:0.27}); tone({type:'sawtooth', f0:80, f1:30, exp:true, dur:0.4, gain:0.11}); },
        crater()  { noise({filter:'bandpass', fc0:1600, fc1:400, dur:0.18, gain:0.15, q:0.7}); tone({type:'sine', f0:180, f1:60, exp:true, dur:0.15, gain:0.11}); },
        shockwave(){ tone({type:'sine', f0:165, f1:28, exp:true, dur:0.8, gain:0.34}); noise({filter:'lowpass', fc0:600, fc1:50, dur:0.7, gain:0.22}); },
    };
    const MIN = { gatling:55, tesla:48, soldier:46, explosion:40, crater:55, arrow:28, missile:40, spotlight:800, pursuitMissile:30, overloadAlarm:900, thunder:90 };
    const TYPE_SOUND = {
        arrow:'arrow', cannon:'cannon', magic:'magic', blast:'blast',
        gamma:'gamma', gatlingGun:'gatling', tesla:'tesla', thiefClaw:'thiefClaw',
        matrix:'matrix', destroyer:'destroyer', annihilator:'annihilator', spotlight:'spotlight', pursuit:'pursuit',
        heavyWeapons:'gatling', boomerang:'boomerang', frostPunish:'frostPunish'
    };
    function play(name) {
        if (!ready()) return;
        const fn = SOUNDS[name];
        if (!fn) return;
        if (!gate(name, MIN[name] || 32)) return;
        try { fn(); } catch (e) {}
    }
    function tower(type) { const n = TYPE_SOUND[type]; if (n) play(n); }

    ['pointerdown', 'touchstart', 'keydown', 'mousedown'].forEach(ev =>
        window.addEventListener(ev, unlock, { passive: true }));

    return { play, tower, unlock, setVolume };
})();

const AudioDirector = (() => {
    const SETTINGS_KEY = 'tower-defense-audio-settings-v1';
    const home = new Audio('home.mp3');
    const battleTracks = ['bgm1.mp3', 'bgm2.mp3', 'bgm3.mp3'].map(src => new Audio(src));
    home.loop = true;
    battleTracks.forEach(track => { track.loop = false; track.preload = 'auto'; });

    let volume = 0.45;
    let sfxVolume = 0.5;
    let current = null;
    let mode = 'home';
    let battleIndex = 0;
    let fadeTimer = null;
    let pendingStart = true;

    try {
        const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
        if (Number.isFinite(saved.bgmVolume)) volume = Math.max(0, Math.min(1, saved.bgmVolume));
        if (Number.isFinite(saved.sfxVolume)) sfxVolume = Math.max(0, Math.min(1, saved.sfxVolume));
        SFX.setVolume(sfxVolume);
    } catch (_) {}

    battleTracks.forEach((track, index) => track.addEventListener('ended', () => {
        if (mode === 'battle' && current === track) playBattle((index + 1) % battleTracks.length);
    }));

    function stopFade() {
        if (fadeTimer !== null) {
            clearInterval(fadeTimer);
            fadeTimer = null;
        }
    }

    function crossfade(next) {
        if (current === next && !next.paused) return;
        stopFade();
        const previous = current;
        try { next.currentTime = 0; } catch (_) {}
        next.volume = 0;
        const started = next.play();
        if (started && typeof started.catch === 'function') {
            started.catch(() => { pendingStart = true; });
        }
        current = next;
        pendingStart = false;
        const startedAt = performance.now();
        const duration = 750;
        fadeTimer = setInterval(() => {
            const progress = Math.min(1, (performance.now() - startedAt) / duration);
            next.volume = volume * progress;
            if (previous && previous !== next) previous.volume = volume * (1 - progress);
            if (progress >= 1) {
                stopFade();
                if (previous && previous !== next) {
                    previous.pause();
                    previous.currentTime = 0;
                }
            }
        }, 40);
    }

    function playHome() {
        mode = 'home';
        crossfade(home);
    }

    function playBattle(index = 0) {
        mode = 'battle';
        battleIndex = index;
        crossfade(battleTracks[battleIndex]);
    }

    function unlock() {
        if (pendingStart || !current || current.paused) {
            if (mode === 'battle') playBattle(battleIndex);
            else playHome();
        }
    }

    function setBgmVolume(value) {
        volume = Math.max(0, Math.min(1, Number(value) || 0));
        if (current && fadeTimer === null) current.volume = volume;
        save();
    }

    function setSfxVolume(value) {
        sfxVolume = Math.max(0, Math.min(1, Number(value) || 0));
        SFX.setVolume(sfxVolume);
        save();
    }

    function save() {
        try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ bgmVolume: volume, sfxVolume })); } catch (_) {}
    }

    function getSfxVolume() { return sfxVolume; }

    return { playHome, playBattle, unlock, setBgmVolume, setSfxVolume, getBgmVolume: () => volume, getSfxVolume };
})();

const GAME_PREFERENCES_KEY = 'tower-defense-preferences-v1';
const DEFAULT_KEY_BINDINGS = Object.freeze({
    upgrade: 'w', sell: 's', targetPrevious: 'q', targetNext: 'e',
    skill1: '1', skill2: '2', skill3: '3', skill4: '4', skill5: '5', skill6: '6', skill7: '7'
});

function normalizeShortcut(key) {
    return String(key || '').trim().toLowerCase();
}

function shortcutLabel(key) {
    const normalized = normalizeShortcut(key);
    if (normalized === ' ') return 'Space';
    if (normalized === 'arrowleft') return '←';
    if (normalized === 'arrowright') return '→';
    if (normalized === 'arrowup') return '↑';
    if (normalized === 'arrowdown') return '↓';
    return normalized.length === 1 ? normalized.toUpperCase() : normalized.replace(/^./, char => char.toUpperCase());
}

function loadGamePreferences() {
    const defaults = { towerDetailMode: 'classic', keyBindings: { ...DEFAULT_KEY_BINDINGS } };
    try {
        const saved = JSON.parse(localStorage.getItem(GAME_PREFERENCES_KEY) || '{}');
        if (saved.towerDetailMode === 'modern' || saved.towerDetailMode === 'classic') defaults.towerDetailMode = saved.towerDetailMode;
        if (saved.keyBindings && typeof saved.keyBindings === 'object') {
            for (const key of Object.keys(DEFAULT_KEY_BINDINGS)) {
                const value = normalizeShortcut(saved.keyBindings[key]);
                if (value) defaults.keyBindings[key] = value;
            }
        }
    } catch (_) {}
    return defaults;
}

let gamePreferences = loadGamePreferences();

function saveGamePreferences() {
    try { localStorage.setItem(GAME_PREFERENCES_KEY, JSON.stringify(gamePreferences)); } catch (_) {}
}

function isModernTowerDetailMode() {
    return gamePreferences.towerDetailMode === 'modern';
}

function applyTowerDetailMode() {
    document.documentElement.classList.toggle('modern-tower-details', isModernTowerDetailMode());
    if (typeof updateGameStageScale === 'function') updateGameStageScale();
    if (typeof updateTowerInfoPanel === 'function' && selectedPlacedTower) updateTowerInfoPanel();
}

applyTowerDetailMode();

function markStrategicStateDirty() {
    strategicStateDirty = true;
    uiDirty = true;
    towerInfoDirty = true;
}

function markUiDirty() {
    uiDirty = true;
}

function markTowerInfoDirty() {
    if (selectedPlacedTower) towerInfoDirty = true;
}

function countTowersOfType(type) {
    let count = 0;
    for (const tower of towers) {
        if (tower.type === type) count++;
    }
    return count;
}

function compactInPlace(list, keep) {
    let write = 0;
    for (let read = 0; read < list.length; read++) {
        const item = list[read];
        if (keep(item)) list[write++] = item;
    }
    list.length = write;
}

function updateAndCompact(list) {
    compactInPlace(list, item => item.update() !== false);
}

function flushUi(force = false) {
    if (force || uiDirty || frameCount - lastUiUpdateFrame >= UI_UPDATE_INTERVAL_FRAMES) {
        updateUI();
        renderSkillRail();
        lastUiUpdateFrame = frameCount;
        uiDirty = false;
    }
}

function flushTowerInfo(force = false) {
    if (!selectedPlacedTower) {
        towerInfoDirty = false;
        return;
    }
    if (force || towerInfoDirty || frameCount - lastTowerInfoUpdateFrame >= UI_UPDATE_INTERVAL_FRAMES) {
        updateTowerInfoPanel();
        lastTowerInfoUpdateFrame = frameCount;
        towerInfoDirty = false;
    }
}

function resetTimingState() {
    lastFrameTime = 0;
    simulationAccumulator = 0;
    lastUiUpdateFrame = -Infinity;
    lastTowerInfoUpdateFrame = -Infinity;
}

function clearSpawnInterval() {
    pendingEnemyTypes = [];
    spawnFrameCountdown = 0;
    pendingWaveSpawns = 0;
}

function scheduleWaveStart(delayFrames) {
    waveStartCountdown = delayFrames;
    markUiDirty();
}

function clearWaveSchedule() {
    waveStartCountdown = 0;
    markUiDirty();
}

function updateGameStageScale() {
    const availableWidth = Math.max(320, window.innerWidth - GAME_STAGE_MARGIN);
    const availableHeight = Math.max(240, window.innerHeight - GAME_STAGE_MARGIN);
    const baseWidthScaled = GAME_STAGE_BASE_WIDTH * LOCKED_GAME_SCALE;
    const baseHeightScaled = GAME_STAGE_BASE_HEIGHT * LOCKED_GAME_SCALE;
    const classicFitScale = Math.min(1, availableWidth / baseWidthScaled, availableHeight / baseHeightScaled);
    const classicScale = Math.max(0.25, LOCKED_GAME_SCALE * classicFitScale);
    const classicVisualHeight = GAME_STAGE_BASE_HEIGHT * classicScale;
    const stageTop = Math.max(0, (availableHeight - classicVisualHeight) / 2);

    let stageScale = classicScale;
    let transformOrigin = 'center center';
    let marginTop = '0px';
    let alignSelf = 'auto';

    if (isModernTowerDetailMode()) {
        const availForBattlefield = Math.max(160, availableHeight - stageTop - MODERN_DETAIL_RESERVED_HEIGHT);
        const modernFitScale = Math.min(1, availableWidth / baseWidthScaled, availForBattlefield / baseHeightScaled);
        stageScale = Math.max(0.25, LOCKED_GAME_SCALE * modernFitScale);
        transformOrigin = 'top center';
        marginTop = `${stageTop}px`;
        alignSelf = 'flex-start';
    }

    const root = document.documentElement;
    root.style.setProperty('--game-stage-scale', stageScale.toFixed(4));
    root.style.setProperty('--game-stage-height', `${GAME_STAGE_BASE_HEIGHT}px`);
    root.style.setProperty('--game-stage-origin', transformOrigin);
    root.style.setProperty('--game-stage-margin-top', marginTop);
    root.style.setProperty('--game-stage-align', alignSelf);
}

function positionTooltip(event) {
    const margin = 12;
    const offset = 16;
    const rect = tooltip.getBoundingClientRect();
    let left = event.clientX + offset;
    let top = event.clientY + offset;
    if (left + rect.width > window.innerWidth - margin) {
        left = event.clientX - rect.width - offset;
    }
    if (top + rect.height > window.innerHeight - margin) {
        top = event.clientY - rect.height - offset;
    }
    tooltip.style.left = `${Math.max(margin, left)}px`;
    tooltip.style.top = `${Math.max(margin, top)}px`;
}
