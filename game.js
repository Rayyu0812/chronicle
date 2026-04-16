// ═══════════════════════════════════════════════════════════
//  game.js  —  CHRONICLE · Core Game Logic
// ═══════════════════════════════════════════════════════════
'use strict';

// ── GAME STATE ───────────────────────────────────────────────
let G = newGame();
let T = TALENTS[0]; // active talent

function newGame() {
  return {
    // Core
    gold:0, level:1, stage:1, exp:0, expNeed:EXP_TABLE[1], best:1,
    baseAtk:10, atkSpd:1.0, critChance:5, critDmg:200,
    eqAtk:0, eqSpd:0, eqCrit:0, eqCritDmg:0,
    // Talent bonuses
    tAtk:0, tN:0, tCrit:0, tSpd:0, tCritPen:0,
    // Misc bonuses
    bonusAtk:0, skillBonusAtk:0,
    setBonusAtk:0, setBonusCrit:0, setBonusSpd:0, setBonusAll:0, setEffects:[],
    // Talent
    talentId:'battle',
    rerollN:0, rerollCost:1000, rerollHist:[],
    // NEW GEAR SYSTEM — 4 fixed pieces, upgraded via materials
    gear: null, // initialized in initGame
    upgMats:{ atk_stone:0, spd_stone:0, crit_stone:0, def_stone:0, boss_core:0, mythic_shard:0 },
    // Legacy (kept for compatibility)
    equipped:{ weapon:null, head:null, body:null, legs:null },
    mats:{ common:0, rare:0, epic:0 },
    currencies:{ reforge:0, essence:0, catalyst:0 },
    gems:[], totalGems:0, totalReforges:0,
    // Progress
    trainN:0, fights:0, wins:0, bossKills:0,
    legCount:0, mythCount:0, awakenings:0,
    totalDmg:0, totalDmgFight:0,
    // Live
    combo:0, bestCombo:0, streak:0, bestStreak:0,
    dpsAccum:0, dpsTimer:0, currentDPS:0, lastDmg:0,
    isBoss:false, timeLimit:60, enemyHP:0, enemyMax:0, timeEl:0,
    enemyType:'normal', enemyShield:0, enemyPhased:false,
    // Skills
    skills:[],
    // Team system (Phase D)
    units:[], // initialized in initGame
    activeUnit:0, // which unit is currently attacking
    teamAtkMult:1, teamCdmgBonus:0, teamTruePct:0, teamAllMult:1, teamDoubleHit:0,
    unit2Unlocked:false,
    // Passives
    done:[],
    pb:{ trainAtkMult:0, trainFlat:0, demolish:0, spdCap:0, doubleHit:0,
         extraTime:0, goldMult:0, dropRate:0, legMult:1, godBless:0,
         extraAffix:0, gemBonus:1, setReduce:0, mythicChance:0 },
    // Achievements & tasks
    achs:[], spec:null, milestonesDone:[],
    awakeningBonuses:[],
    dailyTasks:[], weeklyTasks:[], dailyProgress:{}, weeklyProgress:{},
    dailyStreak:0, lastDaily:'', lastWeekly:'',
    lastSeen: Date.now(),
    crits:0, goldEarned:0, itemsGot:0,
    speed:1, autoTrain:false, autoRest:false,
    _timerGen:0,
    // Gacha (Phase E)
    gachaCrystals:0, gachaPulls:0, gachaPity:0,
    // Rune system
    runesEquipped:[], runeAtk:0, runeSpd:0, runeCrit:0, runeCdmg:0,
    runeGoldMult:0, runeTruePct:0, runeComboBonus:false,
    runeTime:0, runeMythicMult:0, runePrestigeMult:1,
    // Title system
    titlesEarned:[], activeTitle:null,
    // Weekly boss
    weeklyBossKills:0, lastWeeklyBoss:'',
    // Stage modifiers
    currentMod:null, stageModCount:0,
    // Gear evolution
    gearEvolutions:0,
    // Auto-upgrade
    autoUpgradeMode:'off', autoUpgradeSlot:'weapon', autoUpgradeCount:0,
    // Combo skill
    comboProcDmgMult:1,
    // Dungeons/challenges totals
    totalDungeons:0, totalChallenges:0,
    // Prestige (転生)
    prestigeCount:0, prestigeMult:1,
    // Challenge + Dungeon tracking
    eliteKills:0, upgradeCount:0,
    dungeonsDone:{},
    challengesBest:{},
    // Zone tracking
    currentZone:'荒野平原',
  };
}

// ── COMPUTED STATS ───────────────────────────────────────────
function spdCap() {
  let cap = 5.0 + (G.spec==='spd'?3.0:0) + (G.pb.spdCap||0);
  // Transcend skill
  if(hasSkill('transcend')) cap *= 1.5;
  return cap;
}

function totalBaseAtk() { return G.baseAtk; }

function totalAtk() {
  let a = G.baseAtk + G.eqAtk + Math.floor(G.tAtk) + G.bonusAtk + G.setBonusAtk + (G.skillBonusAtk||0);
  // Passive: gold body talent
  if(T.id==='gold_body') a += Math.floor(G.gold/1000);
  // Divine judge talent
  if(T.id==='divine') a = G.isBoss ? Math.floor(a*3) : Math.floor(a*0.8);
  // Set bonus: all stats
  if(G.setBonusAll>0) a = Math.floor(a*(1+G.setBonusAll));
  // Storm set 4pc: SPD-based ATK bonus
  if(setCount('storm')>=4) a = Math.floor(a*(1+Math.floor(totalSpd())*0.10));
  // Awakening multipliers
  for(const b of (G.awakeningBonuses||[])) a = Math.floor(a*b.atkMult);
  // All skill ATK bonuses (auto-collect from SKILLS array)
  SKILLS.filter(s=>G.skills.includes(s.id)&&s.atkBonus).forEach(sk=>{
    try{ const b=sk.atkBonus(); if(b>0) a=Math.floor(a*(1+b)); }catch(e){}
  });
  // Skill: frenzy extra dmg bonus handled in calcDmg
  // Overload talent
  if(T.id==='overload') {} // SPD bonus handled in totalSpd
  // Berserk rush active
  if(G._berserkActive) a=Math.floor(a*2);
  // Resonance doubles talent atk bonus
  if(hasSkill('resonance')) a += Math.floor(G.tAtk); // double tAtk
  // Rune bonuses
  a += (G.runeAtk||0);
  if(G.runeMythicMult) a=Math.floor(a*(1+G.runeMythicMult));
  if(G.runeComboBonus) a=Math.floor(a*(1+Math.min(G.combo,200)*0.03));
  // Stage modifier all-stat boost
  if(G.currentMod&&G.currentMod.allMult) a=Math.floor(a*G.currentMod.allMult);
  // Prestige multiplier
  if(G.prestigeMult&&G.prestigeMult>1) a=Math.floor(a*G.prestigeMult);
  // Prestige rune bonus
  if(G.runePrestigeMult&&G.runePrestigeMult>1&&G.prestigeCount>0) a=Math.floor(a*G.runePrestigeMult);
  // Team synergy bonuses
  if(G.teamAtkMult&&G.teamAtkMult>1) a=Math.floor(a*G.teamAtkMult);
  if(G.teamAllMult&&G.teamAllMult>1) a=Math.floor(a*G.teamAllMult);
  return Math.max(1, Math.floor(a));
}

function totalSpd() {
  let s = G.atkSpd + G.eqSpd + (G.tSpd||0) + G.setBonusSpd;
  // Overload talent
  if(T.id==='overload') s += Math.floor(G.baseAtk/1000)*0.1;
  // Time acc skill
  if(hasSkill('time_acc')){ const sk=SKILLS.find(s=>s.id==='time_acc'); s+=(sk.spdBonus?sk.spdBonus():0); }
  // Awakening SPD bonuses
  for(const b of (G.awakeningBonuses||[])) s+=b.spdBonus||0;
  s += (G.runeSpd||0);
  return Math.min(+(s.toFixed(2)), spdCap());
}

function totalCrit() {
  let c = G.critChance + G.eqCrit + (G.tCrit||0) + G.setBonusCrit - (G.tCritPen||0);
  for(const b of (G.awakeningBonuses||[])) c+=b.critBonus||0;
  c += (G.runeCrit||0);
  return Math.max(0, c);
}

function totalCritDmg() {
  let c = G.critDmg + G.eqCritDmg + (G.spec==='crit'?50:0);
  // Shadow set 4pc
  if(setCount('shadow')>=4) c+=100;
  c += (G.runeCdmg||0);
  return c;
}

function calcTimeLimit() {
  let t = 60 + (G.pb.extraTime||0);
  // Affix time bonus
  for(const it of Object.values(G.equipped)){
    if(!it) continue;
    for(const aid of (it.affixes||[])){
      const a=getAffix(aid); if(a&&a.time) t+=a.time;
    }
    // Stat affixes time
    for(const sid of (it.statAffixes||[])){
      const a=getAffix(sid); if(a&&a.roll){const r=a.roll(1);if(r.time)t+=r.time;}
    }
  }
  if(hasSkill('time_ctrl')) t+=30;
  t += (G.runeTime||0);
  return t;
}

function powerScore() {
  return Math.floor(totalAtk()*10 + totalSpd()*1000 + totalCrit()*500 + totalCritDmg()*100 + G.level*200 + G.stage*50);
}

// ── HELPERS ──────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const hasSkill = id => G.skills.includes(id);
const setCount = id => G.setEffects[SETS.findIndex(s=>s.id===id)] || 0;

function fmt(n) {
  if(n>=1e12) return (n/1e12).toFixed(1)+'T';
  if(n>=1e9)  return (n/1e9).toFixed(1)+'B';
  if(n>=1e6)  return (n/1e6).toFixed(1)+'M';
  if(n>=1e3)  return (n/1e3).toFixed(1)+'K';
  return Math.floor(n)+'';
}

function shuf(a) { return a.sort(()=>Math.random()-.5); }
function rnd(min,max) { return min + Math.random()*(max-min); }

function pop(id) {
  const el=$(id); if(!el) return;
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  setTimeout(()=>el.classList.remove('pop'), 200);
}

function log(txt, type='sys') {
  const b=$('log-body'); if(!b) return;
  const d=document.createElement('div');
  d.className='ll '+(type||'sys');
  d.textContent='›  '+txt;
  b.appendChild(d);
  // Keep only latest 20 entries
  while(b.children.length>20) b.removeChild(b.firstChild);
  b.scrollTop=b.scrollHeight;
}

function notif(txt, color='') {
  const c=$('notifs');
  const d=document.createElement('div');
  d.className='notif';
  if(color) d.style.borderColor=color;
  d.textContent=txt;
  c.appendChild(d);
  setTimeout(()=>{ d.classList.add('out'); setTimeout(()=>d.remove(),300); }, 2800);
}

function shake() {
  const r=$('root'); r.classList.remove('shake'); void r.offsetWidth; r.classList.add('shake');
  setTimeout(()=>r.classList.remove('shake'),300);
}








function spawnDmg(dmg, isCrit, isSpecial) {
  if(G.speed>5) return;
  const l=$('fx');
  const d=document.createElement('div');
  d.className='fdmg '+(isSpecial?'sp':isCrit?'c':'n');
  // Scale crit number size by damage ratio
  if(isCrit){
    const ratio = totalAtk()>0 ? dmg/totalAtk() : 1;
    if(ratio>5)  d.style.fontSize='3rem';
    else if(ratio>2) d.style.fontSize='2.4rem';
  }
  d.textContent=(isCrit?'💥':'')+(isSpecial?'⚡':'')+fmt(dmg);
  d.style.left=Math.floor(15+Math.random()*65)+'%';
  d.style.top=Math.floor(25+Math.random()*30)+'%';
  l.appendChild(d); setTimeout(()=>d.remove(),900);
  // Screen shake on huge crits
  if(isCrit && dmg>totalAtk()*3) shake();
}

function spawnParts(type) {
  const l=$('particles');
  const colors={ legendary:'#c9a84c', mythic:'#fff', epic:'#8b5cf6', boss:'#d4522a' };
  const col=colors[type]||'#fff';
  const n=type==='mythic'?30:type==='legendary'?20:10;
  for(let i=0;i<n;i++){
    const p=document.createElement('div'); p.className='pt';
    const sz=3+Math.random()*6;
    p.style.cssText=`width:${sz}px;height:${sz}px;background:${col};left:${15+Math.random()*65}%;top:${25+Math.random()*40}%;--tx:${-100+Math.random()*200}px;--ty:${-130+Math.random()*70}px;animation-delay:${Math.random()*.35}s;box-shadow:0 0 6px ${col};`;
    l.appendChild(p); setTimeout(()=>p.remove(),1500);
  }
}

// ── SAVE / LOAD ───────────────────────────────────────────────
const SK = 'chronicle_v2';
function saveGame() {
  try {
    G.lastSeen = Date.now();
    localStorage.setItem(SK, JSON.stringify({ ...G, talentId:T.id }));
    const t = new Date().toLocaleTimeString('zh',{hour:'2-digit',minute:'2-digit'});
    $('save-time').textContent = t;
    $('save-dot').style.background = '#60d4a0';
  } catch(e) { $('save-dot').style.background = '#e05050'; }
}
function loadGame() {
  try {
    const raw=localStorage.getItem(SK); if(!raw) return false;
    const d=JSON.parse(raw);
    if(d.pb) Object.assign(G.pb, d.pb);
    Object.assign(G, d);
    T = TALENTS.find(t=>t.id===G.talentId) || TALENTS[0];
    if(!G.gear) G.gear = makeInitialGear();
    if(!G.upgMats) G.upgMats = { atk_stone:0, spd_stone:0, crit_stone:0, def_stone:0, boss_core:0, mythic_shard:0 };
    if(!G.gachaCrystals) G.gachaCrystals=0;
    if(!G.gachaPulls) G.gachaPulls=0;
    if(!G.gachaPity) G.gachaPity=0;
    if(!G.units) G.units=[{ id:'warrior', name:'战士', icon:'⚔', unlocked:true, baseAtk:0, atkSpd:0, critChance:0, critDmg:0, spec:null, gear:null, skills:[] }];
    if(G.unit2Unlocked===undefined) G.unit2Unlocked=false;
    try {
      if(!G.units||!Array.isArray(G.units)||!G.units.length){
        const warrior=makeUnit('warrior','战士'); warrior.gear=makeInitialGear(); warrior.unlocked=true;
        G.units=[warrior];
      }
      // Ensure units have required fields
      G.units.forEach(u=>{
        if(!u.gear) try{ u.gear=makeInitialGear(); }catch(_){}
        if(!u.combo) u.combo=0;
        if(!u.hitCount) u.hitCount=0;
        if(u.unlocked===undefined) u.unlocked=(u.roleId==='warrior');
      });
    } catch(e) { console.warn('unit load error:',e); }
    if(G.activeUnit===undefined) G.activeUnit=0;
    if(!G.teamAtkMult) G.teamAtkMult=1;
    if(!G.teamAllMult) G.teamAllMult=1;
    if(!G.teamCdmgBonus) G.teamCdmgBonus=0;
    if(!G.teamTruePct) G.teamTruePct=0;
    if(!G.teamDoubleHit) G.teamDoubleHit=0;
    calcTeamSynergies();
    if(!G.prestigeCount) G.prestigeCount=0;
    if(!G.prestigeMult) G.prestigeMult=1;
    if(!G.eliteKills) G.eliteKills=0;
    if(!G.upgradeCount) G.upgradeCount=0;
    if(!G.dungeonsDone) G.dungeonsDone={};
    if(!G.challengesBest) G.challengesBest={};
    if(!G.runesEquipped) G.runesEquipped=[];
    if(!G.runeInventory) G.runeInventory=[];
    if(!G.titlesEarned) G.titlesEarned=[];
    if(!G.weeklyBossKills) G.weeklyBossKills=0;
    if(!G.totalDungeons) G.totalDungeons=0;
    if(!G.totalChallenges) G.totalChallenges=0;
    if(!G.gearEvolutions) G.gearEvolutions=0;
    if(!G.autoUpgradeMode) G.autoUpgradeMode='off';
    if(!G.autoUpgradeCount) G.autoUpgradeCount=0;
    if(!G.bossPhasesDone) G.bossPhasesDone=0;
    if(!G.bossAtkMult) G.bossAtkMult=1;
    if(!G.personalBests) G.personalBests={};
    if(!G.weeklyBossKills) G.weeklyBossKills=0;
    if(G.pb.extraTime===undefined) G.pb.extraTime=0;
    if(!G.pb.goldMult) G.pb.goldMult=0;
    if(!G.stageModCount) G.stageModCount=0;
    if(!G.comboProcDmgMult) G.comboProcDmgMult=1;
    // Recompute all gear stats on load
    for(const g of Object.values(G.gear)) recomputeGearStats(g);
    recalcEq();
    // Init set bonuses to 0 if missing
    if(!G.setEffects) G.setEffects=[];
    if(G.setBonusAtk===undefined) G.setBonusAtk=0;
    if(G.setBonusCrit===undefined) G.setBonusCrit=0;
    if(G.setBonusSpd===undefined) G.setBonusSpd=0;
    if(G.setBonusAll===undefined) G.setBonusAll=0;
    processOffline();
    return true;
  } catch(e) { return false; }
}
function manualSave() { saveGame(); log('💾 已保存','sys'); }
setInterval(saveGame, 30000);

function checkRuneSets() {
  if(typeof RUNE_SETS==='undefined'||!G.runesEquipped) return;
  RUNE_SETS.forEach(set=>{
    const hasAll=set.runes.every(r=>G.runesEquipped.includes(r));
    if(hasAll&&!G.runeSetsDone?.includes(set.id)){
      if(!G.runeSetsDone) G.runeSetsDone=[];
      G.runeSetsDone.push(set.id);
      set.bonus.apply();
      log('✨ 符文套装激活：'+set.icon+' '+set.name+' — '+set.bonus.desc,'boss');
      notif('✨ '+set.name+' 激活！','#c9a84c');
    }
  });
}
setInterval(runAutoUpgrade, 1000);

function runAutoUpgrade() {
  try {
    if(!G.gear||G.autoUpgradeMode==='off') return;
    const slots = G.autoUpgradeMode==='slot'?[G.autoUpgradeSlot]:SLOTS;
    for(const slot of slots){
      const g=G.gear[slot]; if(!g||!g.pathId) continue;
      const paths=GEAR_PATHS[slot];
      const path=paths&&paths.find(p=>p.id===g.pathId); if(!path) continue;
      const lv=g.pathLv||0;
      if(lv>=path.levels.length) continue;
      const cost=path.levels[lv].cost;
      const have=G.upgMats[path.mat]||0;
      if(G.autoUpgradeMode==='balanced'){
        const minLv=Math.min(...SLOTS.map(s=>G.gear[s]?G.gear[s].pathLv||0:0));
        if((g.pathLv||0)>minLv+2) continue;
      }
      if(have>=cost){
        upgradeGear(slot,'path');
        G.autoUpgradeCount=(G.autoUpgradeCount||0)+1;
        break;
      }
    }
  } catch(e) {}
}

// ── OFFLINE GAINS ─────────────────────────────────────────────

// ══════════════════════════════════════════════════
//  DUNGEON SYSTEM
// ══════════════════════════════════════════════════
let dungeonRunning = false;
let dungeonStage = 0;
let dungeonData = null;

function startDungeon(dungeonId) {
  const d = DUNGEONS.find(x=>x.id===dungeonId);
  if(!d){ notif('副本不存在'); return; }
  if(G.stage < d.unlockStage){ notif('需要Stage '+d.unlockStage); return; }
  const today = new Date().toDateString();
  if((G.dungeonsDone[dungeonId+'_'+today])){ notif('今日已完成该副本，明天再来'); return; }
  dungeonRunning = true;
  dungeonStage = 0;
  dungeonData = d;
  stopTimers();
  log('▶ 进入副本：'+d.icon+' '+d.name, 'boss');
  runDungeonStage();
}

function runDungeonStage() {
  if(!dungeonRunning || !dungeonData) return;
  if(dungeonStage >= dungeonData.stages) {
    // Dungeon complete!
    dungeonRunning = false;
    const today = new Date().toDateString();
    G.dungeonsDone[dungeonData.id+'_'+today] = true;
    G.totalDungeons=(G.totalDungeons||0)+1;
    // Give rewards
    const mat = dungeonData.matReward;
    const amt = dungeonData.matAmt;
    G.upgMats[mat] = (G.upgMats[mat]||0) + amt;
    earnGachaCrystals(dungeonData.crystalReward);
    log('✅ 副本完成！'+UPGRADE_MATS[mat].icon+' '+UPGRADE_MATS[mat].name+'×'+amt+' 💠×'+dungeonData.crystalReward, 'boss');
    notif('✅ 副本完成！获得 '+UPGRADE_MATS[mat].name+'×'+amt, '#c9a84c');
    updateStats();
    restartCombat();
    return;
  }
  dungeonStage++;
  const enemyHp = Math.floor(30 * Math.pow(1.15, G.stage-1) * dungeonStage * 2);
  const timeLimit = 30;
  log('⚔ 副本关卡 '+dungeonStage+'/'+dungeonData.stages+' HP:'+fmt(enemyHp), 'ev');
  // Simple auto-fight for dungeon
  let hp = enemyHp;
  let t = 0;
  const interval = setInterval(()=>{
    if(!dungeonRunning){ clearInterval(interval); return; }
    const dmg = Math.floor(totalAtk() * (0.9+Math.random()*.2) * (Math.random()*100<totalCrit()?totalCritDmg()/100:1));
    hp -= dmg; t++;
    if(hp <= 0 || t >= 60) {
      clearInterval(interval);
      if(hp > 0) {
        // Failed
        dungeonRunning = false;
        dungeonData = null;
        log('❌ 副本失败 关卡'+dungeonStage, 'lose');
        notif('副本失败');
        restartCombat();
      } else {
        log('✓ 副本关卡'+dungeonStage+' 完成', 'win');
        setTimeout(runDungeonStage, 300/G.speed);
      }
    }
  }, 500/G.speed);
}

// ══════════════════════════════════════════════════
//  CHALLENGE MODE
// ══════════════════════════════════════════════════
let challengeRunning = false;
let challengeData = null;
let challengeStage = 0;
let challengeInterval = null; // track so we can properly clear it

function startChallenge(challengeId) {
  const c = CHALLENGES.find(x=>x.id===challengeId);
  if(!c){ notif('挑战不存在'); return; }
  if(G.stage < c.unlockStage){ notif('需要Stage '+c.unlockStage); return; }
  challengeRunning = true;
  challengeData = c;
  challengeStage = G.stage;
  log('🏆 开始挑战：'+c.icon+' '+c.name, 'boss');
  notif('挑战开始：'+c.name);
  stopTimers();
  startChallengeRound();
}

function startChallengeRound() {
  if(!challengeRunning || !challengeData) return;
  const c = challengeData;
  const m = c.modifier;
  let timeLimit = m.timeLimit || calcTimeLimit();
  if(m.infinite) timeLimit = 999999;
  const atkMult = m.atkMult || 1;
  const noCrit = m.noCrit || false;
  const fixedSpd = m.fixedSpd || null;
  const atkOverride = Math.floor(totalAtk() * atkMult);
  const spdOverride = fixedSpd || totalSpd();
  const enemyHp = Math.floor(50 * Math.pow(1.08, challengeStage-1));
  let hp = enemyHp;
  let t = 0;
  const atkMs = (1000/spdOverride)/G.speed;
  if(challengeInterval) clearInterval(challengeInterval);
  challengeInterval = setInterval(()=>{
    if(!challengeRunning){ clearInterval(challengeInterval); challengeInterval=null; return; }
    const isCrit = !noCrit && Math.random()*100 < totalCrit();
    let dmg = Math.floor(atkOverride * (isCrit ? totalCritDmg()/100 : 0.9+Math.random()*.2));
    if(m.oneShot){ clearInterval(challengeInterval); challengeInterval=null; if(dmg >= enemyHp){ winChallenge(); } else { loseChallenge(); } return; }
    hp -= dmg; t++;
    spawnDmg(dmg, isCrit, false);
    if(hp <= 0) { clearInterval(challengeInterval); challengeInterval=null; winChallenge(); return; }
    if(t*atkMs/1000 >= timeLimit){ clearInterval(challengeInterval); challengeInterval=null; loseChallenge(); }
  }, atkMs);
}

function winChallenge() {
  const c = challengeData;
  challengeStage++;
  G.totalChallenges=(G.totalChallenges||0)+1;
  const best = G.challengesBest[c.id] || 0;
  if(challengeStage > best) G.challengesBest[c.id] = challengeStage;
  // Reward
  const r = c.reward;
  earnGachaCrystals(r.crystals||0);
  if(r.bossCore) G.upgMats.boss_core = (G.upgMats.boss_core||0) + r.bossCore;
  if(r.mythicShard) G.upgMats.mythic_shard = (G.upgMats.mythic_shard||0) + r.mythicShard;
  log('✅ 挑战Stage '+challengeStage+' 完成！ 💠+'+r.crystals, 'win');
  if(c.modifier.infinite) { setTimeout(startChallengeRound, 200/G.speed); return; }
  // Continue to next stage
  setTimeout(startChallengeRound, 300/G.speed);
}

function loseChallenge() {
  if(challengeInterval){ clearInterval(challengeInterval); challengeInterval=null; }
  challengeRunning = false;
  const c = challengeData;
  if(!c) { restartCombat(); return; }
  log('❌ 挑战结束！最高Stage：'+(G.challengesBest[c.id]||0), 'lose');
  notif('挑战结束 最高：Stage '+(G.challengesBest[c.id]||0));
  challengeData = null;
  restartCombat();
}

function startWeeklyBoss(wb) {
  if(!wb) return;
  stopTimers();
  const bossHP = Math.floor(stageEnemyHP(G.stage)*wb.hpMult);
  let hp = bossHP;
  let phase = 0;
  const phases = [{at:0.66,msg:'⚡ 进入第二形态！'},{at:0.33,msg:'💥 最终形态！速度+1！'}];
  log('━━ 👹 '+wb.icon+' '+wb.name+' HP:'+fmt(bossHP)+' ━━','boss');
  const attackInterval = (1000/totalSpd())/G.speed;
  const bI = setInterval(()=>{
    if(hp<=0){
      clearInterval(bI);
      G.weeklyBossKills=(G.weeklyBossKills||0)+1;
      const r=wb.reward;
      if(r.crystals) earnGachaCrystals(r.crystals);
      if(r.boss_core) G.upgMats.boss_core=(G.upgMats.boss_core||0)+r.boss_core;
      if(r.mythic_shard) G.upgMats.mythic_shard=(G.upgMats.mythic_shard||0)+(r.mythic_shard||0);
      if(r.gold) G.gold+=r.gold;
      log('✅ 周常Boss击杀！💠×'+r.crystals+' 💀×'+(r.boss_core||0)+' 💰×'+fmt(r.gold||0),'boss');
      notif('✅ 周常Boss击杀！','#c9a84c');
      spawnParts('legendary'); shake();
      checkAchs(); updateStats();
      setTimeout(()=>restartCombat(), 1000/G.speed);
      return;
    }
    const{dmg,isCrit}=calcDmg();
    hp=Math.max(0,hp-dmg);
    G.totalDmg+=dmg;
    spawnDmg(dmg,isCrit,false);
    // Phase transitions
    if(phase<phases.length&&hp<=bossHP*(phases[phase].at)){
      log(phases[phase].msg,'boss'); notif(phases[phase].msg); shake();
      phase++;
    }
  }, attackInterval);
  // Time limit
  setTimeout(()=>{
    if(hp>0){
      clearInterval(bI);
      log('❌ 周常Boss挑战失败！','lose');
      notif('周常Boss挑战失败');
      restartCombat();
    }
  }, (calcTimeLimit()+120)*1000/G.speed);
}

function stopChallenge() {
  if(challengeInterval){ clearInterval(challengeInterval); challengeInterval=null; }
  challengeRunning = false;
  challengeData = null;
  dungeonRunning = false;
  restartCombat();
}

// ══════════════════════════════════════════════════
//  OFFLINE INCOME (better version)
// ══════════════════════════════════════════════════
function processOffline() {
  const now = Date.now();
  const elapsed = Math.min((now - (G.lastSeen||now)) / 1000, 3600*12); // max 12 hours
  if(elapsed < 60) return;
  const gains = typeof calcOfflineGains==='function' ? calcOfflineGains(elapsed) : null;
  if(!gains) return;
  G.gold += gains.gold;
  gainExp(gains.exp);
  for(const[k,v] of Object.entries(gains.mats)) {
    G.upgMats[k] = (G.upgMats[k]||0) + v;
  }
  const mins = Math.floor(elapsed/60);
  const hours = Math.floor(mins/60);
  const timeStr = hours>0 ? hours+'小时'+mins%60+'分' : mins+'分钟';
  setTimeout(()=>{
    const matStr = Object.entries(gains.mats)
      .filter(([,v])=>v>0)
      .map(([k,v])=>UPGRADE_MATS[k]?.icon+v)
      .join(' ');
    openModal('💤 离线收益',
      '你离开了 '+timeStr+'\n\n获得：\n💰 '+fmt(gains.gold)+' 金币\n📖 '+fmt(gains.exp)+' EXP\n'+matStr,
      [{label:'好的',cls:'m-ok',cb:closeModal}]);
  }, 1200);
}


// ── DAILY/WEEKLY TASKS ────────────────────────────────────────
function initTasks() {
  const today = new Date().toDateString();
  const week  = getWeekKey();
  if(G.lastDaily !== today) {
    G.lastDaily = today;
    G.dailyTasks = shuf([...DAILY_POOL]).slice(0,3).map(t=>({ ...t, progress:0, done:false }));
    G.dailyProgress = {};
    if(G.lastDaily) G.dailyStreak++;
    log('📅 每日任务已刷新','sys');
  }
  if(G.lastWeekly !== week) {
    G.lastWeekly = week;
    G.weeklyTasks = shuf([...WEEKLY_POOL]).slice(0,2).map(t=>({ ...t, progress:0, done:false }));
    G.weeklyProgress = {};
  }
}
function getWeekKey() {
  const d=new Date(); const day=d.getDay();
  const diff=d.getDate()-day+(day===0?-6:1);
  return new Date(d.setDate(diff)).toDateString();
}
function updateTaskProgress(key, val) {
  // Daily
  for(const t of (G.dailyTasks||[])){
    if(t.done) continue;
    if(t.key===key) {
      t.progress = key==='stage' ? Math.max(t.progress,val) : (t.progress||0)+val;
      if(t.progress>=t.target && !t.done) claimDailyTask(t);
    }
  }
  // Weekly
  for(const t of (G.weeklyTasks||[])){
    if(t.done) continue;
    if(t.key===key) {
      t.progress = key==='stage' ? Math.max(t.progress,val) : (t.progress||0)+val;
      if(t.progress>=t.target && !t.done) claimWeeklyTask(t);
    }
  }
}
function claimDailyTask(t) {
  if(t.done) return; t.done=true;
  G.gold += t.reward.gold;
  G.mats[t.reward.mat] = (G.mats[t.reward.mat]||0) + t.reward.matAmt;
  if(t.reward.gemKey) gainGem(t.reward.gemKey, 'rare');
  notif('📅 日常完成：'+t.n+' +'+fmt(t.reward.gold)+'金');
  log('📅 日常任务完成：'+t.n,'loot');
  updateStats(); if(typeof renderTasks==='function') renderTasks();
}
function claimWeeklyTask(t) {
  if(t.done) return; t.done=true;
  G.gold += t.reward.gold;
  G.mats[t.reward.mat] = (G.mats[t.reward.mat]||0) + t.reward.matAmt;
  if(t.reward.gemKey) gainGem(t.reward.gemKey, 'epic');
  notif('📆 周常完成：'+t.n+' +'+fmt(t.reward.gold)+'金', '#c9a84c');
  log('📆 周常任务完成：'+t.n,'loot');
  updateStats(); if(typeof renderTasks==='function') renderTasks();
}

// ── ITEM GENERATION ───────────────────────────────────────────
function rollRarity(legBonus=0, allowMythic=false) {
  const w = {...RW};
  w.legendary = Math.min(w.legendary*(G.pb.legMult||1) + legBonus*100, 15);
  if(!allowMythic || G.awakenings<3) w.mythic=0;
  const tot=Object.values(w).reduce((a,b)=>a+b,0);
  let r=Math.random()*tot;
  for(const[k,v] of Object.entries(w)){ r-=v; if(r<=0) return k; }
  return 'common';
}

function genItem(stage, forced=null) {
  const slot = SLOTS[~~(Math.random()*4)];
  const allowM = G.awakenings>=3;
  const rar = forced || rollRarity(0, allowM);
  const it = {
    id:++G.itemId, slot, rar,
    name:'', setId:null,
    statAffixes:[], affixes:[],
    gemSlots: GEM_SLOTS[rar] || 0, gems:[],
    gemAtk:0, gemSpd:0, gemCrit:0, gemCdmg:0, gemTrue:0, gemAll:0,
    upg:0,
  };

  // Name
  it.name = itemName(it.slot, it.rar);

  // Stat affixes (prefix = stat bonuses)
  const statPool = AFFIXES.filter(a=>a.type==='prefix'&&a.r.includes(rar));
  const specPool = AFFIXES.filter(a=>a.type==='special'&&a.r.includes(rar));
  const suffPool = AFFIXES.filter(a=>a.type==='suffix'&&a.r.includes(rar));
  const count = AFFIX_COUNT[rar] + (G.pb.extraAffix||0);

  // Always at least 1 stat affix
  const picked = shuf([...statPool]).slice(0, Math.min(count, statPool.length));
  it.statAffixes = picked.map(a=>a.id);

  // Special affixes for epic+
  if(['epic','legendary','mythic'].includes(rar) && specPool.length) {
    const specCount = rar==='mythic'?2:1;
    it.affixes = shuf([...specPool]).slice(0,specCount).map(a=>a.id);
  }
  // Suffix (gold, time)
  if(['rare','epic','legendary','mythic'].includes(rar) && suffPool.length && Math.random()<0.4) {
    it.statAffixes.push(shuf([...suffPool])[0].id);
  }

  // Set item chance
  if(['legendary','mythic'].includes(rar) && Math.random()<0.4) {
    const setIdx = ~~(Math.random()*SETS.length);
    const set = SETS[setIdx];
    it.setId = set.id;
    it.name = set.pieces[SLOTS.indexOf(it.slot)];
  }

  return it;
}

function itemName(slot, rar) {
  const P={common:['破旧','普通','简陋'],rare:['精良','锋利','坚固'],epic:['神秘','古老','辉耀'],legendary:['传说','永恒','神圣'],mythic:['神话','至高','永恒神圣']};
  const N={weapon:['长剑','匕首','战斧','巨剑','神剑'],head:['头盔','皮帽','铁冠','战盔','神冠'],body:['铠甲','皮甲','战袍','龙鳞甲','神装'],legs:['护腿','皮靴','铁靴','战靴','神靴']};
  return P[rar][~~(Math.random()*P[rar].length)]+'·'+N[slot][~~(Math.random()*N[slot].length)];
}

function itemStatSummary(it) {
  // Compute total stats from all rolled affixes
  const stats = { atk:0, spd:0, crit:0, cdmg:0, time:0, goldPct:0 };
  for(const sid of (it.statAffixes||[])) {
    const a = getAffix(sid); if(!a||!a.roll) continue;
    const r = a.roll(it.stage||1);
    for(const k of Object.keys(r)) stats[k]=(stats[k]||0)+r[k];
  }
  // Cached rolled values (store on item)
  if(!it.rolled) {
    it.rolled = {};
    for(const sid of (it.statAffixes||[])) {
      const a=getAffix(sid); if(!a||!a.roll) continue;
      const r=a.roll(it.stage||1);
      for(const[k,v] of Object.entries(r)) it.rolled[k]=(it.rolled[k]||0)+v;
    }
    it.rolled.atk=(it.rolled.atk||0);
    it.rolled.spd=(it.rolled.spd||0);
    it.rolled.crit=(it.rolled.crit||0);
    it.rolled.cdmg=(it.rolled.cdmg||0);
  }
  return it.rolled;
}

function itemStatsText(it) {
  const r=itemStatSummary(it);
  const p=[];
  const mult=1+it.upg*0.15;
  if(r.atk)     p.push('ATK+'+Math.floor(r.atk*mult));
  if(r.spd)     p.push('SPD+'+((r.spd*mult).toFixed(2)));
  if(r.crit)    p.push('Crit+'+Math.floor(r.crit*mult)+'%');
  if(r.cdmg)    p.push('CDmg+'+Math.floor(r.cdmg*mult)+'%');
  if(r.time)    p.push('时间+'+r.time+'s');
  if(r.goldPct) p.push('金币+'+r.goldPct+'%');
  // Gems
  const gemMult=G.pb.gemBonus||1;
  if(it.gemAtk)  p.push('💎ATK+'+Math.floor(it.gemAtk*gemMult)+'%');
  if(it.gemSpd)  p.push('💎SPD+'+it.gemSpd);
  if(it.gemCrit) p.push('💎Crit+'+it.gemCrit+'%');
  if(it.gemCdmg) p.push('💎CDmg+'+it.gemCdmg+'%');
  if(it.gemTrue) p.push('💎真伤+'+it.gemTrue+'%');
  if(it.gemAll)  p.push('💎全属+'+it.gemAll+'%');
  return p.join(' · ') || '无属性';
}

function itemAffixHTML(it) {
  const parts = [];
  for(const id of (it.affixes||[])) {
    const a=getAffix(id); if(a) parts.push(`<span class="atag atag-sp">${a.name}</span>`);
  }
  if(it.setId) {
    const s=SETS.find(x=>x.id===it.setId);
    if(s) parts.push(`<span class="atag atag-set">${s.icon}${s.name}</span>`);
  }
  return parts.join('');
}

function getItemEquipStats(it) {
  // Returns computed bonus from this item
  const r=itemStatSummary(it);
  const mult=1+it.upg*0.15;
  const gemMult=G.pb.gemBonus||1;
  return {
    atk:  Math.floor((r.atk||0)*mult) + Math.floor((it.gemAtk||0)*gemMult/100*G.baseAtk),
    spd:  +((r.spd||0)*mult + (it.gemSpd||0)).toFixed(2),
    crit: Math.floor((r.crit||0)*mult) + (it.gemCrit||0),
    cdmg: Math.floor((r.cdmg||0)*mult) + (it.gemCdmg||0),
  };
}

function upgCost(it) { return Math.floor(300*Math.pow(1.9, it.upg)*(RARITIES.indexOf(it.rar)+1)); }
function salvYield(it) {
  const mult = hasSkill('alchemist')?2:1;
  return { mat:{common:'common',rare:'rare',epic:'epic',legendary:'epic',mythic:'legendary'}[it.rar], amt:(it.upg+1)*mult };
}

function openBox(forced) {
  const it=genItem(G.stage, forced);
  it.stage=G.stage;
  const autoS=checkAutoSalv(it);
  if(!autoS){
    G.inventory.push(it); G.itemsGot++; capInventory();
    log('📦 ['+RNAME[it.rar]+'] '+it.name,'loot');
    if(it.affixes.length) it.affixes.forEach(id=>{const a=getAffix(id);if(a)log('  ✦ '+a.name,'loot');});
    if(it.rar==='mythic'){G.mythCount++;spawnParts('mythic');}
    else if(it.rar==='legendary'){G.legCount++;spawnParts('legendary');}
    else if(it.rar==='epic') updateTaskProgress('itemsGot',1);
  }
  recalcSets(); renderEquip(); checkAchs();
}

// ── EQUIPMENT ────────────────────────────────────────────
// ── NEW GEAR UPGRADE SYSTEM ───────────────────────────────────
function initGear() {
  try {
    if(!G.gear) G.gear = makeInitialGear();
    // Init team
    if(!G.units||!G.units.length){
      const warrior = makeUnit('warrior','战士');
      warrior.gear = makeInitialGear();
      G.units = [warrior];
    }
    // Ensure each unit has gear
    G.units.forEach(u=>{ if(!u.gear) u.gear=makeInitialGear(); });
    calcTeamSynergies();
  } catch(e) { console.warn('initGear error:',e); }
}

function choosePath(slot, pathId) {
  const g = G.gear[slot]; if(!g) return;
  if(g.pathId) { notif('路线已选择，无法更改'); return; }
  const paths = GEAR_PATHS[slot];
  const path = paths && paths.find(p=>p.id===pathId);
  if(!path) return;
  g.pathId = pathId;
  // Set name based on path
  g.name = path.name;
  recomputeGearStats(g); recalcEq(); updateStats();
  log('✅ '+SLOT_NAME[slot]+' 选择路线：'+path.name,'ev');
  notif('路线已选：'+path.name);
  if(typeof renderGear==='function') renderGear();
}

function upgradeGear(slot, type='path') {
  const g = G.gear[slot]; if(!g) return;
  if(type==='path'){
    if(!g.pathId){ notif('先选择路线'); return; }
    const paths = GEAR_PATHS[slot];
    const path = paths && paths.find(p=>p.id===g.pathId);
    if(!path) return;
    const lv = g.pathLv||0;
    if(lv>=path.levels.length){ notif('已达路线最高等级'); return; }
    const lvData = path.levels[lv];
    const cost = lvData.cost;
    const mat = path.mat;
    if((G.upgMats[mat]||0)<cost){ notif('需要 '+cost+'x '+UPGRADE_MATS[mat].name); return; }
    G.upgMats[mat] -= cost;
    g.pathLv = lv+1;
    recomputeGearStats(g); recalcEq(); updateStats();
    const rarInfo = gearRarity(g.pathLv);
    G.upgradeCount=(G.upgradeCount||0)+1;
    updateTaskProgress('upgradeCount',1);
    log(SLOT_ICON[slot]+' '+g.name+' Lv.'+g.pathLv+' → '+rarInfo.name+' ['+Object.entries(lvData).filter(([k])=>k!=='cost').map(([k,v])=>k.toUpperCase()+'+'+v).join(' ')+']','ev');
    checkAchs();
  } else if(type==='reset'){
    // Reset path choice — costs gold (scales with path level)
    const resetCost = Math.max(1000, Math.floor(G.gold * 0.1 + (g.pathLv||0) * 500));
    if(G.gold < resetCost){ notif('重置费用：'+fmt(resetCost)+' 金'); return; }
    G.gold -= resetCost;
    // Refund 50% of materials spent
    const paths = GEAR_PATHS[slot];
    const path = paths&&paths.find(p=>p.id===g.pathId);
    if(path){
      let refund=0;
      for(let i=0;i<(g.pathLv||0);i++){ const lv=path.levels[i]; if(lv) refund+=Math.floor(lv.cost*0.5); }
      if(refund>0){ G.upgMats[path.mat]=(G.upgMats[path.mat]||0)+refund; log('🔄 退还材料 '+refund+'x '+UPGRADE_MATS[path.mat].name,'ev'); }
    }
    g.pathId=null; g.pathLv=0; g.name=SLOT_NAME[slot];
    recomputeGearStats(g); recalcEq(); updateStats();
    log('🔄 '+SLOT_NAME[slot]+' 路线重置，花费'+fmt(resetCost)+'金','ev');
    notif('路线已重置');
    if(typeof renderGear==='function') renderGear();
    return;
  } else if(type==='evolve'){
    // Gear evolution: reset path but grant ×2 permanent multiplier
    const req=GEAR_EVOLUTION_REQ;
    if((g.pathLv||0)<req.pathLv){ notif('需要路线Lv.'+req.pathLv); return; }
    if((g.bossLv||0)<req.bossLv){ notif('需要Boss强化Lv.'+req.bossLv); return; }
    g.evolutionMult=(g.evolutionMult||1)*GEAR_EVOLUTION_BONUS.mult;
    g.evolutionCount=(g.evolutionCount||0)+1;
    g.pathLv=0; g.bossLv=0;
    g.pathId=null; // re-choose path
    G.gearEvolutions=(G.gearEvolutions||0)+1;
    recomputeGearStats(g); recalcEq(); updateStats();
    log('🌅 '+SLOT_ICON[slot]+' '+SLOT_NAME[slot]+' 进化！属性×2，选择新路线','boss');
    notif('🌅 装备进化！属性×2','#c9a84c');
    checkAchs();
    if(typeof renderGear==='function') renderGear();
    return;
  } else if(type==='mythic'){
    if(G.awakenings<3){ notif('需要3次觉醒'); return; }
    const mLv = g.mythicLv||0;
    if(mLv>=MYTHIC_PATH.levels.length){ notif('神话路线已满'); return; }
    const lvData = MYTHIC_PATH.levels[mLv];
    if((G.upgMats.mythic_shard||0)<lvData.cost){ notif('需要 '+lvData.cost+'x 神话碎片'); return; }
    G.upgMats.mythic_shard -= lvData.cost;
    g.mythicLv = mLv+1;
    recomputeGearStats(g); recalcEq(); updateStats();
    log('🌠 神话路线 Lv.'+g.mythicLv+' +'+lvData.allPct+'%全属性 +真伤'+lvData.truePct+'%','ev');
  } else if(type==='boss'){
    const bLv = g.bossLv||0;
    if(bLv>=BOSS_PATH.levels.length){ notif('Boss强化已满'); return; }
    const lvData = BOSS_PATH.levels[bLv];
    if((G.upgMats.boss_core||0)<lvData.cost){ notif('需要 '+lvData.cost+'x Boss核心'); return; }
    G.upgMats.boss_core -= lvData.cost;
    g.bossLv = bLv+1;
    recomputeGearStats(g); recalcEq(); updateStats();
    log(SLOT_ICON[slot]+' 霸主强化 Lv.'+g.bossLv+' +'+lvData.allPct+'%全属性','ev');
  }
  if(typeof renderGear==='function') renderGear();
}

// Bulk upgrade — use all available mats on a slot
function bulkUpgradeGear(slot, type='path') {
  let count=0;
  while(true){
    const g=G.gear[slot]; if(!g) break;
    const prevLv=type==='path'?g.pathLv:g.bossLv;
    upgradeGear(slot, type);
    const newLv=type==='path'?g.pathLv:g.bossLv;
    if(newLv===prevLv) break; // no progress = stop
    count++;
    if(count>200) break;
  }
  if(count>0){ notif('🔥 批量强化 '+count+' 次！'); if(typeof renderGear==='function') renderGear(); }
}

// Drop mats from combat
function dropUpgradeMats(stage, isBoss, enemyType) {
  const drops=[];
  for(const [mat, weight, minA, maxA, minS, bossOnly] of MAT_DROP_TABLE){
    if(stage<minS) continue;
    if(bossOnly && !isBoss && enemyType!=='miniboss') continue;
    if(Math.random()*100 < weight){
      const amt = minA + Math.floor(Math.random()*(maxA-minA+1));
      G.upgMats[mat] = (G.upgMats[mat]||0) + amt;
      drops.push(UPGRADE_MATS[mat].icon+' '+UPGRADE_MATS[mat].name+'×'+amt);
    }
  }
  if(drops.length) log('📦 '+drops.join(' '),'loot');
}

function recalcEq() {
  G.eqAtk=0; G.eqSpd=0; G.eqCrit=0; G.eqCritDmg=0;
  G._goldPctBonus=0;
  if(!G.gear) return;
  // Main character gear
  for(const g of Object.values(G.gear)) {
    G.eqAtk   += g.totalAtk  || 0;
    G.eqSpd   += g.totalSpd  || 0;
    G.eqCrit  += g.totalCrit || 0;
    G.eqCritDmg += g.totalCdmg || 0;
  }
  // Unit gear contributes via unitAtk() per unit — not added to main pool
  // But tank passive: each gear level = +team ATK boost
  if(G.units){
    G.units.filter(u=>u.unlocked&&u.roleId==='tank'&&u.gear).forEach(u=>{
      const tankLvTotal = Object.values(u.gear).reduce((s,g)=>(s+(g.pathLv||0)),0);
      G.teamAtkMult = Math.max(1, (G.teamAtkMult||1) + tankLvTotal*0.001);
    });
  }
}

// Recompute a single gear piece total stats from its path + boss levels
function recomputeGearStats(g) {
  g.totalAtk=0; g.totalSpd=0; g.totalCrit=0; g.totalCdmg=0;
  if(!g.pathId) return;
  // Find path definition
  const paths = GEAR_PATHS[g.slot];
  const path = paths ? paths.find(p=>p.id===g.pathId) : null;
  if(path) {
    for(let i=0;i<(g.pathLv||0);i++){
      const lv=path.levels[i]; if(!lv) break;
      if(lv.atk)  g.totalAtk  += lv.atk;
      if(lv.spd)  g.totalSpd  = +((g.totalSpd + lv.spd).toFixed(3));
      if(lv.crit) g.totalCrit = +((g.totalCrit + lv.crit).toFixed(2));
      if(lv.cdmg) g.totalCdmg += lv.cdmg;
    }
  }
  // Evolution multiplier (from gear evolution)
  if(g.evolutionMult&&g.evolutionMult>1){
    g.totalAtk=Math.floor(g.totalAtk*g.evolutionMult);
    g.totalSpd=+((g.totalSpd*g.evolutionMult).toFixed(3));
    g.totalCrit=+((g.totalCrit*g.evolutionMult).toFixed(2));
    g.totalCdmg=Math.floor(g.totalCdmg*g.evolutionMult);
  }
  // Boss path bonus (allPct)
  if(g.bossLv>0) {
    const bossLvs = g.bossLv;
    let totalPct = 0;
    for(let i=0;i<bossLvs;i++){
      const lv=BOSS_PATH.levels[i]; if(!lv) break;
      totalPct += lv.allPct;
    }
    const mult = 1 + totalPct/100;
    g.totalAtk  = Math.floor(g.totalAtk  * mult);
    g.totalSpd  = +((g.totalSpd  * mult).toFixed(3));
    g.totalCrit = +((g.totalCrit * mult).toFixed(2));
    g.totalCdmg = Math.floor(g.totalCdmg * mult);
  }
  // Mythic path bonus
  if(g.mythicLv&&g.mythicLv>0&&typeof MYTHIC_PATH!=='undefined'){
    let mpct=0, mtrue=0;
    for(let i=0;i<g.mythicLv;i++){
      const lv=MYTHIC_PATH.levels[i]; if(!lv) break;
      mpct+=lv.allPct; mtrue+=lv.truePct;
    }
    const mm=1+mpct/100;
    g.totalAtk=Math.floor(g.totalAtk*mm);
    g.totalSpd=+((g.totalSpd*mm).toFixed(3));
    g.totalCrit=+((g.totalCrit*mm).toFixed(2));
    g.totalCdmg=Math.floor(g.totalCdmg*mm);
    g.mythicTruePct=mtrue;
  }
  // Update rarity based on path level
  const rarInfo = gearRarity(g.pathLv||0);
  g.rar = g.mythicLv>0?'mythic':rarInfo.rar;
}

function calcTeamSynergies() {
  try {
    if(!G.units||!G.units.length) return;
    G.teamAtkMult=1; G.teamCdmgBonus=0; G.teamTruePct=0; G.teamAllMult=1; G.teamDoubleHit=0;
    const active=G.units.filter(u=>u.unlocked);
    if(typeof TEAM_SYNERGIES==='undefined') return;
    TEAM_SYNERGIES.forEach(syn=>{
      try{ if(syn.req(active)) syn.apply(); }catch(e){}
    });
  } catch(e) { console.warn('synergy error:',e); }
}

function recalcSets() {
  G.setEffects=[];
  G.setBonusAtk=0; G.setBonusCrit=0; G.setBonusSpd=0; G.setBonusAll=0;
  const reduce=G.pb.setReduce||0;
  SETS.forEach((set,i)=>{
    const count=SLOTS.reduce((n,slot)=>n+(G.equipped[slot]&&G.equipped[slot].setId===set.id?1:0),0);
    G.setEffects[i]=count;
    const req2=Math.max(1,2-reduce), req4=Math.max(1,4-reduce);
    if(count>=req2&&set.bonus[2]&&set.bonus[2].apply) set.bonus[2].apply();
    if(count>=req4&&set.bonus[4]&&set.bonus[4].apply) set.bonus[4].apply();
  });
}

function equipItem(it) {
  const old=G.equipped[it.slot]; if(old) G.inventory.push(old);
  G.equipped[it.slot]=it; G.inventory=G.inventory.filter(i=>i.id!==it.id);
  recalcEq(); recalcSets(); updateStats(); renderEquip();
  log('🛡 装备 ['+RNAME[it.rar]+'] '+it.name,'loot');
  checkAchs(); restartCombat();
}

function unequipSlot(slot) {
  const it=G.equipped[slot]; if(!it) return;
  G.inventory.push(it); G.equipped[slot]=null;
  recalcEq(); recalcSets(); updateStats(); renderEquip(); restartCombat();
}

function salvageItem(it) {
  G.inventory=G.inventory.filter(i=>i.id!==it.id);
  const{mat,amt}=salvYield(it);
  G.mats[mat]=(G.mats[mat]||0)+amt;
}

function upgradeItem(it) {
  if(it.upg>=MAX_ITEM_LVL) return;
  const c=upgCost(it); if(G.gold<c){ notif('金币不足 '+fmt(c)); return; }
  G.gold-=c; it.upg++;
  log('⬆ '+it.name+' → +'+it.upg,'ev');
  recalcEq(); updateStats(); saveGame();
}

function reforgeItem(it) {
  if((G.currencies.reforge||0)<1){ notif('需要重铸石'); return; }
  G.currencies.reforge--;
  G.totalReforges++;
  // Re-roll all stat affixes
  it.rolled=null;
  it.statAffixes=[];
  const statPool=AFFIXES.filter(a=>a.type==='prefix'&&a.r.includes(it.rar));
  const count=AFFIX_COUNT[it.rar]+(G.pb.extraAffix||0);
  it.statAffixes=shuf([...statPool]).slice(0,Math.min(count,statPool.length)).map(a=>a.id);
  // Mythic chance from passive
  if(it.rar==='legendary'&&G.pb.mythicChance&&Math.random()<G.pb.mythicChance&&G.awakenings>=3){
    it.rar='mythic'; it.gemSlots=GEM_SLOTS['mythic']; G.mythCount++;
    log('🌠 重铸获得神话品质！','boss');
  }
  itemStatSummary(it); // re-cache
  recalcEq(); updateStats();
  log('🔄 重铸了 '+it.name,'ev');
  notif('🔄 重铸完成！');
}

function craftItem(mat) {
  if((G.mats[mat]||0)<3){ notif('需要3个'+{common:'普通',rare:'稀有',epic:'史诗'}[mat]+'碎片'); return; }
  G.mats[mat]-=3;
  const tar={common:'rare',rare:'epic',epic:'legendary'}[mat];
  const it=genItem(G.stage,tar); it.stage=G.stage;
  G.inventory.push(it);
  log('🔮 合成 ['+RNAME[tar]+'] '+it.name,'ev');
  if(tar==='legendary'){G.legCount++;spawnParts('legendary');}
  else if(tar==='epic') checkAchs(); renderEquip(); updateStats();
}

function capInventory() {
  if(G.inventory.length<=60) return;
  const sorted=[...G.inventory].sort((a,b)=>RARITIES.indexOf(b.rar)-RARITIES.indexOf(a.rar)||b.upg-a.upg);
  const rem=sorted.slice(60);
  rem.forEach(it=>salvageItem(it));
  if(rem.length) log('📦 仓库上限，自动分解'+rem.length+'件','sys');
}

let autoSalvRar=null;
function toggleAutoSalv() {
  const btn=$('auto-salv-btn');
  if(!autoSalvRar){ autoSalvRar='common'; btn.textContent='自动:普通'; btn.classList.add('on'); }
  else if(autoSalvRar==='common'){ autoSalvRar='common+rare'; btn.textContent='自动:普+稀'; }
  else { autoSalvRar=null; btn.textContent='自动:关'; btn.classList.remove('on'); }
}
function checkAutoSalv(it) {
  if(!autoSalvRar||it.rar==='legendary'||it.rar==='mythic') return false;
  if(autoSalvRar==='common'&&it.rar==='common'){ salvageItem(it); return true; }
  if(autoSalvRar==='common+rare'&&(it.rar==='common'||it.rar==='rare')){ salvageItem(it); return true; }
  return false;
}
function bulkSalvage(rar) {
  const items=G.inventory.filter(i=>i.rar===rar);
  if(!items.length){ notif('没有'+RNAME[rar]+'装备'); return; }
  items.forEach(it=>salvageItem(it));
  log('🔨 批量分解'+items.length+'件'+RNAME[rar],'sys');
  renderEquip(); updateStats();
}

// ── GEMS ─────────────────────────────────────────────────────
function gainRandomGem() {
  const gem=GEMS[~~(Math.random()*GEMS.length)];
  const tier=~~(Math.random()*4);
  gainGem(gem.id, gem.rarity[tier]);
}
function gainGem(gemId, rar) {
  const gem=GEMS.find(g=>g.id===gemId); if(!gem) return;
  G.gems.push({ id:gemId, rar, tier:gem.rarity.indexOf(rar), val:gem.values[gem.rarity.indexOf(rar)] });
  log('💎 获得 '+RNAME[rar||'common']+' '+gem.name,'loot');
  G.totalGems++;
}
function inlayGem(itemId, gemIdx) {
  const it=G.inventory.find(x=>x.id===itemId)||Object.values(G.equipped).find(x=>x&&x.id===itemId);
  const gem=G.gems[gemIdx];
  if(!it||!gem) return;
  if((it.gems||[]).length>=(it.gemSlots||0)){ notif('宝石槽已满'); return; }
  it.gems=it.gems||[];
  it.gems.push(gemIdx);
  const gemDef=GEMS.find(g=>g.id===gem.id);
  gemDef.effect(it, gem.val * (G.pb.gemBonus||1));
  G.gems.splice(gemIdx,1);
  recalcEq(); updateStats();
  log('💎 镶嵌了 '+gemDef.name,'ev');
  notif('💎 镶嵌成功！');
}

// ── AWAKENING ─────────────────────────────────────────────────
function canAwaken() {
  const req=AWAKENING_REQS[G.awakenings]; if(!req) return false;
  return G.level>=req.level && G.best>=req.stage && G.gold>=req.gold;
}
function doAwaken() {
  if(!canAwaken()){ notif('条件不足'); return; }
  const req=AWAKENING_REQS[G.awakenings];
  const bonus=AWAKENING_BONUSES[G.awakenings];
  G.gold-=req.gold;
  // Apply bonus
  G.awakeningBonuses=G.awakeningBonuses||[];
  G.awakeningBonuses.push(bonus);
  // Reset level and stage but keep equipment
  G.level=1; G.exp=0; G.expNeed=EXP_TABLE[1];
  G.stage=1; G.baseAtk=Math.floor(G.baseAtk*0.3+10); // keep 30% of baseAtk
  G.awakenings++;
  shake();
  log('🌅 觉醒！'+bonus.desc,'boss');
  notif('🌅 觉醒成功！'+bonus.desc,'#c9a84c');
  checkAchs(); updateStats(); restartCombat();
}

// ── SPEC ─────────────────────────────────────────────────────
function selectSpec(type) {
  if(G.spec===type) return;
  if(G.spec!==null){ if(G.gold<5000){ notif('更换专精需要5000金'); return; } G.gold-=5000; updateStats(); }
  G.spec=type;
  log('✨ 专精：'+{atk:'战士',crit:'刺客',spd:'疾风'}[type],'ev');
  renderSpecCards(); updateSpecPill(); updateStats();
  if(type==='spd') restartCombat();
}

// ── SKILLS ───────────────────────────────────────────────────
function getUnlockableSkills() {
  return SKILLS.filter(s=>G.level>=s.unlockLv && !G.skills.includes(s.id));
}
function learnSkill(id) {
  if(G.skills.includes(id)) return;
  // Check unlock level
  const sk=SKILLS.find(s=>s.id===id); if(!sk) return;
  if(G.level<sk.unlockLv){ notif('需要'+sk.unlockLv+'级'); return; }
  G.skills.push(id);
  log('📚 学会技能：'+sk.icon+' '+sk.name,'skill');
  notif('📚 '+sk.name+' 已学会！');
  checkAchs(); updateStats();
  if(typeof renderSkills==='function') renderSkills();
}

// ── MILESTONES ────────────────────────────────────────────────
function checkMilestone(stage) {
  // Unit 2 unlock
  if(stage===100&&!G.unit2Unlocked){
    G.unit2Unlocked=true;
    log('🎉 解锁第二角色！即将到来...','boss');
    notif('🎉 Stage 100！第二角色解锁！','#c9a84c');
  }
  const m=MILESTONES.find(x=>x.stage===stage);
  if(!m||G.milestonesDone.includes(stage)) return;
  G.milestonesDone.push(stage);
  if(m.atk)     G.bonusAtk+=m.atk;
  if(m.spd)     G.atkSpd=Math.min(+(G.atkSpd+m.spd).toFixed(1),spdCap());
  if(m.crit)    G.critChance+=m.crit;
  if(m.cdmg)    G.critDmg+=m.cdmg;
  if(m.atkMult) G.baseAtk=Math.floor(G.baseAtk*m.atkMult);
  log('🏆 里程碑 Stage '+stage+'！'+m.desc,'ms');
  updateStats();
}

// ── ACHIEVEMENTS ─────────────────────────────────────────────
function tryUnlockUnit(roleId) {
  const req = UNIT_UNLOCK_REQS&&UNIT_UNLOCK_REQS[roleId];
  if(!req) return;
  if(G.best<req.stage||G.gold<req.gold){ notif('解锁条件：'+req.desc); return; }
  const exists = G.units.some(u=>u.roleId===roleId);
  if(exists){ notif('已解锁'); return; }
  G.gold -= req.gold;
  const unit = makeUnit(roleId);
  unit.gear = makeInitialGear();
  unit.unlocked = true;
  G.units.push(unit);
  calcTeamSynergies();
  updateStats(); saveGame();
  log('🎉 解锁新角色：'+unit.name,'boss');
  notif('🎉 '+unit.name+' 已解锁！','#c9a84c');
  if(typeof renderTeam==='function') renderTeam();
}

function checkAchs() {
  ACHS.forEach(a=>{
    if(!G.achs.includes(a.id)&&a.f()){
      G.achs.push(a.id); notif('🏅 '+a.n); log('🏅 成就：'+a.n,'ach');
    }
  });
  // Title check
  if(typeof TITLES!=='undefined'){
    TITLES.forEach(t=>{
      if(!(G.titlesEarned||[]).includes(t.id)&&t.req()){
        if(!G.titlesEarned) G.titlesEarned=[];
        G.titlesEarned.push(t.id);
        if(!G.activeTitle) G.activeTitle=t.id;
        log('📛 称号：'+t.icon+' '+t.name,'ach');
        notif('📛 新称号：'+t.name,'#c9a84c');
      }
    });
  }
}

// ── TALENT ───────────────────────────────────────────────────
function doReroll() {
  G.gold-=G.rerollCost;
  G.rerollHist.push({n:G.rerollN+1,name:T.name,c:G.rerollCost});
  if(!hasSkill('fate_control')) G.rerollCost=Math.floor(G.rerollCost*3);
  G.rerollN++;
  G.tAtk=0; G.tN=0; G.tCrit=0; G.tSpd=0; G.tCritPen=0;
  T=TALENTS[~~(Math.random()*TALENTS.length)]; G.talentId=T.id;
  if(T.onActivate) T.onActivate();
  // If resonance skill, double effect
  closeModal(); updateStats(); renderTalent();
  log('🎲 新天赋：'+T.icon+' '+T.name,'ev');
  notif('天赋：'+T.name);
}

// ── PASSIVES ─────────────────────────────────────────────────
function unlockPassive(node) {
  if(G.gold<node.c){ notif('金币不足 '+fmt(node.c)); return; }
  G.gold-=node.c; node.e(); G.done.push(node.id);
  log('🌿 '+node.n+' — '+node.d,'ev');
  notif('🌿 '+node.n+' 激活！');
  updateStats(); renderPassive(); checkAchs(); saveGame(); restartCombat();
}

// ── TRAIN / REST ──────────────────────────────────────────────
function trainCost() {
  // Train cost scales with how much ATK you already have
  return Math.max(10, Math.floor(G.baseAtk * 0.05 + G.trainN * 2));
}

function doTrain() {
  const cost = trainCost();
  if(G.gold < cost){ notif('金币不足 需要'+fmt(cost)); return; }
  G.gold -= cost;
  G.trainN++;
  // ATK gain: small flat amount, grows slowly
  let g = Math.ceil(totalAtk() * 0.02 + 1) + (G.pb.trainFlat||0);
  if(G.spec==='atk') g = Math.ceil(g * 2 * (1+(G.pb.trainAtkMult||0)));
  else g = Math.ceil(g * (1+(G.pb.trainAtkMult||0)));
  // Warrior + titan synergy
  if(G.spec==='atk'&&T.id==='titan') g=Math.ceil(g*1.5);
  // Assassin: every 10 trains = crit+1%
  if(G.spec==='crit'&&G.trainN%10===0) G.critChance+=1;
  if(hasSkill('resonance')&&T.onTrain) g*=2;
  G.baseAtk += g;
  if(T.onTrain) T.onTrain();
  SKILLS.filter(s=>G.skills.includes(s.id)&&s.onTrain).forEach(s=>s.onTrain());
  // SPD: every 10 trains
  const sGain=G.spec==='spd'?0.1:0.05;
  let sLine='';
  if(G.trainN%10===0){ G.atkSpd=Math.min(+(G.atkSpd+sGain).toFixed(2),spdCap()); sLine=' SPD+'+sGain; pop('s-spd'); restartCombat(); }
  // Crit: every 20 trains
  if(G.trainN%20===0){ G.critChance=Math.min(G.critChance+1,200); if(G.speed<=3) log('🎯 Crit+1%','ev'); pop('s-crit'); }
  if(G.speed<=3) log('🏋 Train ATK+'+g+sLine+' (-'+fmt(cost)+'金)','ev');
  pop('s-atk'); pop('s-gold'); updateStats(); checkAchs();
  updateTaskProgress('trainN',1);
}
function restCost() {
  return Math.max(50, Math.floor(G.stage * 5 + G.level * 3));
}

function doRest() {
  const cost = restCost();
  if(G.gold < cost){ notif('金币不足 需要'+fmt(cost)); return; }
  G.gold -= cost;
  // Rest gives small material/utility bonuses, NOT ATK
  const evs=[
    ()=>{ const b=Math.floor(G.stage*3+1); G.upgMats.atk_stone=(G.upgMats.atk_stone||0)+b; log('✨ 休整 攻击石+'+b,'ev'); },
    ()=>{ const b=Math.floor(G.stage*2+1); G.upgMats.spd_stone=(G.upgMats.spd_stone||0)+b; log('✨ 磨练 速度石+'+b,'ev'); },
    ()=>{ const b=Math.floor(G.stage*2+1); G.upgMats.crit_stone=(G.upgMats.crit_stone||0)+b; log('✨ 专注 暴击石+'+b,'ev'); },
    ()=>{ gainExp(Math.floor(G.expNeed*0.3)); log('✨ 领悟 EXP+30%','ev'); },
    ()=>{ const b=Math.floor(G.stage*1+1); G.upgMats.def_stone=(G.upgMats.def_stone||0)+b; log('✨ 冥想 韧性石+'+b,'ev'); },
    ()=>{ if((G.upgMats.boss_core||0)<5&&G.stage>=10){ G.upgMats.boss_core=(G.upgMats.boss_core||0)+1; log('✨ 感悟 Boss核心+1','ev'); } else { const b=Math.floor(G.stage*3+1); G.upgMats.atk_stone=(G.upgMats.atk_stone||0)+b; log('✨ 休整 攻击石+'+b,'ev'); } },
  ];
  evs[~~(Math.random()*evs.length)]();
  pop('s-gold'); updateStats();
}

// ── EXP / LEVEL ───────────────────────────────────────────────
function gainExp(amt) {
  G.exp+=amt;
  while(G.exp>=G.expNeed){
    G.exp-=G.expNeed; G.level++;
    G.expNeed=EXP_TABLE[Math.min(G.level,100)]||Math.floor(G.expNeed*2);
    G.baseAtk=Math.floor(G.baseAtk*1.1+2);
    G.atkSpd=Math.min(+(G.atkSpd+0.05).toFixed(2),spdCap());
    log('⬆ LEVEL UP! Lv.'+G.level+' ATK+10% SPD+0.05','win');
    pop('s-level'); pop('s-atk');
    // Berserker lv skill
    if(hasSkill('berserker_lv')){ const sk=SKILLS.find(s=>s.id==='berserker_lv'); if(sk&&sk.onLevelUp) sk.onLevelUp(); }
    // Scholar talent
    if(T.id==='scholar'&&T.onLevelUp) T.onLevelUp();
    // Check skill unlocks
    const newSkills=getUnlockableSkills().filter(s=>s.unlockLv===G.level);
    if(newSkills.length) {
      notif('📚 新技能可学：'+newSkills.map(s=>s.name).join('，'), '#8b5cf6');
      log('📚 技能解锁：'+newSkills.map(s=>s.name).join('，'),'skill');
    }
  }
  updateStats(); checkAchs();
}

// ── COMBAT ────────────────────────────────────────────────────
let atkI=null, tmrI=null, dpsI=null, berserkI=null;
G._berserkActive=false;

function unitAtk(unit) {
  if(!unit) return totalAtk();
  const role = typeof UNIT_ROLES!=='undefined' ? UNIT_ROLES.find(r=>r.id===unit.roleId) : null;
  const roleMult = role ? role.baseAtk : 1;
  // Unit base ATK scales with main character's ATK × role multiplier
  let a = Math.floor(totalAtk() * roleMult);
  // Unit gear bonus
  if(unit.gear){
    for(const g of Object.values(unit.gear)){
      a += g.totalAtk||0;
      // Gem ATK %
      if(g.gemAtk) a = Math.floor(a*(1+g.gemAtk/100));
    }
  }
  // Role special passives
  if(role){
    if(role.id==='mage') a = Math.floor(a * 0.7); // mage deals less direct dmg but has true dmg
    if(role.id==='tank') a = Math.floor(a * 0.5); // tank deals less dmg
  }
  return Math.max(1, a);
}

function unitSpd(unit) {
  if(!unit) return totalSpd();
  const role = typeof UNIT_ROLES!=='undefined' ? UNIT_ROLES.find(r=>r.id===unit.roleId) : null;
  let s = totalSpd() * (role ? role.baseSpd : 1);
  if(unit.gear){ for(const g of Object.values(unit.gear)) s += g.totalSpd||0; }
  return Math.min(+(s.toFixed(2)), spdCap()*(role?role.baseSpd:1)*1.5);
}

function unitCrit(unit) {
  if(!unit) return totalCrit();
  const role = typeof UNIT_ROLES!=='undefined' ? UNIT_ROLES.find(r=>r.id===unit.roleId) : null;
  let c = totalCrit() * (role ? role.baseCrit : 1);
  if(unit.gear){ for(const g of Object.values(unit.gear)) c += g.totalCrit||0; }
  return Math.max(0, c);
}

function unitCritDmg(unit) {
  if(!unit) return totalCritDmg();
  const role = typeof UNIT_ROLES!=='undefined' ? UNIT_ROLES.find(r=>r.id===unit.roleId) : null;
  let c = totalCritDmg() * (role ? role.baseCdmg : 1) + (G.teamCdmgBonus||0);
  if(unit.gear){ for(const g of Object.values(unit.gear)) c += g.totalCdmg||0; }
  return c;
}

function calcDmg() {
  // Get current attacking unit
  const activeUnits = G.units ? G.units.filter(u=>u.unlocked) : [];
  const unit = activeUnits.length > 1 ? activeUnits[(G.activeUnit-1+activeUnits.length)%activeUnits.length] : null;
  const role = unit && typeof UNIT_ROLES!=='undefined' ? UNIT_ROLES.find(r=>r.id===unit.roleId) : null;

  let dmg = unit ? unitAtk(unit) : totalAtk();
  const pct=G.enemyMax>0?G.enemyHP/G.enemyMax:1;

  // ── GEAR PATH IDENTITY ──
  if(G.gear){
    // ATK paths: every 5th hit = BURST (250% + screen shake + big number)
    const atkPathLv = Math.max(0,...Object.values(G.gear)
      .filter(g=>g.pathId==='w_atk'||g.pathId==='b_atk').map(g=>g.pathLv||0));
    if(atkPathLv>=1){
      G._atkHitCount=(G._atkHitCount||0)+1;
      const burstEvery = Math.max(3, 5-Math.floor(atkPathLv/20)); // burst more often at higher lv
      if(G._atkHitCount>=burstEvery){
        G._atkHitCount=0;
        const burstMult = 2.5 + atkPathLv*0.05; // scales with level
        dmg=Math.floor(dmg*burstMult);
        G._isBurst=true;
        if(G.speed<=3) shake();
      } else { G._isBurst=false; }
    }

    // SPD paths: every hit stacks 0.8% dmg, stack shows as meter, resets on stage clear
    const spdPathLv = Math.max(0,...Object.values(G.gear)
      .filter(g=>g.pathId==='w_spd'||g.pathId==='l_spd').map(g=>g.pathLv||0));
    if(spdPathLv>=1){
      const maxStack = 50 + spdPathLv*2;
      G._spdStack=(G._spdStack||0)+1;
      const stackBonus = Math.min(G._spdStack,maxStack)*(0.008+spdPathLv*0.0001);
      dmg=Math.floor(dmg*(1+stackBonus));
      // Update stack meter
      try{ const sm=$('spd-stack-meter');
        if(sm) sm.style.width=Math.min(100,G._spdStack/maxStack*100)+'%'; }catch(e){}
    }

    // CRIT paths: each crit multiplies the NEXT crit (exponential payoff)
    const critPathLv = Math.max(0,...Object.values(G.gear)
      .filter(g=>g.pathId==='h_crit'||g.pathId==='l_crit').map(g=>g.pathLv||0));
    if(critPathLv>=1){
      G._critChain=G._critChain||0;
      if(isCrit){
        G._critChain++;
        const chainMult = 1 + G._critChain*(0.15+critPathLv*0.002);
        dmg=Math.floor(dmg*chainMult);
        if(G._critChain>=5&&G.speed<=3) log('⚡ '+G._critChain+'连暴击链 ×'+chainMult.toFixed(1),'ev');
      } else {
        G._critChain=0;
      }
    }
  }

  // Boss phase ATK multiplier
  if(G.isBoss&&G.bossAtkMult&&G.bossAtkMult>1) dmg=Math.floor(dmg*G.bossAtkMult);
  // Role-specific passives
  if(role){
    if(role.id==='assassin'){
      // Assassin: each combo = +5% dmg
      dmg=Math.floor(dmg*(1+(unit.combo||0)*0.05));
    }
    if(role.id==='mage'){
      // Mage: flat true damage per hit (3% of enemy max HP)
      const mageTrueDmg=Math.floor(G.enemyMax*0.03*(1+(G.teamTruePct||0)));
      dmg+=mageTrueDmg;
    }
    if(role.id==='tank'){
      // Tank: boosts team ATK instead of dealing damage
      G.teamAtkBoost=(G.teamAtkBoost||0)+1;
    }
    if(role.id==='warrior'){
      // Warrior: burst every 5 hits
      unit.hitCount=(unit.hitCount||0)+1;
      if(unit.hitCount>=5){ unit.hitCount=0; dmg=Math.floor(dmg*3); }
    }
  }
  // Executioner talent
  if(T.id==='executioner'&&T.dmgMult) dmg=Math.floor(dmg*T.dmgMult(pct));
  // Affix: thunder
  let tMult=1;
  for(const it of Object.values(G.equipped)){
    if(it&&it.affixes) for(const id of it.affixes){ const a=getAffix(id); if(a&&a.dmgMult) tMult=Math.max(tMult,a.dmgMult()); }
  }
  // Passive demolish
  if(G.pb.demolish&&Math.random()<G.pb.demolish) tMult=Math.max(tMult,3);
  const critRate = unit ? unitCrit(unit) : totalCrit();
  const critDmgRate = unit ? unitCritDmg(unit) : totalCritDmg();
  const isCrit=Math.random()*100<critRate;
  if(isCrit) dmg=Math.floor(dmg*(critDmgRate/100));
  else dmg=Math.floor(dmg*(0.9+Math.random()*.2));
  dmg=Math.floor(dmg*tMult);
  // Mirror talent
  if(T.id==='mirror'&&T.mirrorChance&&Math.random()<T.mirrorChance&&G.lastDmg>0) dmg+=G.lastDmg;
  // Affix: mirror proc
  for(const it of Object.values(G.equipped)){
    if(it&&it.affixes) for(const id of it.affixes){ const a=getAffix(id); if(a&&a.mirrorChance&&Math.random()<a.mirrorChance) dmg+=G.lastDmg||0; }
  }
  // Skill: storm_strike
  if(hasSkill('storm_strike')){ const sk=SKILLS.find(s=>s.id==='storm_strike'); dmg=Math.floor(dmg*(1+(sk.dmgBonus?sk.dmgBonus():0))); }
  // Skill: frenzy
  if(hasSkill('frenzy')){ const sk=SKILLS.find(s=>s.id==='frenzy'); dmg=Math.floor(dmg*(1+(sk.dmgBonus?sk.dmgBonus():0))); }
  // Skill: berserk_rush
  if(G._berserkActive) dmg=Math.floor(dmg*2);
  G.lastDmg=dmg;
  return { dmg, isCrit, special:tMult>1 };
}

function stopTimers() {
  clearInterval(atkI);  atkI=null;
  clearInterval(tmrI);  tmrI=null;
  clearInterval(dpsI);  dpsI=null;
  clearInterval(berserkI); berserkI=null;
  // Also clear challenge interval
  if(typeof challengeInterval!=='undefined'&&challengeInterval){
    clearInterval(challengeInterval); challengeInterval=null;
  }
}

function startFight() {
  G.fights++;
  const eType=getEnemyType(G.stage);
  G.enemyType=eType.id;
  G.isBoss=eType.id==='boss';
  G.timeLimit=calcTimeLimit()+(G.isBoss?30:eType.id==='miniboss'?15:0);
  const baseHP=Math.floor(50*Math.pow(1.08,G.stage-1));
  const zone=typeof getZone==='function'?getZone(G.stage):{enemyMult:1};
  const scaledHP=typeof stageEnemyHP==='function'?stageEnemyHP(G.stage):baseHP;
  G.enemyMax=Math.floor(scaledHP*eType.hpMult*zone.enemyMult);
  G.enemyHP=G.enemyMax;
  G.timeEl=0; G.totalDmgFight=0; G.dpsAccum=0; G.dpsTimer=0;
  G.enemyPhased=false;
  G.bossPhasesDone=0;
  G.bossAtkMult=1;
  // Elite shield
  G.enemyShield=eType.id==='elite'?Math.floor(G.enemyMax*eType.shieldPct):0;
  G._berserkActive=false;
  if(typeof updateZoneBadge==='function') updateZoneBadge();

  // Stage modifier — every 7 stages roll a random modifier
  if(typeof STAGE_MODIFIERS!=='undefined'&&G.stage%7===0&&!G.isBoss){
    G.currentMod=STAGE_MODIFIERS[~~(Math.random()*STAGE_MODIFIERS.length)];
    G.stageModCount=(G.stageModCount||0)+1;
    log('🎲 关卡修正：'+G.currentMod.icon+' '+G.currentMod.name+' — '+G.currentMod.desc,'ev');
    notif(G.currentMod.icon+' '+G.currentMod.name);
    if(G.currentMod.shieldPct) G.enemyShield=Math.floor(G.enemyMax*G.currentMod.shieldPct);
    if(G.currentMod.apply) G.enemyMax=G.currentMod.apply(G.enemyMax);
    if(G.currentMod.applyTime) G.timeLimit=G.currentMod.applyTime(G.timeLimit);
    if(G.currentMod.hpMult) G.enemyMax=Math.floor(G.enemyMax*(G.currentMod.hpMult||1));
  } else if(G.stage%7!==0) { G.currentMod=null; }

  // Skill: revenge — activate effect
  SKILLS.filter(s=>G.skills.includes(s.id)&&s.onFightStart).forEach(s=>s.onFightStart());

  updateCombatUI();
  const sn=$('stage-name'), badge=$('combat-badge'), hpbar=$('hp-bar');
  if(G.isBoss){
    sn.innerHTML='<span style="color:var(--gold)">👑 BOSS · Stage '+G.stage+'</span>';
    badge.textContent='BOSS！'; badge.className='boss'; hpbar.className='bar-fill boss';
    log('━━ 👑 BOSS Stage '+G.stage+' HP:'+fmt(G.enemyMax)+' ━━','boss'); shake();
  } else if(eType.id==='elite'){
    sn.innerHTML='<span style="color:var(--rose)">⚠ 精英 · Stage '+G.stage+'</span>';
    badge.textContent='精英怪！'; badge.className='elite';
    log('━━ ⚠ 精英怪 Stage '+G.stage+' HP:'+fmt(G.enemyMax)+(G.enemyShield>0?' 护盾:'+fmt(G.enemyShield):'')+' ━━','ev');
  } else if(eType.id==='miniboss'){
    sn.innerHTML='<span style="color:var(--violet2)">💀 小Boss · Stage '+G.stage+'</span>';
    badge.textContent='小Boss！'; badge.className='boss';
    log('━━ 💀 小Boss Stage '+G.stage+' HP:'+fmt(G.enemyMax)+' ━━','ev');
  } else {
    const zone=typeof getZone==='function'?getZone(G.stage):{name:'',icon:'',enemyMult:1};
    G.currentZone=zone.name;
    sn.textContent=zone.icon+' Stage '+G.stage+(G.stage%25===0?' ⭐':'');
    badge.textContent='进攻中'; badge.className=''; hpbar.className='bar-fill';
    if(G.speed<=3) log('━━ '+zone.icon+zone.name+' Stage '+G.stage+' HP:'+fmt(G.enemyMax)+' ━━','sys');
  }
}

function restartCombat() { stopTimers(); startFight(); runTimers(); }

function runTimers() {
  // Guard: stop any existing timers first (prevents double-running)
  if(atkI||tmrI||dpsI) { stopTimers(); }
  // Multi-unit attack rotation
  const activeUnits = G.units?G.units.filter(u=>u.unlocked):[];
  const unitCount = Math.max(1, activeUnits.length);
  const atkMs=(1000/totalSpd())/G.speed;
  atkI=setInterval(()=>{
    if(G._timerGen!==_gen){ clearInterval(atkI); return; }
    if(G.enemyHP<=0) return;
    // Cycle through units
    G.activeUnit = (G.activeUnit||0) % unitCount;
    const currentUnit = activeUnits[G.activeUnit] || null;
    G.activeUnit++;
    const { dmg:baseDmg, isCrit, special } = calcDmg();
    let totalHit=baseDmg;

    // True damage talent
    if(T.id==='true_dmg'&&T.truePct) totalHit+=Math.floor(G.enemyMax*T.truePct);

    // Skill procs
    let skillLabel='';
    for(const id of G.skills){
      const sk=SKILLS.find(s=>s.id===id); if(!sk) continue;
      // Proc skills (slash, annihilate, lucky_strike, etc.)
      if(sk.onHit){
        const res=sk.onHit(totalHit);
        if(res&&res.proc){
          if(res.dmgMult){ const extra=Math.floor(totalAtk()*res.dmgMult); totalHit+=extra; skillLabel=res.label||''; }
          if(res.truePct) totalHit+=Math.floor(G.enemyMax*res.truePct);
          if(res.flatDmg) totalHit+=res.flatDmg;
        }
      }
      // Passive: pierce
      if(sk.id==='pierce'&&sk.truePct) totalHit+=Math.floor(G.enemyMax*sk.truePct);
      // Gold harvest
      if(sk.id==='gold_harvest'&&sk.onHit) sk.onHit();
    }

    // Handle elite shield
    if(G.enemyShield>0){
      const shieldDmg=Math.min(G.enemyShield,totalHit);
      G.enemyShield-=shieldDmg; totalHit-=shieldDmg;
      if(G.enemyShield<=0){ log('💢 护盾破碎！','ev'); G.enemyShield=0; }
    }

    // Apply damage
    G.enemyHP=Math.max(0,G.enemyHP-totalHit);
    G.totalDmgFight+=totalHit; G.totalDmg+=totalHit; G.dpsAccum+=totalHit;
    updateCombatUI();

    // Talent on hit
    if(T.onHit){ const mult=hasSkill('resonance')?2:1; for(let i=0;i<mult;i++) T.onHit(isCrit); }

    // Affix on hit/crit
    for(const it of Object.values(G.equipped)){
      if(!it||!it.affixes) continue;
      it.affixes.forEach(id=>{ const a=getAffix(id); if(a){ if(isCrit&&a.onCrit) a.onCrit(); if(a.onHit) a.onHit(); } });
    }

    // Skill: crit-based
    if(isCrit){
      SKILLS.filter(s=>G.skills.includes(s.id)&&s.onCrit).forEach(s=>s.onCrit(baseDmg));
      // Lucky chain: trigger random talent
      if(hasSkill('lucky_chain')&&Math.random()<0.05&&T.onHit) T.onHit(true);
      // Phantom
      if(hasSkill('phantom')&&SKILLS.find(s=>s.id==='phantom').onCrit()){
        const ex=Math.floor(totalAtk()*0.5); G.enemyHP=Math.max(0,G.enemyHP-ex);
        if(G.speed<=2) log('👻 幻影！-'+fmt(ex),'ev');
      }
    } else {
      SKILLS.filter(s=>G.skills.includes(s.id)&&s.onNormal).forEach(s=>s.onNormal());
    }

    // Destruction passives
    if(G.pb.judgement){
      G._judgeCtr=(G._judgeCtr||0)+1;
      if(G._judgeCtr>=G.pb.judgement){ G._judgeCtr=0; const jd=Math.floor(totalHit*3); G.enemyHP=Math.max(0,G.enemyHP-jd); G.totalDmgFight+=jd; if(G.speed<=3)log('⚡ 末日审判 -'+fmt(jd),'skill'); }
    }
    if(G.pb.godStrike){
      G._godCtr=(G._godCtr||0)+1;
      if(G._godCtr>=G.pb.godStrike){ G._godCtr=0; const gd=Math.floor(totalHit*50); G.enemyHP=Math.max(0,G.enemyHP-gd); G.totalDmgFight+=gd; log('✋ 神之一击 -'+fmt(gd),'skill'); }
    }
    if(G.pb.critTruePct&&isCrit){ const ct=Math.floor(G.enemyMax*G.pb.critTruePct); G.enemyHP=Math.max(0,G.enemyHP-ct); G.totalDmgFight+=ct; }
    if(G.pb.splitChance&&Math.random()<G.pb.splitChance){ const sd=Math.floor(totalHit); G.enemyHP=Math.max(0,G.enemyHP-sd); G.totalDmgFight+=sd; }
    if(G.pb.truePct){ const tp=Math.floor(G.enemyMax*(G.pb.truePct||0)); G.enemyHP=Math.max(0,G.enemyHP-tp); G.totalDmgFight+=tp; }
    // Team double hit synergy
    if(G.teamDoubleHit&&Math.random()<G.teamDoubleHit){
      const tdh=Math.floor(totalAtk()*0.7); G.enemyHP=Math.max(0,G.enemyHP-tdh);
      G.totalDmgFight+=tdh; G.totalDmg+=tdh;
    }
    // Passive: double hit
    if(G.pb.doubleHit&&Math.random()<G.pb.doubleHit){
      const ex=Math.floor(totalAtk()*0.6); G.enemyHP=Math.max(0,G.enemyHP-ex);
      G.totalDmgFight+=ex; G.totalDmg+=ex;
    }

    // Combo system — combo stacks multiply damage
    if(isCrit){
      G.combo++; if(G.combo>G.bestCombo) G.bestCombo=G.combo;
      if(G.combo>=5&&G.combo%5===0){ log('🔥 '+G.combo+'连暴击！伤害×'+(1+G.combo*0.05).toFixed(1),'combo'); }
      G.crits++; updateTaskProgress('crits',1);
    } else {
      if(G.combo>=10) log('💔 连击中断 '+G.combo+'连','sys');
      G.combo=0;
    }
    $('l-combo').textContent='×'+G.combo;
    // Apply combo bonus to totalHit retroactively
    if(G.combo>1) totalHit=Math.floor(totalHit*(1+Math.min(G.combo,50)*0.02));

    // Multi-phase boss system
    if(G.isBoss&&typeof BOSS_PHASE_CONFIG!=='undefined'){
      const phasedSoFar=G.bossPhasesDone||0;
      const remainingPhases=BOSS_PHASE_CONFIG.slice(phasedSoFar);
      for(const phase of remainingPhases){
        const threshold=G.enemyMax*(phase.at+(phasedSoFar*0.001)); // slight offset per phase
        if(G.enemyHP<=threshold&&G.enemyHP>0){
          G.bossPhasesDone=(G.bossPhasesDone||0)+1;
          G.bossAtkMult=(G.bossAtkMult||1)*phase.atkMult;
          if(phase.shieldPct) G.enemyShield=Math.floor(G.enemyMax*phase.shieldPct);
          if(phase.timeCut) G.timeLimit=Math.ceil(G.timeLimit*phase.timeCut);
          log(phase.msg,'boss'); notif(phase.name+'！','#c9a84c'); shake(); spawnParts('boss');
          break;
        }
      }
    }

    // Mini-boss regen
    if(G.enemyType==='miniboss'&&G.enemyHP>0){
      const regen=Math.floor(G.enemyMax*0.02);
      G.enemyHP=Math.min(G.enemyHP+regen,G.enemyMax);
    }

    spawnDmg(totalHit, isCrit, special||skillLabel!=='');
    if(skillLabel&&G.speed<=3) log(skillLabel+' -'+fmt(totalHit),'skill');
    else if(G.speed<=2){
      if(special) log('🌩 -'+fmt(totalHit),'ev');
      else if(isCrit) log('💥 暴击！-'+fmt(totalHit),'atk');
      else log('⚔ -'+fmt(totalHit),'atk');
    } else if(isCrit) log('💥 暴击！-'+fmt(totalHit),'atk');

    if(G.enemyHP<=0) onWin();
    updateStats();
  }, atkMs);

  // Timer
  const tms=1000/G.speed;
  const _gen=++G._timerGen; // generation counter - if changed, this timer is stale
  tmrI=setInterval(()=>{
    if(G._timerGen!==_gen){ clearInterval(tmrI); return; } // stale timer, self-destruct
    G.timeEl++; updateCombatUI();
    // Time erode talent
    if(T.id==='time_erode'&&T.tickPct){
      const td=Math.floor(G.enemyMax*T.tickPct);
      G.enemyHP=Math.max(0,G.enemyHP-td);
      G.totalDmgFight+=td; G.totalDmg+=td;
      if(G.speed<=2) log('🌀 时间侵蚀 -'+fmt(td),'ev');
      if(G.enemyHP<=0){ onWin(); return; }
    }
    const half=Math.floor(G.timeLimit/2);
    if(G.timeEl===half){ $('combat-badge').textContent='危险！'; $('combat-badge').className='danger'; }
    if(G.timeEl>=G.timeLimit&&G.enemyHP>0) onLose();
  }, tms);

  // DPS
  dpsI=setInterval(()=>{
    G.dpsTimer++;
    if(G.dpsTimer>=1){
      G.currentDPS=Math.floor(G.dpsAccum/G.dpsTimer);
      $('l-dps').textContent=fmt(G.currentDPS);
      $('l-dps-card')&&($('l-dps-card').textContent=fmt(G.currentDPS));
      // Gold per sec passive
      if(G.pb&&G.pb.goldPerSec){ G.gold+=Math.floor(G.stage*2+1); }
    }
  }, 1000/G.speed);

  // Berserk rush skill
  if(hasSkill('berserk_rush')){
    const berserkMs=15000/G.speed;
    berserkI=setInterval(()=>{
      G._berserkActive=true;
      log('😤 狂暴冲刺激活！ATK×2持续3秒','skill');
      setTimeout(()=>{ G._berserkActive=false; }, 3000/G.speed);
    }, berserkMs);
  }
  // Unit sync skill - all units attack together every 30 sec
  if(hasSkill('unit_sync')){
    setInterval(()=>{
      if(G.enemyHP<=0) return;
      const units=(G.units||[]).filter(u=>u.unlocked);
      if(units.length<2) return;
      let syncDmg=0;
      units.forEach(u=>{ syncDmg+=unitAtk(u); });
      syncDmg=Math.floor(syncDmg*(1+totalCritDmg()/100));
      G.enemyHP=Math.max(0,G.enemyHP-syncDmg);
      G.totalDmgFight+=syncDmg; G.totalDmg+=syncDmg;
      log('🔗 单位同步！全队齐攻 -'+fmt(syncDmg),'skill');
      spawnDmg(syncDmg,true,true);
      if(G.enemyHP<=0) onWin();
    }, 30000/G.speed);
  }
  // Mana burst skill - fires at 30s mark
  if(hasSkill('mana_burst')){
    const mbMs=30000/G.speed;
    setTimeout(()=>{
      const sk=SKILLS.find(s=>s.id==='mana_burst');
      if(sk&&!sk.state.fired&&G.enemyHP>0){
        sk.state.fired=true;
        const mbDmg=Math.floor(totalAtk()*10);
        G.enemyHP=Math.max(0,G.enemyHP-mbDmg);
        G.totalDmgFight+=mbDmg; G.totalDmg+=mbDmg;
        log('💜 魔力爆发！-'+fmt(mbDmg),'skill');
        spawnDmg(mbDmg,true,true); shake();
        if(G.enemyHP<=0) onWin();
      }
    }, mbMs);
  }
}

function updateCombatUI() {
  const hpP=Math.max(0,G.enemyHP/G.enemyMax*100);
  const tP=Math.max(0,(G.timeLimit-G.timeEl)/G.timeLimit*100);
  $('hp-bar').style.width=hpP+'%';
  $('hp-txt').textContent=fmt(G.enemyHP)+' / '+fmt(G.enemyMax);
  $('time-bar').style.width=tP+'%';
  $('time-txt').textContent=(G.timeLimit-G.timeEl)+'s';
  $('tdmg').textContent=fmt(G.totalDmgFight);
  const shBar=$('shield-bar-row');
  if(shBar){ shBar.style.display=G.enemyShield>0?'flex':'none'; if(G.enemyShield>0){ $('shield-bar').style.width=Math.max(0,G.enemyShield/G.enemyMax*100)+'%'; $('shield-txt').textContent=fmt(G.enemyShield); } }
  // Build meters
  try{
    if(G.gear){
      const hasSpdPath=Object.values(G.gear).some(g=>g.pathId==='w_spd'||g.pathId==='l_spd');
      const spdRow=$('spd-stack-row');
      if(spdRow){ spdRow.style.display=hasSpdPath?'flex':'none';
        if(hasSpdPath){ $('spd-stack-count').textContent=G._spdStack||0; } }

      const hasCritPath=Object.values(G.gear).some(g=>g.pathId==='h_crit'||g.pathId==='l_crit');
      const critRow=$('crit-chain-row');
      if(critRow){ critRow.style.display=hasCritPath?'flex':'none';
        if(hasCritPath){
          const chain=G._critChain||0;
          $('crit-chain-count').textContent='×'+(1+chain*0.15).toFixed(1);
          const dots=$('crit-chain-dots');
          if(dots){ dots.innerHTML=''; for(let i=0;i<Math.min(chain,10);i++){ const d=document.createElement('div'); d.style.cssText='width:6px;height:6px;border-radius:50%;background:var(--gold2);'; dots.appendChild(d); } }
        }
      }

      const hasAtkPath=Object.values(G.gear).some(g=>g.pathId==='w_atk'||g.pathId==='b_atk');
      const atkRow=$('atk-burst-row');
      if(atkRow){ atkRow.style.display=hasAtkPath?'flex':'none';
        if(hasAtkPath){
          const atkPathLv=Math.max(0,...Object.values(G.gear).filter(g=>g.pathId==='w_atk'||g.pathId==='b_atk').map(g=>g.pathLv||0));
          const burstEvery=Math.max(3,5-Math.floor(atkPathLv/20));
          const cnt=G._atkHitCount||0;
          $('atk-burst-meter').style.width=(cnt/burstEvery*100)+'%';
          $('atk-burst-label').textContent=cnt+'/'+burstEvery;
        }
      }
    }
  }catch(e){}
}

function onWin() {
  stopTimers();
  G._spdStack=0;
  G._critChain=0;
  G._atkHitCount=0;
  G._isBurst=false;
  // Reset unit combos
  if(G.units) G.units.forEach(u=>{ u.combo=0; u.hitCount=0; });
  G.wins++; G.streak++; G.combo=0;
  if(G.streak>G.bestStreak) G.bestStreak=G.streak;
  const eType=getEnemyType(G.stage);

  if(G.isBoss){ G.bossKills++; shake(); spawnParts('boss'); log('👑 BOSS击杀！Stage '+G.stage,'boss'); notif('👑 Boss 击杀！'); }
  else if(G.enemyType==='miniboss') log('💀 小Boss击杀！Stage '+G.stage,'ev');
  else log('✅ Stage '+G.stage+' 胜利！连胜'+G.streak+(G.streak>=5?'🔥':''),'win');

  // Explosion skill: on kill
  if(hasSkill('explosion')){ const sk=SKILLS.find(s=>s.id==='explosion'); const exDmg=sk.onKill(G.enemyMax); log('💣 爆裂！+'+fmt(exDmg)+'奖励伤害','skill'); }

  // Affix on kill
  for(const it of Object.values(G.equipped)){
    if(it&&it.affixes) it.affixes.forEach(id=>{ const a=getAffix(id); if(a&&a.onKill){ const extra=a.onKill(G.enemyMax); G.totalDmg+=extra||0; } });
  }

  // Talent on win
  if(T.onWin){ const mult=hasSkill('resonance')?2:1; for(let i=0;i<mult;i++) T.onWin(); }
  SKILLS.filter(s=>G.skills.includes(s.id)&&s.onWin).forEach(s=>s.onWin());

  // Affix warlord
  for(const it of Object.values(G.equipped)){
    if(it&&it.affixes) it.affixes.forEach(id=>{ const a=getAffix(id); if(a&&a.onWin){ a.onWin(); log('👑 霸主：ATK+3','ev'); } });
  }

  // Gold
  const streakBonus=1+Math.min(G.streak*0.02,0.5);
  let gMult=1+(G.pb.goldMult||0)+(G._goldPctBonus||0)/100;
  if(T.goldMult) gMult*=T.goldMult;
  const earlyGold = G.stage<20?3:G.stage<50?2:1;
  const g=Math.floor(G.stage*8*(1+Math.random())*eType.gMult*gMult*streakBonus*earlyGold);
  G.gold+=g; G.goldEarned+=g;
  log('💰 +'+fmt(g)+(G.streak>=5?' (连胜+'+Math.floor((streakBonus-1)*100)+'%)':''),'loot');
  pop('s-gold');
  updateTaskProgress('goldEarned', g);

  gainExp(Math.floor(G.stage*(G.isBoss?5:2)*eType.gMult));

  // ── NEW: Drop upgrade materials (no item drops) ──
  // Early stages drop more mats to get players going
  const matMult = G.stage<20?3:G.stage<50?2:1;
  for(let m=0;m<matMult;m++) dropUpgradeMats(G.stage, G.isBoss, G.enemyType);
  // Elite bonus mats
  if(G.enemyType==='elite'){
    G.upgMats.atk_stone=(G.upgMats.atk_stone||0)+2;
    G.upgMats.crit_stone=(G.upgMats.crit_stone||0)+2;
    G.upgMats.spd_stone=(G.upgMats.spd_stone||0)+1;
  }
  // Boss: guaranteed boss_core drop
  if(G.isBoss){
    const bCores = 2+Math.floor(G.stage/10);
    G.upgMats.boss_core=(G.upgMats.boss_core||0)+bCores;
    log('💀 Boss核心 ×'+bCores,'loot');
    // Earn gacha crystals from boss kills
    const crystalEarn = 5+Math.floor(G.stage/10)*2;
    earnGachaCrystals(crystalEarn);
    if(G.stage%10===0) log('💠 +'+crystalEarn+' 传说水晶','loot');
    // Rune drop from boss
    if(typeof RUNES!=='undefined'&&Math.random()<RUNE_DROP_CHANCE){
      const tier = G.stage<50?1:G.stage<200?2:G.stage<500?3:4;
      const pool = RUNES.filter(r=>r.tier<=tier);
      const rune = pool[~~(Math.random()*pool.length)];
      if(rune){
        if(!G.runeInventory) G.runeInventory=[];
        G.runeInventory.push(rune.id);
        log('✨ 符文掉落：'+rune.icon+' '+rune.name+' ('+rune.desc+')','loot');
        notif('✨ 符文：'+rune.name);
      }
    }
    // Weekly boss check + auto-start
    const thisWeek=getWeekKey();
    if(G.stage>=10&&G.stage%25===0&&G.lastWeeklyBoss!==thisWeek&&typeof WEEKLY_BOSS_STAGES!=='undefined'){
      const wb=WEEKLY_BOSS_STAGES.slice().reverse().find(b=>G.stage>=b.minStage);
      if(wb){
        G.lastWeeklyBoss=thisWeek;
        log('👹 周常Boss '+wb.icon+' '+wb.name+' 出现！','boss');
        notif('👹 '+wb.name+' 出现！','#c9a84c');
        setTimeout(()=>startWeeklyBoss(wb), 1500/G.speed);
      }
    }
    if(G.stage>=30&&Math.random()<0.15){
      G.upgMats.mythic_shard=(G.upgMats.mythic_shard||0)+1;
      log('🌠 神话碎片 ×1','loot');
    }
  }

  G.stage++;
  if(G.stage>G.best) G.best=G.stage;
  checkMilestone(G.stage-1);
  pop('s-stage'); updateStats(); checkAchs();
  if(typeof updatePersonalBests==='function') updatePersonalBests();
  if(typeof showGachaTabIfUnlocked==='function') showGachaTabIfUnlocked();
  if(typeof showDungeonTabIfUnlocked==='function') showDungeonTabIfUnlocked();
  updateTaskProgress('wins',1);
  updateTaskProgress('bossKills', G.isBoss?1:0);
  updateTaskProgress('stage', G.stage);

  recalcSets(); renderEquip();
  // Update equip tab indicator
  try{
    const dot=$('equip-dot');
    if(dot){
      const hasUpgrade=G.gear&&Object.values(G.gear).some(g=>{
        if(!g.pathId) return true; // path not chosen yet
        const paths=GEAR_PATHS[g.slot];
        const path=paths&&paths.find(p=>p.id===g.pathId);
        if(!path) return false;
        const lv=g.pathLv||0;
        if(lv>=path.levels.length) return false;
        return (G.upgMats[path.mat]||0)>=(path.levels[lv].cost||1);
      });
      dot.style.display=hasUpgrade?'inline-block':'none';
    }
  }catch(e){}
  setTimeout(()=>{ startFight(); runTimers(); }, Math.max(150,500/G.speed));
}

function onLose() {
  stopTimers(); G.combo=0;
  // No-retreat passives (eternal_will skill + endurance passive)
  const noRetroChance=(hasSkill('eternal_will')?SKILLS.find(s=>s.id==='eternal_will').noRetrocChance:0)+(G.pb.noRetro||0);
  if(noRetroChance>0&&Math.random()<noRetroChance){
    log('🛡 永恒意志！不退关，重新挑战','skill');
    G.streak=0; G.fights++;
    startFight(); runTimers(); return;
  }
  // Revenge skill
  SKILLS.filter(s=>G.skills.includes(s.id)&&s.onLose).forEach(s=>s.onLose());
  log('❌ 失败 Stage '+G.stage,'lose');
  G.streak=0;
  if(G.stage>1){ G.stage--; pop('s-stage'); }
  updateStats();
  setTimeout(()=>{ startFight(); runTimers(); }, Math.max(150,500/G.speed));
}

// ── UI UPDATE ─────────────────────────────────────────────────
function updateStats() {
  $('s-gold').textContent=fmt(G.gold);
  $('s-level').textContent=G.level;
  $('s-stage').textContent=G.stage;
  $('s-atk').textContent=fmt(totalAtk());
  $('s-spd').textContent=totalSpd().toFixed(1);
  $('s-crit').textContent=totalCrit().toFixed(1)+'%';
  $('s-cdmg').textContent=totalCritDmg()+'%';
  $('s-exp').textContent=G.exp+'/'+fmt(G.expNeed);
  $('l-combo').textContent='×'+G.combo;
  $('l-streak').textContent=G.streak+(G.streak>=5?'🔥':'');
  $('l-power')&&($('l-power').textContent=fmt(powerScore()));
  // Show cheapest available upgrade cost as a hint
  try{
    if(G.gear){
      let minCost=Infinity, minMat='';
      for(const g of Object.values(G.gear)){
        const paths=GEAR_PATHS[g.slot];
        if(!g.pathId){ minCost=0; minMat='选路线'; break; }
        const path=paths&&paths.find(p=>p.id===g.pathId);
        if(!path) continue;
        const lv=g.pathLv||0;
        if(lv>=path.levels.length) continue;
        const cost=path.levels[lv].cost;
        const have=G.upgMats[path.mat]||0;
        if(cost<minCost){ minCost=cost; minMat=UPGRADE_MATS[path.mat].icon+cost; }
      }
      const hint=$('upgrade-hint');
      if(hint) hint.textContent=minCost===0?'⬆ 选路线':minCost===Infinity?'✅ 全满':'下次强化: '+minMat;
    }
  }catch(e){}
  // Full stats
  $('d-atk')&&($('d-atk').textContent=fmt(totalAtk()));
  $('d-atk-b')&&($('d-atk-b').textContent=fmt(G.baseAtk)+'/'+fmt(G.eqAtk)+'/'+fmt(Math.floor(G.tAtk)));
  $('d-spd')&&($('d-spd').textContent=totalSpd().toFixed(2)+'/'+spdCap().toFixed(1));
  $('d-crit')&&($('d-crit').textContent=totalCrit().toFixed(1)+'%/'+totalCritDmg()+'%');
  $('d-time')&&($('d-time').textContent=calcTimeLimit()+'s');
  $('d-stage')&&($('d-stage').textContent=G.stage+' / '+G.best);
  $('d-rec')&&($('d-rec').textContent=G.bestStreak+' / '+G.bestCombo);
  $('d-dmg')&&($('d-dmg').textContent=fmt(G.totalDmg));
  $('d-fights')&&($('d-fights').textContent=G.fights+'/'+G.wins+'/'+G.bossKills);
  $('d-leg')&&($('d-leg').textContent=G.legCount+'传说 / '+G.mythCount+'神话');
  $('d-awk')&&($('d-awk').textContent=G.awakenings+'次觉醒');
  $('d-power')&&($('d-power').textContent=fmt(powerScore()));
  // Materials
  $('m-c')&&($('m-c').textContent=G.mats.common||0);
  $('m-r')&&($('m-r').textContent=G.mats.rare||0);
  $('m-e')&&($('m-e').textContent=G.mats.epic||0);
  $('inv-ct')&&($('inv-ct').textContent=G.inventory.length);
  // Currencies
  $('cur-reforge')&&($('cur-reforge').textContent=G.currencies.reforge||0);
  $('cur-essence')&&($('cur-essence').textContent=G.currencies.essence||0);
  $('cur-catalyst')&&($('cur-catalyst').textContent=G.currencies.catalyst||0);
  // Train/rest cost hints
  try{
    const tc=$('train-cost-hint'); if(tc&&typeof trainCost==='function') tc.textContent='花费 '+fmt(trainCost())+' 金';
    const rc=$('rest-cost-hint');  if(rc&&typeof restCost==='function')  rc.textContent='花费 '+fmt(restCost())+' 金';
    const sg=$('shop-gold-display'); if(sg) sg.textContent=fmt(G.gold);
  }catch(e){}
  // Title + auto-upgrade UI (in index.html)
  if(typeof updateAutoUpgUI==='function') updateAutoUpgUI();
  if(typeof updateActiveTitle==='function') updateActiveTitle();
}

// ── SPEED / AUTO ──────────────────────────────────────────────
function setSpd(n, btn) {
  G.speed=n;
  document.querySelectorAll('.spd-btn').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  restartCombat();
  if(G.autoTrain){ clearInterval(autoTrI); autoTrI=setInterval(()=>doTrain(),2000/G.speed); }
  if(G.autoRest){ clearInterval(autoReI); autoReI=setInterval(()=>doRest(),5000/G.speed); }
}
let autoTrI=null, autoReI=null;
function toggleAuto(type) {
  if(type==='train'){
    G.autoTrain=!G.autoTrain; $('atb-train').classList.toggle('on',G.autoTrain);
    if(G.autoTrain) autoTrI=setInterval(()=>doTrain(),2000/G.speed);
    else clearInterval(autoTrI);
  } else {
    G.autoRest=!G.autoRest; $('atb-rest').classList.toggle('on',G.autoRest);
    if(G.autoRest) autoReI=setInterval(()=>doRest(),5000/G.speed);
    else clearInterval(autoReI);
  }
}

// ── INIT ─────────────────────────────────────────────────────
function initGame() {
  try {
    const loaded=loadGame();
    initGear();
    initTasks();
    updateStats(); updateSpecPill(); renderSpecCards();
    try{ refreshShop(true); }catch(e){ console.warn('shop',e); }
    try{ renderPassive(); }catch(e){ console.warn('passive',e); }
    try{ renderSkills(); }catch(e){ console.warn('skills',e); }
    try{ renderTasks(); }catch(e){ console.warn('tasks',e); }
    log('欢迎来到 CHRONICLE','sys');
    if(loaded){
      log('✅ 存档读取，继续冒险！','win');
    } else {
      log('天赋：'+T.icon+' '+T.name,'ev');
      log('每10关Boss · 每5关精英怪 · 装备页选择强化路线','sys');
    }
    startFight(); runTimers(); checkAchs();
    if(typeof showGachaTabIfUnlocked==='function') showGachaTabIfUnlocked();
  if(typeof showDungeonTabIfUnlocked==='function') showDungeonTabIfUnlocked();
  } catch(e) {
    console.error('initGame crash:', e);
    // Log error but NEVER auto-reset - let player decide
    try{ log('⚠ 初始化错误: '+e.message,'sys'); }catch(_){}
  }
}
