import { useState, useEffect, useMemo, useCallback } from "react";

const SUPABASE_URL = "https://cnauqnqntbywsjoyuvur.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYXVxbnFudGJ5d3Nqb3l1dnVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMDc5NTEsImV4cCI6MjA5NDc4Mzk1MX0.IPxbGJIFhoc_CMJXsbxPMqHc9oPDEQxYXib4ogg2nvM";
const ADMIN_PIN = "vm2026";
const DEADLINE = new Date("2026-06-11T18:00:00Z");

async function hashPin(pin) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pin + "vm2026salt"));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("").slice(0,16);
}

// ── DATA ─────────────────────────────────────────────────────────────────────
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

const FLAG_CODE={
  "Mexico":"mx","Sor-Korea":"kr","Sor-Afrika":"za","Tsjekkia":"cz",
  "Canada":"ca","Sveits":"ch","Qatar":"qa","Bosnia-Hercegovina":"ba",
  "Brasil":"br","Marokko":"ma","Skottland":"gb-sct","Haiti":"ht",
  "USA":"us","Australia":"au","Paraguay":"py","Tyrkia":"tr",
  "Tyskland":"de","Ecuador":"ec","Elfenbenskysten":"ci","Curasao":"cw",
  "Nederland":"nl","Japan":"jp","Tunisia":"tn","Sverige":"se",
  "Belgia":"be","Iran":"ir","Egypt":"eg","New Zealand":"nz",
  "Spania":"es","Uruguay":"uy","Saudi-Arabia":"sa","Kapp Verde":"cv",
  "Frankrike":"fr","Senegal":"sn","Norge":"no","Irak":"iq",
  "Argentina":"ar","Osterrike":"at","Algerie":"dz","Jordan":"jo",
  "Portugal":"pt","Colombia":"co","Usbekistan":"uz","DR Kongo":"cd",
  "England":"gb-eng","Kroatia":"hr","Panama":"pa","Ghana":"gh",
};

function getFlagCode(team) {
  if (!team) return null;
  // direct lookup
  if (FLAG_CODE[team]) return FLAG_CODE[team];
  // normalize: remove special chars for lookup
  const norm = team.replace(/[ø]/g,"o").replace(/[Ø]/g,"O").replace(/[æ]/g,"ae").replace(/[å]/g,"a").replace(/[ç]/g,"c");
  return FLAG_CODE[norm] || null;
}

function FlagImg({team, size=20}) {
  const code = getFlagCode(team);
  if (!code) return <span style={{fontSize:size*0.85,lineHeight:1,display:"inline-block",verticalAlign:"middle"}}>🏳️</span>;
  return (
    <img
      src={`https://flagcdn.com/w${size*2}/${code}.png`}
      alt={team}
      width={size}
      height={Math.round(size*0.67)}
      style={{objectFit:"cover",borderRadius:2,verticalAlign:"middle",display:"inline-block",flexShrink:0}}
      onError={e=>{e.target.style.display="none";}}
    />
  );
}
const f = () => null;

// All 6 matches per group (round robin)
function generateGroupMatches() {
  const matches=[];
  let id=1;
  Object.entries(GROUPS).forEach(([g,teams])=>{
    const pairs=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
    pairs.forEach(([a,b])=>{
      matches.push({id:`g${id++}`,group:g,home:teams[a],away:teams[b],phase:"group"});
    });
  });
  return matches;
}
const GROUP_MATCHES=generateGroupMatches(); // 72 matches

// Knockout — 16 slots in R32, filled dynamically from group tips
const KNOCKOUT_SLOTS=[
  // R32 - 16 matches (winners/runners determined by FIFA bracket)
  {id:"r32_1",phase:"R32",label:"16-delsfinale 1",slot1:"1A",slot2:"2C"},
  {id:"r32_2",phase:"R32",label:"16-delsfinale 2",slot1:"1B",slot2:"2D"},
  {id:"r32_3",phase:"R32",label:"16-delsfinale 3",slot1:"1C",slot2:"2A"},
  {id:"r32_4",phase:"R32",label:"16-delsfinale 4",slot1:"1D",slot2:"2B"},
  {id:"r32_5",phase:"R32",label:"16-delsfinale 5",slot1:"1E",slot2:"2G"},
  {id:"r32_6",phase:"R32",label:"16-delsfinale 6",slot1:"1F",slot2:"2H"},
  {id:"r32_7",phase:"R32",label:"16-delsfinale 7",slot1:"1G",slot2:"2E"},
  {id:"r32_8",phase:"R32",label:"16-delsfinale 8",slot1:"1H",slot2:"2F"},
  {id:"r32_9",phase:"R32",label:"16-delsfinale 9",slot1:"1I",slot2:"2K"},
  {id:"r32_10",phase:"R32",label:"16-delsfinale 10",slot1:"1J",slot2:"2L"},
  {id:"r32_11",phase:"R32",label:"16-delsfinale 11",slot1:"1K",slot2:"2I"},
  {id:"r32_12",phase:"R32",label:"16-delsfinale 12",slot1:"1L",slot2:"2J"},
  {id:"r32_13",phase:"R32",label:"16-delsfinale 13",slot1:"3ABC",slot2:"3DEF"},
  {id:"r32_14",phase:"R32",label:"16-delsfinale 14",slot1:"3GHI",slot2:"3JKL"},
  {id:"r32_15",phase:"R32",label:"16-delsfinale 15",slot1:"3EFG",slot2:"3HIJ"},
  {id:"r32_16",phase:"R32",label:"16-delsfinale 16",slot1:"3BCD",slot2:"3AKL"},
  // R16
  ...Array.from({length:8},(_,i)=>({id:`r16_${i+1}`,phase:"R16",label:`Åttendelsfinale ${i+1}`,slot1:`V_r32_${i*2+1}`,slot2:`V_r32_${i*2+2}`})),
  // QF
  ...Array.from({length:4},(_,i)=>({id:`qf${i+1}`,phase:"QF",label:`Kvartfinale ${i+1}`,slot1:`V_r16_${i*2+1}`,slot2:`V_r16_${i*2+2}`})),
  {id:"sf1",phase:"SF",label:"Semifinale 1",slot1:"V_qf1",slot2:"V_qf2"},
  {id:"sf2",phase:"SF",label:"Semifinale 2",slot1:"V_qf3",slot2:"V_qf4"},
  {id:"3p",phase:"3P",label:"Bronsefinale",slot1:"T_sf1",slot2:"T_sf2"},
  {id:"f",phase:"F",label:"⭐ FINALE",slot1:"V_sf1",slot2:"V_sf2"},
];

const BONUS_QUESTIONS=[
  {id:"b1",text:"Hvem vinner VM?",icon:"🏆",type:"text",points:10},
  {id:"b2",text:"Hvem blir toppscorer?",icon:"⚽",type:"text",points:8},
  {id:"b3",text:"Antall røde kort totalt i turneringen?",icon:"🟥",type:"number",points:6},
  {id:"b4",text:"Antall mål totalt i turneringen?",icon:"📊",type:"number",points:6},
  {id:"b5",text:"Antall mål Norge scorer totalt?",icon:"🇳🇴",type:"number",points:5},
];

// Points config
const PTS={
  group:{exact:3,outcome:1},
  R32:{exact:3,outcome:1,advance:2},
  R16:{exact:4,outcome:2,advance:3},
  QF:{exact:5,outcome:2,advance:4},
  SF:{exact:6,outcome:3,advance:5},
  "3P":{exact:4,outcome:2,advance:0},
  F:{exact:8,outcome:4,advance:8},
  groupRank:{first:4,second:3,third:2},
};

// ── SUPABASE ──────────────────────────────────────────────────────────────────
const sb={
  async query(table,method="GET",body=null,filter=""){
    const res=await fetch(`${SUPABASE_URL}/rest/v1/${table}${filter}`,{
      method,headers:{
        "Content-Type":"application/json",
        "apikey":SUPABASE_ANON_KEY,
        "Authorization":`Bearer ${SUPABASE_ANON_KEY}`,
        "Prefer":method==="POST"?"return=representation,resolution=merge-duplicates":"return=representation"
      },body:body?JSON.stringify(body):null
    });
    if(!res.ok) throw new Error(await res.text());
    return res.status===204?[]:res.json();
  },
  getAll:t=>sb.query(t,"GET",null,"?select=*"),
  upsert:(t,b)=>sb.query(t,"POST",b,"?on_conflict=id"),
  upsertByName:(t,b)=>sb.query(t,"POST",b,"?on_conflict=name"),
};

// ── SCORING ───────────────────────────────────────────────────────────────────
function matchOutcome(h,a){
  if(h>a) return "H"; if(a>h) return "A"; return "D";
}
function scoreGroupMatch(tip,result){
  if(!tip||!result||tip.home===""||tip.away===""||result.home===""||result.away==="") return null;
  const[th,ta,rh,ra]=[tip.home,tip.away,result.home,result.away].map(Number);
  if([th,ta,rh,ra].some(isNaN)) return null;
  if(th===rh&&ta===ra) return PTS.group.exact;
  if(matchOutcome(th,ta)===matchOutcome(rh,ra)) return PTS.group.outcome;
  return 0;
}
function scoreKnockout(tip,result,phase){
  if(!tip||!result||tip.home===""||tip.away===""||result.home===""||result.away==="") return null;
  const[th,ta,rh,ra]=[tip.home,tip.away,result.home,result.away].map(Number);
  if([th,ta,rh,ra].some(isNaN)) return null;
  const cfg=PTS[phase]||PTS.R32;
  if(th===rh&&ta===ra) return cfg.exact;
  if(matchOutcome(th,ta)===matchOutcome(rh,ra)) return cfg.outcome;
  return 0;
}

// Compute group standings from tips
function computeGroupStandings(groupId,tips){
  const teams=GROUPS[groupId];
  const stats=Object.fromEntries(teams.map(t=>[t,{pts:0,gd:0,gf:0}]));
  GROUP_MATCHES.filter(m=>m.group===groupId).forEach(m=>{
    const tip=tips[m.id];
    if(!tip||tip.home===""||tip.away==="") return;
    const h=parseInt(tip.home),a=parseInt(tip.away);
    if(isNaN(h)||isNaN(a)) return;
    if(h>a){stats[m.home].pts+=3;}
    else if(a>h){stats[m.away].pts+=3;}
    else{stats[m.home].pts+=1;stats[m.away].pts+=1;}
    stats[m.home].gf+=h;stats[m.home].gd+=(h-a);
    stats[m.away].gf+=a;stats[m.away].gd+=(a-h);
  });
  return teams.slice().sort((a,b)=>
    stats[b].pts-stats[a].pts||stats[b].gd-stats[a].gd||stats[b].gf-stats[a].gf
  );
}

// Resolve a slot code to a team name from tips
function resolveSlot(slot,tips){
  // "1A" = group A winner, "2B" = group B runner-up, "3ABC" = best 3rd among A,B,C
  if(!slot) return null;
  const rankMatch=slot.match(/^([123])([A-L])$/);
  if(rankMatch){
    const rank=parseInt(rankMatch[1])-1;
    const group=rankMatch[2];
    // Check if user has tipped a ranking
    const rankKey=`rank_${group}`;
    if(tips[rankKey]&&tips[rankKey][rank]) return tips[rankKey][rank];
    // Fallback: compute from match tips
    const standings=computeGroupStandings(group,tips);
    return standings[rank]||null;
  }
  // Winner/loser of a previous match
  const winMatch=slot.match(/^V_(.+)$/);
  if(winMatch){
    const matchId=winMatch[1];
    const tip=tips[matchId];
    if(!tip||tip.home===""||tip.away==="") return null;
    const h=parseInt(tip.home),a=parseInt(tip.away);
    if(isNaN(h)||isNaN(a)) return null;
    const matchSlot=KNOCKOUT_SLOTS.find(s=>s.id===matchId);
    if(!matchSlot) return null;
    const home=resolveSlot(matchSlot.slot1,tips);
    const away=resolveSlot(matchSlot.slot2,tips);
    if(h>a) return home; if(a>h) return away; return home; // default home on draw
  }
  const loseMatch=slot.match(/^T_(.+)$/);
  if(loseMatch){
    const matchId=loseMatch[1];
    const tip=tips[matchId];
    if(!tip||tip.home===""||tip.away==="") return null;
    const h=parseInt(tip.home),a=parseInt(tip.away);
    if(isNaN(h)||isNaN(a)) return null;
    const matchSlot=KNOCKOUT_SLOTS.find(s=>s.id===matchId);
    if(!matchSlot) return null;
    const home=resolveSlot(matchSlot.slot1,tips);
    const away=resolveSlot(matchSlot.slot2,tips);
    if(h<a) return home; if(a<h) return away; return away;
  }
  return slot;
}

function calcTotal(p,results,bonusResults){
  let pts=0;
  // Group matches
  GROUP_MATCHES.forEach(m=>{
    const s=scoreGroupMatch(p.tips?.[m.id],results[m.id]);
    if(s!==null) pts+=s;
  });
  // Group rankings
  Object.keys(GROUPS).forEach(g=>{
    const tipRank=p.tips?.[`rank_${g}`]||[];
    const resRank=results[`rank_${g}`]||[];
    if(resRank.length>0){
      if(tipRank[0]&&tipRank[0]===resRank[0]) pts+=PTS.groupRank.first;
      if(tipRank[1]&&tipRank[1]===resRank[1]) pts+=PTS.groupRank.second;
      if(tipRank[2]&&tipRank[2]===resRank[2]) pts+=PTS.groupRank.third;
    }
  });
  // Knockout
  KNOCKOUT_SLOTS.forEach(slot=>{
    const tip=p.tips?.[slot.id];
    const res=results[slot.id];
    const s=scoreKnockout(tip,res,slot.phase);
    if(s!==null) pts+=s;
    // Points for correct team advancing
    const cfg=PTS[slot.phase];
    if(cfg&&cfg.advance>0&&res&&res.winner&&tip){
      const th=parseInt(tip.home),ta=parseInt(tip.away);
      const tipWinner=th>ta?resolveSlot(slot.slot1,p.tips||{}):ta>th?resolveSlot(slot.slot2,p.tips||{}):null;
      if(tipWinner&&tipWinner===res.winner) pts+=cfg.advance;
    }
  });
  // Bonus
  BONUS_QUESTIONS.forEach(q=>{
    const tip=p.bonus?.[q.id];
    const ans=bonusResults[q.id]?.answer;
    if(tip&&ans&&tip.toString().trim().toLowerCase()===ans.toString().trim().toLowerCase())
      pts+=q.points;
  });
  return pts;
}

// ── DESIGN ────────────────────────────────────────────────────────────────────
const T={teal:"#2a7a6a",mint:"#7ec8a0",gold:"#f0c05a",muted:"rgba(255,255,255,0.45)"};
const inputCss={display:"block",width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,color:"#fff",fontSize:15,padding:"12px 16px",fontFamily:"inherit",marginBottom:14,outline:"none"};
const labelCss={display:"block",fontSize:11,fontWeight:700,letterSpacing:1.5,color:T.mint,textTransform:"uppercase",marginBottom:6};
const cardCss={background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:"20px 22px",maxWidth:740,margin:"0 auto"};

function Btn({children,onClick,disabled,ghost,sm,full}){
  return(
    <button onClick={onClick} disabled={disabled} style={{
      padding:sm?"7px 14px":"11px 22px",borderRadius:9,width:full?"100%":"auto",
      border:ghost?"1px solid rgba(255,255,255,0.14)":"none",
      cursor:disabled?"not-allowed":"pointer",fontFamily:"inherit",
      fontSize:sm?12:14,fontWeight:700,
      background:ghost?"rgba(255,255,255,0.05)":`linear-gradient(135deg,${T.teal},#1a5a4a)`,
      color:"#fff",opacity:disabled?0.4:1,transition:"all 0.18s",
      boxShadow:ghost||disabled?"none":"0 2px 12px rgba(42,122,106,0.4)",
    }}>{children}</button>
  );
}

function ScoreInput({val,onChange,disabled}){
  return(
    <input type="number" min="0" max="30" value={val??""} onChange={e=>onChange(e.target.value)}
      disabled={disabled} style={{width:40,height:36,textAlign:"center",background:disabled?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.14)",borderRadius:8,color:"#fff",fontSize:16,fontFamily:"inherit",outline:"none",opacity:disabled?0.5:1}}/>
  );
}

function GroupBanner({group}){
  return(
    <div style={{margin:"18px 0 4px",padding:"8px 12px",background:"rgba(42,122,106,0.1)",border:"1px solid rgba(42,122,106,0.2)",borderRadius:10,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
      <span style={{fontSize:11,fontWeight:800,letterSpacing:2,color:T.mint,textTransform:"uppercase"}}>Gruppe {group}</span>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {GROUPS[group].map(t=>(
          <span key={t} style={{fontSize:13,color:"rgba(255,255,255,0.65)"}}>{<FlagImg team={t}/>} {t}</span>
        ))}
      </div>
    </div>
  );
}

function PhaseHeader({phase}){
  const labels={R32:"16-delsfinaler",R16:"Åttendelsfinaler",QF:"Kvartfinaler",SF:"Semifinaler","3P":"Bronsefinale",F:"⭐ FINALE"};
  return(
    <div style={{margin:"24px 0 6px",padding:"6px 12px",background:"rgba(240,192,90,0.08)",border:"1px solid rgba(240,192,90,0.18)",borderRadius:8,fontSize:11,fontWeight:800,letterSpacing:2,color:T.gold,textTransform:"uppercase"}}>
      {labels[phase]??phase}
    </div>
  );
}

function MatchRow({match,tip,onChange,readOnly,result,phase}){
  const pts=result?.home!==undefined&&result?.away!==undefined
    ?(phase==="group"?scoreGroupMatch(tip,result):scoreKnockout(tip,result,phase)):null;
  return(
    <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,alignItems:"center",padding:"7px 2px",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
      <div style={{textAlign:"right",fontSize:13,color:"rgba(255,255,255,0.85)"}}>
        <span style={{marginRight:4}}>{<FlagImg team={match.home}/>}</span><strong>{match.home}</strong>
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
            background:pts>0?"rgba(126,200,160,0.12)":"rgba(255,255,255,0.04)",
            color:pts===PTS.group?.exact||pts===PTS[phase]?.exact?T.gold:pts>0?T.mint:"#555"}}>
            {pts}p
          </div>
        )}
      </div>
      <div style={{fontSize:13,color:"rgba(255,255,255,0.85)"}}>
        <strong>{match.away}</strong><span style={{marginLeft:4}}>{<FlagImg team={match.away}/>}</span>
      </div>
    </div>
  );
}

function DeadlineBanner(){
  const[now,setNow]=useState(new Date());
  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(t);},[]);
  const diff=DEADLINE-now;
  if(diff<=0) return(
    <div style={{background:"rgba(180,40,40,0.18)",border:"1px solid rgba(200,60,60,0.3)",borderRadius:12,padding:"12px 18px",marginBottom:16,textAlign:"center"}}>
      <span style={{color:"#f08080",fontWeight:700}}>🔒 Tipping stengt — VM er i gang!</span>
    </div>
  );
  const parts=[[Math.floor(diff/86400000),"dager"],[Math.floor((diff%86400000)/3600000),"timer"],[Math.floor((diff%3600000)/60000),"min"],[Math.floor((diff%60000)/1000),"sek"]];
  return(
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

// ── GROUP RANKING COMPONENT ───────────────────────────────────────────────────
function GroupRankingPicker({group,tips,setTip}){
  const rankKey=`rank_${group}`;
  const currentRank=tips[rankKey]||[];
  // Auto-compute from match tips
  const computed=computeGroupStandings(group,tips);
  const teams=GROUPS[group];

  const setRank=(pos,team)=>{
    const newRank=[...currentRank];
    // Remove team from current position if exists
    const existing=newRank.indexOf(team);
    if(existing!==-1) newRank[existing]=null;
    // Remove whoever was in this position
    newRank[pos]=team;
    setTip(rankKey,newRank);
  };

  return(
    <div style={{padding:"10px 0 14px"}}>
      <div style={{fontSize:11,color:T.mint,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>
        Tippe gruppeplassering — Gruppe {group}
        <span style={{color:"rgba(255,255,255,0.3)",fontWeight:400,marginLeft:8,letterSpacing:0}}>
          (4p/3p/2p for riktig 1./2./3.)
        </span>
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
        {[0,1,2].map(pos=>{
          const posLabels=["1. plass","2. plass","3. plass (beste taper)"];
          const selected=currentRank[pos];
          return(
            <div key={pos} style={{flex:"1 1 180px"}}>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginBottom:4,letterSpacing:1}}>{posLabels[pos]}</div>
              <select value={selected||""} onChange={e=>setRank(pos,e.target.value||null)}
                style={{width:"100%",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,color:selected?"#fff":"rgba(255,255,255,0.35)",fontSize:13,padding:"8px 10px",fontFamily:"inherit",outline:"none"}}>
                <option value="">Velg lag...</option>
                {teams.map(t=>(
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
      <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",fontStyle:"italic"}}>
        Foreslått fra dine kamptips: {computed.map((t,i)=><span key={i} style={{marginRight:4}}><FlagImg team={t} size={14}/> {t}</span>)}
      </div>
    </div>
  );
}

// ── KNOCKOUT MATCH ROW ────────────────────────────────────────────────────────
function KnockoutMatchRow({slot,tips,setTip,results,readOnly}){
  const home=resolveSlot(slot.slot1,tips||{});
  const away=resolveSlot(slot.slot2,tips||{});
  const tip=tips?.[slot.id];
  const result=results?.[slot.id];
  const pts=result?.home!==undefined?scoreKnockout(tip,result,slot.phase):null;

  const homeName=home||slot.slot1;
  const awayName=away||slot.slot2;
  const hasTeams=home&&away;

  return(
    <div style={{
      display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,alignItems:"center",
      padding:"8px 4px",borderBottom:"1px solid rgba(255,255,255,0.04)",
      opacity:hasTeams?1:0.45,
    }}>
      <div style={{textAlign:"right",fontSize:13,color:"rgba(255,255,255,0.85)"}}>
        {home?<><span style={{marginRight:4}}>{<FlagImg team={home}/>}</span><strong>{home}</strong></>
          :<span style={{color:"rgba(255,255,255,0.3)",fontSize:12}}>{homeName}</span>}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:5}}>
        {readOnly?(
          <div style={{minWidth:58,textAlign:"center",fontSize:14,fontWeight:700,color:"rgba(255,255,255,0.55)"}}>
            {tip?.home??"–"}–{tip?.away??"–"}
          </div>
        ):(
          <>
            <ScoreInput val={tip?.home??""} disabled={!hasTeams}
              onChange={v=>setTip&&setTip(slot.id,{...tip,home:v})}/>
            <span style={{color:"rgba(255,255,255,0.25)"}}>–</span>
            <ScoreInput val={tip?.away??""} disabled={!hasTeams}
              onChange={v=>setTip&&setTip(slot.id,{...tip,away:v})}/>
          </>
        )}
        {pts!==null&&(
          <div style={{minWidth:30,textAlign:"center",padding:"3px 6px",borderRadius:6,fontSize:11,fontWeight:800,
            background:pts>0?"rgba(126,200,160,0.12)":"rgba(255,255,255,0.04)",
            color:pts>0?T.mint:"#555"}}>{pts}p</div>
        )}
      </div>
      <div style={{fontSize:13,color:"rgba(255,255,255,0.85)"}}>
        {away?<><strong>{away}</strong><span style={{marginLeft:4}}>{<FlagImg team={away}/>}</span></>
          :<span style={{color:"rgba(255,255,255,0.3)",fontSize:12}}>{awayName}</span>}
      </div>
    </div>
  );
}

// ── REGISTER / LOGIN ──────────────────────────────────────────────────────────
function RegisterView({onRegister}){
  const[mode,setMode]=useState("choose");
  const[name,setName]=useState(""),[pin,setPin]=useState(""),[pinConfirm,setPinConfirm]=useState("");
  const[tips,setTips]=useState({}),[bonus,setBonus]=useState({});
  const[step,setStep]=useState("group");
  const[currentGroup,setCurrentGroup]=useState("A");
  const[saving,setSaving]=useState(false),[autoSaving,setAutoSaving]=useState(false);
  const[error,setError]=useState(""),[currentUser,setCurrentUser]=useState(null);
  const locked=new Date()>=DEADLINE;

  const setTip=(id,val)=>setTips(t=>({...t,[id]:val}));

  useEffect(()=>{
    if(!currentUser) return;
    const timer=setTimeout(async()=>{
      setAutoSaving(true);
      try{await sb.upsert("participants",[{...currentUser,tips,bonus}]);}
      catch(e){console.error(e);}
      finally{setAutoSaving(false);}
    },1500);
    return()=>clearTimeout(timer);
  },[tips,bonus,currentUser]);

  const doRegister=async()=>{
    if(!name.trim()||pin.length<4||pin!==pinConfirm) return;
    setSaving(true);setError("");
    try{
      const ph=await hashPin(pin);
      const ex=await sb.query("participants","GET",null,`?name=eq.${encodeURIComponent(name.trim())}&select=name`);
      if(ex.length>0){setError("Navn allerede i bruk — logg inn i stedet.");setSaving(false);return;}
      const u={name:name.trim(),pin_hash:ph,tips:{},bonus:{}};
      await sb.upsert("participants",[u]);
      setCurrentUser(u);setTips({});setBonus({});onRegister();setMode("editing");
    }catch(e){setError("Feil: "+e.message);}
    finally{setSaving(false);}
  };

  const doLogin=async()=>{
    if(!name.trim()||!pin) return;
    setSaving(true);setError("");
    try{
      const ph=await hashPin(pin);
      const res=await sb.query("participants","GET",null,`?name=eq.${encodeURIComponent(name.trim())}&select=*`);
      if(res.length===0){setError("Bruker ikke funnet.");setSaving(false);return;}
      if(res[0].pin_hash!==ph){setError("Feil PIN-kode.");setSaving(false);return;}
      const u=res[0];
      setCurrentUser(u);setTips(u.tips||{});setBonus(u.bonus||{});onRegister();setMode("editing");
    }catch(e){setError("Feil: "+e.message);}
    finally{setSaving(false);}
  };

  const doSubmit=async()=>{
    setSaving(true);
    try{await sb.upsert("participants",[{...currentUser,tips,bonus}]);setMode("done");onRegister();}
    catch(e){setError("Feil: "+e.message);}
    finally{setSaving(false);}
  };

  if(locked&&mode!=="done"&&mode!=="editing") return(
    <div style={{...cardCss,textAlign:"center",padding:"48px 24px"}}>
      <div style={{fontSize:48,marginBottom:12}}>🔒</div>
      <h2 style={{color:"#fff",margin:"0 0 8px"}}>Tipping er stengt</h2>
      <p style={{color:T.muted}}>VM startet 11. juni.</p>
    </div>
  );

  if(mode==="choose") return(
    <div style={cardCss}>
      <DeadlineBanner/>
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{fontSize:52,marginBottom:8}}>⚽</div>
        <h2 style={{color:"#fff",margin:"0 0 4px",fontSize:22}}>VM 2026 Tipping</h2>
        <p style={{color:T.muted,margin:0,fontSize:13}}>Vinmonopolet Økonomi</p>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {[
          {m:"login",icon:"🔑",title:"Logg inn",sub:"Jeg har deltatt før — fortsett der jeg slapp"},
          {m:"register",icon:"✨",title:"Registrer meg",sub:"Opprett bruker med navn og PIN-kode"},
        ].map(({m,icon,title,sub})=>(
          <button key={m} onClick={()=>setMode(m)} style={{
            padding:"16px 20px",borderRadius:12,cursor:"pointer",fontFamily:"inherit",textAlign:"left",
            background:m==="login"?"rgba(42,122,106,0.18)":"rgba(255,255,255,0.04)",
            border:`1px solid ${m==="login"?"rgba(42,122,106,0.35)":"rgba(255,255,255,0.09)"}`,
            color:"#fff",transition:"all 0.18s",
          }}>
            <div style={{fontSize:15,fontWeight:700,marginBottom:2}}>{icon} {title}</div>
            <div style={{fontSize:12,color:T.muted}}>{sub}</div>
          </button>
        ))}
      </div>
    </div>
  );

  if(mode==="login") return(
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

  if(mode==="register") return(
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

  if(mode==="editing"){
    const groupKeys=Object.keys(GROUPS);
    const allGroups=groupKeys;
    const filledGroup=GROUP_MATCHES.filter(m=>tips[m.id]?.home!==undefined&&tips[m.id]?.home!=="").length;
    const filledKO=KNOCKOUT_SLOTS.filter(s=>tips[s.id]?.home!==undefined&&tips[s.id]?.home!=="").length;
    const total=GROUP_MATCHES.length+KNOCKOUT_SLOTS.length;
    const filled=filledGroup+filledKO;
    const pct=Math.round((filled/total)*100);

    const groupMatches=GROUP_MATCHES.filter(m=>m.group===currentGroup);

    return(
      <div style={{maxWidth:740,margin:"0 auto"}}>
        {/* User bar */}
        <div style={{background:"rgba(42,122,106,0.12)",border:"1px solid rgba(42,122,106,0.22)",borderRadius:12,padding:"12px 16px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
          <div>
            <div style={{fontWeight:700,fontSize:16,color:"#fff"}}>{currentUser?.name}</div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginTop:5}}>
              <div style={{height:4,width:140,background:"rgba(255,255,255,0.1)",borderRadius:4,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${pct}%`,background:T.mint,borderRadius:4,transition:"width 0.4s"}}/>
              </div>
              <span style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{filled}/{total} kamper</span>
            </div>
          </div>
          <span style={{fontSize:12,color:autoSaving?T.mint:"rgba(255,255,255,0.25)"}}>
            {autoSaving?"💾 Lagrer...":"✓ Lagret"}
          </span>
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
            {/* Group selector */}
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
              {allGroups.map(g=>{
                const gFilled=GROUP_MATCHES.filter(m=>m.group===g&&tips[m.id]?.home!==undefined&&tips[m.id]?.home!=="").length;
                const gTotal=GROUP_MATCHES.filter(m=>m.group===g).length;
                const done=gFilled===gTotal;
                return(
                  <button key={g} onClick={()=>setCurrentGroup(g)} style={{
                    padding:"6px 12px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",
                    fontSize:13,fontWeight:700,
                    background:currentGroup===g?`linear-gradient(135deg,${T.teal},#1a5a4a)`:done?"rgba(126,200,160,0.15)":"rgba(255,255,255,0.06)",
                    color:currentGroup===g?"#fff":done?T.mint:"rgba(255,255,255,0.5)",
                  }}>
                    {done?"✓ ":""}{g}
                  </button>
                );
              })}
            </div>

            <GroupBanner group={currentGroup}/>
            <p style={{color:"rgba(255,255,255,0.35)",fontSize:12,margin:"8px 0",}}>
              Alle 6 kamper i gruppen · 3p eksakt · 1p riktig utfall
            </p>

            {groupMatches.map(m=>(
              <MatchRow key={m.id} match={m} tip={tips[m.id]}
                onChange={v=>setTip(m.id,v)} phase="group" result={undefined}/>
            ))}

            <GroupRankingPicker group={currentGroup} tips={tips} setTip={setTip}/>

            <div style={{display:"flex",gap:10,marginTop:14,justifyContent:"space-between",flexWrap:"wrap"}}>
              <div style={{display:"flex",gap:8}}>
                {currentGroup>"A"&&(
                  <Btn ghost sm onClick={()=>setCurrentGroup(String.fromCharCode(currentGroup.charCodeAt(0)-1))}>
                    ← {String.fromCharCode(currentGroup.charCodeAt(0)-1)}
                  </Btn>
                )}
                {currentGroup<"L"&&(
                  <Btn sm onClick={()=>setCurrentGroup(String.fromCharCode(currentGroup.charCodeAt(0)+1))}>
                    {String.fromCharCode(currentGroup.charCodeAt(0)+1)} →
                  </Btn>
                )}
              </div>
              {currentGroup==="L"&&(
                <Btn onClick={()=>setStep("knockout")}>Neste: Sluttspill →</Btn>
              )}
            </div>
          </div>
        )}

        {/* SLUTTSPILL */}
        {step==="knockout"&&(
          <div style={cardCss}>
            <p style={{color:"rgba(255,255,255,0.35)",fontSize:12,margin:"0 0 8px"}}>
              Lagene hentes automatisk fra dine gruppetips. Grå = du har ikke tippet den kampen ennå.
            </p>
            {(()=>{
              let lastPhase=null;
              return KNOCKOUT_SLOTS.map(slot=>{
                const showPhase=slot.phase!==lastPhase;
                if(showPhase) lastPhase=slot.phase;
                return(
                  <div key={slot.id}>
                    {showPhase&&<PhaseHeader phase={slot.phase}/>}
                    <KnockoutMatchRow slot={slot} tips={tips} setTip={setTip} results={{}}/>
                  </div>
                );
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
                  <span style={{marginLeft:8,color:T.gold,letterSpacing:0,fontWeight:700}}>{q.points}p</span>
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

  return(
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
function LeaderboardView({participants,results,bonusResults}){
  const ranked=useMemo(()=>
    [...participants].map(p=>({...p,total:calcTotal(p,results,bonusResults)})).sort((a,b)=>b.total-a.total)
  ,[participants,results,bonusResults]);
  const medals=["🥇","🥈","🥉"];
  const pg=["rgba(240,192,90,0.15)","rgba(192,192,192,0.1)","rgba(205,127,50,0.12)"];
  const pb=["rgba(240,192,90,0.35)","rgba(192,192,192,0.25)","rgba(205,127,50,0.25)"];
  const pc=["#f0c05a","#c0c0c0","#cd7f32"];
  if(ranked.length===0) return(
    <div style={{...cardCss,textAlign:"center",padding:"48px"}}>
      <div style={{fontSize:48,marginBottom:12}}>⚽</div>
      <p style={{color:T.muted}}>Ingen deltakere ennå — vær den første!</p>
    </div>
  );
  return(
    <div style={{maxWidth:740,margin:"0 auto",display:"flex",flexDirection:"column",gap:10}}>
      {ranked.map((p,i)=>(
        <div key={p.name} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",borderRadius:14,background:i<3?pg[i]:"rgba(255,255,255,0.03)",border:`1px solid ${i<3?pb[i]:"rgba(255,255,255,0.07)"}`}}>
          <span style={{fontSize:i<3?28:17,width:34,textAlign:"center",flexShrink:0}}>{i<3?medals[i]:`${i+1}.`}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:16,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",marginTop:2}}>
              {GROUP_MATCHES.filter(m=>results[m.id]?.home!==undefined).length} av {GROUP_MATCHES.length} gruppekamper spilt
            </div>
          </div>
          <div style={{fontSize:24,fontWeight:800,color:i<3?pc[i]:"rgba(255,255,255,0.65)",flexShrink:0}}>{p.total}p</div>
        </div>
      ))}
    </div>
  );
}

// ── MINE TIPS ─────────────────────────────────────────────────────────────────
function MyTipsView({participants,results,bonusResults}){
  const[search,setSearch]=useState("");
  const found=participants.find(p=>p.name.toLowerCase().includes(search.toLowerCase()));
  return(
    <div style={{maxWidth:740,margin:"0 auto"}}>
      <div style={cardCss}>
        <label style={labelCss}>Søk opp navn</label>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Skriv navn..." style={inputCss}/>
        {search&&!found&&<p style={{color:"#f08080",fontSize:13}}>Ingen treff.</p>}
      </div>
      {found&&(
        <div style={{marginTop:12}}>
          <div style={{background:"rgba(42,122,106,0.12)",border:"1px solid rgba(42,122,106,0.25)",borderRadius:12,padding:"14px 18px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontWeight:800,fontSize:18,color:"#fff"}}>{found.name}</div>
              <div style={{fontSize:12,color:T.mint,marginTop:3}}>
                {GROUP_MATCHES.filter(m=>found.tips?.[m.id]?.home!==undefined&&found.tips[m.id].home!=="").length} gruppekamper tippet
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
                  {(()=>{
                    const rank=found.tips?.[`rank_${g}`]||[];
                    const resRank=results[`rank_${g}`]||[];
                    return rank.some(Boolean)?(
                      <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",padding:"6px 4px",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                        Gruppeplassering: {rank.filter(Boolean).map((t,i)=>{
                          const correct=resRank[i]&&resRank[i]===t;
                          return <span key={i} style={{marginRight:8,color:correct?T.gold:"rgba(255,255,255,0.5)"}}>{i+1}. {<FlagImg team={t}/>}{t}</span>;
                        })}
                      </div>
                    ):null;
                  })()}
                </div>
              ))}
              {(()=>{
                let lp=null;
                return KNOCKOUT_SLOTS.map(slot=>{
                  const showP=slot.phase!==lp;if(showP) lp=slot.phase;
                  return(
                    <div key={slot.id}>
                      {showP&&<PhaseHeader phase={slot.phase}/>}
                      <KnockoutMatchRow slot={slot} tips={found.tips||{}} results={results} readOnly/>
                    </div>
                  );
                });
              })()}
              <PhaseHeader phase="BONUS"/>
              {BONUS_QUESTIONS.map(q=>{
                const tip=found.bonus?.[q.id];
                const ans=bonusResults[q.id]?.answer;
                const correct=ans&&tip?.toString().trim().toLowerCase()===ans.toString().trim().toLowerCase();
                return(
                  <div key={q.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 2px",borderBottom:"1px solid rgba(255,255,255,0.04)",fontSize:13}}>
                    <span style={{color:"rgba(255,255,255,0.5)"}}>{q.icon} {q.text}</span>
                    <span style={{fontWeight:700,color:correct?T.gold:ans?"#f08080":"rgba(255,255,255,0.65)"}}>
                      {tip||"–"}{ans?` ${correct?`✅ ${q.points}p`:"❌"}`:""}
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

// ── RULES VIEW ────────────────────────────────────────────────────────────────
function RulesView(){
  const sections=[
    {title:"⚽ Gruppespill",rows:[
      ["Eksakt resultat","3p"],
      ["Riktig utfall (seier/uavgjort)","1p"],
      ["Riktig lag på 1. plass i gruppe","4p"],
      ["Riktig lag på 2. plass i gruppe","3p"],
      ["Riktig lag på 3. plass (beste taper)","2p"],
    ]},
    {title:"🏆 Sluttspill — resultater",rows:[
      ["16-delsfinale — eksakt / riktig utfall","3p / 1p"],
      ["Åttendelsfinale — eksakt / riktig utfall","4p / 2p"],
      ["Kvartfinale — eksakt / riktig utfall","5p / 2p"],
      ["Semifinale — eksakt / riktig utfall","6p / 3p"],
      ["Bronsefinale — eksakt / riktig utfall","4p / 2p"],
      ["Finale — eksakt / riktig utfall","8p / 4p"],
    ]},
    {title:"🎯 Riktig lag videre",rows:[
      ["Riktig lag i 16-delsfinale","2p"],
      ["Riktig lag i åttendelsfinale","3p"],
      ["Riktig lag i kvartfinale","4p"],
      ["Riktig lag i semifinale","5p"],
      ["Riktig VM-vinner (via lag videre-poenget)","8p"],
    ]},
    {title:"🎁 Bonusspørsmål",rows:[
      ["Hvem vinner VM? (eksakt)","10p"],
      ["Hvem blir toppscorer? (eksakt)","8p"],
      ["Antall røde kort totalt? (eksakt)","6p"],
      ["Antall mål totalt? (eksakt)","6p"],
      ["Antall mål Norge scorer? (eksakt)","5p"],
    ]},
  ];

  const maxPossible=()=>{
    const group=72*3+12*4+12*3+12*2; // max per group
    const ko=16*3+8*4+4*5+2*6+4+8; // knockout results
    const adv=16*2+8*3+4*4+2*5+8; // advance points
    const bonus=10+8+6+6+5;
    return group+ko+adv+bonus;
  };

  return(
    <div style={{maxWidth:740,margin:"0 auto"}}>
      <div style={cardCss}>
        <h2 style={{color:"#fff",margin:"0 0 4px",fontSize:20}}>📋 Regler og poengberegning</h2>
        <p style={{color:T.muted,fontSize:13,marginBottom:20}}>VM 2026 — Vinmonopolet Økonomi tippekonkurranse</p>

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

        <div style={{background:"rgba(240,192,90,0.08)",border:"1px solid rgba(240,192,90,0.2)",borderRadius:10,padding:"14px 16px",marginTop:8}}>
          <div style={{fontSize:12,color:T.mint,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>Generelle regler</div>
          <ul style={{color:"rgba(255,255,255,0.6)",fontSize:13,margin:0,paddingLeft:18,lineHeight:1.8}}>
            <li>Tipping stenger 11. juni 2026 kl. 20:00 — åpningskampen Mexico vs. Ecuador</li>
            <li>Sluttspillet fylles ut basert på hvem du tippet videre fra gruppespillet</li>
            <li>Du kan logge inn og endre tips frem til deadline</li>
            <li>Bonusspørsmål krever eksakt svar — ingen avrunding</li>
            <li>Ved poenglikhet avgjøres plasseringen av flest eksakte resultater</li>
            <li>Admin legger inn fasitresultater fortløpende etter kampene</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ── ADMIN ─────────────────────────────────────────────────────────────────────
function AdminView({results,setResults,bonusResults,setBonusResults,participants,reload}){
  const[pin,setPin]=useState(""),[authed,setAuthed]=useState(false);
  const[tab,setTab]=useState("matches"),[currentGroup,setCurrentGroup]=useState("A");
  const[saving,setSaving]=useState({});

  if(!authed) return(
    <div style={cardCss}>
      <h2 style={{color:"#fff",margin:"0 0 18px",fontSize:20}}>🔐 Admin</h2>
      <label style={labelCss}>PIN-kode</label>
      <input type="password" value={pin} onChange={e=>setPin(e.target.value)} placeholder="Skriv PIN..."
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

  const saveGroupRank=async(group,pos,team)=>{
    const key=`rank_${group}`;
    const cur=results[key]||[];
    const upd=[...cur];upd[pos]=team;
    setResults(r=>({...r,[key]:upd}));
    try{await sb.upsert("results",[{id:key,home:JSON.stringify(upd),away:""}]);}
    catch(e){console.error(e);}
  };

  const saveBonusResult=async(id,val)=>{
    setBonusResults(b=>({...b,[id]:{answer:val}}));
    try{await sb.upsert("bonus_results",[{id,answer:val}]);}
    catch(e){console.error(e);}
  };

  return(
    <div style={{maxWidth:740,margin:"0 auto"}}>
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
        {[["matches","⚽ Kamper"],["rankings","🏅 Grupperanking"],["knockout","🏆 Sluttspill"],["bonus","🎯 Bonus"],["stats","📊 Statistikk"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{
            padding:"8px 14px",borderRadius:9,border:"none",cursor:"pointer",fontFamily:"inherit",
            fontSize:12,fontWeight:700,
            background:tab===id?`linear-gradient(135deg,${T.teal},#1a5a4a)`:"rgba(255,255,255,0.06)",
            color:tab===id?"#fff":"rgba(255,255,255,0.45)",
          }}>{label}</button>
        ))}
        <button onClick={reload} style={{padding:"8px 14px",borderRadius:9,cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700,border:"1px solid rgba(255,255,255,0.09)",background:"rgba(255,255,255,0.04)",color:"rgba(255,255,255,0.45)"}}>🔄</button>
      </div>
      <div style={cardCss}>

        {tab==="matches"&&(
          <>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
              {Object.keys(GROUPS).map(g=>(
                <button key={g} onClick={()=>setCurrentGroup(g)} style={{
                  padding:"5px 10px",borderRadius:7,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700,
                  background:currentGroup===g?`linear-gradient(135deg,${T.teal},#1a5a4a)`:"rgba(255,255,255,0.06)",
                  color:currentGroup===g?"#fff":"rgba(255,255,255,0.5)",
                }}>{g}</button>
              ))}
            </div>
            <GroupBanner group={currentGroup}/>
            <div style={{maxHeight:"55vh",overflowY:"auto",paddingRight:4}}>
              {GROUP_MATCHES.filter(m=>m.group===currentGroup).map(m=>{
                const r=results[m.id]||{};
                return(
                  <div key={m.id} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 2px",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                    <span style={{fontSize:12,color:"rgba(255,255,255,0.45)",flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      <><FlagImg team={m.home} size={16}/> {m.home} – {m.away} <FlagImg team={m.away} size={16}/></>
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

        {tab==="rankings"&&(
          <>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
              {Object.keys(GROUPS).map(g=>(
                <button key={g} onClick={()=>setCurrentGroup(g)} style={{padding:"5px 10px",borderRadius:7,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700,background:currentGroup===g?`linear-gradient(135deg,${T.teal},#1a5a4a)`:"rgba(255,255,255,0.06)",color:currentGroup===g?"#fff":"rgba(255,255,255,0.5)"}}>
                  {g}
                </button>
              ))}
            </div>
            <GroupBanner group={currentGroup}/>
            <div style={{marginTop:12}}>
              {[0,1,2].map(pos=>{
                const labels=["1. plass (4p)","2. plass (3p)","3. plass / beste taper (2p)"];
                const cur=(results[`rank_${currentGroup}`]||[])[pos]||"";
                return(
                  <div key={pos} style={{marginBottom:10}}>
                    <label style={{...labelCss,marginBottom:4}}>{labels[pos]}</label>
                    <select value={cur} onChange={e=>saveGroupRank(currentGroup,pos,e.target.value)}
                      style={{width:"100%",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,color:cur?"#fff":"rgba(255,255,255,0.35)",fontSize:14,padding:"10px 12px",fontFamily:"inherit",outline:"none"}}>
                      <option value="">Velg fasit...</option>
                      {GROUPS[currentGroup].map(t=>(
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab==="knockout"&&(
          <div style={{maxHeight:"62vh",overflowY:"auto",paddingRight:4}}>
            {(()=>{
              let lp=null;
              return KNOCKOUT_SLOTS.map(slot=>{
                const showP=slot.phase!==lp;if(showP) lp=slot.phase;
                const r=results[slot.id]||{};
                return(
                  <div key={slot.id}>
                    {showP&&<PhaseHeader phase={slot.phase}/>}
                    <div style={{display:"flex",alignItems:"center",gap:8,padding:"5px 2px",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                      <span style={{fontSize:12,color:"rgba(255,255,255,0.45)",flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{slot.label}</span>
                      <ScoreInput val={r.home??""} onChange={v=>saveResult(slot.id,"home",v)}/>
                      <span style={{color:"rgba(255,255,255,0.25)"}}>–</span>
                      <ScoreInput val={r.away??""} onChange={v=>saveResult(slot.id,"away",v)}/>
                      {saving[slot.id]&&<span style={{fontSize:11,color:T.mint,width:14}}>✓</span>}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}

        {tab==="bonus"&&BONUS_QUESTIONS.map(q=>(
          <div key={q.id} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"14px",marginBottom:10}}>
            <label style={{...labelCss,marginBottom:8}}>{q.icon} {q.text} — fasit <span style={{color:T.gold}}>{q.points}p</span></label>
            <input type={q.type??"text"} value={bonusResults[q.id]?.answer??""} style={{...inputCss,marginBottom:0}}
              onChange={e=>saveBonusResult(q.id,e.target.value)}/>
          </div>
        ))}

        {tab==="stats"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
              {[["👥 Deltakere",participants.length],["⚽ Gruppekamper",`${Object.keys(results).filter(k=>k.startsWith("g")).length}/${GROUP_MATCHES.length}`],["🏆 Sluttspillkamper",`${KNOCKOUT_SLOTS.filter(s=>results[s.id]?.home!==undefined).length}/${KNOCKOUT_SLOTS.length}`],["🎯 Bonus satt",Object.keys(bonusResults).length]].map(([l,v])=>(
                <div key={l} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10,padding:"12px 14px"}}>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>{l}</div>
                  <div style={{fontSize:22,fontWeight:800,color:"#fff"}}>{v}</div>
                </div>
              ))}
            </div>
            {[...participants].map(p=>({...p,total:calcTotal(p,results,bonusResults)})).sort((a,b)=>b.total-a.total).map((p,i)=>(
              <div key={p.name} style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"7px 2px",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                <span style={{color:"rgba(255,255,255,0.65)"}}>{i+1}. {p.name}</span>
                <span style={{fontWeight:700,color:T.gold}}>{p.total}p</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── APP ROOT ──────────────────────────────────────────────────────────────────
const NAV=[
  {id:"register",label:"📋 Registrer"},
  {id:"leaderboard",label:"🏆 Ledertavle"},
  {id:"mytips",label:"📄 Mine tips"},
  {id:"rules",label:"📖 Regler"},
  {id:"admin",label:"⚙️ Admin"},
];

export default function App(){
  const[view,setView]=useState("leaderboard");
  const[participants,setParticipants]=useState([]);
  const[results,setResults]=useState({});
  const[bonusResults,setBonusResults]=useState({});
  const[loading,setLoading]=useState(true);
  const[dbError,setDbError]=useState(false);

  const loadData=useCallback(async()=>{
    try{
      const[parts,res,bonus]=await Promise.all([sb.getAll("participants"),sb.getAll("results"),sb.getAll("bonus_results")]);
      setParticipants(parts.map(p=>({...p,tips:p.tips||{},bonus:p.bonus||{}})));
      const resMap={};
      res.forEach(r=>{
        if(r.id.startsWith("rank_")){
          try{resMap[r.id]=JSON.parse(r.home);}catch{resMap[r.id]=[];}
        } else {
          resMap[r.id]={home:r.home,away:r.away};
        }
      });
      setResults(resMap);
      setBonusResults(Object.fromEntries(bonus.map(b=>[b.id,{answer:b.answer}])));
      setDbError(false);
    }catch(e){console.error(e);setDbError(true);}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{loadData();},[loadData]);
  useEffect(()=>{const t=setInterval(loadData,30000);return()=>clearInterval(t);},[loadData]);

  return(
    <div style={{minHeight:"100vh",background:"radial-gradient(ellipse at 15% 15%, #0e3530 0%, #071c18 45%, #020c0a 100%)",fontFamily:"-apple-system,'Segoe UI',sans-serif",color:"#fff",paddingBottom:80}}>
      <div aria-hidden style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,backgroundImage:"radial-gradient(circle,rgba(255,255,255,0.07) 1px,transparent 1px)",backgroundSize:"48px 48px",opacity:0.5}}/>
      {/* Header */}
      <div style={{position:"sticky",top:0,zIndex:20,background:"rgba(2,12,10,0.9)",backdropFilter:"blur(18px)",borderBottom:"1px solid rgba(255,255,255,0.06)",padding:"11px 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:11}}>
          <div style={{width:34,height:34,borderRadius:9,background:`linear-gradient(135deg,${T.teal},#1a5a4a)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,boxShadow:"0 2px 10px rgba(42,122,106,0.5)"}}>⚽</div>
          <div>
            <div style={{fontSize:10,letterSpacing:2.5,color:T.mint,textTransform:"uppercase",fontWeight:700,lineHeight:1}}>Vinmonopolet Økonomi</div>
            <div style={{fontSize:16,fontWeight:800,lineHeight:1.3}}>VM 2026 Tipping</div>
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
          <button key={n.id} onClick={()=>setView(n.id)} style={{padding:"9px 16px",borderRadius:10,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,transition:"all 0.16s",background:view===n.id?`linear-gradient(135deg,${T.teal},#1a5a4a)`:"rgba(255,255,255,0.06)",color:view===n.id?"#fff":"rgba(255,255,255,0.45)",boxShadow:view===n.id?"0 2px 14px rgba(42,122,106,0.45)":"none"}}>{n.label}</button>
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
            {view==="register"&&<RegisterView onRegister={loadData}/>}
            {view==="leaderboard"&&<LeaderboardView participants={participants} results={results} bonusResults={bonusResults}/>}
            {view==="mytips"&&<MyTipsView participants={participants} results={results} bonusResults={bonusResults}/>}
            {view==="rules"&&<RulesView/>}
            {view==="admin"&&<AdminView results={results} setResults={setResults} bonusResults={bonusResults} setBonusResults={setBonusResults} participants={participants} reload={loadData}/>}
          </>
        )}
      </div>
    </div>
  );
}
