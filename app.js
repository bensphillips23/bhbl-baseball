const APP_VERSION = "5.8.9";
// BHBL Dice Baseball — v2 (Lineups + Schedule)
const STORAGE_KEY = "bhbl_pwa_v2";

/*** Season helpers (robust) ***/
function isSeasonGame(g){
  return !!(g && g.seasonLink && g.seasonLink.scheduleId);
}
// Backwards-compat alias (some builds referenced this by mistake)
function inSeasonGame(g){ return isSeasonGame(g); }

function _initBatLine(){ return {G:0,AB:0,H:0,R:0,RBI:0,HR:0,BB:0,SO:0,"2B":0,"3B":0}; }
function _initPitchLine(){ return {G:0,OUTS:0,H:0,R:0,ER:0,HR:0,BB:0,SO:0,W:0,L:0,SV:0}; }

function batStore(g, pid){
  // Season games: write to season totals
  if(isSeasonGame(g)){
    state.season = state.season || {};
    state.season.batting = state.season.batting || {};
    if(state.season.batting[pid]==null) state.season.batting[pid]=_initBatLine();
    return state.season.batting[pid];
  }
  // Play mode: write to per-game box
  g.box = g.box || {batting:{}, pitching:{}};
  g.box.batting = g.box.batting || {};
  if(g.box.batting[pid]==null) g.box.batting[pid]=_initBatLine();
  return g.box.batting[pid];
}

function pitchStore(g, pid){
  if(isSeasonGame(g)){
    state.season = state.season || {};
    state.season.pitching = state.season.pitching || {};
    if(state.season.pitching[pid]==null) state.season.pitching[pid]=_initPitchLine();
    return state.season.pitching[pid];
  }
  g.box = g.box || {batting:{}, pitching:{}};
  g.box.pitching = g.box.pitching || {};
  if(g.box.pitching[pid]==null) g.box.pitching[pid]=_initPitchLine();
  return g.box.pitching[pid];
}
/*** end helpers ***/


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

function tierLabel(k) { return (BA_TIERS.find(t=>t.key===k)||{label:k}).label; }
function hrLabel(k) { return k==="ge20" ? "20+ HR" : "< 20 HR"; }

function defaultState(){
  const mkTeam=(name)=>({id:uid(),name,roster:[], lineup:[], pitchers:[], defaultSPId:null});
  const home=mkTeam("Home");
  const away=mkTeam("Away");
  for(let i=1;i<=9;i++) {
    home.roster.push({id:uid(),name:`Home Player ${i}`,pos:"NA",tier:"240_259",hr:"lt20"});
    away.roster.push({id:uid(),name:`Away Player ${i}`,pos:"NA",tier:"240_259",hr:"lt20"});
  }
  home.lineup = home.roster.slice(0,9).map(p=>p.id);
  away.lineup = away.roster.slice(0,9).map(p=>p.id);

  return { teams:[home,away], schedule:[],
  gameHistory:[],
  ticker:{ queue:[], last:{HR:null} }, season:{ batting:{} } };
}

function loadState(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return defaultState();
    const s = JSON.parse(raw);
    if(!s.teams) return defaultState();
    for(const t of s.teams){
      if(!t.roster) t.roster=[];
      if(!t.lineup) t.lineup = t.roster.slice(0,9).map(p=>p.id);
      if(!t.pitchers) t.pitchers=[];
      if(t.defaultSPId===undefined) t.defaultSPId=null;
    }
    if(!s.schedule) s.schedule=[];
    // v5 schedule migration: assign game numbers
    let maxNo=0;
    for(const g of s.schedule){
      if(g.gameNo) maxNo=Math.max(maxNo, Number(g.gameNo)||0);
    }
    for(const g of s.schedule){
      if(!g.gameNo){ maxNo += 1; g.gameNo = maxNo; }
      if(g.status===undefined) g.status="scheduled";
      if(g.awayScore===undefined) g.awayScore=0;
      if(g.homeScore===undefined) g.homeScore=0;
      if(g.playedAt===undefined) g.playedAt=null;
    }
    if(!s.season) s.season={batting:{}, pitching:{}};
    if(!s.season.batting) s.season.batting={};
    if(!s.season.pitching) s.season.pitching={};
    for(const k of Object.keys(s.season.pitching)){
      const ps=s.season.pitching[k];
      if(ps.W===undefined) ps.W=0;
      if(ps.L===undefined) ps.L=0;
      if(ps.SV===undefined) ps.SV=0;
    }
    return s;
  } catch { return defaultState(); }
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

let state = loadState();
  if(el("tickerClose")) el("tickerClose").onclick=()=>{ state.ticker.queue=[]; saveState(); renderTicker(); };


function getTeam(id){ return state.teams.find(t=>t.id===id); }
function getPlayer(pid){
  for(const t of state.teams){
    const p=t.roster.find(x=>x.id===pid);
    if(p) return p;
  }
  return null;
}

function ensurePitch(pid){
  if(!pid) return;
  if(!state.season.pitching[pid]){
    state.season.pitching[pid] = { OUTS:0, H:0, R:0, HR:0, BB:0, SO:0, W:0, L:0, SV:0 };
  }
}
function outsToIP(outs){
  const full = Math.floor(outs/3);
  const rem = outs % 3;
  return `${full}.${rem}`;
}
function getPitcher(teamId, pid){
  const t=getTeam(teamId);
  return t?.pitchers?.find(p=>p.id===pid) || null;
}
function fillPitcherSelect(sel, teamId){
  sel.innerHTML="";
  const t=getTeam(teamId);
  const list=t?.pitchers||[];
  const none=document.createElement("option");
  none.value=""; none.textContent="(none)";
  sel.appendChild(none);
  for(const p of list){
    const o=document.createElement("option");
    o.value=p.id; o.textContent=`${p.name} (${p.role})`;
    sel.appendChild(o);
  }
}
function defensiveSide(g){
  return battingSide(g)==="away" ? "home" : "away";
}
function currentPitcherId(g){
  const def = defensiveSide(g);
  return g?.pitcher?.[def] || "";
}

function ensureBat(pid){
  if(!state.season.batting[pid]) state.season.batting[pid] = { AB:0,H:0,HR:0,RBI:0,R:0,BB:0,SO:0,"2B":0,"3B":0 };
}

function ensureGameBat(pid){
  if(!game || !pid) return;
  if(!game.box) game.box={batting:{}, pitching:{}};
  if(!game.box.batting[pid]) game.box.batting[pid] = { AB:0,H:0,HR:0,RBI:0,R:0,BB:0,SO:0,"2B":0,"3B":0 };
}
function ensureGamePitch(pid){
  if(!game || !pid) return;
  if(!game.box) game.box={batting:{}, pitching:{}};
  if(!game.box.pitching[pid]) game.box.pitching[pid] = { OUTS:0, H:0, R:0, HR:0, BB:0, SO:0 };
}



function notePitcherEntry(teamSide, pid){
  if(!game || !pid) return;
  if(!game.decision) game.decision = { runEvents:[], pitcherEntries:{}, pitchOuts:{}, finalDecisions:null };
  if(!game.decision.pitcherEntries[pid]){
    game.decision.pitcherEntries[pid] = {
      teamSide,
      scoreHome: game.score.home,
      scoreAway: game.score.away,
      inning: game.inning,
      half: game.half
    };
  }


function isSeasonGame(g){
  return !!(g && g.seasonLink && g.seasonLink.scheduleId);
}
function batStore(g, pid){
  if(isSeasonGame(g)){
    ensureBat(pid);
    return state.season.batting[pid];
  } else {
    ensureGameBat(pid);
    return g.box.batting[pid];
  }
}
function pitchStore(g, pid){
  if(isSeasonGame(g)){
    ensurePitch(pid);
    return state.season.pitching[pid];
  } else {
    ensureGamePitch(pid);
    return g.box.pitching[pid];
  }
}

}

function recordRunEvent(){
  if(!game || !game.decision) return;
  game.decision.runEvents.push({
    inning: game.inning,
    half: game.half,
    scoreHome: game.score.home,
    scoreAway: game.score.away,
    homePitcher: game.pitcher?.home || "",
    awayPitcher: game.pitcher?.away || ""
  });
}

function computePitcherDecisions(g){
  const homeRuns = g.score.home;
  const awayRuns = g.score.away;
  if(homeRuns===awayRuns){
    return { winner:null, winPid:"", lossPid:"", savePid:"" };
  }
  const winner = homeRuns>awayRuns ? "home" : "away";
  const loser  = winner==="home" ? "away" : "home";

  const events = g.decision?.runEvents || [];
  let lastGoAheadIdx = -1;

  let prevHome=0, prevAway=0;
  for(let i=0;i<events.length;i++){
    const ev = events[i];
    const prevLead = prevHome - prevAway;
    const newLead = ev.scoreHome - ev.scoreAway;
    const winnerLeadBefore = (winner==="home"? prevLead : -prevLead);
    const winnerLeadAfter  = (winner==="home"? newLead  : -newLead);
    if(winnerLeadBefore<=0 && winnerLeadAfter>0){
      lastGoAheadIdx = i;
    }
    prevHome = ev.scoreHome; prevAway = ev.scoreAway;
  }

  // verify "for good"
  if(lastGoAheadIdx>=0){
    for(let i=lastGoAheadIdx+1;i<events.length;i++){
      const diff = events[i].scoreHome - events[i].scoreAway;
      const winnerLead = (winner==="home"? diff : -diff);
      if(winnerLead<=0){ lastGoAheadIdx=-1; break; }
    }
  }

  // fallback: first moment winner leads
  if(lastGoAheadIdx<0){
    for(let i=0;i<events.length;i++){
      const diff = events[i].scoreHome - events[i].scoreAway;
      const winnerLead = (winner==="home"? diff : -diff);
      if(winnerLead>0){ lastGoAheadIdx=i; break; }
    }
  }

  let winPid="", lossPid="";
  if(lastGoAheadIdx>=0){
    const ev = events[lastGoAheadIdx];
    winPid  = (winner==="home") ? (ev.homePitcher||"") : (ev.awayPitcher||"");
    lossPid = (loser==="home")  ? (ev.homePitcher||"") : (ev.awayPitcher||"");
  }

  const finalPid = (winner==="home") ? (g.pitcher?.home||"") : (g.pitcher?.away||"");
  let savePid = "";
  if(finalPid && finalPid!==winPid){
    const entry = g.decision?.pitcherEntries?.[finalPid] || null;
    const outs = Number(g.decision?.pitchOuts?.[finalPid] || 0);
    const leadAtEntry = entry ? ((winner==="home") ? (entry.scoreHome - entry.scoreAway) : (entry.scoreAway - entry.scoreHome)) : 999;
    if(leadAtEntry<=4 || outs>=9){
      savePid = finalPid;
    }
  }

  return { winner, winPid, lossPid, savePid };
}

function applyPitcherDecisionsToSeason(dec){
  if(!dec || !dec.winner) return;
  if(dec.winPid){ ensurePitch(dec.winPid); state.season.pitching[dec.winPid].W += 1; }
  if(dec.lossPid){ ensurePitch(dec.lossPid); state.season.pitching[dec.lossPid].L += 1; }
  if(dec.savePid){ ensurePitch(dec.savePid); state.season.pitching[dec.savePid].SV += 1; }
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

// -------- Lineups --------
function normalizedLineup(team){
  const rosterIds = team.roster.map(p=>p.id);
  const uniq = (arr)=>arr.filter((x,i)=>arr.indexOf(x)===i);
  let line = uniq((team.lineup||[]).filter(id=>rosterIds.includes(id)));
  for(const rid of rosterIds){
    if(line.length>=9) break;
    if(!line.includes(rid)) line.push(rid);
  }
  while(line.length<9 && rosterIds.length) line.push(rosterIds[line.length % rosterIds.length]);
  return line.slice(0,9);
}
function setTeamLineup(team, lineup9, bench){
  const rosterIds = team.roster.map(p=>p.id);
  const clean = (arr)=>arr.filter(id=>rosterIds.includes(id));
  const combined = [...clean(lineup9), ...clean(bench)];
  const seen=new Set();
  team.lineup = combined.filter(id=>{ if(seen.has(id)) return false; seen.add(id); return true; }).slice(0, Math.max(9, rosterIds.length));
}

// DnD helper
function makeDndList(listEl){
  let dragEl=null;
  function onDragStart(e){
    dragEl = e.currentTarget;
    dragEl.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", dragEl.dataset.pid);
  }
  function onDragEnd(){
    if(dragEl) dragEl.classList.remove("dragging");
    dragEl=null;
  }
  function onDragOver(e){
    e.preventDefault();
    const after = getDragAfterElement(listEl, e.clientY);
    const dragging = document.querySelector(".dragging");
    if(!dragging) return;
    if(after == null) listEl.appendChild(dragging);
    else listEl.insertBefore(dragging, after);
  }
  listEl.addEventListener("dragover", onDragOver);
  listEl.addEventListener("drop", (e)=>{
    e.preventDefault();
    const pid = e.dataTransfer.getData("text/plain");
    const items = [...listEl.querySelectorAll("li")];
    const idx = items.findIndex(x=>x.classList.contains("dragging"));
    // fire callback after DOM order changed
    if(listEl._onReorder) listEl._onReorder(pid, idx);
  });
  listEl._attachItem = (li)=>{
    li.draggable=true;
    li.addEventListener("dragstart", onDragStart);
    li.addEventListener("dragend", onDragEnd);
    li.addEventListener("click", ()=>{ if(listEl._onClickItem) listEl._onClickItem(li); });
  };
}
function getDragAfterElement(container, y){
  const els = [...container.querySelectorAll("li:not(.dragging)")];
  return els.reduce((closest, child)=>{
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height/2;
    if(offset < 0 && offset > closest.offset) return { offset, element: child };
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
}
function collectListIds(listEl){ return [...listEl.querySelectorAll("li")].map(li=>li.dataset.pid); }

function renderLineupEditor(){
  const team = getTeam(el("lineupTeam").value);
  const lineupList = el("lineupList");
  const benchList = el("benchList");
  lineupList.innerHTML=""; benchList.innerHTML="";
  if(!team) return;

  const lineup9 = normalizedLineup(team);
  const lineupSet = new Set(lineup9);
  const bench = team.roster.map(p=>p.id).filter(id=>!lineupSet.has(id));

  function mkItem(pid, idx){
    const p = getPlayer(pid);
    const li = document.createElement("li");
    li.dataset.pid = pid;
    li.innerHTML = `<span>${idx!=null? (idx+1)+". " : ""}<b>${p?.name ?? "?"}</b> <span class="small">(${p?.pos ?? "NA"})</span></span>
                    <span class="badge">${tierLabel(p?.tier ?? "")} · ${hrLabel(p?.hr ?? "lt20")}</span>`;
    return li;
  }
  lineup9.forEach((pid,i)=>{ const li=mkItem(pid,i); lineupList.appendChild(li); lineupList._attachItem(li); });
  bench.forEach((pid)=>{ const li=mkItem(pid,null); benchList.appendChild(li); benchList._attachItem(li); });
}

// -------- Schedule --------
let selectedGameId = null;
function renderSchedule(){
  const list = el("scheduleList");
  list.innerHTML="";
  const sched = state.schedule.slice().sort((a,b)=>(Number(a.gameNo||0)-Number(b.gameNo||0)));
  if(!sched.length){
    list.innerHTML = `<div class="hint" style="padding:10px">No games scheduled.</div>`;
    selectedGameId=null;
    return;
  }
  for(const g of sched){
    const away = getTeam(g.awayId)?.name ?? "??";
    const home = getTeam(g.homeId)?.name ?? "??";
    const row = document.createElement("div");
    row.className = "schedRow" + (g.id===selectedGameId ? " selected" : "");
    const status = g.status==="final" ? `<span class="final">Final</span> ${g.awayScore}-${g.homeScore}` : `<span class="meta">Scheduled</span>`;
    row.innerHTML = `<div>Game ${g.gameNo ?? ""}</div><div><b>${away}</b></div><div><b>${home}</b></div><div>${status}</div>`;
    row.onclick = ()=>{ selectedGameId = g.id; renderSchedule();
    renderStandings(); };
    list.appendChild(row);
  }
}

function nextGameNo(){
  let maxNo=0;
  for(const g of state.schedule){
    maxNo = Math.max(maxNo, Number(g.gameNo||0));
  }
  return maxNo + 1;
}
function addScheduledGame(awayId, homeId){
  state.schedule.push({
    id: uid(),
    gameNo: nextGameNo(),
    awayId,
    homeId,
    status:"scheduled",
    awayScore:0,
    homeScore:0,
    playedAt:null
  });
  saveState();
}


function rrPairings(teamIds){
  // Circle method. Returns rounds: array of pairs [homeId, awayId].
  const ids = teamIds.slice();
  if(ids.length % 2 === 1) ids.push(null); // bye
  const n = ids.length;
  const rounds = n - 1;
  const half = n / 2;
  const arr = ids.slice();
  const out = [];

  for(let r=0;r<rounds;r++){
    const pairs=[];
    for(let i=0;i<half;i++){
      const a = arr[i];
      const b = arr[n-1-i];
      if(a!==null && b!==null){
        // alternate by round for some balance
        const home = (r % 2 === 0) ? a : b;
        const away = (r % 2 === 0) ? b : a;
        pairs.push([home, away]);
      }
    }
    out.push(pairs);
    // rotate (keep first fixed)
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop());
    arr.splice(0, arr.length, fixed, ...rest);
  }
  return out;
}

function generateSchedule(){
  const rounds = Number(el("genRounds")?.value || 2);
  const series = Number(el("genSeries")?.value || 1);
  const mode = el("genMode")?.value || "replace";
  const baseIds = state.teams.map(t=>t.id).filter(Boolean);
  if(baseIds.length < 2) return alert("Add at least 2 teams first.");

  if(mode==="replace" && state.schedule.length>0){
    if(!confirm("Replace the existing schedule?")) return;
    state.schedule = [];
  }
  if(mode==="append" && state.schedule.length>0){
    if(!confirm("Append generated games to the existing schedule?")) return;
  }

  let gameNo = 1;
  for(const g of state.schedule){
    gameNo = Math.max(gameNo, Number(g.gameNo||0)+1);
  }

  for(let pass=0; pass<rounds; pass++){
    const ids = baseIds.slice();
    // invert home/away on odd passes to approximate home/away balance
    if(pass % 2 === 1) ids.reverse();

    const rr = rrPairings(ids);
    for(const pairs of rr){
      for(const [homeId, awayId] of pairs){
        for(let s=0; s<series; s++){
          state.schedule.push({
            id: uid(),
            gameNo: gameNo++,
            awayId,
            homeId,
            status:"scheduled",
            awayScore:0,
            homeScore:0,
            playedAt:null
          });
        }
      }
    }
  }

  saveState();
  renderSchedule();
  renderStandings();
}

function clearScheduleAll(){
  if(state.schedule.length===0) return;
  if(!confirm("Clear the entire schedule?")) return;
  state.schedule = [];
  selectedGameId = null;
  saveState();
  renderSchedule();
  renderStandings();
}


// -------- Game Engine --------
let game = null;
let simFast = false;

function buildGameLineup(team){ return normalizedLineup(team); }

function newGame(homeId, awayId){
  const home=getTeam(homeId), away=getTeam(awayId);
  return {
    homeId, awayId,
    inning:1, half:"top", outs:0,
    bases:[null,null,null],
    score:{home:0,away:0},
    idx:{home:0,away:0},
    lineup:{home:buildGameLineup(home), away:buildGameLineup(away)},
    pitcher:{home:"", away:""},
    seasonLink:null,
    decision:{ runEvents:[], pitcherEntries:{}, pitchOuts:{}, finalDecisions:null },
    final:false,
    log:[],
    box:{ batting:{}, pitching:{} }
  };
}
function battingSide(g){ return g.half==="top" ? "away" : "home"; }


function updateScoreboardUI(){
  const sb = el("scoreboardSticky");
  if(!sb) return;
  if(!game){
    el("sbAwayName").textContent="Away";
    el("sbHomeName").textContent="Home";
    el("sbAwayScore").textContent="0";
    el("sbHomeScore").textContent="0";
    el("sbInning").textContent="";
    el("sbOuts").textContent="";
    el("sbNote").textContent="";
    ["d1","d2","d3"].forEach(id=>el(id)?.classList.remove("occ"));
    el("sbAway")?.classList.remove("active");
    el("sbHome")?.classList.remove("active");
    return;
  }
  const awayT=getTeam(game.awayId);
  const homeT=getTeam(game.homeId);
  el("sbAwayName").textContent = awayT?.name || "Away";
  el("sbHomeName").textContent = homeT?.name || "Home";
  el("sbAwayScore").textContent = String(game.score.away);
  el("sbHomeScore").textContent = String(game.score.home);

  const inn = `${game.half.toUpperCase()} ${game.inning}`;
  el("sbInning").textContent = game.final ? "FINAL" : inn;
  const outs = game.outs;
  el("sbOuts").textContent = `${outs} out${outs===1?"":"s"}`;

  const batting = battingSide(game);
  el("sbHome").classList.toggle("active", batting==="home" && !game.final);
  el("sbAway").classList.toggle("active", batting==="away" && !game.final);

  el("d1")?.classList.toggle("occ", !!game.bases?.[0]);
  el("d2")?.classList.toggle("occ", !!game.bases?.[1]);
  el("d3")?.classList.toggle("occ", !!game.bases?.[2]);
const hp = getPitcher(game.homeId, game.pitcher?.home)?.name;
  const ap = getPitcher(game.awayId, game.pitcher?.away)?.name;
  el("sbNote").textContent = (hp||ap) ? `P: ${ap||"?"} / ${hp||"?"}` : "";
}

function triggerPlayFX(code){
  if(simFast) return;
  if(!code) return;
  const sb = el("scoreboardSticky");
  if(!sb) return;
  sb.classList.remove("playFX-good","playFX-hr","playFX-bad");
  void sb.offsetWidth;
  const good = ["1B","2B","3B","BB","HBP"].includes(code);
  const hr = code==="HR";
  const bad = ["K","GO","FO","PO","LO","DP"].includes(code);
  if(hr) sb.classList.add("playFX-hr");
  else if(good) sb.classList.add("playFX-good");
  else if(bad) sb.classList.add("playFX-bad");
}

function batterId(g){
  const side = battingSide(g);
  const arr = g.lineup[side];
  return arr[g.idx[side] % arr.length];
}


function isGameOver(g){
  // Game can end only after the bottom half of an inning (or after top in walk-off rules; not implemented)
  // We use simple rule: after completing bottom of inning >= 9, if score not tied => final.
  if(g.inning < 9) return false;
  if(g.half !== "top") return false; // means we just completed bottom and flipped to top
  return g.score.home !== g.score.away;
}

function nextBatter(g){
  const side = battingSide(g);
  g.idx[side] = (g.idx[side] + 1) % g.lineup[side].length;
}
function addLog(g,msg){
  const stamp = `${g.inning}${g.half==="top"?"▲":"▼"} (${g.outs} out)`;
  g.log.unshift(`[${stamp}] ${msg}`);
  if(g.log.length>250) g.log.length=250;
}
function endHalf(g){
  g.outs=0; g.bases=[null,null,null];
  g.half = (g.half==="top") ? "bottom" : "top";
  if(g.half==="top") g.inning += 1;
  if(isGameOver(g)){
    g.final = true;
    addLog(g, `Final: ${g.score.away}–${g.score.home}`);
  }
}


function creditRun(pid){ if(!pid) return; ensureBat(pid); state.season.batting[pid].R += 1; }
function rbi(bid){ if(!bid) return; ensureBat(bid); state.season.batting[bid].RBI += 1; }
function scoreRun(g, bid){
  // Rule (simplified): if the 3rd out is made on this play, no runs score.
  if(g && g._outsBeforePlay===2 && g.outs>=3) return;
  const side = battingSide(g);
  g.score[side] += 1;
  recordRunEvent();
  // pitching: charge run to active pitcher (fielding team)
  const rpid = currentPitcherId(g);
  if(rpid){ ensurePitch(rpid); state.season.pitching[rpid].R += 1; }
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
  const g=game;
  const bid=batterId(game);
  const batter=getPlayer(bid);
  // snapshot outs at start of play (for 3rd-out run rule)
  g._outsBeforePlay = g.outs;
  const s = batStore(g, bid);

  if(code==="BB") { s.BB += 1; addLog(game, `${batter.name} rolled ${roll.total} [${roll.d1}+${roll.d2}] → WALK`); walkAdvance(game, bid); nextBatter(game); return; }
  if(code==="K") { s.AB += 1; s.SO += 1; game.outs += 1; addLog(game, `${batter.name} rolled ${roll.total} [${roll.d1}+${roll.d2}] → STRIKEOUT`); nextBatter(game); return; }
  if(code.startsWith("FO")) { s.AB += 1; game.outs += 1; addLog(game, `${batter.name} rolled ${roll.total} [${roll.d1}+${roll.d2}] → FLY OUT`); if(code==="FO_1") advanceAll(game, 1, null, -1); nextBatter(game); return; }
  if(code.startsWith("GO")) {
    s.AB += 1;
    if(code==="GO_L") { const d=fcLeadOut(game,bid); addLog(game, `${batter.name} rolled ${roll.total} [${roll.d1}+${roll.d2}] → GROUNDBALL → ${d}`); nextBatter(game); return; }
    game.outs += 1; addLog(game, `${batter.name} rolled ${roll.total} [${roll.d1}+${roll.d2}] → GROUNDBALL, batter out`); if(code==="GO_B1") advanceAll(game, 1, null, -1); nextBatter(game); return;
  }

  // hits
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
  if(code==="3B") { s.H += 1; s["3B"] += 1; addLog(game, `${batter.name} rolled ${roll.total} [${roll.d1}+${roll.d2}] → TRIPLE`); advanceAll(game, 3, bid, 2); nextBatter(game); return; }
  if(code.startsWith("2B")) { s.H += 1; s["2B"] += 1; addLog(game, `${batter.name} rolled ${roll.total} [${roll.d1}+${roll.d2}] → DOUBLE`); const adv = (code==="2B3") ? 3 : 2; advanceAll(game, adv, bid, 1); nextBatter(game); return; }
  if(code.startsWith("1B")) { s.H += 1; addLog(game, `${batter.name} rolled ${roll.total} [${roll.d1}+${roll.d2}] → SINGLE`); const adv = (code==="1B2") ? 2 : 1; advanceAll(game, adv, bid, 0); nextBatter(game); return; }
}

function renderTeamsAll(){
  fillTeamSelect(el("homeTeam"));
  fillTeamSelect(el("awayTeam"));
  fillTeamSelect(el("rosterTeam"));
  fillTeamSelect(el("statsTeam"));
  fillTeamSelect(el("pitchTeam"));
  fillTeamSelect(el("pitRosterTeam"));
  fillTeamSelect(el("schedAway"));
  fillTeamSelect(el("schedHome"));
  fillTeamSelect(el("lineupTeam"));
}

function renderPlayPitcherSelectors(){
  const homeId=el("homeTeam").value;
  const awayId=el("awayTeam").value;
  if(el("homePitcher")) fillPitcherSelect(el("homePitcher"), homeId);
  if(el("awayPitcher")) fillPitcherSelect(el("awayPitcher"), awayId);

  const home=getTeam(homeId), away=getTeam(awayId);
  if(el("homePitcher")) el("homePitcher").value = home?.defaultSPId || "";
  if(el("awayPitcher")) el("awayPitcher").value = away?.defaultSPId || "";
}

function openPitchModal(){
  if(!game) return alert("Start a game first.");
  el("pitchModal").classList.add("show");
  el("pitchModal").setAttribute("aria-hidden","false");
  el("pitchAwayName").textContent = `Away: ${getTeam(game.awayId).name}`;
  el("pitchHomeName").textContent = `Home: ${getTeam(game.homeId).name}`;
  fillPitcherSelect(el("pitchAwaySelect"), game.awayId);
  fillPitcherSelect(el("pitchHomeSelect"), game.homeId);
  el("pitchAwaySelect").value = game.pitcher.away || getTeam(game.awayId)?.defaultSPId || "";
  el("pitchHomeSelect").value = game.pitcher.home || getTeam(game.homeId)?.defaultSPId || "";
}
function closePitchModal(){
  el("pitchModal").classList.remove("show");
  el("pitchModal").setAttribute("aria-hidden","true");
}

function renderPlay(){

  if(!game){
    el("inning").textContent="-"; el("half").textContent="-"; el("outs").textContent="-";
    el("score").textContent="Start a game.";
    el("log").textContent="";
    el("b1").classList.remove("on"); el("b2").classList.remove("on"); el("b3").classList.remove("on");
    el("batter").textContent="-"; el("tier").textContent="-"; el("hr").textContent="-";
    if(el("startGame")){
    if(game && isSeasonGame(game) && !game.final) el("startGame").textContent = "Start / Continue (Season)";
    else if(game && !game.final) el("startGame").textContent = "Continue Game";
    else el("startGame").textContent = "Start Game";
  }
  updateScoreboardUI();
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
  el("curHomeP").textContent = getPitcher(game.homeId, game.pitcher.home)?.name || "-";
  el("curAwayP").textContent = getPitcher(game.awayId, game.pitcher.away)?.name || "-";

  el("batter").textContent=batter?.name ?? "(missing)";
  el("tier").textContent=tierLabel(batter?.tier ?? "");
  el("hr").textContent=hrLabel(batter?.hr ?? "lt20");
  el("log").textContent=game.log.join("\n");
  if(el("startGame")){
    if(game && isSeasonGame(game) && !game.final) el("startGame").textContent = "Start / Continue (Season)";
    else if(game && !game.final) el("startGame").textContent = "Continue Game";
    else el("startGame").textContent = "Start Game";
  }
  updateScoreboardUI();
}



function renderPitchers(){
  const team=getTeam(el("pitRosterTeam").value);
  const list=el("pitcherList");
  const spSel=el("defaultSP");
  list.innerHTML="";
  spSel.innerHTML="";
  if(!team) return;

  const none=document.createElement("option");
  none.value=""; none.textContent="(none)";
  spSel.appendChild(none);
  for(const p of (team.pitchers||[])){
    const o=document.createElement("option");
    o.value=p.id; o.textContent=`${p.name} (${p.role})`;
    spSel.appendChild(o);
  }
  spSel.value = team.defaultSPId || "";

  for(const p of (team.pitchers||[])){
    ensurePitch(p.id);
    const row=document.createElement("div");
    row.className="row";
    row.innerHTML = `<div class="pill"><b>${p.name}</b> (${p.role})</div>`;
    const edit=document.createElement("button");
    edit.textContent="Edit";
    edit.onclick=()=>openPlayerEdit("pitcher", team.id, p.id);

    const del=document.createElement("button");
    del.className="danger"; del.textContent="Remove";
    del.onclick=()=>{
      if(!confirm(`Remove pitcher ${p.name}?`)) return;
      team.pitchers = team.pitchers.filter(x=>x.id!==p.id);
      if(team.defaultSPId===p.id) team.defaultSPId=null;
      delete state.season.pitching[p.id];
      saveState();
      renderPitchers();
      renderPitching();
      renderPlayPitcherSelectors();
    };
    row.appendChild(edit);
    row.appendChild(del);
    list.appendChild(row);
  }
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
      state.schedule = state.schedule.filter(g=>g.homeId!==t.id && g.awayId!==t.id);
      state.teams = state.teams.filter(x=>x.id!==t.id);
      saveState();
      renderTeamsAll();
      renderLeague();
      renderSchedule();
      renderPlay();
  renderStandings();
  renderPitching();
    };
    row.appendChild(del);
    div.appendChild(row);
  }
  renderRoster();
  renderLineupEditor();
  if(el("pitRosterTeam")) renderPitchers();
}
function renderRoster(){
  const team=getTeam(el("rosterTeam").value);
  const div=el("rosterList");
  div.innerHTML="";
  if(!team) return;
  for(const p of team.roster){
    const row=document.createElement("div");
    row.className="row";
    row.innerHTML = `<div class="pill"><b>${p.name}</b> (${p.pos})</div><div class="small">${tierLabel(p.tier)} · ${hrLabel(p.hr)}</div>`;
    const edit=document.createElement("button");
    edit.textContent="Edit";
    edit.onclick=()=>openPlayerEdit("batter", team.id, p.id);

    const del=document.createElement("button");
    del.className="danger"; del.textContent="Remove";
    del.onclick=()=>{
      if(!confirm(`Remove ${p.name}?`)) return;
      team.roster = team.roster.filter(x=>x.id!==p.id);
      delete state.season.batting[p.id];
      team.lineup = (team.lineup||[]).filter(id=>id!==p.id);
      saveState();
      renderRoster();
      renderLineupEditor();
      renderPlay();
    };
    row.appendChild(edit);
    row.appendChild(del);
    div.appendChild(row);
  }
}

function battingAvg(s){ return s.AB ? (s.H/s.AB) : 0; }

function computeStandings(){
  // Returns array of {teamId, GP,W,L,RF,RA,RD,WPct}
  const map = {};
  for(const t of state.teams){
    map[t.id] = { teamId:t.id, GP:0, W:0, L:0, RF:0, RA:0, RD:0, WPct:0 };
  }
  for(const g of state.schedule){
    if(g.status!=="final") continue;
    const away = map[g.awayId];
    const home = map[g.homeId];
    if(!away || !home) continue;
    away.GP += 1; home.GP += 1;
    away.RF += g.awayScore; away.RA += g.homeScore;
    home.RF += g.homeScore; home.RA += g.awayScore;
    if(g.awayScore > g.homeScore){ away.W += 1; home.L += 1; }
    else if(g.homeScore > g.awayScore){ home.W += 1; away.L += 1; }
    // ties not expected; ignore
  }
  const rows = Object.values(map);
  for(const r of rows){
    r.RD = r.RF - r.RA;
    r.WPct = (r.GP ? (r.W / r.GP) : 0);
  }
  rows.sort((a,b)=>{
    // sort by win pct, then wins, then RD, then RF
    if(b.WPct!==a.WPct) return b.WPct - a.WPct;
    if(b.W!==a.W) return b.W - a.W;
    if(b.RD!==a.RD) return b.RD - a.RD;
    return b.RF - a.RF;
  });
  return rows;
}

function renderStandings(){
  const tbl = el("standingsTable");
  if(!tbl) return;
  tbl.innerHTML = "";
  const head = ["Team","GP","W","L","Pct","RF","RA","RD"];
  const trh=document.createElement("tr");
  head.forEach(h=>{ const th=document.createElement("th"); th.textContent=h; trh.appendChild(th); });
  tbl.appendChild(trh);

  const rows = computeStandings();
  rows.forEach((r,idx)=>{
    const team = getTeam(r.teamId);
    const tr=document.createElement("tr");
    if(idx===0 && r.GP>0) tr.className="leader";
    const vals=[
      team?.name ?? "??",
      r.GP, r.W, r.L,
      r.WPct.toFixed(3).replace(/^0/,""),
      r.RF, r.RA, r.RD
    ];
    vals.forEach(v=>{ const td=document.createElement("td"); td.textContent=String(v); tr.appendChild(td); });
    tbl.appendChild(tr);
  });
}


function renderPitching(){
  const team=getTeam(el("pitchTeam").value);
  const tbl=el("pitchTable");
  tbl.innerHTML="";
  if(!team) return;

  const head=["Pitcher","Role","IP","H","R","HR","BB","SO","W","L","SV","ERA"];
  const trh=document.createElement("tr");
  head.forEach(h=>{ const th=document.createElement("th"); th.textContent=h; trh.appendChild(th); });
  tbl.appendChild(trh);

  for(const p of (team.pitchers||[])){
    ensurePitch(p.id);
    const s=state.season.pitching[p.id];
    const ipOuts=s.OUTS||0;
    const ip=outsToIP(ipOuts);
    const ipInnings = ipOuts/3;
    const era = ipInnings>0 ? (9*s.R/ipInnings) : 0;
    const tr=document.createElement("tr");
    const vals=[p.name,p.role,ip,s.H,s.R,s.HR,s.BB,s.SO,s.W,s.L,s.SV,era.toFixed(2)];
    vals.forEach(v=>{ const td=document.createElement("td"); td.textContent=String(v); tr.appendChild(td); });
    tbl.appendChild(tr);
  }
}

function renderLeaders(){
  const topN = Number(el("leadTopN")?.value || 10);

  // ---------- Batting ----------
  const batCat = el("leadBatCat")?.value || "AB";
  const bat = [];
  for(const t of state.teams){
    for(const p of (t.roster||[])){
      ensureBat(p.id);
      const s = state.season.batting[p.id];
      const avg = (s.AB>0) ? (s.H/s.AB) : 0;
      const val = (batCat==="AVG") ? avg : (s[batCat] ?? 0);
      if(batCat==="AVG" && s.AB===0) continue;
      bat.push({ name:p.name, team:t.name, ab:s.AB, val });
    }
  }
  bat.sort((a,b)=>{
    if(batCat==="AVG") return b.val - a.val;
    return (b.val - a.val) || (b.ab - a.ab);
  });
  const batTbl = el("leadBatTable");
  if(batTbl){
    batTbl.innerHTML="";
    const trh=document.createElement("tr");
    ["#","Player","Team","AB", batCat==="AVG" ? "AVG" : batCat].forEach(h=>{
      const th=document.createElement("th"); th.textContent=h; trh.appendChild(th);
    });
    batTbl.appendChild(trh);
    bat.slice(0, topN).forEach((row,i)=>{
      const tr=document.createElement("tr");
      const displayVal = (batCat==="AVG") ? row.val.toFixed(3) : String(row.val);
      [String(i+1), row.name, row.team, String(row.ab), displayVal].forEach(v=>{
        const td=document.createElement("td"); td.textContent=v; tr.appendChild(td);
      });
      batTbl.appendChild(tr);
    });
  }

  // ---------- Pitching ----------
  const pitCat = el("leadPitCat")?.value || "W";
  const pit = [];
  for(const t of state.teams){
    for(const p of (t.pitchers||[])){
      ensurePitch(p.id);
      const s = state.season.pitching[p.id];
      const ipOuts = Number(s.OUTS||0);
      const ip = ipOuts/3;
      const era = ip>0 ? (9*(s.R||0)/ip) : 0;
      let val;
      if(pitCat==="ERA"){
        if(ipOuts<=0) continue;
        val = era;
      } else {
        val = s[pitCat] ?? 0;
      }
      pit.push({ name:p.name, team:t.name, ipOuts, val });
    }
  }
  pit.sort((a,b)=>{
    if(pitCat==="ERA") return a.val - b.val; // lower better
    return (b.val - a.val) || (b.ipOuts - a.ipOuts);
  });
  const pitTbl = el("leadPitTable");
  if(pitTbl){
    pitTbl.innerHTML="";
    const trh=document.createElement("tr");
    ["#","Pitcher","Team","IP", pitCat].forEach(h=>{
      const th=document.createElement("th"); th.textContent=h; trh.appendChild(th);
    });
    pitTbl.appendChild(trh);
    pit.slice(0, topN).forEach((row,i)=>{
      const tr=document.createElement("tr");
      const displayVal = (pitCat==="ERA") ? row.val.toFixed(2) : String(row.val);
      const ipStr = outsToIP(row.ipOuts);
      [String(i+1), row.name, row.team, ipStr, displayVal].forEach(v=>{
        const td=document.createElement("td"); td.textContent=v; tr.appendChild(td);
      });
      pitTbl.appendChild(tr);
    });
  }
  renderLeaders();

}

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
    const vals=[`${p.name} (${p.pos})`,s.AB,s.H,s["2B"],s["3B"],s.HR,s.RBI,s.R,s.BB,s.SO,battingAvg(s).toFixed(3).replace(/^0/,"")];
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
      renderSchedule();
      renderStats();
    renderStandings();
    renderStandings();
      renderPlay();
      renderStandings();
      alert("Imported!");
    } catch(e) { alert("Import failed: "+e.message); }
  });
}

function showTab(tab){
  document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active", b.dataset.tab===tab));
  document.querySelectorAll(".panel").forEach(p=>p.classList.toggle("active", p.id===tab));
  if(tab==="league") renderLeague();
  if(tab==="schedule") renderSchedule();
  if(tab==="standings") renderStandings();
  if(tab==="stats") renderStats();
  if(tab==="pitching") renderPitching();
}
function wireTabs(){ document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click", ()=>showTab(btn.dataset.tab))); }

function creditPitchFromCode(g, code){
  if(g && g.pitcher){
    if(g.pitcher.home) notePitcherEntry("home", g.pitcher.home);
    if(g.pitcher.away) notePitcherEntry("away", g.pitcher.away);
  }
  const pid = currentPitcherId(g);
  if(!pid) return;
  const ps = pitchStore(g, pid);
  const gps = null;

  if(code==="BB"){ ps.BB += 1; if(gps) gps.BB += 1; return; }
  if(code==="K"){ ps.SO += 1; ps.OUTS += 1; if(gps){ gps.SO += 1; gps.OUTS += 1; } if(g.decision){ g.decision.pitchOuts[pid]=(g.decision.pitchOuts[pid]||0)+1; } return; }
  if(code.startsWith("FO")){ ps.OUTS += 1; if(gps) gps.OUTS += 1; if(g.decision){ g.decision.pitchOuts[pid]=(g.decision.pitchOuts[pid]||0)+1; } return; }
  if(code.startsWith("GO")){ ps.OUTS += 1; if(gps) gps.OUTS += 1; if(g.decision){ g.decision.pitchOuts[pid]=(g.decision.pitchOuts[pid]||0)+1; } return; }

  // hits
  if(code==="HR"){ ps.H += 1; if(gps) gps.H += 1; ps.HR += 1; if(gps){ gps.H += 1; if(gps) gps.H += 1; gps.HR += 1; } return; }
  if(code==="3B"){ ps.H += 1; if(gps) gps.H += 1; return; }
  if(code.startsWith("2B")){ ps.H += 1; if(gps) gps.H += 1; return; }
  if(code.startsWith("1B")){ ps.H += 1; if(gps) gps.H += 1; return; }
}

function doRoll(){
  if(!game) return;
  if(game.final) return alert("Game is final. Start a new game or load the next scheduled game.");
  if(game.outs>=3) endHalf(game);

  const bid=batterId(game);
  const batter=getPlayer(bid);
  const roll=roll2d6();
  const code=CHARTS[batter.hr]?.[batter.tier]?.[roll.total];
  triggerPlayFX(code);
  if(!code) { addLog(game, `Rolled ${roll.total} [${roll.d1}+${roll.d2}] but chart missing for tier/hr.`); return; }

  apply(code, roll);
  creditPitchFromCode(game, code);

  if(game.outs>=3) { addLog(game,"3 outs — half over."); endHalf(game); }
  saveState();
  renderPlay();
}


function simHalf(){
  simFast = true;
  if(!game) return;
  const startHalf=game.half, startIn=game.inning;
  let safety=0;
  while(game.half===startHalf && game.inning===startIn && safety<200){ doRoll(); safety++; }
  simFast = false;
}

function simGame(){
  simFast = true;
  if(!game) return;
  let safety=0;
  while(!game.final && safety<20000){ doRoll(); safety++; }
  addLog(game, "Simulation finished (through 9 innings).");
  saveState();
  renderPlay();
  simFast = false;
}



function startSeasonGameFromSchedule(sched){
  const homeId = sched.homeId;
  const awayId = sched.awayId;
  game = newGame(homeId, awayId);
  game.seasonLink = { scheduleId: sched.id, gameNo: sched.gameNo };
  // default pitchers
  game.pitcher.home = getTeam(homeId)?.defaultSPId || "";
  game.pitcher.away = getTeam(awayId)?.defaultSPId || "";
  notePitcherEntry("home", game.pitcher.home);
  notePitcherEntry("away", game.pitcher.away);
  addLog(game, `Season game loaded: Game ${sched.gameNo}.`);
  saveState();
  showTab("play");
  renderPlay();
}

function finalizeSeasonGame(){
  if(!game) return alert("No active game.");
  if(!isSeasonGame(game)) return alert("This is a Play Mode game (not scheduled). Season stats are not recorded—schedule it first.");
  if(!game.final){
    if(!confirm("Game is not final (may be tied). Finalize anyway?")) return;
  }
  if(!game.seasonLink?.scheduleId) return alert("This game is not linked to the schedule.");
  const sched = state.schedule.find(x=>x.id===game.seasonLink.scheduleId);
  if(!sched) return alert("Scheduled game not found.");
  sched.status = "final";
  sched.awayScore = game.score.away;
  sched.homeScore = game.score.home;
  sched.playedAt = new Date().toISOString();

  // Save boxscore snapshot for exports
  if(!state.gameHistory) state.gameHistory=[];
  state.gameHistory.push({
    id: uid(),
    gameNo: sched.gameNo,
    awayId: game.awayId,
    homeId: game.homeId,
    awayScore: game.score.away,
    homeScore: game.score.home,
    innings: game.inning,
    playedAt: sched.playedAt,
    box: game.box ? structuredClone(game.box) : {batting:{}, pitching:{}}
  });
  state.gameHistory = state.gameHistory.slice(-500);
  checkLeaderChanges();

  const dec = computePitcherDecisions(game);
  game.decision.finalDecisions = dec;
  applyPitcherDecisionsToSeason(dec);
  saveState();
  renderTicker();
  renderSchedule();
  renderStandings();
  renderPitching();
  alert(`Finalized: Game ${sched.gameNo} (${getTeam(sched.awayId)?.name||"Away"} ${sched.awayScore} - ${sched.homeScore} ${getTeam(sched.homeId)?.name||"Home"})\nW: ${dec.winPid ? (getPitcher(dec.winner==="home"?game.homeId:game.awayId, dec.winPid)?.name || "?") : "?"}\nL: ${dec.lossPid ? (getPitcher(dec.winner==="home"?game.awayId:game.homeId, dec.lossPid)?.name || "?") : "?"}\nSV: ${dec.savePid ? (getPitcher(dec.winner==="home"?game.homeId:game.awayId, dec.savePid)?.name || "?") : "None"}`);
}

// Schedule sim: simple uses doRoll loop in a temp game
function simulateScheduledGame(gameObj){
  const g = newGame(gameObj.homeId, gameObj.awayId);
  let safety=0;
  while(g.inning<=9 && safety<5000){
    if(g.outs>=3){ endHalf(g); safety++; continue; }
    const side = battingSide(g);
    const bid = batterId(g);
    const batter = getPlayer(bid);
    const roll = roll2d6();
    const code = CHARTS[batter.hr]?.[batter.tier]?.[roll.total];
    if(!code){ safety++; continue; }

    // temporarily swap global game for apply()
    const oldGame = game;
    game = g;
    apply(code, roll);
    game = oldGame;

    if(g.outs>=3) endHalf(g);
    safety++;
  }
  gameObj.status="final";
  gameObj.homeScore=g.score.home;
  gameObj.awayScore=g.score.away;
  gameObj.playedAt=new Date().toISOString();
  saveState();
  return {homeScore:g.score.home, awayScore:g.score.away};
}


let peCtx = null; // {kind:"batter"|"pitcher", teamId, id}

function openPlayerEdit(kind, teamId, id){
  const team = getTeam(teamId);
  if(!team) return;
  peCtx = {kind, teamId, id};

  // Populate tier options from main tier select (single source of truth)
  const tierSel = el("peTier");
  if(tierSel){
    tierSel.innerHTML = el("playerTier") ? el("playerTier").innerHTML : tierSel.innerHTML;
  }

  let obj = null;
  if(kind==="batter") obj = (team.roster||[]).find(p=>p.id===id);
  else obj = (team.pitchers||[]).find(p=>p.id===id);
  if(!obj) return;

  el("peTitle").textContent = kind==="batter" ? `Edit Batter — ${team.name}` : `Edit Pitcher — ${team.name}`;
  el("peName").value = obj.name || "";
  el("pePreviewPill").innerHTML = `<b>${obj.name||"Player"}</b>`;
  el("pePreviewHint").textContent = "";

  const batterBox = el("peBatterFields");
  const pitBox = el("pePitcherFields");
  if(kind==="batter"){
    batterBox?.classList.remove("hidden");
    pitBox?.classList.add("hidden");
    el("pePos").value = obj.pos || "";
    if(el("peTier")) el("peTier").value = obj.tier || "C";
    if(el("peHr")) el("peHr").value = obj.hr || "lt20";
    el("pePreviewHint").textContent = `${tierLabel(el("peTier").value)} · ${hrLabel(el("peHr").value)} · (${el("pePos").value||"NA"})`;
  } else {
    batterBox?.classList.add("hidden");
    pitBox?.classList.remove("hidden");
    if(el("peRole")) el("peRole").value = obj.role || "SP";
    el("pePreviewHint").textContent = `Role: ${el("peRole").value}`;
  }

  const modal = el("playerEditModal");
  modal.classList.add("show");
  modal.setAttribute("aria-hidden","false");
}

function closePlayerEdit(){
  const modal = el("playerEditModal");
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden","true");
  peCtx = null;
}

function savePlayerEdit(){
  if(!peCtx) return closePlayerEdit();
  const team = getTeam(peCtx.teamId);
  if(!team) return closePlayerEdit();

  if(peCtx.kind==="batter"){
    const p = (team.roster||[]).find(x=>x.id===peCtx.id);
    if(!p) return closePlayerEdit();
    p.name = el("peName").value.trim() || p.name;
    p.pos = (el("pePos").value.trim() || p.pos || "NA").toUpperCase();
    p.tier = el("peTier").value;
    p.hr = el("peHr").value;
    // ensure season stat objects exist (do not reset)
    if(state.season?.batting) ensureBat(p.id);
    saveState();
    renderRoster();
    renderPlay();
    renderStats();
  } else {
    const p = (team.pitchers||[]).find(x=>x.id===peCtx.id);
    if(!p) return closePlayerEdit();
    p.name = el("peName").value.trim() || p.name;
    p.role = el("peRole").value;
    if(state.season?.pitching) ensurePitch(p.id);
    // if default SP but role changed away from SP, keep id but user can change default SP
    saveState();
    renderPitchers();
    renderPlay();
    renderStats();
  }

  closePlayerEdit();
}

function wirePlayerEditModal(){
  if(el("peClose")) el("peClose").onclick = closePlayerEdit;
  if(el("peSave")) el("peSave").onclick = savePlayerEdit;

  const preview = ()=>{
    if(!peCtx) return;
    const name = el("peName").value.trim() || "Player";
    el("pePreviewPill").innerHTML = `<b>${name}</b>`;
    if(peCtx.kind==="batter"){
      const pos = (el("pePos").value.trim() || "NA").toUpperCase();
      const tier = el("peTier").value;
      const hr = el("peHr").value;
      el("pePreviewHint").textContent = `${tierLabel(tier)} · ${hrLabel(hr)} · (${pos})`;
    } else {
      el("pePreviewHint").textContent = `Role: ${el("peRole").value}`;
    }
  };
  ["peName","pePos","peTier","peHr","peRole"].forEach(id=>{
    if(el(id)) el(id).addEventListener("input", preview);
    if(el(id)) el(id).addEventListener("change", preview);
  });

  // close when clicking backdrop
  const modal = el("playerEditModal");
  if(modal){
    modal.addEventListener("click", (e)=>{
      if(e.target===modal) closePlayerEdit();
    });
  }
}

// Modal

let modalPick = null; // {side:"home|away", kind:"bench|slot", pid, idx}

function clearModalPick(){
  modalPick = null;
  document.querySelectorAll("#modalBenchAwayList li, #modalBenchHomeList li, #modalAwayList li, #modalHomeList li")
    .forEach(li=>li.classList.remove("selected"));
}

function renderModalBenches(){
  const awayBench=el("modalBenchAwayList");
  const homeBench=el("modalBenchHomeList");
  if(!awayBench || !homeBench || !game) return;

  awayBench.innerHTML=""; homeBench.innerHTML="";
  const awayTeam=getTeam(game.awayId);
  const homeTeam=getTeam(game.homeId);

  const awayBenchIds=(awayTeam?.roster||[]).map(p=>p.id).filter(pid=>!game.lineup.away.includes(pid));
  const homeBenchIds=(homeTeam?.roster||[]).map(p=>p.id).filter(pid=>!game.lineup.home.includes(pid));

  const makeItem=(pid)=>{
    const p=getPlayer(pid);
    const li=document.createElement("li");
    li.dataset.pid=pid;
    li.className="listItem";
    li.innerHTML = `<span><b>${p?.name ?? "?"}</b> <span class="small">(${p?.pos ?? "NA"})</span></span>
                    <span class="badge">${tierLabel(p?.tier ?? "")} · ${hrLabel(p?.hr ?? "lt20")}</span>`;
    return li;
  };

  awayBenchIds.forEach(pid=>{ const li=makeItem(pid); awayBench.appendChild(li); awayBench._attachItem(li); });
  homeBenchIds.forEach(pid=>{ const li=makeItem(pid); homeBench.appendChild(li); homeBench._attachItem(li); });

  // click selection handlers
  awayBench._onClickItem = (li)=>{ clearModalPick(); modalPick={side:"away", kind:"bench", pid:li.dataset.pid, idx:null}; li.classList.add("selected"); };
  homeBench._onClickItem = (li)=>{ clearModalPick(); modalPick={side:"home", kind:"bench", pid:li.dataset.pid, idx:null}; li.classList.add("selected"); };

  const awayList=el("modalAwayList");
  const homeList=el("modalHomeList");

  const slotClick = (side, li, idx)=>{
    const pid = li.dataset.pid;
    if(!modalPick){
      clearModalPick();
      modalPick={side, kind:"slot", pid, idx};
      li.classList.add("selected");
      return;
    }
    if(modalPick.side!==side){
      clearModalPick();
      modalPick={side, kind:"slot", pid, idx};
      li.classList.add("selected");
      return;
    }
    if(modalPick.kind==="bench"){
      const benchPid = modalPick.pid;
      const oldPid = game.lineup[side][idx];
      game.lineup[side][idx] = benchPid;
      addLog(game, `${side==="home"?"Home":"Away"} sub: ${getPlayer(benchPid)?.name||"?"} for ${getPlayer(oldPid)?.name||"?"} (slot ${idx+1})`);
      saveState();
      clearModalPick();
      renderModalLineups();
  renderModalBenches();
      renderModalBenches();
      renderPlay();
      return;
    }
    if(modalPick.kind==="slot"){
      const a=modalPick.idx, b=idx;
      const tmp=game.lineup[side][a];
      game.lineup[side][a]=game.lineup[side][b];
      game.lineup[side][b]=tmp;
      addLog(game, `${side==="home"?"Home":"Away"} lineup swap: slot ${a+1} ↔ ${b+1}`);
      saveState();
      clearModalPick();
      renderModalLineups();
  renderModalBenches();
      renderModalBenches();
      renderPlay();
      return;
    }
  };

  if(awayList){
    awayList._onClickItem=(li)=>{
      const items=[...awayList.querySelectorAll("li")];
      const idx=items.indexOf(li);
      slotClick("away", li, idx);
    };
  }
  if(homeList){
    homeList._onClickItem=(li)=>{
      const items=[...homeList.querySelectorAll("li")];
      const idx=items.indexOf(li);
      slotClick("home", li, idx);
    };
  }
}

function openModal(){
  if(!game) return alert("Start a game first.");
  const modal = el("lineupModal");
  modal.classList.add("show");
  modal.setAttribute("aria-hidden","false");
  el("modalAwayName").textContent = `Away: ${getTeam(game.awayId).name}`;
  el("modalHomeName").textContent = `Home: ${getTeam(game.homeId).name}`;
  renderModalLineups();
  renderModalBenches();
}
function closeModal(){
  const modal = el("lineupModal");
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden","true");
}
function renderModalLineups(){
  const awayList=el("modalAwayList");
  const homeList=el("modalHomeList");
  awayList.innerHTML=""; homeList.innerHTML="";
  const makeItem=(pid, idx)=>{
    const p=getPlayer(pid);
    const li=document.createElement("li");
    li.dataset.pid=pid;
    li.innerHTML = `<span>${idx+1}. <b>${p?.name ?? "?"}</b> <span class="small">(${p?.pos ?? "NA"})</span></span>
                    <span class="badge">${tierLabel(p?.tier ?? "")} · ${hrLabel(p?.hr ?? "lt20")}</span>`;
    return li;
  };
  game.lineup.away.forEach((pid,i)=>{ const li=makeItem(pid,i); awayList.appendChild(li); awayList._attachItem(li); });
  game.lineup.home.forEach((pid,i)=>{ const li=makeItem(pid,i); homeList.appendChild(li); homeList._attachItem(li); });
}

// Init
function initDnD(){
  makeDndList(el("lineupList"));
  makeDndList(el("benchList"));
  makeDndList(el("modalAwayList"));
  makeDndList(el("modalHomeList"));
  makeDndList(el("modalBenchAwayList"));
  makeDndList(el("modalBenchHomeList"));
}

function init(){
  if(el("appVersion")) el("appVersion").textContent = "v"+APP_VERSION;
  wireTabs();
  renderTeamsAll();
  fillTierSelect(el("playerTier"));
  renderPlayPitcherSelectors();
  initDnD();
  renderPlay();

  el("homeTeam").onchange=renderPlayPitcherSelectors;
  el("awayTeam").onchange=renderPlayPitcherSelectors;

  el("startGame").onclick=()=>{
    // If a game is already loaded and not final, do NOT overwrite it.
    if(game && !game.final){
      // Season game: allow setting pitchers, mark started, then play
      if(isSeasonGame(game)){
        const homeId = game.homeId;
        const awayId = game.awayId;
        const hp = el("homePitcher")?.value || game.pitcher.home || getTeam(homeId)?.defaultSPId || "";
        const ap = el("awayPitcher")?.value || game.pitcher.away || getTeam(awayId)?.defaultSPId || "";
        game.pitcher.home = hp;
        game.pitcher.away = ap;
        notePitcherEntry("home", game.pitcher.home);
        notePitcherEntry("away", game.pitcher.away);
        if(!game.started){
          game.started = true;
          addLog(game,`Season game started: Game ${game.seasonLink?.gameNo ?? ""}.`);
        }
        saveState();
        renderPlay();
        return;
      }

      // Play Mode game already loaded: just continue / update pitchers
      const homeId = game.homeId;
      const awayId = game.awayId;
      game.pitcher.home = el("homePitcher")?.value || game.pitcher.home || "";
      game.pitcher.away = el("awayPitcher")?.value || game.pitcher.away || "";
      notePitcherEntry("home", game.pitcher.home);
      notePitcherEntry("away", game.pitcher.away);
      saveState();
      renderPlay();
      return;
    }

    // Otherwise start a new Play Mode (exhibition) game
    const homeId=el("homeTeam").value;
    const awayId=el("awayTeam").value;
    if(homeId===awayId) return alert("Pick two different teams.");
    game=newGame(homeId, awayId);
    game.pitcher.home = el("homePitcher")?.value || getTeam(homeId)?.defaultSPId || "";
    game.pitcher.away = el("awayPitcher")?.value || getTeam(awayId)?.defaultSPId || "";
    notePitcherEntry("home", game.pitcher.home);
    notePitcherEntry("away", game.pitcher.away);
    addLog(game,`Game started.`);
    saveState();
    renderPlay();
  };
  el("roll").onclick=doRoll;
  el("simHalf").onclick=simHalf;
  el("simGame").onclick=simGame;

  el("editLineup").onclick=openModal;
  if(el("editPitchers")) el("editPitchers").onclick=openPitchModal;
  if(el("closePitchModal")) el("closePitchModal").onclick=closePitchModal;
  if(el("pitchSave")) el("pitchSave").onclick=()=>{
    if(!game) return;
    game.pitcher.away = el("pitchAwaySelect").value || "";
    game.pitcher.home = el("pitchHomeSelect").value || "";
    notePitcherEntry("away", game.pitcher.away);
    notePitcherEntry("home", game.pitcher.home);
    addLog(game, `Pitchers set. Away: ${getPitcher(game.awayId, game.pitcher.away)?.name || "none"} | Home: ${getPitcher(game.homeId, game.pitcher.home)?.name || "none"}`);
    closePitchModal();
    saveState();
    renderPlay();
    renderPitching();
  };
  el("closeModal").onclick=closeModal;
  el("modalSave").onclick=()=>{
    const awayIds = collectListIds(el("modalAwayList")).slice(0,9);
    const homeIds = collectListIds(el("modalHomeList")).slice(0,9);
    if(awayIds.length===9) game.lineup.away = awayIds;
    if(homeIds.length===9) game.lineup.home = homeIds;
    closeModal();
    renderPlay();
  };

  el("jumpSchedule").onclick=()=>showTab("schedule");
  el("jumpLeague").onclick=()=>showTab("league");

  el("addTeam").onclick=()=>{
    const name=el("newTeam").value.trim();
    if(!name) return;
    state.teams.push({id:uid(),name,roster:[], lineup:[]});
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
    const pid=uid();
    team.roster.push({id:pid,name,pos,tier,hr});
    team.lineup = (team.lineup||[]).filter(Boolean);
    if(team.lineup.length<9) team.lineup.push(pid);
    el("playerName").value=""; el("playerPos").value="";
    saveState();
    renderRoster();
    renderLineupEditor();
  };

  el("lineupTeam").onchange=renderLineupEditor;
  if(el("pitRosterTeam")) el("pitRosterTeam").onchange=renderPitchers;
  if(el("defaultSP")) el("defaultSP").onchange=()=>{ const t=getTeam(el("pitRosterTeam").value); if(!t) return; t.defaultSPId = el("defaultSP").value || null; saveState(); renderPlayPitcherSelectors(); };
  if(el("addPitcher")) el("addPitcher").onclick=()=>{ const t=getTeam(el("pitRosterTeam").value); if(!t) return; const name=el("pitcherName").value.trim(); if(!name) return; const role=el("pitcherRole").value; const pid=uid(); t.pitchers.push({id:pid,name,role}); el("pitcherName").value=""; saveState(); renderPitchers(); renderPitching(); renderPlayPitcherSelectors(); };
  el("saveLineup").onclick=()=>{
    const team=getTeam(el("lineupTeam").value);
    if(!team) return;
    const lineupIds = collectListIds(el("lineupList")).slice(0,9);
    const benchIds  = collectListIds(el("benchList"));
    if(lineupIds.length<9) return alert("Lineup must have 9 players. Drag players from bench if needed.");
    setTeamLineup(team, lineupIds, benchIds);
    saveState();
    alert("Saved!");
    renderLineupEditor();
  };

  // schedule
  el("addGame").onclick=()=>{
    const away=el("schedAway").value;
    const home=el("schedHome").value;
    if(away===home) return alert("Pick two different teams.");
    addScheduledGame(away, home);
    renderSchedule();
  };
  
if(el("deleteSelected")) el("deleteSelected").onclick=()=>{
  const g = state.schedule.find(x=>x.id===selectedGameId);
  if(!g) return alert("Click a game row to select it.");
  if(!confirm(`Delete Game ${g.gameNo} (${getTeam(g.awayId)?.name||"Away"} @ ${getTeam(g.homeId)?.name||"Home"})?`)) return;
  state.schedule = state.schedule.filter(x=>x.id!==g.id);
  selectedGameId = null;
  saveState();
  renderSchedule();
  renderStandings();
};

if(el("playSelected")) el("playSelected").onclick=()=>{
  const g = state.schedule.find(x=>x.id===selectedGameId);
  if(!g) return alert("Click a game row to select it.");
  if(g.status==="final") return alert("That game is already final.");
  startSeasonGameFromSchedule(g);
};

if(el("finalizeGame")) el("finalizeGame").onclick=finalizeSeasonGame;

el("simSelected").onclick=()=>{
    const g = state.schedule.find(x=>x.id===selectedGameId);
    if(!g) return alert("Click a game to select it.");
    if(g.status==="final") return alert("That game is already final.");
    const res=simulateScheduledGame(g);
    alert(`Final: ${getTeam(g.awayId).name} ${res.awayScore} — ${getTeam(g.homeId).name} ${res.homeScore}`);
    renderSchedule();
    renderStats();
  };
  el("simAll").onclick=()=>{
    let count=0;
    for(const g of state.schedule){
      if(g.status!=="final"){ simulateScheduledGame(g); count++; }
    }
    alert(`Simulated ${count} game(s).`);
    renderSchedule();
    renderStats();
  };

  // stats
  el("statsTeam").onchange=renderStats;
  if(el("leadBatCat")) el("leadBatCat").onchange=renderLeaders;
  if(el("leadPitCat")) el("leadPitCat").onchange=renderLeaders;
  if(el("leadTopN")) el("leadTopN").onchange=renderLeaders;
  if(el("pitchTeam")) el("pitchTeam").onchange=renderPitching;
  if(el("recalcStandings")) el("recalcStandings").onclick=renderStandings;
  el("resetStats").onclick=()=>{
    if(!confirm("Reset ALL season stats AND mark scheduled games unplayed?")) return;
    state.season={batting:{}};
    for(const g of state.schedule){ g.status="scheduled"; g.homeScore=0; g.awayScore=0; g.playedAt=null; }
    saveState();
    renderStats();
    renderSchedule();
  };

  el("exportJson").onclick=exportJSON;
  el("importJson").onclick=importJSON;


  // Schedule generator
  if(el("genSchedule")) el("genSchedule").onclick=generateSchedule;
  if(el("clearSchedule")) el("clearSchedule").onclick=clearScheduleAll;

  // Exports
  if(el("exportSeasonCsv")) el("exportSeasonCsv").onclick=exportSeasonCsv;
  if(el("exportScheduleCsv")) el("exportScheduleCsv").onclick=exportScheduleCsv;
  if(el("exportBoxscoresCsv")) el("exportBoxscoresCsv").onclick=exportBoxscoresCsv;
  if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
}

window.addEventListener("DOMContentLoaded", init);
function downloadText(filename, text){
  const blob = new Blob([text], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 250);
}
function toCsv(rows){
  const esc = (v)=>{
    if(v===null || v===undefined) return "";
    const s = String(v);
    if(/[",\n]/.test(s)) return '"' + s.replace(/"/g,'""') + '"';
    return s;
  };
  return rows.map(r=>r.map(esc).join(",")).join("\n");
}

function teamOfPlayer(pid){
  for(const t of state.teams){
    if(t.roster?.some(p=>p.id===pid)) return t;
  }
  return null;
}

function pushTicker(msg){
  if(!msg) return;
  if(!state.ticker) state.ticker={queue:[], last:{HR:null}};
  state.ticker.queue = state.ticker.queue || [];
  state.ticker.queue.unshift({ msg, ts: Date.now() });
  state.ticker.queue = state.ticker.queue.slice(0, 20);
  saveState();
  renderTicker();
}
function renderTicker(){
  const bar = el("ticker");
  if(!bar) return;
  const q = state.ticker?.queue || [];
  if(q.length===0){
    bar.classList.add("hidden");
    return;
  }
  bar.classList.remove("hidden");
  el("tickerMsg").textContent = q[0].msg;
}

function computeLeaderHR(){
  let bestPid=null, bestVal=-1;
  for(const pid in state.season.batting){
    const s = state.season.batting[pid];
    const v = Number(s.HR||0);
    if(v>bestVal){ bestVal=v; bestPid=pid; }
  }
  return {pid:bestPid, val: bestVal<0?0:bestVal};
}

function checkLeaderChanges(){
  const hr = computeLeaderHR();
  const last = state.ticker?.last?.HR;
  if(!last || last.pid!==hr.pid || last.val!==hr.val){
    state.ticker.last.HR = hr;
    if(hr.pid){
      const p = getPlayer(hr.pid);
      const t = teamOfPlayer(hr.pid);
      const teamName = t?.name ? ` (${t.name})` : "";
      pushTicker(`New HR leader: ${p?.name||"Unknown"}${teamName} (${hr.val})`);
    }
  }
}

/* Exports */
function exportSeasonCsv(){
  const rows=[];
  rows.push(["Type","Player","Team","AB","H","HR","RBI","R","BB","SO","2B","3B","AVG"]);
  for(const t of state.teams){
    for(const p of (t.roster||[])){
      const s = state.season.batting[p.id] || { AB:0,H:0,HR:0,RBI:0,R:0,BB:0,SO:0,"2B":0,"3B":0 };
      const avg = s.AB ? (s.H/s.AB) : 0;
      rows.push(["Batting",p.name,t.name,s.AB,s.H,s.HR,s.RBI,s.R,s.BB,s.SO,s["2B"]||0,s["3B"]||0,avg.toFixed(3)]);
    }
  }
  rows.push([]);
  rows.push(["Type","Pitcher","Team","IP","OUTS","H","R","HR","BB","SO","W","L","SV","ERA"]);
  for(const t of state.teams){
    for(const p of (t.pitchers||[])){
      const s = state.season.pitching[p.id] || { OUTS:0,H:0,R:0,HR:0,BB:0,SO:0,W:0,L:0,SV:0 };
      const ip = outsToIP(s.OUTS||0);
      const era = s.OUTS ? ((s.R*9)/(s.OUTS/3)) : 0;
      rows.push(["Pitching",p.name,t.name,ip,s.OUTS||0,s.H||0,s.R||0,s.HR||0,s.BB||0,s.SO||0,s.W||0,s.L||0,s.SV||0,era.toFixed(2)]);
    }
  }
  downloadText("BHBL_Season_Stats.csv", toCsv(rows));
}

function exportScheduleCsv(){
  const rows=[["GameNo","Away","Home","Status","AwayScore","HomeScore","PlayedAt"]];
  const byId = Object.fromEntries(state.teams.map(t=>[t.id,t.name]));
  for(const g of state.schedule){
    rows.push([g.gameNo, byId[g.awayId]||"", byId[g.homeId]||"", g.status||"", g.awayScore??"", g.homeScore??"", g.playedAt||""]);
  }
  downloadText("BHBL_Schedule.csv", toCsv(rows));
}

function exportBoxscoresCsv(){
  const rows=[];
  const byId = Object.fromEntries(state.teams.map(t=>[t.id,t.name]));
  rows.push(["GameNo","Away","Home","AwayScore","HomeScore","Section","Player","Team","AB","H","HR","RBI","R","BB","SO","2B","3B","IP","OUTS","PH","PR","PHR","PBB","PSO"]);
  for(const g of (state.gameHistory||[])){
    const away = byId[g.awayId]||"";
    const home = byId[g.homeId]||"";
    for(const pid in (g.box?.batting||{})){
      const p=getPlayer(pid);
      const team=teamOfPlayer(pid)?.name||"";
      const s=g.box.batting[pid];
      rows.push([g.gameNo||"",away,home,g.awayScore,g.homeScore,"Batting",p?.name||"",team,s.AB||0,s.H||0,s.HR||0,s.RBI||0,s.R||0,s.BB||0,s.SO||0,s["2B"]||0,s["3B"]||0,"","","","","","",""]);
    }
    for(const pid in (g.box?.pitching||{})){
      const team = (getTeam(g.homeId)?.pitchers||[]).some(x=>x.id===pid) ? (byId[g.homeId]||"") :
                   (getTeam(g.awayId)?.pitchers||[]).some(x=>x.id===pid) ? (byId[g.awayId]||"") : "";
      const s=g.box.pitching[pid];
      const name = getPitcher(g.homeId,pid)?.name || getPitcher(g.awayId,pid)?.name || getPlayer(pid)?.name || "";
      rows.push([g.gameNo||"",away,home,g.awayScore,g.homeScore,"Pitching",name,team,"","","","","","","","","","",outsToIP(s.OUTS||0),s.OUTS||0,s.H||0,s.R||0,s.HR||0,s.BB||0,s.SO||0]);
    }
  }
  downloadText("BHBL_Boxscores.csv", toCsv(rows));
}


window.onerror = function(message, source, lineno, colno, error){
  try{
    console.error("BHBL Error:", message, source, lineno, colno, error);
    if(typeof pushTicker==="function"){
      pushTicker("App error: " + message + " (see console)");
    } else {
      alert("App error: " + message);
    }
  }catch(e){}
  return false;
};


