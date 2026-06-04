import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { C, ipt, Btn, FormPDV, BottomNav, StatCard, TODAY, daysSince, fmtDate, fmtTime, fromDB, TIPO_LABEL, ORDER, visitStatus } from "./ui";

export default function AdminView({ onLogout }) {
  const [aba, setAba]             = useState("geral");
  const [stores, setStores]       = useState(null);
  const [visitas, setVisitas]     = useState([]);
  const [rotas, setRotas]         = useState([]);
  const [rotaAtiva, setRotaAtiva] = useState(null);
  const [erro, setErro]           = useState(null);
  const [showAdd, setShowAdd]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [selectedPdv, setSelectedPdv]   = useState(null);
  const [searchPdv, setSearchPdv]       = useState("");
  const [novaRota, setNovaRota]         = useState("");
  const [editRota, setEditRota]         = useState(null);
  const [confirmDelRota, setConfirmDelRota] = useState(null);
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [confirmDelPdv, setConfirmDelPdv] = useState(null);
  const [agenda, setAgenda]           = useState([]);
  const [calYear, setCalYear]         = useState(new Date().getFullYear());
  const [calMonth, setCalMonth]       = useState(new Date().getMonth());
  const [diaAberto, setDiaAberto]     = useState(null);
  const [novaRotaDia, setNovaRotaDia] = useState("");
  const [savingAgenda, setSavingAgenda] = useState(false);
  const [filterPdv, setFilterPdv]     = useState("todos");
  const [filterRotaId, setFilterRotaId] = useState("");
  const [expandedRota, setExpandedRota] = useState(null);
  const [confirmDesativar, setConfirmDesativar] = useState(false);
  const [layout, setLayout]           = useState(() => localStorage.getItem("admin_layout")||"mobile");
  const [editPdv, setEditPdv]         = useState(null);

  const changeLayout = (l) => { setLayout(l); localStorage.setItem("admin_layout", l); };

  const carregar = useCallback(async () => {
    const [pdvs, vis, rts, ativa, ag] = await Promise.all([
      supabase.from("pdvs").select("*").order("criado_em",{ascending:true}),
      supabase.from("visitas").select("*").order("criado_em",{ascending:false}),
      supabase.from("rotas").select("*").order("nome",{ascending:true}),
      supabase.from("rota_ativa").select("*").eq("id",1).single(),
      supabase.from("agenda").select("*"),
    ]);
    if(pdvs.error){ setErro(pdvs.error.message); return; }
    setStores((pdvs.data||[]).map(fromDB));
    setVisitas(vis.data||[]);
    setRotas(rts.data||[]);
    const ativaHoje = ativa.data?.rota_id && ativa.data?.ativada_em?.startsWith(TODAY);
    setRotaAtiva(ativaHoje ? ativa.data.rota_id : null);
    setAgenda(ag.data||[]);
  }, []);

  useEffect(() => {
    carregar();
    const ch = supabase.channel("admin-changes")
      .on("postgres_changes",{event:"*",schema:"public",table:"pdvs"},()=>carregar())
      .on("postgres_changes",{event:"*",schema:"public",table:"visitas"},()=>carregar())
      .on("postgres_changes",{event:"*",schema:"public",table:"rotas"},()=>carregar())
      .on("postgres_changes",{event:"*",schema:"public",table:"rota_ativa"},()=>carregar())
      .on("postgres_changes",{event:"*",schema:"public",table:"agenda"},()=>carregar())
      .subscribe();
    return ()=>supabase.removeChannel(ch);
  }, [carregar]);

  const adicionar = useCallback(async (form) => {
    setSaving(true);
    const { error } = await supabase.from("pdvs").insert([{
      id:Date.now().toString(), nome:form.nome.trim(), endereco:form.end.trim(),
      cep:form.cep.replace(/\D/g,""), tipo:form.tipo, prioridade:form.prio,
      vendeu_dot:false, ultima_visita:null, obs:"", rota_id:form.rotaId||null,
      comprador: form.comprador||"",
    }]);
    if(error) setErro(error.message); else setShowAdd(false);
    setSaving(false);
  }, []);

  const editarPdv = useCallback(async (id, form) => {
    setSaving(true);
    const { error } = await supabase.from("pdvs").update({
      nome:form.nome.trim(), endereco:form.end.trim(),
      cep:form.cep.replace(/\D/g,""), tipo:form.tipo,
      prioridade:form.prio, rota_id:form.rotaId||null,
      comprador:form.comprador||"",
    }).eq("id",id);
    if(error) setErro(error.message); else setEditPdv(null);
    setSaving(false);
  }, []);

  const adicionarRota = useCallback(async () => {
    if(!novaRota.trim()) return;
    const { error } = await supabase.from("rotas").insert([{id:Date.now().toString(),nome:novaRota.trim()}]);
    if(error) setErro(error.message); else setNovaRota("");
  }, [novaRota]);

  const renomearRota = useCallback(async (id, nome) => {
    if(!nome.trim()) return;
    const { error } = await supabase.from("rotas").update({nome:nome.trim()}).eq("id",id);
    if(error) setErro(error.message); else setEditRota(null);
  }, []);

  const removerRota = useCallback(async (id) => {
    await supabase.from("pdvs").update({rota_id:null}).eq("rota_id",id);
    if(rotaAtiva===id) await supabase.from("rota_ativa").update({rota_id:null}).eq("id",1);
    const { error } = await supabase.from("rotas").delete().eq("id",id);
    if(error) setErro(error.message); else setConfirmDelRota(null);
  }, [rotaAtiva]);

  const removerPdv = useCallback(async (id) => {
    const { error } = await supabase.from("pdvs").delete().eq("id",id);
    if(error) setErro(error.message); else { setSelectedPdv(null); setConfirmDelPdv(null); }
  }, []);

  const ativarRota = useCallback(async (id) => {
    const { error } = await supabase.from("rota_ativa").update({rota_id:id,ativada_em:new Date().toISOString()}).eq("id",1);
    if(error) setErro(error.message);
  }, []);

  const desativarRota = useCallback(async () => {
    const { error } = await supabase.from("rota_ativa").update({rota_id:null,ativada_em:null}).eq("id",1);
    if(error) setErro(error.message); else setConfirmDesativar(false);
  }, []);

  const adicionarRotaDia = useCallback(async (data, rotaId) => {
    if (!rotaId) return;
    const jaExiste = agenda.some(a => a.data === data && a.rota_id === rotaId);
    if (jaExiste) return;
    setSavingAgenda(true);
    await supabase.from("agenda").insert([{id:Date.now().toString(), data, rota_id:rotaId, ordem:0}]);
    setSavingAgenda(false);
    setNovaRotaDia("");
    await carregar();
  }, [agenda, carregar]);

  const removerRotaDia = useCallback(async (id) => {
    await supabase.from("agenda").delete().eq("id", id);
    await carregar();
  }, [carregar]);

  if (!stores) return (
    <div style={{ background:C.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:28, height:28, border:"3px solid #eaecf0", borderTopColor:C.blue, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (erro) return (
    <div style={{ background:C.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12, padding:"2rem", textAlign:"center" }}>
      <div style={{ fontSize:32 }}>⚠️</div>
      <div style={{ fontSize:14, color:C.red, lineHeight:1.6 }}>{erro}</div>
      <Btn variant="ghost" style={{padding:"10px 20px"}} onClick={()=>{setErro(null);carregar();}}>Tentar novamente</Btn>
    </div>
  );

  // ── Derived values ──
  const agendaHoje    = agenda.filter(a=>a.data===TODAY);
  const rotaEfetiva   = agendaHoje[0]?.rota_id || rotaAtiva;
  const rotaAtivaObj  = rotas.find(r=>r.id===rotaEfetiva);
  const pdvsRotaAtiva = stores.filter(s=>s.rotaId===rotaEfetiva);
  const visitadosHoje = pdvsRotaAtiva.filter(s=>daysSince(s.visita)===0).length;
  const visitasPorPdv = {};
  for (const v of visitas) { if(!visitasPorPdv[v.pdv_id])visitasPorPdv[v.pdv_id]=[]; visitasPorPdv[v.pdv_id].push(v); }
  const visitasDoDia    = visitas.filter(v=>v.data===selectedDate);
  const visitasDoDiaIds = new Set(visitasDoDia.map(v=>v.pdv_id));
  const prevDay = () => { const d=new Date(selectedDate+"T12:00:00"); d.setDate(d.getDate()-1); setSelectedDate(d.toISOString().split("T")[0]); };
  const nextDay = () => { const d=new Date(selectedDate+"T12:00:00"); d.setDate(d.getDate()+1); setSelectedDate(d.toISOString().split("T")[0]); };
  const neverVisited   = stores.filter(s=>!s.visita).length;
  const selectedPdvObj = selectedPdv ? stores.find(s=>s.id===selectedPdv) : null;

  // ── Mobile tabs (no Pendentes) ──
  const TABS = [
    ["geral","ti-chart-bar","Geral"],
    ["historico","ti-calendar","Dia"],
    ["pdvs","ti-building-store","PDVs"],
    ["rotas","ti-map-pin","Rotas"],
    ["consig","ti-package","Consig."],
    ["agenda","ti-calendar-month","Agenda"],
  ];

  const TAB_TITLES = {
    geral:"Geral", historico:"Histórico", pdvs:"PDVs",
    rotas:"Rotas", consig:"Consignados", agenda:"Agenda Mensal",
  };

  const LayoutToggle = () => (
    <div style={{display:"flex",gap:3}}>
      {[["desktop","ti-layout-sidebar","Desktop"],["mobile","ti-device-mobile","Mobile"]].map(([l,icon,lbl])=>(
        <button key={l} onClick={()=>changeLayout(l)} style={{
          display:"flex",alignItems:"center",gap:4,padding:"6px 10px",
          borderRadius:8,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,
          fontFamily:"inherit",
          background:layout===l?C.blue:"#f0f2f5",
          color:layout===l?"#fff":C.muted,
        }}>
          <i className={`ti ${icon}`} style={{fontSize:13}}/>
          {lbl}
        </button>
      ))}
    </div>
  );

  // ── Tab content (shared between desktop and mobile) ──
  const tabContent = (
    <>
      {/* ── ABA GERAL ── */}
      {aba==="geral"&&(
        <div style={{padding:"1rem"}}>
          <div style={{background:"linear-gradient(135deg,#1b3a8c,#2d52b8)",borderRadius:20,padding:"18px 20px",marginBottom:16,color:"#fff"}}>
            <p style={{margin:"0 0 4px",fontSize:10,opacity:0.7,letterSpacing:"0.08em"}}>ROTA ATIVA HOJE</p>
            {rotaAtivaObj ? (
              <>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <p style={{margin:0,fontSize:16,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>📍 {rotaAtivaObj.nome}</p>
                  <p style={{margin:0,fontSize:28,fontWeight:700,color:visitadosHoje===pdvsRotaAtiva.length&&pdvsRotaAtiva.length>0?"#a7f3d0":"#f5c800"}}>
                    {pdvsRotaAtiva.length>0?Math.round((visitadosHoje/pdvsRotaAtiva.length)*100):0}%
                  </p>
                </div>
                <p style={{margin:"0 0 8px",fontSize:12,opacity:0.7}}>{visitadosHoje} de {pdvsRotaAtiva.length} visitados</p>
                {pdvsRotaAtiva.length>0&&(
                  <div style={{height:4,background:"rgba(255,255,255,0.2)",borderRadius:99}}>
                    <div style={{height:"100%",width:`${(visitadosHoje/pdvsRotaAtiva.length)*100}%`,background:"#f5c800",borderRadius:99,transition:"width 0.4s"}}/>
                  </div>
                )}
              </>
            ) : <p style={{margin:0,fontSize:14,opacity:0.7}}>Nenhuma rota ativa.</p>}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
            <StatCard iconClass="ti-building-store" iconColor="#2563eb" iconBg="#eff6ff" value={stores.length} label="Total de PDVs"/>
            <StatCard iconClass="ti-circle-check" iconColor="#16a34a" iconBg="#f0fdf4" value={visitas.filter(v=>v.data===TODAY).length} label="Visitas hoje"/>
            <StatCard iconClass="ti-calendar-week" iconColor="#d97706" iconBg="#fffbeb" value={visitas.filter(v=>{const d=daysSince(v.data);return d!==null&&d<=6;}).length} label="Esta semana"/>
            <StatCard iconClass="ti-alert-triangle" iconColor="#dc2626" iconBg="#fef2f2" value={neverVisited} label="Nunca visitados"/>
          </div>

          {(()=>{
            const urgentes=stores.filter(s=>s.consignado&&(s.visita===null||daysSince(s.visita)>14));
            if(!urgentes.length) return null;
            return (
              <div style={{background:C.white,borderRadius:16,padding:14,marginBottom:16,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",border:"1px solid #fca5a5"}}>
                <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:C.red,textTransform:"uppercase",letterSpacing:"0.06em"}}>⚠️ Consignados sem retorno</p>
                {urgentes.map(s=>{
                  const d=s.visita?daysSince(s.visita):null;
                  return (
                    <div key={s.id} style={{padding:"9px 0",borderBottom:"1px solid #f3f4f6",display:"flex",justifyContent:"space-between"}}>
                      <div>
                        <p style={{margin:"0 0 2px",fontSize:13,fontWeight:600,color:C.text,textTransform:"capitalize"}}>{s.nome.toLowerCase()}</p>
                        <p style={{margin:0,fontSize:11,color:C.muted}}>{s.end}</p>
                      </div>
                      <span style={{fontSize:12,fontWeight:700,color:C.red,flexShrink:0,marginLeft:8}}>{d!=null?`${d}d`:"nunca"}</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {(()=>{
            const today=new Date(TODAY+"T12:00:00"),dow=today.getDay(),mondayOff=dow===0?-6:1-dow;
            const weekDays=Array(7).fill(null).map((_,i)=>{const d=new Date(today);d.setDate(d.getDate()+mondayOff+i);return d.toISOString().split("T")[0];});
            const DAY_LABELS=["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];
            const counts=weekDays.map(d=>visitas.filter(v=>v.data===d).length);
            const maxC=Math.max(...counts,1);
            return (
              <div style={{background:C.white,borderRadius:16,padding:14,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",marginBottom:16}}>
                <p style={{margin:"0 0 14px",fontSize:12,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em"}}>Visitas esta semana</p>
                <div style={{display:"flex",alignItems:"flex-end",gap:6}}>
                  {weekDays.map((d,i)=>{
                    const isT=d===TODAY,cnt=counts[i],h=Math.round((cnt/maxC)*60);
                    return (
                      <div key={d} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                        <span style={{fontSize:10,fontWeight:700,color:isT?C.amber:C.muted,minHeight:14}}>{cnt>0?cnt:""}</span>
                        <div style={{width:"100%",height:60,display:"flex",alignItems:"flex-end"}}>
                          <div style={{width:"100%",height:h||3,borderRadius:4,background:isT?C.yellow:C.blue,minHeight:3}}/>
                        </div>
                        <span style={{fontSize:9,color:isT?C.text:C.muted,fontWeight:isT?700:400}}>{DAY_LABELS[i]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {rotaAtivaObj&&pdvsRotaAtiva.length>0&&(
            <div style={{background:C.white,borderRadius:16,padding:"14px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
              <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em"}}>Pendentes na rota</p>
              {pdvsRotaAtiva.filter(s=>daysSince(s.visita)!==0).length===0 ? (
                <p style={{margin:0,textAlign:"center",color:C.green,fontSize:13,fontWeight:600,padding:"8px 0"}}>🎉 Todos visitados hoje!</p>
              ) : pdvsRotaAtiva.filter(s=>daysSince(s.visita)!==0).map(s=>(
                <div key={s.id} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid #f3f4f6"}}>
                  <span style={{fontSize:13,color:C.text}}>{s.nome}</span>
                  <span style={{fontSize:12,color:C.muted}}>{s.visita?`${daysSince(s.visita)}d atrás`:"nunca"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ABA HISTÓRICO ── */}
      {aba==="historico"&&(
        <div style={{padding:"1rem"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
            <Btn variant="ghost" style={{padding:"10px 16px",fontSize:18}} onClick={prevDay}>‹</Btn>
            <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}
              style={{...ipt,flex:1,textAlign:"center",padding:"10px 8px",background:C.white}}/>
            <Btn variant="ghost" style={{padding:"10px 16px",fontSize:18}} onClick={nextDay}>›</Btn>
          </div>
          {selectedDate!==TODAY&&(
            <Btn variant="ghost" style={{width:"100%",padding:"8px 0",fontSize:12,marginBottom:14}} onClick={()=>setSelectedDate(TODAY)}>Ir para hoje</Btn>
          )}
          {visitasDoDia.length===0 ? (
            <div style={{textAlign:"center",padding:"3rem 1rem"}}>
              <i className="ti ti-clipboard" style={{fontSize:48,color:"#d1d5db"}}/>
              <p style={{color:C.muted,fontSize:14,marginTop:10}}>Nenhuma visita em {fmtDate(selectedDate)||selectedDate}.</p>
            </div>
          ) : (
            <>
              <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:C.blue,textTransform:"uppercase",letterSpacing:"0.06em"}}>
                Visitados — {fmtDate(selectedDate)||selectedDate} ({visitasDoDia.length})
              </p>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {visitasDoDia.map(v=>{
                  const pdv=stores.find(s=>s.id===v.pdv_id);
                  return (
                    <div key={v.id} style={{background:C.white,borderRadius:14,padding:"13px 15px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                        <div style={{flex:1}}>
                          <p style={{margin:"0 0 2px",fontSize:14,fontWeight:700,color:C.text}}>{pdv?.nome||"PDV removido"}</p>
                          {pdv&&<p style={{margin:"0 0 6px",fontSize:11,color:C.muted}}>{pdv.end}</p>}
                          {v.obs&&<p style={{margin:0,fontSize:12,color:C.muted,fontStyle:"italic"}}>"{v.obs}"</p>}
                        </div>
                        <span style={{fontSize:11,color:C.muted,fontFamily:"monospace"}}>{fmtTime(v.criado_em)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {rotaAtivaObj&&selectedDate===TODAY&&pdvsRotaAtiva.filter(s=>!visitasDoDiaIds.has(s.id)).length>0&&(
                <div style={{marginTop:16}}>
                  <p style={{margin:"0 0 8px",fontSize:12,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em"}}>
                    Não visitados ({pdvsRotaAtiva.filter(s=>!visitasDoDiaIds.has(s.id)).length})
                  </p>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {pdvsRotaAtiva.filter(s=>!visitasDoDiaIds.has(s.id)).map(s=>(
                      <div key={s.id} style={{background:C.white,borderRadius:12,padding:"11px 14px",boxShadow:"0 1px 4px rgba(0,0,0,0.05)",borderLeft:`3px solid ${C.redDim}`,display:"flex",justifyContent:"space-between"}}>
                        <span style={{fontSize:13,color:C.text}}>{s.nome}</span>
                        <span style={{fontSize:11,color:C.muted}}>{s.visita?`${daysSince(s.visita)}d atrás`:"nunca"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── ABA PDVs ── */}
      {aba==="pdvs"&&(
        <div style={{padding:"1rem"}}>
          {showAdd&&(
            <div style={{background:C.white,borderRadius:16,padding:"16px",marginBottom:14,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
              <p style={{margin:"0 0 14px",fontSize:12,fontWeight:700,color:C.blue,textTransform:"uppercase",letterSpacing:"0.08em"}}>Novo PDV</p>
              <FormPDV initial={{nome:"",end:"",cep:"",tipo:"facu",prio:0,rotaId:null,comprador:""}} onSave={adicionar} onCancel={()=>setShowAdd(false)} saving={saving} rotas={rotas}/>
            </div>
          )}
          <input type="text" placeholder="Buscar PDV…" value={searchPdv}
            onChange={e=>{setSearchPdv(e.target.value);setSelectedPdv(null);}}
            style={{...ipt,marginBottom:8,background:C.white,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}/>
          <select value={filterRotaId} onChange={e=>{setFilterRotaId(e.target.value);setSelectedPdv(null);}}
            style={{...ipt,marginBottom:12,background:C.white,boxShadow:"0 1px 4px rgba(0,0,0,0.06)",padding:"10px 14px"}}>
            <option value="">Todas as rotas</option>
            {rotas.map(r=><option key={r.id} value={r.id}>{r.nome}</option>)}
          </select>
          <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
            {[["todos","Todos"],["vende","Vende Dot"],["naovende","Não vende"],["consig","Com consig."]].map(([v,l])=>(
              <button key={v} onClick={()=>setFilterPdv(v)} style={{
                padding:"7px 12px",fontSize:11,cursor:"pointer",borderRadius:99,border:"none",fontFamily:"inherit",
                fontWeight:filterPdv===v?600:400,
                background:filterPdv===v?C.blue:"#f5f6fa",
                color:filterPdv===v?"#fff":C.muted,
              }}>{l}</button>
            ))}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {stores
              .filter(s=>{
                const q=searchPdv.toLowerCase();
                const textMatch=!q||s.nome.toLowerCase().includes(q)||(s.end||"").toLowerCase().includes(q);
                const rotaMatch=!filterRotaId||s.rotaId===filterRotaId;
                if(filterPdv==="vende")    return textMatch&&rotaMatch&&s.vendeu;
                if(filterPdv==="naovende") return textMatch&&rotaMatch&&!s.vendeu;
                if(filterPdv==="consig")   return textMatch&&rotaMatch&&s.consignado;
                return textMatch&&rotaMatch;
              })
              .sort((a,b)=>ORDER[visitStatus(a.visita)]-ORDER[visitStatus(b.visita)])
              .map(s=>{
                const hist=visitasPorPdv[s.id]||[],isSelected=selectedPdv===s.id;
                const d=s.visita?daysSince(s.visita):null;
                const color=!s.visita?C.muted:d===0?C.green:d<=14?C.amber:C.red;
                return (
                  <div key={s.id} style={{background:C.white,borderRadius:14,borderLeft:`4px solid ${color}`,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",overflow:"hidden",
                    outline:layout==="desktop"&&isSelected?`2px solid ${C.blue}`:"none"}}>
                    <div style={{padding:"13px 14px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}
                      onClick={()=>setSelectedPdv(isSelected?null:s.id)}>
                      <div style={{flex:1}}>
                        <p style={{margin:"0 0 2px",fontSize:14,fontWeight:700,color:C.text,textTransform:"capitalize"}}>{s.nome}</p>
                        <p style={{margin:0,fontSize:11,color:C.muted}}>{TIPO_LABEL[s.tipo]} · {s.end}</p>
                      </div>
                      <div style={{textAlign:"right",marginLeft:8}}>
                        <p style={{margin:"0 0 2px",fontSize:13,fontWeight:700,color}}>{d!==null?d===0?"hoje":`${d}d atrás`:"nunca"}</p>
                        <p style={{margin:0,fontSize:10,color:C.muted}}>{hist.length} visita{hist.length!==1?"s":""}</p>
                      </div>
                    </div>
                    {isSelected&&layout==="mobile"&&(
                      <div style={{padding:"0 14px 14px",borderTop:"1px solid #f3f4f6"}}>
                        {s.obs&&<p style={{margin:"10px 0 8px",fontSize:12,color:C.muted,borderBottom:"1px solid #f3f4f6",paddingBottom:8}}><span style={{color:C.grayDim,fontSize:10}}>OBS: </span>{s.obs}</p>}
                        {hist.length===0 ? (
                          <p style={{margin:"12px 0 0",textAlign:"center",color:C.muted,fontSize:12}}>Nenhuma visita registrada.</p>
                        ) : (
                          <>
                            <p style={{margin:"10px 0 6px",fontSize:10,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Histórico</p>
                            <div style={{display:"flex",flexDirection:"column",gap:4}}>
                              {hist.map(v=>(
                                <div key={v.id} style={{fontSize:12,padding:"8px 10px",background:"#f8f9fa",borderRadius:8,display:"flex",gap:8,alignItems:"flex-start"}}>
                                  <span style={{color:C.blue,fontWeight:700,fontFamily:"monospace",flexShrink:0}}>{fmtDate(v.data)}</span>
                                  <span style={{color:C.muted,fontSize:10,flexShrink:0}}>{fmtTime(v.criado_em)}</span>
                                  {v.obs?<span style={{color:C.muted}}>{v.obs}</span>:<span style={{color:C.grayDim,fontStyle:"italic"}}>sem obs.</span>}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                        <div style={{marginTop:12,borderTop:"1px solid #f3f4f6",paddingTop:10,display:"flex",gap:6,justifyContent:"flex-end"}}>
                          {confirmDelPdv===s.id ? (
                            <>
                              <Btn variant="danger" style={{padding:"8px 14px",fontSize:12}} onClick={()=>removerPdv(s.id)}>Confirmar exclusão</Btn>
                              <Btn variant="ghost" style={{padding:"8px 10px",fontSize:12}} onClick={()=>setConfirmDelPdv(null)}>✕</Btn>
                            </>
                          ) : (
                            <Btn variant="danger" style={{padding:"8px 12px",fontSize:12}} onClick={()=>setConfirmDelPdv(s.id)}>🗑 Excluir PDV</Btn>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ── ABA ROTAS ── */}
      {aba==="rotas"&&(
        <div style={{padding:"1rem"}}>
          <div style={{background:C.white,borderRadius:16,padding:"16px",marginBottom:14,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
            <p style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:C.blue,textTransform:"uppercase",letterSpacing:"0.08em"}}>Nova Rota</p>
            <div style={{display:"flex",gap:8}}>
              <input placeholder="Ex: Paulista, Itaim…" value={novaRota} onChange={e=>setNovaRota(e.target.value)} onKeyDown={e=>e.key==="Enter"&&adicionarRota()} style={ipt}/>
              <Btn variant={novaRota.trim()?"blue":"ghost"} style={{padding:"11px 18px",opacity:novaRota.trim()?1:0.4}} onClick={adicionarRota}>+</Btn>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {rotas.length===0 ? (
              <div style={{textAlign:"center",padding:"3rem 0"}}>
                <i className="ti ti-clipboard" style={{fontSize:48,color:"#d1d5db"}}/>
                <p style={{color:C.muted,fontSize:14,marginTop:10}}>Nenhuma rota criada ainda.</p>
              </div>
            ) : rotas.map(r=>{
              const pdvsRota=stores.filter(s=>s.rotaId===r.id);
              const qtd=pdvsRota.length,isActive=rotaAtiva===r.id;
              const isEditingR=editRota?.id===r.id,isDelR=confirmDelRota===r.id;
              const isExpR=expandedRota===r.id;
              return (
                <div key={r.id} style={{background:C.white,borderRadius:16,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",borderLeft:`4px solid ${isActive?C.blue:C.grayDim}`,overflow:"hidden"}}>
                  <div style={{padding:"14px 16px"}}>
                    {isEditingR ? (
                      <div style={{display:"flex",gap:6}}>
                        <input value={editRota.nome} onChange={e=>setEditRota({...editRota,nome:e.target.value})} onKeyDown={e=>e.key==="Enter"&&renomearRota(r.id,editRota.nome)} style={ipt} autoFocus/>
                        <Btn variant="blue" style={{padding:"11px 14px",fontSize:12}} onClick={()=>renomearRota(r.id,editRota.nome)}>OK</Btn>
                        <Btn variant="ghost" style={{padding:"11px 12px",fontSize:12}} onClick={()=>setEditRota(null)}>✕</Btn>
                      </div>
                    ) : (
                      <>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,cursor:"pointer"}}
                          onClick={()=>setExpandedRota(isExpR?null:r.id)}>
                          <div>
                            <p style={{margin:"0 0 3px",fontSize:16,fontWeight:700,color:C.text}}>📍 {r.nome}</p>
                            <p style={{margin:0,fontSize:12,color:C.muted}}>{qtd} PDV{qtd!==1?"s":""}</p>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            {isActive&&<span style={{fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:99,background:C.blueDim,color:C.blue}}>ATIVA HOJE</span>}
                            <i className={`ti ${isExpR?"ti-chevron-up":"ti-chevron-down"}`} style={{fontSize:14,color:C.muted}}/>
                          </div>
                        </div>
                        <div style={{display:"flex",gap:6}}>
                          {!isActive ? (
                            <Btn variant="blue" style={{flex:1,padding:"10px 0",fontSize:12}} onClick={()=>ativarRota(r.id)}>🎯 Ativar para hoje</Btn>
                          ) : confirmDesativar ? (
                            <>
                              <Btn variant="danger" style={{flex:1,padding:"10px 0",fontSize:12}} onClick={desativarRota}>Confirmar desativação</Btn>
                              <Btn variant="ghost" style={{padding:"10px 12px",fontSize:12}} onClick={()=>setConfirmDesativar(false)}>✕</Btn>
                            </>
                          ) : (
                            <Btn variant="green" style={{flex:1,padding:"10px 0",fontSize:12}} onClick={()=>setConfirmDesativar(true)}>✓ Ativa — Desativar</Btn>
                          )}
                          <Btn variant="ghost" style={{padding:"10px 12px",fontSize:12}} onClick={()=>setEditRota({id:r.id,nome:r.nome})}>✏️</Btn>
                          {isDelR ? (
                            <><Btn variant="danger" style={{padding:"10px 0",fontSize:11,flex:1}} onClick={()=>removerRota(r.id)}>Confirmar</Btn>
                            <Btn variant="ghost" style={{padding:"10px 10px",fontSize:11}} onClick={()=>setConfirmDelRota(null)}>✕</Btn></>
                          ) : (
                            <Btn variant="danger" style={{padding:"10px 12px",fontSize:12}} onClick={()=>setConfirmDelRota(r.id)}>🗑</Btn>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  {isExpR&&!isEditingR&&(
                    <div style={{borderTop:"1px solid #f3f4f6",padding:"10px 16px 14px"}}>
                      {pdvsRota.length===0 ? (
                        <p style={{margin:0,textAlign:"center",color:C.muted,fontSize:12,padding:"8px 0"}}>Nenhum PDV nesta rota ainda.</p>
                      ) : pdvsRota
                        .sort((a,b)=>{const da=a.visita?daysSince(a.visita):9999,db=b.visita?daysSince(b.visita):9999;return db-da;})
                        .map(s=>{
                          const d=s.visita?daysSince(s.visita):null;
                          const sc=!s.visita?C.muted:d===0?C.green:d<=14?C.amber:C.red;
                          const sb=!s.visita?"#f3f4f6":d===0?C.greenDim:d<=14?C.amberDim:C.redDim;
                          const sl=!s.visita?"SEM VISITA":d===0?"EM DIA":d<=14?"RECENTE":"ATRASADO";
                          return (
                            <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #f9fafb"}}>
                              <div style={{flex:1,minWidth:0}}>
                                <p style={{margin:"0 0 1px",fontSize:13,fontWeight:600,color:C.text,textTransform:"capitalize",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.nome.toLowerCase()}</p>
                                <p style={{margin:0,fontSize:11,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.end}</p>
                              </div>
                              <div style={{textAlign:"right",marginLeft:10,flexShrink:0}}>
                                <span style={{fontSize:10,fontWeight:600,padding:"2px 6px",borderRadius:5,background:sb,color:sc,display:"block",marginBottom:2}}>{sl}</span>
                                <span style={{fontSize:11,color:sc,fontWeight:600}}>{d!==null?d===0?"hoje":`${d}d`:"nunca"}</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ABA CONSIG ── */}
      {aba==="consig"&&(
        <div style={{padding:"1rem"}}>
          {(()=>{
            const consignados=stores.filter(s=>s.consignado);
            return (
              <>
                <div style={{background:"linear-gradient(135deg,#1b3a8c,#2d52b8)",borderRadius:20,padding:"18px 20px",marginBottom:16,color:"#fff"}}>
                  <p style={{margin:"0 0 4px",fontSize:10,opacity:0.7,letterSpacing:"0.08em"}}>DISPLAYS CONSIGNADOS</p>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <p style={{margin:0,fontSize:20,fontWeight:700}}>📦 Em campo</p>
                    <p style={{margin:0,fontSize:36,fontWeight:700}}>{consignados.length}</p>
                  </div>
                  <p style={{margin:0,fontSize:12,opacity:0.7}}>PDV{consignados.length!==1?"s":""} com display deixado para consignação</p>
                </div>
                {consignados.length===0 ? (
                  <div style={{textAlign:"center",padding:"4rem 1rem"}}>
                    <i className="ti ti-package" style={{fontSize:48,color:"#d1d5db"}}/>
                    <p style={{color:"#6b7280",fontSize:14,marginTop:14}}>Nenhum PDV com display consignado ainda.</p>
                  </div>
                ) : (
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {consignados
                      .sort((a,b)=>{const da=a.visita?daysSince(a.visita):9999,db=b.visita?daysSince(b.visita):9999;return db-da;})
                      .map(s=>{
                        const d=s.visita?daysSince(s.visita):null;
                        const color=!s.visita?"#9ca3af":d===0?"#16a34a":d<=14?"#d97706":"#dc2626";
                        return (
                          <div key={s.id} style={{background:"#ffffff",borderRadius:14,padding:"14px 16px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",borderLeft:`4px solid ${C.blue}`}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                              <div style={{flex:1}}>
                                <p style={{margin:"0 0 2px",fontSize:14,fontWeight:700,color:"#111827"}}>{s.nome}</p>
                                <p style={{margin:"0 0 6px",fontSize:11,color:"#6b7280"}}>{TIPO_LABEL[s.tipo]} · {s.end}</p>
                                {s.rotaId&&(()=>{const r=rotas.find(r=>r.id===s.rotaId);return r?<span style={{fontSize:11,padding:"2px 8px",borderRadius:99,background:"#fefbe8",color:"#92730a"}}>📍 {r.nome}</span>:null;})()}
                              </div>
                              <div style={{textAlign:"right",flexShrink:0}}>
                                <p style={{margin:"0 0 2px",fontSize:13,fontWeight:700,color}}>{d!==null?d===0?"hoje":`${d}d atrás`:"nunca visitado"}</p>
                                {s.visita&&<p style={{margin:0,fontSize:10,color:"#6b7280"}}>{fmtDate(s.visita)}</p>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* ── ABA AGENDA ── */}
      {aba==="agenda"&&(
        <div style={{padding:"1rem"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <Btn variant="ghost" style={{padding:"8px 16px",fontSize:18}} onClick={()=>{
              if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1);
              setDiaAberto(null);
            }}>‹</Btn>
            <span style={{fontSize:15,fontWeight:700,color:C.text}}>
              {["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][calMonth]} {calYear}
            </span>
            <Btn variant="ghost" style={{padding:"8px 16px",fontSize:18}} onClick={()=>{
              if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1);
              setDiaAberto(null);
            }}>›</Btn>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:6}}>
            {["S","T","Q","Q","S","S","D"].map((d,i)=>(
              <div key={i} style={{textAlign:"center",fontSize:10,color:C.muted,fontWeight:600}}>{d}</div>
            ))}
          </div>
          {(()=>{
            const firstDow=new Date(calYear,calMonth,1).getDay();
            const startOff=firstDow===0?6:firstDow-1;
            const daysInM=new Date(calYear,calMonth+1,0).getDate();
            return (
              <>
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
                  {Array(startOff).fill(null).map((_,i)=><div key={`e${i}`}/>)}
                  {Array(daysInM).fill(null).map((_,i)=>{
                    const day=i+1;
                    const ds=`${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                    const dayEntries=agenda.filter(a=>a.data===ds);
                    const hasRoutes=dayEntries.length>0;
                    const firstRota=hasRoutes?rotas.find(r=>r.id===dayEntries[0].rota_id):null;
                    const isToday=ds===TODAY,isPast=ds<TODAY,isOpen=diaAberto===ds;
                    return (
                      <div key={day} onClick={()=>{setDiaAberto(isOpen?null:ds);setNovaRotaDia("");}}
                        style={{
                          borderRadius:10,padding:"6px 4px",textAlign:"center",cursor:"pointer",
                          background:hasRoutes?C.blue:isOpen?C.blueDim:C.white,
                          border:isToday?`2px solid ${C.yellow}`:`1px solid ${C.border}`,
                          opacity:isPast?0.5:1,minHeight:48,
                        }}>
                        <p style={{margin:"0 0 2px",fontSize:12,fontWeight:700,color:hasRoutes?"#fff":C.text}}>{day}</p>
                        {hasRoutes&&(
                          <p style={{margin:0,fontSize:8,color:"rgba(255,255,255,0.85)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",padding:"0 2px"}}>
                            {dayEntries.length>1?`${dayEntries.length} rotas`:firstRota?.nome||""}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                {diaAberto&&(()=>{
                  const dayEntries=agenda.filter(a=>a.data===diaAberto);
                  const rotasNoDia=dayEntries.map(a=>({...a,rota:rotas.find(r=>r.id===a.rota_id)}));
                  const rotasDisponiveis=rotas.filter(r=>!dayEntries.some(a=>a.rota_id===r.id));
                  return (
                    <div style={{background:C.white,borderRadius:16,padding:16,marginTop:14,boxShadow:"0 2px 12px rgba(0,0,0,0.08)"}}>
                      <p style={{margin:"0 0 12px",fontSize:14,fontWeight:700,color:C.text}}>
                        {new Date(diaAberto+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long"})}
                      </p>
                      {rotasNoDia.length===0 ? (
                        <p style={{margin:"0 0 12px",fontSize:12,color:C.muted,fontStyle:"italic"}}>Nenhuma rota alocada.</p>
                      ) : (
                        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
                          {rotasNoDia.map(entry=>(
                            <div key={entry.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",background:"#f0f4ff",borderRadius:10}}>
                              <span style={{fontSize:13,fontWeight:600,color:C.blue}}>📍 {entry.rota?.nome||"—"}</span>
                              <button onClick={()=>removerRotaDia(entry.id)} style={{
                                background:"none",border:"none",cursor:"pointer",padding:"2px 6px",
                                fontSize:16,color:C.muted,lineHeight:1,borderRadius:6,
                              }}>×</button>
                            </div>
                          ))}
                        </div>
                      )}
                      {rotasDisponiveis.length>0&&(
                        <>
                          <p style={{margin:"0 0 6px",fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em"}}>Adicionar rota</p>
                          <div style={{display:"flex",gap:8}}>
                            <select value={novaRotaDia} onChange={e=>setNovaRotaDia(e.target.value)}
                              style={{...ipt,flex:1,padding:"10px 14px"}}>
                              <option value="">Escolher…</option>
                              {rotasDisponiveis.map(r=><option key={r.id} value={r.id}>{r.nome}</option>)}
                            </select>
                            <Btn variant={novaRotaDia?"blue":"ghost"} style={{padding:"11px 16px",opacity:novaRotaDia?1:0.4}}
                              onClick={()=>adicionarRotaDia(diaAberto,novaRotaDia)}>
                              {savingAgenda?"…":"+"}
                            </Btn>
                          </div>
                        </>
                      )}
                      <Btn variant="ghost" style={{width:"100%",padding:"10px 0",marginTop:10,fontSize:12}} onClick={()=>setDiaAberto(null)}>Fechar</Btn>
                    </div>
                  );
                })()}
              </>
            );
          })()}
        </div>
      )}
    </>
  );

  // ── DESKTOP LAYOUT ──
  if (layout==="desktop") {
    return (
      <div style={{display:"flex",height:"100vh",overflow:"hidden",fontFamily:"'Poppins',sans-serif"}}>

        {/* Sidebar */}
        <div style={{width:200,background:"#1a1f36",display:"flex",flexDirection:"column",flexShrink:0}}>
          <div style={{padding:"18px 16px 14px",borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:34,height:34,borderRadius:10,background:"linear-gradient(135deg,#1b3a8c,#2d52b8)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>⚡</div>
              <div>
                <p style={{margin:0,fontSize:9,color:"#4b5563",letterSpacing:"0.1em",textTransform:"uppercase"}}>Dot Energy</p>
                <p style={{margin:0,fontSize:13,fontWeight:700,color:"#fff"}}>Admin</p>
              </div>
            </div>
          </div>

          <div style={{flex:1,overflowY:"auto",padding:"12px 8px"}}>
            {[
              {sec:"Principal",items:[
                {id:"geral",icon:"ti-chart-bar",label:"Geral"},
                {id:"agenda",icon:"ti-calendar-month",label:"Agenda"},
              ]},
              {sec:"Gestão",items:[
                {id:"pdvs",icon:"ti-building-store",label:"PDVs"},
                {id:"historico",icon:"ti-calendar",label:"Histórico"},
                {id:"rotas",icon:"ti-map-pin",label:"Rotas"},
                {id:"consig",icon:"ti-package",label:"Consig."},
              ]},
            ].map(({sec,items})=>(
              <div key={sec} style={{marginBottom:18}}>
                <p style={{margin:"0 0 5px 8px",fontSize:10,color:"#4b5563",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em"}}>{sec}</p>
                {items.map(item=>{
                  const isAct=aba===item.id;
                  return (
                    <button key={item.id} onClick={()=>{setAba(item.id);setShowAdd(false);}} style={{
                      display:"flex",alignItems:"center",gap:9,width:"100%",padding:"9px 10px",
                      borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",
                      background:isAct?"#1b3a8c":"transparent",
                      color:isAct?"#fff":"#9ca3af",
                      fontWeight:isAct?600:400,fontSize:13,marginBottom:2,
                    }}>
                      <i className={`ti ${item.icon}`} style={{fontSize:15}}/>
                      <span style={{flex:1,textAlign:"left"}}>{item.label}</span>
                      {item.badge>0&&<span style={{background:"#dc2626",color:"#fff",fontSize:10,fontWeight:700,borderRadius:99,padding:"1px 6px",minWidth:18,textAlign:"center"}}>{item.badge}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div style={{padding:"10px 8px",borderTop:"1px solid rgba(255,255,255,0.07)"}}>
            <button onClick={onLogout} style={{
              display:"flex",alignItems:"center",gap:9,width:"100%",padding:"9px 10px",
              borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",
              background:"transparent",color:"#9ca3af",fontSize:13,
            }}>
              <i className="ti ti-logout" style={{fontSize:15}}/>Sair
            </button>
          </div>
        </div>

        {/* Main */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:"#f8f9fc"}}>
          {/* Topbar */}
          <div style={{background:"#fff",padding:"12px 20px",boxShadow:"0 1px 0 #eaecf0",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <h2 style={{margin:0,fontSize:16,fontWeight:700,color:C.text}}>{TAB_TITLES[aba]||aba}</h2>
              {aba==="pdvs"&&(
                <Btn variant={showAdd?"danger":"blue"} style={{padding:"7px 14px",fontSize:12}} onClick={()=>setShowAdd(v=>!v)}>
                  {showAdd?"✕":"+ PDV"}
                </Btn>
              )}
            </div>
            <LayoutToggle/>
          </div>

          {/* Content + optional right panel */}
          <div style={{flex:1,display:"flex",overflow:"hidden"}}>
            <div style={{flex:1,overflowY:"auto"}}>
              {tabContent}
            </div>

            {/* Right panel */}
            {(aba==="geral"||aba==="pdvs")&&(
              <div style={{width:220,background:"#fff",borderLeft:"1px solid #eaecf0",overflowY:"auto",flexShrink:0,padding:16}}>
                {aba==="geral"&&(
                  <>
                    <p style={{margin:"0 0 10px",fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>Rota Ativa</p>
                    {rotaAtivaObj ? (
                      <>
                        <p style={{margin:"0 0 3px",fontSize:13,fontWeight:700,color:C.text}}>📍 {rotaAtivaObj.nome}</p>
                        <p style={{margin:"0 0 8px",fontSize:11,color:C.muted}}>{visitadosHoje}/{pdvsRotaAtiva.length} visitados</p>
                        <div style={{height:4,background:"#eaecf0",borderRadius:99,marginBottom:16}}>
                          <div style={{height:"100%",width:`${pdvsRotaAtiva.length>0?(visitadosHoje/pdvsRotaAtiva.length)*100:0}%`,background:C.blue,borderRadius:99,transition:"width 0.4s"}}/>
                        </div>
                      </>
                    ) : (
                      <p style={{margin:"0 0 16px",fontSize:12,color:C.muted}}>Nenhuma rota ativa.</p>
                    )}
                    <div style={{height:1,background:"#eaecf0",margin:"0 0 14px"}}/>
                    <p style={{margin:"0 0 4px",fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>Nunca visitados</p>
                    <p style={{margin:"0 0 2px",fontSize:28,fontWeight:700,color:neverVisited>0?C.red:C.green}}>{neverVisited}</p>
                    <p style={{margin:0,fontSize:11,color:C.muted}}>PDV{neverVisited!==1?"s":""} sem nenhuma visita</p>
                  </>
                )}
                {aba==="pdvs"&&(
                  selectedPdvObj ? (
                    editPdv===selectedPdv ? (
                      <>
                        <p style={{margin:"0 0 10px",fontSize:10,fontWeight:700,color:C.blue,textTransform:"uppercase",letterSpacing:"0.07em"}}>Editar PDV</p>
                        <FormPDV
                          initial={{nome:selectedPdvObj.nome,end:selectedPdvObj.end,cep:selectedPdvObj.cep,tipo:selectedPdvObj.tipo,prio:selectedPdvObj.prio,rotaId:selectedPdvObj.rotaId,comprador:selectedPdvObj.comprador}}
                          onSave={(form)=>editarPdv(selectedPdv,form)}
                          onCancel={()=>setEditPdv(null)}
                          saving={saving}
                          rotas={rotas}
                        />
                      </>
                    ) : (
                      <>
                        <p style={{margin:"0 0 2px",fontSize:14,fontWeight:700,color:C.text,textTransform:"capitalize"}}>{selectedPdvObj.nome.toLowerCase()}</p>
                        <p style={{margin:"0 0 2px",fontSize:11,color:C.muted}}>{selectedPdvObj.end}</p>
                        {selectedPdvObj.comprador&&<p style={{margin:"0 0 12px",fontSize:11,color:C.muted}}>Comprador: {selectedPdvObj.comprador}</p>}
                        <div style={{display:"flex",gap:6,marginBottom:14,marginTop:10}}>
                          <Btn variant="ghost" style={{flex:1,padding:"7px 0",fontSize:11}} onClick={()=>setEditPdv(selectedPdv)}>✏️ Editar</Btn>
                          {confirmDelPdv===selectedPdv ? (
                            <>
                              <Btn variant="danger" style={{flex:1,padding:"7px 0",fontSize:11}} onClick={()=>removerPdv(selectedPdv)}>Confirmar</Btn>
                              <Btn variant="ghost" style={{padding:"7px 8px",fontSize:11}} onClick={()=>setConfirmDelPdv(null)}>✕</Btn>
                            </>
                          ) : (
                            <Btn variant="danger" style={{padding:"7px 10px",fontSize:11}} onClick={()=>setConfirmDelPdv(selectedPdv)}>🗑</Btn>
                          )}
                        </div>
                        <div style={{height:1,background:"#eaecf0",marginBottom:12}}/>
                        <p style={{margin:"0 0 8px",fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>Histórico</p>
                        {(visitasPorPdv[selectedPdv]||[]).length===0 ? (
                          <p style={{fontSize:11,color:C.muted,fontStyle:"italic"}}>Nenhuma visita registrada.</p>
                        ) : (visitasPorPdv[selectedPdv]||[]).slice(0,10).map(v=>(
                          <div key={v.id} style={{fontSize:11,padding:"6px 8px",background:"#f8f9fa",borderRadius:6,marginBottom:4}}>
                            <span style={{color:C.blue,fontWeight:700}}>{fmtDate(v.data)}</span>
                            {v.obs&&<p style={{margin:"2px 0 0",color:C.muted,fontSize:10}}>{v.obs}</p>}
                          </div>
                        ))}
                      </>
                    )
                  ) : (
                    <div style={{textAlign:"center",paddingTop:40,color:C.muted}}>
                      <i className="ti ti-hand-click" style={{fontSize:36,color:"#d1d5db",display:"block",marginBottom:8}}/>
                      <p style={{fontSize:11,margin:0}}>Clique em um PDV para ver os detalhes</p>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── MOBILE LAYOUT ──
  return (
    <div style={{fontFamily:"'Poppins',sans-serif",background:C.bg,minHeight:"100vh",maxWidth:440,margin:"0 auto",paddingBottom:"100px"}}>
      <div style={{background:C.white,padding:"1rem",boxShadow:"0 1px 0 #eaecf0"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#1b3a8c,#2d52b8)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>⚡</div>
            <div>
              <p style={{margin:0,fontSize:10,color:C.muted,letterSpacing:"0.08em",textTransform:"uppercase"}}>Dot Energy · Admin</p>
              <h1 style={{margin:0,fontSize:18,fontWeight:700,color:C.text}}>Dashboard</h1>
            </div>
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <LayoutToggle/>
            {aba==="pdvs"&&(
              <Btn variant={showAdd?"danger":"blue"} style={{padding:"8px 14px",fontSize:12}} onClick={()=>setShowAdd(v=>!v)}>
                {showAdd?"✕":"+ PDV"}
              </Btn>
            )}
            <Btn variant="ghost" style={{padding:"8px 12px",fontSize:12}} onClick={onLogout}>Sair</Btn>
          </div>
        </div>
      </div>
      {tabContent}
      <BottomNav aba={aba} setAba={(v)=>{setAba(v);setShowAdd(false);}} tabs={TABS}/>
    </div>
  );
}
