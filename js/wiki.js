const wikiModal = document.getElementById('wiki-modal');
const wikiTabsEl = document.getElementById('wiki-tabs');
const wikiBodyEl = document.getElementById('wiki-body');
let wikiActiveTab = 'towers';
let wikiBuilt = false;

const WIKI_STAT_LABELS = {
    cost: '价格', damage: '伤害', range: '射程', fireRate: '攻击间隔', slow: '减速',
    blastRadius: '爆炸半径', minDamage: '最小伤害', maxDamage: '最大伤害', rampUpTime: '蓄力时间',
    buff: '攻速加成', targets: '目标数', stun: '眩晕', attacksForGold: '窃取间隔', goldPerProc: '每次金钱',
    upgradeDiscount: '升级折扣', rangeBuff: '范围加成', damageBuff: '伤害加成', spawnRate: '产生间隔',
    spawnCount: '产生数量', attacksBeforeOverheat: '过热前攻击', shotsPerRound: '每轮射击数',
    goldPerWave: '每波收入', pushback: '推回距离', moneyMultiplier: '额外金钱倍率', baseGold: '基础金钱',
    tankSpawnRate: '坦克间隔', tankSpawnCount: '坦克数量', chainTargets: '蔓延目标', chainRadius: '蔓延范围',
    specialAttackRate: '特殊间隔', specialDamage: '特殊伤害', specialBlastRadius: '特殊爆炸半径',
    specialSignalRate: '信号箭间隔', specialPercentDamage: '百分比伤害', specialMultiplier: '命中增伤',
    reloadTime: '装填时间', missileCount: '导弹数', flightTime: '巡飞时间', salvoCount: '连射数',
    salvoInterval: '连射间隔', burnPercent: '燃烧 %', bossBurnPercent: '首领燃烧 %', critChance: '暴击率',
    beamSpread: '光束扩散', heatFieldRangeBonus: '领域加成', heatDamageRadius: '灼伤半径',
    overheatDuration: '过热时长', sharedVision: '共享视野', reloadSync: '装填同步',
    missileDamage: '导弹伤害', missileBlastRadius: '导弹爆炸半径', missileFireRate: '导弹攻击间隔',
    lingerTime: '停留时长'
};
const WIKI_STAT_ORDER = ['damage','minDamage','maxDamage','range','fireRate','lingerTime','missileDamage','missileBlastRadius','missileFireRate','reloadTime','missileCount','blastRadius','slow','stun','targets','chainTargets','chainRadius','shotsPerRound','buff','damageBuff','rangeBuff','upgradeDiscount','rampUpTime','burnPercent','bossBurnPercent','critChance','beamSpread','heatFieldRangeBonus','heatDamageRadius','attacksBeforeOverheat','overheatDuration','spawnRate','spawnCount','tankSpawnRate','tankSpawnCount','goldPerWave','attacksForGold','goldPerProc','pushback','moneyMultiplier','baseGold','flightTime','salvoCount','salvoInterval','specialAttackRate','specialDamage','specialBlastRadius','specialSignalRate','specialPercentDamage','specialMultiplier','cost','sharedVision','reloadSync'];

function formatWikiStat(key, value) {
    if (value === true) return '是';
    if (value === false || value === undefined || value === null) return '—';
    switch (key) {
        case 'fireRate': case 'rampUpTime': case 'spawnRate': case 'tankSpawnRate': case 'reloadTime': case 'flightTime': case 'salvoInterval': case 'overheatDuration': case 'missileFireRate': case 'lingerTime': {
            const sec = value / 60;
            let str = sec < 0.1 ? sec.toFixed(3) : sec < 1 ? sec.toFixed(2) : (sec % 1 === 0 ? sec.toFixed(0) : sec.toFixed(1));
            if (str.indexOf('.') !== -1) str = str.replace(/0+$/, '').replace(/\.$/, '');
            return str + 's';
        }
        case 'slow': return Math.round(value * 100) + '%';
        case 'buff': case 'rangeBuff': case 'damageBuff': return '+' + Math.round((value - 1) * 100) + '%';
        case 'upgradeDiscount': return Math.round(value * 100) + '%';
        case 'stun': return value + 's';
        case 'burnPercent': case 'bossBurnPercent': case 'specialPercentDamage': return (value * 100).toFixed(value < 0.01 ? 2 : 1) + '%';
        case 'critChance': return Math.round(value * 100) + '%';
        case 'moneyMultiplier': case 'heatFieldRangeBonus': return '+' + Math.round(value * 100) + '%';
        case 'attacksBeforeOverheat': return value === Infinity ? '∞' : value;
        default: return value;
    }
}

function wikiEnemyBaseHp(wave) {
    if (wave <= 10) return Math.floor(40 * Math.pow(1.15, wave));
    if (wave <= 20) { const hpAt10 = 40 * Math.pow(1.15, 10); return Math.floor(hpAt10 * Math.pow(1.33, wave - 10)); }
    const hpAt10 = 45 * Math.pow(1.15, 10); const hpAt20 = hpAt10 * Math.pow(1.25, 10); return Math.floor(hpAt20 * Math.pow(1.18, wave - 20));
}

const WIKI_ENEMIES = [
    { type: 'normal', name: '普通敌人', hpMult: 1, speed: 1.0, size: 10, color: '#bdbdbd', appearance: '第1—30波的基础单位', desc: '标准敌人，无额外抗性或特殊能力。', traits: ['基础生命值：按波次成长公式计算', '基础移动速度：×1.0', '击杀奖励：5 + 波次奖励'] },
    { type: 'fast', name: '快速敌人', hpMult: 0.8, speed: 2.5, size: 8, color: '#fff176', appearance: '第11波起出现', desc: '低生命值、高机动单位，优先考验火力覆盖与减速控制。', traits: ['本体生命值：普通敌人的80%', '基础移动速度：×2.5', '不具备额外控制抗性'] },
    { type: 'strong', name: '强壮敌人', hpMult: 2.2, speed: 0.7, size: 20, color: '#ef5350', appearance: '第21波起出现', desc: '高生命值、低移动速度的重装单位。', traits: ['本体生命值：普通敌人的2.2倍', '基础移动速度：×0.7', '不具备额外控制抗性'] },
    { type: 'shield', name: '护盾敌人', hpMult: 1.7, speed: 0.85, size: 15, color: '#42a5f5', appearance: '第1波起出现；数量随波次提高', desc: '携带可独立承伤的护盾；护盾未被击破前不接受任何减益。', traits: ['本体生命值：普通敌人的1.7倍', '护盾生命值：基础生命值的50%', '护盾存在时免疫减速、眩晕、冰封、燃烧、破防与干扰迷乱', '护盾击破后恢复正常受控'] },
    { type: 'summoner', name: '召唤者', hpMult: 3, speed: 0.5, size: 18, color: '#9c27b0', appearance: '第10、15、20、25波各出现1名，固定在队列末尾', desc: '低速高生命值单位；存活时间越长，产生的增援越多。', traits: ['本体生命值：普通敌人的3倍', '基础移动速度：×0.5', '每50秒在当前位置召唤2名普通敌人和1名护盾敌人', '增援继承当前波次的生命值与奖励数值'] },
    { type: 'boss', name: '首领', hpMult: 75, speed: 1.0, size: 25, color: '#ce93d8', appearance: '仅第30波单独出现', desc: '最终波首领，具备阶段性全场压制能力与控制抗性。', traits: ['本体生命值：普通敌人的75倍', '基础移动速度：×1.0', '减速与眩晕持续时间减半', '冰封阈值为40层，冻结持续2秒', '生命降至75% / 50% / 25%时释放全屏震荡波，使防御塔眩晕3.3秒；部署中的毁灭者免疫'] },
    { type: 'dummy', name: '测试假人', hpMult: null, speed: 0, size: 50, color: '#9e9e9e', appearance: '仅测试场出现', desc: '用于DPS测量的静止目标。', traits: ['固定生命值：100,000', '基础移动速度：0', '击杀后在测试场中重置生命值'] }
];

function buildWikiTowers() {
    let html = '<div class="wiki-section-title">防御塔图鉴</div>';
    html += '<p class="wiki-note">射程单位为格（1格=40像素）；攻击间隔/装填等时间单位为秒。价格为首级建造或升级花费。EX级通常需满足特殊条件方可升级。</p>';
    html += '<div class="wiki-grid">';
    for (const key in TOWER_DATA) {
        const t = TOWER_DATA[key];
        const levelCount = t.levels.length;
        const allKeys = new Set();
        t.levels.forEach(lv => Object.keys(lv).forEach(k => allKeys.add(k)));
        const statKeys = WIKI_STAT_ORDER.filter(k => allKeys.has(k));
        const accent = t.color || '#e0e0e0';
        html += `<div class="wiki-card" style="--card-accent:${accent}">`;
        html += `<div class="wiki-card-heading"><canvas class="wiki-model" width="76" height="76" data-wiki-tower-model="${key}" role="img" aria-label="${t.name}模型"></canvas><div>`;
        html += `<h3>${t.name}`;
        if (t.limit) html += `<span class="wiki-limit">上限 ${t.limit}</span>`;
        if (t.exLimit) html += `<span class="wiki-limit">EX上限 ${t.exLimit}</span>`;
        if (!t.limit) html += `<span class="wiki-limit">无上限</span>`;
        html += `</h3></div></div>`;
        html += `<span class="wiki-feature-title">基础特性</span><p class="wiki-desc">${t.description || '无额外说明。'}</p>`;
        if (t.exDescription) html += `<span class="wiki-feature-title">EX级特性</span><p class="wiki-ex">${t.exDescription}</p>`;
        html += `<table class="wiki-table"><thead><tr><th>属性</th>`;
        for (let i = 0; i < levelCount; i++) html += `<th>${i === levelCount - 1 && t.exDescription ? 'EX' : (i + 1) + '级'}</th>`;
        html += `</tr></thead><tbody>`;
        for (const sk of statKeys) {
            html += `<tr><td style="text-align:left;color:#9e9e9e">${WIKI_STAT_LABELS[sk] || sk}</td>`;
            for (let i = 0; i < levelCount; i++) {
                const isEx = i === levelCount - 1 && t.exDescription;
                html += `<td class="${isEx ? 'ex-row' : (sk === 'cost' ? 'lvl' : '')}">${formatWikiStat(sk, t.levels[i][sk])}</td>`;
            }
            html += `</tr>`;
        }
        html += `</tbody></table>`;
        if (key === 'pursuit') {
            html += `<p class="wiki-skill">主动技能「过载模式」（EX）：冷却60秒 → 攻击力+20%、连续发射50发导弹，每10发减少所有追击2秒装填时间。眩晕中的敌人仍会受迷乱反向移动。</p>`;
        }
        if (key === 'frostPunish') {
            html += `<p class="wiki-skill">详细机制：发射冰霜弩箭对单体造成高额伤害并施加强力减速（减速与其它减速效果乘算叠加；目标处于燃烧状态时该减速减半）。<br>女神的惩戒：若命中前目标已存在≥40%的减速，或处于冻结状态，则本次伤害×2，并对目标周围2格范围造成该伤害60%的溅射，同时召来一道天雷。<br>冰寒刻印：每5次攻击为目标附加1层冰寒刻印，叠满15层时冻结敌人（普通4秒/首领2秒），层数与减速塔共享。<br>首领：对首领的减速效果减弱50%。</p>`;
        }
        html += `</div>`;
    }
    html += `</div>`;
    return html;
}

function buildWikiEnemies() {
    const waves = [1, 5, 10, 15, 20, 25, 30];
    let html = '<div class="wiki-section-title">敌人图鉴</div>';
    html += '<p class="wiki-note">速度为基础值（×地图倍率），1.0约等于每秒1格。血量为基础值（×敌人倍率×地图HP倍率）。首领于第30波登场。</p>';
    html += '<div class="wiki-grid">';
    for (const e of WIKI_ENEMIES) {
        html += `<div class="wiki-card wiki-enemy-card" style="--card-accent:${e.color}">`;
        html += `<div class="wiki-card-heading"><canvas class="wiki-model" width="76" height="76" data-wiki-enemy-model="${e.type}" role="img" aria-label="${e.name}模型"></canvas><div><h3>${e.name}</h3><span class="wiki-limit">${e.appearance}</span></div></div>`;
        html += `<span class="wiki-feature-title">单位特性</span><p class="wiki-desc">${e.desc}</p>`;
        if (e.hpMult !== null) {
            html += `<div class="wiki-stat-list">`;
            html += `<div><span class="wiki-stat-key">血量倍率</span>×${e.hpMult}</div>`;
            html += `<div><span class="wiki-stat-key">移速</span>×${e.speed}</div>`;
            html += `<div><span class="wiki-stat-key">体积</span>${e.size}px</div>`;
            html += `</div>`;
            html += `<table class="wiki-table" style="margin-top:6px"><thead><tr><th>波次</th>${waves.map(w => `<th>${w}</th>`).join('')}</tr></thead><tbody><tr><td style="color:#9e9e9e">血量</td>`;
            for (const w of waves) {
                const hp = Math.floor(wikiEnemyBaseHp(w) * e.hpMult);
                html += `<td>${hp.toLocaleString()}</td>`;
            }
            html += `</tr></tbody></table>`;
        } else {
            html += `<div class="wiki-stat-list"><div><span class="wiki-stat-key">血量</span>100,000</div><div><span class="wiki-stat-key">移速</span>0</div></div>`;
        }
        html += `<span class="wiki-feature-title">详细规则</span><div class="wiki-stat-list">${e.traits.map(trait => `<div>${trait}</div>`).join('')}</div>`;
        html += `</div>`;
    }
    html += `</div>`;
    html += '<div class="wiki-section-title">血量成长公式</div>';
    html += '<div class="wiki-card" style="--card-accent:#4dd0e1"><div class="wiki-stat-list">';
    html += `<div><span class="wiki-stat-key">第1–10波</span>baseHp = ⌊40 × 1.15^wave⌋</div>`;
    html += `<div><span class="wiki-stat-key">第11–20波</span>baseHp = ⌊(40×1.15¹⁰) × 1.33^(wave−10)⌋</div>`;
    html += `<div><span class="wiki-stat-key">第21–30波</span>baseHp = ⌊(45×1.15¹⁰×1.25¹⁰) × 1.18^(wave−20)⌋</div>`;
    html += `<div><span class="wiki-stat-key">金钱奖励</span>5 + 波次系数（≤10: +wave；≤20: +10+(wave−10)×2；&gt;20: +30+(wave−20)×3）</div>`;
    html += `</div></div>`;
    html += '<div class="wiki-section-title">波次构成</div>';
    html += '<div class="wiki-card" style="--card-accent:#ffd700"><div class="wiki-stat-list">';
    html += `<div><span class="wiki-stat-key">总数量</span>≤5波: 4+2w；≤10波: 6+2w；≤20波: 8+2w；&gt;20波: 4+2w</div>`;
    html += `<div><span class="wiki-stat-key">护盾数量</span>≤10波:1 ≤15波:2 ≤20波:3 ≤30波:4</div>`;
    html += `<div><span class="wiki-stat-key">快速数量</span>≥11波: min(5, ⌊总数×0.25⌋)</div>`;
    html += `<div><span class="wiki-stat-key">强壮数量</span>≥21波: min(5, ⌊总数×0.25⌋)</div>`;
    html += `<div><span class="wiki-stat-key">召唤者</span>第10/15/20/25波各1只（固定在队伍最尾部）</div>`;
    html += `<div><span class="wiki-stat-key">首领</span>第30波（最终波）单独出现1只</div>`;
    html += `<div><span class="wiki-stat-key">出生间隔</span>每0.5秒1只</div>`;
    html += `</div></div>`;
    html += '<div class="wiki-section-title">控制效果说明</div>';
    html += '<div class="wiki-card" style="--card-accent:#ce93d8"><div class="wiki-stat-list">';
    html += `<div><span class="wiki-stat-key">眩晕</span>停止移动；若同时处于迷乱，仍会反向移动</div>`;
    html += `<div><span class="wiki-stat-key">迷乱(追击)</span>叠加80层干扰触发，沿路径反向移动3秒，每次触发+10%抗性</div>`;
    html += `<div><span class="wiki-stat-key">冰封(减速塔EX)</span>普通15层冻结4秒/首领40层冻结2秒</div>`;
    html += `<div><span class="wiki-stat-key">护盾免疫</span>护盾存在时免疫所有debuff</div>`;
    html += `<div><span class="wiki-stat-key">首领抗性</span>减速/眩晕减半，冰封阈值更高</div>`;
    html += `</div></div>`;
    return html;
}

const WIKI_TAB_ICONS = {
    towers: '<svg class="ui-svg-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V9l7-5 7 5v11M3 20h18M9 20v-5h6v5M8 9h.01M16 9h.01"/></svg>',
    enemies: '<svg class="ui-svg-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16v-5a7 7 0 0 1 14 0v5M8 15h.01M16 15h.01M9 19c1.8 1.3 4.2 1.3 6 0M4 7 2.5 5.5M20 7l1.5-1.5"/></svg>'
};

function renderWikiTowerModel(canvasEl, type) {
    const modelSize = canvasEl.width;
    const modelCtx = canvasEl.getContext('2d');
    modelCtx.clearRect(0, 0, modelSize, modelSize);
    const previewTower = new Tower(modelSize / 2, modelSize / 2, type);
    previewTower.draw(modelCtx, modelSize / 50);
}

function renderWikiEnemyModel(canvasEl, type) {
    const modelCtx = canvasEl.getContext('2d');
    const enemy = new Enemy(1, type);
    const isLargeModel = type === 'boss' || type === 'dummy';
    const targetRadius = isLargeModel ? 18 : 23;
    const modelScale = targetRadius / Math.max(enemy.size, 1);
    modelCtx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    modelCtx.save();
    modelCtx.translate(canvasEl.width / 2, canvasEl.height * .57);
    modelCtx.scale(modelScale, modelScale);
    const animTime = enemy.animPhase;
    switch (type) {
        case 'shield': enemy.drawShieldModel(modelCtx, animTime, 1); break;
        case 'fast': enemy.drawFastModel(modelCtx, animTime, 1); break;
        case 'strong': enemy.drawStrongModel(modelCtx, animTime, 1); break;
        case 'boss': enemy.drawBossModel(modelCtx, animTime, 1); break;
        case 'summoner': enemy.drawSummonerModel(modelCtx, animTime, 1); break;
        case 'dummy': enemy.drawDummyModel(modelCtx, animTime); break;
        default: enemy.drawNormalModel(modelCtx, animTime, 1); break;
    }
    modelCtx.restore();
}

function renderWikiModels() {
    wikiBodyEl.querySelectorAll('[data-wiki-tower-model]').forEach(canvasEl => renderWikiTowerModel(canvasEl, canvasEl.dataset.wikiTowerModel));
    wikiBodyEl.querySelectorAll('[data-wiki-enemy-model]').forEach(canvasEl => renderWikiEnemyModel(canvasEl, canvasEl.dataset.wikiEnemyModel));
}

function renderWiki() {
    wikiBodyEl.innerHTML = wikiActiveTab === 'towers' ? buildWikiTowers() : buildWikiEnemies();
    renderWikiModels();
    wikiBodyEl.scrollTop = 0;
}

function renderWikiTabs() {
    const tabs = [['towers', '防御塔'], ['enemies', '敌人']];
    wikiTabsEl.innerHTML = tabs.map(([key, label]) => `<button type="button" class="wiki-tab${key === wikiActiveTab ? ' active' : ''}" data-wiki-tab="${key}">${WIKI_TAB_ICONS[key]}${label}</button>`).join('');
}

function openWiki() {
    renderWikiTabs();
    renderWiki();
    wikiModal.style.display = 'flex';
    wikiBuilt = true;
}
function closeWiki() { wikiModal.style.display = 'none'; }

wikiTabsEl.addEventListener('click', event => {
    const btn = event.target.closest('[data-wiki-tab]');
    if (!btn) return;
    wikiActiveTab = btn.dataset.wikiTab;
    renderWikiTabs();
    renderWiki();
});
document.getElementById('open-wiki-btn').addEventListener('click', openWiki);
document.getElementById('wiki-close-x').addEventListener('click', closeWiki);
wikiModal.addEventListener('click', event => { if (event.target === wikiModal) closeWiki(); });
window.addEventListener('keydown', event => { if (event.key === 'Escape' && wikiModal.style.display === 'flex') closeWiki(); });
