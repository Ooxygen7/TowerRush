<p align="center">
  <img src="logo.png" alt="TowerRush logo" width="150">
</p>

<h1 align="center">TowerRush · Fast-Paced Tower Defense</h1>

<p align="center">
  A <strong>zero-dependency, zero-build</strong> single-page HTML5 tower-defense game: 24 towers, 7 enemy types, 6 maps, and 30 waves.<br>
  Built with vanilla JavaScript and Canvas, with procedural sound effects, an online leaderboard, and replay support.
</p>

<p align="center">
  <a href="https://game.unsnow.online/td"><strong>▶ Play Online</strong></a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#deploy-the-leaderboard-server">Deploy Server</a> ·
  <a href="#customization-and-extension">Customize &amp; Extend</a> ·
  <a href="./docs/index.html">Project Homepage</a>
</p>

<p align="center">
  <a href="./README.md">中文文档</a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-f0a048?style=flat-square"></a>
  <img alt="Vanilla JS" src="https://img.shields.io/badge/Vanilla_JS-ES2020-f0a048?style=flat-square&logo=javascript&logoColor=white">
  <img alt="HTML5 Canvas" src="https://img.shields.io/badge/HTML5-Canvas-ff7a18?style=flat-square&logo=html5&logoColor=white">
  <img alt="Web Audio" src="https://img.shields.io/badge/Web_Audio-Procedural-4dd0e1?style=flat-square">
  <img alt="Python" src="https://img.shields.io/badge/Backend-Python_3_stdlib-ffd700?style=flat-square&logo=python&logoColor=white">
  <img alt="No build step" src="https://img.shields.io/badge/Build-none-2c2c2c?style=flat-square">
  <img alt="Runtime dependencies" src="https://img.shields.io/badge/Runtime_dependencies-0-2c2c2c?style=flat-square">
</p>

---

## Features

- **24 defensive towers.** Each has 4–9 upgrade levels; reaching the last level unlocks an **EX form** with a signature ability, such as explosive arrow storms, chain lightning, cruise missiles, or a sunbeam judgment.
- **7 enemy types:** normal, fast, strong, shielded, summoner, boss, and a training dummy. Bosses have phase shockwaves and resistance to crowd control.
- **6 maps** with distinct paths and difficulty modifiers for enemy health and movement speed.
- **30 procedural waves.** Summoners appear on waves 10, 15, 20, and 25; the boss commands wave 30.
- **No audio assets required for SFX.** Every combat, upgrade, and skill sound is synthesized in real time through the Web Audio API. Background music is optional.
- **Online leaderboard and replays.** Sign in through [LinuxDo](https://linux.do) OAuth, submit scores per map, and watch complete recorded replays.
- **In-game wiki** for tower and enemy stats.
- **Mobile-ready controls** for landscape touch devices and `pointer: coarse` input.
- **Replay-safe simulation:** a fixed 60 Hz simulation step and off-screen canvas layers keep gameplay separate from rendering frame rate.
- **Vanilla, dependency-free, and build-free.** Open `index.html` and play.

## How to play

Destroy enemies before they reach the end of the map. At the beginning of every map, a tower draft creates a pool of seven tower cards. Build on grass, upgrade intelligently, and combine tower synergies.

1. Select a map, draft towers, and start the match.
2. Spend starting gold to build towers; defeated enemies provide gold for upgrades and expansion.
3. Click **Start Next Wave** to begin a wave. Starting early grants a speed-score bonus.
4. Defeat the wave-30 boss to win. Leaks reduce base health; reaching zero is a loss.
5. Sign in to upload a score and replay to the leaderboard.

> Score = base score (economy and kills) × skill multiplier (1.0–2.0; stronger play scores higher) + speed score (wave pacing).

## Towers

The cost range covers level 1 through the final level. **Limit** is the maximum number that can be built at once (`∞` means unlimited); **EX** is the maximum number that may reach their final form.

| Tower | id | Cost | Limit | EX | Role |
|---|---|---:|:--:|:--:|---|
| Arrow Tower | `arrow` | 200–2,500 | ∞ | ∞ | Accurate, long-range, and affordable general-purpose tower. |
| Cannon | `cannon` | 400–4,000 | ∞ | ∞ | High-impact shells with splash damage. |
| Magic Tower | `magic` | 500–3,500 | ∞ | ∞ | Long-range magic damage that exposes enemies to extra damage. |
| Slow Tower | `slow` | 400–3,200 | ∞ | 5 | Area damage and slow; EX strengthens its frost domain. |
| Blast Tower | `blast` | 600–6,000 | 8 | 3 | Explosive damage around the target. |
| Gamma Ray | `gamma` | 400–4,250 | 10 | ∞ | Damage spreads from the target to nearby enemies. |
| Sun Tower | `sun` | 700–8,000 | 6 | 3 | A sustained beam whose damage ramps up over time. |
| Gatling Line | `gatlingGun` | 1,200–9,000 | 5 | 3 | A cluster of guns that sweeps multiple enemies. |
| Electric Core | `electricCore` | 800–7,500 | 2 | ∞ | Aura tower that boosts allied attack speed. |
| Tesla Tower | `tesla` | 700–8,000 | 4 | ∞ | Chain lightning that can stun multiple enemies. |
| Thief Claw | `thiefClaw` | 200–2,800 | 6 | 2 | Economic tower with a chance to steal gold on attack. |
| Music Stand | `musicStand` | 1,200–9,500 | 1 | ∞ | Upgrade-discount and combat aura with an active skill. |
| Military Base | `militaryBase` | 1,300–9,200 | 2 | 1 | Periodically deploys friendly soldiers; EX deploys tanks. |
| Matrix Tower | `matrix` | 300–8,000 | 10 | 1 | Links with other Matrix Towers to gain bonuses. |
| Destroyer | `destroyer` | 500 | 1 | ∞ | A one-time tactical weapon. |
| Battery | `battery` | 300–4,800 | 6 | ∞ | Reserve power for the wider tower system. |
| Missile Silo | `missileSilo` | 1,500–15,000 | 2 | 1 | Cruise missiles with huge area damage and a long stun. |
| Gravity Beacon | `gravityBeacon` | 2,000–9,000 | 4 | ∞ | Gravity pulses push enemies back along their path. |
| Shrine of Merit | `shrineOfMerit` | 500–9,500 | 2 | 2 | Ancient relic with nine levels of merit and economy growth. |
| Spotlight | `spotlight` | 3,000–20,000 | 1 | 1 | Burns all enemies continuously within its focused area. |
| Pursuit | `pursuit` | 1,000–9,500 | 5 | 2 | Fast tracking missiles with area damage on impact. |
| Heavy Weapons Station | `heavyWeapons` | 4,000–32,000 | 1 | ∞ | High-tier composite weapons platform. |
| Boomerang | `boomerang` | 500–6,000 | ∞ | 3 | Returning blades, especially useful in the early and mid game. |
| Frost Punishment | `frostPunish` | 800–8,500 | 6 | ∞ | Powerful slowing and freezing relic. |

## Enemies

Enemy base health scales by wave: for waves 1–10, `baseHp = 20 × 1.15^wave`; it grows faster in later stages. Each type applies its own health multiplier.

| Enemy | type | Health | Speed | Appearance | Trait |
|---|---|:--:|:--:|---|---|
| Normal | `normal` | ×1.0 | ×1.0 | Waves 1–30 | Standard unit. |
| Fast | `fast` | ×0.8 | ×2.5 | Regular | Rushes quickly; counter with slow or high fire rate. |
| Strong | `strong` | ×2.2 | ×0.7 | Regular | High-health bruiser. |
| Shield | `shield` | ×1.7 + shield | ×0.85 | Regular | Extra shield layer must be broken first. |
| Summoner | `summoner` | ×3.0 | ×0.5 | Waves 10/15/20/25 | Periodically summons normal and shield reinforcements. |
| Boss | `boss` | ×75 | ×1.0 | Wave 30 only | Reduced slow/stun duration and phase-wide shockwaves. |
| Dummy | `dummy` | 100,000 | 0 | Training only | Stationary target for DPS testing. |

## Maps

The playfield is a **25 × 18** grid. Each map `path` is a list of `[column, row]` waypoints that form an orthogonal route.

| Map | id | Path style | Difficulty modifier |
|---|---|---|---|
| Looping Corridor | `MAP1` | Long serpentine route | None (baseline) |
| Honeycomb Trail | `MAP2` | Winding route | Enemy HP ×0.8, speed ×0.8 |
| Spiral Center | `MAP3` | Inward spiral | None |
| Zigzag Road | `MAP4` | Tight, sharp turns | Enemy HP ×0.75, speed ×0.75 |
| Twin Loops | `MAP5` | Symmetrical double loop | Enemy HP ×0.7, speed ×0.7 |
| S-Curve Highway | `MAP6` | Broad S-shaped route | Enemy HP ×0.7, speed ×0.7 |

## Quick Start

**Play locally** — no dependencies or build process are needed:

```bash
git clone https://github.com/Ooxygen7/TowerRush.git
cd TowerRush
# Open index.html directly, or serve it with any static server:
python -m http.server 8080
# Then visit http://localhost:8080/
```

The project uses classic `<script>` tags rather than ES modules, so it also works when opened directly with `file://`.

## Leaderboard and replays

`server/leaderboard_server.py` provides login, leaderboard, and replay support using only the Python standard library and SQLite.

- **Login:** LinuxDo OAuth at `/td/auth/linuxdo/login`
- **Submit a score:** `POST /td/api/scores`, including the full input replay. The server validates score bounds and replay size.
- **Read a leaderboard:** `GET /td/api/leaderboard?map=MAP1`
- **Watch a replay:** `GET /td/api/replays/<id>`; the client reproduces it with the fixed-step simulator.
- **Health check:** `GET /td/api/health` → `{"ok":true,"oauthReady":...}`

The frontend uses relative `/td/api/*` paths, so moving it to another domain does not require code changes.

## Deploy the leaderboard server

Architecture: `nginx` (static files and reverse proxy) → `leaderboard_server.py` (listens on `127.0.0.1:3947`, supervised by `systemd`).

**1. First-time server setup** — run once as `root` on the target server:

```bash
sudo DOMAIN=game.example.com bash scripts/server-setup.sh
```

The script creates the required directories, installs the systemd unit, configures the nginx site, and writes `/etc/tf-leaderboard.env` with mode `600`.

**2. Set OAuth secrets and restart:**

```bash
sudo nano /etc/tf-leaderboard.env  # TF_LINUXDO_CLIENT_ID / SECRET / TF_BASE_URL
sudo systemctl restart tf-leaderboard
sudo certbot --nginx -d game.example.com  # first TLS certificate
```

**3. Deploy updates** from a local checkout:

```bash
./scripts/deploy.sh user@game.example.com              # game and server
./scripts/deploy.sh user@game.example.com --web-only   # static frontend only
./scripts/deploy.sh user@game.example.com --with-bgm   # include local BGM files
```

Override deployment paths with `WEB_ROOT` (default `/var/www/td`), `APP_DIR` (default `/opt/tf-leaderboard`), and `SERVICE` (default `tf-leaderboard`).

## Background music

Sound effects are synthesized by Web Audio and require no files. Background music is optional and is intentionally not distributed with the repository for copyright reasons. To enable it, put the following files beside `index.html`:

```text
home.mp3  # main menu
bgm1.mp3  # battle
bgm2.mp3
bgm3.mp3
```

Missing music files do not affect gameplay; they only disable background music.

## Customization and extension

Gameplay data is deliberately separated in code. Changes take effect after refreshing the page—there is no build step.

### Add or change a tower — `js/data/towers.js`

Add an entry to `TOWER_DATA`. The pre-game draft automatically includes every tower defined with `for (const type in TOWER_DATA)`.

```js
myTower: {
  name: 'My Tower',
  description: 'One-line description shown in the wiki.',
  exDescription: 'What its final EX form does.',
  color: '#8bc34a',
  projectileColor: '#dcedc8',
  limit: 6,       // Maximum built at once; omit for unlimited.
  exLimit: 2,     // Optional maximum that can reach EX.
  levels: [
    { cost: 200, damage: 5, range: 5, fireRate: 40 },
    { cost: 400, damage: 9, range: 6, fireRate: 36 },
    { cost: 1500, damage: 25, range: 7, fireRate: 30,
      specialAttackRate: 5, specialDamage: 30 },
  ],
},
```

Use `damage` for direct damage. Continuous-area towers can instead use `minDamage` and `maxDamage` (see `sun`). Implement behavior differences—splash, chaining, auras, summoning, and so on—in `js/entities/tower.js`, branching on `tower.type`.

### Add or change an enemy

Update all three locations:

1. In `js/entities/enemy.js`, add a `switch (this.type)` branch that sets `this.maxHp` and `baseSpeed`.
2. Add `'myEnemy'` to `validEnemyTypes` in `js/game-logic.js`, otherwise it will never spawn in waves.
3. Add a `type`, `name`, `hpMult`, `speed`, `appearance`, `desc`, and `traits` entry to `WIKI_ENEMIES` in `js/wiki.js`.

Add a matching `drawXxxModel` branch in `js/entities/enemy.js` for a new enemy model.

### Add or change a map — `js/data/maps.js`

Add an entry to `MAP_DATA`; the map-select screen and leaderboard tabs use `Object.keys(MAP_DATA)` and pick it up automatically.

```js
MAP7: {
  name: 'My Map',
  path: [[2, 0], [2, 9], [22, 9], [22, 17]],
  modifier: { hp: 0.9, speed: 0.9 },
  modifierText: 'Enemy HP ×0.9, speed ×0.9',
},
```

To allow leaderboard submissions for the new map, also add `"MAP7"` to `VALID_MAPS` in `server/leaderboard_server.py`.

## Technical architecture

- **Frontend:** vanilla JavaScript and HTML5 Canvas; no framework or bundler. Classic `<script>` tags load in dependency order and share the global scope.
- **Rendering:** background, main scene, and effects are layered off-screen canvases. Simulation uses a fixed `1000/60` ms step and interpolated rendering.
- **Audio:** `AudioDirector` synthesizes all sound effects with the Web Audio API.
- **Backend:** Python-standard-library `http.server` (`ThreadingHTTPServer`), SQLite in WAL mode, LinuxDo OAuth, and JSON replay storage.
- **Deployment:** nginx reverse proxy, systemd service supervision, and Let's Encrypt.

### Directory layout

```text
TowerRush/
├── index.html                 # Page shell; loads CSS and scripts in order
├── css/styles.css             # All styles
├── js/
│   ├── constants.js           # Constants, score, and replay configuration
│   ├── audio.js               # Procedural Web Audio sound effects
│   ├── data/maps.js           # MAP_DATA: six maps
│   ├── data/towers.js         # TOWER_DATA: 24 towers
│   ├── entities/tower.js      # Tower class and attack logic
│   ├── entities/enemy.js      # Enemy class, stats, and models
│   ├── entities/projectiles.js# Projectiles, units, tanks, missiles, blades
│   ├── entities/effects.js    # About 40 visual-effect classes
│   ├── game-logic.js          # Wave generation, game loop, input
│   ├── selection.js           # Map selection and tower drafting
│   ├── main.js                # Initialization and event binding
│   ├── leaderboard.js         # Leaderboard, login, and replay client
│   └── wiki.js                # In-game wiki
├── logo.png
├── server/                    # Leaderboard service and deployment config
├── scripts/server-setup.sh    # First-time server setup
├── scripts/deploy.sh          # One-command deployment/update
└── docs/index.html            # Project homepage; GitHub Pages compatible
```

## Notes

- The frontend intentionally uses classic `<script>` tags, allowing direct `file://` use. Switching to modules requires an HTTP(S) server.
- Script load order is dependency order. When splitting or rearranging files, define code before it is used.
- Keep OAuth secrets only in `/etc/tf-leaderboard.env` (mode `600`); never commit them.
- `deploy.sh` synchronizes `WEB_ROOT` with `rsync --delete-after`. Use a directory dedicated to this game.
- The SQLite database defaults to `/var/lib/tf-leaderboard/leaderboard.db`; include it in backups.

## Contributing

Issues and pull requests are welcome. After changing gameplay logic, smoke-test a complete run in a browser: select a map, place towers, start waves, and clear the game without console errors.

## Acknowledgments

Thanks to the [Linux.do](https://linux.do) community for providing a place to connect and for its support. This project’s ideas and iterations have benefited greatly from the feedback and suggestions of fellow community members.

## License

TowerRush is released under the [MIT License](LICENSE). Background-music files are not included; their copyrights remain with their respective owners.

<p align="center"><sub>Made with ❤️ and vanilla JavaScript · <a href="https://github.com/Ooxygen7/TowerRush">Ooxygen7/TowerRush</a></sub></p>
