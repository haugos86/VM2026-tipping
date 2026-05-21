import { useState, useEffect, useMemo, useCallback } from "react";

const SUPABASE_URL = "https://cnauqnqntbywsjoyuvur.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYXVxbnFudGJ5d3Nqb3l1dnVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMDc5NTEsImV4cCI6MjA5NDc4Mzk1MX0.IPxbGJIFhoc_CMJXsbxPMqHc9oPDEQxYXib4ogg2nvM";
const ADMIN_PIN = "vm2026";
const DEADLINE = new Date("2026-06-11T18:00:00Z");

async function hashPin(pin) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pin + "vm2026salt"));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("").slice(0,16);
}

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

const FLAG={
  "Mexico":"🇲🇽","Sør-Korea":"🇰🇷","Sør-Afrika":"🇿🇦","Tsjekkia":"🇨🇿",
  "Canada":"🇨🇦","Sveits":"🇨🇭","Qatar":"🇶🇦","Bosnia-Hercegovina":"🇧🇦",
  "Brasil":"🇧🇷","Marokko":"🇲🇦","Skottland":"🏴󠁧󠁢󠁳󠁣󠁴󠁿","Haiti":"🇭🇹",
  "USA":"🇺🇸","Australia":"🇦🇺","Paraguay":"🇵🇾","Tyrkia":"🇹🇷",
  "Tyskland":"🇩🇪","Ecuador":"🇪🇨","Elfenbenskysten":"🇨🇮","Curaçao":"🇨🇼",
  "Nederland":"🇳🇱","Japan":"🇯🇵","Tunisia":"🇹🇳","Sverige":"🇸🇪",
  "Belgia":"🇧🇪","Iran":"🇮🇷","Egypt":"🇪🇬","New Zealand":"🇳🇿",
  "Spania":"🇪🇸","Uruguay":"🇺🇾","Saudi-Arabia":"🇸🇦","Kapp Verde":"🇨🇻",
  "Frankrike":"🇫🇷","Senegal":"🇸🇳","Norge":"🇳🇴","Irak":"🇮🇶",
  "Argentina":"🇦🇷","Østerrike":"🇦🇹","Algerie":"🇩🇿","Jordan":"🇯🇴",
  "Portugal":"🇵🇹","Colombia":"🇨🇴","Usbekistan":"🇺🇿","DR Kongo":"🇨🇩",
  "England":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","Kroatia":"🇭🇷","Panama":"🇵🇦","Ghana":"🇬🇭",
};
const f=t=>FLAG[t]??"🏳️";

function generateGroupMatches() {
  const m=[];let id=1;
  Object.entries(GROUPS).forEach(([g,teams])=>{
    [[0,1],[2,3],[0,2]].forEach(([a,b])=>{
      m.push({id:`g${id++}`,group:g,home:teams[a],away:teams[b],phase:"group"});
    });
  });
  return m;
}

const GROUP_MATCHES=generateGroupMatches();
const KNOCKOUT_MATCHES=[
  ...Array.from({length:16},(_,i)=>({id:`r32_${i+1}`,phase:"R32",label:`16-delsfinale ${i+1}`,home:"TBD",away:"TBD"})),
  ...Array.from({length:8},(_,i)=>({id:`r16_${i+1}`,phase:"R16",label:`Åttendelsfinale ${i+1}`,home:"TBD",away:"TBD"})),
  ...Array.from({length:4},(_,i)=>({id:`qf${i+1}`,phase:"QF",label:`Kvartfinale ${i+1}`,home:"TBD",away:"TBD"})),
  {id:"sf1",phase:"SF",label:"Semifinale 1",home:"TBD",away:"TBD"},
  {id:"sf2",phase:"SF",label:"Semifinale 2",home:"TBD",away:"TBD"},
  {id:"3p",phase:"3P",label:"Bronsefinale",home:"TBD",away:"TBD"},
  {id:"f",phase:"F",label:"⭐ FINALE",home:"TBD",away:"TBD"},
];
const ALL_MATCHES=[...GROUP_MATCHES,...KNOCKOUT_MATCHES];

const BONUS_QUESTIONS=[
  {id:"b1",text:"Hvem vinner VM?",icon:"🏆",type:"text"},
  {id:"b2",text:"Hvem blir toppscorer?",icon:"⚽",type:"text"},
  {id:"b3",text:"Hvem vinner Gullhansken?",icon:"🧤",type:"text"},
  {id:"b4",text:"Hvem vinner Gullballen?",icon:"🌟",type:"text"},
  {id:"b5",text:"Antall mål totalt i turneringen?",icon:"📊",type:"number"},
  {id:"b6",text:"Hvilken nasjon overrasker mest?",icon:"🎯",type:"text"},
];

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

function scoreMatch(tip,result){
  if(!tip||!result||tip.home===""||tip.away===""||result.home===""||result.away==="") return null;
  const[th,ta,rh,ra]=[tip.home,tip.away,result.home,result.away].map(Number);
  if([th,ta,rh,ra].some(isNaN)) return null;
  if(th===rh&&ta===ra) return 3;
  if(Math.sign(th-ta)===Math.sign(rh-ra)) return 1;
  return 0;
}
function scoreBonus(tip,ans){
  if(!tip||!ans) return 0;
  return tip.trim().toLowerCase()===ans.trim().toLowerCase()?5:0;
}
function calcTotal(p,results,bonusResults){
  let pts=0;
  ALL_MATCHES.forEach(m=>{const s=scoreMatch(p.tips?.[m.id],results[m.id]);if(s!==null)pts+=s;});
  BONUS_QUESTIONS.forEach(q=>{pts+=scoreBonus(p.bonus?.[q.id],bonusResults[q.id]?.answer);});
  return pts;
}

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const T={
  teal:"#2a7a6a", mint:"#7ec8a0", gold:"#f0c05a",
  bg:"rgba(255,255,255,0.04)", border:"rgba(255,255,255,0.08)",
  muted:"rgba(255,255,255,0.45)",
};

const inputCss={
  display:"block",width:"100%",boxSizing:"border-box",
  background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",
  borderRadius:10,color:"#fff",fontSize:15,padding:"12px 16px",
  fontFamily:"inherit",marginBottom:14,outline:"none",
};
const labelCss={
  display:"block",fontSize:11,fontWeight:700,letterSpacing:1.5,
  color:T.mint,textTransform:"uppercase",marginBottom:6,
};
const cardCss={
  background:T.bg,border:`1px solid ${T.border}`,
  borderRadius:16,padding:"22px 24px",maxWidth:740,margin:"0 auto",
};

function Btn({children,onClick,disabled,ghost,sm}){
  return(
    <button onClick={onClick} disabled={disabled} style={{
      padding:sm?"7px 16px":"11px 24px",borderRadius:9,
      border:ghost?"1px solid rgba(255,255,255,0.14)":"none",
      cursor:disabled?"not-allowed":"pointer",
      fontFamily:"inherit",fontSize:sm?12:14,fontWeight:700,
      background:ghost?"rgba(255,255,255,0.05)":`linear-gradient(135deg,${T.teal},#1a5a4a)`,
      color:"#fff",opacity:disabled?0.4:1,transition:"all 0.18s",
      boxShadow:ghost||disabled?"none":"0 2px 12px rgba(42,122,106,0.4)",
    }}>{children}</button>
  );
}

function ScoreInput({val,onChange,disabled}){
  return(
    <input type="number" min="0" max="30" value={val??""} onChange={e=>onChange(e.target.value)}
      disabled={disabled} style={{
        width:40,height:36,textAlign:"center",
        background:disabled?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.08)",
        border:"1px solid rgba(255,255,255,0.14)",
        borderRadius:8,color:"#fff",fontSize:16,fontFamily:"inherit",
        outline:"none",opacity:disabled?0.5:1,
      }}/>
  );
}

function GroupBanner({group}){
  return(
    <div style={{
      margin:"18px 0 4px",padding:"8px 12px",
      background:"rgba(42,122,106,0.1)",border:"1px solid rgba(42,122,106,0.2)",
      borderRadius:10,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",
    }}>
      <span style={{fontSize:11,fontWeight:800,letterSpacing:2,color:T.mint,textTransform:"uppercase"}}>
        Gruppe {group}
      </span>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        {GROUPS[group].map(t=>(
          <span key={t} style={{fontSize:13,color:"rgba(255,255,255,0.65)"}}>
            {f(t)} {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function PhaseHeader({phase}){
  const labels={R32:"16-delsfinaler 🆕",R16:"Åttendelsfinaler",QF:"Kvartfinaler",SF:"Semifinaler","3P":"Bronsefinale",F:"⭐ FINALE",BONUS:"Bonusspørsmål"};
  return(
    <div style={{
      margin:"24px 0 6px",padding:"6px 12px",
      background:"rgba(240,192,90,0.08)",border:"1px solid rgba(240,192,90,0.18)",
      borderRadius:8,fontSize:11,fontWeight:800,letterSpacing:2,
      color:T.gold,textTransform:"uppercase",
    }}>{labels[phase]??phase}</div>
  );
}

function MatchRow({match,tip,onChange,readOnly,result}){
  const pts=result?.home!==undefined&&result?.away!==undefined?scoreMatch(tip,result):null;
  return(
    <div style={{
      display:"grid",gridTemplateColumns:"1fr auto 1fr",
      gap:8,alignItems:"center",padding:"7px 2px",
      borderBottom:"1px solid rgba(255,255,255,0.04)",
    }}>
      <div style={{textAlign:"right",fontSize:13,color:"rgba(255,255,255,0.85)"}}>
        <span style={{marginRight:4}}>{f(match.home)}</span>
        <strong>{match.home}</strong>
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
          <div style={{
            minWidth:30,textAlign:"center",padding:"3px 6px",borderRadius:6,
            fontSize:11,fontWeight:800,
            background:pts===3?"rgba(240,192,90,0.15)":pts===1?"rgba(126,200,160,0.12)":"rgba(255,255,255,0.04)",
            color:pts===3?T.gold:pts===1?T.mint:"#555",
          }}>{pts}p</div>
        )}
      </div>
      <div style={{fontSize:13,color:"rgba(255,255,255,0.85)"}}>
        <strong>{match.away}</strong>
        <span style={{marginLeft:4}}>{f(match.away)}</span>
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

// ─── AUTH VIEWS ───────────────────────────────────────────────────────────────
function RegisterView({onRegister}){
  const[mode,setMode]=useState("choose");
  const[name,setName]=useState(""),[pin,setPin]=useState(""),[pinConfirm,setPinConfirm]=useState("");
  const[tips,setTips]=useState({}),[bonus,setBonus]=useState({});
  const[step,setStep]=useState("matches");
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
      <input type="password" value={pinConfirm} onChange={e=>setPinConfirm(e.target.value)} placeholder="Skriv PIN igjen"
        style={inputCss} onKeyDown={e=>e.key==="Enter"&&doRegister()}/>
      {error&&<p style={{color:"#f08080",fontSize:13,marginBottom:12}}>{error}</p>}
      <div style={{display:"flex",gap:10}}>
        <Btn ghost onClick={()=>{setMode("choose");setError("");}}>← Tilbake</Btn>
        <Btn onClick={doRegister} disabled={saving||!name.trim()||pin.length<4||pin!==pinConfirm}>
          {saving?"Oppretter...":"Opprett bruker →"}
        </Btn>
      </div>
      <p style={{color:"rgba(255,255,255,0.3)",fontSize:12,marginTop:12}}>
        Allerede registrert?{" "}
        <span style={{color:T.mint,cursor:"pointer"}} onClick={()=>{setMode("login");setError("");}}>Logg inn her</span>
      </p>
    </div>
  );

  if(mode==="editing"){
    let lg=null,lp=null;
    const filled=ALL_MATCHES.filter(m=>tips[m.id]?.home!==undefined&&tips[m.id]?.home!=="").length;
    const pct=Math.round((filled/ALL_MATCHES.length)*100);
    return(
      <div style={{maxWidth:740,margin:"0 auto"}}>
        <div style={{
          background:"rgba(42,122,106,0.12)",border:"1px solid rgba(42,122,106,0.22)",
          borderRadius:12,padding:"12px 16px",marginBottom:12,
          display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,
        }}>
          <div>
            <div style={{fontWeight:700,fontSize:16,color:"#fff"}}>{currentUser?.name}</div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginTop:5}}>
              <div style={{height:4,width:140,background:"rgba(255,255,255,0.1)",borderRadius:4,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${pct}%`,background:T.mint,borderRadius:4,transition:"width 0.4s"}}/>
              </div>
              <span style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{filled}/{ALL_MATCHES.length}</span>
            </div>
          </div>
          <span style={{fontSize:12,color:autoSaving?T.mint:"rgba(255,255,255,0.25)"}}>
            {autoSaving?"💾 Lagrer...":"✓ Lagret"}
          </span>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          {[["matches","⚽ Kamper"],["bonus","🎯 Bonusspørsmål"]].map(([id,label])=>(
            <button key={id} onClick={()=>setStep(id)} style={{
              padding:"9px 18px",borderRadius:9,border:"none",cursor:"pointer",
              fontFamily:"inherit",fontSize:13,fontWeight:700,transition:"all 0.15s",
              background:step===id?`linear-gradient(135deg,${T.teal},#1a5a4a)`:"rgba(255,255,255,0.06)",
              color:step===id?"#fff":"rgba(255,255,255,0.45)",
              boxShadow:step===id?"0 2px 12px rgba(42,122,106,0.4)":"none",
            }}>{label}</button>
          ))}
        </div>
        {step==="matches"&&(
          <div style={cardCss}>
            <p style={{color:"rgba(255,255,255,0.35)",fontSize:12,marginBottom:8,marginTop:0}}>
              3p = eksakt · 1p = riktig utfall · Lagres automatisk
            </p>
            <div style={{maxHeight:"60vh",overflowY:"auto",paddingRight:4}}>
              {ALL_MATCHES.map(m=>{
                const sG=m.phase==="group"&&m.group!==lg;
                const sP=m.phase!=="group"&&m.phase!==lp;
                if(sG) lg=m.group;
                if(sP){lp=m.phase;lg=null;}
                return(
                  <div key={m.id}>
                    {sG&&<GroupBanner group={m.group}/>}
                    {sP&&<PhaseHeader phase={m.phase}/>}
                    <MatchRow match={m} tip={tips[m.id]} onChange={v=>setTip(m.id,v)}/>
                  </div>
                );
              })}
            </div>
            <div style={{marginTop:14}}><Btn onClick={()=>setStep("bonus")}>Neste: Bonusspørsmål →</Btn></div>
          </div>
        )}
        {step==="bonus"&&(
          <div style={cardCss}>
            <p style={{color:"rgba(255,255,255,0.35)",fontSize:12,marginBottom:16,marginTop:0}}>5p per riktig svar. Lagres automatisk.</p>
            {BONUS_QUESTIONS.map(q=>(
              <div key={q.id} style={{
                background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",
                borderRadius:12,padding:"14px",marginBottom:10,
              }}>
                <label style={{...labelCss,marginBottom:8}}><span style={{marginRight:6,fontSize:15}}>{q.icon}</span>{q.text}</label>
                <input type={q.type??"text"} value={bonus[q.id]??""} style={{...inputCss,marginBottom:0}}
                  onChange={e=>setBonus(b=>({...b,[q.id]:e.target.value}))}/>
              </div>
            ))}
            {error&&<p style={{color:"#f08080",fontSize:13,marginBottom:10}}>{error}</p>}
            <div style={{display:"flex",gap:10,marginTop:4}}>
              <Btn ghost onClick={()=>setStep("matches")}>← Tilbake</Btn>
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

// ─── LEADERBOARD ──────────────────────────────────────────────────────────────
function LeaderboardView({participants,results,bonusResults}){
  const ranked=useMemo(()=>
    [...participants].map(p=>({...p,total:calcTotal(p,results,bonusResults)})).sort((a,b)=>b.total-a.total)
  ,[participants,results,bonusResults]);

  const medals=["🥇","🥈","🥉"];
  const podiumGrad=[
    "rgba(240,192,90,0.15)","rgba(192,192,192,0.1)","rgba(205,127,50,0.12)"
  ];
  const podiumBorder=[
    "rgba(240,192,90,0.35)","rgba(192,192,192,0.25)","rgba(205,127,50,0.25)"
  ];
  const podiumColor=["#f0c05a","#c0c0c0","#cd7f32"];

  if(ranked.length===0) return(
    <div style={{...cardCss,textAlign:"center",padding:"48px"}}>
      <div style={{fontSize:48,marginBottom:12}}>⚽</div>
      <p style={{color:T.muted}}>Ingen deltakere ennå — vær den første!</p>
    </div>
  );

  return(
    <div style={{maxWidth:740,margin:"0 auto",display:"flex",flexDirection:"column",gap:10}}>
      {ranked.map((p,i)=>(
        <div key={p.name} style={{
          display:"flex",alignItems:"center",gap:14,padding:"14px 18px",borderRadius:14,
          background:i<3?podiumGrad[i]:T.bg,
          border:`1px solid ${i<3?podiumBorder[i]:T.border}`,
        }}>
          <span style={{fontSize:i<3?28:17,width:34,textAlign:"center",flexShrink:0}}>
            {i<3?medals[i]:`${i+1}.`}
          </span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:16,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {p.name}
            </div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",marginTop:2}}>
              {ALL_MATCHES.filter(m=>results[m.id]?.home!==undefined).length}/{ALL_MATCHES.length} kamper spilt
            </div>
          </div>
          <div style={{fontSize:24,fontWeight:800,color:i<3?podiumColor[i]:"rgba(255,255,255,0.65)",flexShrink:0}}>
            {p.total}p
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── MINE TIPS ────────────────────────────────────────────────────────────────
function MyTipsView({participants,results,bonusResults}){
  const[search,setSearch]=useState("");
  const found=participants.find(p=>p.name.toLowerCase().includes(search.toLowerCase()));
  let lg=null,lp=null;
  return(
    <div style={{maxWidth:740,margin:"0 auto"}}>
      <div style={cardCss}>
        <label style={labelCss}>Søk opp navn</label>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Skriv navn..." style={inputCss}/>
        {search&&!found&&<p style={{color:"#f08080",fontSize:13}}>Ingen treff.</p>}
      </div>
      {found&&(
        <div style={{marginTop:12}}>
          <div style={{
            background:"rgba(42,122,106,0.12)",border:"1px solid rgba(42,122,106,0.25)",
            borderRadius:12,padding:"14px 18px",marginBottom:12,
            display:"flex",justifyContent:"space-between",alignItems:"center",
          }}>
            <div>
              <div style={{fontWeight:800,fontSize:18,color:"#fff"}}>{found.name}</div>
              <div style={{fontSize:12,color:T.mint,marginTop:3}}>
                {ALL_MATCHES.filter(m=>found.tips?.[m.id]?.home!==undefined&&found.tips[m.id].home!=="").length} kamper tippet
              </div>
            </div>
            <div style={{fontSize:28,fontWeight:800,color:T.gold}}>
              {calcTotal(found,results,bonusResults)}p
            </div>
          </div>
          <div style={cardCss}>
            <div style={{maxHeight:"60vh",overflowY:"auto"}}>
              {ALL_MATCHES.map(m=>{
                const sG=m.phase==="group"&&m.group!==lg;
                const sP=m.phase!=="group"&&m.phase!==lp;
                if(sG) lg=m.group;
                if(sP){lp=m.phase;lg=null;}
                return(
                  <div key={m.id}>
                    {sG&&<GroupBanner group={m.group}/>}
                    {sP&&<PhaseHeader phase={m.phase}/>}
                    <MatchRow match={m} tip={found.tips?.[m.id]} result={results[m.id]} readOnly/>
                  </div>
                );
              })}
              <PhaseHeader phase="BONUS"/>
              {BONUS_QUESTIONS.map(q=>{
                const tip=found.bonus?.[q.id];
                const ans=bonusResults[q.id]?.answer;
                const correct=ans&&scoreBonus(tip,ans)>0;
                return(
                  <div key={q.id} style={{
                    display:"flex",justifyContent:"space-between",alignItems:"center",
                    padding:"9px 2px",borderBottom:"1px solid rgba(255,255,255,0.04)",fontSize:13,
                  }}>
                    <span style={{color:"rgba(255,255,255,0.5)"}}>{q.icon} {q.text}</span>
                    <span style={{fontWeight:700,color:correct?T.gold:ans?"#f08080":"rgba(255,255,255,0.65)"}}>
                      {tip||"–"}{ans?` ${correct?"✅ 5p":"❌"}`:""}
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

// ─── ADMIN ────────────────────────────────────────────────────────────────────
function AdminView({results,setResults,bonusResults,setBonusResults,participants,reload}){
  const[pin,setPin]=useState(""),[authed,setAuthed]=useState(false);
  const[tab,setTab]=useState("matches"),[saving,setSaving]=useState({});
  let lg=null,lp=null;

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

  const saveBonusResult=async(id,val)=>{
    setBonusResults(b=>({...b,[id]:{answer:val}}));
    try{await sb.upsert("bonus_results",[{id,answer:val}]);}
    catch(e){console.error(e);}
  };

  return(
    <div style={{maxWidth:740,margin:"0 auto"}}>
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
        {[["matches","⚽ Kamper"],["bonus","🎯 Bonus"],["stats","📊 Statistikk"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{
            padding:"9px 18px",borderRadius:9,border:"none",cursor:"pointer",
            fontFamily:"inherit",fontSize:13,fontWeight:700,
            background:tab===id?`linear-gradient(135deg,${T.teal},#1a5a4a)`:"rgba(255,255,255,0.06)",
            color:tab===id?"#fff":"rgba(255,255,255,0.45)",
            boxShadow:tab===id?"0 2px 12px rgba(42,122,106,0.4)":"none",
          }}>{label}</button>
        ))}
        <button onClick={reload} style={{
          padding:"9px 16px",borderRadius:9,cursor:"pointer",fontFamily:"inherit",
          fontSize:13,fontWeight:700,border:"1px solid rgba(255,255,255,0.09)",
          background:"rgba(255,255,255,0.04)",color:"rgba(255,255,255,0.45)",
        }}>🔄 Oppdater</button>
      </div>
      <div style={cardCss}>
        {tab==="matches"&&(
          <div style={{maxHeight:"64vh",overflowY:"auto",paddingRight:4}}>
            {ALL_MATCHES.map(m=>{
              const sG=m.phase==="group"&&m.group!==lg;
              const sP=m.phase!=="group"&&m.phase!==lp;
              if(sG) lg=m.group;
              if(sP){lp=m.phase;lg=null;}
              const r=results[m.id]||{};
              return(
                <div key={m.id}>
                  {sG&&<GroupBanner group={m.group}/>}
                  {sP&&<PhaseHeader phase={m.phase}/>}
                  <div style={{display:"flex",alignItems:"center",gap:8,padding:"5px 2px",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                    <span style={{fontSize:12,color:"rgba(255,255,255,0.45)",flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {m.phase==="group"?`${f(m.home)} ${m.home} – ${m.away} ${f(m.away)}`:m.label}
                    </span>
                    <ScoreInput val={r.home??""} onChange={v=>saveResult(m.id,"home",v)}/>
                    <span style={{color:"rgba(255,255,255,0.25)"}}>–</span>
                    <ScoreInput val={r.away??""} onChange={v=>saveResult(m.id,"away",v)}/>
                    {saving[m.id]&&<span style={{fontSize:12,color:T.mint,width:14}}>✓</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {tab==="bonus"&&BONUS_QUESTIONS.map(q=>(
          <div key={q.id} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"14px",marginBottom:10}}>
            <label style={{...labelCss,marginBottom:8}}>{q.icon} {q.text} — fasit</label>
            <input type={q.type??"text"} value={bonusResults[q.id]?.answer??""} style={{...inputCss,marginBottom:0}}
              onChange={e=>saveBonusResult(q.id,e.target.value)}/>
          </div>
        ))}
        {tab==="stats"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
              {[["👥 Deltakere",participants.length],["⚽ Kamper",`${Object.keys(results).length}/${ALL_MATCHES.length}`],["🎯 Bonus satt",Object.keys(bonusResults).length],["⏳ Igjen",ALL_MATCHES.length-Object.keys(results).length]].map(([l,v])=>(
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

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
const NAV=[
  {id:"register",label:"📋 Registrer"},
  {id:"leaderboard",label:"🏆 Ledertavle"},
  {id:"mytips",label:"📄 Mine tips"},
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
      setResults(Object.fromEntries(res.map(r=>[r.id,{home:r.home,away:r.away}])));
      setBonusResults(Object.fromEntries(bonus.map(b=>[b.id,{answer:b.answer}])));
      setDbError(false);
    }catch(e){console.error(e);setDbError(true);}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{loadData();},[loadData]);
  useEffect(()=>{const t=setInterval(loadData,30000);return()=>clearInterval(t);},[loadData]);

  return(
    <div style={{
      minHeight:"100vh",
      background:"radial-gradient(ellipse at 15% 15%, #0e3530 0%, #071c18 45%, #020c0a 100%)",
      fontFamily:"-apple-system, 'Segoe UI', sans-serif",
      color:"#fff", paddingBottom:80,
    }}>
      {/* Subtle star field */}
      <div aria-hidden style={{
        position:"fixed",inset:0,pointerEvents:"none",zIndex:0,
        backgroundImage:"radial-gradient(circle,rgba(255,255,255,0.07) 1px,transparent 1px)",
        backgroundSize:"48px 48px",opacity:0.5,
      }}/>

      {/* Header */}
      <div style={{
        position:"sticky",top:0,zIndex:20,
        background:"rgba(2,12,10,0.88)",backdropFilter:"blur(18px)",
        borderBottom:"1px solid rgba(255,255,255,0.06)",
        padding:"11px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:11}}>
          <div style={{
            width:34,height:34,borderRadius:9,
            background:`linear-gradient(135deg,${T.teal},#1a5a4a)`,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:17,boxShadow:"0 2px 10px rgba(42,122,106,0.5)",
          }}>⚽</div>
          <div>
            <div style={{fontSize:10,letterSpacing:2.5,color:T.mint,textTransform:"uppercase",fontWeight:700,lineHeight:1}}>
              Vinmonopolet Økonomi
            </div>
            <div style={{fontSize:16,fontWeight:800,lineHeight:1.3}}>VM 2026 Tipping</div>
          </div>
        </div>
        <div>
          {!loading&&!dbError&&(
            <div style={{background:"rgba(240,192,90,0.1)",border:"1px solid rgba(240,192,90,0.22)",borderRadius:20,padding:"4px 14px",fontSize:12,color:T.gold,fontWeight:700}}>
              {participants.length} deltakere
            </div>
          )}
          {dbError&&(
            <div style={{background:"rgba(180,40,40,0.18)",border:"1px solid rgba(200,60,60,0.3)",borderRadius:20,padding:"4px 14px",fontSize:12,color:"#f08080",fontWeight:700}}>
              ⚠️ DB-feil
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <div style={{position:"relative",zIndex:1,display:"flex",justifyContent:"center",gap:4,padding:"14px 12px 0",flexWrap:"wrap"}}>
        {NAV.map(n=>(
          <button key={n.id} onClick={()=>setView(n.id)} style={{
            padding:"9px 18px",borderRadius:10,border:"none",cursor:"pointer",
            fontFamily:"inherit",fontSize:13,fontWeight:700,transition:"all 0.16s",
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
            {view==="register"&&<RegisterView onRegister={loadData}/>}
            {view==="leaderboard"&&<LeaderboardView participants={participants} results={results} bonusResults={bonusResults}/>}
            {view==="mytips"&&<MyTipsView participants={participants} results={results} bonusResults={bonusResults}/>}
            {view==="admin"&&<AdminView results={results} setResults={setResults} bonusResults={bonusResults} setBonusResults={setBonusResults} participants={participants} reload={loadData}/>}
          </>
        )}
      </div>
    </div>
  );
}
