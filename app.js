// BHBL Dice Baseball — Simple PWA build
const STORAGE_KEY = "bhbl_pwa_simple_v1";

const BA_TIERS = [
  { key:"under_200", label:"Under .200" },
  { key:"200_219", label:".200–.219" },
  { key:"220_239", label:".220–.239" },
  { key:"240_259", label:".240–.259" },
  { key:"260_279", label:".260–.279" },
  { key:"280_299", label:".280–.299" },
  { key:"300_plus", label:".300 & Above" },
];

const CHARTS = {"lt20":{"under_200":{"2":"BB","3":"GO_L","4":"FO_H","5":"FO_1","6":"GO_B1","7":"K","8":"GO_B1","9":"1B1","10":"GO_L","11":"2B2","12":"HR"},"200_219":{"2":"3B","3":"FO_1","4":"FO_1","5":"FO_1","6":"GO_B1","7":"K","8":"GO_B1","9":"1B1","10":"GO_B1","11":"2B3","12":"HR"},"220_239":{"2":"3B","3":"BB","4":"FO_H","5":"FO_H","6":"GO_L","7":"K","8":"FO_H","9":"1B1","10":"GO_L","11":"2B2","12":"HR"},"240_259":{"2":"BB","3":"FO_H","4":"1B2","5":"FO_1","6":"GO_L","7":"K","8":"GO_L","9":"GO_B1","10":"2B3","11":"HR","12":"3B"},"260_279":{"2":"FO_1","3":"GO_B1","4":"HR","5":"FO_1","6":"GO_B1","7":"K","8":"GO_B1","9":"1B2","10":"2B3","11":"GO_B1","12":"FO_1"},"280_299":{"2":"GO_L","3":"BB","4":"GO_L","5":"FO_H","6":"GO_L","7":"K","8":"FO_H","9":"1B2","10":"2B3","11":"HR","12":"3B"},"300_plus":{"2":"BB","3":"GO_L","4":"GO_B1","5":"FO_H","6":"GO_L","7":"K","8":"1B1","9":"FO_1","10":"2B3","11":"HR","12":"3B"}},"ge20":{"under_200":{"2":"GO_B1","3":"GO_B1","4":"FO_1","5":"FO_1","6":"GO_B1","7":"K","8":"GO_B1","9":"1B1","10":"GO_B1","11":"HR","12":"2B3"},"200_219":{"2":"FO_H","3":"BB","4":"FO_H","5":"FO_H","6":"GO_L","7":"K","8":"GO_L","9":"1B1","10":"GO_L","11":"HR","12":"2B3"},"220_239":{"2":"BB","3":"GO_L","4":"FO_H","5":"FO_1","6":"GO_L","7":"K","8":"GO_B1","9":"1B1","10":"HR","11":"FO_1","12":"2B3"},"240_259":{"2":"FO_1","3":"FO_1","4":"FO_1","5":"FO_1","6":"GO_B1","7":"K","8":"2B3","9":"GO_B1","10":"HR","11":"FO_1","12":"1B2"},"260_279":{"2":"FO_H","3":"BB","4":"1B2","5":"FO_H","6":"GO_L","7":"K","8":"GO_L","9":"FO_H","10":"HR","11":"2B3","12":"3B"},"280_299":{"2":"BB","3":"GO_L","4":"GO_L","5":"FO_H","6":"GO_B1","7":"K","8":"GO_B1","9":"1B2","10":"HR","11":"2B3","12":"3B"},"300_plus":{"2":"GO_B1","3":"GO_B1","4":"GO_B1","5":"FO_1","6":"GO_B1","7":"K","8":"1B2","9":"FO_1","10":"HR","11":"2B3","12":"3B"}}};

const el = (id)=>document.getElementById(id);
const uid = ()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36);

function tierLabel(k) {
  return (BA_TIERS.find(t=>t.key===k)||{label:k}).label;
}
function hrLabel(k) { return k==="ge20" ? "20+ HR" : "< 20 HR"; }

function defaultState(){
  const mkTeam=(name)=>({id:uid(),name,roster:[]});
  const home=mkTeam("Home");
  const away=mkTeam("Away");
  for(let i=1;i<=9;i++) {
    home.roster.push({id:uid(),name:`Home Player ${i}`,pos:"NA",tier:"240_259",hr:"lt20"});
    away.roster.push({id:uid(),name:`Away Player ${i}`,pos:"NA",tier:"240_259",hr:"lt20"});
  }
  return {
    teams:[home,away],
    season:{ batting:{} },
  };
}

function loadState(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return defaultState();
    const s = JSON.parse(raw);
    if(!s.teams) return defaultState();
    return s;
  } catch {
    return defaultState();
  }
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

let state = loadState();

function getTeam(id){ return state.teams.find(t=>t.id===id); }
function getPlayer(pid){
  for(const t of state.teams){
    const p=t.roster.find(x=>x.id===pid);
    if(p) return p;
  }
  return null;
}
function ensureBat(pid){
  if(!state.season.batting[pid]) {
    state.season.batting[pid] = { AB:0,H:0,HR:0,RBI:0,R:0,BB:0,SO:0,"2B":0,"3B":0 };
  }
}

function fillTeamSelect(sel){
  sel.innerHTML="";
  for(const t of state.teams){
    const o=document.createElement("option");
    o.value=t.id; o.textContent=t.name;
    sel.appendChild(o);
  }
}
function fillTierSelect(sel){
  sel.innerHTML="";
  for(const t of BA_TIERS){
    const o=document.createElement("option");
    o.value=t.key; o.textContent=t.label;
    sel.appendChild(o);
  }
  sel.value="240_259";
}

function roll2d6(){
  const d1=1+Math.floor(Math.random()*6);
  const d2=1+Math.floor(Math.random()*6);
  return {d1,d2,total:d1+d2};
}

// ---------------- Game (simple) ----------------
let game = null;

function buildLineup(team){
  const roster = team.roster.slice();
  const lineup = roster.slice(0, Math.min(9, roster.length)).map(p=>p.id);
  while(lineup.length<9 && roster.length) lineup.push(roster[lineup.length % roster.length].id);
  return lineup;
}

function newGame(homeId, awayId){
  return {
    homeId, awayId,
    inning:1,
    half:"top", // away bats
    outs:0,
    bases:[null,null,null],
    score:{home:0,away:0},
    idx:{home:0,away:0},
    lineup:{home:buildLineup(getTeam(homeId)), away:buildLineup(getTeam(awayId))},
    log:[]
  };
}
function battingSide(g){ return g.half==="top" ? "away" : "home"; }
function batterId(g){
  const side = battingSide(g);
  const arr = g.lineup[side];
  return arr[g.idx[side] % arr.length];
}
function nextBatter(g){ 
  const side = battingSide(g);
  g.idx[side] = (g.idx[side] + 1) % g.lineup[side].length; 
}
function addLog(g,msg){
  const stamp = `${g.inning}${g.half==="top"?"▲":"▼"} (${g.outs} out)`;
  g.log.unshift(`[${stamp}] ${msg}`);
  if(g.log.length>200) g.log.length=200;
}
function endHalf(g){
  g.outs=0; g.bases=[null,null,null];
  g.half = (g.half==="top") ? "bottom" : "top";
  if(g.half==="top") g.inning += 1;
}

function creditRun(pid){ if(!pid) return; ensureBat(pid); state.season.batting[pid].R += 1; }
function rbi(bid){ if(!bid) return; ensureBat(bid); state.season.batting[bid].RBI += 1; }
function scoreRun(g, bid){
  const side = battingSide(g);
  g.score[side] += 1;
  if(bid) rbi(bid);
}

function walkAdvance(g, bid){
  const b=g.bases.slice();
  if(!b[0]){ g.bases[0]=bid; return; }
  if(!b[1]){ g.bases[1]=b[0]; g.bases[0]=bid; return; }
  if(!b[2]){ g.bases[2]=b[1]; g.bases[1]=b[0]; g.bases[0]=bid; return; }
  creditRun(b[2]); scoreRun(g,bid);
  g.bases[2]=b[1]; g.bases[1]=b[0]; g.bases[0]=bid;
}

function advanceAll(g, n, bid, batterBaseIndex){
  const old=g.bases.slice();
  const nb=[null,null,null];
  for(let i=2;i>=0;i--){
    const r=old[i];
    if(!r) continue;
    const to=i+n;
    if(to>=3){ creditRun(r); scoreRun(g,bid); }
    else nb[to]=r;
  }
  if(batterBaseIndex>=0) nb[batterBaseIndex]=bid;
  g.bases=nb;
}

function fcLeadOut(g, bid){
  const b=g.bases.slice();
  const lead = b[2]?2:(b[1]?1:(b[0]?0:-1));
  if(lead===-1){ g.outs+=1; return "batter out"; }
  b[lead]=null;
  g.outs+=1;
  const nb=[null,null,null];
  if(lead===2){ if(b[1]) nb[2]=b[1]; if(b[0]) nb[1]=b[0]; }
  else if(lead===1){ if(b[2]) nb[2]=b[2]; if(b[0]) nb[1]=b[0]; }
  else { if(b[2]) nb[2]=b[2]; if(b[1]) nb[1]=b[1]; }
  nb[0]=bid;
  g.bases=nb;
  return "FC lead out";
}

function apply(code, roll){
  const bid=batterId(game);
  const batter=getPlayer(bid);
  ensureBat(bid);
  const s=state.season.batting[bid];

  if(code==="BB") {
    s.BB += 1;
    addLog(game, `${batter.name} rolled ${roll.total} [${roll.d1}+${roll.d2}] → WALK`);
    walkAdvance(game, bid);
    nextBatter(game);
    return;
  }
  if(code==="K") {
    s.AB += 1; s.SO += 1; game.outs += 1;
    addLog(game, `${batter.name} rolled ${roll.total} [${roll.d1}+${roll.d2}] → STRIKEOUT`);
    nextBatter(game);
    return;
  }
  if(code.startsWith("FO")) {
    s.AB += 1; game.outs += 1;
    addLog(game, `${batter.name} rolled ${roll.total} [${roll.d1}+${roll.d2}] → FLY OUT`);
    if(code==="FO_1") advanceAll(game, 1, null, -1);
    nextBatter(game);
    return;
  }
  if(code.startsWith("GO")) {
    s.AB += 1;
    if(code==="GO_L") {
      const d=fcLeadOut(game,bid);
      addLog(game, `${batter.name} rolled ${roll.total} [${roll.d1}+${roll.d2}] → GROUNDBALL → ${d}`);
      nextBatter(game);
      return;
    } else {
      game.outs += 1;
      addLog(game, `${batter.name} rolled ${roll.total} [${roll.d1}+${roll.d2}] → GROUNDBALL, batter out`);
      if(code==="GO_B1") advanceAll(game, 1, null, -1);
      nextBatter(game);
      return;
    }
  }

  // Hits
  s.AB += 1;
  if(code==="HR") {
    s.H += 1; s.HR += 1;
    addLog(game, `${batter.name} rolled ${roll.total} [${roll.d1}+${roll.d2}] → HOME RUN`);
    const runners=game.bases.slice();
    for(const r of runners) if(r) creditRun(r);
    const runs = runners.filter(Boolean).length + 1;
    for(let i=0;i<runs;i++) scoreRun(game,bid);
    creditRun(bid);
    game.bases=[null,null,null];
    nextBatter(game);
    return;
  }
  if(code==="3B") {
    s.H += 1; s["3B"] += 1;
    addLog(game, `${batter.name} rolled ${roll.total} [${roll.d1}+${roll.d2}] → TRIPLE`);
    advanceAll(game, 3, bid, 2);
    nextBatter(game);
    return;
  }
  if(code.startsWith("2B")) {
    s.H += 1; s["2B"] += 1;
    addLog(game, `${batter.name} rolled ${roll.total} [${roll.d1}+${roll.d2}] → DOUBLE`);
    const adv = (code==="2B3") ? 3 : 2;
    advanceAll(game, adv, bid, 1);
    nextBatter(game);
    return;
  }
  if(code.startsWith("1B")) {
    s.H += 1;
    addLog(game, `${batter.name} rolled ${roll.total} [${roll.d1}+${roll.d2}] → SINGLE`);
    const adv = (code==="1B2") ? 2 : 1;
    advanceAll(game, adv, bid, 0);
    nextBatter(game);
    return;
  }
}

function renderTeamsAll(){
  fillTeamSelect(el("homeTeam"));
  fillTeamSelect(el("awayTeam"));
  fillTeamSelect(el("rosterTeam"));
  fillTeamSelect(el("statsTeam"));
}

function renderPlay(){
  if(!game){
    el("inning").textContent="-"; el("half").textContent="-"; el("outs").textContent="-";
    el("score").textContent="Start a game.";
    el("log").textContent="";
    el("b1").classList.remove("on"); el("b2").classList.remove("on"); el("b3").classList.remove("on");
    el("batter").textContent="-"; el("tier").textContent="-"; el("hr").textContent="-";
    return;
  }
  el("inning").textContent=String(game.inning);
  el("half").textContent=game.half;
  el("outs").textContent=String(game.outs);
  el("b1").classList.toggle("on", !!game.bases[0]);
  el("b2").classList.toggle("on", !!game.bases[1]);
  el("b3").classList.toggle("on", !!game.bases[2]);

  const away=getTeam(game.awayId).name, home=getTeam(game.homeId).name;
  el("score").innerHTML = `<div><b>${away}</b> ${game.score.away}</div><div><b>${home}</b> ${game.score.home}</div>`;

  const bid=batterId(game);
  const batter=getPlayer(bid);
  el("batter").textContent=batter?.name ?? "(missing)";
  el("tier").textContent=tierLabel(batter?.tier ?? "");
  el("hr").textContent=hrLabel(batter?.hr ?? "lt20");
  el("log").textContent=game.log.join("\n");
}

function renderLeague(){
  const div=el("teamsList");
  div.innerHTML="";
  for(const t of state.teams){
    const row=document.createElement("div");
    row.className="row";
    row.innerHTML = `<div class="pill"><b>${t.name}</b> — ${t.roster.length} players</div>`;
    const del=document.createElement("button");
    del.className="danger"; del.textContent="Delete";
    del.onclick=()=>{
      if(!confirm(`Delete team "${t.name}"?`)) return;
      for(const p of t.roster) delete state.season.batting[p.id];
      state.teams = state.teams.filter(x=>x.id!==t.id);
      saveState();
      renderTeamsAll();
      renderLeague();
      renderPlay();
    };
    row.appendChild(del);
    div.appendChild(row);
  }
  renderRoster();
}

function renderRoster(){
  const team=getTeam(el("rosterTeam").value);
  const div=el("rosterList");
  div.innerHTML="";
  if(!team) return;
  for(const p of team.roster){
    const row=document.createElement("div");
    row.className="row";
    row.innerHTML = `<div class="pill"><b>${p.name}</b> (${p.pos})</div>
      <div class="small">${tierLabel(p.tier)} · ${hrLabel(p.hr)}</div>`;
    const del=document.createElement("button");
    del.className="danger"; del.textContent="Remove";
    del.onclick=()=>{
      if(!confirm(`Remove ${p.name}?`)) return;
      team.roster = team.roster.filter(x=>x.id!==p.id);
      delete state.season.batting[p.id];
      saveState();
      renderRoster();
      renderPlay();
    };
    row.appendChild(del);
    div.appendChild(row);
  }
}

function battingAvg(s){ return s.AB ? (s.H/s.AB) : 0; }

function renderStats(){
  const team=getTeam(el("statsTeam").value);
  const tbl=el("battingTable");
  tbl.innerHTML="";
  if(!team) return;
  const head=["Player","AB","H","2B","3B","HR","RBI","R","BB","SO","AVG"];
  const trh=document.createElement("tr");
  head.forEach(h=>{ const th=document.createElement("th"); th.textContent=h; trh.appendChild(th); });
  tbl.appendChild(trh);

  for(const p of team.roster){
    ensureBat(p.id);
    const s=state.season.batting[p.id];
    const tr=document.createElement("tr");
    const vals=[
      `${p.name} (${p.pos})`,
      s.AB,s.H,s["2B"],s["3B"],s.HR,s.RBI,s.R,s.BB,s.SO,
      battingAvg(s).toFixed(3).replace(/^0/,"")
    ];
    vals.forEach(v=>{ const td=document.createElement("td"); td.textContent=String(v); tr.appendChild(td); });
    tbl.appendChild(tr);
  }
}

function exportJSON(){
  const blob=new Blob([JSON.stringify(state,null,2)], {type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download="bhbl_backup.json";
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function importJSON(){
  const f=el("importFile").files?.[0];
  if(!f) return alert("Choose a JSON file first.");
  f.text().then(txt=>{
    try {
      const obj=JSON.parse(txt);
      if(!obj.teams) throw new Error("Missing teams");
      state=obj;
      saveState();
      renderTeamsAll();
      renderLeague();
      renderStats();
      renderPlay();
      alert("Imported!");
    } catch(e) {
      alert("Import failed: "+e.message);
    }
  });
}

function wireTabs(){
  document.querySelectorAll(".tab").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll(".tab").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      const tab=btn.dataset.tab;
      document.querySelectorAll(".panel").forEach(p=>p.classList.remove("active"));
      el(tab).classList.add("active");
      if(tab==="league") renderLeague();
      if(tab==="stats") renderStats();
    });
  });
}

function doRoll(){
  if(!game) return;
  if(game.outs>=3) endHalf(game);
  const bid=batterId(game);
  const batter=getPlayer(bid);
  const roll=roll2d6();
  const code=CHARTS[batter.hr]?.[batter.tier]?.[roll.total];
  if(!code) {
    addLog(game, `Rolled ${roll.total} but chart missing for tier/hr.`);
    return;
  }
  apply(code, roll);
  if(game.outs>=3) { addLog(game,"3 outs — half over."); endHalf(game); }
  saveState();
  renderPlay();
}

function simHalf(){
  if(!game) return;
  const startHalf=game.half, startIn=game.inning;
  let safety=0;
  while(game.half===startHalf && game.inning===startIn && safety<200){
    doRoll();
    safety++;
  }
}
function simGame(){
  if(!game) return;
  let safety=0;
  while(game.inning<=9 && safety<5000){
    doRoll();
    safety++;
  }
  addLog(game, "Simulation finished (through 9 innings).");
  saveState();
  renderPlay();
}

function init(){
  wireTabs();
  renderTeamsAll();
  fillTierSelect(el("playerTier"));
  renderPlay();

  el("startGame").onclick=()=>{
    const homeId=el("homeTeam").value;
    const awayId=el("awayTeam").value;
    if(homeId===awayId) return alert("Pick two different teams.");
    game=newGame(homeId, awayId);
    addLog(game,"Game started.");
    saveState();
    renderPlay();
  };
  el("roll").onclick=doRoll;
  el("simHalf").onclick=simHalf;
  el("simGame").onclick=simGame;

  el("addTeam").onclick=()=>{
    const name=el("newTeam").value.trim();
    if(!name) return;
    state.teams.push({id:uid(),name,roster:[]});
    el("newTeam").value="";
    saveState();
    renderTeamsAll();
    renderLeague();
  };

  el("rosterTeam").onchange=renderRoster;

  el("addPlayer").onclick=()=>{
    const team=getTeam(el("rosterTeam").value);
    if(!team) return;
    const name=el("playerName").value.trim();
    if(!name) return;
    const pos=el("playerPos").value.trim() || "NA";
    const tier=el("playerTier").value;
    const hr=el("playerHr").value;
    team.roster.push({id:uid(),name,pos,tier,hr});
    el("playerName").value=""; el("playerPos").value="";
    saveState();
    renderRoster();
  };

  el("statsTeam").onchange=renderStats;
  el("resetStats").onclick=()=>{
    if(!confirm("Reset ALL season stats?")) return;
    state.season={batting:{}};
    saveState();
    renderStats();
  };

  el("exportJson").onclick=exportJSON;
  el("importJson").onclick=importJSON;

  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("sw.js").catch(()=>{});
  }
}

window.addEventListener("DOMContentLoaded", init);
