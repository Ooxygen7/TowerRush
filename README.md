<p align="center">
  <img src="logo.png" alt="TowerRush logo" width="150">
</p>

<h1 align="center">TowerRush · 快节奏塔防</h1>

<p align="center">
  一款<strong>零依赖、零构建</strong>的HTML5 塔防游戏 —— 24 种防御塔、7 类敌人、6 张地图、30 波进攻，<br>
  程序化合成音效，内置在线排行榜与回放系统。纯原生 JavaScript + Canvas 编写。
</p>

<p align="center">
  <a href="https://game.unsnow.online/td"><strong>▶ 在线试玩</strong></a> ·
  <a href="#-快速开始">快速开始</a> ·
  <a href="#-部署排行榜服务端">部署服务端</a> ·
  <a href="#-修改与扩展">修改与扩展</a> ·
  <a href="./docs/index.html">项目主页</a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-f0a048?style=flat-square"></a>
  <img alt="Vanilla JS" src="https://img.shields.io/badge/Vanilla_JS-ES2020-f0a048?style=flat-square&logo=javascript&logoColor=white">
  <img alt="HTML5 Canvas" src="https://img.shields.io/badge/HTML5-Canvas-ff7a18?style=flat-square&logo=html5&logoColor=white">
  <img alt="Web Audio" src="https://img.shields.io/badge/Web_Audio-程序化合成-4dd0e1?style=flat-square">
  <img alt="Python" src="https://img.shields.io/badge/Backend-Python_3_stdlib-ffd700?style=flat-square&logo=python&logoColor=white">
  <img alt="No build" src="https://img.shields.io/badge/构建-无需打包-2c2c2c?style=flat-square">
  <img alt="Dependencies" src="https://img.shields.io/badge/运行时依赖-0-2c2c2c?style=flat-square">
</p>

---

## ✨ 特性

- 🗼 **24 种防御塔**，每种 4–9 个升级等级，满级解锁专属 **EX 形态与特殊能力**（爆炸箭雨、连锁闪电、巡航导弹、灼日审判……）。
- 👾 **7 类敌人**：普通 / 快速 / 强壮 / 护盾 / 召唤者 / 首领，外加测试场假人；首领具备阶段震荡波与控制抗性。
- 🗺️ **6 张地图**，各有独特路径走线与难度修正（敌人血量 / 移速倍率）。
- 🌊 **30 波程序化进攻**，召唤者于第 10/15/20/25 波登场，首领坐镇最终波。
- 🎵 **零文件音效**：所有打击 / 升级 / 技能音效均由 **Web Audio API 实时合成**，不依赖任何音频文件（BGM 可选）。
- 🏆 **在线排行榜 + 回放**：通过 [LinuxDo](https://linux.do) OAuth 登录，分图上榜，可观看任意记录的完整回放。
- 📖 **内置图鉴 Wiki**：塔与敌人的全部数值在游戏内可查。
- 📱 **移动端适配**：横屏、触控、`pointer: coarse` 自适应。
- ⚙️ **固定步长模拟**（60Hz）+ 离屏画布缓存，逻辑与帧率解耦，回放可精确复现。
- 🧩 **纯原生、无依赖、无构建**：双击 `index.html` 即玩。

## 🎮 玩法概览

在敌人沿地图路径抵达终点前将其消灭。每张地图开局会进行一次**防御塔抽选（Draft）**组成你的 7 塔卡池，随后在草地上建造、升级、组合它们：

1. **选塔 → 选图 → 开局**。
2. 用初始金钱建造防御塔，击杀敌人获得金钱，继续升级 / 扩建。
3. 撑过第 30 波的首领即获胜；漏怪扣除基地血量，归零则失败。
4. 登录后可将成绩与回放上传至**排行榜**，其他玩家可进行回放。


## 🗼 防御塔

> 费用区间为「1 级 → 满级」的造价跨度；**上限**为可同时建造数量（∞ = 不限）；**EX** 为可升至满级形态的数量上限。完整数值见游戏内图鉴。

<details open>
<summary><strong>全部 24 种防御塔</strong>（点击折叠）</summary>

| 防御塔 | id | 费用 | 上限 | EX | 简介 |
|---|---|---|:--:|:--:|---|
| 弩塔 | `arrow` | 200–1500 | ∞ | — | 百发百中的自动弩，射程远，造价实惠，性价比首选。 |
| 加农炮 | `cannon` | 400–2000 | ∞ | — | 高冲击炮弹，命中对落点周围 1 格造成 60% 溅射。 |
| 术击塔 | `magic` | 500–2500 | ∞ | — | 高伤远射魔法塔，命中破防使敌人受伤 +15%。 |
| 减速塔 | `slow` | 400–2200 | ∞ | 5 | 范围伤害并施加减速；EX 强化冰霜领域。 |
| 爆破塔 | `blast` | 600–3000 | 8 | 3 | 对目标及周围小范围造成爆炸伤害。 |
| 伽马射线 | `gamma` | 400–850 | 10 | — | 攻击蔓延至目标周围敌人，二次造成伤害。 |
| 日照塔 | `sun` | 700–3000 | 6 | 3 | 持续锁定单体，伤害随时间递增；EX 灼日审判。 |
| 机枪阵线 | `gatlingGun` | 1200–6000 | 5 | 3 | 多机枪集群，同时扫射射程内多个敌人。 |
| 电核心 | `electricCore` | 800–1500 | 2 | — | 光环：为友方塔提供攻速加成，可超频。 |
| 特斯拉塔 | `tesla` | 700–4000 | 4 | — | 连锁闪电，同时攻击并眩晕多个敌人。 |
| 窃取爪 | `thiefClaw` | 200–1800 | 6 | 2 | 经济型：攻击有几率窃取金钱，伤害极低。 |
| 音乐台 | `musicStand` | 1200–2500 | 1 | — | 光环：升级折扣 + 射程伤害加成，附主动技能。 |
| 军事基地 | `militaryBase` | 1300–4200 | 2 | 1 | 不攻击，定期产出友方士兵作战；EX 产坦克。 |
| 矩阵塔 | `matrix` | 300–4000 | 10 | 1 | 与其他矩阵塔连线获得增益。 |
| 毁灭者 | `destroyer` | 500 | 1 | — | 一次性部署的战术兵器。 |
| 蓄电池 | `battery` | 300–800 | 6 | — | 后备能源，为体系供能。 |
| 导弹井 | `missileSilo` | 1500–7000 | 2 | 1 | 巡航导弹，大范围巨额伤害 + 长时间眩晕。 |
| 引力信标 | `gravityBeacon` | 200–500 | 4 | — | 引力脉冲，将范围内敌人沿路径推回。 |
| 功勋神龛 | `shrineOfMerit` | 500–7500 | 2 | 2 | 古老遗产，9 级成长，提供功勋 / 经济收益。 |
| 聚光灯 | `spotlight` | 3000–8000 | 1 | 1 | 强射束持续灼烧区域内所有敌人。 |
| 追击 | `pursuit` | 1000–5500 | 5 | 2 | 快速连射追踪导弹，落点范围伤害。 |
| 重武器站 | `heavyWeapons` | 4000–12000 | 1 | — | 高阶聚合型武器站。 |
| 回旋刃 | `boomerang` | 500–3000 | ∞ | 3 | 往返飞刃，前中期利器。 |
| 寒冰惩戒 | `frostPunish` | 800–3500 | 6 | — | 冰霜遗物，强力减速 / 冻结。 |

</details>

## 👾 敌人

敌人基础生命值按波次成长：`第1–10波 baseHp = ⌊40 × 1.15^wave⌋`，之后逐段加速增长。各类型在此基础上乘以血量倍率：

| 敌人 | type | 血量倍率 | 移速 | 出场 | 特点 |
|---|---|:--:|:--:|---|---|
| 普通敌人 | `normal` | ×1.0 | ×1.0 | 第 1–30 波 | 标准单位，无特殊能力 |
| 快速敌人 | `fast` | ×0.8 | ×2.5 | 常规 | 高速冲刺，需要减速 / 高频塔应对 |
| 强壮敌人 | `strong` | ×2.2 | ×0.7 | 常规 | 高血量肉盾 |
| 护盾敌人 | `shield` | ×1.7 (+0.5 护盾) | ×0.85 | 常规 | 额外护盾层，需先破盾 |
| 召唤者 | `summoner` | ×3.0 | ×0.5 | 第 10/15/20/25 波 | 每 50 秒召唤 2 普通 + 1 护盾增援 |
| 首领 | `boss` | ×75 | ×1.0 | 仅第 30 波 | 减速 / 眩晕减半，阶段性全屏震荡波眩晕防御塔 |
| 测试假人 | `dummy` | 固定 100,000 | 0 | 仅测试场 | 用于 DPS 测量的静止靶 |

## 🗺️ 地图

网格为 **25 × 18** 格，`path` 由一串 `[列, 行]` 路点连成轴向折线，敌人沿此路径前进。

| 地图 | id | 路径风格 | 难度修正 |
|---|---|---|---|
| 回环走廊 | `MAP1` | 长蛇形折返长廊 | 无（基准） |
| 蜿蜒小径 | `MAP2` | 蜿蜒迂回 | 敌人血量 ×0.8 / 移速 ×0.8 |
| 螺旋中心 | `MAP3` | 向心螺旋 | 无 |
| 曲折之路 | `MAP4` | 梳齿状急转 | 敌人血量 ×0.75 / 移速 ×0.75 |
| 双子回廊 | `MAP5` | 对称双回廊 | 敌人血量 ×0.7 / 移速 ×0.7 |
| S形公路 | `MAP6` | 大开大合 S 形 | 敌人血量 ×0.7 / 移速 ×0.7 |

## 🚀 快速开始

**本地游玩** —— 无需任何依赖或构建：

```bash
git clone https://github.com/Ooxygen7/TowerRush.git
cd TowerRush
# 直接双击 index.html，或用任意静态服务器：
python -m http.server 8080      # 然后访问 http://localhost:8080/
```

> 采用经典 `<script>`（非 ES Module），因此 `file://` 直接双击打开即可运行，无需服务器。

## 🏆 排行榜与回放

排行榜 / 回放 / 登录由 `server/leaderboard_server.py` 提供（Python 标准库，零三方依赖，SQLite 持久化）：

- **登录**：LinuxDo OAuth（`/td/auth/linuxdo/login`）。
- **上传成绩**：`POST /td/api/scores`（含完整操作回放，服务端校验分数范围与回放体积）。
- **查询榜单**：`GET /td/api/leaderboard?map=MAP1`。
- **观看回放**：`GET /td/api/replays/<id>` —— 客户端用固定步长精确复现。
- **健康检查**：`GET /td/api/health` → `{"ok":true,"oauthReady":...}`。

游戏前端通过相对路径 `/td/api/*` 调用，因此**部署到任意域名都无需改代码**。

## 🌐 部署排行榜服务端

架构：`nginx`（静态文件 + 反向代理）→ `leaderboard_server.py`（监听 `127.0.0.1:3947`，由 `systemd` 守护）。

**① 服务器首次初始化**（在目标服务器上以 root 运行一次）：

```bash
sudo DOMAIN=game.example.com bash scripts/server-setup.sh
```

脚本会：创建目录 → 安装 systemd 服务 → 部署 nginx 站点 → 生成 `/etc/tf-leaderboard.env`（权限 600）。

**② 填写 OAuth 密钥**并重启：

```bash
sudo nano /etc/tf-leaderboard.env     # 填 TF_LINUXDO_CLIENT_ID / SECRET / TF_BASE_URL
sudo systemctl restart tf-leaderboard
sudo certbot --nginx -d game.example.com   # 首次申请 TLS 证书
```

**③ 以后一键推送**游戏与代码更新（在本地仓库运行）：

```bash
./scripts/deploy.sh user@game.example.com              # 推送游戏 + 服务端
./scripts/deploy.sh user@game.example.com --web-only   # 只更新前端静态文件
./scripts/deploy.sh user@game.example.com --with-bgm   # 连同本地 BGM 一起上传
```

> 路径可用环境变量覆盖：`WEB_ROOT`（默认 `/var/www/td`）、`APP_DIR`（默认 `/opt/tf-leaderboard`）、`SERVICE`（默认 `tf-leaderboard`）。

## 🎵 关于背景音乐

游戏**音效**全部由 Web Audio 实时合成，无需任何文件。**背景音乐（BGM）** 则为可选外部文件，出于版权考虑**未随仓库分发**。如需启用，把以下文件放到仓库根目录（与 `index.html` 同级）即可被自动加载：

```
home.mp3     # 主菜单循环
bgm1.mp3     # 战斗时顺序循环
bgm2.mp3
bgm3.mp3
```

缺少这些文件不影响游戏运行，仅没有背景音乐。

## 🧩 修改与扩展

所有可玩性数据都从代码中清晰拆分，改动后**刷新页面即可生效**（无构建步骤）。

<details>
<summary><strong>➕ 新增 / 修改防御塔</strong> —— <code>js/data/towers.js</code></summary>

向 `TOWER_DATA` 添加一个键即可；战前抽选池通过 `for (const type in TOWER_DATA)` 自动收录。

```js
myTower: {
  name: '我的塔',
  description: '一句话简介（图鉴展示）。',
  exDescription: '满级 EX 形态的特殊能力说明。',
  color: '#8bc34a',          // 塔身颜色
  projectileColor: '#dcedc8',// 弹道颜色
  limit: 6,                  // 可同时建造数量上限（省略 = 不限）
  exLimit: 2,                // 可升至 EX 的数量上限（可选）
  levels: [
    { cost: 200, damage: 5,  range: 5,   fireRate: 40 },  // 1 级（fireRate 越小越快）
    { cost: 400, damage: 9,  range: 6,   fireRate: 36 },  // 2 级
    { cost: 1500, damage: 25, range: 7,  fireRate: 30,    // 末级 = EX 形态
      specialAttackRate: 5, specialDamage: 30 }           // 额外字段触发特殊逻辑
  ],
},
```

- 单体伤害用 `damage`；持续/区域类塔可改用 `minDamage`/`maxDamage`（见 `sun`）。
- 行为差异（溅射、连锁、光环、召唤等）在 `js/entities/tower.js` 的攻击逻辑中按 `tower.type` 分支实现，新增独特机制时在此扩展。
</details>

<details>
<summary><strong>➕ 新增 / 修改敌人</strong> —— 需同步三处</summary>

1. **数值与外观** `js/entities/enemy.js` 的 `switch (this.type)`：设置 `this.maxHp` 与 `baseSpeed`。
   ```js
   case 'myEnemy':
     this.maxHp = baseHp * 1.5;   // 相对普通敌人的血量倍率
     baseSpeed  = 1.2 * scale;    // 移动速度
     break;
   ```
2. **可刷出** `js/game-logic.js` 的 `validEnemyTypes` 集合中加入 `'myEnemy'`（否则不会在波次中生成）。
3. **图鉴** `js/wiki.js` 的 `WIKI_ENEMIES` 数组追加一条（`type/name/hpMult/speed/appearance/desc/traits`）。

> 模型绘制（`drawXxxModel`）同样在 `js/entities/enemy.js` 按类型分支，新增类型时补一个绘制分支。
</details>

<details>
<summary><strong>➕ 新增 / 修改地图</strong> —— <code>js/data/maps.js</code>（+ 服务端白名单）</summary>

向 `MAP_DATA` 添加一个键；选图界面与排行榜分页通过 `Object.keys(MAP_DATA)` 自动收录。

```js
MAP7: {
  name: '我的地图',
  path: [ [2,0], [2,9], [22,9], [22,17] ],   // [列,行] 路点；画布为 25×18 格
  modifier: { hp: 0.9, speed: 0.9 },         // 可选：敌人血量 / 移速倍率
  modifierText: '敌人血量 x0.9, 移速 x0.9',   // 可选：选图界面提示文字
},
```

若要让该图能上传排行榜，在 `server/leaderboard_server.py` 的 `VALID_MAPS` 集合里加入 `"MAP7"`。
</details>

## 🏗️ 技术架构

- **前端**：原生 JavaScript + HTML5 Canvas，无框架、无打包。多个经典 `<script>` 按依赖顺序加载，共享全局作用域。
- **渲染**：背景 / 主体 / 特效分层离屏画布缓存；固定步长（`1000/60` ms）模拟与渲染解耦。
- **音频**：`AudioDirector` 基于 Web Audio API 程序化合成全部音效。
- **后端**：Python 标准库 `http.server`（`ThreadingHTTPServer`）+ SQLite（WAL），无三方依赖；LinuxDo OAuth；回放以 JSON 存储。
- **部署**：nginx 反代 + systemd 守护 + Let's Encrypt。

### 📁 目录结构

```
TowerRush/
├─ index.html              # 页面外壳：引入 css 与按序加载的 js 模块
├─ css/styles.css          # 全部样式
├─ js/
│  ├─ constants.js         # 常量、计分与回放配置
│  ├─ audio.js             # Web Audio 程序化音效
│  ├─ data/
│  │  ├─ maps.js           # MAP_DATA —— 6 张地图
│  │  └─ towers.js         # TOWER_DATA —— 24 种防御塔
│  ├─ entities/
│  │  ├─ tower.js          # Tower 类与攻击逻辑
│  │  ├─ enemy.js          # Enemy 类、数值与模型
│  │  ├─ projectiles.js    # 弹丸 / 士兵 / 坦克 / 导弹 / 回旋刃
│  │  └─ effects.js        # 约 40 种视觉特效类
│  ├─ game-logic.js        # 波次生成、游戏循环、交互
│  ├─ selection.js         # 战前选图与抽塔
│  ├─ main.js              # 初始化与事件绑定
│  ├─ leaderboard.js       # 排行榜 / 登录 / 回放客户端
│  └─ wiki.js              # 内置图鉴
├─ logo.png
├─ server/                 # 排行榜服务端 + 部署配置
│  ├─ leaderboard_server.py
│  ├─ nginx-game.conf
│  ├─ tf-leaderboard.service
│  └─ tf-leaderboard.env.example
├─ scripts/
│  ├─ server-setup.sh      # 服务器首次初始化
│  └─ deploy.sh            # 本地一键部署 / 更新
└─ docs/index.html         # 项目主页（GitHub Pages 可用）
```

## ⚠️ 注意事项

- 前端刻意采用经典 `<script>` 而非 ES Module，以便 `file://` 直接打开；若改用模块化需经 http(s) 提供服务。
- `<script>` 的加载顺序即依赖顺序，调整拆分时务必保持先定义后使用。
- 部署后 OAuth 密钥只存在于服务器 `/etc/tf-leaderboard.env`（权限 600），**切勿提交进仓库**。
- `deploy.sh` 默认 `rsync --delete-after` 同步 `WEB_ROOT`，请确保该目录专用于本游戏。
- SQLite 数据库默认位于 `/var/lib/tf-leaderboard/leaderboard.db`，请纳入备份。

## 🤝 贡献

欢迎 Issue 与 PR。改动游戏逻辑后，建议至少在浏览器中完成一次「选塔 → 选图 → 开始 → 通关 → 回放成功」的验证（控制台应无报错）。

## 📄 许可证

本项目以 [MIT 许可证](LICENSE) 开源。禁止商用。

<p align="center"><sub>用 ❤️ 与原生 JavaScript 打造 · <a href="https://github.com/Ooxygen7/TowerRush">Ooxygen7/TowerRush</a></sub></p>
