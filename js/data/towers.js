const TOWER_DATA = {
    arrow: {
        name: '弩塔',
        description: '百发百中的自动弩，射程远，造价实惠，性价比的首选。',
        exDescription: '每5次攻击发射爆炸箭(30范围伤害)；每45次攻击发射信号箭，2秒后在落点召唤持续3秒的箭雨。',
        color: '#8bc34a',
        projectileColor: '#dcedc8',
        levels: [
            { cost: 200, damage: 2, range: 5, fireRate: 39 },
            { cost: 250, damage: 4, range: 5.5, fireRate: 39 },
            { cost: 300, damage: 6, range: 6, fireRate: 36 },
            { cost: 500, damage: 10, range: 6.5, fireRate: 36 },
            { cost: 1500, damage: 20, range: 7, fireRate: 30, specialAttackRate: 5, specialDamage: 30, specialBlastRadius: 3, specialSignalRate: 45 }
        ]
    },
    cannon: {
        name: '加农炮',
        description: '通过火药发射高冲击力的炮弹，造成较高伤害，射程较远；命中会对落点周围1格的敌人造成60%溅射伤害。',
        exDescription: '每10次攻击发射强化射线，对普通敌人造成基于其当前生命值的百分比伤害；对首领造成普通攻击5倍的伤害(激光不产生溅射)。',
        color: '#795548',
        projectileColor: '#d7ccc8',
        levels: [
            { cost: 400, damage: 8, range: 6.5, fireRate: 60 },
            { cost: 500, damage: 12, range: 7, fireRate: 55 },
            { cost: 600, damage: 16, range: 8, fireRate: 50 },
            { cost: 700, damage: 20, range: 9, fireRate: 45 },
            { cost: 2000, damage: 60, range: 10, fireRate: 42, specialAttackRate: 10, specialPercentDamage: 0.05 }
        ]
    },
    magic: {
        name: '术击塔',
        description: '由专业术士坐镇的高伤害、远射程的魔法伤害塔。被击中的敌人会被破防，受到的所有伤害提高15%。',
        exDescription: '每次攻击令敌人叠加一层易伤，每个敌人最多叠加50层，每层易伤使其受伤提高1%。',
        color: '#9c27b0',
        projectileColor: '#e1bee7',
        levels: [
            { cost: 500, damage: 12, range: 7, fireRate: 70 },
            { cost: 600, damage: 17, range: 7, fireRate: 65 },
            { cost: 700, damage: 25, range: 8, fireRate: 60 },
            { cost: 800, damage: 32, range: 8, fireRate: 55 },
            { cost: 2500, damage: 100, range: 10, fireRate: 50 }
        ]
    },
    slow: {
        name: '减速塔',
        description: '凛冬已至...对范围内的所有敌人造成伤害并施加减速效果。EX级可冻结敌人。4级与EX级不受音乐台攻击范围加成。',
        exDescription: '每5次攻击附加冰寒刻印，叠满15层冻结敌人(普通4秒/首领2秒)。',
        exLimit: 5,
        color: '#03a9f4',
        levels: [
            { cost: 400, damage: 3, range: 3, slow: 0.2, fireRate: 100 },
            { cost: 500, damage: 5, range: 3.5, slow: 0.25, fireRate: 96 },
            { cost: 600, damage: 7, range: 4, slow: 0.3, fireRate: 90 },
            { cost: 700, damage: 10, range: 4.5, slow: 0.35, fireRate: 84 },
            { cost: 2200, damage: 12, range: 5, slow: 0.4, fireRate: 72 }
        ]
    },
    blast: {
        name: '爆破塔',
        description: '艺术就是爆炸！爆破塔对目标及周围小范围内的敌人造成爆炸伤害。',
        exDescription: '一次爆炸同时击中多个敌人时造成额外伤害。',
        exLimit: 3,
        limit: 8,
        color: '#ff5722',
        projectileColor: '#ffccbc',
        levels: [
            { cost: 600, damage: 8, range: 4.5, fireRate: 90, blastRadius: 2.5 },
            { cost: 650, damage: 13, range: 5, fireRate: 85, blastRadius: 3 },
            { cost: 700, damage: 20, range: 5.5, fireRate: 80, blastRadius: 4 },
            { cost: 800, damage: 30, range: 6, fireRate: 75, blastRadius: 5 },
            { cost: 3000, damage: 80, range: 7, fireRate: 150, blastRadius: 6, specialMultiplier: 20 }
        ]
    },
    gamma: {
        name: '伽马射线',
        description: '这可不是什么好玩意儿....伽马射线的攻击会蔓延到目标周围的其他敌人身上，再次造成伤害。',
        limit: 10,
        color: '#D32F2F',
        projectileColor: '#FFCDD2',
        levels: [
            { cost: 400, damage: 7, range: 5, fireRate: 90, chainTargets: 5, chainRadius: 5 },
            { cost: 600, damage: 12, range: 6, fireRate: 78, chainTargets: 7, chainRadius: 6 },
            { cost: 700, damage: 18, range: 6.5, fireRate: 66, chainTargets: 9, chainRadius: 7 },
            { cost: 850, damage: 25, range: 7, fireRate: 48, chainTargets: 12, chainRadius: 8 }
        ]
    },
    sun: { name: '日照塔', description: '来自太阳的审判！日照塔持续锁定单个敌人，伤害会随时间递增。', exDescription: '炽热领域范围+35%；主目标周围1格内的敌人额外承受其所受伤害的10%-40%(5秒内递增)。领域内敌人受减速塔的减速降低80%，且免疫冰霜刻印。', exLimit: 3, limit: 6, color: '#ffeb3b', levels: [{ cost: 700, minDamage: 0.5, maxDamage: 110, range: 7, rampUpTime: 840 },{ cost: 800, minDamage: 1, maxDamage: 220, range: 8, rampUpTime: 840 },{ cost: 1000, minDamage: 2, maxDamage: 440, range: 8.5, rampUpTime: 840 },{ cost: 1450, minDamage: 4, maxDamage: 660, range: 9, rampUpTime: 840 },{ cost: 3000, minDamage: 6, maxDamage: 800, range: 11, rampUpTime: 750, heatFieldRangeBonus: 0.35, heatDamageRadius: 1 }] },
    gatlingGun: {
        name: '机枪阵线',
        description: '由多个机枪集群组成的阵线，同时攻击射程内的多个敌人。如果敌人不足，火力会集中。',
        exDescription: '每发射1500发子弹提升一个等阶(最高V阶)，每阶提升5%伤害和5%射速。',
        color: '#607d8b',
        projectileColor: '#ffeb3b',
        limit: 5,
        exLimit: 3,
        levels: [
            { cost: 1200, damage: 4, range: 6, fireRate: 20, shotsPerRound: 3 },
            { cost: 1400, damage: 5, range: 7, fireRate: 15, shotsPerRound: 4 },
            { cost: 1600, damage: 6, range: 8, fireRate: 13, shotsPerRound: 5 },
            { cost: 2000, damage: 8, range: 10, fireRate: 12, shotsPerRound: 5 },
            { cost: 6000, damage: 12, range: 12, fireRate: 10, shotsPerRound: 7 }
        ]
    },
    electricCore: { name: '电核心', description: '人类进入了电气时代...为范围内的友方防御塔提供攻击速度加成。2级起可开启超频，使加成效果短时间内提升至三倍。', color: '#4dd0e1', limit: 2, levels: [{ cost: 800, range: 4, buff: 1.05 },{ cost: 1000, range: 5, buff: 1.10 },{ cost: 1200, range: 5.5, buff: 1.15 },{ cost: 1500, range: 6, buff: 1.20 }] },
    tesla: {
        name: '特斯拉塔',
        description: '强力电流！发射连锁闪电，同时攻击并眩晕多个敌人。',
        exDescription: '每次攻击提高自身2%伤害，最高提高100%。停止攻击2秒后，消除此加成。',
        color: '#00e5ff',
        limit: 4,
        levels: [
            { cost: 700, damage: 6, range: 5, fireRate: 140, targets: 2, stun: 0.2 },
            { cost: 800, damage: 10, range: 6, fireRate: 130, targets: 3, stun: 0.25 },
            { cost: 900, damage: 17, range: 7, fireRate: 125, targets: 4, stun: 0.3 },
            { cost: 1000, damage: 25, range: 7.5, fireRate: 120, targets: 4, stun: 0.33 },
            { cost: 4000, damage: 50, range: 8, fireRate: 110, targets: 5, stun: 0.35 }
        ]
    },
    thiefClaw: {
        name: '窃取爪',
        description: '劫富济贫！造价低廉的窃取爪攻击时有几率窃取金钱，经济型攻击塔，缺点是伤害极低。',
        exDescription: '攻击附加持续3秒的赏金标记。击杀有赏金标记的敌人额外获得30金钱，需要4级窃取爪累计偷取1500金钱才可升级。',
        color: '#ffd700',
        limit: 6,
        exLimit: 2,
        projectileColor: '#fff59d',
        levels: [
            { cost: 200, damage: 2, range: 4, fireRate: 90, attacksForGold: 20, goldPerProc: 30 },
            { cost: 250, damage: 3, range: 4,   fireRate: 78, attacksForGold: 20, goldPerProc: 35 },
            { cost: 300, damage: 5, range: 4.5, fireRate: 66, attacksForGold: 15, goldPerProc: 40 },
            { cost: 450, damage: 7, range: 5.5,   fireRate: 54, attacksForGold: 15, goldPerProc: 60 },
            { cost: 1800, damage: 10, range: 7, fireRate: 50, attacksForGold: 10, goldPerProc: 70 }
        ]
    },
    musicStand: { name: '音乐台', description: '来点音乐吗？音乐台为范围内的友方塔提供升级折扣，射程与伤害加成。4级后拥有主动技能，范围内防御塔越多，技能给予的金钱越多。技能还会短暂提升范围内防御塔的攻击伤害。', color: '#e91e63', limit: 1, levels: [
        { cost: 1200, range: 6, upgradeDiscount: 0.95, rangeBuff: 1.10, damageBuff: 1.04 },
        { cost: 1500, range: 7, upgradeDiscount: 0.9,  rangeBuff: 1.12, damageBuff: 1.08 },
        { cost: 1800, range: 8, upgradeDiscount: 0.8,  rangeBuff: 1.15, damageBuff: 1.12 },
        { cost: 2500, range: 10, upgradeDiscount: 0.75, rangeBuff: 1.20, damageBuff: 1.15 }
    ]},
    militaryBase: { name: '军事基地', description: '是的长官！军事基地无法攻击，但会定期产生友方士兵为你作战。', exDescription: '额外生成强大的坦克单位，造成范围伤害。',exLimit: 1,color: '#b0bec5', limit: 2, levels: [
        { cost: 1500, spawnRate: 3600, spawnCount: 2 },
        { cost: 1300, spawnRate: 3480, spawnCount: 3 },
        { cost: 1500, spawnRate: 3360, spawnCount: 4 },
        { cost: 2000, spawnRate: 3240, spawnCount: 5 },
        { cost: 4200, spawnRate: 3240, spawnCount: 5, tankSpawnRate: 2160, tankSpawnCount: 1 }
    ]},
    matrix: {
        name: '矩阵塔',
        description: '团结就是力量！矩阵塔可以与其他矩阵塔连线以获得增益。每次连线都会提升伤害、射速、射程并减少过热时间。',
        exDescription: 'EX矩阵塔不会过热。当它存在于一个连线网络中时，该网络内的所有矩阵塔将获得伤害和攻速加成。',
        exLimit: 1,
        color: '#f44336',
        projectileColor: '#ffcdd2',
        limit: 10,
        levels: [
            { cost: 300, damage: 5, range: 4.5, fireRate: 30, attacksBeforeOverheat: 8, overheatDuration: 360 },
            { cost: 400, damage: 7, range: 5,   fireRate: 27, attacksBeforeOverheat: 8, overheatDuration: 360 },
            { cost: 600, damage: 8.5, range: 5.5, fireRate: 25, attacksBeforeOverheat: 8, overheatDuration: 360 },
            { cost: 800, damage: 11, range: 6, fireRate: 24, attacksBeforeOverheat: 8, overheatDuration: 360 },
            { cost: 4000, damage: 20, range: 7, fireRate: 20, attacksBeforeOverheat: Infinity, overheatDuration: 0 }
        ]
    },
    destroyer: {
        name: '毁灭者',
        description: '战术兵器。点击部署按钮后立即展开并清空当前金钱，并基于此造成毁灭级伤害。攻击持续30秒，关闭后当前回合与下一回合无法再次部署。激光束可以穿透敌人，并发出扩散波。部署时与进入冷却后无法被出售。',
        color: '#212121',
        projectileColor: '#000000',
        limit: 1,
        levels: [
            { cost: 500, damage: 0, range: 10, fireRate: 60 }
        ]
    },
    battery: {
        name: '蓄电池',
        description: '后备能源。不进行攻击，每波开始时给予玩家70/100/200/350金钱。当场上存在6个满级蓄电池时，每波会获得额外金钱。',
        color: '#4caf50',
        limit: 6,
        levels: [
            { cost: 300, goldPerWave: 70 },
            { cost: 400, goldPerWave: 100 },
            { cost: 600, goldPerWave: 200 },
            { cost: 800, goldPerWave: 350 }
        ]
    },
    missileSilo: {
        name: '导弹井',
        description: '精确打击！向敌人发射一枚巡航导弹，对落点周围大范围的敌人造成巨大伤害和长时间晕眩。请注意，巡航导弹有飞行延迟，对于高速移动的目标效果不佳，升级可以加快飞行速度。',
        exDescription: '升级为导弹序列发射井，连续发射4枚索敌导弹，造成多次范围打击和控制。',
        exLimit: 1,
        color: '#B0BEC5',
        projectileColor: '#E0E0E0',
        limit: 2,
        levels: [
            { cost: 1500, damage: 120, range: 20, fireRate: 1200, stun: 3, flightTime: 180, blastRadius: 4 },
            { cost: 2000, damage: 200, range: 20, fireRate: 1080, stun: 4, flightTime: 250, blastRadius: 4.3 },
            { cost: 2500, damage: 400, range: 20, fireRate: 960, stun: 5, flightTime: 200, blastRadius: 4.7 },
            { cost: 3000, damage: 800, range: 20, fireRate: 840, stun: 6.5, flightTime: 100, blastRadius: 5 },
                    {
            cost: 7000,
            damage: 200,
            range: 20,
            fireRate: 900,
            stun: 4,
            flightTime: 90,
            blastRadius: 2.5,
            salvoCount: 4,
            salvoInterval: 30
        }
        ]
    },
    gravityBeacon: {
        name: '引力信标',
        description: '此处不可逾越...释放引力脉冲，将范围内的所有敌人沿路径推回一段距离。对首领效果减弱。仅当敌人进入攻击范围时才会激活（进入后延迟0.5秒攻击）。',
        color: '#4FC3F7',
        limit: 4,
        levels: [
            { cost: 200, range: 3,   fireRate: 390, pushback: 1 },
            { cost: 300, range: 3.5, fireRate: 384, pushback: 1.3 },
            { cost: 400, range: 4,   fireRate: 372, pushback: 1.7 },
            { cost: 500, range: 4.5, fireRate: 360, pushback: 2 }
        ]
    },
    shrineOfMerit: {
        name: '功勋神龛',
        description: '古老的神秘遗产。不攻击敌人，在其范围内的任何敌人被击杀时，玩家会获得额外的金钱奖励。',
        color: '#FFD700',
        limit: 2,
        levels: [
            { cost: 500, range: 3.8,   moneyMultiplier: 0.1, baseGold: 5 },
            { cost: 600, range: 4, moneyMultiplier: 0.3, baseGold: 8 },
            { cost: 800, range: 4.3,   moneyMultiplier: 0.5, baseGold: 12 },
            { cost: 1000, range: 4.7, moneyMultiplier: 0.7, baseGold: 18 }
        ]
    },
        annihilator: {
        name: '歼灭者',
        description: '收割时刻...锁定生命值百分比最低的敌人，根据其当前生命值造成巨额伤害。生命值越低，伤害越高。对首领只造成普通伤害。',
        exDescription: '对生命值高于70%的敌人造成普通伤害，对生命值低于70%的敌人造成160%伤害，此效果对首领同样生效。',
        exLimit: 2,
        color: '#BDBDBD',
        projectileColor: '#FFD700',
        levels: [
            { cost: 1000, damage: 50, range: 6, fireRate: 120 },
            { cost: 1200, damage: 100, range: 6.5, fireRate: 115 },
            { cost: 1800, damage: 200, range: 6.5, fireRate: 110 },
            { cost: 2300, damage: 400, range: 7, fireRate: 100 },
            { cost: 7500, damage: 600, range: 8, fireRate: 80 }
        ]
    },
    spotlight: {
        name: '聚光灯',
        description: '高亮度聚光灯，以极强的射束持续照射敌人，对光束所及区域持续造成伤害，升级聚光灯以加强亮度来对区域内所有敌人附加高额燃烧持续伤害。',
        exDescription: '敌人的弱点在聚光灯下更为清晰，我方防御塔在攻击处于聚光灯点亮区域内的敌人时有几率造成暴击。',
        color: '#fff8e1',
        projectileColor: '#fffde7',
        limit: 1,
        exLimit: 1,
        levels: [
            { cost: 3000, damage: 8, range: 7, fireRate: 60, beamSpread: 1 },
            { cost: 3500, damage: 13, range: 8.5, fireRate: 54, beamSpread: 1.5, burnPercent: 0.001, bossBurnPercent: 0.001 },
            { cost: 4000, damage: 27, range: 10, fireRate: 42, beamSpread: 2, burnPercent: 0.002, bossBurnPercent: 0.0015 },
            { cost: 5000, damage: 50, range: 12, fireRate: 30, beamSpread: 2.5, burnPercent: 0.003, bossBurnPercent: 0.002 },
            { cost: 8000, damage: 84, range: 15, fireRate: 24, beamSpread: 3, burnPercent: 0.003, bossBurnPercent: 0.002, critChance: 0.25 }
        ]
    },
    pursuit: {
        name: '追击',
        description: '激光防御阵列，快速连射多发追踪导弹，对落点周围造成范围伤害。导弹会叠加干扰，累计80层可令敌人迷乱反向移动3秒。3级解锁共享视野，所有追击的攻击范围互相连通。受电磁干扰影响，无法适配电核心的攻速增益。',
        exDescription: '每次装填完毕时，立即减少其他正在装填的追击的装填时间。开启主动技能后自身攻击力+20%并连续发射50发导弹，每发射10发减少所有追击2秒装填时间。',
        color: '#cfd8dc',
        projectileColor: '#ffffff',
        limit: 5,
        exLimit: 2,
        levels: [
            { cost: 1000, damage: 20, range: 3.5, reloadTime: 600, missileCount: 3, blastRadius: 1.6 },
            { cost: 1500, damage: 50, range: 4, reloadTime: 540, missileCount: 5, blastRadius: 1.8 },
            { cost: 2500, damage: 80, range: 4.5, reloadTime: 480, missileCount: 8, blastRadius: 2.1, sharedVision: true },
            { cost: 3500, damage: 100, range: 5, reloadTime: 420, missileCount: 10, blastRadius: 2.4, sharedVision: true },
            { cost: 5500, damage: 160, range: 6, reloadTime: 360, missileCount: 12, blastRadius: 2.6, sharedVision: true, reloadSync: true }
        ]
    },
    heavyWeapons: {
        name: '重武器站',
        description: '聚合型武器站。通过极高的射速发射全金属披甲弹来撕碎敌人的防御，并且配备有9M133"短号"导弹系统，兼顾重火力覆盖。是暴力输出的最佳选择。但因其材料与弹药稀缺，造价极其昂贵。',
        color: '#e8eaed',
        projectileColor: '#ffeb3b',
        limit: 1,
        levels: [
            { cost: 4000,  damage: 20,  range: 6,    fireRate: 6,   missileDamage: 60,  missileBlastRadius: 2, missileFireRate: 360 },
            { cost: 6000,  damage: 40,  range: 7.5,  fireRate: 4.8, missileDamage: 130, missileBlastRadius: 3, missileFireRate: 270 },
            { cost: 8000,  damage: 80,  range: 9,    fireRate: 3.6, missileDamage: 220, missileBlastRadius: 4, missileFireRate: 180 },
            { cost: 12000, damage: 135, range: 11,   fireRate: 2.7, missileDamage: 480, missileBlastRadius: 5, missileFireRate: 120 }
        ]
    },
    boomerang: {
        name: '回旋刃',
        description: '前中期利器。向目标当前位置发射持续旋转的刀刃，刀刃飞抵后留在原地旋转。对飞行路径上接触到的敌人造成3次伤害，抵达后对停留范围内的敌人每0.175秒造成一次伤害。单枚刀刃最多暴击5次。目标选择器决定射向。',
        exDescription: 'EX级：刀刃飞行速度更快，并对处于减速/冰冻/燃烧/眩晕状态的敌人造成2倍伤害。木制底座浮现红色花纹，双刃化为带红色拖尾的四刃。',
        exLimit: 3,
        color: '#8d6e63',
        projectileColor: '#cfd8dc',
        levels: [
            { cost: 500,  damage: 3,  range: 5,   fireRate: 180, lingerTime: 120 },
            { cost: 700,  damage: 5,  range: 5.5, fireRate: 156, lingerTime: 180 },
            { cost: 900,  damage: 8,  range: 6,   fireRate: 132, lingerTime: 240 },
            { cost: 1200, damage: 12, range: 6.5, fireRate: 108, lingerTime: 300 },
            { cost: 3000, damage: 17, range: 7,   fireRate: 90,  lingerTime: 480 }
        ]
    },
    frostPunish: {
        name: '寒冰惩戒',
        description: '被冰霜与战争女神哈罗妮加护的遗物。可以发射蕴含绝对零度能量的强力箭矢令敌人殒命。触怒女神代表着不幸，在高额减速状态下被再次击中的敌人会受到最严峻的惩戒。',
        color: '#4fc3f7',
        projectileColor: '#b3e5fc',
        limit: 6,
        levels: [
            { cost: 800,  damage: 50,  range: 5,   fireRate: 300, slow: 0.4 },
            { cost: 1500, damage: 100, range: 7,   fireRate: 270, slow: 0.5 },
            { cost: 2200, damage: 200, range: 8,   fireRate: 240, slow: 0.6 },
            { cost: 3500, damage: 320, range: 9.5, fireRate: 180, slow: 0.7 }
        ]
    }
};
