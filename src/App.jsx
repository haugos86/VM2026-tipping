import { useState, useEffect, useMemo, useCallback } from "react";

// ── CONFIG ────────────────────────────────────────────────────────────────────
const SUPABASE_URL  = "https://cnauqnqntbywsjoyuvur.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYXVxbnFudGJ5d3Nqb3l1dnVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMDc5NTEsImV4cCI6MjA5NDc4Mzk1MX0.IPxbGJIFhoc_CMJXsbxPMqHc9oPDEQxYXib4ogg2nvM";
const ADMIN_PIN  = "vm2026";
const DEADLINE   = new Date("2026-06-11T18:00:00Z");

function normalizeName(n) {
  return n.trim().toLowerCase().replace(/\s+/g," ").replace(/(^|\s)\S/g,c=>c.toUpperCase());
}
async function hashPin(pin) {
  const buf = await crypto.subtle.digest("SHA-256",new TextEncoder().encode(pin+"vm2026salt"));
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
  const code=FLAG_CODE[team];
  if (!code) return null;
  return <img src={`https://flagcdn.com/w${size*2}/${code}.png`} alt={team} width={size}
    height={Math.round(size*0.67)} style={{objectFit:"cover",borderRadius:2,verticalAlign:"middle",flexShrink:0}}
    onError={e=>{e.target.style.display="none";}}/>;
}

function generateGroupMatches() {
  const m=[]; let id=1;
  Object.entries(GROUPS).forEach(([g,teams])=>{
    [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]].forEach(([a,b])=>{
      m.push({id:`g${id++}`,group:g,home:teams[a],away:teams[b]});
    });
  });
  return m;
}
const GROUP_MATCHES = generateGroupMatches(); // 72 matches

// Readable label for a slot code
function slotLabel(code) {
  if (!code) return "?";
  if (/^1[A-L]$/.test(code)) return `Vinner gr.${code[1]}`;
  if (/^2[A-L]$/.test(code)) return `Nr.2 gr.${code[1]}`;
  if (/^3[A-L]+$/.test(code)) return `Beste 3. (${code.slice(1).split("").join("/")})`;
  if (/^V_(.+)$/.test(code)) return `Vinner ${code.slice(2)}`;
  if (/^T_(.+)$/.test(code)) return `Taper ${code.slice(2)}`;
  return code;
}

// All knockout matches — slot codes only, no chain resolution
const KNOCKOUT_SLOTS = [
  // 16-delsfinaler (M73-M88)
  {id:"r32_1", phase:"R32",label:"M73", home:"2A",   away:"2B"},
  {id:"r32_2", phase:"R32",label:"M74", home:"1E",   away:"3A/B/C/D/F"},
  {id:"r32_3", phase:"R32",label:"M75", home:"1F",   away:"2C"},
  {id:"r32_4", phase:"R32",label:"M76", home:"1C",   away:"2F"},
  {id:"r32_5", phase:"R32",label:"M77", home:"1I",   away:"3C/D/F/G/H"},
  {id:"r32_6", phase:"R32",label:"M78", home:"2E",   away:"2I"},
  {id:"r32_7", phase:"R32",label:"M79", home:"1A",   away:"3C/E/F/H/I"},
  {id:"r32_8", phase:"R32",label:"M80", home:"1L",   away:"3E/H/I/J/K"},
  {id:"r32_9", phase:"R32",label:"M81", home:"1D",   away:"3B/E/F/I/J"},
  {id:"r32_10",phase:"R32",label:"M82", home:"1G",   away:"3A/E/H/I/J"},
  {id:"r32_11",phase:"R32",label:"M83", home:"2K",   away:"2L"},
  {id:"r32_12",phase:"R32",label:"M84", home:"1H",   away:"2J"},
  {id:"r32_13",phase:"R32",label:"M85", home:"1B",   away:"3E/F/G/I/J"},
  {id:"r32_14",phase:"R32",label:"M86", home:"1J",   away:"2H"},
  {id:"r32_15",phase:"R32",label:"M87", home:"1K",   away:"3D/E/I/J/L"},
  {id:"r32_16",phase:"R32",label:"M88", home:"2D",   away:"2G"},
  // Åttendelsfinaler (M89-M96)
  {id:"r16_1",phase:"R16",label:"M89", home:"V_M74", away:"V_M77"},
  {id:"r16_2",phase:"R16",label:"M90", home:"V_M73", away:"V_M75"},
  {id:"r16_3",phase:"R16",label:"M91", home:"V_M76", away:"V_M78"},
  {id:"r16_4",phase:"R16",label:"M92", home:"V_M79", away:"V_M80"},
  {id:"r16_5",phase:"R16",label:"M93", home:"V_M83", away:"V_M84"},
  {id:"r16_6",phase:"R16",label:"M94", home:"V_M81", away:"V_M82"},
  {id:"r16_7",phase:"R16",label:"M95", home:"V_M86", away:"V_M88"},
  {id:"r16_8",phase:"R16",label:"M96", home:"V_M85", away:"V_M87"},
  // Kvartfinaler (M97-M100)
  {id:"qf1",phase:"QF",label:"M97",  home:"V_M89", away:"V_M90"},
  {id:"qf2",phase:"QF",label:"M98",  home:"V_M93", away:"V_M94"},
  {id:"qf3",phase:"QF",label:"M99",  home:"V_M91", away:"V_M92"},
  {id:"qf4",phase:"QF",label:"M100", home:"V_M95", away:"V_M96"},
  // Semifinaler (M101-M102)
  {id:"sf1",phase:"SF",label:"M101", home:"V_M97", away:"V_M98"},
  {id:"sf2",phase:"SF",label:"M102", home:"V_M99", away:"V_M100"},
  // Bronsefinale & Finale
  {id:"3p",phase:"3P",label:"M103",  home:"T_M101",away:"T_M102"},
  {id:"f", phase:"F", label:"⭐M104", home:"V_M101",away:"V_M102"},
];

const BONUS_QUESTIONS = [
  {id:"b1",text:"Hvem vinner VM?",              icon:"🏆",type:"text",  points:10},
  {id:"b2",text:"Hvem blir toppscorer?",          icon:"⚽",type:"text",  points:8},
  {id:"b3",text:"Antall røde kort i turneringen?",icon:"🟥",type:"number",points:6},
  {id:"b4",text:"Antall mål i turneringen?",      icon:"📊",type:"number",points:6},
  {id:"b5",text:"Antall mål Norge scorer totalt?",icon:"🇳🇴",type:"number",points:5},
];

// Points — simplified: no advance points
const PTS = {
  group: {exact:3,outcome:1},
  R32:   {exact:3,outcome:1},
  R16:   {exact:4,outcome:2},
  QF:    {exact:5,outcome:2},
  SF:    {exact:6,outcome:3},
  "3P":  {exact:4,outcome:2},
  F:     {exact:8,outcome:4},
  groupRank:{first:4,second:3,third:2},
};

// ── SUPABASE ──────────────────────────────────────────────────────────────────
const sb = {
  async query(table,method="GET",body=null,filter="") {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${filter}`,{
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
  getAll:       t=>sb.query(t,"GET",null,"?select=*"),
  upsert:       (t,b)=>sb.query(t,"POST",b,"?on_conflict=id"),
  upsertByName: (t,b)=>sb.query(t,"POST",b,"?on_conflict=name"),
};

// ── SCORING ───────────────────────────────────────────────────────────────────
function matchOutcome(h,a){ return h>a?"H":a>h?"A":"D"; }

function scoreMatch(tip,result,phase) {
  if (!tip||!result||tip.home===""||tip.away===""||
      result.home===""||result.away==="") return null;
  const [th,ta,rh,ra]=[tip.home,tip.away,result.home,result.away].map(Number);
  if ([th,ta,rh,ra].some(isNaN)) return null;
  const cfg = PTS[phase]||PTS.group;
  if (th===rh&&ta===ra) return cfg.exact;
  // Knockout: draw = home wins (pens) — outcome only H or A
  const tipOut  = phase==="group"?matchOutcome(th,ta):(th>=ta?"H":"A");
  const realOut = phase==="group"?matchOutcome(rh,ra):(rh>=ra?"H":"A");
  if (tipOut===realOut) return cfg.outcome;
  return 0;
}

function computeGroupStandings(groupId,src) {
  const teams=GROUPS[groupId];
  const stats=Object.fromEntries(teams.map(t=>[t,{pts:0,gd:0,gf:0}]));
  GROUP_MATCHES.filter(m=>m.group===groupId).forEach(m=>{
    const r=src[m.id];
    if (!r||r.home===""||r.away==="") return;
    const h=parseInt(r.home),a=parseInt(r.away);
    if (isNaN(h)||isNaN(a)) return;
    if (h>a){stats[m.home].pts+=3;}
    else if (a>h){stats[m.away].pts+=3;}
    else{stats[m.home].pts+=1;stats[m.away].pts+=1;}
    stats[m.home].gf+=h; stats[m.home].gd+=(h-a);
    stats[m.away].gf+=a; stats[m.away].gd+=(a-h);
  });
  return teams.slice().sort((a,b)=>
    stats[b].pts-stats[a].pts||stats[b].gd-stats[a].gd||stats[b].gf-stats[a].gf
  );
}

function calcTotal(p,results,bonusResults) {
  let pts=0;
  const tips=p.tips||{};

  // Group matches
  GROUP_MATCHES.forEach(m=>{
    const s=scoreMatch(tips[m.id],results[m.id],"group");
    if (s!==null) pts+=s;
  });

  // Group rankings — only when all 6 results are in
  Object.keys(GROUPS).forEach(g=>{
    const ids=GROUP_MATCHES.filter(m=>m.group===g).map(m=>m.id);
    if (ids.filter(id=>results[id]?.home!==undefined&&results[id]?.home!=="").length<6) return;
    if (ids.filter(id=>tips[id]?.home!==undefined&&tips[id]?.home!=="").length===0) return;
    const actual = GROUP_OVERRIDES[g]?.length===4
      ? GROUP_OVERRIDES[g]
      : computeGroupStandings(g,results);
    const tipped = computeGroupStandings(g,tips);
    if (actual[0]&&tipped[0]===actual[0]) pts+=PTS.groupRank.first;
    if (actual[1]&&tipped[1]===actual[1]) pts+=PTS.groupRank.second;
    if (actual[2]&&tipped[2]===actual[2]) pts+=PTS.groupRank.third;
  });

  // Knockout — just score the result, no advance points
  KNOCKOUT_SLOTS.forEach(slot=>{
    const s=scoreMatch(tips[slot.id],results[slot.id],slot.phase);
    if (s!==null) pts+=s;
  });

  // Bonus
  BONUS_QUESTIONS.forEach(q=>{
    const tip=p.bonus?.[q.id];
    if (!tip||tip.toString().trim()==="") return;
    const tipNorm=tip.toString().trim().toLowerCase();
    const approved=bonusResults[q.id]?.approved||[];
    const legacy=bonusResults[q.id]?.answer;
    if (approved.some(a=>a.toString().trim().toLowerCase()===tipNorm)||
        (legacy&&tipNorm===legacy.toString().trim().toLowerCase()))
      pts+=q.points;
  });
  return pts;
}

// ── GROUP OVERRIDES (admin tiebreak) ─────────────────────────────────────────
let GROUP_OVERRIDES = {};
function setGroupOverride(group,ranking){ GROUP_OVERRIDES={...GROUP_OVERRIDES,[group]:ranking}; }

// ── DESIGN TOKENS ─────────────────────────────────────────────────────────────
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

function PhaseHeader({phase}) {
  const labels={R32:"16-delsfinaler",R16:"Åttendelsfinaler",QF:"Kvartfinaler",SF:"Semifinaler","3P":"Bronsefinale",F:"⭐ FINALE",BONUS:"Bonusspørsmål"};
  return <div style={{margin:"20px 0 6px",padding:"6px 12px",background:"rgba(240,192,90,0.08)",border:"1px solid rgba(240,192,90,0.18)",borderRadius:8,fontSize:11,fontWeight:800,letterSpacing:2,color:T.gold,textTransform:"uppercase"}}>{labels[phase]??phase}</div>;
}

function GroupBanner({group}) {
  return <div style={{margin:"16px 0 4px",padding:"8px 12px",background:"rgba(42,122,106,0.1)",border:"1px solid rgba(42,122,106,0.2)",borderRadius:10,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
    <span style={{fontSize:11,fontWeight:800,letterSpacing:2,color:T.mint,textTransform:"uppercase"}}>Gruppe {group}</span>
    <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
      {GROUPS[group].map(t=>(
        <span key={t} style={{fontSize:13,color:"rgba(255,255,255,0.7)",display:"flex",alignItems:"center",gap:4}}>
          <FlagImg team={t}/> {t}
        </span>
      ))}
    </div>
  </div>;
}

// Group match row — with flags for known teams
function MatchRow({match,tip,onChange,readOnly,result}) {
  const pts = result?.home!==undefined&&result?.away!==undefined
    ? scoreMatch(tip,result,"group") : null;
  const exact = pts===PTS.group.exact;
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,alignItems:"center",padding:"7px 2px",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
      <div style={{textAlign:"right",fontSize:13,color:"rgba(255,255,255,0.85)",display:"flex",alignItems:"center",justifyContent:"flex-end",gap:5}}>
        <strong>{match.home}</strong><FlagImg team={match.home}/>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:5}}>
        {readOnly ? (
          <>
            <div style={{minWidth:48,textAlign:"center",fontSize:14,fontWeight:700,color:"rgba(255,255,255,0.55)"}}>{tip?.home??"–"}–{tip?.away??"–"}</div>
            {result?.home!==undefined&&result?.home!==""&&<div style={{minWidth:44,textAlign:"center",fontSize:13,fontWeight:700,color:T.gold,padding:"2px 6px",borderRadius:5,background:"rgba(240,192,90,0.08)",border:"1px solid rgba(240,192,90,0.2)"}}>{result.home}–{result.away}</div>}
          </>
        ) : (
          <>
            <ScoreInput val={tip?.home??""} onChange={v=>onChange({...tip,home:v})}/>
            <span style={{color:"rgba(255,255,255,0.25)"}}>–</span>
            <ScoreInput val={tip?.away??""} onChange={v=>onChange({...tip,away:v})}/>
          </>
        )}
        {pts!==null&&<div style={{minWidth:28,textAlign:"center",padding:"3px 6px",borderRadius:6,fontSize:11,fontWeight:800,background:exact?"rgba(240,192,90,0.15)":pts>0?"rgba(126,200,160,0.12)":"rgba(255,255,255,0.04)",color:exact?T.gold:pts>0?T.mint:"#555"}}>{pts}p</div>}
      </div>
      <div style={{fontSize:13,color:"rgba(255,255,255,0.85)",display:"flex",alignItems:"center",gap:5}}>
        <FlagImg team={match.away}/><strong>{match.away}</strong>
      </div>
    </div>
  );
}

// Knockout match row — slot codes as labels, no chain resolution
function KOMatchRow({slot,tip,onChange,readOnly,result}) {
  const pts = result?.home!==undefined&&result?.away!==undefined
    ? scoreMatch(tip,result,slot.phase) : null;
  const exact = pts===(PTS[slot.phase]||PTS.R32).exact;
  const isEnabled = true; // all knockout matches are tippable
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,alignItems:"center",padding:"8px 2px",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
      <div style={{textAlign:"right",fontSize:12,color:"rgba(255,255,255,0.7)",fontWeight:600}}>{slot.home}</div>
      <div style={{display:"flex",alignItems:"center",gap:5}}>
        <span style={{fontSize:10,color:"rgba(255,255,255,0.3)",marginRight:2}}>{slot.label}</span>
        {readOnly ? (
          <>
            <div style={{minWidth:48,textAlign:"center",fontSize:14,fontWeight:700,color:"rgba(255,255,255,0.55)"}}>{tip?.home??"–"}–{tip?.away??"–"}</div>
            {result?.home!==undefined&&result?.home!==""&&<div style={{minWidth:44,textAlign:"center",fontSize:13,fontWeight:700,color:T.gold,padding:"2px 6px",borderRadius:5,background:"rgba(240,192,90,0.08)",border:"1px solid rgba(240,192,90,0.2)"}}>{result.home}–{result.away}</div>}
          </>
        ) : (
          <>
            <ScoreInput val={tip?.home??""} onChange={v=>onChange({...tip,home:v})}/>
            <span style={{color:"rgba(255,255,255,0.25)"}}>–</span>
            <ScoreInput val={tip?.away??""} onChange={v=>onChange({...tip,away:v})}/>
          </>
        )}
        {pts!==null&&<div style={{minWidth:28,textAlign:"center",padding:"3px 6px",borderRadius:6,fontSize:11,fontWeight:800,background:exact?"rgba(240,192,90,0.15)":pts>0?"rgba(126,200,160,0.12)":"rgba(255,255,255,0.04)",color:exact?T.gold:pts>0?T.mint:"#555"}}>{pts}p</div>}
      </div>
      <div style={{fontSize:12,color:"rgba(255,255,255,0.7)",fontWeight:600}}>{slot.away}</div>
    </div>
  );
}

function DeadlineBanner() {
  const [now,setNow]=useState(new Date());
  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(t);},[]);
  const diff=DEADLINE-now;
  if (diff<=0) return <div style={{background:"rgba(180,40,40,0.18)",border:"1px solid rgba(200,60,60,0.3)",borderRadius:12,padding:"12px 18px",marginBottom:16,textAlign:"center"}}><span style={{color:"#f08080",fontWeight:700}}>🔒 Tipping stengt — VM er i gang!</span></div>;
  const parts=[[Math.floor(diff/86400000),"dager"],[Math.floor((diff%86400000)/3600000),"timer"],[Math.floor((diff%3600000)/60000),"min"],[Math.floor((diff%60000)/1000),"sek"]];
  return <div style={{background:"rgba(42,122,106,0.12)",border:"1px solid rgba(42,122,106,0.25)",borderRadius:12,padding:"12px 18px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
    <span style={{fontSize:11,fontWeight:700,letterSpacing:1.5,color:T.mint,textTransform:"uppercase"}}>⏱ Stenger om</span>
    <div style={{display:"flex",gap:14}}>
      {parts.map(([v,l])=>(
        <div key={l} style={{textAlign:"center"}}>
          <div style={{fontSize:20,fontWeight:800,color:T.gold,lineHeight:1}}>{String(v).padStart(2,"0")}</div>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",letterSpacing:1}}>{l.toUpperCase()}</div>
        </div>
      ))}
    </div>
  </div>;
}

// ── REGISTER / LOGIN / EDIT ───────────────────────────────────────────────────
function RegisterView({onLogin,externalResults={},session}) {
  const [mode,setMode]=useState(session?"editing":"choose");
  const [name,setName]=useState("");
  const [pin,setPin]=useState("");
  const [pinConfirm,setPinConfirm]=useState("");
  const [tips,setTips]=useState({});
  const [bonus,setBonus]=useState({});
  const [step,setStep]=useState("group");
  const [currentGroup,setCurrentGroup]=useState("A");
  const [saving,setSaving]=useState(false);
  const [autoSaveState,setAutoSaveState]=useState("idle");
  const [error,setError]=useState("");
  const [currentUser,setCurrentUser]=useState(null);
  const [ready,setReady]=useState(!session);
  const isLocked=new Date()>=DEADLINE;

  // Bootstrap from session
  useEffect(()=>{
    let cancelled=false;
    if (session&&!currentUser) {
      sb.query("participants","GET",null,`?name=eq.${encodeURIComponent(session.name)}&select=*`).then(res=>{
        if (cancelled) return;
        if (res[0]) { setCurrentUser(res[0]); setTips(res[0].tips||{}); setBonus(res[0].bonus||{}); }
        setReady(true);
      }).catch(e=>{console.error(e);setReady(true);});
    }
    return()=>{cancelled=true;};
  },[session]);

  const setTip=(id,val)=>setTips(t=>({...t,[id]:val}));

  // Autosave
  useEffect(()=>{
    if (!currentUser||!ready) return;
    setAutoSaveState("saving");
    const t=setTimeout(async()=>{
      try {
        await sb.upsertByName("participants",[{name:currentUser.name,pin_hash:currentUser.pin_hash,tips,bonus}]);
        setAutoSaveState("idle");
      } catch(e){ console.error(e); setAutoSaveState("error"); }
    },1500);
    return()=>clearTimeout(t);
  },[tips,bonus,currentUser,ready]);

  // Autofill
  const AUTOFILL_MAX=3;
  const autofillKey=currentUser?`vm2026_autofill_${currentUser.name}`:null;
  const [autoFillCount,setAutoFillCount]=useState(0);
  useEffect(()=>{
    if (!autofillKey) return;
    try{setAutoFillCount(parseInt(localStorage.getItem(autofillKey)||"0"));}catch{}
  },[autofillKey]);
  const autofillRemaining=Math.max(0,AUTOFILL_MAX-autoFillCount);
  const [autoFilling,setAutoFilling]=useState(false);

  const doAutoFill=async()=>{
    if (autoFillCount>=AUTOFILL_MAX||isLocked) return;
    setAutoFilling(true);
    try {
      const groupList=Object.entries(GROUPS).map(([g,t])=>`Gruppe ${g}: ${t.join(", ")}`).join("\n");
      const koList=KNOCKOUT_SLOTS.map(s=>`${s.id} (${s.label}): ${s.home} vs ${s.away}`).join("\n");
      const prompt=`Du er en fotballekspert. Generer realistiske VM 2026-tips.

Grupper:\n${groupList}

Sluttspill:\n${koList}

Returner KUN gyldig JSON (ingen annen tekst):
{
  "matches": { "g1": {"home":"2","away":"1"}, ... alle 72 gruppekamper g1-g72 },
  "knockout": { "r32_1": {"home":"2","away":"0"}, ... alle sluttspillkamper r32_1 til f },
  "bonus": { "b1":"Brasil","b2":"Mbappé","b3":"18","b4":"156","b5":"4" }
}

Regler:
- MAKS 5 mål per lag
- Typiske resultater: 1-0, 2-1, 1-1, 2-0. Sjeldent: 3-0, 3-1
- Favoritter vinner oftere men ikke alltid
- Inkluder alle 72 gruppekamper og alle ${KNOCKOUT_SLOTS.length} sluttspillkamper
- Dette er forsøk nr ${autoFillCount+1} — varier resultatene`;

      const response=await fetch("/api/autofill",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,attempt:autoFillCount})});
      const data=await response.json();
      if (!response.ok) throw new Error(data.error||"API-feil");
      const text=data.content?.[0]?.text||"";
      const jsonMatch=text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Ingen gyldig JSON");
      const parsed=JSON.parse(jsonMatch[0]);
      const cap=v=>String(Math.min(5,Math.max(0,parseInt(v)||0)));
      const newTips={...tips};
      if (parsed.matches) Object.entries(parsed.matches).forEach(([id,s])=>{
        if (s?.home!==undefined) newTips[id]={home:cap(s.home),away:cap(s.away)};
      });
      if (parsed.knockout) Object.entries(parsed.knockout).forEach(([id,s])=>{
        if (s?.home!==undefined) newTips[id]={home:cap(s.home),away:cap(s.away)};
      });
      setTips(newTips);
      if (parsed.bonus) { const nb={...bonus}; Object.entries(parsed.bonus).forEach(([id,v])=>{nb[id]=String(v);}); setBonus(nb); }
      const newCount=autoFillCount+1;
      setAutoFillCount(newCount);
      if (autofillKey) try{localStorage.setItem(autofillKey,String(newCount));}catch{}
    } catch(e){ console.error(e); alert("Autofyll feilet: "+e.message); }
    finally{ setAutoFilling(false); }
  };

  const doRegister=async()=>{
    if (isLocked){setError("Tipping er stengt.");return;}
    const cleanName=normalizeName(name);
    if (!cleanName||pin.length<4||pin!==pinConfirm) return;
    setSaving(true); setError("");
    try {
      const ph=await hashPin(pin);
      const ex=await sb.query("participants","GET",null,`?name=eq.${encodeURIComponent(cleanName)}&select=name`);
      if (ex.length>0){setError("Navn allerede i bruk — logg inn i stedet.");return;}
      const u={name:cleanName,pin_hash:ph,tips:{},bonus:{}};
      await sb.upsertByName("participants",[u]);
      setCurrentUser(u); setTips({}); setBonus({}); setReady(true);
      onLogin(u); setMode("editing");
    } catch(e){setError("Feil: "+e.message);}
    finally{setSaving(false);}
  };

  const doLogin=async()=>{
    const cleanName=normalizeName(name);
    if (!cleanName||!pin) return;
    setSaving(true); setError("");
    try {
      const ph=await hashPin(pin);
      const res=await sb.query("participants","GET",null,`?name=eq.${encodeURIComponent(cleanName)}&select=*`);
      if (res.length===0){setError("Bruker ikke funnet.");return;}
      if (res[0].pin_hash!==ph){setError("Feil PIN-kode.");return;}
      const u=res[0];
      setCurrentUser(u); setTips(u.tips||{}); setBonus(u.bonus||{}); setReady(true);
      onLogin(u); setMode("editing");
    } catch(e){setError("Feil: "+e.message);}
    finally{setSaving(false);}
  };

  const doSubmit=async()=>{
    if (isLocked){setError("Tipping er stengt.");return;}
    setSaving(true);
    try {
      await sb.upsertByName("participants",[{name:currentUser.name,pin_hash:currentUser.pin_hash,tips,bonus}]);
      setMode("done");
    } catch(e){setError("Feil: "+e.message);}
    finally{setSaving(false);}
  };

  if (mode==="choose") return (
    <div style={cardCss}>
      <DeadlineBanner/>
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{fontSize:52,marginBottom:8}}>⚽</div>
        <h2 style={{color:"#fff",margin:"0 0 4px",fontSize:22}}>VM 2026 Tippekonkurranse</h2>
        <p style={{color:T.muted,margin:0,fontSize:13}}>Vinmonopolet</p>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {[{m:"login",icon:"🔑",title:"Logg inn",sub:"Jeg har deltatt før"},
          {m:"register",icon:"✨",title:"Registrer meg",sub:"Opprett ny bruker med navn og PIN"}
        ].map(({m,icon,title,sub})=>(
          <button key={m} onClick={()=>setMode(m)} style={{padding:"16px 20px",borderRadius:12,cursor:"pointer",fontFamily:"inherit",textAlign:"left",
            background:m==="login"?"rgba(42,122,106,0.18)":"rgba(255,255,255,0.04)",
            border:`1px solid ${m==="login"?"rgba(42,122,106,0.35)":"rgba(255,255,255,0.09)"}`,color:"#fff"}}>
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
      <input type="password" value={pin} onChange={e=>setPin(e.target.value)} style={inputCss} onKeyDown={e=>e.key==="Enter"&&doLogin()}/>
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
      <input type="password" value={pin} onChange={e=>setPin(e.target.value)} style={inputCss}/>
      <label style={labelCss}>Bekreft PIN</label>
      <input type="password" value={pinConfirm} onChange={e=>setPinConfirm(e.target.value)} style={inputCss} onKeyDown={e=>e.key==="Enter"&&doRegister()}/>
      {error&&<p style={{color:"#f08080",fontSize:13,marginBottom:12}}>{error}</p>}
      <div style={{display:"flex",gap:10}}>
        <Btn ghost onClick={()=>{setMode("choose");setError("");}}>← Tilbake</Btn>
        <Btn onClick={doRegister} disabled={saving||!name.trim()||pin.length<4||pin!==pinConfirm}>{saving?"Oppretter...":"Opprett bruker →"}</Btn>
      </div>
    </div>
  );

  if (mode==="editing") {
    const allGroups=Object.keys(GROUPS);
    const filledGroup=GROUP_MATCHES.filter(m=>tips[m.id]?.home!==undefined&&tips[m.id]?.home!=="").length;
    const filledKO=KNOCKOUT_SLOTS.filter(s=>tips[s.id]?.home!==undefined&&tips[s.id]?.home!=="").length;
    const total=GROUP_MATCHES.length+KNOCKOUT_SLOTS.length;
    const filled=filledGroup+filledKO;
    const pct=Math.round((filled/total)*100);

    return (
      <div style={{maxWidth:740,margin:"0 auto"}}>
        {/* User bar */}
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
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
            <span style={{fontSize:12,color:autoSaveState==="error"?"#f08080":autoSaveState==="saving"?T.mint:"rgba(255,255,255,0.25)"}}>
              {autoSaveState==="error"?"⚠️ Lagring feilet":autoSaveState==="saving"?"💾 Lagrer...":"✓ Lagret"}
            </span>
            {!isLocked&&<button onClick={doAutoFill} disabled={autoFilling||autofillRemaining===0} style={{
              padding:"5px 10px",borderRadius:7,border:`1px solid ${autofillRemaining===0?"rgba(255,255,255,0.1)":"rgba(240,192,90,0.35)"}`,
              cursor:autoFilling||autofillRemaining===0?"not-allowed":"pointer",fontFamily:"inherit",
              fontSize:10,fontWeight:700,
              background:autofillRemaining===0?"rgba(255,255,255,0.03)":"rgba(240,192,90,0.12)",
              color:autofillRemaining===0?"rgba(255,255,255,0.25)":T.gold,
            }}>
              {autoFilling?"⚽ Fyller...":autofillRemaining===0?"🔒 Ingen forsøk":autoFillCount>0?`🎲 Prøv igjen (${autofillRemaining} igjen)`:"🎲 Fyll ut for meg"}
            </button>}
          </div>
        </div>

        {/* Step tabs */}
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
                const done=GROUP_MATCHES.filter(m=>m.group===g&&tips[m.id]?.home!==undefined&&tips[m.id]?.home!==""&&tips[m.id]?.away!==undefined&&tips[m.id]?.away!=="").length===6;
                return <button key={g} onClick={()=>setCurrentGroup(g)} style={{padding:"6px 12px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,
                  background:currentGroup===g?`linear-gradient(135deg,${T.teal},#1a5a4a)`:done?"rgba(126,200,160,0.15)":"rgba(255,255,255,0.06)",
                  color:currentGroup===g?"#fff":done?T.mint:"rgba(255,255,255,0.5)",
                }}>{done?"✓ ":""}{g}</button>;
              })}
            </div>
            <GroupBanner group={currentGroup}/>
            <p style={{color:"rgba(255,255,255,0.35)",fontSize:12,margin:"8px 0"}}>Alle 6 kamper · 3p eksakt · 1p riktig utfall · 4/3/2p riktig plassering</p>
            {GROUP_MATCHES.filter(m=>m.group===currentGroup).map(m=>(
              <MatchRow key={m.id} match={m} tip={tips[m.id]} onChange={v=>setTip(m.id,v)}/>
            ))}
            {(()=>{
              const n=GROUP_MATCHES.filter(m=>m.group===currentGroup&&tips[m.id]?.home!==undefined&&tips[m.id]?.home!=="").length;
              if (n===0) return null;
              const standings=computeGroupStandings(currentGroup,tips);
              const colors=["#f0c05a","#c0c0c0",T.mint,"rgba(255,255,255,0.3)"];
              return <div style={{marginTop:12,padding:"10px 12px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10}}>
                <div style={{fontSize:11,fontWeight:700,letterSpacing:1.5,color:T.mint,textTransform:"uppercase",marginBottom:8}}>Beregnet plassering</div>
                {standings.map((team,i)=>(
                  <div key={team} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0",borderBottom:i<3?"1px solid rgba(255,255,255,0.05)":"none"}}>
                    <FlagImg team={team} size={16}/>
                    <span style={{fontWeight:600,fontSize:13,color:colors[i],flex:1}}>{team}</span>
                    <span style={{fontSize:11,color:"rgba(255,255,255,0.3)"}}>{["→ videre","→ videre","→ beste taper","→ ute"][i]}</span>
                  </div>
                ))}
              </div>;
            })()}
            <div style={{display:"flex",gap:8,marginTop:14,justifyContent:"space-between",flexWrap:"wrap"}}>
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
            <p style={{color:"rgba(255,255,255,0.35)",fontSize:12,margin:"0 0 12px"}}>
              Tippe kampresultater etter 90 min. Slottkoder viser hvem som møtes (f.eks. 1A = vinner gr.A).
            </p>
            {(()=>{
              let lp=null;
              return KNOCKOUT_SLOTS.map(slot=>{
                const show=slot.phase!==lp; if(show) lp=slot.phase;
                return <div key={slot.id}>
                  {show&&<PhaseHeader phase={slot.phase}/>}
                  <KOMatchRow slot={slot} tip={tips[slot.id]} onChange={v=>setTip(slot.id,v)}/>
                </div>;
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
            <p style={{color:"rgba(255,255,255,0.35)",fontSize:12,marginBottom:16,marginTop:0}}>Kun eksakt svar gir poeng.</p>
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
      <p style={{color:T.muted,marginBottom:20}}>Du kan endre frem til 11. juni kl. 20:00.</p>
      <Btn ghost onClick={()=>setMode("editing")}>✏️ Endre tips</Btn>
    </div>
  );
}

// ── MINE TIPS ─────────────────────────────────────────────────────────────────
function MyTipsView({session,participants,results,bonusResults,onEditTips}) {
  // Always reload fresh from DB to avoid stale cache
  const [userData,setUserData]=useState(null);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    if (!session?.name) return;
    setLoading(true);
    sb.query("participants","GET",null,`?name=eq.${encodeURIComponent(session.name)}&select=*`)
      .then(res=>{ if(res[0]) setUserData(res[0]); })
      .catch(console.error)
      .finally(()=>setLoading(false));
  },[session?.name]);

  if (loading) return <div style={{...cardCss,textAlign:"center",padding:"48px"}}><div style={{fontSize:36,marginBottom:12}}>⏳</div><p style={{color:T.muted}}>Laster inn...</p></div>;
  if (!userData) return <div style={{...cardCss,textAlign:"center",padding:"48px"}}><p style={{color:T.muted}}>Fant ikke din kupong.</p></div>;

  const tips=userData.tips||{};
  const b=userData.bonus||{};
  const total=calcTotal(userData,results,bonusResults);

  return (
    <div style={{maxWidth:740,margin:"0 auto"}}>
      <div style={{background:"rgba(42,122,106,0.12)",border:"1px solid rgba(42,122,106,0.25)",borderRadius:12,padding:"14px 18px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <div>
          <div style={{fontWeight:800,fontSize:18,color:"#fff"}}>{userData.name}</div>
          <div style={{fontSize:12,color:T.mint,marginTop:3}}>{GROUP_MATCHES.filter(m=>tips[m.id]?.home!==undefined&&tips[m.id]?.home!=="").length} av {GROUP_MATCHES.length} gruppekamper tippet</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{fontSize:28,fontWeight:800,color:T.gold}}>{total}p</div>
          {new Date()<DEADLINE&&onEditTips&&<button onClick={onEditTips} style={{padding:"8px 14px",borderRadius:8,border:"1px solid rgba(240,192,90,0.4)",background:"rgba(240,192,90,0.1)",color:T.gold,cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700}}>✏️ Endre tips</button>}
        </div>
      </div>
      <div style={cardCss}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:14,marginBottom:10,paddingBottom:10,borderBottom:"1px solid rgba(255,255,255,0.06)",fontSize:11,color:"rgba(255,255,255,0.5)"}}>
          <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{padding:"2px 8px",borderRadius:4,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",fontSize:10,fontWeight:700}}>1–0</span>Ditt tips</span>
          <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{padding:"2px 8px",borderRadius:4,background:"rgba(240,192,90,0.08)",border:"1px solid rgba(240,192,90,0.2)",color:T.gold,fontSize:10,fontWeight:700}}>1–0</span>Fasit</span>
        </div>
        <div style={{maxHeight:"65vh",overflowY:"auto"}}>
          {Object.keys(GROUPS).map(g=>(
            <div key={g}>
              <GroupBanner group={g}/>
              {GROUP_MATCHES.filter(m=>m.group===g).map(m=>(
                <MatchRow key={m.id} match={m} tip={tips[m.id]} result={results[m.id]} readOnly/>
              ))}
            </div>
          ))}
          {(()=>{let lp=null; return KNOCKOUT_SLOTS.map(slot=>{
            const show=slot.phase!==lp; if(show) lp=slot.phase;
            return <div key={slot.id}>{show&&<PhaseHeader phase={slot.phase}/>}
              <KOMatchRow slot={slot} tip={tips[slot.id]} result={results[slot.id]} readOnly/>
            </div>;
          });})()}
          <PhaseHeader phase="BONUS"/>
          {BONUS_QUESTIONS.map(q=>{
            const tip=b[q.id];
            const approved=bonusResults[q.id]?.approved||[];
            const legacy=bonusResults[q.id]?.answer;
            const correct=tip&&(approved.some(a=>a.toString().trim().toLowerCase()===tip.toString().trim().toLowerCase())||(legacy&&tip.toString().trim().toLowerCase()===legacy.toString().trim().toLowerCase()));
            const hasAnswer=approved.length>0||legacy;
            return <div key={q.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 2px",borderBottom:"1px solid rgba(255,255,255,0.04)",fontSize:13}}>
              <span style={{color:"rgba(255,255,255,0.5)"}}>{q.icon} {q.text}</span>
              <span style={{fontWeight:700,color:correct?T.gold:hasAnswer?"#f08080":"rgba(255,255,255,0.65)"}}>
                {tip||"–"}{hasAnswer?` ${correct?`✅ ${q.points}p`:"❌"}`:""}
              </span>
            </div>;
          })}
        </div>
      </div>
    </div>
  );
}

// ── RULES ─────────────────────────────────────────────────────────────────────
function RulesView() {
  const sections=[
    {title:"⚽ Gruppespill (72 kamper)",rows:[["Eksakt resultat","3p"],["Riktig utfall (seier/uavgjort)","1p"],["Riktig lag på 1. plass","4p"],["Riktig lag på 2. plass","3p"],["Riktig lag på 3. plass (beste taper)","2p"]]},
    {title:"🏆 Sluttspill — alle runder kan tippes",rows:[["16-delsfinale — eksakt / riktig utfall","3p / 1p"],["Åttendelsfinale — eksakt / riktig utfall","4p / 2p"],["Kvartfinale — eksakt / riktig utfall","5p / 2p"],["Semifinale — eksakt / riktig utfall","6p / 3p"],["Bronsefinale — eksakt / riktig utfall","4p / 2p"],["Finale — eksakt / riktig utfall","8p / 4p"]]},
    {title:"🎁 Bonusspørsmål (kun eksakt svar)",rows:[["Hvem vinner VM?","10p"],["Hvem blir toppscorer?","8p"],["Antall røde kort?","6p"],["Antall mål totalt?","6p"],["Antall mål Norge scorer?","5p"]]},
  ];
  return (
    <div style={{maxWidth:740,margin:"0 auto"}}>
      <div style={cardCss}>
        <h2 style={{color:"#fff",margin:"0 0 4px",fontSize:20}}>📋 Regler og poengberegning</h2>
        <p style={{color:T.muted,fontSize:13,marginBottom:20}}>VM 2026 — Vinmonopolet</p>
        {sections.map(s=>(
          <div key={s.title} style={{marginBottom:20}}>
            <div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:8,paddingBottom:6,borderBottom:"1px solid rgba(255,255,255,0.08)"}}>{s.title}</div>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <tbody>{s.rows.map(([label,pts])=>(
                <tr key={label}>
                  <td style={{fontSize:13,color:"rgba(255,255,255,0.65)",padding:"5px 0"}}>{label}</td>
                  <td style={{fontSize:13,fontWeight:700,color:T.gold,textAlign:"right",padding:"5px 0"}}>{pts}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ))}
        <div style={{background:"rgba(240,192,90,0.08)",border:"1px solid rgba(240,192,90,0.2)",borderRadius:10,padding:"14px 16px"}}>
          <div style={{fontSize:12,color:T.mint,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Generelle regler</div>
          <ul style={{color:"rgba(255,255,255,0.6)",fontSize:13,margin:0,paddingLeft:18,lineHeight:1.9}}>
            <li>Tipping stenger 11. juni 2026 kl. 20:00 — åpningskampen starter</li>
            <li>Sluttspillet tippes med slot-koder: 1A = vinner gruppe A, 2B = nr.2 gruppe B osv.</li>
            <li>I sluttspillet er det alltid en vinner — 1-1 betyr hjemmelaget vinner (straffer)</li>
            <li>Grupperanking-poeng gis kun når alle 6 kamper i gruppen er spilt</li>
            <li>Bonusspørsmål: kun eksakt svar gir poeng — admin godkjenner varianter</li>
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
      map[norm].count++; map[norm].names.push(p.name);
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
          <button key={bq.id} onClick={()=>setSelectedQ(bq.id)} style={{padding:"7px 14px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700,
            background:selectedQ===bq.id?`linear-gradient(135deg,${T.teal},#1a5a4a)`:"rgba(255,255,255,0.06)",
            color:selectedQ===bq.id?"#fff":"rgba(255,255,255,0.5)"}}>
            {bq.icon} {bq.points}p
          </button>
        ))}
      </div>
      {q&&<div>
        <div style={{fontSize:15,fontWeight:700,color:"#fff",marginBottom:4}}>{q.icon} {q.text}</div>
        <div style={{fontSize:12,color:T.muted,marginBottom:14}}>Klikk svar for å godkjenne. {saving&&<span style={{color:T.mint}}>Lagrer...</span>}</div>
        {answers.length===0&&<p style={{color:"rgba(255,255,255,0.3)",fontSize:13}}>Ingen svar ennå.</p>}
        <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:"42vh",overflowY:"auto"}}>
          {answers.map(({raw,count,names})=>{
            const isApproved=approved.includes(raw);
            return <div key={raw} onClick={()=>toggleApproved(raw)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:10,cursor:"pointer",
              background:isApproved?"rgba(126,200,160,0.15)":"rgba(255,255,255,0.04)",
              border:`1px solid ${isApproved?"rgba(126,200,160,0.4)":"rgba(255,255,255,0.08)"}`}}>
              <div style={{width:22,height:22,borderRadius:6,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,
                background:isApproved?"rgba(126,200,160,0.3)":"rgba(255,255,255,0.08)",
                border:`1px solid ${isApproved?T.mint:"rgba(255,255,255,0.15)"}`,color:isApproved?T.mint:"transparent"}}>✓</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:700,color:isApproved?T.mint:"#fff"}}>{raw}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{names.join(", ")}</div>
              </div>
              <div style={{fontSize:12,fontWeight:700,flexShrink:0,padding:"3px 10px",borderRadius:20,
                color:isApproved?T.mint:"rgba(255,255,255,0.4)",background:isApproved?"rgba(126,200,160,0.1)":"rgba(255,255,255,0.05)"}}>
                {count} {isApproved?`· ${count*q.points}p`:""}
              </div>
            </div>;
          })}
        </div>
        {approved.length>0&&<div style={{marginTop:12,padding:"10px 14px",background:"rgba(240,192,90,0.08)",border:"1px solid rgba(240,192,90,0.2)",borderRadius:10}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:1,color:T.gold,textTransform:"uppercase",marginBottom:6}}>Godkjente svar</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {approved.map(a=><span key={a} style={{fontSize:12,color:T.gold,background:"rgba(240,192,90,0.1)",padding:"3px 10px",borderRadius:20,border:"1px solid rgba(240,192,90,0.2)"}}>{a}</span>)}
          </div>
        </div>}
      </div>}
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
    if (!window.confirm("Overskrive ALLE resultater med simulerte? (Kun for testing)")) return;
    setAdminFilling(true);
    try {
      const groupList=Object.entries(GROUPS).map(([g,t])=>`Gruppe ${g}: ${t.join(", ")}`).join("\n");
      const koList=KNOCKOUT_SLOTS.map(s=>`${s.id}: ${s.home} vs ${s.away}`).join("\n");
      const prompt=`Generer komplett VM 2026-fasit for simulering.\n\nGrupper:\n${groupList}\n\nSluttspill:\n${koList}\n\nReturner KUN JSON:\n{"matches":{"g1":{"home":"2","away":"1"},...alle g1-g72},"knockout":{"r32_1":{"home":"2","away":"0"},...alle til f}}\n\nMaks 5 mål per lag. Realistiske resultater.`;
      const response=await fetch("/api/autofill",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,attempt:0})});
      const data=await response.json();
      const text=data.content?.[0]?.text||"";
      const parsed=JSON.parse(text.match(/\{[\s\S]*\}/)[0]);
      const cap=v=>String(Math.min(5,Math.max(0,parseInt(v)||0)));
      const allResults=[];
      if (parsed.matches) Object.entries(parsed.matches).forEach(([id,s])=>{ if(s?.home!==undefined) allResults.push({id,home:cap(s.home),away:cap(s.away)}); });
      if (parsed.knockout) Object.entries(parsed.knockout).forEach(([id,s])=>{ if(s?.home!==undefined) allResults.push({id,home:cap(s.home),away:cap(s.away)}); });
      await sb.upsert("results",allResults);
      const newMap={};
      allResults.forEach(r=>{newMap[r.id]={home:r.home,away:r.away};});
      setResults(r=>({...r,...newMap}));
      await reload();
      alert(`✅ ${allResults.length} resultater lagret!`);
    } catch(e){ alert("Feil: "+e.message); }
    finally{ setAdminFilling(false); }
  };

  return (
    <div style={{maxWidth:740,margin:"0 auto"}}>
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
        {[["matches","⚽ Kamper"],["knockout","🏆 Sluttspill"],["bonus","🎯 Bonus"],["stats","📊 Statistikk"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{padding:"8px 14px",borderRadius:9,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700,
            background:tab===id?`linear-gradient(135deg,${T.teal},#1a5a4a)`:"rgba(255,255,255,0.06)",
            color:tab===id?"#fff":"rgba(255,255,255,0.45)"}}>
            {label}
          </button>
        ))}
        <button onClick={reload} style={{padding:"8px 14px",borderRadius:9,cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700,border:"1px solid rgba(255,255,255,0.09)",background:"rgba(255,255,255,0.04)",color:"rgba(255,255,255,0.45)"}}>🔄</button>
        <button onClick={doAdminAutoFill} disabled={adminFilling} style={{padding:"8px 14px",borderRadius:9,cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700,border:"1px solid rgba(240,192,90,0.3)",background:"rgba(240,192,90,0.1)",color:T.gold,opacity:adminFilling?0.5:1}}>
          {adminFilling?"⚽ Simulerer...":"🎲 Simuler resultater"}
        </button>
      </div>

      <div style={cardCss}>
        {tab==="matches"&&(
          <>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
              {Object.keys(GROUPS).map(g=>{
                const done=GROUP_MATCHES.filter(m=>m.group===g&&results[m.id]?.home!==undefined&&results[m.id]?.home!=="").length===6;
                return <button key={g} onClick={()=>setCurrentGroup(g)} style={{padding:"5px 10px",borderRadius:7,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700,
                  background:currentGroup===g?`linear-gradient(135deg,${T.teal},#1a5a4a)`:done?"rgba(126,200,160,0.15)":"rgba(255,255,255,0.06)",
                  color:currentGroup===g?"#fff":done?T.mint:"rgba(255,255,255,0.5)"}}>
                  {done?"✓ ":""}{g}
                </button>;
              })}
            </div>
            <GroupBanner group={currentGroup}/>
            {(()=>{
              const done=GROUP_MATCHES.filter(m=>m.group===currentGroup&&results[m.id]?.home!==undefined&&results[m.id]?.home!=="").length===6;
              if (!done) return null;
              const standings=computeGroupStandings(currentGroup,results);
              return <div style={{margin:"8px 0",padding:"8px 12px",background:"rgba(42,122,106,0.1)",border:"1px solid rgba(42,122,106,0.2)",borderRadius:8}}>
                <div style={{fontSize:11,color:T.mint,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Endelig plassering</div>
                {standings.map((team,i)=>(
                  <div key={team} style={{display:"flex",alignItems:"center",gap:8,fontSize:13,padding:"2px 0",color:i<3?"rgba(255,255,255,0.8)":"rgba(255,255,255,0.4)"}}>
                    <FlagImg team={team} size={16}/>
                    <span style={{fontWeight:i<3?700:400,flex:1}}>{i+1}. {team}</span>
                    {i<3&&<span style={{color:T.mint,fontSize:11}}>{["videre","videre","beste taper"][i]}</span>}
                  </div>
                ))}
              </div>;
            })()}
            <div style={{maxHeight:"52vh",overflowY:"auto",paddingRight:4}}>
              {GROUP_MATCHES.filter(m=>m.group===currentGroup).map(m=>{
                const r=results[m.id]||{};
                return <div key={m.id} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 2px",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                  <span style={{fontSize:12,color:"rgba(255,255,255,0.45)",flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4}}>
                    <FlagImg team={m.home} size={14}/> {m.home} – {m.away} <FlagImg team={m.away} size={14}/>
                  </span>
                  <ScoreInput val={r.home??""} onChange={v=>saveResult(m.id,"home",v)}/>
                  <span style={{color:"rgba(255,255,255,0.25)"}}>–</span>
                  <ScoreInput val={r.away??""} onChange={v=>saveResult(m.id,"away",v)}/>
                  {saving[m.id]&&<span style={{fontSize:11,color:T.mint,width:14}}>✓</span>}
                </div>;
              })}
            </div>
          </>
        )}

        {tab==="knockout"&&(
          <div style={{maxHeight:"64vh",overflowY:"auto",paddingRight:4}}>
            {(()=>{let lp=null; return KNOCKOUT_SLOTS.map(slot=>{
              const show=slot.phase!==lp; if(show) lp=slot.phase;
              const r=results[slot.id]||{};
              return <div key={slot.id}>
                {show&&<PhaseHeader phase={slot.phase}/>}
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"5px 2px",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                  <span style={{fontSize:12,color:"rgba(255,255,255,0.45)",flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {slot.label}: {slot.home} vs {slot.away}
                  </span>
                  <ScoreInput val={r.home??""} onChange={v=>saveResult(slot.id,"home",v)}/>
                  <span style={{color:"rgba(255,255,255,0.25)"}}>–</span>
                  <ScoreInput val={r.away??""} onChange={v=>saveResult(slot.id,"away",v)}/>
                  {saving[slot.id]&&<span style={{fontSize:11,color:T.mint,width:14}}>✓</span>}
                </div>
              </div>;
            });})()}
          </div>
        )}

        {tab==="bonus"&&<BonusAdminPanel participants={participants} bonusResults={bonusResults} saveBonusResult={saveBonusResult}/>}

        {tab==="stats"&&(()=>{
          const ranked=[...participants].map(p=>({...p,total:calcTotal(p,results,bonusResults)})).sort((a,b)=>b.total-a.total);
          const played=GROUP_MATCHES.filter(m=>results[m.id]?.home!==undefined&&results[m.id]?.home!=="").length;
          const medals=["🥇","🥈","🥉"];
          const pg=["rgba(240,192,90,0.15)","rgba(192,192,192,0.1)","rgba(205,127,50,0.12)"];
          const pb=["rgba(240,192,90,0.35)","rgba(192,192,192,0.25)","rgba(205,127,50,0.25)"];
          const pc=["#f0c05a","#c0c0c0","#cd7f32"];
          const exportExcel=()=>{
            const rows=[["Plass","Navn","Poeng","Gruppekamper tippet"]];
            ranked.forEach((p,i)=>{ const gt=GROUP_MATCHES.filter(m=>p.tips?.[m.id]?.home!==undefined&&p.tips[m.id].home!=="").length; rows.push([i+1,p.name,p.total,gt]); });
            const blob=new Blob(["\uFEFF"+rows.map(r=>r.join("\t")).join("\n")],{type:"text/tab-separated-values;charset=utf-8"});
            const url=URL.createObjectURL(blob);
            const a=document.createElement("a"); a.href=url; a.download="VM2026_Ledertavle.tsv"; a.click(); URL.revokeObjectURL(url);
          };
          return <div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
              {[["Deltakere",participants.length],[`Gruppekamper`,`${played}/${GROUP_MATCHES.length}`],[`Sluttspill`,`${KNOCKOUT_SLOTS.filter(s=>results[s.id]?.home!==undefined&&results[s.id]?.home!=="").length}/${KNOCKOUT_SLOTS.length}`],["Bonus",Object.keys(bonusResults).length]].map(([l,v])=>(
                <div key={l} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10,padding:"12px 14px"}}>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>{l}</div>
                  <div style={{fontSize:22,fontWeight:800,color:"#fff"}}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>Ledertavle (kun admin)</div>
              <button onClick={exportExcel} style={{padding:"7px 14px",borderRadius:8,border:"1px solid rgba(126,200,160,0.3)",background:"rgba(126,200,160,0.1)",color:T.mint,cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700}}>Eksporter til Excel</button>
            </div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",marginBottom:10}}>{played} av {GROUP_MATCHES.length} gruppekamper spilt</div>
            <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:"50vh",overflowY:"auto"}}>
              {ranked.map((p,i)=>(
                <div key={p.name} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:10,background:i<3?pg[i]:"rgba(255,255,255,0.03)",border:`1px solid ${i<3?pb[i]:"rgba(255,255,255,0.06)"}`}}>
                  <span style={{fontSize:i<3?22:15,width:28,textAlign:"center",flexShrink:0}}>{i<3?medals[i]:`${i+1}.`}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:15,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",marginTop:1}}>{GROUP_MATCHES.filter(m=>p.tips?.[m.id]?.home!==undefined&&p.tips[m.id].home!=="").length}/{GROUP_MATCHES.length} kamper</div>
                  </div>
                  <div style={{fontSize:20,fontWeight:800,color:i<3?pc[i]:"rgba(255,255,255,0.65)",flexShrink:0}}>{p.total}p</div>
                </div>
              ))}
            </div>
          </div>;
        })()}
      </div>
    </div>
  );
}

// ── APP ROOT ──────────────────────────────────────────────────────────────────
export default function App() {
  const [session,setSession]=useState(()=>{ try{const s=sessionStorage.getItem("vm_session");return s?JSON.parse(s):null;}catch{return null;} });
  const loggedIn=!!session;
  const login=(user)=>{ setSession(user); try{sessionStorage.setItem("vm_session",JSON.stringify(user));}catch{}; setView("mytips"); };
  const logout=()=>{ setSession(null); try{sessionStorage.removeItem("vm_session");}catch{}; setView("register"); };
  const [view,setView]=useState(()=>session?"mytips":"register");
  const [participants,setParticipants]=useState([]);
  const [results,setResults]=useState({});
  const [bonusResults,setBonusResults]=useState({});
  const [loading,setLoading]=useState(true);
  const [dbError,setDbError]=useState(false);

  const loadData=useCallback(async()=>{
    try {
      const [parts,res,bonus]=await Promise.all([sb.getAll("participants"),sb.getAll("results"),sb.getAll("bonus_results")]);
      setParticipants(parts.map(p=>({...p,tips:p.tips||{},bonus:p.bonus||{}})));
      const resMap={};
      res.forEach(r=>{
        if (r.id.startsWith("rank_")) return;
        if (r.id.startsWith("override_")) { try{setGroupOverride(r.id.replace("override_",""),JSON.parse(r.home));}catch{} return; }
        resMap[r.id]={home:r.home,away:r.away};
      });
      setResults(resMap);
      setBonusResults(Object.fromEntries(bonus.map(b=>{ let approved=[]; try{if(b.approved)approved=JSON.parse(b.approved);}catch{} return[b.id,{answer:b.answer,approved}]; })));
      setDbError(false);
    } catch(e){ console.error(e); setDbError(true); }
    finally{ setLoading(false); }
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
        {!loading&&!dbError&&<div style={{background:"rgba(240,192,90,0.1)",border:"1px solid rgba(240,192,90,0.22)",borderRadius:20,padding:"4px 14px",fontSize:12,color:T.gold,fontWeight:700}}>{participants.length} deltakere</div>}
        {dbError&&<div style={{background:"rgba(180,40,40,0.18)",border:"1px solid rgba(200,60,60,0.3)",borderRadius:20,padding:"4px 14px",fontSize:12,color:"#f08080",fontWeight:700}}>⚠️ DB-feil</div>}
      </div>

      {/* Nav */}
      <div style={{position:"relative",zIndex:1,display:"flex",justifyContent:"center",gap:4,padding:"14px 12px 0",flexWrap:"wrap"}}>
        {[
          !loggedIn&&{id:"register",label:"📋 Registrer / Logg inn"},
          loggedIn&&{id:"mytips",   label:"📄 Mine tips"},
          {id:"rules",label:"📖 Regler"},
          {id:"admin",label:"⚙️ Admin"},
        ].filter(Boolean).map(n=>(
          <button key={n.id} onClick={()=>setView(n.id)} style={{padding:"9px 16px",borderRadius:10,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,transition:"all 0.16s",
            background:view===n.id?`linear-gradient(135deg,${T.teal},#1a5a4a)`:"rgba(255,255,255,0.06)",
            color:view===n.id?"#fff":"rgba(255,255,255,0.45)",
            boxShadow:view===n.id?"0 2px 14px rgba(42,122,106,0.45)":"none"}}>{n.label}</button>
        ))}
        {loggedIn&&<button onClick={logout} style={{padding:"9px 16px",borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,background:"rgba(255,255,255,0.04)",color:"rgba(255,255,255,0.4)"}}>Logg ut</button>}
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
            <p style={{color:T.muted}}>Sjekk SUPABASE_URL og SUPABASE_ANON_KEY</p>
          </div>
        ):(
          <>
            {view==="register"&&<RegisterView onLogin={login} externalResults={results} session={session}/>}
            {view==="mytips"&&loggedIn&&<MyTipsView session={session} participants={participants} results={results} bonusResults={bonusResults} onEditTips={()=>setView("register")}/>}
            {view==="mytips"&&!loggedIn&&<div style={{...cardCss,textAlign:"center"}}><p style={{color:T.muted}}>Logg inn for å se dine tips.</p><Btn onClick={()=>setView("register")}>Logg inn</Btn></div>}
            {view==="rules"&&<RulesView/>}
            {view==="admin"&&<AdminView results={results} setResults={setResults} bonusResults={bonusResults} setBonusResults={setBonusResults} participants={participants} reload={loadData}/>}
          </>
        )}
      </div>
    </div>
  );
}
