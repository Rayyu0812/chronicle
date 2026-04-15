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
  // Skill: blood_rage stacks
  if(hasSkill('blood_rage')){ const sk=SKILLS.find(s=>s.id==='blood_rage'); a=Math.floor(a*(1+(sk.atkBonus?sk.atkBonus():0))); }
  // Skill: bloodlust
  if(hasSkill('bloodlust')){ const sk=SKILLS.find(s=>s.id==='bloodlust'); a=Math.floor(a*(1+(sk.atkBonus?sk.atkBonus():0))); }
  // Skill: limit_break
  if(hasSkill('limit_break')){ const sk=SKILLS.find(s=>s.id==='limit_break'); a=Math.floor(a*(1+(sk.atkBonus?sk.atkBonus():0))); }
  // Skill: battle_will
  if(hasSkill('battle_will')){ const sk=SKILLS.find(s=>s.id==='battle_will'); a=Math.floor(a*(1+(sk.atkBonus?sk.atkBonus():0))); }
  // Skill: revenge
  if(hasSkill('revenge')){ const sk=SKILLS.find(s=>s.id==='revenge'); a=Math.floor(a*(1+(sk.atkBonus?sk.atkBonus():0))); }
  // Skill: tyrant
  if(hasSkill('tyrant')){ const sk=SKILLS.find(s=>s.id==='tyrant'); a=Math.floor(a*(1+(sk.atkBonus?sk.atkBonus():0))); }
  // Skill: frenzy extra dmg bonus handled in calcDmg
  // Overload talent
  if(T.id==='overload') {} // SPD bonus handled in totalSpd
  // Berserk rush active
  if(G._berserkActive) a=Math.floor(a*2);
  // Resonance doubles talent atk bonus
  if(hasSkill('resonance')) a += Math.floor(G.tAtk); // double tAtk
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
  return Math.min(+(s.toFixed(2)), spdCap());
}

function totalCrit() {
  let c = G.critChance + G.eqCrit + (G.tCrit||0) + G.setBonusCrit - (G.tCritPen||0);
  for(const b of (G.awakeningBonuses||[])) c+=b.critBonus||0;
  return Math.max(0, c);
}

function totalCritDmg() {
  let c = G.critDmg + G.eqCritDmg + (G.spec==='crit'?50:0);
  // Shadow set 4pc
  if(setCount('shadow')>=4) c+=100;
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
  // Time ctrl skill
  if(hasSkill('time_ctrl')) t+=30;
  // Passive s4
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

function flash(id) { const e=$(id); e.classList.remove('show'); void e.offsetWidth; e.classList.add('show'); }
function flashLegendary(name) { $('fl-leg').innerHTML='⭐ 传说装备 ⭐<br><span style="font-size:.85rem">'+name+'</span>'; flash('flash-legend'); }
function flashMythic(name)    { $('fl-myth').innerHTML='🌠 神话装备 🌠<br><span style="font-size:.85rem">'+name+'</span>'; flash('flash-myth'); }
function flashEpic(name)      { $('fl-epic').innerHTML='💜 史诗装备<br><span style="font-size:.75rem">'+name+'</span>'; flash('flash-epic'); }
function flashLvl()           { flash('flash-lvl'); }
function flashMS(txt)         { $('fl-ms').textContent=txt; flash('flash-ms'); }
function flashCombo(n)        { $('fl-combo').textContent=n+'连击!!'; flash('flash-combo'); }
function flashAwaken()        { flash('flash-awaken'); }

function spawnDmg(dmg, isCrit, isSpecial) {
  if(G.speed>5) return;
  const l=$('fx');
  const d=document.createElement('div');
  d.className='fdmg '+(isSpecial?'sp':isCrit?'c':'n');
  d.textContent=(isCrit?'💥':'')+(isSpecial?'⚡':'')+fmt(dmg);
  d.style.left=Math.floor(10+Math.random()*75)+'%';
  d.style.top=Math.floor(30+Math.random()*30)+'%';
  l.appendChild(d); setTimeout(()=>d.remove(),900);
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

// ── OFFLINE GAINS ─────────────────────────────────────────────
function processOffline() {
  const now = Date.now();
  const elapsed = Math.min((now - (G.lastSeen||now)) / 1000, 3600*8); // max 8 hours
  if(elapsed < 30) return;
  const minutes = Math.floor(elapsed/60);
  const goldRate = totalAtk() * totalSpd() * 0.5;
  const offlineGold = Math.floor(goldRate * elapsed * 0.1);
  if(offlineGold > 0) {
    G.gold += offlineGold;
    G.mats.common += Math.floor(elapsed/300); // 1 mat per 5 minutes
    G.mats.rare += Math.floor(elapsed/900);   // 1 mat per 15 minutes
    setTimeout(()=>{
      openModal('💤 离线收益',
        `你离开了 ${minutes} 分钟\n\n获得：\n💰 ${fmt(offlineGold)} 金币\n🪨 ${Math.floor(elapsed/300)} 普通碎片\n💎 ${Math.floor(elapsed/900)} 稀有碎片`,
        [{ label:'确认', cls:'m-ok', cb:closeModal }]);
    }, 1000);
  }
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
    if(it.rar==='mythic'){G.mythCount++;flashMythic(it.name);spawnParts('mythic');}
    else if(it.rar==='legendary'){G.legCount++;flashLegendary(it.name);spawnParts('legendary');}
    else if(it.rar==='epic') flashEpic(it.name);
    updateTaskProgress('itemsGot',1);
  }
  recalcSets(); renderEquip(); checkAchs();
}

// ── EQUIPMENT ────────────────────────────────────────────
// ── NEW GEAR UPGRADE SYSTEM ───────────────────────────────────
function initGear() {
  if(!G.gear) G.gear = makeInitialGear();
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
    log(SLOT_ICON[slot]+' '+g.name+' Lv.'+g.pathLv+' → '+rarInfo.name+' ['+Object.entries(lvData).filter(([k])=>k!=='cost').map(([k,v])=>k.toUpperCase()+'+'+v).join(' ')+']','ev');
    checkAchs();
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
  // Sum up all gear stats
  for(const g of Object.values(G.gear)) {
    G.eqAtk   += g.totalAtk  || 0;
    G.eqSpd   += g.totalSpd  || 0;
    G.eqCrit  += g.totalCrit || 0;
    G.eqCritDmg += g.totalCdmg || 0;
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
  // Update rarity based on path level
  const rarInfo = gearRarity(g.pathLv||0);
  g.rar = rarInfo.rar;
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
  if(tar==='legendary'){G.legCount++;flashLegendary(it.name);spawnParts('legendary');}
  else if(tar==='epic') flashEpic(it.name);
  checkAchs(); renderEquip(); updateStats();
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
  flashAwaken();
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
  const m=MILESTONES.find(x=>x.stage===stage);
  if(!m||G.milestonesDone.includes(stage)) return;
  G.milestonesDone.push(stage);
  if(m.atk)     G.bonusAtk+=m.atk;
  if(m.spd)     G.atkSpd=Math.min(+(G.atkSpd+m.spd).toFixed(1),spdCap());
  if(m.crit)    G.critChance+=m.crit;
  if(m.cdmg)    G.critDmg+=m.cdmg;
  if(m.atkMult) G.baseAtk=Math.floor(G.baseAtk*m.atkMult);
  log('🏆 里程碑 Stage '+stage+'！'+m.desc,'ms');
  flashMS('🏆 Stage '+stage+'\n'+m.desc);
  updateStats();
}

// ── ACHIEVEMENTS ─────────────────────────────────────────────
function checkAchs() {
  ACHS.forEach(a=>{
    if(!G.achs.includes(a.id)&&a.f()){
      G.achs.push(a.id); notif('🏅 '+a.n); log('🏅 成就：'+a.n,'ach');
    }
  });
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
function doTrain() {
  G.trainN++;
  let g=Math.ceil(totalAtk()*.05+1)+(G.pb.trainFlat||0);
  if(G.spec==='atk') g=Math.ceil(g*2*(1+(G.pb.trainAtkMult||0)));
  else g=Math.ceil(g*(1+(G.pb.trainAtkMult||0)));
  // Resonance doubles talent bonuses on train
  if(hasSkill('resonance')&&T.onTrain) g*=2;
  G.baseAtk+=g;
  if(T.onTrain) T.onTrain();
  // Battle will skill
  SKILLS.filter(s=>G.skills.includes(s.id)&&s.onTrain).forEach(s=>s.onTrain());
  const sGain=G.spec==='spd'?0.2:0.1;
  let sLine='';
  if(G.trainN%5===0){ G.atkSpd=Math.min(+(G.atkSpd+sGain).toFixed(1),spdCap()); sLine=' SPD+'+sGain; pop('s-spd'); restartCombat(); }
  if(G.trainN%10===0){ G.critChance=Math.min(G.critChance+1,200); if(G.speed<=3) log('🎯 Crit+1%','ev'); pop('s-crit'); }
  if(G.speed<=3) log('🏋 Train#'+G.trainN+' ATK+'+g+sLine,'ev');
  pop('s-atk'); updateStats(); checkAchs();
  updateTaskProgress('trainN',1);
}
function doRest() {
  const evs=[
    ()=>{ const b=Math.floor(G.stage*10+G.level*5); G.gold+=b; log('✨ 宝藏 +'+fmt(b)+'金','ev'); pop('s-gold'); },
    ()=>{ const b=Math.ceil(G.baseAtk*.1); G.baseAtk+=b; log('✨ 冥想 ATK+'+b,'ev'); pop('s-atk'); },
    ()=>{ gainExp(G.expNeed*2); log('✨ 领悟 大量EXP','ev'); },
    ()=>{ G.critDmg+=10; log('✨ 专注 CritDmg+10%','ev'); pop('s-cdmg'); },
    ()=>{ G.mats.common=(G.mats.common||0)+2; log('✨ 拾取 普通碎片×2','ev'); },
    ()=>{ G.critChance+=1; log('✨ 顿悟 Crit+1%','ev'); pop('s-crit'); },
    ()=>{ if(G.gems.length<20) gainRandomGem(); },
  ];
  evs[~~(Math.random()*evs.length)]();
  updateStats();
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
    flashLvl(); pop('s-level'); pop('s-atk');
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

function calcDmg() {
  let dmg=totalAtk();
  const pct=G.enemyMax>0?G.enemyHP/G.enemyMax:1;
  // Executioner talent
  if(T.id==='executioner'&&T.dmgMult) dmg=Math.floor(dmg*T.dmgMult(pct));
  // Affix: thunder
  let tMult=1;
  for(const it of Object.values(G.equipped)){
    if(it&&it.affixes) for(const id of it.affixes){ const a=getAffix(id); if(a&&a.dmgMult) tMult=Math.max(tMult,a.dmgMult()); }
  }
  // Passive demolish
  if(G.pb.demolish&&Math.random()<G.pb.demolish) tMult=Math.max(tMult,3);
  const isCrit=Math.random()*100<totalCrit();
  if(isCrit) dmg=Math.floor(dmg*(totalCritDmg()/100));
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

function stopTimers() { clearInterval(atkI); clearInterval(tmrI); clearInterval(dpsI); clearInterval(berserkI); }

function startFight() {
  G.fights++;
  const eType=getEnemyType(G.stage);
  G.enemyType=eType.id;
  G.isBoss=eType.id==='boss';
  G.timeLimit=calcTimeLimit()+(G.isBoss?30:eType.id==='miniboss'?15:0);
  const baseHP=Math.floor(50*Math.pow(1.08,G.stage-1));
  G.enemyMax=Math.floor(baseHP*eType.hpMult);
  G.enemyHP=G.enemyMax;
  G.timeEl=0; G.totalDmgFight=0; G.dpsAccum=0; G.dpsTimer=0;
  G.enemyPhased=false;
  // Elite shield
  G.enemyShield=eType.id==='elite'?Math.floor(G.enemyMax*eType.shieldPct):0;
  G._berserkActive=false;

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
    sn.textContent='Stage '+G.stage+(G.stage%25===0?' ⭐':'');
    badge.textContent='进攻中'; badge.className=''; hpbar.className='bar-fill';
    if(G.speed<=3) log('━━ Stage '+G.stage+' HP:'+fmt(G.enemyMax)+' ━━','sys');
  }
}

function restartCombat() { stopTimers(); startFight(); runTimers(); }

function runTimers() {
  const atkMs=(1000/totalSpd())/G.speed;
  atkI=setInterval(()=>{
    if(G.enemyHP<=0) return;
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

    // Passive: double hit
    if(G.pb.doubleHit&&Math.random()<G.pb.doubleHit){
      const ex=Math.floor(totalAtk()*0.6); G.enemyHP=Math.max(0,G.enemyHP-ex);
      G.totalDmgFight+=ex; G.totalDmg+=ex;
    }

    // Combo system
    if(isCrit){
      G.combo++; if(G.combo>G.bestCombo) G.bestCombo=G.combo;
      if(G.combo>=5&&G.combo%5===0){ log('🔥 '+G.combo+'连暴击','combo'); flashCombo(G.combo); }
      G.crits++; updateTaskProgress('crits',1);
    } else { G.combo=0; }
    $('l-combo').textContent='×'+G.combo;

    // Boss phase at 50% HP
    if(G.isBoss&&!G.enemyPhased&&G.enemyHP<=G.enemyMax*0.5){
      G.enemyPhased=true;
      G.enemyMax=Math.floor(G.enemyMax*1.5); // boss gets stronger
      log('👑 BOSS进入狂暴阶段！HP和ATK大幅提升！','boss');
      notif('👑 Boss狂暴！');
      shake();
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
  tmrI=setInterval(()=>{
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
    if(G.dpsTimer>=1){ G.currentDPS=Math.floor(G.dpsAccum/G.dpsTimer); $('l-dps').textContent=fmt(G.currentDPS); }
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
}

function updateCombatUI() {
  const hpP=Math.max(0,G.enemyHP/G.enemyMax*100);
  const tP=Math.max(0,(G.timeLimit-G.timeEl)/G.timeLimit*100);
  $('hp-bar').style.width=hpP+'%';
  $('hp-txt').textContent=fmt(G.enemyHP)+' / '+fmt(G.enemyMax);
  $('time-bar').style.width=tP+'%';
  $('time-txt').textContent=(G.timeLimit-G.timeEl)+'s';
  $('tdmg').textContent=fmt(G.totalDmgFight);
  // Shield bar
  const shBar=$('shield-bar-row');
  if(shBar){ shBar.style.display=G.enemyShield>0?'flex':'none'; if(G.enemyShield>0){ $('shield-bar').style.width=Math.max(0,G.enemyShield/G.enemyMax*100)+'%'; $('shield-txt').textContent=fmt(G.enemyShield); } }
}

function onWin() {
  stopTimers();
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
  const g=Math.floor(G.stage*5*(1+Math.random())*eType.gMult*gMult*streakBonus);
  G.gold+=g; G.goldEarned+=g;
  log('💰 +'+fmt(g)+(G.streak>=5?' (连胜+'+Math.floor((streakBonus-1)*100)+'%)':''),'loot');
  pop('s-gold');
  updateTaskProgress('goldEarned', g);

  gainExp(Math.floor(G.stage*(G.isBoss?5:2)*eType.gMult));

  // ── NEW: Drop upgrade materials (no item drops) ──
  dropUpgradeMats(G.stage, G.isBoss, G.enemyType);
  // Elite bonus mats
  if(G.enemyType==='elite'){
    G.upgMats.atk_stone=(G.upgMats.atk_stone||0)+1;
    G.upgMats.crit_stone=(G.upgMats.crit_stone||0)+1;
  }
  // Boss: guaranteed boss_core drop
  if(G.isBoss){
    const bCores = 1+Math.floor(G.stage/20);
    G.upgMats.boss_core=(G.upgMats.boss_core||0)+bCores;
    log('💀 Boss核心 ×'+bCores,'loot');
    if(G.stage>=50&&Math.random()<0.1){
      G.upgMats.mythic_shard=(G.upgMats.mythic_shard||0)+1;
      log('🌠 神话碎片 ×1','loot');
    }
  }

  G.stage++;
  if(G.stage>G.best) G.best=G.stage;
  checkMilestone(G.stage-1);
  pop('s-stage'); updateStats(); checkAchs();
  updateTaskProgress('wins',1);
  updateTaskProgress('bossKills', G.isBoss?1:0);
  updateTaskProgress('stage', G.stage);

  recalcSets(); renderEquip();
  setTimeout(()=>{ startFight(); runTimers(); }, Math.max(150,500/G.speed));
}

function onLose() {
  stopTimers(); G.combo=0;
  // Eternal will skill: 30% chance no retreat
  if(hasSkill('eternal_will')&&Math.random()<SKILLS.find(s=>s.id==='eternal_will').noRetrocChance){
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
  } catch(e) {
    console.error('initGame crash:', e);
    // Hard reset if corrupt save
    if(e.message&&(e.message.includes('undefined')||e.message.includes('null'))){
      localStorage.removeItem('chronicle_v2');
      location.reload();
    }
  }
}
