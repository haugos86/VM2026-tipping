import { useState, useEffect, useMemo, useCallback } from "react";

// ── CONFIG ────────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://cnauqnqntbywsjoyuvur.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYXVxbnFudGJ5d3Nqb3l1dnVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMDc5NTEsImV4cCI6MjA5NDc4Mzk1MX0.IPxbGJIFhoc_CMJXsbxPMqHc9oPDEQxYXib4ogg2nvM";
const ADMIN_PIN = "vm2026"; // FIX #9: still in code but "Standard PIN"-tekst fjernet fra UI
const DEADLINE = new Date("2026-06-11T18:00:00Z");

// FIX #10: Autosave-feil vises tydelig
// FIX #8: Navn normaliseres til Title Case ved registrering
function normalizeName(n) {
  return n.trim().replace(/\s+/," ").replace(/\b\w/g,c=>c.toUpperCase());
}

async function hashPin(pin) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pin + "vm2026salt"));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("").slice(0,16);
}

// ── DATA ──────────────────────────────────────────────────────────────────────
const GROUPS = {
  A:["Mexico","Sør-Korea","Sør-Afrika","Tsjekkia"],
  B:["Canada","Sveits","Qatar","Bosnia-Hercegovina"],
  C:["Brasil","Marokko","Skottland","Haiti"],
  D:["USA","Australia","Paraguay","Tyrkia"],
  E:["Tyskland","Ecuador","Elfenbenskysten","Curaçao"],
  F:["Nederland","Japan","Tunisia","Sverige"],
  G:["Belgia","Iran","Egypt","New Zealand"],
  H:["Spania","Uruguay","Saudi-Arabia","Kapp Verde"],
  I:["Frankrike","Senegal","Norge","Irak"],
  J:["Argentina","Østerrike","Algerie","Jordan"],
  K:["Portugal","Colombia","Usbekistan","DR Kongo"],
  L:["England","Kroatia","Panama","Ghana"],
};

// FIX #4: Complete FLAG_CODE with direct Norwegian names
const FLAG_CODE = {
  "Mexico":"mx","Sør-Korea":"kr","Sør-Afrika":"za","Tsjekkia":"cz",
  "Canada":"ca","Sveits":"ch","Qatar":"qa","Bosnia-Hercegovina":"ba",
  "Brasil":"br","Marokko":"ma","Skottland":"gb-sct","Haiti":"ht",
  "USA":"us","Australia":"au","Paraguay":"py","Tyrkia":"tr",
  "Tyskland":"de","Ecuador":"ec","Elfenbenskysten":"ci","Curaçao":"cw",
  "Nederland":"nl","Japan":"jp","Tunisia":"tn","Sverige":"se",
  "Belgia":"be","Iran":"ir","Egypt":"eg","New Zealand":"nz",
  "Spania":"es","Uruguay":"uy","Saudi-Arabia":"sa","Kapp Verde":"cv",
  "Frankrike":"fr","Senegal":"sn","Norge":"no","Irak":"iq",
  "Argentina":"ar","Østerrike":"at","Algerie":"dz","Jordan":"jo",
  "Portugal":"pt","Colombia":"co","Usbekistan":"uz","DR Kongo":"cd",
  "England":"gb-eng","Kroatia":"hr","Panama":"pa","Ghana":"gh",
};

function FlagImg({team,size=20}) {
  const code = FLAG_CODE[team];
  if (!code) return <span style={{fontSize:size*0.85,lineHeight:1,display:"inline-block",verticalAlign:"middle"}}>🏳️</span>;
  return (
    <img src={`https://flagcdn.com/w${size*2}/${code}.png`} alt={team} width={size}
      height={Math.round(size*0.67)}
      style={{objectFit:"cover",borderRadius:2,verticalAlign:"middle",display:"inline-block",flexShrink:0}}
      onError={e=>{e.target.style.display="none";}}/>
  );
}

function generateGroupMatches() {
  const m=[]; let id=1;
  Object.entries(GROUPS).forEach(([g,teams])=>{
    [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]].forEach(([a,b])=>{
      m.push({id:`g${id++}`,group:g,home:teams[a],away:teams[b],phase:"group"});
    });
  });
  return m;
}
const GROUP_MATCHES = generateGroupMatches(); // 72 kamper

const KNOCKOUT_SLOTS = [
  // R32 — 12 beregnede + 4 adminOnly (beste 3.-plasser)
  {id:"r32_1", phase:"R32",label:"16-delsfinale 1", slot1:"1A",slot2:"2C"},
  {id:"r32_2", phase:"R32",label:"16-delsfinale 2", slot1:"1B",slot2:"2D"},
  {id:"r32_3", phase:"R32",label:"16-delsfinale 3", slot1:"1C",slot2:"2A"},
  {id:"r32_4", phase:"R32",label:"16-delsfinale 4", slot1:"1D",slot2:"2B"},
  {id:"r32_5", phase:"R32",label:"16-delsfinale 5", slot1:"1E",slot2:"2G"},
  {id:"r32_6", phase:"R32",label:"16-delsfinale 6", slot1:"1F",slot2:"2H"},
  {id:"r32_7", phase:"R32",label:"16-delsfinale 7", slot1:"1G",slot2:"2E"},
  {id:"r32_8", phase:"R32",label:"16-delsfinale 8", slot1:"1H",slot2:"2F"},
  {id:"r32_9", phase:"R32",label:"16-delsfinale 9", slot1:"1I",slot2:"2K"},
  {id:"r32_10",phase:"R32",label:"16-delsfinale 10",slot1:"1J",slot2:"2L"},
  {id:"r32_11",phase:"R32",label:"16-delsfinale 11",slot1:"1K",slot2:"2I"},
  {id:"r32_12",phase:"R32",label:"16-delsfinale 12",slot1:"1L",slot2:"2J"},
  // FIX #5: adminOnly-kamper kan ikke tippes av deltakere, telles ikke i poeng
  {id:"r32_13",phase:"R32",label:"16-delsfinale 13",slot1:"ADMIN",slot2:"ADMIN",adminOnly:true},
  {id:"r32_14",phase:"R32",label:"16-delsfinale 14",slot1:"ADMIN",slot2:"ADMIN",adminOnly:true},
  {id:"r32_15",phase:"R32",label:"16-delsfinale 15",slot1:"ADMIN",slot2:"ADMIN",adminOnly:true},
  {id:"r32_16",phase:"R32",label:"16-delsfinale 16",slot1:"ADMIN",slot2:"ADMIN",adminOnly:true},
  // R16
  ...Array.from({length:8},(_,i)=>({id:`r16_${i+1}`,phase:"R16",label:`Åttendelsfinale ${i+1}`,slot1:`V_r32_${i*2+1}`,slot2:`V_r32_${i*2+2}`})),
  // QF
  ...Array.from({length:4},(_,i)=>({id:`qf${i+1}`,phase:"QF",label:`Kvartfinale ${i+1}`,slot1:`V_r16_${i*2+1}`,slot2:`V_r16_${i*2+2}`})),
  {id:"sf1",phase:"SF",label:"Semifinale 1",slot1:"V_qf1",slot2:"V_qf2"},
  {id:"sf2",phase:"SF",label:"Semifinale 2",slot1:"V_qf3",slot2:"V_qf4"},
  {id:"3p", phase:"3P",label:"Bronsefinale",  slot1:"T_sf1",slot2:"T_sf2"},
  {id:"f",  phase:"F", label:"⭐ FINALE",      slot1:"V_sf1",slot2:"V_sf2"},
];

const BONUS_QUESTIONS = [
  {id:"b1",text:"Hvem vinner VM?",              icon:"🏆",type:"text",  points:10},
  {id:"b2",text:"Hvem blir toppscorer?",          icon:"⚽",type:"text",  points:8},
  {id:"b3",text:"Antall røde kort i turneringen?",icon:"🟥",type:"number",points:6},
  {id:"b4",text:"Antall mål i turneringen?",      icon:"📊",type:"number",points:6},
  {id:"b5",text:"Antall mål Norge scorer totalt?",icon:"🇳🇴",type:"number",points:5},
];

const PTS = {
  group:  {exact:3,outcome:1},
  R32:    {exact:3,outcome:1,advance:2},
  R16:    {exact:4,outcome:2,advance:3},
  QF:     {exact:5,outcome:2,advance:4},
  SF:     {exact:6,outcome:3,advance:5},
  "3P":   {exact:4,outcome:2,advance:0},
  F:      {exact:8,outcome:4,advance:8},
  groupRank:{first:4,second:3,third:2},
};

// ── SUPABASE ──────────────────────────────────────────────────────────────────
const sb = {
  async query(table,method="GET",body=null,filter="") {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${filter}`, {
      method,
      headers:{
        "Content-Type":"application/json",
        "apikey":SUPABASE_ANON_KEY,
        "Authorization":`Bearer ${SUPABASE_ANON_KEY}`,
        "Prefer":method==="POST"?"return=representation,resolution=merge-duplicates":"return=representation",
      },
      body:body?JSON.stringify(body):null,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.status===204?[]:res.json();
  },
  getAll:      t=>sb.query(t,"GET",null,"?select=*"),
  upsert:      (t,b)=>sb.query(t,"POST",b,"?on_conflict=id"),
  upsertByName:(t,b)=>sb.query(t,"POST",b,"?on_conflict=name"),
};

// ── SCORING ───────────────────────────────────────────────────────────────────
function matchOutcome(h,a){ if(h>a) return "H"; if(a>h) return "A"; return "D"; }

function scoreGroupMatch(tip,result) {
  if (!tip||!result||tip.home===""||tip.away===""||result.home===""||result.away==="") return null;
  const [th,ta,rh,ra]=[tip.home,tip.away,result.home,result.away].map(Number);
  if ([th,ta,rh,ra].some(isNaN)) return null;
  if (th===rh&&ta===ra) return PTS.group.exact;
  if (matchOutcome(th,ta)===matchOutcome(rh,ra)) return PTS.group.outcome;
  return 0;
}

// FIX #2: Knockout har ikke uavgjort — 1-1 betyr hjemmelaget vinner (på straffer).
// Vi scorer basert på hvem du tippet ville vinne (h>a = hjemme, h<a = borte, h=a = hjemme).
function scoreKnockout(tip,result,phase) {
  if (!tip||!result||tip.home===""||tip.away===""||result.home===""||result.away==="") return null;
  const [th,ta,rh,ra]=[tip.home,tip.away,result.home,result.away].map(Number);
  if ([th,ta,rh,ra].some(isNaN)) return null;
  const cfg = PTS[phase]||PTS.R32;
  if (th===rh&&ta===ra) return cfg.exact;
  // Utfall: hvem tippet du ville vinne? (uavgjort = hjemme)
  const tipWins  = th>=ta?"home":"away";
  const realWins = rh>=ra?"home":"away";
  if (tipWins===realWins) return cfg.outcome;
  return 0;
}

// FIX #1: Utled vinner fra resultat (brukes til advance-poeng)
function inferWinner(result,slot,tips) {
  if (!result||result.home===""||result.away==="") return null;
  const rh=Number(result.home),ra=Number(result.away);
  if (isNaN(rh)||isNaN(ra)) return null;
  const homeTeam=resolveSlot(slot.slot1,tips);
  const awayTeam=resolveSlot(slot.slot2,tips);
  return rh>=ra?homeTeam:awayTeam; // uavgjort = hjemme vinner (straffer)
}

// Beregn gruppestandings fra et tips/results-objekt
function computeGroupStandings(groupId,tipsOrResults) {
  const teams=GROUPS[groupId];
  const stats=Object.fromEntries(teams.map(t=>[t,{pts:0,gd:0,gf:0}]));
  GROUP_MATCHES.filter(m=>m.group===groupId).forEach(m=>{
    const r=tipsOrResults[m.id];
    if (!r||r.home===""||r.away==="") return;
    const h=parseInt(r.home),a=parseInt(r.away);
    if (isNaN(h)||isNaN(a)) return;
    if (h>a){stats[m.home].pts+=3;}
    else if (a>h){stats[m.away].pts+=3;}
    else{stats[m.home].pts+=1;stats[m.away].pts+=1;}
    stats[m.home].gf+=h;stats[m.home].gd+=(h-a);
    stats[m.away].gf+=a;stats[m.away].gd+=(a-h);
  });
  return teams.slice().sort((a,b)=>
    stats[b].pts-stats[a].pts||stats[b].gd-stats[a].gd||stats[b].gf-stats[a].gf
  );
}

// Manual group rank overrides set by admin: { "A": ["Mexico","Sør-Korea","Sør-Afrika","Tsjekkia"], ... }
// Stored in results as id="override_A", home=JSON
let GROUP_OVERRIDES = {};
function setGroupOverride(group, ranking) {
  GROUP_OVERRIDES = {...GROUP_OVERRIDES, [group]: ranking};
}
function getGroupRanking(group, tipsOrResults) {
  // Admin override takes priority
  if (GROUP_OVERRIDES[group]&&GROUP_OVERRIDES[group].length===4) return GROUP_OVERRIDES[group];
  return computeGroupStandings(group, tipsOrResults);
}

function resolveSlot(slot,tips) {
  if (!slot||slot==="ADMIN") return null;
  const rankMatch=slot.match(/^([123])([A-L])$/);
  if (rankMatch) {
    const rank=parseInt(rankMatch[1])-1;
    const group=rankMatch[2];
    const tipped=GROUP_MATCHES.filter(m=>m.group===group&&tips[m.id]?.home!==undefined&&tips[m.id]?.home!=="").length;
    if (tipped===0) return null;
    // For participant tips: use computed standings (no override)
    return computeGroupStandings(group,tips)[rank]||null;
  }
  const winMatch=slot.match(/^V_(.+)$/);
  if (winMatch) {
    const matchId=winMatch[1];
    const t=tips[matchId];
    if (!t||t.home===""||t.away==="") return null;
    const h=parseInt(t.home),a=parseInt(t.away);
    if (isNaN(h)||isNaN(a)) return null;
    const s=KNOCKOUT_SLOTS.find(s=>s.id===matchId);
    if (!s) return null;
    const home=resolveSlot(s.slot1,tips);
    const away=resolveSlot(s.slot2,tips);
    return h>=a?home:away; // FIX #2: uavgjort = hjemme
  }
  const loseMatch=slot.match(/^T_(.+)$/);
  if (loseMatch) {
    const matchId=loseMatch[1];
    const t=tips[matchId];
    if (!t||t.home===""||t.away==="") return null;
    const h=parseInt(t.home),a=parseInt(t.away);
    if (isNaN(h)||isNaN(a)) return null;
    const s=KNOCKOUT_SLOTS.find(s=>s.id===matchId);
    if (!s) return null;
    const home=resolveSlot(s.slot1,tips);
    const away=resolveSlot(s.slot2,tips);
    return h<a?home:away; // taper
  }
  return slot;
}

// resolveForDisplay: like resolveSlot but uses admin results+teamnames for adminOnly slots
// This powers "Mine tips" so the full bracket shows real team names
function resolveForDisplay(slot, tips, results) {
  if (!slot||slot==="ADMIN") return null;

  // Group rank: same as resolveSlot
  const rankMatch=slot.match(/^([123])([A-L])$/);
  if (rankMatch) {
    const rank=parseInt(rankMatch[1])-1;
    const group=rankMatch[2];
    // Use admin results if available, else participant tips
    const adminPlayed=GROUP_MATCHES.filter(m=>m.group===group&&results[m.id]?.home!==undefined&&results[m.id]?.home!=="").length;
    if (adminPlayed>0) {
      const override=GROUP_OVERRIDES[group];
      return override&&override.length===4?override[rank]:computeGroupStandings(group,results)[rank]||null;
    }
    const tipped=GROUP_MATCHES.filter(m=>m.group===group&&tips[m.id]?.home!==undefined&&tips[m.id]?.home!=="").length;
    if (tipped===0) return null;
    return computeGroupStandings(group,tips)[rank]||null;
  }

  // Winner of a match
  const winMatch=slot.match(/^V_(.+)$/);
  if (winMatch) {
    const matchId=winMatch[1];
    const s=KNOCKOUT_SLOTS.find(s=>s.id===matchId);
    if (!s) return null;

    // For adminOnly slots: use admin-stored team names + result score
    if (s.adminOnly) {
      const res=results[matchId];
      if (!res||res.home===""||res.away==="") return null;
      const rh=parseInt(res.home),ra=parseInt(res.away);
      if (isNaN(rh)||isNaN(ra)) return null;
      const homeTeam=typeof results[matchId+"_home"]==="string"?results[matchId+"_home"]:null;
      const awayTeam=typeof results[matchId+"_away"]==="string"?results[matchId+"_away"]:null;
      if (!homeTeam||!awayTeam) return null;
      return rh>=ra?homeTeam:awayTeam;
    }

    // For normal slots: prefer admin result, fall back to participant tip
    const res=results[matchId];
    const tip=tips[matchId];
    const score=res?.home!==undefined&&res?.home!==""?res:tip;
    if (!score||score.home===""||score.away==="") return null;
    const h=parseInt(score.home),a=parseInt(score.away);
    if (isNaN(h)||isNaN(a)) return null;
    const home=resolveForDisplay(s.slot1,tips,results);
    const away=resolveForDisplay(s.slot2,tips,results);
    return h>=a?home:away;
  }

  // Loser of a match (for bronsefinale)
  const loseMatch=slot.match(/^T_(.+)$/);
  if (loseMatch) {
    const matchId=loseMatch[1];
    const s=KNOCKOUT_SLOTS.find(s=>s.id===matchId);
    if (!s) return null;
    const res=results[matchId];
    const tip=tips[matchId];
    const score=res?.home!==undefined&&res?.home!==""?res:tip;
    if (!score||score.home===""||score.away==="") return null;
    const h=parseInt(score.home),a=parseInt(score.away);
    if (isNaN(h)||isNaN(a)) return null;
    const home=resolveForDisplay(s.slot1,tips,results);
    const away=resolveForDisplay(s.slot2,tips,results);
    return h<a?home:away;
  }

  return slot;
}

function calcTotal(p,results,bonusResults) {
  let pts=0;
  const tips=p.tips||{};

  // Gruppekamper
  GROUP_MATCHES.forEach(m=>{
    const s=scoreGroupMatch(tips[m.id],results[m.id]);
    if (s!==null) pts+=s;
  });

  // Grupperanking — bare gi poeng når ALLE 6 kamper i gruppen er spilt
  Object.keys(GROUPS).forEach(g=>{
    const groupMatchIds=GROUP_MATCHES.filter(m=>m.group===g).map(m=>m.id);
    const resultsInGroup=groupMatchIds.filter(id=>results[id]?.home!==undefined&&results[id]?.home!=="").length;
    if (resultsInGroup<6) return; // ikke ferdig
    const tippedInGroup=groupMatchIds.filter(id=>tips[id]?.home!==undefined&&tips[id]?.home!=="").length;
    if (tippedInGroup===0) return;
    // Use override if admin has set one, otherwise compute from results
    const actual=GROUP_OVERRIDES[g]&&GROUP_OVERRIDES[g].length===4
      ? GROUP_OVERRIDES[g]
      : computeGroupStandings(g,results);
    const tipped=computeGroupStandings(g,tips);
    if (actual[0]&&tipped[0]===actual[0]) pts+=PTS.groupRank.first;
    if (actual[1]&&tipped[1]===actual[1]) pts+=PTS.groupRank.second;
    if (actual[2]&&tipped[2]===actual[2]) pts+=PTS.groupRank.third;
  });

  // Sluttspill
  KNOCKOUT_SLOTS.forEach(slot=>{
    // FIX #5: adminOnly-kamper gir aldri poeng til deltakere
    if (slot.adminOnly) return;
    const tip=tips[slot.id];
    const res=results[slot.id];
    const s=scoreKnockout(tip,res,slot.phase);
    if (s!==null) pts+=s;
    // FIX #1: Advance-poeng — bruk inferWinner fra resultater, ikke res.winner
    const cfg=PTS[slot.phase];
    if (cfg&&cfg.advance>0&&res&&tip) {
      const th=parseInt(tip.home),ta=parseInt(tip.away);
      if (!isNaN(th)&&!isNaN(ta)) {
        const tipWinnerTeam=th>=ta?resolveSlot(slot.slot1,tips):resolveSlot(slot.slot2,tips);
        const actualWinnerTeam=inferWinner(res,slot,results);
        if (tipWinnerTeam&&actualWinnerTeam&&tipWinnerTeam===actualWinnerTeam) pts+=cfg.advance;
      }
    }
  });

  // Bonus
  BONUS_QUESTIONS.forEach(q=>{
    const tip=p.bonus?.[q.id];
    if (!tip||tip.toString().trim()==="") return;
    const tipNorm=tip.toString().trim().toLowerCase();
    const approved=bonusResults[q.id]?.approved||[];
    const legacy=bonusResults[q.id]?.answer;
    const ok=approved.some(a=>a.toString().trim().toLowerCase()===tipNorm)
      ||(legacy&&tipNorm===legacy.toString().trim().toLowerCase());
    if (ok) pts+=q.points;
  });

  return pts;
}

// ── DESIGN ────────────────────────────────────────────────────────────────────
const T={teal:"#2a7a6a",mint:"#7ec8a0",gold:"#f0c05a",muted:"rgba(255,255,255,0.45)"};
const inputCss={display:"block",width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,color:"#fff",fontSize:15,padding:"12px 16px",fontFamily:"inherit",marginBottom:14,outline:"none"};
const labelCss={display:"block",fontSize:11,fontWeight:700,letterSpacing:1.5,color:T.mint,textTransform:"uppercase",marginBottom:6};
const cardCss={background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:"20px 22px",maxWidth:740,margin:"0 auto"};

function Btn({children,onClick,disabled,ghost,sm}) {
  return <button onClick={onClick} disabled={disabled} style={{
    padding:sm?"7px 14px":"11px 22px",borderRadius:9,
    border:ghost?"1px solid rgba(255,255,255,0.14)":"none",
    cursor:disabled?"not-allowed":"pointer",fontFamily:"inherit",
    fontSize:sm?12:14,fontWeight:700,
    background:ghost?"rgba(255,255,255,0.05)":`linear-gradient(135deg,${T.teal},#1a5a4a)`,
    color:"#fff",opacity:disabled?0.4:1,transition:"all 0.18s",
    boxShadow:ghost||disabled?"none":"0 2px 12px rgba(42,122,106,0.4)",
  }}>{children}</button>;
}

function ScoreInput({val,onChange,disabled}) {
  return <input type="number" min="0" max="30" value={val??""} onChange={e=>onChange(e.target.value)}
    disabled={disabled} style={{width:40,height:36,textAlign:"center",
    background:disabled?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.08)",
    border:"1px solid rgba(255,255,255,0.14)",borderRadius:8,color:"#fff",
    fontSize:16,fontFamily:"inherit",outline:"none",opacity:disabled?0.5:1}}/>;
}

function GroupBanner({group}) {
  return (
    <div style={{margin:"18px 0 4px",padding:"8px 12px",background:"rgba(42,122,106,0.1)",border:"1px solid rgba(42,122,106,0.2)",borderRadius:10,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
      <span style={{fontSize:11,fontWeight:800,letterSpacing:2,color:T.mint,textTransform:"uppercase"}}>Gruppe {group}</span>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        {GROUPS[group].map(t=>(
          <span key={t} style={{fontSize:13,color:"rgba(255,255,255,0.7)",display:"flex",alignItems:"center",gap:4}}>
            <FlagImg team={t}/> {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function PhaseHeader({phase}) {
  const labels={R32:"16-delsfinaler",R16:"Åttendelsfinaler",QF:"Kvartfinaler",SF:"Semifinaler","3P":"Bronsefinale",F:"⭐ FINALE",BONUS:"Bonusspørsmål"};
  return (
    <div style={{margin:"24px 0 6px",padding:"6px 12px",background:"rgba(240,192,90,0.08)",border:"1px solid rgba(240,192,90,0.18)",borderRadius:8,fontSize:11,fontWeight:800,letterSpacing:2,color:T.gold,textTransform:"uppercase"}}>
      {labels[phase]??phase}
    </div>
  );
}

function MatchRow({match,tip,onChange,readOnly,result,phase}) {
  const pts = result?.home!==undefined&&result?.away!==undefined
    ?(phase==="group"?scoreGroupMatch(tip,result):scoreKnockout(tip,result,phase)):null;
  const exactPts = phase==="group"?PTS.group.exact:(PTS[phase]||PTS.R32).exact;
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,alignItems:"center",padding:"7px 2px",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
      <div style={{textAlign:"right",fontSize:13,color:"rgba(255,255,255,0.85)",display:"flex",alignItems:"center",justifyContent:"flex-end",gap:5}}>
        <strong>{match.home}</strong><FlagImg team={match.home}/>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:5}}>
        {readOnly?(
          <div style={{minWidth:58,textAlign:"center",fontSize:14,fontWeight:700,color:"rgba(255,255,255,0.55)",letterSpacing:1}}>
            {tip?.home??"–"}–{tip?.away??"–"}
          </div>
        ):(
          <>
            <ScoreInput val={tip?.home??""} onChange={v=>onChange({...tip,home:v})}/>
            <span style={{color:"rgba(255,255,255,0.25)"}}>–</span>
            <ScoreInput val={tip?.away??""} onChange={v=>onChange({...tip,away:v})}/>
          </>
        )}
        {pts!==null&&(
          <div style={{minWidth:30,textAlign:"center",padding:"3px 6px",borderRadius:6,fontSize:11,fontWeight:800,
            background:pts===exactPts?"rgba(240,192,90,0.15)":pts>0?"rgba(126,200,160,0.12)":"rgba(255,255,255,0.04)",
            color:pts===exactPts?T.gold:pts>0?T.mint:"#555"}}>
            {pts}p
          </div>
        )}
      </div>
      <div style={{fontSize:13,color:"rgba(255,255,255,0.85)",display:"flex",alignItems:"center",gap:5}}>
        <FlagImg team={match.away}/><strong>{match.away}</strong>
      </div>
    </div>
  );
}

function KnockoutMatchRow({slot,tips,setTip,results,readOnly}) {
  // FIX #5: adminOnly-rader er read-only for deltakere
  if (slot.adminOnly) return (
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 4px",borderBottom:"1px solid rgba(255,255,255,0.04)",opacity:0.35}}>
      <div style={{flex:1,textAlign:"right",fontSize:12,color:"rgba(255,255,255,0.4)",fontStyle:"italic"}}>Beste 3.-plass (fastsettes etter gruppespill)</div>
      <div style={{display:"flex",alignItems:"center",gap:5}}>
        <ScoreInput val={results?.[slot.id]?.home??""} disabled onChange={()=>{}}/>
        <span style={{color:"rgba(255,255,255,0.25)"}}>–</span>
        <ScoreInput val={results?.[slot.id]?.away??""} disabled onChange={()=>{}}/>
      </div>
      <div style={{flex:1,fontSize:12,color:"rgba(255,255,255,0.4)",fontStyle:"italic"}}>Beste 3.-plass</div>
    </div>
  );

  // Use resolveForDisplay if results available (admin has entered data), else resolveSlot
  const home=resolveForDisplay?resolveForDisplay(slot.slot1,tips||{},results||{}):resolveSlot(slot.slot1,tips||{});
  const away=resolveForDisplay?resolveForDisplay(slot.slot2,tips||{},results||{}):resolveSlot(slot.slot2,tips||{});
  const tip=tips?.[slot.id];
  const result=results?.[slot.id];
  const pts=result?.home!==undefined?scoreKnockout(tip,result,slot.phase):null;
  const hasTeams=!!(home&&away);

  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,alignItems:"center",padding:"8px 4px",borderBottom:"1px solid rgba(255,255,255,0.04)",opacity:hasTeams?1:0.4}}>
      <div style={{textAlign:"right",fontSize:13,color:"rgba(255,255,255,0.85)",display:"flex",alignItems:"center",justifyContent:"flex-end",gap:5}}>
        {home?<><strong>{home}</strong><FlagImg team={home}/></>:<span style={{color:"rgba(255,255,255,0.3)",fontSize:12}}>{slot.slot1}</span>}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:5}}>
        {readOnly?(
          <div style={{minWidth:58,textAlign:"center",fontSize:14,fontWeight:700,color:hasTeams?"rgba(255,255,255,0.55)":"rgba(255,255,255,0.25)"}}>{tip?.home??"–"}–{tip?.away??"–"}</div>
        ):(
          <>
            <ScoreInput val={tip?.home??""} disabled={!hasTeams} onChange={v=>setTip&&setTip(slot.id,{...tip,home:v})}/>
            <span style={{color:"rgba(255,255,255,0.25)"}}>–</span>
            <ScoreInput val={tip?.away??""} disabled={!hasTeams} onChange={v=>setTip&&setTip(slot.id,{...tip,away:v})}/>
          </>
        )}
        {pts!==null&&(
          <div style={{minWidth:30,textAlign:"center",padding:"3px 6px",borderRadius:6,fontSize:11,fontWeight:800,
            background:pts>0?"rgba(126,200,160,0.12)":"rgba(255,255,255,0.04)",color:pts>0?T.mint:"#555"}}>{pts}p</div>
        )}
      </div>
      <div style={{fontSize:13,color:"rgba(255,255,255,0.85)",display:"flex",alignItems:"center",gap:5}}>
        {away?<><FlagImg team={away}/><strong>{away}</strong></>:<span style={{color:"rgba(255,255,255,0.3)",fontSize:12}}>{slot.slot2}</span>}
      </div>
    </div>
  );
}

function DeadlineBanner() {
  const [now,setNow]=useState(new Date());
  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(t);},[]);
  const diff=DEADLINE-now;
  if (diff<=0) return (
    <div style={{background:"rgba(180,40,40,0.18)",border:"1px solid rgba(200,60,60,0.3)",borderRadius:12,padding:"12px 18px",marginBottom:16,textAlign:"center"}}>
      <span style={{color:"#f08080",fontWeight:700}}>🔒 Tipping stengt — VM er i gang!</span>
    </div>
  );
  const parts=[[Math.floor(diff/86400000),"dager"],[Math.floor((diff%86400000)/3600000),"timer"],[Math.floor((diff%3600000)/60000),"min"],[Math.floor((diff%60000)/1000),"sek"]];
  return (
    <div style={{background:"rgba(42,122,106,0.12)",border:"1px solid rgba(42,122,106,0.25)",borderRadius:12,padding:"12px 18px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
      <span style={{fontSize:11,fontWeight:700,letterSpacing:1.5,color:T.mint,textTransform:"uppercase"}}>⏱ Stenger om</span>
      <div style={{display:"flex",gap:14}}>
        {parts.map(([v,l])=>(
          <div key={l} style={{textAlign:"center"}}>
            <div style={{fontSize:20,fontWeight:800,color:T.gold,lineHeight:1}}>{String(v).padStart(2,"0")}</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",letterSpacing:1}}>{l.toUpperCase()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── REGISTER / LOGIN ──────────────────────────────────────────────────────────
function RegisterView({onRegister,externalResults={}}) {
  const [mode,setMode]=useState("choose");
  const [name,setName]=useState(""),[pin,setPin]=useState(""),[pinConfirm,setPinConfirm]=useState("");
  const [tips,setTips]=useState({}),[bonus,setBonus]=useState({});
  const [step,setStep]=useState("group"),[currentGroup,setCurrentGroup]=useState("A");
  const [saving,setSaving]=useState(false);
  // FIX #10: separate autoSave error state
  const [autoSaveState,setAutoSaveState]=useState("idle"); // idle | saving | error
  const [error,setError]=useState(""),[currentUser,setCurrentUser]=useState(null);
  const locked=new Date()>=DEADLINE;

  const setTip=(id,val)=>setTips(t=>({...t,[id]:val}));

  // FIX #10: Show save errors clearly; retry on next change
  useEffect(()=>{
    if (!currentUser) return;
    setAutoSaveState("saving");
    const timer=setTimeout(async()=>{
      try {
        await sb.upsert("participants",[{...currentUser,tips,bonus}]);
        setAutoSaveState("idle");
      } catch(e) {
        console.error("Autosave failed:",e);
        setAutoSaveState("error");
      }
    },1500);
    return()=>clearTimeout(timer);
  },[tips,bonus,currentUser]);

  // FIX #7: Deadline enforced client-side before submit
  const isLocked=new Date()>=DEADLINE;

  const doRegister=async()=>{
    if (isLocked){setError("Tipping er stengt.");return;}
    const cleanName=normalizeName(name); // FIX #8
    if (!cleanName||pin.length<4||pin!==pinConfirm) return;
    setSaving(true);setError("");
    try {
      const ph=await hashPin(pin);
      const ex=await sb.query("participants","GET",null,`?name=eq.${encodeURIComponent(cleanName)}&select=name`);
      if (ex.length>0){setError("Navn allerede i bruk — logg inn i stedet.");setSaving(false);return;}
      const u={name:cleanName,pin_hash:ph,tips:{},bonus:{}};
      await sb.upsert("participants",[u]);
      setCurrentUser(u);setTips({});setBonus({});onRegister();setMode("editing");
    } catch(e){setError("Feil: "+e.message);}
    finally{setSaving(false);}
  };

  const doLogin=async()=>{
    const cleanName=normalizeName(name); // FIX #8
    if (!cleanName||!pin) return;
    setSaving(true);setError("");
    try {
      const ph=await hashPin(pin);
      const res=await sb.query("participants","GET",null,`?name=eq.${encodeURIComponent(cleanName)}&select=*`);
      if (res.length===0){setError("Bruker ikke funnet — sjekk stavemåten eller registrer deg.");setSaving(false);return;}
      if (res[0].pin_hash!==ph){setError("Feil PIN-kode.");setSaving(false);return;}
      const u=res[0];
      setCurrentUser(u);setTips(u.tips||{});setBonus(u.bonus||{});onRegister();setMode("editing");
    } catch(e){setError("Feil: "+e.message);}
    finally{setSaving(false);}
  };

  const doSubmit=async()=>{
    if (isLocked){setError("Tipping er stengt — du kan ikke endre etter kampstart.");return;}
    setSaving(true);
    try {
      await sb.upsert("participants",[{...currentUser,tips,bonus}]);
      setMode("done");onRegister();
    } catch(e){setError("Feil ved lagring: "+e.message);}
    finally{setSaving(false);}
  };

  // ── AUTOFYLL ─────────────────────────────────────────────────────────────────
  const [autoFilling,setAutoFilling]=useState(false);
  const [autoFillCount,setAutoFillCount]=useState(0);

  const doAutoFill=async()=>{
    setAutoFilling(true);
    try {
      // Build prompt with all matches and FIFA ranking context
      const groupList=Object.entries(GROUPS).map(([g,teams])=>`Gruppe ${g}: ${teams.join(", ")}`).join("\n");
      const matchList=GROUP_MATCHES.map(m=>`${m.id}: ${m.home} vs ${m.away}`).join("\n");
      const koList=KNOCKOUT_SLOTS.filter(s=>!s.adminOnly).map(s=>`${s.id}: ${s.label}`).join("\n");
      const bonusList=BONUS_QUESTIONS.map(q=>`${q.id}: ${q.text}`).join("\n");

      const prompt=`Du er en fotballekspert som skal lage et realistisk VM 2026-tippeskjema.

Grupper:
${groupList}

Generer realistiske resultater basert på FIFA-ranking og lagstyrke. Bruk litt tilfeldighet — overraskelser skjer i fotball! Dette er forsøk nummer ${autoFillCount+1} så gi litt varierte resultater.

Returner KUN gyldig JSON i dette formatet (ingen annen tekst):
{
  "matches": {
    "g1": {"home": "2", "away": "1"},
    ... (alle 72 gruppekamper, id g1-g72)
  },
  "knockout": {
    "r32_1": {"home": "2", "away": "0"},
    ... (alle sluttspillkamper unntatt r32_13 til r32_16)
  },
  "bonus": {
    "b1": "Brasil",
    "b2": "Kylian Mbappé",
    "b3": "18",
    "b4": "103",
    "b5": "4"
  }
}

Regler:
- MAKS 5 mål per lag i en kamp — aldri 6 eller høyere
- Typiske resultater: 1-0, 2-1, 1-1, 2-0, 3-1. Sjeldent: 4-0, 4-1. Ekstremt sjeldent: 5-x
- Favoritter vinner oftere men ikke alltid — gjerne 1-2 overraskelser per gruppe
- I sluttspill: 1-0, 2-1, 1-1, 2-0 er typisk. Maks 3-0
- INKLUDER "3p" (bronsefinale) i knockout-objektet
- Bonus b3=røde kort (typisk 15-25), b4=mål totalt (typisk 150-180 for 104 kamper), b5=mål Norge scorer totalt i gruppespill
- VIKTIG: inkluder alle 72 gruppekamper (g1 til g72) og alle sluttspillkamper inkludert "3p", unntatt r32_13, r32_14, r32_15, r32_16`;

      const response=await fetch("/api/autofill",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({prompt,attempt:autoFillCount})
      });
      const data=await response.json();
      if (!response.ok) throw new Error(data.error||"API-feil");
      const text=data.content?.[0]?.text||"";
      // Parse JSON from response
      const jsonMatch=text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Ingen gyldig JSON i svaret");
      const parsed=JSON.parse(jsonMatch[0]);

      // Apply match tips — cap at 5 to avoid unrealistic scores
      const capScore=v=>String(Math.min(5,Math.max(0,parseInt(v)||0)));
      const newTips={...tips};
      if (parsed.matches) {
        Object.entries(parsed.matches).forEach(([id,score])=>{
          if (score?.home!==undefined&&score?.away!==undefined) {
            newTips[id]={home:capScore(score.home),away:capScore(score.away)};
          }
        });
      }
      // Apply knockout tips — also fill bronsefinale via loser logic
      if (parsed.knockout) {
        Object.entries(parsed.knockout).forEach(([id,score])=>{
          if (score?.home!==undefined&&score?.away!==undefined) {
            newTips[id]={home:capScore(score.home),away:capScore(score.away)};
          }
        });
      }
      // Bronsefinale: if sf1 and sf2 are filled but 3p is not, auto-generate
      if (newTips["sf1"]&&newTips["sf2"]&&!newTips["3p"]) {
        newTips["3p"]={home:String(Math.floor(Math.random()*3)),away:String(Math.floor(Math.random()*3))};
      }
      setTips(newTips);

      // Apply bonus
      if (parsed.bonus) {
        const newBonus={...bonus};
        Object.entries(parsed.bonus).forEach(([id,val])=>{
          newBonus[id]=String(val);
        });
        setBonus(newBonus);
      }

      setAutoFillCount(n=>n+1);
    } catch(e) {
      console.error("Autofyll feilet:",e);
      alert("Autofyll feilet: "+e.message);
    } finally {
      setAutoFilling(false);
    }
  };

  if (locked&&mode!=="done"&&mode!=="editing") return (
    <div style={{...cardCss,textAlign:"center",padding:"48px 24px"}}>
      <div style={{fontSize:48,marginBottom:12}}>🔒</div>
      <h2 style={{color:"#fff",margin:"0 0 8px"}}>Tipping er stengt</h2>
      <p style={{color:T.muted}}>VM startet 11. juni 2026.</p>
    </div>
  );

  if (mode==="choose") return (
    <div style={cardCss}>
      <DeadlineBanner/>
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{fontSize:52,marginBottom:8}}>⚽</div>
        <h2 style={{color:"#fff",margin:"0 0 4px",fontSize:22}}>VM 2026 Tippekonkurranse</h2>
        <p style={{color:T.muted,margin:0,fontSize:13}}>Vinmonopolet</p>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {[
          {m:"login",  icon:"🔑",title:"Logg inn",    sub:"Jeg har deltatt før — fortsett der jeg slapp"},
          {m:"register",icon:"✨",title:"Registrer meg",sub:"Opprett bruker med navn og PIN-kode"},
        ].map(({m,icon,title,sub})=>(
          <button key={m} onClick={()=>setMode(m)} style={{
            padding:"16px 20px",borderRadius:12,cursor:"pointer",fontFamily:"inherit",textAlign:"left",
            background:m==="login"?"rgba(42,122,106,0.18)":"rgba(255,255,255,0.04)",
            border:`1px solid ${m==="login"?"rgba(42,122,106,0.35)":"rgba(255,255,255,0.09)"}`,
            color:"#fff",
          }}>
            <div style={{fontSize:15,fontWeight:700,marginBottom:2}}>{icon} {title}</div>
            <div style={{fontSize:12,color:T.muted}}>{sub}</div>
          </button>
        ))}
      </div>
    </div>
  );

  if (mode==="login") return (
    <div style={cardCss}>
      <h2 style={{color:"#fff",margin:"0 0 18px",fontSize:20}}>🔑 Logg inn</h2>
      <label style={labelCss}>Navn</label>
      <input value={name} onChange={e=>setName(e.target.value)} placeholder="Fornavn Etternavn" style={inputCss}/>
      <label style={labelCss}>PIN-kode</label>
      <input type="password" value={pin} onChange={e=>setPin(e.target.value)} placeholder="Din PIN"
        style={inputCss} onKeyDown={e=>e.key==="Enter"&&doLogin()}/>
      {error&&<p style={{color:"#f08080",fontSize:13,marginBottom:12}}>{error}</p>}
      <div style={{display:"flex",gap:10}}>
        <Btn ghost onClick={()=>{setMode("choose");setError("");}}>← Tilbake</Btn>
        <Btn onClick={doLogin} disabled={saving||!name.trim()||!pin}>{saving?"Logger inn...":"Logg inn →"}</Btn>
      </div>
      <p style={{color:"rgba(255,255,255,0.3)",fontSize:12,marginTop:12}}>
        Ikke registrert?{" "}
        <span style={{color:T.mint,cursor:"pointer"}} onClick={()=>{setMode("register");setError("");}}>Registrer deg her</span>
      </p>
    </div>
  );

  if (mode==="register") return (
    <div style={cardCss}>
      <DeadlineBanner/>
      <h2 style={{color:"#fff",margin:"0 0 18px",fontSize:20}}>✨ Registrer deg</h2>
      <label style={labelCss}>Ditt navn</label>
      <input value={name} onChange={e=>setName(e.target.value)} placeholder="Fornavn Etternavn" style={inputCss}/>
      <label style={labelCss}>Velg PIN (min. 4 tegn)</label>
      <input type="password" value={pin} onChange={e=>setPin(e.target.value)} placeholder="F.eks. 1234" style={inputCss}/>
      <label style={labelCss}>Bekreft PIN</label>
      <input type="password" value={pinConfirm} onChange={e=>setPinConfirm(e.target.value)}
        placeholder="Skriv PIN igjen" style={inputCss} onKeyDown={e=>e.key==="Enter"&&doRegister()}/>
      {error&&<p style={{color:"#f08080",fontSize:13,marginBottom:12}}>{error}</p>}
      <div style={{display:"flex",gap:10}}>
        <Btn ghost onClick={()=>{setMode("choose");setError("");}}>← Tilbake</Btn>
        <Btn onClick={doRegister} disabled={saving||!name.trim()||pin.length<4||pin!==pinConfirm}>
          {saving?"Oppretter...":"Opprett bruker →"}
        </Btn>
      </div>
    </div>
  );

  if (mode==="editing") {
    const allGroups=Object.keys(GROUPS);
    const filledGroup=GROUP_MATCHES.filter(m=>tips[m.id]?.home!==undefined&&tips[m.id]?.home!=="").length;
    const tippableKO=KNOCKOUT_SLOTS.filter(s=>!s.adminOnly);
    const filledKO=tippableKO.filter(s=>tips[s.id]?.home!==undefined&&tips[s.id]?.home!=="").length;
    const total=GROUP_MATCHES.length+tippableKO.length;
    const filled=filledGroup+filledKO;
    const pct=Math.round((filled/total)*100);
    const groupMatches=GROUP_MATCHES.filter(m=>m.group===currentGroup);

    return (
      <div style={{maxWidth:740,margin:"0 auto"}}>
        {/* FIX #10: Autosave status bar */}
        <div style={{background:"rgba(42,122,106,0.12)",border:`1px solid ${autoSaveState==="error"?"rgba(240,80,80,0.4)":"rgba(42,122,106,0.22)"}`,borderRadius:12,padding:"12px 16px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
          <div>
            <div style={{fontWeight:700,fontSize:16,color:"#fff"}}>{currentUser?.name}</div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginTop:5}}>
              <div style={{height:4,width:140,background:"rgba(255,255,255,0.1)",borderRadius:4,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${pct}%`,background:T.mint,borderRadius:4,transition:"width 0.4s"}}/>
              </div>
              <span style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{filled}/{total}</span>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
            <span style={{fontSize:12,color:autoSaveState==="error"?"#f08080":autoSaveState==="saving"?T.mint:"rgba(255,255,255,0.25)"}}>
              {autoSaveState==="error"?"⚠️ Lagring feilet — sjekk nett":autoSaveState==="saving"?"💾 Lagrer...":"✓ Lagret"}
            </span>
            <button onClick={doAutoFill} disabled={autoFilling||isLocked} style={{
              padding:"6px 12px",borderRadius:8,border:"1px solid rgba(240,192,90,0.35)",
              cursor:autoFilling||isLocked?"not-allowed":"pointer",fontFamily:"inherit",
              fontSize:11,fontWeight:700,
              background:autoFilling?"rgba(240,192,90,0.08)":"rgba(240,192,90,0.12)",
              color:T.gold,opacity:isLocked?0.4:1,transition:"all 0.18s",
              display:"flex",alignItems:"center",gap:5,
            }}>
              {autoFilling
                ? <><span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⚽</span> Fyller ut...</>
                : <>🎲 {autoFillCount>0?`Prøv igjen (${autoFillCount})`:"Fyll ut for meg"}</>
              }
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
          {[["group","⚽ Gruppespill"],["knockout","🏆 Sluttspill"],["bonus","🎯 Bonusspørsmål"]].map(([id,label])=>(
            <button key={id} onClick={()=>setStep(id)} style={{
              padding:"9px 16px",borderRadius:9,border:"none",cursor:"pointer",fontFamily:"inherit",
              fontSize:13,fontWeight:700,transition:"all 0.15s",
              background:step===id?`linear-gradient(135deg,${T.teal},#1a5a4a)`:"rgba(255,255,255,0.06)",
              color:step===id?"#fff":"rgba(255,255,255,0.45)",
              boxShadow:step===id?"0 2px 12px rgba(42,122,106,0.4)":"none",
            }}>{label}</button>
          ))}
        </div>

        {/* GRUPPESPILL */}
        {step==="group"&&(
          <div style={cardCss}>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
              {allGroups.map(g=>{
                const gFilled=GROUP_MATCHES.filter(m=>m.group===g&&tips[m.id]?.home!==undefined&&tips[m.id]?.home!==""&&tips[m.id]?.away!==undefined&&tips[m.id]?.away!=="").length;
                const done=gFilled===6;
                return (
                  <button key={g} onClick={()=>setCurrentGroup(g)} style={{
                    padding:"6px 12px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,
                    background:currentGroup===g?`linear-gradient(135deg,${T.teal},#1a5a4a)`:done?"rgba(126,200,160,0.15)":"rgba(255,255,255,0.06)",
                    color:currentGroup===g?"#fff":done?T.mint:"rgba(255,255,255,0.5)",
                  }}>{done?"✓ ":""}{g}</button>
                );
              })}
            </div>
            <GroupBanner group={currentGroup}/>
            <p style={{color:"rgba(255,255,255,0.35)",fontSize:12,margin:"8px 0"}}>
              Alle 6 kamper · 3p eksakt · 1p riktig utfall · 4p/3p/2p for riktig plassering
            </p>
            {groupMatches.map(m=>(
              <MatchRow key={m.id} match={m} tip={tips[m.id]} onChange={v=>setTip(m.id,v)} phase="group"/>
            ))}
            {/* Computed standings */}
            {(()=>{
              const tippedCount=groupMatches.filter(m=>tips[m.id]?.home!==undefined&&tips[m.id]?.home!=="").length;
              if (tippedCount===0) return null;
              const standings=computeGroupStandings(currentGroup,tips);
              const rankLabels=["🥇 1. plass → videre","🥈 2. plass → videre","🥉 3. plass → beste taper","4. plass → ute"];
              const rankColors=["#f0c05a","#c0c0c0",T.mint,"rgba(255,255,255,0.3)"];
              return (
                <div style={{marginTop:14,padding:"10px 12px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10}}>
                  <div style={{fontSize:11,fontWeight:700,letterSpacing:1.5,color:T.mint,textTransform:"uppercase",marginBottom:8}}>
                    Beregnet plassering fra dine tips
                  </div>
                  {standings.map((team,i)=>(
                    <div key={team} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0",borderBottom:i<3?"1px solid rgba(255,255,255,0.05)":"none"}}>
                      <FlagImg team={team} size={18}/>
                      <span style={{fontWeight:600,fontSize:13,color:rankColors[i],flex:1}}>{team}</span>
                      <span style={{fontSize:11,color:"rgba(255,255,255,0.3)"}}>{rankLabels[i]}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
            <div style={{display:"flex",gap:10,marginTop:14,justifyContent:"space-between",flexWrap:"wrap"}}>
              <div style={{display:"flex",gap:8}}>
                {currentGroup>"A"&&<Btn ghost sm onClick={()=>setCurrentGroup(String.fromCharCode(currentGroup.charCodeAt(0)-1))}>← {String.fromCharCode(currentGroup.charCodeAt(0)-1)}</Btn>}
                {currentGroup<"L"&&<Btn sm onClick={()=>setCurrentGroup(String.fromCharCode(currentGroup.charCodeAt(0)+1))}>{String.fromCharCode(currentGroup.charCodeAt(0)+1)} →</Btn>}
              </div>
              {currentGroup==="L"&&<Btn onClick={()=>setStep("knockout")}>Neste: Sluttspill →</Btn>}
            </div>
          </div>
        )}

        {/* SLUTTSPILL */}
        {step==="knockout"&&(
          <div style={cardCss}>
            <p style={{color:"rgba(255,255,255,0.35)",fontSize:12,margin:"0 0 8px"}}>
              Lagene hentes fra dine gruppetips. Grå = gruppen er ikke tippet ennå.
            </p>
            {(()=>{
              let lp=null;
              return KNOCKOUT_SLOTS.map(slot=>{
                const show=slot.phase!==lp; if (show) lp=slot.phase;
                return <div key={slot.id}>{show&&<PhaseHeader phase={slot.phase}/>}<KnockoutMatchRow slot={slot} tips={tips} setTip={setTip} results={externalResults}/></div>;
              });
            })()}
            <div style={{display:"flex",gap:10,marginTop:14}}>
              <Btn ghost onClick={()=>setStep("group")}>← Tilbake</Btn>
              <Btn onClick={()=>setStep("bonus")}>Neste: Bonusspørsmål →</Btn>
            </div>
          </div>
        )}

        {/* BONUS */}
        {step==="bonus"&&(
          <div style={cardCss}>
            <p style={{color:"rgba(255,255,255,0.35)",fontSize:12,marginBottom:16,marginTop:0}}>
              Kun eksakt svar gir poeng.
            </p>
            {BONUS_QUESTIONS.map(q=>(
              <div key={q.id} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"14px",marginBottom:10}}>
                <label style={{...labelCss,marginBottom:8}}>
                  <span style={{marginRight:6,fontSize:15}}>{q.icon}</span>{q.text}
                  <span style={{marginLeft:8,color:T.gold,fontWeight:700,letterSpacing:0}}>{q.points}p</span>
                </label>
                <input type={q.type??"text"} value={bonus[q.id]??""} style={{...inputCss,marginBottom:0}}
                  onChange={e=>setBonus(b=>({...b,[q.id]:e.target.value}))}/>
              </div>
            ))}
            {error&&<p style={{color:"#f08080",fontSize:13,marginBottom:10}}>{error}</p>}
            <div style={{display:"flex",gap:10,marginTop:4}}>
              <Btn ghost onClick={()=>setStep("knockout")}>← Tilbake</Btn>
              <Btn onClick={doSubmit} disabled={saving}>{saving?"Lagrer...":"✅ Lever kupong!"}</Btn>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{...cardCss,textAlign:"center"}}>
      <div style={{fontSize:52,marginBottom:12}}>🎉</div>
      <h2 style={{color:"#fff",margin:"0 0 8px"}}>Kupong innlevert!</h2>
      <p style={{color:T.mint,fontSize:16,fontWeight:700,margin:"0 0 4px"}}>{currentUser?.name}</p>
      <p style={{color:T.muted,marginBottom:20}}>Du kan logge inn igjen og endre frem til 11. juni.</p>
      <Btn ghost onClick={()=>setMode("editing")}>✏️ Endre tips</Btn>
    </div>
  );
}

// ── LEADERBOARD ───────────────────────────────────────────────────────────────
function LeaderboardView({participants,results,bonusResults}) {
  const ranked=useMemo(()=>
    [...participants].map(p=>({...p,total:calcTotal(p,results,bonusResults)})).sort((a,b)=>b.total-a.total)
  ,[participants,results,bonusResults]);
  const medals=["🥇","🥈","🥉"];
  const pg=["rgba(240,192,90,0.15)","rgba(192,192,192,0.1)","rgba(205,127,50,0.12)"];
  const pb=["rgba(240,192,90,0.35)","rgba(192,192,192,0.25)","rgba(205,127,50,0.25)"];
  const pc=["#f0c05a","#c0c0c0","#cd7f32"];
  const played=GROUP_MATCHES.filter(m=>results[m.id]?.home!==undefined).length;

  if (ranked.length===0) return (
    <div style={{...cardCss,textAlign:"center",padding:"48px"}}>
      <div style={{fontSize:48,marginBottom:12}}>⚽</div>
      <p style={{color:T.muted}}>Ingen deltakere ennå — vær den første!</p>
    </div>
  );

  return (
    <div style={{maxWidth:740,margin:"0 auto"}}>
      <div style={{fontSize:12,color:"rgba(255,255,255,0.35)",textAlign:"center",marginBottom:12}}>
        {played} av {GROUP_MATCHES.length} gruppekamper spilt
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {ranked.map((p,i)=>(
          <div key={p.name} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",borderRadius:14,background:i<3?pg[i]:"rgba(255,255,255,0.03)",border:`1px solid ${i<3?pb[i]:"rgba(255,255,255,0.07)"}`}}>
            <span style={{fontSize:i<3?28:17,width:34,textAlign:"center",flexShrink:0}}>{i<3?medals[i]:`${i+1}.`}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:16,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",marginTop:2}}>
                {GROUP_MATCHES.filter(m=>p.tips?.[m.id]?.home!==undefined&&p.tips[m.id].home!=="").length} av {GROUP_MATCHES.length} gruppekamper tippet
              </div>
            </div>
            <div style={{fontSize:24,fontWeight:800,color:i<3?pc[i]:"rgba(255,255,255,0.65)",flexShrink:0}}>{p.total}p</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── MINE TIPS ─────────────────────────────────────────────────────────────────
function MyTipsView({participants,results,bonusResults}) {
  const [search,setSearch]=useState("");
  // Exact match first, then partial — never auto-select when ambiguous
  const exactMatch=participants.find(p=>p.name.toLowerCase()===search.toLowerCase());
  const partialMatches=participants.filter(p=>p.name.toLowerCase().includes(search.toLowerCase()));
  const found=exactMatch||(partialMatches.length===1?partialMatches[0]:null);
  const ambiguous=!exactMatch&&partialMatches.length>1;

  return (
    <div style={{maxWidth:740,margin:"0 auto"}}>
      <div style={cardCss}>
        <label style={labelCss}>Søk opp navn</label>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Skriv navn..." style={inputCss}/>
        {search&&!found&&!ambiguous&&<p style={{color:"#f08080",fontSize:13}}>Ingen treff.</p>}
        {ambiguous&&(
          <div style={{marginTop:8}}>
            <p style={{color:T.gold,fontSize:13,marginBottom:8}}>Flere treff — velg riktig navn:</p>
            {partialMatches.map(p=>(
              <button key={p.name} onClick={()=>setSearch(p.name)} style={{
                display:"block",width:"100%",textAlign:"left",padding:"8px 12px",
                marginBottom:6,borderRadius:8,border:"1px solid rgba(255,255,255,0.1)",
                background:"rgba(255,255,255,0.05)",color:"#fff",cursor:"pointer",
                fontFamily:"inherit",fontSize:14,fontWeight:600,
              }}>{p.name}</button>
            ))}
          </div>
        )}
      </div>
      {found&&(
        <div style={{marginTop:12}}>
          <div style={{background:"rgba(42,122,106,0.12)",border:"1px solid rgba(42,122,106,0.25)",borderRadius:12,padding:"14px 18px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontWeight:800,fontSize:18,color:"#fff"}}>{found.name}</div>
              <div style={{fontSize:12,color:T.mint,marginTop:3}}>
                {GROUP_MATCHES.filter(m=>found.tips?.[m.id]?.home!==undefined&&found.tips[m.id].home!=="").length} av {GROUP_MATCHES.length} gruppekamper tippet
              </div>
            </div>
            <div style={{fontSize:28,fontWeight:800,color:T.gold}}>{calcTotal(found,results,bonusResults)}p</div>
          </div>
          <div style={cardCss}>
            <div style={{maxHeight:"60vh",overflowY:"auto"}}>
              {Object.keys(GROUPS).map(g=>(
                <div key={g}>
                  <GroupBanner group={g}/>
                  {GROUP_MATCHES.filter(m=>m.group===g).map(m=>(
                    <MatchRow key={m.id} match={m} tip={found.tips?.[m.id]} result={results[m.id]} readOnly phase="group"/>
                  ))}
                </div>
              ))}
              {(()=>{
                let lp=null;
                return KNOCKOUT_SLOTS.map(slot=>{
                  const show=slot.phase!==lp; if (show) lp=slot.phase;
                  const resolvedHome=resolveForDisplay(slot.slot1,found.tips||{},results);
                const resolvedAway=resolveForDisplay(slot.slot2,found.tips||{},results);
                const tip2=found.tips?.[slot.id];
                const result2=results?.[slot.id];
                const pts2=result2?.home!==undefined?scoreKnockout(tip2,result2,slot.phase):null;
                if (slot.adminOnly) {
                  const adminHome=typeof results[slot.id+"_home"]==="string"?results[slot.id+"_home"]:null;
                  const adminAway=typeof results[slot.id+"_away"]==="string"?results[slot.id+"_away"]:null;
                  const hasResult=result2?.home!==undefined&&result2?.home!=="";
                  return (
                  <div key={slot.id}>
                    {show&&<PhaseHeader phase={slot.phase}/>}
                    <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,alignItems:"center",padding:"8px 4px",borderBottom:"1px solid rgba(255,255,255,0.04)",opacity:adminHome&&adminAway?0.85:0.35}}>
                      <div style={{textAlign:"right",fontSize:13,color:"rgba(255,255,255,0.85)",display:"flex",alignItems:"center",justifyContent:"flex-end",gap:5}}>
                        {adminHome?<><strong>{adminHome}</strong><FlagImg team={adminHome}/></>:<span style={{color:"rgba(255,255,255,0.3)",fontSize:12}}>Beste 3.-plass</span>}
                      </div>
                      <div style={{minWidth:58,textAlign:"center",fontSize:14,fontWeight:700,color:hasResult?"rgba(255,255,255,0.6)":"rgba(255,255,255,0.2)"}}>
                        {hasResult?`${result2.home}–${result2.away}`:"–"}
                      </div>
                      <div style={{fontSize:13,color:"rgba(255,255,255,0.85)",display:"flex",alignItems:"center",gap:5}}>
                        {adminAway?<><FlagImg team={adminAway}/><strong>{adminAway}</strong></>:<span style={{color:"rgba(255,255,255,0.3)",fontSize:12}}>Beste 3.-plass</span>}
                      </div>
                    </div>
                  </div>
                  );
                }
                return (
                  <div key={slot.id}>
                    {show&&<PhaseHeader phase={slot.phase}/>}
                    <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,alignItems:"center",padding:"8px 4px",borderBottom:"1px solid rgba(255,255,255,0.04)",opacity:resolvedHome&&resolvedAway?1:0.4}}>
                      <div style={{textAlign:"right",fontSize:13,color:"rgba(255,255,255,0.85)",display:"flex",alignItems:"center",justifyContent:"flex-end",gap:5}}>
                        {resolvedHome?<><strong>{resolvedHome}</strong><FlagImg team={resolvedHome}/></>:<span style={{color:"rgba(255,255,255,0.3)",fontSize:12}}>{slot.label}</span>}
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:5}}>
                        <div style={{minWidth:58,textAlign:"center",fontSize:14,fontWeight:700,color:resolvedHome&&resolvedAway?"rgba(255,255,255,0.7)":"rgba(255,255,255,0.25)"}}>
                          {tip2?.home??"–"}–{tip2?.away??"–"}
                        </div>
                        {pts2!==null&&<div style={{minWidth:30,textAlign:"center",padding:"3px 6px",borderRadius:6,fontSize:11,fontWeight:800,background:pts2>0?"rgba(126,200,160,0.12)":"rgba(255,255,255,0.04)",color:pts2>0?T.mint:"#555"}}>{pts2}p</div>}
                      </div>
                      <div style={{fontSize:13,color:"rgba(255,255,255,0.85)",display:"flex",alignItems:"center",gap:5}}>
                        {resolvedAway?<><FlagImg team={resolvedAway}/><strong>{resolvedAway}</strong></>:<span style={{color:"rgba(255,255,255,0.3)",fontSize:12}}>{slot.label}</span>}
                      </div>
                    </div>
                  </div>
                );
                });
              })()}
              <PhaseHeader phase="BONUS"/>
              {BONUS_QUESTIONS.map(q=>{
                const tip=found.bonus?.[q.id];
                const approved=bonusResults[q.id]?.approved||[];
                const legacy=bonusResults[q.id]?.answer;
                const correct=tip&&(approved.some(a=>a.toString().trim().toLowerCase()===tip.toString().trim().toLowerCase())||(legacy&&tip.toString().trim().toLowerCase()===legacy.toString().trim().toLowerCase()));
                return (
                  <div key={q.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 2px",borderBottom:"1px solid rgba(255,255,255,0.04)",fontSize:13}}>
                    <span style={{color:"rgba(255,255,255,0.5)"}}>{q.icon} {q.text}</span>
                    <span style={{fontWeight:700,color:correct?T.gold:(approved.length>0||legacy)?"#f08080":"rgba(255,255,255,0.65)"}}>
                      {tip||"–"}{(approved.length>0||legacy)?` ${correct?`✅ ${q.points}p`:"❌"}`:""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── RULES ─────────────────────────────────────────────────────────────────────
function RulesView() {
  const sections=[
    {title:"⚽ Gruppespill (72 kamper)",rows:[
      ["Eksakt resultat","3p"],
      ["Riktig utfall (seier/uavgjort)","1p"],
      ["Riktig lag på 1. plass i gruppe","4p"],
      ["Riktig lag på 2. plass i gruppe","3p"],
      ["Riktig lag på 3. plass (beste taper)","2p"],
    ]},
    {title:"🏆 Sluttspill — kampresultat",rows:[
      ["16-delsfinale — eksakt / riktig vinner","3p / 1p"],
      ["Åttendelsfinale — eksakt / riktig vinner","4p / 2p"],
      ["Kvartfinale — eksakt / riktig vinner","5p / 2p"],
      ["Semifinale — eksakt / riktig vinner","6p / 3p"],
      ["Bronsefinale — eksakt / riktig vinner","4p / 2p"],
      ["Finale — eksakt / riktig vinner","8p / 4p"],
    ]},
    {title:"🎯 Riktig lag videre i sluttspillet",rows:[
      ["Riktig lag i 16-delsfinale","2p"],
      ["Riktig lag i åttendelsfinale","3p"],
      ["Riktig lag i kvartfinale","4p"],
      ["Riktig lag i semifinale","5p"],
      ["Riktig VM-vinner","8p"],
    ]},
    {title:"🎁 Bonusspørsmål (kun eksakt svar)",rows:[
      ["Hvem vinner VM?","10p"],
      ["Hvem blir toppscorer?","8p"],
      ["Antall røde kort i turneringen?","6p"],
      ["Antall mål i turneringen?","6p"],
      ["Antall mål Norge scorer?","5p"],
    ]},
  ];
  return (
    <div style={{maxWidth:740,margin:"0 auto"}}>
      <div style={cardCss}>
        <h2 style={{color:"#fff",margin:"0 0 4px",fontSize:20}}>📋 Regler og poengberegning</h2>
        <p style={{color:T.muted,fontSize:13,marginBottom:20}}>VM 2026 — Vinmonopolet Økonomi</p>
        {sections.map(s=>(
          <div key={s.title} style={{marginBottom:20}}>
            <div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:8,paddingBottom:6,borderBottom:"1px solid rgba(255,255,255,0.08)"}}>{s.title}</div>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <tbody>
                {s.rows.map(([label,pts])=>(
                  <tr key={label}>
                    <td style={{fontSize:13,color:"rgba(255,255,255,0.65)",padding:"5px 0"}}>{label}</td>
                    <td style={{fontSize:13,fontWeight:700,color:T.gold,textAlign:"right",padding:"5px 0"}}>{pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        <div style={{background:"rgba(240,192,90,0.08)",border:"1px solid rgba(240,192,90,0.2)",borderRadius:10,padding:"14px 16px",marginTop:4}}>
          <div style={{fontSize:12,color:T.mint,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Generelle regler</div>
          <ul style={{color:"rgba(255,255,255,0.6)",fontSize:13,margin:0,paddingLeft:18,lineHeight:1.9}}>
            <li>Tipping stenger 11. juni 2026 kl. 20:00 — åpningskampen starter</li>
            <li>Sluttspill fylles ut basert på hvem du tippet videre fra gruppespillet</li>
            <li>I sluttspillet er det alltid en vinner — 1-1 betyr hjemmelaget vinner (straffer)</li>
            <li>Grupperanking-poeng gis kun når alle 6 kamper i gruppen er spilt</li>
            <li>Logg inn med navn og PIN for å endre tips frem til deadline</li>
            <li>Bonusspørsmål: admin godkjenner svarene — varianter av samme navn kan alle godkjennes</li>
            <li>Ved poenglikhet avgjøres plasseringen av flest eksakte resultater</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ── BONUS ADMIN PANEL ─────────────────────────────────────────────────────────
function BonusAdminPanel({participants,bonusResults,saveBonusResult}) {
  const [selectedQ,setSelectedQ]=useState("b1");
  const [saving,setSaving]=useState(false);
  const q=BONUS_QUESTIONS.find(bq=>bq.id===selectedQ);

  const answers=useMemo(()=>{
    const map={};
    participants.forEach(p=>{
      const ans=p.bonus?.[selectedQ];
      if (!ans||ans.toString().trim()==="") return;
      const norm=ans.toString().trim();
      if (!map[norm]) map[norm]={raw:norm,count:0,names:[]};
      map[norm].count++;
      map[norm].names.push(p.name);
    });
    return Object.values(map).sort((a,b)=>b.count-a.count);
  },[participants,selectedQ]);

  const approved=useMemo(()=>bonusResults[selectedQ]?.approved||[],[bonusResults,selectedQ]);

  const toggleApproved=async(raw)=>{
    const cur=bonusResults[selectedQ]?.approved||[];
    const next=cur.includes(raw)?cur.filter(x=>x!==raw):[...cur,raw];
    setSaving(true);
    await saveBonusResult(selectedQ,bonusResults[selectedQ]?.answer||"",next);
    setSaving(false);
  };

  return (
    <div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
        {BONUS_QUESTIONS.map(bq=>(
          <button key={bq.id} onClick={()=>setSelectedQ(bq.id)} style={{
            padding:"7px 14px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700,
            background:selectedQ===bq.id?`linear-gradient(135deg,${T.teal},#1a5a4a)`:"rgba(255,255,255,0.06)",
            color:selectedQ===bq.id?"#fff":"rgba(255,255,255,0.5)",
          }}>{bq.icon} {bq.points}p</button>
        ))}
      </div>
      {q&&(
        <div>
          <div style={{fontSize:15,fontWeight:700,color:"#fff",marginBottom:4}}>{q.icon} {q.text}</div>
          <div style={{fontSize:12,color:T.muted,marginBottom:14}}>
            Klikk et svar for å godkjenne/avvise. Alle som har skrevet det svaret får {q.points}p.
            {saving&&<span style={{color:T.mint,marginLeft:8}}>Lagrer...</span>}
          </div>
          {answers.length===0&&<p style={{color:"rgba(255,255,255,0.3)",fontSize:13}}>Ingen svar ennå.</p>}
          <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:"42vh",overflowY:"auto"}}>
            {answers.map(({raw,count,names})=>{
              const isApproved=approved.includes(raw);
              return (
                <div key={raw} onClick={()=>toggleApproved(raw)} style={{
                  display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:10,cursor:"pointer",
                  background:isApproved?"rgba(126,200,160,0.15)":"rgba(255,255,255,0.04)",
                  border:`1px solid ${isApproved?"rgba(126,200,160,0.4)":"rgba(255,255,255,0.08)"}`,
                }}>
                  <div style={{width:22,height:22,borderRadius:6,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,
                    background:isApproved?"rgba(126,200,160,0.3)":"rgba(255,255,255,0.08)",
                    border:`1px solid ${isApproved?T.mint:"rgba(255,255,255,0.15)"}`,
                    color:isApproved?T.mint:"transparent"}}>✓</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:700,color:isApproved?T.mint:"#fff"}}>{raw}</div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{names.join(", ")}</div>
                  </div>
                  <div style={{fontSize:12,fontWeight:700,flexShrink:0,padding:"3px 10px",borderRadius:20,
                    color:isApproved?T.mint:"rgba(255,255,255,0.4)",
                    background:isApproved?"rgba(126,200,160,0.1)":"rgba(255,255,255,0.05)"}}>
                    {count} {isApproved?`· ${count*q.points}p`:""}
                  </div>
                </div>
              );
            })}
          </div>
          {approved.length>0&&(
            <div style={{marginTop:12,padding:"10px 14px",background:"rgba(240,192,90,0.08)",border:"1px solid rgba(240,192,90,0.2)",borderRadius:10}}>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:1,color:T.gold,textTransform:"uppercase",marginBottom:6}}>Godkjente svar</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {approved.map(a=>(
                  <span key={a} style={{fontSize:12,color:T.gold,background:"rgba(240,192,90,0.1)",padding:"3px 10px",borderRadius:20,border:"1px solid rgba(240,192,90,0.2)"}}>{a}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── ADMIN ─────────────────────────────────────────────────────────────────────
function AdminView({results,setResults,bonusResults,setBonusResults,participants,reload}) {
  const [pin,setPin]=useState(""),[authed,setAuthed]=useState(false);
  const [tab,setTab]=useState("matches"),[currentGroup,setCurrentGroup]=useState("A");
  const [saving,setSaving]=useState({});
  const [adminFilling,setAdminFilling]=useState(false);

  if (!authed) return (
    <div style={cardCss}>
      <h2 style={{color:"#fff",margin:"0 0 18px",fontSize:20}}>🔐 Admin</h2>
      <label style={labelCss}>PIN-kode</label>
      <input type="password" value={pin} onChange={e=>setPin(e.target.value)} placeholder="PIN-kode"
        style={inputCss} onKeyDown={e=>e.key==="Enter"&&(pin===ADMIN_PIN?setAuthed(true):alert("Feil PIN"))}/>
      <Btn onClick={()=>pin===ADMIN_PIN?setAuthed(true):alert("Feil PIN")}>Logg inn</Btn>
    </div>
  );

  const saveResult=async(id,field,val)=>{
    const cur=results[id]||{home:"",away:""};
    const upd={...cur,[field]:val};
    setResults(r=>({...r,[id]:upd}));
    setSaving(s=>({...s,[id]:true}));
    try{await sb.upsert("results",[{id,home:upd.home,away:upd.away}]);}
    catch(e){console.error(e);}
    setTimeout(()=>setSaving(s=>({...s,[id]:false})),800);
  };

  const saveBonusResult=async(id,val,approved)=>{
    const appList=approved??bonusResults[id]?.approved??[];
    setBonusResults(b=>({...b,[id]:{answer:val,approved:appList}}));
    try{await sb.upsert("bonus_results",[{id,answer:val,approved:JSON.stringify(appList)}]);}
    catch(e){console.error(e);}
  };


  const doAdminAutoFill=async()=>{
    if (!window.confirm("Dette vil overskrive ALLE eksisterende resultater i databasen med simulerte resultater. Kun for testing! Fortsette?")) return;
    setAdminFilling(true);
    try {
      const groupList=Object.entries(GROUPS).map(([g,teams])=>`Gruppe ${g}: ${teams.join(", ")}`).join("\n");
      const prompt=`Du er en fotballekspert. Generer et komplett sett med VM 2026-resultater for simulering/testing.

Grupper:
${groupList}

Returner KUN gyldig JSON (ingen annen tekst):
{
  "matches": {
    "g1": {"home": "2", "away": "1"},
    ... alle 72 gruppekamper g1-g72
  },
  "knockout": {
    "r32_1": {"home": "2", "away": "0"},
    ... alle sluttspillkamper inkludert r32_1 til r32_12, r32_13 til r32_16, r16_1 til r16_8, qf1-qf4, sf1, sf2, 3p, f
  }
}

Regler:
- MAKS 5 mål per lag
- Typiske resultater: 1-0, 2-1, 1-1, 2-0. Sjeldent: 3-0, 3-1
- Favoritter vinner oftere men ikke alltid
- For r32_13 til r32_16 (beste 3.-plasser): bruk realistiske lag som Mexico, Kroatia, Senegal, Sverige
- Inkluder ALLE kamper inkludert 3p (bronsefinale) og f (finale)`;

      const response=await fetch("/api/autofill",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({prompt,attempt:0})
      });
      const data=await response.json();
      if (!response.ok) throw new Error(data.error||"API-feil");
      const text=data.content?.[0]?.text||"";
      const jsonMatch=text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Ingen gyldig JSON");
      const parsed=JSON.parse(jsonMatch[0]);

      const capScore=v=>String(Math.min(5,Math.max(0,parseInt(v)||0)));
      const allResults=[];

      // Group matches
      if (parsed.matches) {
        Object.entries(parsed.matches).forEach(([id,score])=>{
          if (score?.home!==undefined&&score?.away!==undefined) {
            allResults.push({id,home:capScore(score.home),away:capScore(score.away)});
          }
        });
      }
      // Knockout
      if (parsed.knockout) {
        Object.entries(parsed.knockout).forEach(([id,score])=>{
          if (score?.home!==undefined&&score?.away!==undefined) {
            allResults.push({id,home:capScore(score.home),away:capScore(score.away)});
          }
        });
      }

      // Save all to Supabase in one batch
      await sb.upsert("results",allResults);

      // Update local state
      const newResMap={};
      allResults.forEach(r=>{newResMap[r.id]={home:r.home,away:r.away};});
      setResults(r=>({...r,...newResMap}));

      await reload();
      alert(`✅ ${allResults.length} resultater lagret! Ledertavlen oppdateres nå.`);
    } catch(e) {
      console.error(e);
      alert("Feil: "+e.message);
    } finally {
      setAdminFilling(false);
    }
  };

  const doClearAllResults=async()=>{
    if (!window.confirm("Slett ALLE resultater fra databasen? Dette kan ikke angres.")) return;
    try {
      // Delete all from results table
      await fetch(`${SUPABASE_URL}/rest/v1/results?id=neq.PLACEHOLDER`,{
        method:"DELETE",
        headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${SUPABASE_ANON_KEY}`}
      });
      setResults({});
      GROUP_OVERRIDES={};
      alert("Alle resultater slettet.");
    } catch(e){alert("Feil: "+e.message);}
  };

  return (
    <div style={{maxWidth:740,margin:"0 auto"}}>
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
        {[["matches","⚽ Kamper"],["knockout","🏆 Sluttspill"],["bonus","🎯 Bonus"],["stats","📊 Statistikk"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{
            padding:"8px 14px",borderRadius:9,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700,
            background:tab===id?`linear-gradient(135deg,${T.teal},#1a5a4a)`:"rgba(255,255,255,0.06)",
            color:tab===id?"#fff":"rgba(255,255,255,0.45)",
          }}>{label}</button>
        ))}
        <button onClick={reload} style={{padding:"8px 14px",borderRadius:9,cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700,border:"1px solid rgba(255,255,255,0.09)",background:"rgba(255,255,255,0.04)",color:"rgba(255,255,255,0.45)"}}>🔄</button>
        <button onClick={doAdminAutoFill} disabled={adminFilling} style={{padding:"8px 14px",borderRadius:9,cursor:adminFilling?"not-allowed":"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700,border:"1px solid rgba(240,192,90,0.3)",background:"rgba(240,192,90,0.1)",color:T.gold,opacity:adminFilling?0.5:1}}>
          {adminFilling?"⚽ Simulerer...":"🎲 Simuler alle resultater"}
        </button>
        <button onClick={doClearAllResults} style={{padding:"8px 14px",borderRadius:9,cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700,border:"1px solid rgba(240,80,80,0.25)",background:"rgba(240,80,80,0.08)",color:"#f08080"}}>
          🗑️ Nullstill
        </button>
      </div>
      <div style={cardCss}>

        {tab==="matches"&&(
          <>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
              {Object.keys(GROUPS).map(g=>{
                const done=GROUP_MATCHES.filter(m=>m.group===g&&results[m.id]?.home!==undefined&&results[m.id]?.home!=="").length===6;
                return <button key={g} onClick={()=>setCurrentGroup(g)} style={{
                  padding:"5px 10px",borderRadius:7,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700,
                  background:currentGroup===g?`linear-gradient(135deg,${T.teal},#1a5a4a)`:done?"rgba(126,200,160,0.15)":"rgba(255,255,255,0.06)",
                  color:currentGroup===g?"#fff":done?T.mint:"rgba(255,255,255,0.5)",
                }}>{done?"✓ ":""}{g}</button>;
              })}
            </div>
            <GroupBanner group={currentGroup}/>
            {/* Standings + optional override */}
            {(()=>{
              const done=GROUP_MATCHES.filter(m=>m.group===currentGroup&&results[m.id]?.home!==undefined&&results[m.id]?.home!=="").length===6;
              if (!done) return null;
              const computed=computeGroupStandings(currentGroup,results);
              const hasOverride=GROUP_OVERRIDES[currentGroup]&&GROUP_OVERRIDES[currentGroup].length===4;
              const active=hasOverride?GROUP_OVERRIDES[currentGroup]:computed;
              const teams=GROUPS[currentGroup];
              const saveOverride=async(newOrder)=>{
                setGroupOverride(currentGroup,newOrder);
                try{await sb.upsert("results",[{id:`override_${currentGroup}`,home:JSON.stringify(newOrder),away:""}]);}
                catch(e){console.error(e);}
                // Force re-render
                setResults(r=>({...r}));
              };
              const clearOverride=async()=>{
                setGroupOverride(currentGroup,[]);
                try{await sb.upsert("results",[{id:`override_${currentGroup}`,home:"[]",away:""}]);}
                catch(e){console.error(e);}
                setResults(r=>({...r}));
              };
              return (
                <div style={{margin:"8px 0",padding:"12px",background:"rgba(42,122,106,0.1)",border:`1px solid ${hasOverride?"rgba(240,192,90,0.35)":"rgba(42,122,106,0.2)"}`,borderRadius:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <div style={{fontSize:11,color:hasOverride?T.gold:T.mint,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>
                      {hasOverride?"⚙️ Manuell plassering":"Beregnet plassering"}
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      {hasOverride&&<button onClick={clearOverride} style={{fontSize:11,color:"#f08080",background:"rgba(240,80,80,0.1)",border:"1px solid rgba(240,80,80,0.25)",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontFamily:"inherit"}}>Tilbakestill</button>}
                    </div>
                  </div>
                  {/* Current ranking */}
                  {active.map((team,i)=>(
                    <div key={team} style={{display:"flex",alignItems:"center",gap:8,fontSize:13,padding:"3px 0"}}>
                      <FlagImg team={team} size={16}/>
                      <span style={{fontWeight:i<3?700:400,color:i<3?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.4)",flex:1}}>{i+1}. {team}</span>
                      {i<3&&<span style={{color:T.mint,fontSize:11}}>{["videre","videre","beste taper"][i]}</span>}
                      {hasOverride&&<span style={{fontSize:10,color:T.gold}}>manuell</span>}
                    </div>
                  ))}
                  {/* Override dropdowns */}
                  <details style={{marginTop:10}}>
                    <summary style={{fontSize:11,color:"rgba(255,255,255,0.4)",cursor:"pointer",userSelect:"none",letterSpacing:0.5}}>
                      ⚙️ Overstyr rekkefølge ved tiebreak
                    </summary>
                    <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:8}}>
                      {[0,1,2,3].map(pos=>{
                        const posLabels=["1. plass","2. plass","3. plass","4. plass"];
                        const cur=(hasOverride?GROUP_OVERRIDES[currentGroup]:computed)[pos]||"";
                        return(
                          <div key={pos} style={{display:"flex",alignItems:"center",gap:8}}>
                            <span style={{fontSize:12,color:"rgba(255,255,255,0.5)",width:70,flexShrink:0}}>{posLabels[pos]}</span>
                            <select value={cur} onChange={e=>{
                              const base=hasOverride?[...GROUP_OVERRIDES[currentGroup]]:[...computed];
                              // Remove the chosen team from wherever it currently is
                              const cleaned=base.map(t=>t===e.target.value?null:t);
                              cleaned[pos]=e.target.value;
                              // Fill nulls with remaining teams
                              const used=new Set(cleaned.filter(Boolean));
                              const remaining=teams.filter(t=>!used.has(t));
                              let ri=0;
                              const final=cleaned.map(t=>t||(remaining[ri++]||""));
                              saveOverride(final);
                            }} style={{flex:1,background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:7,color:"#fff",fontSize:13,padding:"7px 10px",fontFamily:"inherit",outline:"none"}}>
                              {teams.map(t=><option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                        );
                      })}
                      <p style={{fontSize:11,color:"rgba(255,255,255,0.3)",margin:"4px 0 0",fontStyle:"italic"}}>
                        Beregnet: {computed.map(t=>t).join(" → ")}
                      </p>
                    </div>
                  </details>
                </div>
              );
            })()}
            <div style={{maxHeight:"52vh",overflowY:"auto",paddingRight:4}}>
              {GROUP_MATCHES.filter(m=>m.group===currentGroup).map(m=>{
                const r=results[m.id]||{};
                return (
                  <div key={m.id} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 2px",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                    <span style={{fontSize:12,color:"rgba(255,255,255,0.45)",flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4}}>
                      <FlagImg team={m.home} size={14}/> {m.home} – {m.away} <FlagImg team={m.away} size={14}/>
                    </span>
                    <ScoreInput val={r.home??""} onChange={v=>saveResult(m.id,"home",v)}/>
                    <span style={{color:"rgba(255,255,255,0.25)"}}>–</span>
                    <ScoreInput val={r.away??""} onChange={v=>saveResult(m.id,"away",v)}/>
                    {saving[m.id]&&<span style={{fontSize:11,color:T.mint,width:14}}>✓</span>}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab==="knockout"&&(
          <div style={{maxHeight:"64vh",overflowY:"auto",paddingRight:4}}>
            {(()=>{
              let lp=null;
              return KNOCKOUT_SLOTS.map(slot=>{
                const show=slot.phase!==lp; if (show) lp=slot.phase;
                const r=results[slot.id]||{};
                return (
                  <div key={slot.id}>
                    {show&&<PhaseHeader phase={slot.phase}/>}
                    {slot.adminOnly?(()=>{
                      // All 12 potential 3rd-place teams from results (show all groups)
                      const thirdPlaceTeams=Object.keys(GROUPS).map(g=>{
                        const gMatches=GROUP_MATCHES.filter(m=>m.group===g);
                        const played=gMatches.filter(m=>results[m.id]?.home!==undefined&&results[m.id]?.home!=="").length;
                        const team=computeGroupStandings(g,played>0?results:{})[2]||null;
                        return team?{team,group:g}:null;
                      }).filter(Boolean);
                      const homeVal=typeof results[slot.id+"_home"]==="string"?results[slot.id+"_home"]:"";
                      const awayVal=typeof results[slot.id+"_away"]==="string"?results[slot.id+"_away"]:"";
                      const saveTeam=async(field,v)=>{
                        setResults(r=>({...r,[slot.id+"_"+field]:v}));
                        try{await sb.upsert("results",[{id:slot.id+"_"+field,home:v,away:""}]);}catch(err){console.error(err);}
                      };
                      // Custom flag dropdown — uses a styled select with flag shown outside
                      const FlagSelect=({value,onChange,placeholder})=>(
                        <div style={{flex:"1 1 160px",position:"relative",display:"flex",alignItems:"center",gap:6,
                          background:"rgba(255,255,255,0.07)",border:`1px solid ${value?"rgba(126,200,160,0.4)":"rgba(255,255,255,0.15)"}`,
                          borderRadius:8,padding:"6px 10px",cursor:"pointer"}}>
                          {value
                            ?<><FlagImg team={value} size={18}/><span style={{fontSize:13,color:"#fff",fontWeight:600,flex:1}}>{value}</span></>
                            :<span style={{fontSize:12,color:"rgba(255,255,255,0.35)",flex:1}}>{placeholder}</span>
                          }
                          <select value={value} onChange={e=>onChange(e.target.value)}
                            style={{position:"absolute",inset:0,opacity:0,width:"100%",cursor:"pointer",fontSize:14}}>
                            <option value="">{placeholder}</option>
                            {thirdPlaceTeams.map(({team,group})=>(
                              <option key={team} value={team}>Gruppe {group}: {team}</option>
                            ))}
                          </select>
                          <span style={{fontSize:10,color:"rgba(255,255,255,0.3)",marginLeft:4}}>▼</span>
                        </div>
                      );
                      return (
                        <div style={{padding:"12px 4px",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                          <div style={{fontSize:11,color:T.gold,marginBottom:10,fontWeight:700,letterSpacing:0.5}}>
                            {slot.label} — velg beste 3.-plasslagene
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                            <FlagSelect value={homeVal} onChange={v=>saveTeam("home",v)} placeholder="Hjemmelag"/>
                            <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                              <ScoreInput val={r.home??""} onChange={v=>saveResult(slot.id,"home",v)}/>
                              <span style={{color:"rgba(255,255,255,0.3)",fontWeight:700}}>-</span>
                              <ScoreInput val={r.away??""} onChange={v=>saveResult(slot.id,"away",v)}/>
                            </div>
                            <FlagSelect value={awayVal} onChange={v=>saveTeam("away",v)} placeholder="Bortelag"/>
                            {saving[slot.id]&&<span style={{fontSize:11,color:T.mint}}>✓</span>}
                          </div>
                          {thirdPlaceTeams.length<12&&(
                            <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",marginTop:8,fontStyle:"italic"}}>
                              {thirdPlaceTeams.length} av 12 grupper har resultater — legg inn alle for komplett liste
                            </div>
                          )}
                        </div>
                      );
                    })():(
                    <div style={{display:"flex",alignItems:"center",gap:8,padding:"5px 2px",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                      <span style={{fontSize:12,color:"rgba(255,255,255,0.45)",flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{slot.label}</span>
                      <ScoreInput val={r.home??""} onChange={v=>saveResult(slot.id,"home",v)}/>
                      <span style={{color:"rgba(255,255,255,0.25)"}}>-</span>
                      <ScoreInput val={r.away??""} onChange={v=>saveResult(slot.id,"away",v)}/>
                      {saving[slot.id]&&<span style={{fontSize:11,color:T.mint,width:14}}>ok</span>}
                    </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        )}

        {tab==="bonus"&&<BonusAdminPanel participants={participants} bonusResults={bonusResults} saveBonusResult={saveBonusResult}/>}

        {tab==="stats"&&(()=>{
          const ranked=[...participants]
            .map(p=>({...p,total:calcTotal(p,results,bonusResults)}))
            .sort((a,b)=>b.total-a.total);
          const medals=["\u{1F947}","\u{1F948}","\u{1F949}"];
          const pg=["rgba(240,192,90,0.15)","rgba(192,192,192,0.1)","rgba(205,127,50,0.12)"];
          const pb=["rgba(240,192,90,0.35)","rgba(192,192,192,0.25)","rgba(205,127,50,0.25)"];
          const pc=["#f0c05a","#c0c0c0","#cd7f32"];
          const played=GROUP_MATCHES.filter(m=>results[m.id]?.home!==undefined&&results[m.id]?.home!=="").length;
          const exportExcel=()=>{
            const rows=[["Plass","Navn","Poeng","Gruppekamper tippet"]];
            ranked.forEach((p,i)=>{
              const gt=GROUP_MATCHES.filter(m=>p.tips?.[m.id]?.home!==undefined&&p.tips[m.id].home!=="").length;
              rows.push([i+1,p.name,p.total,gt]);
            });
            const csv=rows.map(r=>r.join("\t")).join("\n");
            const blob=new Blob(["\uFEFF"+csv],{type:"text/tab-separated-values;charset=utf-8"});
            const url=URL.createObjectURL(blob);
            const a=document.createElement("a");
            a.href=url;a.download="VM2026_Ledertavle.tsv";a.click();
            URL.revokeObjectURL(url);
          };
          return (
            <div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
                {[
                  ["Deltakere",participants.length],
                  ["Gruppekamper",`${played}/${GROUP_MATCHES.length}`],
                  ["Sluttspill",`${KNOCKOUT_SLOTS.filter(s=>results[s.id]?.home!==undefined&&results[s.id]?.home!=="").length}/${KNOCKOUT_SLOTS.length}`],
                  ["Bonus satt",Object.keys(bonusResults).length],
                ].map(([l,v])=>(
                  <div key={l} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10,padding:"12px 14px"}}>
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>{l}</div>
                    <div style={{fontSize:22,fontWeight:800,color:"#fff"}}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>Ledertavle (kun admin)</div>
                <button onClick={exportExcel} style={{padding:"7px 14px",borderRadius:8,border:"1px solid rgba(126,200,160,0.3)",background:"rgba(126,200,160,0.1)",color:T.mint,cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700}}>
                  Eksporter til Excel
                </button>
              </div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",marginBottom:10}}>{played} av {GROUP_MATCHES.length} gruppekamper spilt</div>
              <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:"50vh",overflowY:"auto"}}>
                {ranked.map((p,i)=>(
                  <div key={p.name} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:10,background:i<3?pg[i]:"rgba(255,255,255,0.03)",border:`1px solid ${i<3?pb[i]:"rgba(255,255,255,0.06)"}`}}>
                    <span style={{fontSize:i<3?22:15,width:28,textAlign:"center",flexShrink:0}}>{i<3?medals[i]:`${i+1}.`}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:15,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>
                      <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",marginTop:1}}>
                        {GROUP_MATCHES.filter(m=>p.tips?.[m.id]?.home!==undefined&&p.tips[m.id].home!=="").length}/{GROUP_MATCHES.length} kamper tippet
                      </div>
                    </div>
                    <div style={{fontSize:20,fontWeight:800,color:i<3?pc[i]:"rgba(255,255,255,0.65)",flexShrink:0}}>{p.total}p</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ── APP ROOT ──────────────────────────────────────────────────────────────────
const NAV=[
  {id:"register",  label:"📋 Registrer"},
  {id:"mytips",    label:"📄 Mine tips"},
  {id:"rules",     label:"📖 Regler"},
  {id:"admin",     label:"⚙️ Admin"},
];

export default function App() {
  const [view,setView]=useState("mytips");
  const [participants,setParticipants]=useState([]);
  const [results,setResults]=useState({});
  const [bonusResults,setBonusResults]=useState({});
  const [loading,setLoading]=useState(true);
  const [dbError,setDbError]=useState(false);

  const loadData=useCallback(async()=>{
    try {
      const [parts,res,bonus]=await Promise.all([
        sb.getAll("participants"),
        sb.getAll("results"),
        sb.getAll("bonus_results"),
      ]);
      setParticipants(parts.map(p=>({...p,tips:p.tips||{},bonus:p.bonus||{}})));
      const resMap={};
      res.forEach(r=>{
        if (r.id.startsWith("rank_")) return;
        if (r.id.startsWith("override_")) {
          const group=r.id.replace("override_","");
          try { setGroupOverride(group, JSON.parse(r.home)); } catch{}
          return;
        }
        // Team name entries for adminOnly slots (r32_13_home, r32_13_away)
        if (r.id.endsWith("_home")||r.id.endsWith("_away")) {
          resMap[r.id]=r.home; // store as plain string
          return;
        }
        resMap[r.id]={home:r.home,away:r.away};
      });
      setResults(resMap);
      setBonusResults(Object.fromEntries(bonus.map(b=>{
        let approved=[];
        try{if(b.approved) approved=JSON.parse(b.approved);}catch{}
        return [b.id,{answer:b.answer,approved}];
      })));
      setDbError(false);
    } catch(e){console.error(e);setDbError(true);}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{loadData();},[loadData]);
  useEffect(()=>{const t=setInterval(loadData,120000);return()=>clearInterval(t);},[loadData]);

  return (
    <div style={{minHeight:"100vh",background:"radial-gradient(ellipse at 15% 15%, #0e3530 0%, #071c18 45%, #020c0a 100%)",fontFamily:"-apple-system,'Segoe UI',sans-serif",color:"#fff",paddingBottom:80}}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div aria-hidden style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,backgroundImage:"radial-gradient(circle,rgba(255,255,255,0.07) 1px,transparent 1px)",backgroundSize:"48px 48px",opacity:0.5}}/>

      {/* Header */}
      <div style={{position:"sticky",top:0,zIndex:20,background:"rgba(2,12,10,0.9)",backdropFilter:"blur(18px)",borderBottom:"1px solid rgba(255,255,255,0.06)",padding:"11px 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:11}}>
          <div style={{width:34,height:34,borderRadius:9,background:`linear-gradient(135deg,${T.teal},#1a5a4a)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,boxShadow:"0 2px 10px rgba(42,122,106,0.5)"}}>⚽</div>
          <div>
            <div style={{fontSize:10,letterSpacing:2.5,color:T.mint,textTransform:"uppercase",fontWeight:700,lineHeight:1}}>Vinmonopolet</div>
            <div style={{fontSize:16,fontWeight:800,lineHeight:1.3}}>VM 2026 Tippekonkurranse</div>
          </div>
        </div>
        <div>
          {!loading&&!dbError&&<div style={{background:"rgba(240,192,90,0.1)",border:"1px solid rgba(240,192,90,0.22)",borderRadius:20,padding:"4px 14px",fontSize:12,color:T.gold,fontWeight:700}}>{participants.length} deltakere</div>}
          {dbError&&<div style={{background:"rgba(180,40,40,0.18)",border:"1px solid rgba(200,60,60,0.3)",borderRadius:20,padding:"4px 14px",fontSize:12,color:"#f08080",fontWeight:700}}>⚠️ DB-feil</div>}
        </div>
      </div>

      {/* Nav */}
      <div style={{position:"relative",zIndex:1,display:"flex",justifyContent:"center",gap:4,padding:"14px 12px 0",flexWrap:"wrap"}}>
        {NAV.map(n=>(
          <button key={n.id} onClick={()=>setView(n.id)} style={{
            padding:"9px 16px",borderRadius:10,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,transition:"all 0.16s",
            background:view===n.id?`linear-gradient(135deg,${T.teal},#1a5a4a)`:"rgba(255,255,255,0.06)",
            color:view===n.id?"#fff":"rgba(255,255,255,0.45)",
            boxShadow:view===n.id?"0 2px 14px rgba(42,122,106,0.45)":"none",
          }}>{n.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{position:"relative",zIndex:1,padding:"20px 12px"}}>
        {loading?(
          <div style={{textAlign:"center",color:"rgba(255,255,255,0.35)",marginTop:80}}>
            <div style={{fontSize:48,marginBottom:14}}>⚽</div>
            <div style={{fontSize:12,letterSpacing:2,textTransform:"uppercase"}}>Kobler til database...</div>
          </div>
        ):dbError?(
          <div style={{...cardCss,textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:12}}>⚠️</div>
            <h2 style={{color:"#fff",margin:"0 0 8px"}}>Ikke koblet til database</h2>
            <p style={{color:T.muted}}>Sjekk SUPABASE_URL og SUPABASE_ANON_KEY i App.jsx</p>
          </div>
        ):(
          <>
            {view==="register"   &&<RegisterView   onRegister={loadData} externalResults={results}/>}
            {view==="mytips"     &&<MyTipsView      participants={participants} results={results} bonusResults={bonusResults}/>}
            {view==="rules"      &&<RulesView/>}
            {view==="admin"      &&<AdminView       results={results} setResults={setResults} bonusResults={bonusResults} setBonusResults={setBonusResults} participants={participants} reload={loadData}/>}
          </>
        )}
      </div>
    </div>
  );
}
