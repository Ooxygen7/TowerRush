const leaderboardModal = document.getElementById('leaderboard-modal');
const leaderboardAccount = document.getElementById('leaderboard-account');
const leaderboardTabs = document.getElementById('leaderboard-map-tabs');
const leaderboardStatus = document.getElementById('leaderboard-status');
const leaderboardList = document.getElementById('leaderboard-list');
let leaderboardActiveMap = 'MAP1';
let leaderboardMe = null;

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, { credentials: 'same-origin', ...options });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(body.error || `请求失败（${response.status}）`);
        error.status = response.status;
        throw error;
    }
    return body;
}

function renderLeaderboardTabs() {
    leaderboardTabs.innerHTML = Object.keys(MAP_DATA).map(mapId => {
        const active = mapId === leaderboardActiveMap;
        return `<button type="button" class="leaderboard-map-tab${active ? ' active' : ''}" data-leaderboard-map="${mapId}" role="tab" aria-selected="${active}">${escapeHtml(MAP_DATA[mapId].name || mapId)}</button>`;
    }).join('');
}

function renderLeaderboardAccount() {
    if (leaderboardMe?.authenticated && leaderboardMe.user) {
        const user = leaderboardMe.user;
        leaderboardAccount.innerHTML = `已登录：<b>${escapeHtml(user.name || user.username)}</b><span>（${escapeHtml(user.username)}）</span><button type="button" class="leaderboard-logout" data-leaderboard-logout>退出登录</button>`;
        return;
    }
    if (leaderboardMe?.oauthReady) {
        leaderboardAccount.innerHTML = `上传成绩需登录 LinuxDo。<button type="button" class="leaderboard-login" data-leaderboard-login>使用 LinuxDo 登录</button>`;
    } else {
        leaderboardAccount.textContent = '上传成绩需使用 LinuxDo 登录（登录配置准备中）。';
    }
}

function renderLeaderboardEntries(entries) {
    if (!entries.length) {
        leaderboardList.innerHTML = '<li class="leaderboard-empty">这张地图还没有战绩。第一个完成并上传的人会出现在这里。</li>';
        return;
    }
    leaderboardList.innerHTML = entries.map((entry, index) => {
        const rankClass = entry.rank <= 3 ? ' top-three' : '';
        const bonus = Math.round(Number(entry.skillMultiplier || 1) * 100 - 100);
        const replayOutdated = Number(entry.replayVersion || 1) !== 3;
        return `<li class="leaderboard-entry"><span class="leaderboard-rank${rankClass}">#${entry.rank}</span><span class="leaderboard-player"><b>${escapeHtml(entry.name || entry.username)}</b><span>@${escapeHtml(entry.username)}</span>${replayOutdated ? '<span class="leaderboard-replay-stale">回放版本过时</span>' : ''}</span><span class="leaderboard-loadout" data-leaderboard-loadout="${index}" aria-label="本局携带的防御塔"></span><span class="leaderboard-score">${Number(entry.score || 0).toLocaleString()}<small>速度 ${Number(entry.speedScore || 0).toLocaleString()} · 基地 ${Number(entry.baseScore || 0).toLocaleString()} · 高手 +${bonus}%</small></span><button type="button" class="watch-replay-btn" data-watch-replay="${escapeHtml(entry.replayId)}">观看代理</button></li>`;
    }).join('');
    entries.forEach((entry, index) => renderLeaderboardLoadout(leaderboardList.querySelector(`[data-leaderboard-loadout="${index}"]`), entry.towerPool));
}

function renderLeaderboardLoadout(container, towerPool) {
    if (!container) return;
    const types = Array.isArray(towerPool) ? towerPool.filter(type => TOWER_DATA[type]).slice(0, NORMAL_TOWER_POOL_SIZE) : [];
    if (!types.length) {
        container.innerHTML = '<span class="leaderboard-loadout-empty">未保存防御塔配置</span>';
        return;
    }
    const modelSize = window.matchMedia('(max-width: 700px)').matches ? 34 : 36;
    for (const type of types) {
        const model = document.createElement('span');
        model.className = 'leaderboard-loadout-tower';
        model.title = TOWER_DATA[type].name;
        model.setAttribute('aria-label', TOWER_DATA[type].name);
        const modelCanvas = document.createElement('canvas');
        modelCanvas.width = modelSize;
        modelCanvas.height = modelSize;
        model.appendChild(modelCanvas);
        const previewTower = new Tower(modelSize / 2, modelSize / 2, type);
        previewTower.draw(modelCanvas.getContext('2d'), modelSize / 50);
        container.appendChild(model);
    }
}

async function loadLeaderboard(mapId = leaderboardActiveMap, notice = '') {
    if (!MAP_DATA[mapId]) mapId = 'MAP1';
    leaderboardActiveMap = mapId;
    renderLeaderboardTabs();
    leaderboardStatus.textContent = '正在加载排行榜…';
    leaderboardList.replaceChildren();
    try {
        const [me, board] = await Promise.all([
            fetchJson('/td/api/me'),
            fetchJson(`/td/api/leaderboard?map=${encodeURIComponent(leaderboardActiveMap)}&limit=50`)
        ]);
        leaderboardMe = me;
        renderLeaderboardAccount();
        renderLeaderboardEntries(Array.isArray(board.entries) ? board.entries : []);
        leaderboardStatus.textContent = notice || `${MAP_DATA[leaderboardActiveMap].name}· 共${Array.isArray(board.entries) ? board.entries.length : 0}条记录`;
    } catch (error) {
        leaderboardAccount.textContent = '排行榜暂时无法连接。';
        leaderboardStatus.textContent = `加载失败：${error.message}`;
        leaderboardList.innerHTML = '<li class="leaderboard-empty">请稍后重试。</li>';
    }
}

async function openLeaderboard(mapId = leaderboardActiveMap, notice = '') {
    leaderboardModal.style.display = 'flex';
    await loadLeaderboard(mapId, notice);
}

function closeLeaderboard() {
    leaderboardModal.style.display = 'none';
}

async function watchReplay(replayId) {
    if (!replayId) return;
    leaderboardStatus.textContent = '正在下载代理操作…';
    try {
        const payload = await fetchJson(`/td/api/replays/${encodeURIComponent(replayId)}`);
        closeLeaderboard();
        startReplayFromPayload(payload.replay);
    } catch (error) {
        leaderboardStatus.textContent = `代理加载失败：${error.message}`;
    }
}

async function uploadCurrentScore() {
    if (!lastVictoryResult || !replayRecorder || isReplayMode || isTestMode) return;
    const uploadButton = document.getElementById('upload-score-btn');
    uploadButton.disabled = true;
    uploadButton.textContent = '正在检查登录…';
    try {
        const me = await fetchJson('/td/api/me');
        if (!me.authenticated) {
            window.location.assign('/td/auth/linuxdo/login');
            return;
        }
        uploadButton.textContent = '正在上传…';
        const replay = { ...replayRecorder, actions: replayRecorder.actions.slice(), result: lastVictoryResult };
        const result = await fetchJson('/td/api/scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mapId: selectedMap,
                score: lastVictoryResult.totalScore,
                speedScore: lastVictoryResult.speedScore,
                baseScore: lastVictoryResult.baseScore,
                skillMultiplier: 1 + lastVictoryResult.expertBonus,
                replay
            })
        });
        modal.style.display = 'none';
        const notice = result.uploaded
            ? `上传成功！你的当前排名：#${result.rank}。`
            : `未覆盖已有最佳分数（${Number(result.bestScore).toLocaleString()}）。`;
        await openLeaderboard(selectedMap, notice);
    } catch (error) {
        if (error.status === 401) {
            window.location.assign('/td/auth/linuxdo/login');
            return;
        }
        uploadButton.disabled = false;
        uploadButton.textContent = '上传到排行榜';
        alert(`上传失败：${error.message}`);
    }
}

document.getElementById('open-leaderboard-btn').addEventListener('click', () => openLeaderboard());
document.getElementById('leaderboard-close-x').addEventListener('click', closeLeaderboard);
leaderboardModal.addEventListener('click', event => { if (event.target === leaderboardModal) closeLeaderboard(); });
leaderboardTabs.addEventListener('click', event => {
    const button = event.target.closest('[data-leaderboard-map]');
    if (button) loadLeaderboard(button.dataset.leaderboardMap);
});
leaderboardAccount.addEventListener('click', event => {
    if (event.target.closest('[data-leaderboard-login]')) window.location.assign('/td/auth/linuxdo/login');
    if (event.target.closest('[data-leaderboard-logout]')) window.location.assign('/td/auth/logout');
});
leaderboardList.addEventListener('click', event => {
    const button = event.target.closest('[data-watch-replay]');
    if (button) watchReplay(button.dataset.watchReplay);
});
document.getElementById('upload-score-btn').addEventListener('click', uploadCurrentScore);

selectMapBtn.addEventListener('click', showMapSelection);
startTestBtn.addEventListener('click', () => {
    selectedMap = 'MAP1';
    startGame('test');
});
startGameFromMapBtn.addEventListener('click', () => startGame('normal'));
backToTowerSelectBtn.addEventListener('click', () => {
    mapSelectionScreen.style.display = 'none';
    selectionScreen.style.display = 'flex';
});

function lockBrowserZoomControls() {
    window.addEventListener('wheel', (event) => {
        if (event.ctrlKey) event.preventDefault();
    }, { passive: false });

    window.addEventListener('keydown', (event) => {
        const key = event.key;
        if ((event.ctrlKey || event.metaKey) && (key === '+' || key === '-' || key === '=' || key === '0')) {
            event.preventDefault();
        }
    });

    ['gesturestart', 'gesturechange', 'gestureend'].forEach(eventName => {
        window.addEventListener(eventName, event => event.preventDefault(), { passive: false });
    });
}

lockBrowserZoomControls();
window.addEventListener('resize', () => {
    updateGameStageScale();
    resizeCanvas();
    requestAnimationFrame(updateModernPanelPosition);
});
window.onload = () => {
    updateGameStageScale();
    initializeSelectionScreen();
    AudioDirector.playHome();
    maybeShowAnnouncement();
    const query = new URLSearchParams(window.location.search);
    if (query.get('leaderboard') === '1') {
        closeAnnouncement();
        openLeaderboard('MAP1', query.get('auth') === 'success' ? 'LinuxDo 登录成功，可以上传战绩。' : '');
        history.replaceState({}, '', window.location.pathname);
    }
};

['pointerdown', 'keydown'].forEach(eventName => window.addEventListener(eventName, () => AudioDirector.unlock(), { passive: true }));
