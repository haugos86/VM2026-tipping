import { useState, useEffect, useMemo, useCallback } from "react";

// ══════════════════════════════════════════════════
//  🔧 KONFIGURASJON — fyll inn dine Supabase-verdier
// ══════════════════════════════════════════════════
const SUPABASE_URL = "https://cnauqnqntbywsjoyuvur.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYXVxbnFudGJ5d3Nqb3l1dnVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMDc5NTEsImV4cCI6MjA5NDc4Mzk1MX0.IPxbGJIFhoc_CMJXsbxPMqHc9oPDEQxYXib4ogg2nvM";
const ADMIN_PIN = "vm2026";

// Deadline: 11. juni 2026 kl 20:00 norsk tid (18:00 UTC)
const DEADLINE = new Date("2026-06-11T18:00:00Z");

// ══════════════════════════════════════════════════
//  📊 DATA — alle 48 lag, 12 grupper
// ══════════════════════════════════════════════════
const GROUPS = {
  A: ["Mexico", "Sør-Korea", "Sør-Afrika", "Tsjekkia"],
  B: ["Canada", "Sveits", "Qatar", "Bosnia-Hercegovina"],
  C: ["Brasil", "Marokko", "Skottland", "Haiti"],
  D: ["USA", "Australia", "Paraguay", "Tyrkia"],
  E: ["Tyskland", "Ecuador", "Elfenbenskysten", "Curaçao"],
  F: ["Nederland", "Japan", "Tunisia", "Sverige"],
  G: ["Belgia", "Iran", "Egypt", "New Zealand"],
  H: ["Spania", "Uruguay", "Saudi-Arabia", "Kapp Verde"],
  I: ["Frankrike", "Senegal", "Norge", "Irak"],
  J: ["Argentina", "Østerrike", "Algerie", "Jordan"],
  K: ["Portugal", "Colombia", "Usbekistan", "DR Kongo"],
  L: ["England", "Kroatia", "Panama", "Ghana"],
};

const FLAG = {
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
const f = t => FLAG[t] ?? "🏳️";

function generateGroupMatches() {
  const matches = [];
  let id = 1;
  Object.entries(GROUPS).forEach(([g, teams]) => {
    [[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]].slice(0,3).forEach(([a,b]) => {
      matches.push({ id: `g${id++}`, group: g, home: teams[a], away: teams[b], phase: "group" });
    });
  });
  return matches;
}

const GROUP_MATCHES = generateGroupMatches();

const KNOCKOUT_MATCHES = [
  ...Array.from({length:16}, (_,i) => ({
    id:`r32_${i+1}`, phase:"R32", label:`16-delsfinale ${i+1}`,
    home:`Vinner/Taper gruppe TBD`, away:`Vinner/Taper gruppe TBD`
  })),
  ...Array.from({length:8}, (_,i) => ({
    id:`r16_${i+1}`, phase:"R16", label:`Åttendelsfinale ${i+1}`,
    home:`Vinner 16df ${i*2+1}`, away:`Vinner 16df ${i*2+2}`
  })),
  ...Array.from({length:4}, (_,i) => ({
    id:`qf${i+1}`, phase:"QF", label:`Kvartfinale ${i+1}`,
    home:`Vinner Å${i*2+1}`, away:`Vinner Å${i*2+2}`
  })),
  { id:"sf1", phase:"SF", label:"Semifinale 1", home:"Vinner KF1", away:"Vinner KF2" },
  { id:"sf2", phase:"SF", label:"Semifinale 2", home:"Vinner KF3", away:"Vinner KF4" },
  { id:"3p",  phase:"3P", label:"Bronsefinale", home:"Taper SF1",  away:"Taper SF2" },
  { id:"f",   phase:"F",  label:"⭐ FINALE",    home:"Vinner SF1", away:"Vinner SF2" },
];

const ALL_MATCHES = [...GROUP_MATCHES, ...KNOCKOUT_MATCHES];

const BONUS_QUESTIONS = [
  { id:"b1", text:"Hvem vinner VM? 🏆", type:"text" },
  { id:"b2", text:"Hvem blir toppscorer? ⚽", type:"text" },
  { id:"b3", text:"Hvem vinner Gullhansken (beste keeper)? 🧤", type:"text" },
  { id:"b4", text:"Hvem vinner Gullballen (beste spiller)? 🌟", type:"text" },
  { id:"b5", text:"Hvor mange mål totalt i turneringen?", type:"number" },
  { id:"b6", text:"Hvilken nasjon overrasker mest? 🏳️", type:"text" },
];

// ══════════════════════════════════════════════════
//  🗄️ SUPABASE
// ══════════════════════════════════════════════════
const sb = {
  async query(table, method="GET", body=null, filter="") {
    const headers = {
      "Content-Type":"application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Prefer": method==="POST"
        ? "return=representation,resolution=merge-duplicates"
        : "return=representation"
    };
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${filter}`, {
      method, headers, body: body ? JSON.stringify(body) : null
    });
    if (!res.ok) throw new Error(await res.text());
    return res.status===204 ? [] : res.json();
  },
  getAll: (t) => sb.query(t,"GET",null,"?select=*"),
  upsertByName: (t,body) => sb.query(t,"POST",body,"?on_conflict=name"),
  upsert: (t,body) => sb.query(t,"POST",body,"?on_conflict=id"),
};

// ══════════════════════════════════════════════════
//  🧮 POENG
// ══════════════════════════════════════════════════
function scoreMatch(tip, result) {
  if (!tip || !result || tip.home==="" || tip.away==="" || result.home==="" || result.away==="") return null;
  const [th,ta,rh,ra] = [tip.home, tip.away, result.home, result.away].map(Number);
  if ([th,ta,rh,ra].some(isNaN)) return null;
  if (th===rh && ta===ra) return 3;
  if (Math.sign(th-ta)===Math.sign(rh-ra)) return 1;
  return 0;
}
function scoreBonus(tip, answer) {
  if (!tip || !answer) return 0;
  return tip.trim().toLowerCase()===answer.trim().toLowerCase() ? 5 : 0;
}
function calcTotal(p, results, bonusResults) {
  let pts = 0;
  ALL_MATCHES.forEach(m => { const s = scoreMatch(p.tips?.[m.id], results[m.id]); if (s!==null) pts+=s; });
  BONUS_QUESTIONS.forEach(q => { pts += scoreBonus(p.bonus?.[q.id], bonusResults[q.id]?.answer); });
  return pts;
}

// ══════════════════════════════════════════════════
//  🎨 UI
// ══════════════════════════════════════════════════
const VMP_TEAL = "#296459";
const VMP_DARK = "#092529";
const VMP_MINT = "#9fcbb0";
const VMP_GOLD = "#f0c05a";

const labelStyle = {
  display:"block", fontSize:11, fontWeight:700,
  letterSpacing:1, color:VMP_MINT, textTransform:"uppercase", marginBottom:6
};
const inputStyle = {
  display:"block", width:"100%", boxSizing:"border-box",
  background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.15)",
  borderRadius:8, color:"#fff", fontSize:15, padding:"10px 14px",
  fontFamily:"'Georgia',serif", marginBottom:16
};

function Card({ title, children, icon }) {
  return (
    <div style={{
      background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)",
      borderRadius:16, padding:"24px 28px", maxWidth:720, margin:"0 auto"
    }}>
      {title && <h2 style={{margin:"0 0 20px",fontSize:20,fontWeight:800,color:"#fff"}}>
        {icon && <span style={{marginRight:8}}>{icon}</span>}{title}
      </h2>}
      {children}
    </div>
  );
}

function Btn({ children, onClick, disabled, secondary, small }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: small?"6px 14px":"10px 22px",
      borderRadius:8, border:"none", cursor:disabled?"not-allowed":"pointer",
      fontFamily:"'Georgia',serif", fontSize:small?12:14, fontWeight:700,
      background: secondary?"rgba(255,255,255,0.08)":VMP_TEAL,
      color: secondary?"#ccc":"#fff", opacity:disabled?0.4:1, transition:"all 0.15s"
    }}>{children}</button>
  );
}

function ScoreInput({ val, onChange, disabled }) {
  return (
    <input type="number" min="0" max="30" value={val??""} onChange={e=>onChange(e.target.value)}
      disabled={disabled} style={{
        width:38, textAlign:"center",
        background:disabled?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.09)",
        border:`1px solid ${disabled?"rgba(255,255,255,0.08)":"rgba(255,255,255,0.2)"}`,
        borderRadius:6, color:"#fff", fontSize:15, padding:"4px 0", fontFamily:"'Georgia',serif"
      }}
    />
  );
}

function MatchRow({ match, tip, onChange, readOnly, result }) {
  const pts = result?.home!==undefined && result?.away!==undefined ? scoreMatch(tip,result) : null;
  return (
    <div style={{
      display:"grid", gridTemplateColumns:"1fr auto 1fr",
      gap:8, alignItems:"center", padding:"8px 0",
      borderBottom:"1px solid rgba(255,255,255,0.05)"
    }}>
      <div style={{textAlign:"right",fontSize:13}}>{f(match.home)} <strong>{match.home}</strong></div>
      <div style={{display:"flex",alignItems:"center",gap:5}}>
        {readOnly ? (
          <span style={{color:"#aaa",fontSize:13,minWidth:54,textAlign:"center"}}>
            {tip?.home??"–"}–{tip?.away??"–"}
          </span>
        ) : (
          <>
            <ScoreInput val={tip?.home??""} onChange={v=>onChange({...tip,home:v})} />
            <span style={{color:"#555"}}>–</span>
            <ScoreInput val={tip?.away??""} onChange={v=>onChange({...tip,away:v})} />
          </>
        )}
        {pts!==null && (
          <span style={{
            marginLeft:4, fontSize:11, fontWeight:800,
            color:pts===3?VMP_GOLD:pts===1?VMP_MINT:"#777",
            background:pts===3?"rgba(240,192,90,0.12)":pts===1?"rgba(159,203,176,0.12)":"rgba(255,255,255,0.04)",
            borderRadius:4, padding:"2px 6px"
          }}>{pts}p</span>
        )}
      </div>
      <div style={{fontSize:13}}><strong>{match.away}</strong> {f(match.away)}</div>
    </div>
  );
}

function GroupHeader({ group }) {
  return (
    <div style={{marginTop:18,marginBottom:3,fontSize:11,fontWeight:800,
      letterSpacing:2,color:VMP_MINT,textTransform:"uppercase"}}>
      Gruppe {group} — {GROUPS[group].map(t=>`${f(t)} ${t}`).join(" · ")}
    </div>
  );
}

function PhaseHeader({ phase }) {
  const labels = {R32:"16-delsfinaler 🆕",R16:"Åttendelsfinaler",QF:"Kvartfinaler",SF:"Semifinaler","3P":"Bronsefinale",F:"⭐ FINALE"};
  return (
    <div style={{marginTop:24,marginBottom:6,fontSize:11,fontWeight:800,
      letterSpacing:2,color:VMP_GOLD,textTransform:"uppercase"}}>
      {labels[phase]??phase}
    </div>
  );
}

function DeadlineBanner() {
  const [now, setNow] = useState(new Date());
  useEffect(()=>{ const t=setInterval(()=>setNow(new Date()),1000); return()=>clearInterval(t); },[]);
  const diff = DEADLINE - now;
  if (diff<=0) return (
    <div style={{background:"rgba(139,32,32,0.25)",border:"1px solid rgba(200,50,50,0.4)",
      borderRadius:10,padding:"10px 16px",textAlign:"center",marginBottom:16,fontSize:13}}>
      🔒 <strong>Tipping er stengt</strong> — VM startet 11. juni 2026
    </div>
  );
  const d=Math.floor(diff/86400000), h=Math.floor((diff%86400000)/3600000),
        m=Math.floor((diff%3600000)/60000), s=Math.floor((diff%60000)/1000);
  return (
    <div style={{background:"rgba(41,100,89,0.2)",border:"1px solid rgba(41,100,89,0.4)",
      borderRadius:10,padding:"10px 16px",textAlign:"center",marginBottom:16}}>
      <div style={{fontSize:11,color:VMP_MINT,letterSpacing:1,textTransform:"uppercase"}}>Stenger om</div>
      <div style={{fontSize:22,fontWeight:800,color:VMP_GOLD}}>
        {d}d {String(h).padStart(2,"0")}t {String(m).padStart(2,"0")}m {String(s).padStart(2,"0")}s
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════
//  📋 REGISTRER
// ══════════════════════════════════════════════════
function RegisterView({ onRegister }) {
  const [name, setName] = useState("");
  const [tips, setTips] = useState({});
  const [bonus, setBonus] = useState({});
  const [step, setStep] = useState("info");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const locked = new Date() >= DEADLINE;

  const setTip = (id, val) => setTips(t=>({...t,[id]:val}));

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true); setError("");
    try {
      await sb.upsertByName("participants",[{name:name.trim(),tips,bonus}]);
      onRegister();
      setStep("done");
    } catch(e) { setError("Feil ved lagring: "+e.message); }
    finally { setSaving(false); }
  };

  if (locked && step!=="done") return (
    <Card title="Registrering stengt" icon="🔒">
      <p style={{color:"#aaa"}}>VM startet 11. juni — det er ikke lenger mulig å registrere eller endre tips.</p>
    </Card>
  );

  if (step==="info") return (
    <Card title="Registrer deg" icon="📋">
      <DeadlineBanner />
      <p style={{color:"#aaa",marginBottom:20}}>Delta i VM-tippekonkurransen for Vinmonopolet Økonomi!</p>
      <label style={labelStyle}>Ditt navn</label>
      <input value={name} onChange={e=>setName(e.target.value)} placeholder="Fornavn Etternavn"
        style={inputStyle} onKeyDown={e=>e.key==="Enter"&&name.trim()&&setStep("matches")} />
      <p style={{color:"#777",fontSize:12,marginBottom:16}}>
        Allerede registrert? Skriv nøyaktig samme navn for å oppdatere tipsene dine.
      </p>
      <Btn disabled={!name.trim()} onClick={()=>setStep("matches")}>Neste: Tippe kamper →</Btn>
    </Card>
  );

  if (step==="matches") {
    let lastGroup=null, lastPhase=null;
    return (
      <Card title={`⚽ Tippe kamper — ${name}`}>
        <p style={{color:"#aaa",fontSize:12,marginBottom:10}}>
          3p = eksakt resultat · 1p = riktig utfall · 0p = feil
        </p>
        <div style={{maxHeight:"58vh",overflowY:"auto",paddingRight:4}}>
          {ALL_MATCHES.map(m=>{
            const showG=m.phase==="group"&&m.group!==lastGroup;
            const showP=m.phase!=="group"&&m.phase!==lastPhase;
            if(showG) lastGroup=m.group;
            if(showP){lastPhase=m.phase;lastGroup=null;}
            return (
              <div key={m.id}>
                {showG&&<GroupHeader group={m.group}/>}
                {showP&&<PhaseHeader phase={m.phase}/>}
                <MatchRow match={m} tip={tips[m.id]} onChange={v=>setTip(m.id,v)}/>
              </div>
            );
          })}
        </div>
        <div style={{display:"flex",gap:8,marginTop:16}}>
          <Btn secondary onClick={()=>setStep("info")}>← Tilbake</Btn>
          <Btn onClick={()=>setStep("bonus")}>Neste: Bonusspørsmål →</Btn>
        </div>
      </Card>
    );
  }

  if (step==="bonus") return (
    <Card title="🎯 Bonusspørsmål">
      <p style={{color:"#aaa",fontSize:13,marginBottom:20}}>5 poeng per riktig svar.</p>
      {BONUS_QUESTIONS.map(q=>(
        <div key={q.id}>
          <label style={labelStyle}>{q.text}</label>
          <input type={q.type??"text"} value={bonus[q.id]??""} style={inputStyle}
            onChange={e=>setBonus(b=>({...b,[q.id]:e.target.value}))}/>
        </div>
      ))}
      {error&&<p style={{color:"#e07070",fontSize:13}}>{error}</p>}
      <div style={{display:"flex",gap:8}}>
        <Btn secondary onClick={()=>setStep("matches")}>← Tilbake</Btn>
        <Btn onClick={handleSubmit} disabled={saving}>{saving?"Lagrer...":"✅ Lever kupong!"}</Btn>
      </div>
    </Card>
  );

  return (
    <Card title="Kupong innlevert!" icon="🎉">
      <p style={{color:VMP_MINT,fontSize:18,marginBottom:8}}>Takk, <strong>{name}</strong>!</p>
      <p style={{color:"#aaa"}}>Din kupong er registrert. Lykke til — kampene starter 11. juni!</p>
    </Card>
  );
}

// ══════════════════════════════════════════════════
//  🏆 LEDERTAVLE
// ══════════════════════════════════════════════════
function LeaderboardView({ participants, results, bonusResults }) {
  const ranked = useMemo(()=>
    [...participants].map(p=>({...p,total:calcTotal(p,results,bonusResults)})).sort((a,b)=>b.total-a.total)
  ,[participants,results,bonusResults]);
  const medals=["🥇","🥈","🥉"];
  return (
    <Card title="Ledertavle" icon="🏆">
      {ranked.length===0&&<p style={{color:"#888"}}>Ingen deltakere ennå — vær den første!</p>}
      {ranked.map((p,i)=>(
        <div key={p.name} style={{
          display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:"12px 16px",marginBottom:8,borderRadius:10,
          background:i===0?"rgba(240,192,90,0.1)":"rgba(255,255,255,0.03)",
          border:i===0?"1px solid rgba(240,192,90,0.3)":"1px solid rgba(255,255,255,0.07)"
        }}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:22,width:30,textAlign:"center"}}>{medals[i]??`${i+1}.`}</span>
            <div>
              <div style={{fontWeight:700,fontSize:16}}>{p.name}</div>
              <div style={{fontSize:11,color:"#666"}}>
                {ALL_MATCHES.filter(m=>results[m.id]?.home!==undefined).length} av {ALL_MATCHES.length} kamper spilt
              </div>
            </div>
          </div>
          <span style={{fontSize:24,fontWeight:800,
            color:i===0?VMP_GOLD:i===1?"#c0c0c0":i===2?"#cd7f32":"#fff"}}>
            {p.total}p
          </span>
        </div>
      ))}
    </Card>
  );
}

// ══════════════════════════════════════════════════
//  📄 MINE TIPS
// ══════════════════════════════════════════════════
function MyTipsView({ participants, results, bonusResults }) {
  const [search, setSearch] = useState("");
  const found = participants.find(p=>p.name.toLowerCase().includes(search.toLowerCase()));
  let lastGroup=null,lastPhase=null;
  return (
    <Card title="Mine tips" icon="📄">
      <label style={labelStyle}>Finn deg selv</label>
      <input value={search} onChange={e=>setSearch(e.target.value)}
        placeholder="Søk på navn..." style={inputStyle}/>
      {search&&!found&&<p style={{color:"#e07070",fontSize:13}}>Ingen treff.</p>}
      {found&&(
        <div>
          <div style={{
            display:"flex",justifyContent:"space-between",alignItems:"center",
            background:"rgba(41,100,89,0.15)",borderRadius:10,padding:"12px 16px",marginBottom:16
          }}>
            <span style={{fontWeight:700,fontSize:18}}>{found.name}</span>
            <span style={{fontWeight:800,fontSize:22,color:VMP_GOLD}}>
              {calcTotal(found,results,bonusResults)}p
            </span>
          </div>
          <div style={{maxHeight:"55vh",overflowY:"auto"}}>
            {ALL_MATCHES.map(m=>{
              const showG=m.phase==="group"&&m.group!==lastGroup;
              const showP=m.phase!=="group"&&m.phase!==lastPhase;
              if(showG) lastGroup=m.group;
              if(showP){lastPhase=m.phase;lastGroup=null;}
              return (
                <div key={m.id}>
                  {showG&&<GroupHeader group={m.group}/>}
                  {showP&&<PhaseHeader phase={m.phase}/>}
                  <MatchRow match={m} tip={found.tips?.[m.id]} result={results[m.id]} readOnly/>
                </div>
              );
            })}
            <div style={{marginTop:20}}>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:2,color:VMP_GOLD,
                textTransform:"uppercase",marginBottom:8}}>Bonusspørsmål</div>
              {BONUS_QUESTIONS.map(q=>{
                const tip=found.bonus?.[q.id];
                const ans=bonusResults[q.id]?.answer;
                const correct=ans&&scoreBonus(tip,ans)>0;
                return (
                  <div key={q.id} style={{display:"flex",justifyContent:"space-between",
                    padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.05)",fontSize:13}}>
                    <span style={{color:"#aaa",flex:1}}>{q.text}</span>
                    <span style={{color:correct?VMP_GOLD:ans?"#e07070":"#fff",marginLeft:12}}>
                      {tip||"–"}{ans?` ${correct?"✅ 5p":"❌"}`:""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

// ══════════════════════════════════════════════════
//  ⚙️ ADMIN
// ══════════════════════════════════════════════════
function AdminView({ results, setResults, bonusResults, setBonusResults, participants, reload }) {
  const [pin,setPin]=useState(""), [authed,setAuthed]=useState(false);
  const [tab,setTab]=useState("matches"), [saving,setSaving]=useState({});
  let lastGroup=null,lastPhase=null;

  if (!authed) return (
    <Card title="Admin" icon="🔐">
      <label style={labelStyle}>PIN-kode</label>
      <input type="password" value={pin} onChange={e=>setPin(e.target.value)} style={inputStyle}
        placeholder="Skriv PIN..." onKeyDown={e=>e.key==="Enter"&&(pin===ADMIN_PIN?setAuthed(true):alert("Feil PIN"))}/>
      <Btn onClick={()=>pin===ADMIN_PIN?setAuthed(true):alert("Feil PIN")}>Logg inn</Btn>
      <p style={{color:"#555",fontSize:12,marginTop:8}}>Standard PIN: vm2026</p>
    </Card>
  );

  const saveResult = async (id,field,val) => {
    const current=results[id]||{home:"",away:""};
    const updated={...current,[field]:val};
    setResults(r=>({...r,[id]:updated}));
    setSaving(s=>({...s,[id]:true}));
    try { await sb.upsert("results",[{id,home:updated.home,away:updated.away}]); }
    catch(e){console.error(e);}
    setTimeout(()=>setSaving(s=>({...s,[id]:false})),800);
  };

  const saveBonusResult = async (id,val) => {
    setBonusResults(b=>({...b,[id]:{answer:val}}));
    try { await sb.upsert("bonus_results",[{id,answer:val}]); }
    catch(e){console.error(e);}
  };

  return (
    <Card title="Admin — Legg inn resultater" icon="⚙️">
      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
        {["matches","bonus","stats"].map(t=>(
          <Btn key={t} secondary={tab!==t} small onClick={()=>setTab(t)}>
            {t==="matches"?"⚽ Kamper":t==="bonus"?"🎯 Bonus":"📊 Statistikk"}
          </Btn>
        ))}
        <Btn secondary small onClick={reload}>🔄 Oppdater</Btn>
      </div>

      {tab==="matches"&&(
        <div style={{maxHeight:"62vh",overflowY:"auto",paddingRight:4}}>
          {ALL_MATCHES.map(m=>{
            const showG=m.phase==="group"&&m.group!==lastGroup;
            const showP=m.phase!=="group"&&m.phase!==lastPhase;
            if(showG) lastGroup=m.group;
            if(showP){lastPhase=m.phase;lastGroup=null;}
            const r=results[m.id]||{};
            return (
              <div key={m.id}>
                {showG&&<GroupHeader group={m.group}/>}
                {showP&&<PhaseHeader phase={m.phase}/>}
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",
                  borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                  <span style={{fontSize:12,color:"#888",flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {m.phase==="group"?`${f(m.home)} ${m.home} – ${m.away} ${f(m.away)}`:m.label}
                  </span>
                  <ScoreInput val={r.home??""} onChange={v=>saveResult(m.id,"home",v)}/>
                  <span style={{color:"#555",fontSize:12}}>–</span>
                  <ScoreInput val={r.away??""} onChange={v=>saveResult(m.id,"away",v)}/>
                  {saving[m.id]&&<span style={{fontSize:11,color:VMP_MINT,width:14}}>✓</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab==="bonus"&&BONUS_QUESTIONS.map(q=>(
        <div key={q.id}>
          <label style={labelStyle}>{q.text} — fasit</label>
          <input type={q.type??"text"} value={bonusResults[q.id]?.answer??""} style={inputStyle}
            onChange={e=>saveBonusResult(q.id,e.target.value)}/>
        </div>
      ))}

      {tab==="stats"&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
            {[
              ["Deltakere",participants.length],
              ["Kamper med resultat",`${Object.keys(results).length} / ${ALL_MATCHES.length}`],
              ["Bonus fasit satt",Object.keys(bonusResults).length],
              ["Kamper igjen",ALL_MATCHES.length-Object.keys(results).length],
            ].map(([l,v])=>(
              <div key={l} style={{background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"12px 14px"}}>
                <div style={{fontSize:11,color:VMP_MINT,letterSpacing:1,textTransform:"uppercase"}}>{l}</div>
                <div style={{fontSize:22,fontWeight:800}}>{v}</div>
              </div>
            ))}
          </div>
          {[...participants]
            .map(p=>({...p,total:calcTotal(p,results,bonusResults)}))
            .sort((a,b)=>b.total-a.total)
            .map((p,i)=>(
              <div key={p.name} style={{display:"flex",justifyContent:"space-between",
                fontSize:13,padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                <span style={{color:"#ccc"}}>{i+1}. {p.name}</span>
                <span style={{fontWeight:700,color:VMP_GOLD}}>{p.total}p</span>
              </div>
            ))
          }
        </div>
      )}
    </Card>
  );
}

// ══════════════════════════════════════════════════
//  🚀 APP ROOT
// ══════════════════════════════════════════════════
const NAV=[
  {id:"register",label:"📋 Registrer"},
  {id:"leaderboard",label:"🏆 Ledertavle"},
  {id:"mytips",label:"📄 Mine tips"},
  {id:"admin",label:"⚙️ Admin"},
];

export default function App() {
  const [view,setView]=useState("leaderboard");
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
      setResults(Object.fromEntries(res.map(r=>[r.id,{home:r.home,away:r.away}])));
      setBonusResults(Object.fromEntries(bonus.map(b=>[b.id,{answer:b.answer}])));
      setDbError(false);
    } catch(e){console.error(e);setDbError(true);}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{loadData();},[loadData]);
  useEffect(()=>{const t=setInterval(loadData,30000);return()=>clearInterval(t);},[loadData]);

  return (
    <div style={{
      minHeight:"100vh",
      background:`linear-gradient(135deg, ${VMP_DARK} 0%, #1b2b1e 50%, #253625 100%)`,
      fontFamily:"'Georgia',serif", color:"#fff", paddingBottom:80
    }}>
      <div style={{
        background:"rgba(9,37,41,0.92)",backdropFilter:"blur(12px)",
        borderBottom:"1px solid rgba(255,255,255,0.08)",
        padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",
        position:"sticky",top:0,zIndex:20
      }}>
        <div>
          <div style={{fontSize:10,letterSpacing:3,color:VMP_MINT,textTransform:"uppercase",fontWeight:700}}>
            Vinmonopolet Økonomi
          </div>
          <div style={{fontSize:20,fontWeight:800}}>⚽ VM 2026 Tipping</div>
        </div>
        <div>
          {!loading&&!dbError&&(
            <div style={{background:"rgba(240,192,90,0.15)",border:"1px solid rgba(240,192,90,0.3)",
              borderRadius:8,padding:"4px 12px",fontSize:12,color:VMP_GOLD,fontWeight:700}}>
              {participants.length} deltakere
            </div>
          )}
          {dbError&&(
            <div style={{background:"rgba(139,32,32,0.3)",border:"1px solid rgba(200,50,50,0.4)",
              borderRadius:8,padding:"4px 12px",fontSize:11,color:"#e07070"}}>
              ⚠️ DB-feil
            </div>
          )}
        </div>
      </div>

      <div style={{display:"flex",justifyContent:"center",gap:4,padding:"14px 12px 0",flexWrap:"wrap"}}>
        {NAV.map(n=>(
          <button key={n.id} onClick={()=>setView(n.id)} style={{
            padding:"8px 16px",borderRadius:8,border:"none",cursor:"pointer",
            fontFamily:"'Georgia',serif",fontSize:13,fontWeight:700,transition:"all 0.15s",
            background:view===n.id?VMP_TEAL:"rgba(255,255,255,0.07)",
            color:view===n.id?"#fff":"#aaa"
          }}>{n.label}</button>
        ))}
      </div>

      <div style={{padding:"20px 12px"}}>
        {loading?(
          <div style={{textAlign:"center",color:"#888",marginTop:60}}>
            <div style={{fontSize:40,marginBottom:12}}>⚽</div>
            <div>Kobler til database...</div>
          </div>
        ):dbError?(
          <Card title="Ikke koblet til database" icon="⚠️">
            <p style={{color:"#aaa",lineHeight:1.8}}>
              Fyll inn <strong style={{color:VMP_MINT}}>SUPABASE_URL</strong> og{" "}
              <strong style={{color:VMP_MINT}}>SUPABASE_ANON_KEY</strong> øverst i <code>App.jsx</code>.
            </p>
          </Card>
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
