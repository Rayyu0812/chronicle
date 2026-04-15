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
