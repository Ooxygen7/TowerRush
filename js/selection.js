const selectionScreen = document.getElementById('selection-screen');
const mapSelectionScreen = document.getElementById('map-selection-screen');
const gameWrapper = document.getElementById('game-wrapper');
const slotsContainer = document.getElementById('selection-slots');
const poolContainer = document.getElementById('tower-pool');
const infoContainer = document.getElementById('selection-info');
const selectMapBtn = document.getElementById('select-map-btn');
const startTestBtn = document.getElementById('start-game-test-btn');
const startGameFromMapBtn = document.getElementById('start-game-from-map-btn');
const backToTowerSelectBtn = document.getElementById('back-to-tower-select-btn');
const mapListContainer = document.getElementById('map-list');

function initializeSelectionScreen() {
    AudioDirector.playHome();
    poolContainer.innerHTML = '';
    for (const type in TOWER_DATA) {
        const data = TOWER_DATA[type];
        const card = document.createElement('div');
        card.className = 'tower-card';
        card.dataset.type = type;

        const canvasEl = document.createElement('canvas');
        canvasEl.width = 50;
        canvasEl.height = 50;
        card.appendChild(canvasEl);

        const nameEl = document.createElement('div');
        nameEl.className = 'name';
        nameEl.textContent = data.name;
        card.appendChild(nameEl);

        const costEl = document.createElement('div');
        costEl.className = 'cost';
        costEl.textContent = `${data.levels[0].cost}`;
        card.appendChild(costEl);

        const tempTower = new Tower(canvasEl.width / 2, canvasEl.height / 2, type);
        const cardCtx = canvasEl.getContext('2d');
        tempTower.draw(cardCtx, 1);

        card.addEventListener('click', () => handleTowerSelection(type));
        card.addEventListener('mouseenter', () => {
            let infoHTML = `<h4>${data.name}</h4><p>${data.description}</p>`;
            if (data.limit) {
                infoHTML += `<p style="margin-top: 10px; color: var(--primary-color); font-weight: bold;">限制放置: ${data.limit}</p>`;
            }
            if (data.exDescription) {
                infoHTML += `<hr style="border-color: var(--border-color); margin: 10px 0;">`;
                infoHTML += `<p style="color: gold; font-weight: bold;">EX特性: ${data.exDescription}</p>`;
                if (data.exLimit && data.exLimit < 99) {
                    infoHTML += `<p style="color: #4dd0e1;">EX升级限制: ${data.exLimit}</p>`;
                }
            }
            infoContainer.innerHTML = infoHTML;
        });

        poolContainer.appendChild(card);
    }
    updateSelectionSlots();
    updateStartButtonState();
}

function handleTowerSelection(type) {
    const index = selectedTowerPool.indexOf(type);
    if (index > -1) {
        selectedTowerPool.splice(index, 1);
    } else {
        if (selectedTowerPool.length < 7) {
            selectedTowerPool.push(type);
        }
    }
    updateSelectionSlots();
    updatePoolVisuals();
    updateStartButtonState();
}

function updateSelectionSlots() {
    slotsContainer.innerHTML = '';
    for (let i = 0; i < 7; i++) {
        const slot = document.createElement('div');
        slot.className = 'slot';
        if (selectedTowerPool[i]) {
            const type = selectedTowerPool[i];
            const data = TOWER_DATA[type];
            const card = document.createElement('div');
            card.className = 'tower-card';
            const canvasEl = document.createElement('canvas');
            canvasEl.width = 50; canvasEl.height = 50;
            card.appendChild(canvasEl);
            const nameEl = document.createElement('div');
            nameEl.className = 'name'; nameEl.textContent = data.name;
            card.appendChild(nameEl);
            const tempTower = new Tower(25, 25, type);
            tempTower.draw(canvasEl.getContext('2d'), 1);
            card.addEventListener('click', () => handleTowerSelection(type));
            slot.appendChild(card);
        }
        slotsContainer.appendChild(slot);
    }
}

function updatePoolVisuals() {
    const cards = poolContainer.querySelectorAll('.tower-card');
    cards.forEach(card => {
        const type = card.dataset.type;
        if (selectedTowerPool.includes(type)) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }

        if (selectedTowerPool.length >= 7 && !selectedTowerPool.includes(type)) {
            card.classList.add('disabled');
        } else {
            card.classList.remove('disabled');
        }
    });
}

function updateStartButtonState() {
    const count = selectedTowerPool.length;
    if (count >= 1 && count <= 7) {
        selectMapBtn.disabled = false;
        selectMapBtn.textContent = `选择地图 (${count}/7)`;
        startTestBtn.disabled = false;
    } else {
        selectMapBtn.disabled = true;
        startTestBtn.disabled = true;
        if (count === 0) {
            selectMapBtn.textContent = '请至少选择 1 个塔';
        } else {
            selectMapBtn.textContent = '最多只能选择 7 个塔';
        }
    }
}

function initializeMapSelectionScreen() {
    mapListContainer.innerHTML = '';
    for (const mapId in MAP_DATA) {
        const mapData = MAP_DATA[mapId];
        const card = document.createElement('div');
        card.className = 'map-card';
        card.dataset.mapId = mapId;

        const canvasEl = document.createElement('canvas');
        card.appendChild(canvasEl);

        const nameEl = document.createElement('div');
        nameEl.className = 'map-name';
        nameEl.textContent = mapData.name;
        card.appendChild(nameEl);

        const modifierEl = document.createElement('div');
        modifierEl.className = 'map-modifier';
        if (mapData.modifierText) {
            modifierEl.textContent = mapData.modifierText;
        }
        card.appendChild(modifierEl);

        drawMapThumbnail(mapId, canvasEl);

        card.addEventListener('click', () => {
            selectedMap = mapId;
            document.querySelectorAll('.map-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            startGameFromMapBtn.disabled = false;
        });

        mapListContainer.appendChild(card);
    }
}

function drawMapThumbnail(mapId, thumbCanvas) {
    const thumbCtx = thumbCanvas.getContext('2d');
    const w = thumbCanvas.width = 250;
    const h = thumbCanvas.height = 180;
    thumbCtx.clearRect(0, 0, w, h);

    const pathSegments = MAP_DATA[mapId].path;
    const pathPoints = [];

    const addPoint = (c, r) => {
        pathPoints.push({ x: c / COLS * w, y: r / ROWS * h });
    };

    for (let i = 0; i < pathSegments.length - 1; i++) {
        let [x1, y1] = pathSegments[i];
        let [x2, y2] = pathSegments[i+1];
        if (i === 0) addPoint(x1, y1);
        addPoint(x2, y2);
    }

    thumbCtx.beginPath();
    for (let i = 0; i < pathPoints.length; i++) {
        const p = pathPoints[i];
        if (i === 0) thumbCtx.moveTo(p.x, p.y);
        else thumbCtx.lineTo(p.x, p.y);
    }
    thumbCtx.strokeStyle = '#999';
    thumbCtx.lineWidth = 15;
    thumbCtx.lineCap = 'round';
    thumbCtx.lineJoin = 'round';
    thumbCtx.stroke();

    const start = pathPoints[0];
    const end = pathPoints[pathPoints.length - 1];
    thumbCtx.fillStyle = 'lightgreen';
    thumbCtx.beginPath();
    thumbCtx.arc(start.x, start.y, 8, 0, Math.PI * 2);
    thumbCtx.fill();

    thumbCtx.fillStyle = 'red';
    thumbCtx.beginPath();
    thumbCtx.arc(end.x, end.y, 8, 0, Math.PI * 2);
    thumbCtx.fill();
}

function startGame(mode) {
    isTestMode = (mode === 'test');
    isReplayMode = (mode === 'replay');
    if (!isReplayMode) replayPlayback = null;
    syncMatchControlVisibility();
    selectionScreen.style.display = 'none';
    mapSelectionScreen.style.display = 'none';
    gameWrapper.style.display = 'block';
    document.body.classList.add('in-battle');
    updateGameStageScale();
    AudioDirector.playBattle(0);
    resetGame();
}

function returnToSelectionScreen() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    clearSpawnInterval();
    clearWaveSchedule();
    clearScheduledSimulationEvents();
    clearReplayTowerActionCues();
    stopBackgroundTicker();
    isPaused = false;
    syncPauseButton();
    gameEnded = true;
    selectedPlacedTower = null;
    floatingInfoPanel.classList.remove('modern-detail');
    floatingInfoPanel.style.display = 'none';
    const gameContainer = document.getElementById('game-container');
    if (gameContainer && floatingInfoPanel.parentElement !== gameContainer) {
        gameContainer.appendChild(floatingInfoPanel);
    }
    document.body.classList.remove('in-battle');
    gameWrapper.style.display = 'none';
    mapSelectionScreen.style.display = 'none';
    selectionScreen.style.display = 'flex';
    document.getElementById('ui-panel').style.height = '';
    isTestMode = false;
    isReplayMode = false;
    syncMatchControlVisibility();
    replayPlayback = null;
    setSimulationRandomSeed(null);
    setEffectRandomSeed(null);
    visualReplaySeed = null;
    AudioDirector.playHome();
    if (moneyInterval) {
        clearInterval(moneyInterval);
        moneyInterval = null;
    }
    updateSelectionSlots();
    updatePoolVisuals();
    updateStartButtonState();
}

function showMapSelection() {
    AudioDirector.playHome();
    selectionScreen.style.display = 'none';
    mapSelectionScreen.style.display = 'flex';
    initializeMapSelectionScreen();
}
