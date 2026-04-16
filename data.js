// ═══════════════════════════════════════════════════════════
//  data.js  —  CHRONICLE · All Static Game Data
// ═══════════════════════════════════════════════════════════
'use strict';

// ── EXP TABLE ──────────────────────────────────────────────
// Lv1-89: smooth exponential curve
// Lv90+: massive spike per level (×1.5 each level)
const EXP_TABLE = (() => {
  const t = [0]; // t[0] unused, t[1] = exp needed to reach lv2
  for (let i = 1; i <= 89; i++) {
    t.push(Math.floor(10 * Math.pow(1.45, i)));
  }
  // 90+ spike
  let base = t[89];
  for (let i = 90; i <= 100; i++) {
    base = Math.floor(base * 6.5);
    t.push(base);
  }
  return t;
})();

// ── RARITIES ────────────────────────────────────────────────
const RARITIES = ['common','rare','epic','legendary','mythic'];
const RNAME = { common:'普通', rare:'稀有', epic:'史诗', legendary:'传说', mythic:'神话' };
const RCLS  = { common:'r-c', rare:'r-r', epic:'r-e', legendary:'r-l', mythic:'r-m' };
const RW    = { common:55, rare:28, epic:12, legendary:4, mythic:1 };
const MAX_ITEM_LVL = 15;

// ── SLOTS ───────────────────────────────────────────────────
const SLOTS      = ['weapon','head','body','legs'];
const SLOT_ICON  = { weapon:'⚔', head:'🪖', body:'🧥', legs:'👖' };
const SLOT_NAME  = { weapon:'武器', head:'头部', body:'身体', legs:'腿部' };

// ── AFFIX POOL ──────────────────────────────────────────────
// Each item can roll 1-4 affixes depending on rarity
const AFFIXES = [
  // === PREFIX (stat boosts) ===
  { id:'atk1',  type:'prefix', name:'攻击',     desc:'+ATK',         r:['common','rare','epic','legendary','mythic'], roll:(s)=>({ atk: Math.floor((3+s*2)*(0.8+Math.random()*.4)) }) },
  { id:'atk2',  type:'prefix', name:'强力攻击', desc:'+大量ATK',      r:['rare','epic','legendary','mythic'],          roll:(s)=>({ atk: Math.floor((8+s*4)*(0.8+Math.random()*.4)) }) },
  { id:'spd1',  type:'prefix', name:'迅捷',     desc:'+SPD',         r:['common','rare','epic','legendary','mythic'], roll:()=>({ spd: +((0.05+Math.random()*.05).toFixed(2)) }) },
  { id:'spd2',  type:'prefix', name:'疾风',     desc:'+大量SPD',      r:['rare','epic','legendary','mythic'],          roll:()=>({ spd: +((0.12+Math.random()*.08).toFixed(2)) }) },
  { id:'crit1', type:'prefix', name:'锐利',     desc:'+Crit%',       r:['common','rare','epic','legendary','mythic'], roll:(s)=>({ crit: Math.floor(1+s*.3*(0.8+Math.random()*.4)) }) },
  { id:'crit2', type:'prefix', name:'致命',     desc:'+大量Crit%',    r:['rare','epic','legendary','mythic'],          roll:(s)=>({ crit: Math.floor(3+s*.5*(0.8+Math.random()*.4)) }) },
  { id:'cdmg1', type:'prefix', name:'重击',     desc:'+CritDmg%',    r:['rare','epic','legendary','mythic'],          roll:()=>({ cdmg: Math.floor(15+Math.random()*15) }) },
  { id:'cdmg2', type:'prefix', name:'毁灭',     desc:'+大量CritDmg', r:['epic','legendary','mythic'],                 roll:()=>({ cdmg: Math.floor(30+Math.random()*30) }) },
  { id:'time1', type:'suffix', name:'时间',     desc:'+战斗时间',     r:['rare','epic','legendary','mythic'],          roll:()=>({ time: 10+Math.floor(Math.random()*10) }) },
  { id:'gold1', type:'suffix', name:'财富',     desc:'+金币获得',     r:['rare','epic','legendary','mythic'],          roll:()=>({ goldPct: 10+Math.floor(Math.random()*15) }) },
  // === SPECIAL (skill/proc) ===
  { id:'sp_bt', type:'special', name:'嗜血',    desc:'暴击获得金币',  r:['epic','legendary','mythic'],   cls:'atag-sp', onCrit:()=>{ G.gold+=Math.floor(G.stage*3+1); } },
  { id:'sp_th', type:'special', name:'雷鸣',    desc:'20%双倍伤害',   r:['epic','legendary','mythic'],   cls:'atag-sp', dmgMult:()=>Math.random()<0.2?2:1 },
  { id:'sp_tr', type:'special', name:'时裂',    desc:'时间+20s',      r:['legendary','mythic'],          cls:'atag-sp', time:20 },
  { id:'sp_wl', type:'special', name:'霸主',    desc:'胜利ATK+3',     r:['legendary','mythic'],          cls:'atag-sp', onWin:()=>{ G.bonusAtk+=3; } },
  { id:'sp_vp', type:'special', name:'吸血',    desc:'普攻回金',      r:['epic','legendary','mythic'],   cls:'atag-sp', onHit:()=>{ G.gold+=Math.floor(G.stage*0.8+1); } },
  { id:'sp_ex', type:'special', name:'爆炸',    desc:'击杀时爆炸伤害',r:['legendary','mythic'],          cls:'atag-sp', onKill:(max)=>Math.floor(max*0.15) },
  { id:'sp_bk', type:'special', name:'狂暴',    desc:'每击SPD+0.01',  r:['mythic'],                      cls:'atag-sp', onHit:()=>{ G.atkSpd=Math.min(G.atkSpd+0.01, spdCap()); } },
  { id:'sp_ms', type:'special', name:'镜像',    desc:'10%复制伤害',   r:['mythic'],                      cls:'atag-sp', mirrorChance:0.1 },
];
const getAffix = id => AFFIXES.find(a=>a.id===id);

// ── AFFIX COUNT BY RARITY ────────────────────────────────────
const AFFIX_COUNT = { common:1, rare:2, epic:3, legendary:4, mythic:5 };

// ── REFORGE CURRENCIES ──────────────────────────────────────
const CURRENCIES = {
  reforge:  { name:'重铸石',   icon:'🔄', desc:'重新随机装备所有词条' },
  upgrade:  { name:'强化石',   icon:'⬆',  desc:'升级装备（替代金币）' },
  essence:  { name:'精华',     icon:'💧', desc:'锁定一个词条后重铸其余' },
  catalyst: { name:'催化剂',   icon:'⚗',  desc:'强制升品质（普通→稀有→史诗）' },
};

// ── GEM SYSTEM ──────────────────────────────────────────────
const GEMS = [
  { id:'ruby',    name:'红宝石',  icon:'🔴', desc:'ATK+X%',     effect:(it,v)=>{ it.gemAtk=(it.gemAtk||0)+v; },    values:[5,10,20,40], rarity:['common','rare','epic','legendary'] },
  { id:'sapphire',name:'蓝宝石',  icon:'🔵', desc:'SPD+X',      effect:(it,v)=>{ it.gemSpd=(it.gemSpd||0)+v; },    values:[0.1,0.2,0.4,0.8], rarity:['common','rare','epic','legendary'] },
  { id:'emerald', name:'绿宝石',  icon:'💚', desc:'Crit+X%',    effect:(it,v)=>{ it.gemCrit=(it.gemCrit||0)+v; },  values:[2,5,10,20], rarity:['common','rare','epic','legendary'] },
  { id:'diamond', name:'钻石',    icon:'💎', desc:'CritDmg+X%', effect:(it,v)=>{ it.gemCdmg=(it.gemCdmg||0)+v; }, values:[10,25,50,100], rarity:['rare','epic','legendary','mythic'] },
  { id:'obsidian',name:'黑曜石',  icon:'⬛', desc:'真伤+X%HP',  effect:(it,v)=>{ it.gemTrue=(it.gemTrue||0)+v; }, values:[0.5,1,2,4], rarity:['epic','legendary','mythic','mythic'] },
  { id:'void',    name:'虚空石',  icon:'🌑', desc:'所有属性+X%',effect:(it,v)=>{ it.gemAll=(it.gemAll||0)+v; },   values:[3,7,15,30], rarity:['legendary','mythic','mythic','mythic'] },
];
const GEM_SLOTS = { common:0, rare:1, epic:2, legendary:3, mythic:4 };

// ── SETS ────────────────────────────────────────────────────
const SETS = [
  {
    id:'dragon', name:'龙裂套装', icon:'🐉',
    pieces:['龙裂之刃','龙裂战盔','龙裂铠甲','龙裂战靴'],
    bonus:{
      2:{ desc:'ATK+25%', apply:()=>{ G.setBonusAtk+= Math.floor(totalBaseAtk()*0.25); } },
      4:{ desc:'每次攻击有10%概率触发龙焰（500%伤害）', proc:0.1, dmgMult:5 },
    }
  },
  {
    id:'shadow', name:'暗影套装', icon:'🌑',
    pieces:['暗影匕首','暗影兜帽','暗影战袍','暗影战靴'],
    bonus:{
      2:{ desc:'Crit+15%', apply:()=>{ G.setBonusCrit+=15; } },
      4:{ desc:'暴击伤害+100%，每次暴击叠层（最高50层×2%ATK）', cdmgBonus:100, stackMax:50 },
    }
  },
  {
    id:'storm', name:'风暴套装', icon:'⚡',
    pieces:['风暴战斧','风暴战盔','风暴铠甲','风暴靴'],
    bonus:{
      2:{ desc:'SPD+0.5', apply:()=>{ G.setBonusSpd+=0.5; } },
      4:{ desc:'攻速每达1.0，ATK+10%（叠加）', spdAtk:true },
    }
  },
  {
    id:'ancient', name:'远古套装', icon:'⚱',
    pieces:['远古巨剑','远古战盔','远古铠甲','远古战靴'],
    bonus:{
      2:{ desc:'所有属性+10%', apply:()=>{ G.setBonusAll+=0.10; } },
      4:{ desc:'每场胜利获得永久叠层（每层+0.5%全属性）', stackOnWin:true },
    }
  },
];

// ── TALENTS ─────────────────────────────────────────────────
const TALENTS = [
  { id:'battle',      icon:'⚡', name:'战斗本能',   desc:'每次普攻永久+1 ATK',
    onHit:(c)=>{ if(!c){ G.tAtk+=1; G.tN++; } } },
  { id:'crit_hunger', icon:'🩸', name:'暴击渴望',   desc:'每次暴击永久+0.1% Crit',
    onHit:(c)=>{ if(c){ G.tCrit+=0.1; G.tN++; } } },
  { id:'bloodrush',   icon:'🔥', name:'血战狂热',   desc:'每次胜利永久+2 ATK',
    onWin:()=>{ G.tAtk+=2; G.tN++; } },
  { id:'swift',       icon:'💨', name:'迅捷之手',   desc:'每10次普攻永久+0.05 SPD',
    onHit:(c)=>{ if(!c){ G.tN++; if(G.tN%10===0) G.tSpd+=0.05; } } },
  { id:'gold_touch',  icon:'💰', name:'黄金之手',   desc:'每次胜利额外+20%金币', goldMult:1.2 },
  { id:'executioner', icon:'⚔', name:'刽子手',     desc:'敌人HP<30%时ATK翻倍',
    dmgMult:(p)=>p<0.3?2:1 },
  { id:'berserk',     icon:'😤', name:'狂战士',     desc:'每次攻击ATK+0.5但Crit-0.1%',
    onHit:()=>{ G.tAtk+=0.5; G.tN++; G.tCritPen=(G.tCritPen||0)+0.1; } },
  { id:'phantom',     icon:'👻', name:'幻影刺客',   desc:'暴击10%概率额外一击',
    onCrit:()=>Math.random()<0.1 },
  { id:'titan',       icon:'🗿', name:'巨人之力',   desc:'每次Train额外+1 ATK',
    onTrain:()=>{ G.tAtk+=1; G.tN++; } },
  { id:'fortune',     icon:'🍀', name:'幸运女神',   desc:'掉落率+20%，传说+5%',
    drop:{ rate:0.2, legBonus:0.05 } },
  { id:'true_dmg',    icon:'💀', name:'真伤领主',   desc:'每次攻击额外打敌人最大HP的2%',
    truePct:0.02 },
  { id:'plunder',     icon:'👑', name:'掠夺者',     desc:'每次胜利偷取0.5%ATK和0.1%SPD',
    onWin:()=>{ G.tAtk+=Math.floor(totalAtk()*0.005+1); G.tSpd=Math.min((G.tSpd||0)+0.001,1.0); G.tN++; } },
  { id:'overload',    icon:'🔌', name:'超载',       desc:'ATK每达1000永久+0.1 SPD', passive:true },
  { id:'sacrifice',   icon:'🩸', name:'献祭',       desc:'放弃50%ATK，Crit率翻倍',
    onActivate:()=>{ G.baseAtk=Math.floor(G.baseAtk*0.5); G.critChance*=2; } },
  { id:'time_erode',  icon:'🌀', name:'时间侵蚀',   desc:'每秒扣除敌人最大HP的1%', tickPct:0.01 },
  { id:'gold_body',   icon:'💎', name:'黄金躯体',   desc:'金币每1000=+1 ATK', passive:true },
  { id:'mirror',      icon:'🔮', name:'镜像',       desc:'15%概率复制上次伤害', mirrorChance:0.15 },
  { id:'divine',      icon:'🔱', name:'神裁',       desc:'Boss战ATK×3，普通×0.8',
    bossAtk:3, normalAtk:0.8 },
];

// ── SKILLS (30 skills, unlocked every 10 levels) ──────────────
const SKILLS = [
  // ── ATTACK TYPE ──
  {
    id:'slash',    type:'atk', icon:'⚔', name:'斩击',     unlockLv:10,
    desc:'每5次普攻触发一次300%伤害',
    state:{ counter:0 },
    onHit:(dmg)=>{
      SKILLS.find(s=>s.id==='slash').state.counter++;
      if(SKILLS.find(s=>s.id==='slash').state.counter>=5){
        SKILLS.find(s=>s.id==='slash').state.counter=0;
        return { proc:true, dmgMult:3, label:'⚔ 斩击！' };
      }
      return { proc:false };
    }
  },
  {
    id:'combo_slash', type:'atk', icon:'🌀', name:'连斩', unlockLv:20,
    desc:'每次暴击后立刻额外打2次（各50%伤害）',
    onCrit:(baseDmg)=>({ extraHits:2, dmgPct:0.5, label:'🌀 连斩！' })
  },
  {
    id:'pierce',   type:'atk', icon:'🗡', name:'穿刺',     unlockLv:30,
    desc:'攻击额外造成敌人最大HP的3%真伤',
    truePct:0.03
  },
  {
    id:'annihilate', type:'atk', icon:'💥', name:'毁灭一击', unlockLv:40,
    desc:'每20次攻击触发一次500%伤害',
    state:{ counter:0 },
    onHit:(dmg)=>{
      SKILLS.find(s=>s.id==='annihilate').state.counter++;
      if(SKILLS.find(s=>s.id==='annihilate').state.counter>=20){
        SKILLS.find(s=>s.id==='annihilate').state.counter=0;
        return { proc:true, dmgMult:5, label:'💥 毁灭！' };
      }
      return { proc:false };
    }
  },
  {
    id:'storm_strike', type:'atk', icon:'⚡', name:'风暴连击', unlockLv:50,
    desc:'SPD每1.0 = 额外+10%伤害',
    dmgBonus:()=>Math.floor(totalSpd()) * 0.10
  },
  {
    id:'frenzy',   type:'atk', icon:'🔥', name:'暴走',     unlockLv:60,
    desc:'连续暴击时每次+10%伤害（最高+100%）',
    state:{ stacks:0 },
    onCrit:()=>{ const s=SKILLS.find(sk=>sk.id==='frenzy').state; s.stacks=Math.min(s.stacks+1,10); },
    onNormal:()=>{ SKILLS.find(sk=>sk.id==='frenzy').state.stacks=0; },
    dmgBonus:()=>SKILLS.find(sk=>sk.id==='frenzy').state.stacks*0.10
  },
  {
    id:'lucky_strike', type:'atk', icon:'🎲', name:'致命打击', unlockLv:70,
    desc:'每次攻击有1%概率造成9999%伤害',
    onHit:()=>Math.random()<0.01?{ proc:true, dmgMult:99.99, label:'🎲 致命！' }:{ proc:false }
  },
  {
    id:'endless_slash', type:'atk', icon:'♾', name:'无尽斩', unlockLv:80,
    desc:'每次击杀后下一次攻击双倍伤害',
    state:{ ready:false },
    onWin:()=>{ SKILLS.find(s=>s.id==='endless_slash').state.ready=true; },
    onHit:()=>{
      const s=SKILLS.find(sk=>sk.id==='endless_slash').state;
      if(s.ready){ s.ready=false; return { proc:true, dmgMult:2, label:'♾ 无尽斩！' }; }
      return { proc:false };
    }
  },
  {
    id:'soul_blast', type:'atk', icon:'💀', name:'灵魂爆破', unlockLv:90,
    desc:'Boss战每10次攻击造成Boss最大HP 5%真伤',
    state:{ counter:0 },
    onHit:()=>{
      if(!G.isBoss) return { proc:false };
      const s=SKILLS.find(sk=>sk.id==='soul_blast').state;
      s.counter++;
      if(s.counter>=10){ s.counter=0; return { proc:true, truePct:0.05, label:'💀 灵魂爆破！' }; }
      return { proc:false };
    }
  },
  {
    id:'judgment', type:'atk', icon:'⚖', name:'末日审判', unlockLv:100,
    desc:'每100次攻击造成本场累积总伤害的10%',
    state:{ counter:0 },
    onHit:()=>{
      const s=SKILLS.find(sk=>sk.id==='judgment').state;
      s.counter++;
      if(s.counter>=100){ s.counter=0; const dmg=Math.floor(G.totalDmgFight*0.10); return { proc:true, flatDmg:dmg, label:'⚖ 末日审判！' }; }
      return { proc:false };
    }
  },
  // ── BUFF TYPE ──
  {
    id:'blood_rage', type:'buff', icon:'🩸', name:'血怒', unlockLv:10,
    desc:'每次暴击叠层（最高50层），每层+2%ATK',
    state:{ stacks:0 },
    onCrit:()=>{ SKILLS.find(s=>s.id==='blood_rage').state.stacks=Math.min(SKILLS.find(s=>s.id==='blood_rage').state.stacks+1,50); },
    atkBonus:()=>SKILLS.find(s=>s.id==='blood_rage').state.stacks*0.02
  },
  {
    id:'berserk_rush', type:'buff', icon:'😤', name:'狂暴冲刺', unlockLv:20,
    desc:'每15秒ATK×2持续3秒',
    state:{ active:false, timer:0 },
    passive:true // handled in combat timer
  },
  {
    id:'battle_will', type:'buff', icon:'🎯', name:'战意', unlockLv:30,
    desc:'每次Train后下一场战斗ATK+10%',
    state:{ ready:false },
    onTrain:()=>{ SKILLS.find(s=>s.id==='battle_will').state.ready=true; },
    atkBonus:()=>SKILLS.find(s=>s.id==='battle_will').state.ready?0.10:0
  },
  {
    id:'bloodlust', type:'buff', icon:'🏆', name:'嗜血本能', unlockLv:40,
    desc:'每连胜+5%ATK（最高+100%）',
    atkBonus:()=>Math.min(G.streak*0.05, 1.0)
  },
  {
    id:'limit_break', type:'buff', icon:'🌟', name:'极限突破', unlockLv:50,
    desc:'攻速达到上限时ATK×1.5',
    atkBonus:()=>totalSpd()>=spdCap()-0.01?0.5:0
  },
  {
    id:'revenge',  type:'buff', icon:'⚡', name:'复仇之刃', unlockLv:60,
    desc:'失败后下一场战斗ATK×3',
    state:{ ready:false },
    onLose:()=>{ SKILLS.find(s=>s.id==='revenge').state.ready=true; },
    atkBonus:()=>SKILLS.find(s=>s.id==='revenge').state.ready?2.0:0, // +200% = ×3
    onFightStart:()=>{ SKILLS.find(s=>s.id==='revenge').state.ready=false; }
  },
  {
    id:'time_acc', type:'buff', icon:'⏩', name:'时间加速', unlockLv:70,
    desc:'每场胜利攻速+0.05（本局累积，无上限）',
    state:{ bonus:0 },
    onWin:()=>{ SKILLS.find(s=>s.id==='time_acc').state.bonus+=0.05; },
    spdBonus:()=>SKILLS.find(s=>s.id==='time_acc').state.bonus
  },
  {
    id:'tyrant',   type:'buff', icon:'👑', name:'暴君',   unlockLv:80,
    desc:'阶段越高ATK越高（每10关+5%ATK）',
    atkBonus:()=>Math.floor(G.stage/10)*0.05
  },
  {
    id:'resonance', type:'buff', icon:'✨', name:'灵魂共鸣', unlockLv:90,
    desc:'天赋效果×2（所有天赋触发时数值翻倍）',
    passive:true // handled in talent triggers
  },
  {
    id:'transcend', type:'buff', icon:'🌌', name:'超越极限', unlockLv:100,
    desc:'所有属性上限提升50%',
    passive:true
  },
  // ── SPECIAL TYPE ──
  {
    id:'soul_harvest', type:'special', icon:'💫', name:'灵魂收割', unlockLv:10,
    desc:'每次胜利永久+3 ATK',
    onWin:()=>{ G.skillBonusAtk=(G.skillBonusAtk||0)+3; }
  },
  {
    id:'time_ctrl', type:'special', icon:'🕐', name:'时间掌控', unlockLv:20,
    desc:'每场战斗时间上限+30秒',
    timeBonus:30
  },
  {
    id:'gold_harvest', type:'special', icon:'💰', name:'黄金收割', unlockLv:30,
    desc:'每次攻击回复金币（SPD越高越多）',
    onHit:()=>{ G.gold+=Math.floor(totalSpd()*0.5+1); }
  },
  {
    id:'explosion', type:'special', icon:'💣', name:'爆裂终结', unlockLv:40,
    desc:'敌人死亡时额外造成其最大HP 20%伤害',
    onKill:(maxHp)=>Math.floor(maxHp*0.20)
  },
  {
    id:'lucky_chain', type:'special', icon:'🍀', name:'幸运连锁', unlockLv:50,
    desc:'每次暴击5%概率触发随机天赋效果',
    onCrit:()=>Math.random()<0.05
  },
  {
    id:'material_master', type:'special', icon:'🔨', name:'材料大师', unlockLv:60,
    desc:'战斗掉落材料+50%，Boss必掉史诗碎片',
    matBonus:0.5
  },
  {
    id:'eternal_will', type:'special', icon:'🛡', name:'永恒意志', unlockLv:70,
    desc:'失败时30%概率不退关',
    noRetrocChance:0.30
  },
  {
    id:'alchemist', type:'special', icon:'⚗', name:'炼金术士', unlockLv:80,
    desc:'分解装备获得双倍材料',
    salvageDouble:true
  },
  {
    id:'fate_control', type:'special', icon:'🎰', name:'命运操控', unlockLv:90,
    desc:'重置天赋费用锁定不再增加',
    lockRerollCost:true
  },
  {
    id:'divine_realm', type:'special', icon:'🌠', name:'神域', unlockLv:100,
    desc:'所有技能效果×1.5',
    passive:true
  },
];

// ── PASSIVE TREE ─────────────────────────────────────────────
const PASSIVES = [
  { id:'power', icon:'⚔', name:'力量之路', color:'#d4522a', nodes:[
    { id:'p1', n:'蛮力',     d:'ATK永久+20',               c:500,   e:()=>{ G.baseAtk+=20; } },
    { id:'p2', n:'战争机器', d:'ATK+50，Train效果+10%',     c:2000,  req:'p1', e:()=>{ G.baseAtk+=50; G.pb.trainAtkMult+=0.1; } },
    { id:'p3', n:'毁灭打击', d:'攻击5%概率3倍伤害',         c:8000,  req:'p2', e:()=>{ G.pb.demolish=0.05; } },
    { id:'p4', n:'神话之力', d:'ATK+200，每次Train额外+5',  c:30000, req:'p3', e:()=>{ G.baseAtk+=200; G.pb.trainFlat+=5; } },
  ]},
  { id:'speed', icon:'⚡', name:'速度之路', color:'#3a9e6e', nodes:[
    { id:'s1', n:'迅捷',     d:'SPD+0.3',                  c:600,   e:()=>{ G.atkSpd=Math.min(G.atkSpd+0.3,spdCap()); } },
    { id:'s2', n:'风之祝福', d:'SPD+0.5，上限+1.0',         c:2500,  req:'s1', e:()=>{ G.atkSpd+=0.5; G.pb.spdCap+=1.0; } },
    { id:'s3', n:'疾风刃',   d:'10%概率双击',               c:10000, req:'s2', e:()=>{ G.pb.doubleHit=0.10; } },
    { id:'s4', n:'时间掌控', d:'战斗时间+20秒',             c:35000, req:'s3', e:()=>{ G.pb.extraTime+=20; } },
  ]},
  { id:'luck', icon:'🍀', name:'幸运之路', color:'#c9a84c', nodes:[
    { id:'l1', n:'幸运触碰', d:'金币+25%',                  c:800,   e:()=>{ G.pb.goldMult+=0.25; } },
    { id:'l2', n:'宝物感知', d:'掉落率+15%',                c:3000,  req:'l1', e:()=>{ G.pb.dropRate+=0.15; } },
    { id:'l3', n:'传说猎人', d:'传说概率×2',                c:12000, req:'l2', e:()=>{ G.pb.legMult=2; } },
    { id:'l4', n:'神明眷顾', d:'每次胜利1%获得传说',        c:50000, req:'l3', e:()=>{ G.pb.godBless=0.01; } },
  ]},
  { id:'mastery', icon:'🌟', name:'精通之路', color:'#8b5cf6', nodes:[
    { id:'m1', n:'词条大师', d:'装备可以有额外1个词条',     c:5000,  e:()=>{ G.pb.extraAffix=1; } },
    { id:'m2', n:'宝石专家', d:'所有宝石效果+50%',          c:15000, req:'m1', e:()=>{ G.pb.gemBonus=1.5; } },
    { id:'m3', n:'套装亲和', d:'套装效果触发需求-1（最低1）',c:40000, req:'m2', e:()=>{ G.pb.setReduce=1; } },
    { id:'m4', n:'神话锻造', d:'重铸有5%概率获得神话装备',  c:100000,req:'m3', e:()=>{ G.pb.mythicChance=0.05; } },
  ]},
];

// ── ACHIEVEMENTS ─────────────────────────────────────────────
const ACHS = [
  { id:'w1',    icon:'⚔', n:'初次胜利',     d:'赢得第一场战斗',           f:()=>G.wins>=1 },
  { id:'s10',   icon:'🏅', n:'征服者',       d:'到达第10阶段',             f:()=>G.best>=10 },
  { id:'s25',   icon:'🥇', n:'精英冒险者',   d:'到达第25阶段',             f:()=>G.best>=25 },
  { id:'s50',   icon:'👑', n:'传奇英雄',     d:'到达第50阶段',             f:()=>G.best>=50 },
  { id:'s100',  icon:'🐉', n:'龙王',         d:'到达第100阶段',            f:()=>G.best>=100 },
  { id:'s200',  icon:'🌌', n:'神域',         d:'到达第200阶段',            f:()=>G.best>=200 },
  { id:'leg1',  icon:'⭐', n:'传说觉醒',     d:'获得第一件传说装备',       f:()=>G.legCount>=1 },
  { id:'leg10', icon:'🌟', n:'传说收藏家',   d:'获得10件传说装备',         f:()=>G.legCount>=10 },
  { id:'myth1', icon:'🌠', n:'神话降临',     d:'获得第一件神话装备',       f:()=>G.mythCount>=1 },
  { id:'boss1', icon:'💀', n:'屠龙者',       d:'击败第一个Boss',           f:()=>G.bossKills>=1 },
  { id:'boss50',icon:'🏹', n:'Boss猎人',     d:'击败50个Boss',             f:()=>G.bossKills>=50 },
  { id:'combo10',icon:'🔥',n:'连击王',       d:'达到10连击暴击',           f:()=>G.bestCombo>=10 },
  { id:'str10', icon:'✨', n:'连胜大师',     d:'连胜10场',                 f:()=>G.bestStreak>=10 },
  { id:'atk1k', icon:'💥', n:'千伤突破',     d:'总ATK≥1,000',             f:()=>totalAtk()>=1000 },
  { id:'atk10k',icon:'🌋', n:'万伤',         d:'总ATK≥10,000',            f:()=>totalAtk()>=10000 },
  { id:'atk1m', icon:'☄', n:'百万伤害',     d:'总ATK≥1,000,000',         f:()=>totalAtk()>=1000000 },
  { id:'full',  icon:'🛡', n:'全副武装',     d:'四件槽位全装备',           f:()=>SLOTS.every(s=>G.equipped[s]) },
  { id:'set2',  icon:'🎽', n:'套装搭配',     d:'触发任意套装2件效果',      f:()=>G.setEffects.some(e=>e>=2) },
  { id:'set4',  icon:'🏰', n:'套装大师',     d:'触发任意套装4件效果',      f:()=>G.setEffects.some(e=>e>=4) },
  { id:'pass4', icon:'🌿', n:'技能大师',     d:'解锁4个被动',              f:()=>G.done.length>=4 },
  { id:'skill5',icon:'📚', n:'技能学习',     d:'学会5个技能',              f:()=>G.skills.length>=5 },
  { id:'lv10',  icon:'📈', n:'初级冒险者',   d:'达到10级',                 f:()=>G.level>=10 },
  { id:'lv50',  icon:'📊', n:'资深冒险者',   d:'达到50级',                 f:()=>G.level>=50 },
  { id:'lv100', icon:'👸', n:'满级英雄',     d:'达到100级',                f:()=>G.level>=100 },
  { id:'awk1',  icon:'🌅', n:'初次觉醒',     d:'完成第一次觉醒',           f:()=>G.awakenings>=1 },
  { id:'awk3',  icon:'🌄', n:'三度觉醒',     d:'完成三次觉醒',             f:()=>G.awakenings>=3 },
  { id:'gem5',  icon:'💎', n:'宝石爱好者',   d:'镶嵌5颗宝石',             f:()=>G.totalGems>=5 },
  { id:'refor5',icon:'🔄', n:'重铸专家',     d:'重铸装备5次',             f:()=>G.totalReforges>=5 },
  { id:'daily7',icon:'📅', n:'七日常客',     d:'完成7天日常任务',         f:()=>G.dailyStreak>=7 },
  { id:'train1k',icon:'💪',n:'训练狂魔',     d:'Train 1000次',            f:()=>G.trainN>=1000 },
];

// ── DAILY TASKS ───────────────────────────────────────────────
const DAILY_POOL = [
  { id:'d1', n:'战斗达人',   d:'赢得10场战斗',       target:10, key:'wins',     reward:{ gold:500,  mat:'rare', matAmt:2 } },
  { id:'d2', n:'Boss猎杀',   d:'击败3个Boss',         target:3,  key:'bossKills',reward:{ gold:1000, mat:'epic', matAmt:1 } },
  { id:'d3', n:'刻苦训练',   d:'Train 20次',          target:20, key:'trainN',   reward:{ gold:300,  mat:'common', matAmt:5 } },
  { id:'d4', n:'关卡突破',   d:'到达Stage 20',        target:20, key:'stage',    reward:{ gold:800,  mat:'rare', matAmt:3 } },
  { id:'d5', n:'暴击狂',     d:'触发100次暴击',       target:100,key:'crits',    reward:{ gold:600,  mat:'rare', matAmt:2 } },
  { id:'d6', n:'黄金猎手',   d:'获得5000金币',        target:5000,key:'goldEarned',reward:{ gold:500, mat:'rare', matAmt:1 } },
  { id:'d7', n:'装备收集',   d:'获得5件装备',         target:5,  key:'itemsGot', reward:{ gold:700,  mat:'epic', matAmt:1 } },
];
const WEEKLY_POOL = [
  { id:'w1', n:'周常：百战', d:'赢得100场战斗',       target:100,key:'wins',     reward:{ gold:5000, mat:'epic', matAmt:3, gemKey:'ruby' } },
  { id:'w2', n:'周常：Boss猎',d:'击败20个Boss',       target:20, key:'bossKills',reward:{ gold:8000, mat:'epic', matAmt:5, gemKey:'diamond' } },
  { id:'w3', n:'周常：突破', d:'到达Stage 50',        target:50, key:'stage',    reward:{ gold:10000,mat:'legendary',matAmt:1, gemKey:'emerald' } },
  { id:'w4', n:'周常：训练', d:'Train 200次',         target:200,key:'trainN',   reward:{ gold:4000, mat:'rare', matAmt:10, gemKey:'sapphire' } },
];

// ── AWAKENING SYSTEM ──────────────────────────────────────────
const AWAKENING_REQS = [
  { level:50,  stage:30,  gold:10000,  desc:'第一次觉醒 — 力量之源' },
  { level:80,  stage:80,  gold:50000,  desc:'第二次觉醒 — 战魂归来' },
  { level:100, stage:150, gold:200000, desc:'第三次觉醒 — 神明降临' },
];
const AWAKENING_BONUSES = [
  { atkMult:1.5,  spdBonus:0.5,  critBonus:5,  desc:'ATK×1.5，SPD+0.5，Crit+5%' },
  { atkMult:2.0,  spdBonus:1.0,  critBonus:10, desc:'ATK×2.0，SPD+1.0，Crit+10%' },
  { atkMult:3.0,  spdBonus:2.0,  critBonus:20, unlockMythic:true, desc:'ATK×3.0，SPD+2.0，Crit+20%，解锁神话装备' },
];

// ── ENEMY TYPES ───────────────────────────────────────────────
const ENEMY_TYPES = [
  { id:'normal',  name:'普通怪',  hpMult:1,    gMult:1,   dropMult:1,   special:null },
  { id:'elite',   name:'精英怪',  hpMult:3,    gMult:2.5, dropMult:2,   special:'shield', shieldPct:0.2 },
  { id:'boss',    name:'Boss',    hpMult:5,    gMult:5,   dropMult:3,   special:'phase', phaseAt:0.5 },
  { id:'miniboss',name:'小Boss',  hpMult:2.5,  gMult:3,   dropMult:2.5, special:'regen', regenPct:0.02 },
];
// Elite appears every 5 stages, miniboss every 15, boss every 10
const getEnemyType = (stage) => {
  if(stage%10===0) return ENEMY_TYPES.find(e=>e.id==='boss');
  if(stage%15===0) return ENEMY_TYPES.find(e=>e.id==='miniboss');
  if(stage%5===0)  return ENEMY_TYPES.find(e=>e.id==='elite');
  return ENEMY_TYPES.find(e=>e.id==='normal');
};

// ── MILESTONES ────────────────────────────────────────────────
const MILESTONES = [
  { stage:10,  atk:20,                  desc:'ATK+20' },
  { stage:25,  atk:50,  spd:0.2,        desc:'ATK+50 · SPD+0.2' },
  { stage:50,  atk:100, crit:5,         desc:'ATK+100 · Crit+5%' },
  { stage:100, atk:300, cdmg:50,        desc:'ATK+300 · CritDmg+50%' },
  { stage:150, atk:500, spd:0.5,        desc:'ATK+500 · SPD+0.5' },
  { stage:200, atk:1000,               desc:'ATK+1000 · 神话解锁' },
  { stage:300, atk:5000, cdmg:100,     desc:'ATK+5000 · CritDmg+100%' },
  { stage:500, atkMult:2,              desc:'ATK×2 · 超越极限' },
];

// ── SHOP CATALOG ─────────────────────────────────────────────
const SHOP_CATALOG = [
  { id:'sa1', n:'攻击强化药',  d:'+50 ATK',           icon:'⚔', c:()=>Math.floor(500*G.level),  b:()=>{ G.baseAtk+=50; } },
  { id:'sa2', n:'速度药水',    d:'+0.2 SPD',           icon:'⚡', c:()=>800,  b:()=>{ G.atkSpd=Math.min(G.atkSpd+0.2,spdCap()); } },
  { id:'sa3', n:'暴击精华',    d:'+5% Crit',           icon:'🎯', c:()=>600,  b:()=>{ G.critChance+=5; } },
  { id:'sa4', n:'暴击伤害卷',  d:'+25% CritDmg',       icon:'💥', c:()=>700,  b:()=>{ G.critDmg+=25; } },
  { id:'sa5', n:'经验秘籍',    d:'大量EXP',            icon:'📖', c:()=>400,  b:()=>{ gainExp(G.expNeed*2); } },
  { id:'se1', n:'随机装备箱',  d:'随机品质装备',        icon:'📦', c:()=>Math.floor(300+G.stage*20), b:()=>{ openBox(null); } },
  { id:'se2', n:'稀有装备箱',  d:'保底稀有',           icon:'💎', c:()=>800,  b:()=>{ openBox('rare'); } },
  { id:'se3', n:'史诗装备箱',  d:'保底史诗',           icon:'🔮', c:()=>3000, b:()=>{ openBox('epic'); } },
  { id:'se4', n:'传说装备箱',  d:'保底传说',           icon:'⭐', c:()=>15000,b:()=>{ openBox('legendary'); } },
  { id:'sm1', n:'材料礼包',    d:'5普+2稀有碎片',      icon:'🪨', c:()=>1000, b:()=>{ G.mats.common+=5; G.mats.rare+=2; } },
  { id:'sg1', n:'宝石礼包',    d:'随机宝石×3',         icon:'💎', c:()=>2000, b:()=>{ for(let i=0;i<3;i++) gainRandomGem(); } },
  { id:'sc1', n:'重铸石',      d:'重新随机装备词条',    icon:'🔄', c:()=>1500, b:()=>{ G.currencies.reforge=(G.currencies.reforge||0)+1; } },
  { id:'sc2', n:'精华',        d:'锁定词条后重铸',     icon:'💧', c:()=>3000, b:()=>{ G.currencies.essence=(G.currencies.essence||0)+1; } },
  { id:'sc3', n:'催化剂',      d:'强制升品质',         icon:'⚗', c:()=>8000, b:()=>{ G.currencies.catalyst=(G.currencies.catalyst||0)+1; } },
];

// ═══════════════════════════════════════════════════════════
//  NEW EQUIPMENT SYSTEM
//  No drops — player upgrades 4 fixed gear pieces
//  Resources drop from combat, used to enhance gear
// ═══════════════════════════════════════════════════════════

// ── UPGRADE RESOURCES (drop from combat) ─────────────────────
const UPGRADE_MATS = {
  atk_stone:  { name:'攻击石',   icon:'🔴', desc:'强化武器/身体的ATK',   color:'var(--ember2)' },
  spd_stone:  { name:'速度石',   icon:'⚡', desc:'强化武器/腿部的SPD',   color:'var(--jade2)'  },
  crit_stone: { name:'暴击石',   icon:'🎯', desc:'强化头部/腿部的Crit',  color:'var(--gold2)'  },
  def_stone:  { name:'韧性石',   icon:'🛡', desc:'强化身体/头部的CritDmg',color:'var(--ice2)'  },
  boss_core:  { name:'Boss核心', icon:'💀', desc:'稀有强化，全属性大幅提升', color:'var(--violet2)' },
  mythic_shard:{ name:'神话碎片',icon:'🌠', desc:'极稀有，解锁神话路线',  color:'#e0e0ff' },
};

// ── GEAR PATHS (each gear piece has 2 upgrade paths) ─────────
const GEAR_PATHS = {
  weapon: [
    { id:'weapon_atk',  name:'屠戮之刃', icon:'⚔',  desc:'专注ATK，每级+15% ATK',
      mat:'atk_stone', matPer:1,
      levels: Array.from({length:50}, (_,i)=>({ cost: Math.floor(3*Math.pow(1.4,i)), atk: Math.floor(15*Math.pow(1.15,i)) })) },
    { id:'weapon_spd',  name:'风刃',     icon:'💨',  desc:'专注SPD，每级+0.08 SPD',
      mat:'spd_stone', matPer:1,
      levels: Array.from({length:50}, (_,i)=>({ cost: Math.floor(3*Math.pow(1.4,i)), spd: +(0.08*Math.pow(1.05,i)).toFixed(3) })) },
  ],
  head: [
    { id:'head_crit',   name:'猎手之眸', icon:'🎯',  desc:'专注Crit，每级+1.5% Crit',
      mat:'crit_stone', matPer:1,
      levels: Array.from({length:50}, (_,i)=>({ cost: Math.floor(3*Math.pow(1.4,i)), crit: +(1.5*Math.pow(1.08,i)).toFixed(2) })) },
    { id:'head_cdmg',   name:'智慧之冠', icon:'👁',  desc:'专注CritDmg，每级+8% CritDmg',
      mat:'def_stone', matPer:1,
      levels: Array.from({length:50}, (_,i)=>({ cost: Math.floor(3*Math.pow(1.4,i)), cdmg: Math.floor(8*Math.pow(1.08,i)) })) },
  ],
  body: [
    { id:'body_atk',    name:'战神铠甲', icon:'⚔',  desc:'专注ATK，每级+12% ATK',
      mat:'atk_stone', matPer:1,
      levels: Array.from({length:50}, (_,i)=>({ cost: Math.floor(3*Math.pow(1.4,i)), atk: Math.floor(12*Math.pow(1.15,i)) })) },
    { id:'body_cdmg',   name:'爆裂战袍', icon:'💥',  desc:'专注CritDmg，每级+10% CritDmg',
      mat:'def_stone', matPer:1,
      levels: Array.from({length:50}, (_,i)=>({ cost: Math.floor(3*Math.pow(1.4,i)), cdmg: Math.floor(10*Math.pow(1.08,i)) })) },
  ],
  legs: [
    { id:'legs_spd',    name:'疾风战靴', icon:'⚡',  desc:'专注SPD，每级+0.1 SPD',
      mat:'spd_stone', matPer:1,
      levels: Array.from({length:50}, (_,i)=>({ cost: Math.floor(3*Math.pow(1.4,i)), spd: +(0.1*Math.pow(1.05,i)).toFixed(3) })) },
    { id:'legs_crit',   name:'幸运战靴', icon:'🎲',  desc:'专注Crit，每级+2% Crit',
      mat:'crit_stone', matPer:1,
      levels: Array.from({length:50}, (_,i)=>({ cost: Math.floor(3*Math.pow(1.4,i)), crit: +(2*Math.pow(1.08,i)).toFixed(2) })) },
  ],
};

// Boss core path — unlocked after choosing a main path (level 10+)
// Applies to all gear, uses boss_core
const BOSS_PATH = {
  id:'boss_core_path', name:'霸主强化', icon:'💀', desc:'全属性提升，每级+5%全部',
  mat:'boss_core', matPer:1,
  levels: Array.from({length:30}, (_,i)=>({ cost: Math.floor(1*Math.pow(1.6,i)), allPct: +(5*Math.pow(1.05,i)).toFixed(2) })),
};

// ── INITIAL GEAR ──────────────────────────────────────────────
function makeInitialGear() {
  return {
    weapon: { slot:'weapon', name:'破旧长剑',   rar:'common', pathId:null, pathLv:0, bossLv:0, totalAtk:0, totalSpd:0, totalCrit:0, totalCdmg:0 },
    head:   { slot:'head',   name:'破旧头盔',   rar:'common', pathId:null, pathLv:0, bossLv:0, totalAtk:0, totalSpd:0, totalCrit:0, totalCdmg:0 },
    body:   { slot:'body',   name:'破旧铠甲',   rar:'common', pathId:null, pathLv:0, bossLv:0, totalAtk:0, totalSpd:0, totalCrit:0, totalCdmg:0 },
    legs:   { slot:'legs',   name:'破旧战靴',   rar:'common', pathId:null, pathLv:0, bossLv:0, totalAtk:0, totalSpd:0, totalCrit:0, totalCdmg:0 },
  };
}

// Rarity upgrades based on path level
const GEAR_RAR_THRESHOLDS = [
  { lv:0,  rar:'common',   name:'破旧' },
  { lv:5,  rar:'rare',     name:'精良' },
  { lv:15, rar:'epic',     name:'辉耀' },
  { lv:30, rar:'legendary',name:'传说' },
  { lv:50, rar:'mythic',   name:'神话' },
];

function gearRarity(pathLv) {
  let r = GEAR_RAR_THRESHOLDS[0];
  for(const t of GEAR_RAR_THRESHOLDS) { if(pathLv>=t.lv) r=t; }
  return r;
}

// ── DROP TABLE (replaces item drops) ─────────────────────────
const MAT_DROP_TABLE = [
  // [matKey, weight, minAmt, maxAmt, minStage, bossOnly]
  ['atk_stone',  40, 1, 3, 1,  false],
  ['spd_stone',  30, 1, 2, 1,  false],
  ['crit_stone', 25, 1, 2, 1,  false],
  ['def_stone',  20, 1, 2, 1,  false],
  ['boss_core',  10, 1, 2, 5,  true ],
  ['boss_core',   5, 1, 1, 1,  false],
  ['mythic_shard',2, 1, 1, 50, true ],
];

// ═══════════════════════════════════════════════════════
//  GACHA SYSTEM (Phase E)
//  Unlocks at Stage 50
// ═══════════════════════════════════════════════════════

const GACHA_CURRENCY = { name:'传说水晶', icon:'💠', desc:'抽卡货币' };

const GACHA_PITY = { soft:70, hard:90 }; // pulls before guaranteed SSR

const GACHA_BANNERS = [
  {
    id:'standard', name:'常规祈愿', icon:'🌟', type:'standard',
    desc:'标准池 — 随时可抽',
    cost:{ single:160, multi:1600 }, // crystals
    rates:{ ssr:0.6, sr:5.1, r:94.3 },
    pool:{
      ssr:['weapon_ssr_1','weapon_ssr_2','armor_ssr_1','armor_ssr_2'],
      sr: ['weapon_sr_1','weapon_sr_2','armor_sr_1'],
      r:  ['mat_bundle_1','mat_bundle_2'],
    }
  },
  {
    id:'limited', name:'限定祈愿', icon:'⭐', type:'limited',
    desc:'限定池 — 概率提升',
    cost:{ single:160, multi:1600 },
    rates:{ ssr:0.8, sr:6.0, r:93.2 },
    pool:{
      ssr:['weapon_limited_1'],
      sr: ['weapon_sr_1','weapon_sr_2','armor_sr_1'],
      r:  ['mat_bundle_1','mat_bundle_2'],
    }
  },
];

// Gacha pull results map
const GACHA_ITEMS = {
  weapon_ssr_1: { name:'神裁之剑',   icon:'⚔', rar:'mythic',   type:'weapon', bonus:{ atk:500 } },
  weapon_ssr_2: { name:'雷霆战斧',   icon:'🪓', rar:'mythic',   type:'weapon', bonus:{ spd:1.0 } },
  armor_ssr_1:  { name:'龙鳞铠甲',   icon:'🛡', rar:'mythic',   type:'body',   bonus:{ cdmg:100 } },
  armor_ssr_2:  { name:'神明战盔',   icon:'👑', rar:'mythic',   type:'head',   bonus:{ crit:20 } },
  weapon_limited_1:{ name:'末日审判', icon:'💀', rar:'mythic',   type:'weapon', bonus:{ atk:800, truePct:0.05 } },
  weapon_sr_1:  { name:'精锐长剑',   icon:'⚔', rar:'legendary',type:'weapon', bonus:{ atk:200 } },
  weapon_sr_2:  { name:'急速短刃',   icon:'🗡', rar:'legendary',type:'weapon', bonus:{ spd:0.5 } },
  armor_sr_1:   { name:'精英铠甲',   icon:'🛡', rar:'legendary',type:'body',   bonus:{ cdmg:50 } },
  mat_bundle_1: { name:'强化材料包', icon:'📦', rar:'rare',     type:'material',bonus:{ atk_stone:10, spd_stone:5 } },
  mat_bundle_2: { name:'精英材料包', icon:'💎', rar:'rare',     type:'material',bonus:{ crit_stone:8, def_stone:8 } },
};

function doGachaPull(bannerId, multi=false) {
  const banner = GACHA_BANNERS.find(b=>b.id===bannerId);
  if(!banner) return [];
  const cost = multi ? banner.cost.multi : banner.cost.single;
  const pulls = multi ? 10 : 1;
  if((G.gachaCrystals||0) < cost){ notif('传说水晶不足'); return []; }
  G.gachaCrystals -= cost;
  const results = [];
  for(let i=0;i<pulls;i++){
    G.gachaPulls=(G.gachaPulls||0)+1;
    G.gachaPity=(G.gachaPity||0)+1;
    let rar='r';
    const roll=Math.random()*100;
    if(G.gachaPity>=GACHA_PITY.hard){ rar='ssr'; G.gachaPity=0; }
    else if(G.gachaPity>=GACHA_PITY.soft){ if(Math.random()<0.5){ rar='ssr'; G.gachaPity=0; } }
    else if(roll<banner.rates.ssr){ rar='ssr'; G.gachaPity=0; }
    else if(roll<banner.rates.ssr+banner.rates.sr){ rar='sr'; }
    const pool=banner.pool[rar];
    const itemId=pool[~~(Math.random()*pool.length)];
    const item=GACHA_ITEMS[itemId];
    results.push({...item, id:itemId});
    // Apply bonus
    if(item.type==='material'&&item.bonus){
      for(const[k,v] of Object.entries(item.bonus)) G.upgMats[k]=(G.upgMats[k]||0)+v;
    }
  }
  log('💠 祈愿×'+pulls+'：'+results.map(r=>r.name).join('、'),'loot');
  saveGame();
  return results;
}

// Earn crystals from boss kills
function earnGachaCrystals(amount) {
  G.gachaCrystals=(G.gachaCrystals||0)+amount;
  $('gacha-crystals')&&($('gacha-crystals').textContent=G.gachaCrystals||0);
}

// ═══════════════════════════════════════════════════════
//  SYNERGY SYSTEM (Phase F foundation)
//  Activates when 2+ units are in team
// ═══════════════════════════════════════════════════════
const SYNERGIES = [
  {
    id:'double_atk', name:'双刃战意', icon:'⚔⚔',
    desc:'两名战士专精：全队ATK+30%',
    req:{ spec:'atk', count:2 },
    effect:()=>{ G.synergyAtkMult=(G.synergyAtkMult||1)*1.30; }
  },
  {
    id:'speed_chain', name:'速度共鸣', icon:'⚡⚡',
    desc:'两名疾风专精：攻速上限+2.0',
    req:{ spec:'spd', count:2 },
    effect:()=>{ G.synergySpdCap=(G.synergySpdCap||0)+2.0; }
  },
  {
    id:'crit_storm', name:'暴击风暴', icon:'🎯🎯',
    desc:'两名刺客专精：暴击伤害+100%',
    req:{ spec:'crit', count:2 },
    effect:()=>{ G.synergyCdmg=(G.synergyCdmg||0)+100; }
  },
  {
    id:'balanced', name:'均衡之道', icon:'⚖',
    desc:'三种专精各一：所有属性+20%',
    req:{ mixed:true },
    effect:()=>{ G.synergyAllMult=(G.synergyAllMult||1)*1.20; }
  },
];

function calcSynergies() {
  // Reset
  G.synergyAtkMult=1; G.synergySpdCap=0; G.synergyCdmg=0; G.synergyAllMult=1;
  if(!G.units||G.units.length<2) return;
  const specs=G.units.map(u=>u.spec).filter(Boolean);
  SYNERGIES.forEach(syn=>{
    if(syn.req.mixed){
      const unique=new Set(specs).size;
      if(unique>=3) syn.effect();
    } else {
      const cnt=specs.filter(s=>s===syn.req.spec).length;
      if(cnt>=syn.req.count) syn.effect();
    }
  });
}

// ═══════════════════════════════════════════════════════
//  CONTENT EXPANSION — Stage system, enemy variety,
//  gear paths extended to lv100, prestige system,
//  challenge modes, daily dungeons
// ═══════════════════════════════════════════════════════

// ── EXTENDED GEAR PATHS (lv 1-100) ───────────────────
// Each slot gets 3 paths instead of 2, paths go to lv100
const GEAR_PATHS_EX = {
  weapon: [
    { id:'w_atk',   name:'屠戮之刃', icon:'⚔',  desc:'ATK暴力路线',
      mat:'atk_stone',
      levels: Array.from({length:100}, (_,i)=>({
        cost: Math.floor(2*Math.pow(1.35,i)),
        atk:  Math.floor(12*Math.pow(1.12,i))
      }))
    },
    { id:'w_spd',   name:'风刃',     icon:'💨',  desc:'SPD极限路线',
      mat:'spd_stone',
      levels: Array.from({length:100}, (_,i)=>({
        cost: Math.floor(2*Math.pow(1.35,i)),
        spd:  +((0.06*Math.pow(1.04,i)).toFixed(3))
      }))
    },
    { id:'w_crit',  name:'命运之刃', icon:'🎯',  desc:'Crit混合路线 — ATK+Crit',
      mat:'crit_stone',
      levels: Array.from({length:100}, (_,i)=>({
        cost: Math.floor(2*Math.pow(1.35,i)),
        atk:  Math.floor(6*Math.pow(1.10,i)),
        crit: +((0.8*Math.pow(1.06,i)).toFixed(2))
      }))
    },
  ],
  head: [
    { id:'h_crit',  name:'猎手之眸', icon:'🎯',  desc:'暴击率极限',
      mat:'crit_stone',
      levels: Array.from({length:100}, (_,i)=>({
        cost: Math.floor(2*Math.pow(1.35,i)),
        crit: +((1.2*Math.pow(1.07,i)).toFixed(2))
      }))
    },
    { id:'h_cdmg',  name:'智慧之冠', icon:'👁',  desc:'暴击伤害极限',
      mat:'def_stone',
      levels: Array.from({length:100}, (_,i)=>({
        cost: Math.floor(2*Math.pow(1.35,i)),
        cdmg: Math.floor(7*Math.pow(1.08,i))
      }))
    },
    { id:'h_atk',   name:'战争面具', icon:'😤',  desc:'ATK+CritDmg混合',
      mat:'atk_stone',
      levels: Array.from({length:100}, (_,i)=>({
        cost: Math.floor(2*Math.pow(1.35,i)),
        atk:  Math.floor(5*Math.pow(1.10,i)),
        cdmg: Math.floor(4*Math.pow(1.07,i))
      }))
    },
  ],
  body: [
    { id:'b_atk',   name:'战神铠甲', icon:'🛡',  desc:'ATK极限',
      mat:'atk_stone',
      levels: Array.from({length:100}, (_,i)=>({
        cost: Math.floor(2*Math.pow(1.35,i)),
        atk:  Math.floor(10*Math.pow(1.12,i))
      }))
    },
    { id:'b_cdmg',  name:'爆裂战袍', icon:'💥',  desc:'CritDmg极限',
      mat:'def_stone',
      levels: Array.from({length:100}, (_,i)=>({
        cost: Math.floor(2*Math.pow(1.35,i)),
        cdmg: Math.floor(9*Math.pow(1.08,i))
      }))
    },
    { id:'b_spd',   name:'轻甲战衣', icon:'🌀',  desc:'SPD+ATK混合',
      mat:'spd_stone',
      levels: Array.from({length:100}, (_,i)=>({
        cost: Math.floor(2*Math.pow(1.35,i)),
        spd:  +((0.04*Math.pow(1.04,i)).toFixed(3)),
        atk:  Math.floor(5*Math.pow(1.09,i))
      }))
    },
  ],
  legs: [
    { id:'l_spd',   name:'疾风战靴', icon:'⚡',  desc:'SPD极限',
      mat:'spd_stone',
      levels: Array.from({length:100}, (_,i)=>({
        cost: Math.floor(2*Math.pow(1.35,i)),
        spd:  +((0.08*Math.pow(1.05,i)).toFixed(3))
      }))
    },
    { id:'l_crit',  name:'幸运战靴', icon:'🎲',  desc:'Crit极限',
      mat:'crit_stone',
      levels: Array.from({length:100}, (_,i)=>({
        cost: Math.floor(2*Math.pow(1.35,i)),
        crit: +((1.8*Math.pow(1.07,i)).toFixed(2))
      }))
    },
    { id:'l_all',   name:'混沌战靴', icon:'🌑',  desc:'SPD+Crit+CritDmg全混合',
      mat:'boss_core',
      levels: Array.from({length:100}, (_,i)=>({
        cost: Math.floor(1*Math.pow(1.4,i)),
        spd:  +((0.03*Math.pow(1.04,i)).toFixed(3)),
        crit: +((0.6*Math.pow(1.06,i)).toFixed(2)),
        cdmg: Math.floor(3*Math.pow(1.07,i))
      }))
    },
  ],
};

// Override GEAR_PATHS with extended version
Object.assign(GEAR_PATHS, GEAR_PATHS_EX);

// ── EXTENDED BOSS PATH (lv 1-50) ──────────────────────
const BOSS_PATH_EX = {
  id:'boss_core_path', name:'霸主强化', icon:'💀',
  desc:'全属性提升，越强越快',
  mat:'boss_core',
  levels: Array.from({length:50}, (_,i)=>({
    cost:      Math.floor(1*Math.pow(1.5,i)),
    allPct:    +((4*Math.pow(1.06,i)).toFixed(2))
  }))
};
Object.assign(BOSS_PATH, BOSS_PATH_EX);

// ── MYTHIC PATH (unlocked after lv100 gear + 3rd awakening) ──
const MYTHIC_PATH = {
  id:'mythic_path', name:'神话之路', icon:'🌠',
  desc:'神话碎片强化 — 超越极限',
  mat:'mythic_shard',
  levels: Array.from({length:30}, (_,i)=>({
    cost:   Math.floor(1*Math.pow(1.6,i)),
    allPct: +((10*Math.pow(1.08,i)).toFixed(2)),
    truePct:+((0.1*Math.pow(1.05,i)).toFixed(3))
  }))
};

// ── STAGE ZONES (every 50 stages = new zone, new enemy skin) ──
const STAGE_ZONES = [
  { from:1,   to:50,  name:'荒野平原', icon:'🌾', bgColor:'rgba(80,60,20,.08)',  enemyMult:1.0 },
  { from:51,  to:100, name:'暗影森林', icon:'🌲', bgColor:'rgba(20,80,30,.10)',  enemyMult:1.3 },
  { from:101, to:200, name:'地狱火山', icon:'🌋', bgColor:'rgba(120,30,10,.12)', enemyMult:1.8 },
  { from:201, to:350, name:'冰封王座', icon:'❄',  bgColor:'rgba(20,60,120,.12)', enemyMult:2.5 },
  { from:351, to:500, name:'虚空裂隙', icon:'🌌', bgColor:'rgba(80,20,120,.12)', enemyMult:3.5 },
  { from:501, to:750, name:'神明领域', icon:'✨',  bgColor:'rgba(120,100,20,.12)',enemyMult:5.0 },
  { from:751, to:999, name:'末日深渊', icon:'💀',  bgColor:'rgba(60,0,0,.15)',    enemyMult:8.0 },
  { from:1000,to:Infinity,name:'混沌之源',icon:'🔱',bgColor:'rgba(100,50,150,.15)',enemyMult:15.0 },
];

function getZone(stage) {
  return STAGE_ZONES.find(z=>stage>=z.from&&stage<=z.to) || STAGE_ZONES[0];
}

// ── PRESTIGE SYSTEM ────────────────────────────────────
// After beating Stage 500, player can "prestige"
// Resets stage/level but keeps gear levels and adds permanent prestige bonus
const PRESTIGE_BONUSES = [
  { mult:1.5,  desc:'全属性×1.5' },
  { mult:2.0,  desc:'全属性×2.0' },
  { mult:3.0,  desc:'全属性×3.0，解锁神话路线' },
  { mult:5.0,  desc:'全属性×5.0' },
  { mult:10.0, desc:'全属性×10.0，称号：混沌领主' },
];

// ── CHALLENGE MODES ────────────────────────────────────
const CHALLENGES = [
  {
    id:'speed_kill', name:'极速斩杀', icon:'⚡',
    desc:'在10秒内击败敌人，否则失败',
    modifier:{ timeLimit:10 },
    reward:{ crystals:50, bossCore:5 },
    unlockStage:20
  },
  {
    id:'no_crit', name:'无暴击挑战', icon:'🚫',
    desc:'关闭暴击，ATK×5',
    modifier:{ noCrit:true, atkMult:5 },
    reward:{ crystals:100, mythicShard:1 },
    unlockStage:50
  },
  {
    id:'one_shot', name:'一击必杀', icon:'💥',
    desc:'只能攻击一次，必须一击秒杀',
    modifier:{ oneShot:true, dmgMult:50 },
    reward:{ crystals:200, mythicShard:2 },
    unlockStage:100
  },
  {
    id:'infinite', name:'无尽冲关', icon:'♾',
    desc:'无限时间，测试最高可达Stage',
    modifier:{ infinite:true },
    reward:{ crystals:10 }, // per stage
    unlockStage:50
  },
  {
    id:'glass_cannon', name:'玻璃大炮', icon:'💣',
    desc:'ATK×20但SPD固定0.5',
    modifier:{ atkMult:20, fixedSpd:0.5 },
    reward:{ crystals:80, bossCore:10 },
    unlockStage:30
  },
];

// ── DAILY DUNGEONS ─────────────────────────────────────
const DUNGEONS = [
  {
    id:'atk_dungeon',  name:'攻击深渊', icon:'⚔', desc:'ATK为主，掉落大量攻击石',
    stages:10, matReward:'atk_stone', matAmt:30, crystalReward:20,
    unlockStage:10
  },
  {
    id:'spd_dungeon',  name:'疾风迷宫', icon:'⚡', desc:'SPD考验，掉落大量速度石',
    stages:10, matReward:'spd_stone', matAmt:30, crystalReward:20,
    unlockStage:20
  },
  {
    id:'crit_dungeon', name:'命运祭坛', icon:'🎯', desc:'暴击地狱，掉落大量暴击石',
    stages:10, matReward:'crit_stone', matAmt:30, crystalReward:20,
    unlockStage:30
  },
  {
    id:'boss_dungeon',  name:'Boss巢穴', icon:'💀', desc:'全Boss，掉落大量Boss核心',
    stages:5, matReward:'boss_core', matAmt:20, crystalReward:50,
    unlockStage:50
  },
  {
    id:'mythic_dungeon',name:'神话圣殿', icon:'🌠', desc:'极限挑战，神话碎片奖励',
    stages:3, matReward:'mythic_shard', matAmt:5, crystalReward:100,
    unlockStage:200
  },
];

// ── EXTENDED ACHIEVEMENTS (60 total) ──────────────────
const ACHS_EX = [
  // Stage milestones
  { id:'s300',  icon:'🌋', n:'火山征服者',  d:'到达Stage 300',  f:()=>G.best>=300 },
  { id:'s500',  icon:'❄',  n:'冰封王者',    d:'到达Stage 500',  f:()=>G.best>=500 },
  { id:'s750',  icon:'🌌', n:'虚空行者',    d:'到达Stage 750',  f:()=>G.best>=750 },
  { id:'s1000', icon:'🔱', n:'混沌之神',    d:'到达Stage 1000', f:()=>G.best>=1000 },
  // Gear mastery
  { id:'gear20',  icon:'⚔', n:'武器大师',    d:'任意装备强化至Lv.20', f:()=>G.gear&&Object.values(G.gear).some(g=>(g.pathLv||0)>=20) },
  { id:'gear50',  icon:'🗡', n:'传说工匠',    d:'任意装备强化至Lv.50', f:()=>G.gear&&Object.values(G.gear).some(g=>(g.pathLv||0)>=50) },
  { id:'gear100', icon:'🌠', n:'神话锻造师',  d:'任意装备强化至Lv.100',f:()=>G.gear&&Object.values(G.gear).some(g=>(g.pathLv||0)>=100) },
  { id:'allgear10',icon:'🛡',n:'全副武装10', d:'所有装备≥Lv.10', f:()=>G.gear&&Object.values(G.gear).every(g=>(g.pathLv||0)>=10) },
  { id:'allgear50',icon:'👑',n:'神装齐备',   d:'所有装备≥Lv.50', f:()=>G.gear&&Object.values(G.gear).every(g=>(g.pathLv||0)>=50) },
  // Boss kills
  { id:'boss100',  icon:'💀', n:'百Boss猎人',  d:'击败100个Boss',   f:()=>G.bossKills>=100 },
  { id:'boss500',  icon:'☠',  n:'Boss屠夫',    d:'击败500个Boss',   f:()=>G.bossKills>=500 },
  { id:'boss1000', icon:'🏴',  n:'Boss终结者',  d:'击败1000个Boss',  f:()=>G.bossKills>=1000 },
  // Damage
  { id:'dmg1b',   icon:'💣', n:'十亿伤害',    d:'单次造成10亿伤害', f:()=>G.lastDmg>=1e9 },
  { id:'dmg1t',   icon:'☄',  n:'万亿伤害',    d:'单次造成1万亿伤害',f:()=>G.lastDmg>=1e12 },
  { id:'totdmg1t',icon:'🌋', n:'伤害狂魔',    d:'总伤害超过1万亿',  f:()=>G.totalDmg>=1e12 },
  // Combo
  { id:'combo25', icon:'🔥', n:'25连暴击',    d:'达到25连击暴击',   f:()=>G.bestCombo>=25 },
  { id:'combo50', icon:'🌟', n:'50连暴击',    d:'达到50连击暴击',   f:()=>G.bestCombo>=50 },
  // Gold
  { id:'gold1m',  icon:'💰', n:'百万富翁',    d:'持有100万金币',    f:()=>G.gold>=1000000 },
  { id:'gold1b',  icon:'💎', n:'亿万富翁',    d:'持有10亿金币',     f:()=>G.gold>=1e9 },
  // Prestige
  { id:'pres1',   icon:'🌅', n:'重生之路',    d:'完成第一次转生',   f:()=>(G.prestigeCount||0)>=1 },
  { id:'pres3',   icon:'🌄', n:'三度轮回',    d:'完成3次转生',      f:()=>(G.prestigeCount||0)>=3 },
  { id:'pres5',   icon:'♾', n:'永恒轮回者',  d:'完成5次转生',      f:()=>(G.prestigeCount||0)>=5 },
  // Gacha
  { id:'pull10',  icon:'💠', n:'初次祈愿',    d:'祈愿10次',         f:()=>(G.gachaPulls||0)>=10 },
  { id:'pull100', icon:'⭐', n:'祈愿百次',    d:'祈愿100次',        f:()=>(G.gachaPulls||0)>=100 },
  { id:'pull500', icon:'🌟', n:'氪金勇士',    d:'祈愿500次',        f:()=>(G.gachaPulls||0)>=500 },
  // Speed
  { id:'spd5',    icon:'⚡', n:'速度之神',    d:'攻速达到5.0',      f:()=>G.atkSpd>=5.0 },
  { id:'spd8',    icon:'🌪', n:'光速战士',    d:'攻速达到8.0',      f:()=>G.atkSpd>=8.0 },
  // Awakening
  { id:'awk2',    icon:'🌅', n:'二度觉醒',    d:'完成第2次觉醒',    f:()=>G.awakenings>=2 },
  // Skills
  { id:'skill10', icon:'📚', n:'技能精通',    d:'学会10个技能',     f:()=>G.skills.length>=10 },
  { id:'skill30', icon:'📖', n:'技能宗师',    d:'学会所有30个技能', f:()=>G.skills.length>=30 },
  // Train
  { id:'train5k', icon:'💪', n:'刻苦训练',    d:'Train 5000次',     f:()=>G.trainN>=5000 },
  { id:'train10k',icon:'🏆', n:'训练之神',    d:'Train 10000次',    f:()=>G.trainN>=10000 },
  // Streak
  { id:'str25',   icon:'🔥', n:'25连胜大师',  d:'连胜25场',         f:()=>G.bestStreak>=25 },
  { id:'str50',   icon:'⚡', n:'50连胜传说',  d:'连胜50场',         f:()=>G.bestStreak>=50 },
  // ATK
  { id:'atk100k', icon:'💥', n:'十万ATK',     d:'总ATK≥100,000',    f:()=>totalAtk()>=100000 },
  { id:'atk1m',   icon:'🌋', n:'百万ATK',     d:'总ATK≥1,000,000',  f:()=>totalAtk()>=1000000 },
  // Materials
  { id:'mat1k',   icon:'🪨', n:'材料囤积',    d:'任意材料达1000',   f:()=>Object.values(G.upgMats||{}).some(v=>v>=1000) },
  { id:'boss100c',icon:'💀', n:'Boss核心大师',d:'获得100个Boss核心',f:()=>(G.upgMats?.boss_core||0)>=100 },
];

// Merge with existing ACHS
ACHS.push(...ACHS_EX);

// ── EXTENDED MILESTONES ────────────────────────────────
const MILESTONES_EX = [
  { stage:250,  atk:2000,  crit:10,   desc:'ATK+2000 · Crit+10%' },
  { stage:300,  atkMult:1.5,          desc:'ATK×1.5' },
  { stage:400,  atk:5000,  cdmg:100,  desc:'ATK+5000 · CritDmg+100%' },
  { stage:500,  atkMult:2, spd:1.0,   desc:'ATK×2 · SPD+1.0 · 可转生' },
  { stage:600,  atk:20000,            desc:'ATK+20000' },
  { stage:700,  atkMult:2, crit:20,   desc:'ATK×2 · Crit+20%' },
  { stage:800,  atk:50000, cdmg:200,  desc:'ATK+50000 · CritDmg+200%' },
  { stage:900,  atkMult:3,            desc:'ATK×3' },
  { stage:1000, atkMult:5, spd:2.0,   desc:'ATK×5 · SPD+2.0 · 神话觉醒' },
];
MILESTONES.push(...MILESTONES_EX);

// ── EXTENDED DAILY TASKS (14 total pool) ───────────────
const DAILY_POOL_EX = [
  { id:'d8',  n:'精英猎手',   d:'击败10个精英怪',      target:10, key:'eliteKills',  reward:{ gold:1500, mat:'boss_core', matAmt:2 } },
  { id:'d9',  n:'材料收集',   d:'收集50个攻击石',       target:50, key:'atkStoneColl', reward:{ gold:1000, mat:'rare', matAmt:3 } },
  { id:'d10', n:'超级连击',   d:'达到20连击暴击',       target:20, key:'bestCombo',    reward:{ gold:2000, mat:'epic', matAmt:2 } },
  { id:'d11', n:'关卡挑战',   d:'到达Stage 30以上',     target:30, key:'stage',        reward:{ gold:3000, mat:'boss_core', matAmt:3 } },
  { id:'d12', n:'黄金猎手II', d:'获得20000金币',        target:20000,key:'goldEarned', reward:{ gold:2000, mat:'rare', matAmt:5 } },
  { id:'d13', n:'强化专家',   d:'强化装备10次',         target:10, key:'upgradeCount', reward:{ gold:2500, mat:'epic', matAmt:2 } },
  { id:'d14', n:'连胜战士',   d:'连胜15场',             target:15, key:'streak',       reward:{ gold:3000, mat:'boss_core', matAmt:5 } },
];
DAILY_POOL.push(...DAILY_POOL_EX);

// ── PRESTIGE (转生) SYSTEM ─────────────────────────────
function canPrestige() {
  return G.best >= 500;
}

function doPrestige() {
  if(!canPrestige()) { notif('需要到达Stage 500'); return; }
  const n = (G.prestigeCount||0);
  const bonus = PRESTIGE_BONUSES[Math.min(n, PRESTIGE_BONUSES.length-1)];
  G.prestigeCount = n + 1;
  G.prestigeMult = (G.prestigeMult||1) * bonus.mult;
  // Reset progress
  G.level=1; G.exp=0; G.expNeed=EXP_TABLE[1];
  G.stage=1; G.baseAtk=Math.floor(G.baseAtk*0.1+10);
  G.atkSpd=1.0; G.critChance=5; G.critDmg=200;
  G.tAtk=0; G.tN=0; G.tCrit=0; G.tSpd=0;
  G.bonusAtk=0; G.skillBonusAtk=0;
  G.streak=0; G.combo=0;
  // Keep: gear levels, gacha items, awakenings, prestige bonuses
  log('🔱 转生！获得 '+bonus.desc,'boss');
  notif('🔱 转生完成！'+bonus.desc,'#c9a84c');
}

// ═══════════════════════════════════════════════════════
//  BIG CONTENT EXPANSION 2
// ═══════════════════════════════════════════════════════

// ── 12 MORE TALENTS (total 30) ─────────────────────────
const TALENTS_EX = [
  { id:'vampire',    icon:'🧛', name:'吸血鬼',     desc:'每次攻击回复ATK×1%的金币',
    onHit:()=>{ G.gold+=Math.floor(totalAtk()*0.01); } },
  { id:'berserker',  icon:'🐗', name:'狂猪',       desc:'HP低于50%时ATK×3，但时间-20秒',
    dmgMult:(pct)=>pct<0.5?3:1, timePenalty:20 },
  { id:'sniper',     icon:'🎯', name:'狙击手',     desc:'每10次攻击必然暴击，暴击伤害×3',
    state:{ counter:0 },
    onHit:(c)=>{
      const s=TALENTS.find(t=>t.id==='sniper')?.state||{counter:0};
      if(!c){ s.counter++; if(s.counter>=10){ s.counter=0; return true; } } return false;
    }
  },
  { id:'berserker2', icon:'🔥', name:'战意高昂',   desc:'每连胜+10%ATK，最高+300%',
    atkBonus:()=>Math.min((G.streak||0)*0.10, 3.0) },
  { id:'tank',       icon:'🛡', name:'铁壁',       desc:'每次被攻击（失败）+50 ATK永久',
    onLose:()=>{ G.tAtk+=50; G.tN++; } },
  { id:'gambler',    icon:'🎲', name:'赌徒',       desc:'50%概率ATK×5，50%概率ATK×0.2',
    dmgMult:()=>Math.random()<0.5?5:0.2 },
  { id:'scholar',    icon:'📚', name:'学者',       desc:'每次升级永久+5%ATK',
    onLevelUp:()=>{ G.tAtk+=Math.floor(totalAtk()*0.05); G.tN++; } },
  { id:'collector',  icon:'💎', name:'收藏家',     desc:'每收集1个材料永久+0.5 ATK',
    passive:true },
  { id:'warlord',    icon:'⚔', name:'战争领主',   desc:'每10次Boss击杀 ATK×1.1',
    passive:true },
  { id:'shadow',     icon:'🌑', name:'暗影',       desc:'普攻有5%概率造成1000%伤害',
    onHit:()=>Math.random()<0.05?{proc:true,dmgMult:10,label:'🌑 暗影！'}:{proc:false} },
  { id:'speedster',  icon:'⚡', name:'极速',       desc:'每次攻击SPD+0.001，无上限',
    onHit:()=>{ G.atkSpd+=0.001; } },
  { id:'godhand',    icon:'✋', name:'神之手',     desc:'每次暴击+1金币×关卡数',
    onHit:(c)=>{ if(c) G.gold+=G.stage; } },
];
TALENTS.push(...TALENTS_EX);

// ── EXPANDED GACHA POOL (40+ items) ───────────────────
const GACHA_ITEMS_EX = {
  // SSR Weapons
  weapon_ssr_3: { name:'时间裂缝',    icon:'⏳', rar:'mythic',   type:'weapon', bonus:{ spd:2.0, crit:15 } },
  weapon_ssr_4: { name:'混沌之刃',    icon:'🌀', rar:'mythic',   type:'weapon', bonus:{ atk:1000, cdmg:150 } },
  weapon_ssr_5: { name:'龙神之枪',    icon:'🐉', rar:'mythic',   type:'weapon', bonus:{ atk:600, spd:1.0, crit:10 } },
  // SSR Armor
  armor_ssr_3:  { name:'虚空战甲',    icon:'🌌', rar:'mythic',   type:'body',   bonus:{ atk:400, cdmg:200 } },
  armor_ssr_4:  { name:'天使羽翼',    icon:'👼', rar:'mythic',   type:'head',   bonus:{ crit:30, cdmg:100 } },
  armor_ssr_5:  { name:'恶魔战靴',    icon:'😈', rar:'mythic',   type:'legs',   bonus:{ spd:1.5, crit:20 } },
  // Limited
  weapon_limited_2: { name:'世界终结者', icon:'💥', rar:'mythic', type:'weapon', bonus:{ atk:2000, truePct:0.10 } },
  armor_limited_1:  { name:'神明铠甲',   icon:'👑', rar:'mythic', type:'body',   bonus:{ cdmg:300, allPct:0.50 } },
  // SR items
  weapon_sr_3:  { name:'刺客短剑',    icon:'🗡', rar:'legendary',type:'weapon', bonus:{ crit:10, cdmg:50 } },
  weapon_sr_4:  { name:'暴君战戟',    icon:'🔱', rar:'legendary',type:'weapon', bonus:{ atk:300, spd:0.3 } },
  weapon_sr_5:  { name:'疾风之弓',    icon:'🏹', rar:'legendary',type:'weapon', bonus:{ spd:0.8, crit:8 } },
  armor_sr_2:   { name:'英雄铠甲',    icon:'🛡', rar:'legendary',type:'body',   bonus:{ atk:200, cdmg:80 } },
  armor_sr_3:   { name:'智者战盔',    icon:'🎓', rar:'legendary',type:'head',   bonus:{ crit:12, cdmg:60 } },
  armor_sr_4:   { name:'神行战靴',    icon:'👟', rar:'legendary',type:'legs',   bonus:{ spd:0.6, crit:10 } },
  // Material packs
  mat_bundle_3: { name:'Boss核心礼包',icon:'💀', rar:'rare', type:'material', bonus:{ boss_core:20 } },
  mat_bundle_4: { name:'神话碎片包',  icon:'🌠', rar:'rare', type:'material', bonus:{ mythic_shard:3 } },
  mat_bundle_5: { name:'全材料大礼包',icon:'🎁', rar:'epic', type:'material', bonus:{ atk_stone:30, spd_stone:30, crit_stone:30, def_stone:30 } },
};
Object.assign(GACHA_ITEMS, GACHA_ITEMS_EX);

// Update banner pools with new items
GACHA_BANNERS[0].pool.ssr.push('weapon_ssr_3','weapon_ssr_4','weapon_ssr_5','armor_ssr_3','armor_ssr_4','armor_ssr_5');
GACHA_BANNERS[0].pool.sr.push('weapon_sr_3','weapon_sr_4','weapon_sr_5','armor_sr_2','armor_sr_3','armor_sr_4');
GACHA_BANNERS[0].pool.r.push('mat_bundle_3','mat_bundle_4','mat_bundle_5');

// Add limited banner 2
GACHA_BANNERS.push({
  id:'weapon_limited', name:'武器限定', icon:'⚔', type:'limited',
  desc:'武器限定池 — 武器SSR概率提升',
  cost:{ single:160, multi:1600 },
  rates:{ ssr:1.0, sr:6.0, r:93.0 },
  pool:{
    ssr:['weapon_limited_2','weapon_ssr_3','weapon_ssr_4','weapon_ssr_5'],
    sr: ['weapon_sr_3','weapon_sr_4','weapon_sr_5'],
    r:  ['mat_bundle_3','mat_bundle_4'],
  }
});

// ── EXPANDED SHOP (30 items) ──────────────────────────
const SHOP_EX = [
  { id:'smat1', n:'ATK石礼包×10',  d:'10x攻击石',        icon:'🔴', c:()=>500,   b:()=>{ G.upgMats.atk_stone+=10; } },
  { id:'smat2', n:'SPD石礼包×10',  d:'10x速度石',        icon:'⚡', c:()=>500,   b:()=>{ G.upgMats.spd_stone+=10; } },
  { id:'smat3', n:'CRIT石礼包×10', d:'10x暴击石',        icon:'🎯', c:()=>500,   b:()=>{ G.upgMats.crit_stone+=10; } },
  { id:'smat4', n:'DEF石礼包×10',  d:'10x韧性石',        icon:'🛡', c:()=>500,   b:()=>{ G.upgMats.def_stone+=10; } },
  { id:'smat5', n:'Boss核心×3',    d:'3x Boss核心',      icon:'💀', c:()=>2000,  b:()=>{ G.upgMats.boss_core+=3; } },
  { id:'smat6', n:'全材料礼包',    d:'各5x所有材料',     icon:'🎁', c:()=>3000,  b:()=>{ Object.keys(G.upgMats).forEach(k=>{ G.upgMats[k]+=5; }); } },
  { id:'scrys', n:'传说水晶×50',   d:'50x祈愿货币',      icon:'💠', c:()=>5000,  b:()=>{ G.gachaCrystals+=50; } },
  { id:'sexp1', n:'EXP大爆发',     d:'×10 EXP',          icon:'📖', c:()=>1000,  b:()=>{ gainExp(G.expNeed*10); } },
  { id:'satk2', n:'ATK大强化',     d:'永久+200 ATK',     icon:'⚔', c:()=>Math.floor(2000*G.level), b:()=>{ G.baseAtk+=200; log('⚔ ATK+200','ev'); } },
  { id:'sspd2', n:'SPD强化',       d:'永久+0.5 SPD',     icon:'⚡', c:()=>3000,  b:()=>{ G.atkSpd=Math.min(G.atkSpd+0.5,spdCap()); } },
  { id:'scrit2',n:'Crit大强化',    d:'永久+10% Crit',    icon:'🎯', c:()=>2500,  b:()=>{ G.critChance+=10; } },
  { id:'scdmg2',n:'CritDmg强化',   d:'永久+50% CritDmg', icon:'💥', c:()=>2000,  b:()=>{ G.critDmg+=50; } },
  { id:'smyth', n:'神话碎片',      d:'1x神话碎片',       icon:'🌠', c:()=>20000, b:()=>{ G.upgMats.mythic_shard+=1; } },
];
SHOP_CATALOG.push(...SHOP_EX);

// ── OFFLINE INCOME TABLE ──────────────────────────────
// More generous offline gains based on stage
function calcOfflineGains(seconds) {
  const mins = seconds / 60;
  const zone = typeof getZone==='function' ? getZone(G.stage) : {enemyMult:1};
  const baseMats = {
    atk_stone:  Math.floor(mins * 0.5 * zone.enemyMult),
    spd_stone:  Math.floor(mins * 0.4 * zone.enemyMult),
    crit_stone: Math.floor(mins * 0.3 * zone.enemyMult),
    def_stone:  Math.floor(mins * 0.3 * zone.enemyMult),
    boss_core:  Math.floor(mins * 0.05 * zone.enemyMult),
  };
  const gold = Math.floor(totalAtk() * totalSpd() * mins * 2);
  const exp  = Math.floor(G.stage * mins * 0.5);
  return { gold, exp, mats: baseMats };
}

// ═══════════════════════════════════════════════════════
//  VERSION 3 CONTENT EXPANSION
// ═══════════════════════════════════════════════════════

// ── RUNE SYSTEM ───────────────────────────────────────
// Runes drop from Boss kills, slot into character (not gear)
// 6 rune slots, each gives a unique passive bonus
const RUNES = [
  // ATK runes
  { id:'r_atk1',    name:'力量符文I',   icon:'🔴', tier:1, desc:'ATK+50',         effect:()=>{ G.runeAtk=(G.runeAtk||0)+50; } },
  { id:'r_atk2',    name:'力量符文II',  icon:'🔴', tier:2, desc:'ATK+200',        effect:()=>{ G.runeAtk=(G.runeAtk||0)+200; } },
  { id:'r_atk3',    name:'力量符文III', icon:'🔴', tier:3, desc:'ATK+1000',       effect:()=>{ G.runeAtk=(G.runeAtk||0)+1000; } },
  { id:'r_atk4',    name:'毁灭符文',    icon:'💢', tier:4, desc:'ATK+5000',       effect:()=>{ G.runeAtk=(G.runeAtk||0)+5000; } },
  // SPD runes
  { id:'r_spd1',    name:'速度符文I',   icon:'🟡', tier:1, desc:'SPD+0.2',        effect:()=>{ G.runeSpd=(G.runeSpd||0)+0.2; } },
  { id:'r_spd2',    name:'速度符文II',  icon:'🟡', tier:2, desc:'SPD+0.5',        effect:()=>{ G.runeSpd=(G.runeSpd||0)+0.5; } },
  { id:'r_spd3',    name:'疾风符文',    icon:'⚡', tier:3, desc:'SPD+1.5',        effect:()=>{ G.runeSpd=(G.runeSpd||0)+1.5; } },
  // CRIT runes
  { id:'r_crit1',   name:'暴击符文I',   icon:'🟠', tier:1, desc:'Crit+5%',        effect:()=>{ G.runeCrit=(G.runeCrit||0)+5; } },
  { id:'r_crit2',   name:'暴击符文II',  icon:'🟠', tier:2, desc:'Crit+15%',       effect:()=>{ G.runeCrit=(G.runeCrit||0)+15; } },
  { id:'r_cdmg1',   name:'爆破符文I',   icon:'🟤', tier:1, desc:'CritDmg+30%',    effect:()=>{ G.runeCdmg=(G.runeCdmg||0)+30; } },
  { id:'r_cdmg2',   name:'爆破符文II',  icon:'🟤', tier:2, desc:'CritDmg+100%',   effect:()=>{ G.runeCdmg=(G.runeCdmg||0)+100; } },
  // Special runes
  { id:'r_gold',    name:'财富符文',    icon:'💰', tier:2, desc:'金币获得+50%',   effect:()=>{ G.runeGoldMult=(G.runeGoldMult||0)+0.5; } },
  { id:'r_true',    name:'真伤符文',    icon:'💀', tier:3, desc:'每击额外1%最大HP真伤', effect:()=>{ G.runeTruePct=(G.runeTruePct||0)+0.01; } },
  { id:'r_combo',   name:'连击符文',    icon:'🔥', tier:3, desc:'每连击+3%ATK（无上限）', effect:()=>{ G.runeComboBonus=true; } },
  { id:'r_time',    name:'时间符文',    icon:'⏳', tier:2, desc:'战斗时间+30秒',  effect:()=>{ G.runeTime=(G.runeTime||0)+30; } },
  { id:'r_mythic',  name:'神话符文',    icon:'🌠', tier:4, desc:'所有属性+25%',   effect:()=>{ G.runeMythicMult=(G.runeMythicMult||0)+0.25; } },
  { id:'r_prestige',name:'转生符文',    icon:'🔱', tier:4, desc:'转生倍率额外×1.5', effect:()=>{ G.runePrestigeMult=(G.runePrestigeMult||1)*1.5; } },
];

const RUNE_SLOTS = 6;
const RUNE_DROP_CHANCE = 0.15; // 15% per boss kill

// ── TITLE SYSTEM ──────────────────────────────────────
const TITLES = [
  { id:'t_novice',   name:'新手冒险者',  icon:'👶', req:()=>G.best>=1 },
  { id:'t_fighter',  name:'战士',        icon:'⚔',  req:()=>G.best>=10 },
  { id:'t_warrior',  name:'战斗者',      icon:'🗡',  req:()=>G.best>=25 },
  { id:'t_veteran',  name:'老兵',        icon:'🏅',  req:()=>G.best>=50 },
  { id:'t_hero',     name:'英雄',        icon:'👑',  req:()=>G.best>=100 },
  { id:'t_legend',   name:'传说英雄',    icon:'⭐',  req:()=>G.best>=200 },
  { id:'t_myth',     name:'神话勇者',    icon:'🌟',  req:()=>G.best>=500 },
  { id:'t_god',      name:'战神',        icon:'🔱',  req:()=>G.best>=1000 },
  { id:'t_train10k', name:'训练狂魔',    icon:'💪',  req:()=>G.trainN>=10000 },
  { id:'t_boss1k',   name:'Boss终结者',  icon:'💀',  req:()=>G.bossKills>=1000 },
  { id:'t_crit50',   name:'暴击之神',    icon:'🎯',  req:()=>G.bestCombo>=50 },
  { id:'t_rich',     name:'亿万富翁',    icon:'💎',  req:()=>G.gold>=1e9 },
  { id:'t_prestige', name:'轮回者',      icon:'🌅',  req:()=>(G.prestigeCount||0)>=1 },
  { id:'t_awakened', name:'觉醒者',      icon:'✨',  req:()=>G.awakenings>=3 },
  { id:'t_gacha100', name:'氪金战士',    icon:'💠',  req:()=>(G.gachaPulls||0)>=100 },
  { id:'t_all_gear', name:'神装具现',    icon:'🛡',  req:()=>G.gear&&Object.values(G.gear).every(g=>(g.pathLv||0)>=50) },
];

// ── WEEKLY BOSS ───────────────────────────────────────
const WEEKLY_BOSS = {
  id:'weekly_boss',
  name:'周常Boss',
  icon:'👹',
  desc:'每周一次 — 极强Boss，巨额奖励',
  hpMult:50,
  timeBonusSec:120,
  reward:{
    crystals:500,
    boss_core:50,
    mythic_shard:5,
    gold:100000,
  },
  phases:[
    { at:0.75, name:'第一阶段', atkMult:1.5, msg:'Boss进入愤怒！ATK×1.5！' },
    { at:0.50, name:'第二阶段', atkMult:2.0, msg:'Boss狂暴！ATK×2！' },
    { at:0.25, name:'第三阶段', atkMult:3.0, msg:'最终形态！ATK×3！' },
  ]
};

// ── STAGE MODIFIERS ───────────────────────────────────
// Every 7 stages, a random modifier applies
const STAGE_MODIFIERS = [
  { id:'double_hp',   name:'钢铁之躯',  icon:'🛡', desc:'敌人HP×2',         apply:(max)=>max*2 },
  { id:'fast_time',   name:'时间加速',  icon:'⏩', desc:'战斗时间减半',     applyTime:(t)=>Math.ceil(t/2) },
  { id:'no_crit',     name:'磁场干扰',  icon:'🚫', desc:'本关Crit无效',     noCrit:true },
  { id:'gold_boost',  name:'黄金之地',  icon:'💰', desc:'金币×3',           goldMult:3 },
  { id:'mat_boost',   name:'材料宝库',  icon:'📦', desc:'材料掉落×3',       matMult:3 },
  { id:'crit_boost',  name:'命运时刻',  icon:'⭐', desc:'暴击伤害×2',       critDmgMult:2 },
  { id:'regen',       name:'自我修复',  icon:'💚', desc:'敌人每秒回3%HP',   regenPct:0.03 },
  { id:'shield_wall', name:'盾墙',      icon:'🏰', desc:'敌人有20%HP护盾',  shieldPct:0.2 },
  { id:'berserk_all', name:'全员狂暴',  icon:'😤', desc:'所有属性×1.5但敌人HP×3', allMult:1.5, hpMult:3 },
  { id:'treasure',    name:'宝藏关卡',  icon:'💎', desc:'Boss核心×5掉落',   bonusBossCore:5 },
];

// ── COMBO SKILLS (triggered at certain combo counts) ──
const COMBO_SKILLS = [
  { at:5,   name:'五连冲击',  icon:'5️⃣', desc:'下次攻击×2伤害',     dmgMult:2 },
  { at:10,  name:'十连爆发',  icon:'🔟', desc:'下次攻击×5伤害',     dmgMult:5 },
  { at:25,  name:'四分之一神',icon:'💫', desc:'下次攻击×10伤害',    dmgMult:10 },
  { at:50,  name:'半神',      icon:'⚡', desc:'下次攻击×25伤害',    dmgMult:25 },
  { at:100, name:'神之触碰',  icon:'✋', desc:'下次攻击×100伤害',   dmgMult:100 },
];

// ── GEAR EVOLUTION ────────────────────────────────────
// After gear reaches Lv.50 + boss_core Lv.20 = can evolve
// Evolution resets path to 0 but gives permanent ×2 multiplier
const GEAR_EVOLUTION_REQ = { pathLv:50, bossLv:20 };
const GEAR_EVOLUTION_BONUS = { mult:2.0, desc:'属性全部×2，但等级重置' };

// ── AUTO-UPGRADE SYSTEM ───────────────────────────────
// Player can set auto-upgrade priority for gear
const AUTO_UPGRADE_MODES = [
  { id:'off',      name:'关闭',     desc:'不自动强化' },
  { id:'cheapest', name:'最便宜',   desc:'优先强化费用最低的路线' },
  { id:'slot',     name:'指定槽位', desc:'按指定顺序强化' },
  { id:'balanced', name:'均衡',     desc:'保持四件装备等级接近' },
];

// ── EXTENDED MILESTONES (stage 1000-5000) ─────────────
const MILESTONES_EX2 = [
  { stage:1500, atkMult:3,  spd:2.0,  desc:'ATK×3 · SPD+2.0' },
  { stage:2000, atkMult:5,            desc:'ATK×5 · 二次转生' },
  { stage:2500, atk:500000,crit:50,   desc:'ATK+500000 · Crit+50%' },
  { stage:3000, atkMult:10,           desc:'ATK×10' },
  { stage:4000, atkMult:20,spd:5.0,   desc:'ATK×20 · SPD+5.0' },
  { stage:5000, atkMult:100,          desc:'ATK×100 · 神话降临' },
];
MILESTONES.push(...MILESTONES_EX2);

// ── MORE ACHIEVEMENTS (80 total) ──────────────────────
const ACHS_EX2 = [
  { id:'rune1',    icon:'🔴', n:'初次刻文',   d:'装备第一个符文',          f:()=>(G.runesEquipped||[]).length>=1 },
  { id:'rune6',    icon:'🌟', n:'六符文者',   d:'装备6个符文',             f:()=>(G.runesEquipped||[]).length>=6 },
  { id:'title1',   icon:'👑', n:'有名有姓',   d:'获得第一个称号',          f:()=>(G.titlesEarned||[]).length>=1 },
  { id:'title10',  icon:'📛', n:'称号收藏家', d:'获得10个称号',            f:()=>(G.titlesEarned||[]).length>=10 },
  { id:'wboss1',   icon:'👹', n:'周常猎手',   d:'击败周常Boss',            f:()=>(G.weeklyBossKills||0)>=1 },
  { id:'wboss5',   icon:'☠',  n:'周常大师',   d:'击败5次周常Boss',         f:()=>(G.weeklyBossKills||0)>=5 },
  { id:'combo100', icon:'💯', n:'百连暴击',   d:'达到100连击暴击',         f:()=>G.bestCombo>=100 },
  { id:'evolve1',  icon:'🌅', n:'装备进化',   d:'完成第一次装备进化',      f:()=>(G.gearEvolutions||0)>=1 },
  { id:'evolve4',  icon:'🌌', n:'全装进化',   d:'所有装备进化一次',        f:()=>(G.gearEvolutions||0)>=4 },
  { id:'s2000',    icon:'🔱', n:'混沌征服者', d:'到达Stage 2000',          f:()=>G.best>=2000 },
  { id:'s5000',    icon:'🌠', n:'神话触碰',   d:'到达Stage 5000',          f:()=>G.best>=5000 },
  { id:'dung30',   icon:'🏛', n:'副本常客',   d:'完成30次副本',            f:()=>(G.totalDungeons||0)>=30 },
  { id:'chal10',   icon:'🏆', n:'挑战老手',   d:'完成10次挑战',            f:()=>(G.totalChallenges||0)>=10 },
  { id:'auto10k',  icon:'🤖', n:'自动化大师', d:'自动强化10000次',         f:()=>(G.autoUpgradeCount||0)>=10000 },
  { id:'pres10',   icon:'♾',  n:'永恒转生者', d:'完成10次转生',            f:()=>(G.prestigeCount||0)>=10 },
  { id:'stage_mod',icon:'🎲', n:'变数大师',   d:'遇到50次关卡修正',        f:()=>(G.stageModCount||0)>=50 },
];
ACHS.push(...ACHS_EX2);


// ═══════════════════════════════════════════════════════
//  VERSION 4 EXPANSION
// ═══════════════════════════════════════════════════════

// ── EXPANDED PASSIVE TREE (6 tracks, 6 nodes each) ────
const PASSIVES_EX = [
  { id:'fortune2', icon:'💰', name:'财富之路', color:'#c9a84c', nodes:[
    { id:'f1', n:'黄金嗅觉',   d:'金币+30%',                   c:1000,  e:()=>{ G.pb.goldMult+=0.30; } },
    { id:'f2', n:'财富积累',   d:'金币+60%，每胜利+2金',        c:4000,  req:'f1', e:()=>{ G.pb.goldMult+=0.60; G.pb.goldFlat=2; } },
    { id:'f3', n:'贪婪之心',   d:'Boss金币×3',                 c:15000, req:'f2', e:()=>{ G.pb.bossGoldMult=3; } },
    { id:'f4', n:'点金术',     d:'Train花费-50%',               c:50000, req:'f3', e:()=>{ G.pb.trainCostMult=0.5; } },
    { id:'f5', n:'无底金库',   d:'金币上限×10',                 c:150000,req:'f4', e:()=>{ G.pb.goldCapMult=10; } },
    { id:'f6', n:'财神降临',   d:'每秒自动+金币（按Stage）',    c:500000,req:'f5', e:()=>{ G.pb.goldPerSec=true; } },
  ]},
  { id:'destruction', icon:'💥', name:'毁灭之路', color:'#f07040', nodes:[
    { id:'d1', n:'破甲',       d:'攻击忽视10%敌人HP上限',       c:2000,  e:()=>{ G.pb.truePct=(G.pb.truePct||0)+0.01; } },
    { id:'d2', n:'撕裂',       d:'普攻有15%双倍伤害',           c:8000,  req:'d1', e:()=>{ G.pb.splitChance=0.15; } },
    { id:'d3', n:'毁灭冲击',   d:'ATK+100，暴击伤害+50%',       c:25000, req:'d2', e:()=>{ G.baseAtk+=100; G.critDmg+=50; } },
    { id:'d4', n:'末日审判',   d:'每20次攻击自动触发3倍大击',   c:80000, req:'d3', e:()=>{ G.pb.judgement=20; } },
    { id:'d5', n:'混沌爆破',   d:'暴击时额外造成10%最大HP真伤', c:250000,req:'d4', e:()=>{ G.pb.critTruePct=0.10; } },
    { id:'d6', n:'神之一击',   d:'每100次攻击必定触发×50伤害',  c:800000,req:'d5', e:()=>{ G.pb.godStrike=100; } },
  ]},
  { id:'endurance', icon:'⏳', name:'耐久之路', color:'#7ec8f0', nodes:[
    { id:'e1', n:'时间延伸',   d:'战斗时间+15秒',               c:800,   e:()=>{ G.pb.extraTime+=15; } },
    { id:'e2', n:'无尽战意',   d:'战斗时间+30秒，失败不退关5%', c:3000,  req:'e1', e:()=>{ G.pb.extraTime+=30; G.pb.noRetro=(G.pb.noRetro||0)+0.05; } },
    { id:'e3', n:'永恒战士',   d:'战斗时间+60秒',               c:12000, req:'e2', e:()=>{ G.pb.extraTime+=60; } },
    { id:'e4', n:'不死意志',   d:'失败不退关概率+20%',          c:40000, req:'e3', e:()=>{ G.pb.noRetro=(G.pb.noRetro||0)+0.20; } },
    { id:'e5', n:'时间主宰',   d:'战斗时间+120秒',              c:120000,req:'e4', e:()=>{ G.pb.extraTime+=120; } },
    { id:'e6', n:'永生',       d:'失败时50%概率完全免除',        c:400000,req:'e5', e:()=>{ G.pb.noRetro=0.50; } },
  ]},
];
PASSIVES.push(...PASSIVES_EX);

// ── AWAKENING EXPANDED (5 total) ──────────────────────
const AWAKENING_REQS_EX = [
  { level:100, stage:200, gold:500000,   desc:'第四次觉醒 — 天神降临' },
  { level:100, stage:500, gold:2000000,  desc:'第五次觉醒 — 混沌之源' },
];
AWAKENING_REQS.push(...AWAKENING_REQS_EX);

const AWAKENING_BONUSES_EX = [
  { atkMult:5.0,  spdBonus:3.0, critBonus:30, desc:'ATK×5 · SPD+3.0 · Crit+30%' },
  { atkMult:10.0, spdBonus:5.0, critBonus:50, unlockMythic:true, desc:'ATK×10 · SPD+5.0 · Crit+50% · 解锁所有内容' },
];
AWAKENING_BONUSES.push(...AWAKENING_BONUSES_EX);

// ── WEEKLY BOSS FIGHT CONFIG ───────────────────────────
const WEEKLY_BOSS_STAGES = [
  { minStage:10,  name:'骷髅王',    icon:'💀', hpMult:20,  reward:{ crystals:100, boss_core:10, gold:5000 } },
  { minStage:50,  name:'混沌巨人',  icon:'🗿', hpMult:50,  reward:{ crystals:300, boss_core:30, mythic_shard:1, gold:20000 } },
  { minStage:100, name:'虚空龙',    icon:'🐉', hpMult:100, reward:{ crystals:500, boss_core:50, mythic_shard:3, gold:50000 } },
  { minStage:300, name:'末日天使',  icon:'👼', hpMult:300, reward:{ crystals:1000,boss_core:100,mythic_shard:10,gold:200000 } },
  { minStage:500, name:'混沌之神',  icon:'🔱', hpMult:1000,reward:{ crystals:2000,boss_core:200,mythic_shard:30,gold:1000000 } },
];

// ── MATERIAL SINKS (things to spend mats on besides gear) ──
const MAT_SINKS = [
  { id:'atk_potion',  n:'ATK精华',  icon:'⚗', desc:'消耗20x攻击石 → 永久ATK+100',
    cost:{ atk_stone:20 }, apply:()=>{ G.baseAtk+=100; log('⚗ ATK精华 ATK+100','ev'); } },
  { id:'spd_potion',  n:'SPD精华',  icon:'💨', desc:'消耗20x速度石 → 永久SPD+0.1',
    cost:{ spd_stone:20 }, apply:()=>{ G.atkSpd=Math.min(G.atkSpd+0.1,spdCap()); log('💨 SPD精华 SPD+0.1','ev'); } },
  { id:'crit_potion', n:'暴击精华', icon:'🎯', desc:'消耗20x暴击石 → 永久Crit+3%',
    cost:{ crit_stone:20 }, apply:()=>{ G.critChance+=3; log('🎯 暴击精华 Crit+3%','ev'); } },
  { id:'cdmg_potion', n:'爆破精华', icon:'💥', desc:'消耗20x韧性石 → 永久CritDmg+20%',
    cost:{ def_stone:20 }, apply:()=>{ G.critDmg+=20; log('💥 爆破精华 CritDmg+20%','ev'); } },
  { id:'boss_atk',    n:'Boss之力', icon:'👊', desc:'消耗5x Boss核心 → ATK+500',
    cost:{ boss_core:5 }, apply:()=>{ G.baseAtk+=500; log('👊 Boss之力 ATK+500','ev'); } },
  { id:'boss_all',    n:'Boss觉悟', icon:'🌟', desc:'消耗20x Boss核心 → 全属性+5%',
    cost:{ boss_core:20 }, apply:()=>{ G.bonusAtk+=Math.floor(totalAtk()*0.05); G.atkSpd=Math.min(G.atkSpd+0.05,spdCap()); G.critChance+=1; log('🌟 Boss觉悟 全属性+5%','ev'); } },
  { id:'mythic_boost',n:'神话强化', icon:'🌠', desc:'消耗3x神话碎片 → ATK×1.1',
    cost:{ mythic_shard:3 }, apply:()=>{ G.baseAtk=Math.floor(G.baseAtk*1.1); log('🌠 神话强化 ATK×1.1','ev'); } },
  { id:'time_crystal',n:'时间水晶', icon:'⏳', desc:'消耗30x各材料 → 战斗时间+30s',
    cost:{ atk_stone:30, spd_stone:30, crit_stone:30, def_stone:30 },
    apply:()=>{ G.pb.extraTime=(G.pb.extraTime||0)+30; log('⏳ 时间水晶 时间+30s','ev'); } },
];

// ── BOSS PHASES (3-phase system) ──────────────────────
const BOSS_PHASE_CONFIG = [
  { at:0.75, name:'激怒', atkMult:1.5, regenPct:0.01, msg:'👑 Boss激怒！ATK×1.5，开始恢复HP' },
  { at:0.50, name:'狂暴', atkMult:2.0, regenPct:0.02, shieldPct:0.1, msg:'👑 Boss狂暴！ATK×2，护盾激活' },
  { at:0.25, name:'绝境', atkMult:3.0, regenPct:0.03, timeCut:0.5, msg:'👑 最终形态！ATK×3，时间减半' },
];

// ── STAGE SCALING (high stage balance) ────────────────
function stageEnemyHP(stage) {
  // Soft cap zones to prevent impossible stages
  if(stage <= 100)  return Math.floor(50 * Math.pow(1.08, stage-1));
  if(stage <= 500)  return Math.floor(50 * Math.pow(1.08, 100) * Math.pow(1.05, stage-100));
  if(stage <= 1000) return Math.floor(50 * Math.pow(1.08, 100) * Math.pow(1.05, 400) * Math.pow(1.03, stage-500));
  return Math.floor(50 * Math.pow(1.08, 100) * Math.pow(1.05, 400) * Math.pow(1.03, 500) * Math.pow(1.02, stage-1000));
}

// ── LEADERBOARD STUBS ────────────────────────────────
const LEADERBOARD_CATEGORIES = [
  { id:'best_stage',  name:'最高阶段',  icon:'⚔', getValue:()=>G.best },
  { id:'total_dmg',   name:'总伤害',    icon:'💥', getValue:()=>G.totalDmg },
  { id:'boss_kills',  name:'Boss击杀',  icon:'💀', getValue:()=>G.bossKills },
  { id:'power',       name:'战力',      icon:'⭐', getValue:()=>typeof powerScore==='function'?powerScore():0 },
];

// Personal best records
function updatePersonalBests() {
  if(!G.personalBests) G.personalBests={};
  LEADERBOARD_CATEGORIES.forEach(c=>{
    const v=c.getValue();
    if(v>(G.personalBests[c.id]||0)) G.personalBests[c.id]=v;
  });
}


// ═══════════════════════════════════════════════════════
//  TEAM SYSTEM (Phase D) — 2-3 units auto-battle
// ═══════════════════════════════════════════════════════

// ── UNIT ROLES ────────────────────────────────────────
const UNIT_ROLES = [
  {
    id:'warrior',  name:'战士',   icon:'⚔',  color:'#d4522a',
    desc:'高ATK，低SPD，每5击爆发攻击',
    baseAtk:1.5, baseSpd:0.8, baseCrit:1.0, baseCdmg:1.0,
    passive:'每5击造成300%伤害',
    spec_bonus:{ atk:'Train ATK×2', crit:'CritDmg+50%', spd:'SPD上限+2' }
  },
  {
    id:'assassin', name:'刺客',   icon:'🗡',  color:'#c9a84c',
    desc:'高Crit，高SPD，连击叠加伤害',
    baseAtk:0.9, baseSpd:1.3, baseCrit:2.0, baseCdmg:1.5,
    passive:'每连击+5%伤害（无上限）',
    spec_bonus:{ atk:'ATK+30%', crit:'CritDmg×2', spd:'每击SPD+0.01' }
  },
  {
    id:'mage',     name:'法师',   icon:'🔮',  color:'#8b5cf6',
    desc:'真伤，无视敌人HP比例伤害',
    baseAtk:0.7, baseSpd:0.7, baseCrit:1.2, baseCdmg:2.0,
    passive:'每击造成敌人最大HP 3%真伤',
    spec_bonus:{ atk:'真伤+2%', crit:'真伤触发率+50%', spd:'SPD每1.0=真伤+0.5%' }
  },
  {
    id:'tank',     name:'坦克',   icon:'🛡',  color:'#4a9fd4',
    desc:'为队友提供ATK加成，自身耐久',
    baseAtk:0.5, baseSpd:0.6, baseCrit:0.5, baseCdmg:1.0,
    passive:'每次失败不退关，为队友ATK+10%',
    spec_bonus:{ atk:'队友ATK+30%', crit:'队友Crit+15%', spd:'不退关概率+30%' }
  },
];

// ── UNIT TEMPLATE ─────────────────────────────────────
function makeUnit(roleId, name) {
  const role = UNIT_ROLES.find(r=>r.id===roleId) || UNIT_ROLES[0];
  return {
    id: roleId+'_'+Date.now(),
    roleId,
    name: name || role.name,
    level: 1,
    unlocked: roleId==='warrior', // only warrior starts unlocked
    // Base stats (multiplied by role multipliers)
    baseAtk: Math.floor(10 * role.baseAtk),
    atkSpd:  +(1.0 * role.baseSpd).toFixed(2),
    critChance: 5 * role.baseCrit,
    critDmg: 200 * role.baseCdmg,
    // Gear — each unit has own 4 slots
    gear: null, // initialized separately
    // Skills
    skills: [],
    spec: null,
    // Combat state
    combo: 0,
    hitCount: 0,
  };
}

// ── TEAM SYNERGIES (Phase F) ───────────────────────────
const TEAM_SYNERGIES = [
  {
    id:'double_warrior', name:'钢铁意志',   icon:'⚔⚔',
    desc:'2×战士：全队ATK+40%',
    req:(team)=>team.filter(u=>u.roleId==='warrior').length>=2,
    apply:()=>{ G.teamAtkMult=(G.teamAtkMult||1)*1.40; }
  },
  {
    id:'warrior_assassin', name:'斩杀协定', icon:'⚔🗡',
    desc:'战士+刺客：暴击伤害+100%',
    req:(team)=>team.some(u=>u.roleId==='warrior')&&team.some(u=>u.roleId==='assassin'),
    apply:()=>{ G.teamCdmgBonus=(G.teamCdmgBonus||0)+100; }
  },
  {
    id:'mage_support', name:'魔法护盾',    icon:'🔮🛡',
    desc:'法师+坦克：真伤+3%，不退关+50%',
    req:(team)=>team.some(u=>u.roleId==='mage')&&team.some(u=>u.roleId==='tank'),
    apply:()=>{ G.teamTruePct=(G.teamTruePct||0)+0.03; G.pb.noRetro=(G.pb.noRetro||0)+0.50; }
  },
  {
    id:'full_team', name:'无敌军团',       icon:'⚔🗡🔮🛡',
    desc:'4种职业全齐：所有属性×2',
    req:(team)=>['warrior','assassin','mage','tank'].every(r=>team.some(u=>u.roleId===r)),
    apply:()=>{ G.teamAllMult=(G.teamAllMult||1)*2.0; }
  },
  {
    id:'triple_dps', name:'三重打击',      icon:'⚔⚔⚔',
    desc:'3个DPS角色：每击有20%额外一击',
    req:(team)=>team.filter(u=>['warrior','assassin','mage'].includes(u.roleId)).length>=3,
    apply:()=>{ G.teamDoubleHit=(G.teamDoubleHit||0)+0.20; }
  },
];

// ── UNIT UNLOCK REQUIREMENTS ──────────────────────────
const UNIT_UNLOCK_REQS = {
  assassin: { stage:50,  gold:10000,  desc:'到达Stage 50 + 10000金' },
  mage:     { stage:100, gold:50000,  desc:'到达Stage 100 + 50000金' },
  tank:     { stage:200, gold:200000, desc:'到达Stage 200 + 200000金' },
};

// ═══════════════════════════════════════════════════════
//  FINAL CONTENT EXPANSION
// ═══════════════════════════════════════════════════════

// ── 20 MORE SKILLS (total 50) ─────────────────────────
const SKILLS_EX = [
  // Unlocked every 10 levels from 10-100 (we already have 30)
  // These are UNIT-specific skills (apply to the active unit)
  {
    id:'unit_sync',    type:'special', icon:'🔗', name:'单位同步', unlockLv:10,
    desc:'所有单位同时攻击一次（每30秒触发）',
    state:{ timer:0 },
    passive:true
  },
  {
    id:'formation',    type:'buff',    icon:'🛡', name:'阵型', unlockLv:20,
    desc:'队伍单位越多，全队ATK越高（每单位+15%）',
    atkBonus:()=>((G.units||[]).filter(u=>u.unlocked).length-1)*0.15
  },
  {
    id:'chain_kill',   type:'atk',    icon:'⛓', name:'连杀', unlockLv:30,
    desc:'每次胜利+1%ATK（可无限叠加，重置时保留）',
    onWin:()=>{ G.chainKillStacks=(G.chainKillStacks||0)+1; G.skillBonusAtk=(G.skillBonusAtk||0)+Math.floor(totalAtk()*0.01); }
  },
  {
    id:'berserker_lv', type:'buff',   icon:'🩸', name:'狂战升华', unlockLv:40,
    desc:'每次升级ATK额外+5%',
    onLevelUp:()=>{ G.skillBonusAtk=(G.skillBonusAtk||0)+Math.floor(totalAtk()*0.05); }
  },
  {
    id:'void_strike',  type:'atk',   icon:'🌑', name:'虚空冲击', unlockLv:50,
    desc:'无视所有防御，造成纯粹伤害（忽略boss护盾）',
    truePct:0.05, ignoreshield:true
  },
  {
    id:'mana_burst',   type:'atk',   icon:'💜', name:'魔力爆发', unlockLv:60,
    desc:'每场战斗开始后30秒，造成ATK×10伤害',
    state:{ fired:false },
    onFightStart:()=>{ SKILLS.find(s=>s.id==='mana_burst').state.fired=false; },
    passive:true
  },
  {
    id:'last_stand',   type:'buff',  icon:'🏴', name:'最后一击', unlockLv:70,
    desc:'时间剩余10秒以内，ATK×5',
    atkBonus:()=>(G.timeLimit-G.timeEl<=10&&G.timeEl>0)?4:0
  },
  {
    id:'infinity',     type:'special',icon:'♾', name:'无限', unlockLv:80,
    desc:'ATK上限移除（无任何数值上限）',
    passive:true
  },
  {
    id:'god_speed',    type:'buff',  icon:'⚡', name:'神速', unlockLv:90,
    desc:'SPD永久×1.5（立即生效）',
    passive:true
  },
  {
    id:'omega',        type:'special',icon:'Ω', name:'Ω终焉', unlockLv:100,
    desc:'所有技能效果×2（包括自身）',
    passive:true
  },
  // Bonus skills (beyond level 100 - from achievements)
  {
    id:'prestige_power',type:'buff', icon:'🔱', name:'转生之力', unlockLv:999,
    desc:'每次转生永久+10%ATK（通过成就解锁）',
    atkBonus:()=>(G.prestigeCount||0)*0.10
  },
  {
    id:'rune_mastery', type:'buff',  icon:'✨', name:'符文精通', unlockLv:999,
    desc:'每个装备符文效果×2（通过符文系统解锁）',
    passive:true
  },
  {
    id:'team_power',   type:'buff',  icon:'👥', name:'队伍之力', unlockLv:999,
    desc:'每个解锁角色，主角ATK+20%（通过队伍解锁）',
    atkBonus:()=>((G.units||[]).filter(u=>u.unlocked).length-1)*0.20
  },
  {
    id:'zone_master',  type:'buff',  icon:'🗺', name:'区域精通', unlockLv:999,
    desc:'进入越深的区域，ATK倍率越高',
    atkBonus:()=>{
      const zone=typeof getZone==='function'?getZone(G.stage):{enemyMult:1};
      return (zone.enemyMult-1)*0.5;
    }
  },
  {
    id:'eternal_combo', type:'atk', icon:'🔥', name:'永恒连击', unlockLv:999,
    desc:'最高连击记录永久转化为ATK加成',
    atkBonus:()=>G.bestCombo*0.01
  },
];
SKILLS.push(...SKILLS_EX);

// ── EXTENDED SHOP (phase E monetization stubs) ────────
const SHOP_MONETIZATION = [
  { id:'mon_crystal_small', n:'传说水晶×100', d:'100x祈愿货币（高级）', icon:'💠', c:()=>50000, b:()=>{ earnGachaCrystals(100); } },
  { id:'mon_crystal_big',   n:'传说水晶×500', d:'500x祈愿货币（豪华）', icon:'💠', c:()=>200000,b:()=>{ earnGachaCrystals(500); } },
  { id:'mon_rune_chest',    n:'符文宝箱',     d:'随机T3-T4符文×3',      icon:'✨', c:()=>30000, b:()=>{
    const t4=RUNES.filter(r=>r.tier>=3);
    for(let i=0;i<3;i++){
      const r=t4[~~(Math.random()*t4.length)];
      if(r){ if(!G.runeInventory)G.runeInventory=[]; G.runeInventory.push(r.id); log('✨ 符文宝箱：'+r.name,'loot'); }
    }
  }},
  { id:'mon_unit_unlock',   n:'角色解锁卷',   d:'直接解锁任意一个角色',   icon:'👥', c:()=>100000,b:()=>{
    const locked=typeof UNIT_ROLES!=='undefined'?UNIT_ROLES.filter(r=>r.id!=='warrior'&&!(G.units||[]).some(u=>u.roleId===r.id)):[];
    if(!locked.length){ notif('所有角色已解锁'); return; }
    const role=locked[0];
    const unit=makeUnit(role.id); unit.gear=makeInitialGear(); unit.unlocked=true;
    if(!G.units)G.units=[]; G.units.push(unit);
    calcTeamSynergies(); updateStats();
    log('👥 解锁角色：'+unit.name,'boss'); notif('👥 '+unit.name+' 已解锁！','#c9a84c');
    if(typeof renderTeam==='function') renderTeam();
  }},
  { id:'mon_prestige_boost',n:'转生加速',     d:'下次转生倍率额外×2',    icon:'🔱', c:()=>500000,b:()=>{ G.prestigeMult=(G.prestigeMult||1)*2; log('🔱 下次转生倍率×2','ev'); } },
  { id:'mon_mythic_shard5', n:'神话碎片×5',   d:'5x神话碎片',            icon:'🌠', c:()=>80000, b:()=>{ G.upgMats.mythic_shard=(G.upgMats.mythic_shard||0)+5; } },
];
SHOP_CATALOG.push(...SHOP_MONETIZATION);

// ── MORE ENEMY TYPES ───────────────────────────────────
const ENEMY_TYPES_EX = [
  { id:'ancient',  name:'远古怪',  hpMult:4,   gMult:3,   dropMult:3,  special:'phase2',  shieldPct:0.15 },
  { id:'cursed',   name:'诅咒怪',  hpMult:2,   gMult:2,   dropMult:1.5,special:'regen',   regenPct:0.03 },
  { id:'berserker',name:'狂战士',  hpMult:1.5, gMult:2,   dropMult:2,  special:'berserk', atkMult:3 },
  { id:'shadow',   name:'暗影怪',  hpMult:3,   gMult:2.5, dropMult:2.5,special:'dodge',   dodgeChance:0.2 },
];
// Extend getEnemyType to include new types
const _origGetEnemyType = getEnemyType;

// ── EXTENDED RUNE COMBINATIONS ─────────────────────────
const RUNE_SETS = [
  {
    id:'fury_set', name:'狂怒套装', icon:'🔥',
    runes:['r_atk3','r_crit2','r_combo'],
    bonus:{ desc:'攻击力×2，Combo无上限', apply:()=>{ G.baseAtk*=2; } }
  },
  {
    id:'void_set',  name:'虚空套装', icon:'🌑',
    runes:['r_true','r_spd3','r_time'],
    bonus:{ desc:'时间+1分钟，真伤+5%', apply:()=>{ G.pb.extraTime+=60; G.runeTruePct+=0.05; } }
  },
  {
    id:'myth_set',  name:'神话套装', icon:'🌠',
    runes:['r_mythic','r_prestige','r_atk4'],
    bonus:{ desc:'转生倍率×3，ATK×5', apply:()=>{ G.prestigeMult*=3; G.baseAtk=Math.floor(G.baseAtk*5); } }
  },
];

// ── EXTENDED PASSIVE NODES ─────────────────────────────
const PASSIVE_EX2_NODES = {
  power:  [
    { id:'p5', n:'战神之力',   d:'ATK+1000，每次Train额外+20',  c:2000000, req:'p4', e:()=>{ G.baseAtk+=1000; G.pb.trainFlat+=20; } },
    { id:'p6', n:'混沌之力',   d:'ATK×2，解锁神话装备路线',     c:10000000,req:'p5', e:()=>{ G.baseAtk*=2; } },
  ],
  speed:  [
    { id:'s5', n:'光速',       d:'SPD上限+3.0',                  c:2000000, req:'s4', e:()=>{ G.pb.spdCap+=3.0; } },
    { id:'s6', n:'时间停止',   d:'战斗时间+300秒',               c:10000000,req:'s5', e:()=>{ G.pb.extraTime+=300; } },
  ],
  luck:   [
    { id:'l5', n:'命运之轮',   d:'所有掉落率×3',                 c:3000000, req:'l4', e:()=>{ G.pb.dropRate+=1.0; G.pb.legMult*=3; } },
    { id:'l6', n:'神明之选',   d:'每胜利5%获得传说+1%获得神话',  c:15000000,req:'l5', e:()=>{ G.pb.godBless=0.05; G.pb.mythicChance=0.01; } },
  ],
  mastery:[
    { id:'m5', n:'神话大师',   d:'所有装备词条效果×2',           c:5000000, req:'m4', e:()=>{ G.pb.affixMult=2; } },
    { id:'m6', n:'万物精通',   d:'所有系统效果×1.5',            c:20000000,req:'m5', e:()=>{ G.pb.allMult=1.5; } },
  ],
};
// Merge into existing PASSIVES
PASSIVES.forEach(track=>{
  const ex=PASSIVE_EX2_NODES[track.id];
  if(ex) track.nodes.push(...ex);
});
