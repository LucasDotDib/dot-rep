import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase";
import { C, ipt, Btn, FormPDV, TODAY, daysSince, fmtDate, fmtTime, fromDB, TIPO_LABEL, getUrgencia, URGENCIA } from "./ui";

const FONT = "'Poppins', sans-serif";
const URG_ORDER = { critica:0, media:1, ok:2 };
const cepCmp = (a,b) => (a.cep||"").replace(/\D/g,"").localeCompare((b.cep||"").replace(/\D/g,""));

const daysInMonth = (year, month) => new Date(year, month, 0).getDate();
const padZ = n => String(n).padStart(2, "0");
const toDateStr = (y, m, d) => `${y}-${padZ(m)}-${padZ(d)}`;
const WEEKDAY = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export default function AdminView({ onLogout }) {
  const [aba,       setAba]       = useState("geral");
  const [stores,    setStores]    = useState(null);
  const [visitas,   setVisitas]   = useState([]);
  const [rotas,     setRotas]     = useState([]);
  const [agendaHoje, setAgendaHoje] = useState([]);
  const [erro,      setErro]      = useState(null);

  const [showAdd,     setShowAdd]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [selectedPdv, setSelectedPdv] = useState(null);
  const [editingPdv,  setEditingPdv]  = useState(null);
  const [searchPdv,   setSearchPdv]   = useState("");

  const [novaRota,       setNovaRota]       = useState("");
  const [editRota,       setEditRota]       = useState(null);
  const [confirmDelRota, setConfirmDelRota] = useState(null);

  const [selectedDate, setSelectedDate] = useState(TODAY);

  const now = new Date();
  const [agendaYear,  setAgendaYear]  = useState(now.getFullYear());
  const [agendaMonth, setAgendaMonth] = useState(now.getMonth() + 1);
  const [agendaMes,   setAgendaMes]   = useState([]);
  const agendaViewRef = useRef({ year: now.getFullYear(), month: now.getMonth() + 1 });

  const carregar = useCallback(async () => {
    const [pdvs, vis, rts, agenda] = await Promise.all([
      supabase.from("pdvs").select("*").order("criado_em", { ascending:true }),
      supabase.from("visitas").select("*").order("criado_em", { ascending:false }),
      supabase.from("rotas").select("*").order("nome", { ascending:true }),
      supabase.from("agenda").select("*").eq("data", TODAY).order("ordem", { ascending:true }),
    ]);
    if (pdvs.error) { setErro(pdvs.error.message); return; }
    setStores((pdvs.data||[]).map(fromDB));
    setVisitas(vis.data||[]);
    setRotas(rts.data||[]);
    setAgendaHoje(agenda.data||[]);
  }, []);

  const carregarAgenda = useCallback(async (year, month) => {
    const first = toDateStr(year, month, 1);
    const last  = toDateStr(year, month, daysInMonth(year, month));
    const { data } = await supabase.from("agenda").select("*")
      .gte("data", first).lte("data", last)
      .order("data", { ascending:true }).order("ordem", { ascending:true });
    setAgendaMes(data||[]);
  }, []);

  useEffect(() => {
    carregar();
    const ch = supabase.channel("admin-changes")
      .on("postgres_changes", { event:"*", schema:"public", table:"pdvs" }, ({ eventType, new:n, old:o }) => {
        if (eventType==="INSERT")      setStores(prev => [...prev, fromDB(n)]);
        else if (eventType==="UPDATE") setStores(prev => prev.map(s => s.id===n.id ? fromDB(n) : s));
        else if (eventType==="DELETE") setStores(prev => prev.filter(s => s.id!==o.id));
      })
      .on("postgres_changes", { event:"*", schema:"public", table:"visitas" }, ({ eventType, new:n }) => {
        if (eventType==="INSERT" && n) setVisitas(prev => [n, ...prev]);
      })
      .on("postgres_changes", { event:"*", schema:"public", table:"rotas" }, ({ eventType, new:n, old:o }) => {
        if (eventType==="INSERT")      setRotas(prev => [...prev, n].sort((a,b)=>a.nome.localeCompare(b.nome)));
        else if (eventType==="UPDATE") setRotas(prev => prev.map(r => r.id===n.id ? n : r));
        else if (eventType==="DELETE") setRotas(prev => prev.filter(r => r.id!==o.id));
      })
      .on("postgres_changes", { event:"*", schema:"public", table:"agenda" }, () => {
        supabase.from("agenda").select("*").eq("data", TODAY).order("ordem", { ascending:true })
          .then(({ data }) => setAgendaHoje(data||[]));
        const { year, month } = agendaViewRef.current;
        const first = toDateStr(year, month, 1);
        const last  = toDateStr(year, month, daysInMonth(year, month));
        supabase.from("agenda").select("*").gte("data", first).lte("data", last)
          .order("data", { ascending:true }).order("ordem", { ascending:true })
          .then(({ data }) => setAgendaMes(data||[]));
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [carregar]);

  useEffect(() => {
    agendaViewRef.current = { year: agendaYear, month: agendaMonth };
    if (aba === "agenda") carregarAgenda(agendaYear, agendaMonth);
  }, [aba, agendaYear, agendaMonth, carregarAgenda]);

  const adicionar = useCallback(async (form) => {
    setSaving(true);
    const newId = Date.now().toString();
    const { error } = await supabase.from("pdvs").insert([{
      id:newId, nome:form.nome.trim(), endereco:form.end.trim(),
      cep:form.cep.replace(/\D/g,""), tipo:form.tipo, prioridade:0,
      vendeu_dot:false, ultima_visita:null, obs:"", rota_id:form.rotaId||null,
    }]);
    if (error) { setErro(error.message); }
    else {
      setShowAdd(false);
      setStores(prev => [...prev, {
        id:newId, nome:form.nome.trim(), end:form.end.trim(),
        cep:form.cep.replace(/\D/g,""), tipo:form.tipo, prio:0,
        vendeu:false, visita:null, obs:"", rotaId:form.rotaId||null,
      }]);
    }
    setSaving(false);
  }, []);

  const editar = useCallback(async (id, form) => {
    setSaving(true);
    const { error } = await supabase.from("pdvs").update({
      nome:form.nome.trim(), endereco:form.end.trim(),
      cep:form.cep.replace(/\D/g,""), tipo:form.tipo, rota_id:form.rotaId,
    }).eq("id", id);
    if (error) { setErro(error.message); }
    else {
      setEditingPdv(null);
      setStores(prev => prev.map(s => s.id===id ? {
        ...s, nome:form.nome.trim(), end:form.end.trim(),
        cep:form.cep.replace(/\D/g,""), tipo:form.tipo, rotaId:form.rotaId,
      } : s));
    }
    setSaving(false);
  }, []);

  const adicionarRota = useCallback(async () => {
    if (!novaRota.trim()) return;
    const newId = Date.now().toString();
    const nome = novaRota.trim();
    const { error } = await supabase.from("rotas").insert([{ id:newId, nome }]);
    if (error) { setErro(error.message); }
    else {
      setNovaRota("");
      setRotas(prev => [...prev, { id:newId, nome }].sort((a,b)=>a.nome.localeCompare(b.nome)));
    }
  }, [novaRota]);

  const renomearRota = useCallback(async (id, nome) => {
    if (!nome.trim()) return;
    const { error } = await supabase.from("rotas").update({ nome:nome.trim() }).eq("id", id);
    if (error) { setErro(error.message); }
    else {
      setEditRota(null);
      setRotas(prev => prev.map(r => r.id===id ? {...r, nome:nome.trim()} : r));
    }
  }, []);

  const removerRota = useCallback(async (id) => {
    await supabase.from("pdvs").update({ rota_id:null }).eq("rota_id", id);
    const { error } = await supabase.from("rotas").delete().eq("id", id);
    if (error) { setErro(error.message); }
    else {
      setConfirmDelRota(null);
      setRotas(prev => prev.filter(r => r.id!==id));
      setStores(prev => prev.map(s => s.rotaId===id ? {...s, rotaId:null} : s));
    }
  }, []);

  const adicionarAgendaItem = useCallback(async (data, rotaId, ordem) => {
    const newId = Date.now().toString();
    const { error } = await supabase.from("agenda").insert([{ id:newId, data, rota_id:rotaId, ordem }]);
    if (error) { setErro(error.message); return; }
    const novo = { id:newId, data, rota_id:rotaId, ordem };
    setAgendaMes(prev => [...prev, novo].sort((a,b)=>a.data.localeCompare(b.data)||a.ordem-b.ordem));
    if (data === TODAY) setAgendaHoje(prev => [...prev, novo].sort((a,b)=>a.ordem-b.ordem));
  }, []);

  const removerAgendaItem = useCallback(async (id, data) => {
    const { error } = await supabase.from("agenda").delete().eq("id", id);
    if (error) { setErro(error.message); return; }
    setAgendaMes(prev => prev.filter(a => a.id!==id));
    if (data === TODAY) setAgendaHoje(prev => prev.filter(a => a.id!==id));
  }, []);

  if (!stores) return (
    <div style={{ background:C.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:FONT }}>
      <div style={{ width:34, height:34, border:`3px solid ${C.border}`, borderTopColor:C.blue, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (erro) return (
    <div style={{ background:C.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12, padding:"2rem", textAlign:"center", fontFamily:FONT }}>
      <div style={{ fontSize:32 }}>⚠️</div>
      <div style={{ fontSize:14, color:C.red, lineHeight:1.6 }}>{erro}</div>
      <Btn variant="default" style={{ padding:"10px 20px" }} onClick={()=>{ setErro(null); carregar(); }}>Tentar novamente</Btn>
    </div>
  );

  const pdvsHoje      = stores.filter(s => agendaHoje.some(a => a.rota_id === s.rotaId));
  const visitadosHoje = pdvsHoje.filter(s => daysSince(s.visita) === 0).length;

  const visitasPorPdv = {};
  for (const v of visitas) {
    if (!visitasPorPdv[v.pdv_id]) visitasPorPdv[v.pdv_id] = [];
    visitasPorPdv[v.pdv_id].push(v);
  }

  const visitasDoDia    = visitas.filter(v=>v.data===selectedDate);
  const visitasDoDiaIds = new Set(visitasDoDia.map(v=>v.pdv_id));

  const prevDay = () => { const d=new Date(selectedDate+"T12:00:00"); d.setDate(d.getDate()-1); setSelectedDate(d.toISOString().split("T")[0]); };
  const nextDay = () => { const d=new Date(selectedDate+"T12:00:00"); d.setDate(d.getDate()+1); setSelectedDate(d.toISOString().split("T")[0]); };

  const prevMonth = () => {
    if (agendaMonth === 1) { setAgendaYear(y=>y-1); setAgendaMonth(12); }
    else setAgendaMonth(m=>m-1);
  };
  const nextMonth = () => {
    if (agendaMonth === 12) { setAgendaYear(y=>y+1); setAgendaMonth(1); }
    else setAgendaMonth(m=>m+1);
  };

  const NAV_TABS = [
    ["geral",     "ti-chart-bar",      "Geral"  ],
    ["historico", "ti-calendar",       "Dia"    ],
    ["pdvs",      "ti-building-store", "PDVs"   ],
    ["rotas",     "ti-map-pin",        "Rotas"  ],
    ["agenda",    "ti-calendar-month", "Agenda" ],
  ];

  return (
    <div style={{ fontFamily:FONT, background:C.bg, minHeight:"100vh", maxWidth:440, margin:"0 auto", paddingBottom:90 }}>

      {/* HEADER */}
      <div style={{ background:C.white, borderBottom:`1px solid #f5f6fa`, padding:"18px 20px 14px", position:"sticky", top:0, zIndex:10 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:C.blue, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ fontSize:18 }}>⚡</span>
            </div>
            <div>
              <div style={{ fontSize:10, color:C.blue, fontWeight:700, letterSpacing:"0.1em" }}>DOT ENERGY · ADMIN</div>
              <div style={{ fontSize:17, fontWeight:700, color:C.text, lineHeight:1.1 }}>Dashboard</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:7, alignItems:"center" }}>
            {aba==="pdvs"&&(
              <Btn variant={showAdd?"danger":"yellow"} style={{padding:"8px 14px",fontSize:12}} onClick={()=>setShowAdd(v=>!v)}>
                {showAdd?"✕":"+ PDV"}
              </Btn>
            )}
            <button onClick={onLogout} style={{ background:"none", border:"none", cursor:"pointer", padding:6 }}>
              <i className="ti ti-logout" style={{ fontSize:20, color:C.muted }} />
            </button>
          </div>
        </div>
      </div>

      {/* ── ABA GERAL ── */}
      {aba==="geral"&&(
        <div style={{ padding:"16px 16px 0" }}>
          {agendaHoje.length > 0 ? (
            <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
              {agendaHoje.map(item => {
                const rota = rotas.find(r => r.id === item.rota_id);
                const pdvsRota = stores.filter(s => s.rotaId === item.rota_id);
                const visitados = pdvsRota.filter(s => daysSince(s.visita)===0).length;
                return (
                  <div key={item.id} style={{ background:C.blue, borderRadius:20, padding:"18px 20px" }}>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,0.6)", fontWeight:600, letterSpacing:"0.1em", marginBottom:4 }}>
                      {agendaHoje.length>1?`ROTA ${item.ordem} HOJE`:"ROTA ATIVA HOJE"}
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                      <div style={{ fontSize:18, fontWeight:700, color:"#fff" }}>📍 {rota?.nome||"—"}</div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:22, fontWeight:700, color:C.yellow }}>{pdvsRota.length>0?Math.round((visitados/pdvsRota.length)*100):0}%</div>
                      </div>
                    </div>
                    <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", marginBottom:8 }}>{visitados} de {pdvsRota.length} visitados</div>
                    {pdvsRota.length>0&&(
                      <div style={{ height:5, background:"rgba(255,255,255,0.15)", borderRadius:99, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${(visitados/pdvsRota.length)*100}%`, background:C.yellow, borderRadius:99, transition:"width 0.4s" }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:20, padding:"18px 20px", marginBottom:16 }}>
              <div style={{ fontSize:10, color:C.muted, fontWeight:600, letterSpacing:"0.1em", marginBottom:4 }}>AGENDA DE HOJE</div>
              <div style={{ fontSize:14, color:C.gray }}>Nenhuma rota definida para hoje. Configure na aba Agenda.</div>
            </div>
          )}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
            {[
              { label:"Total de PDVs",   val:stores.length,                                                                   icon:"ti-building-store", iconBg:"#eff6ff",  iconColor:C.blue  },
              { label:"Visitas hoje",    val:visitas.filter(v=>v.data===TODAY).length,                                        icon:"ti-circle-check",  iconBg:C.greenDim, iconColor:C.green },
              { label:"Esta semana",     val:visitas.filter(v=>{ const d=daysSince(v.data); return d!==null&&d<=6; }).length, icon:"ti-calendar-week", iconBg:C.amberDim, iconColor:C.amber },
              { label:"Nunca visitados", val:stores.filter(s=>!s.visita).length,                                              icon:"ti-alert-triangle",iconBg:C.redDim,   iconColor:C.red   },
            ].map(({ label, val, icon, iconBg, iconColor })=>(
              <div key={label} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:16, padding:"16px 14px" }}>
                <div style={{ width:38, height:38, borderRadius:12, background:iconBg, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:12 }}>
                  <i className={`ti ${icon}`} style={{ fontSize:20, color:iconColor }} />
                </div>
                <div style={{ fontSize:22, fontWeight:700, color:C.text, fontVariantNumeric:"tabular-nums" }}>{val}</div>
                <div style={{ fontSize:10, color:C.gray, marginTop:3, fontWeight:500 }}>{label}</div>
              </div>
            ))}
          </div>

          {pdvsHoje.length>0&&(
            <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:16, padding:"14px 16px" }}>
              <div style={{ fontSize:11, color:C.muted, fontWeight:600, letterSpacing:"0.06em", marginBottom:10 }}>PENDENTES DE HOJE</div>
              {pdvsHoje.filter(s=>daysSince(s.visita)!==0).length===0 ? (
                <div style={{ textAlign:"center", padding:"8px 0", color:C.green, fontSize:13, fontWeight:600 }}>🎉 Todos visitados hoje!</div>
              ) : pdvsHoje.filter(s=>daysSince(s.visita)!==0).map(s=>(
                <div key={s.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:`1px solid ${C.border}` }}>
                  <span style={{ fontSize:13, fontWeight:500, color:C.text }}>{s.nome}</span>
                  <span style={{ fontSize:11, color:C.gray }}>{s.visita?`${daysSince(s.visita)}d atrás`:"nunca"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ABA HISTÓRICO POR DIA ── */}
      {aba==="historico"&&(
        <div style={{ padding:"16px 16px 0" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
            <Btn variant="ghost" style={{ padding:"10px 16px", fontSize:18 }} onClick={prevDay}>‹</Btn>
            <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} style={{ ...ipt, flex:1, textAlign:"center", padding:"10px 8px" }} />
            <Btn variant="ghost" style={{ padding:"10px 16px", fontSize:18 }} onClick={nextDay}>›</Btn>
          </div>
          {selectedDate!==TODAY&&(
            <Btn variant="ghost" style={{ width:"100%", padding:"8px 0", fontSize:12, marginBottom:14 }} onClick={()=>setSelectedDate(TODAY)}>
              Ir para hoje
            </Btn>
          )}
          {visitasDoDia.length===0 ? (
            <div style={{ textAlign:"center", padding:"4rem 0" }}>
              <i className="ti ti-calendar-off" style={{ fontSize:40, color:C.gray }} />
              <div style={{ fontSize:14, color:C.gray, marginTop:12 }}>Nenhuma visita em {fmtDate(selectedDate)||selectedDate}.</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize:11, color:C.blue, fontWeight:700, letterSpacing:"0.08em", marginBottom:10 }}>
                VISITADOS — {fmtDate(selectedDate)||selectedDate} ({visitasDoDia.length})
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {visitasDoDia.map(v=>{
                  const pdv = stores.find(s=>s.id===v.pdv_id);
                  return (
                    <div key={v.id} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:"13px 15px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:14, fontWeight:600, color:C.text }}>{pdv?.nome||"PDV removido"}</div>
                          {pdv&&<div style={{ fontSize:11, color:C.gray, marginTop:2 }}>{pdv.end}</div>}
                          {v.obs&&<div style={{ fontSize:12, color:C.muted, marginTop:6, lineHeight:1.5, fontStyle:"italic" }}>"{v.obs}"</div>}
                        </div>
                        <span style={{ fontSize:11, color:C.gray, fontFamily:"monospace", flexShrink:0 }}>{fmtTime(v.criado_em)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {(() => {
                const agendaDia = visitas.length>0
                  ? stores.filter(s => {
                      const visitasDia = visitas.filter(v=>v.data===selectedDate&&v.pdv_id===s.id);
                      return visitasDia.length===0;
                    }).filter(s => {
                      const agendaItems = [];
                      return false;
                    })
                  : [];
                const pdvsNaoVisitadosHoje = selectedDate===TODAY
                  ? pdvsHoje.filter(s=>!visitasDoDiaIds.has(s.id))
                  : [];
                if (pdvsNaoVisitadosHoje.length === 0) return null;
                return (
                  <div style={{ marginTop:16 }}>
                    <div style={{ fontSize:11, color:C.muted, fontWeight:600, letterSpacing:"0.06em", marginBottom:8 }}>
                      NÃO VISITADOS NAS ROTAS DE HOJE ({pdvsNaoVisitadosHoje.length})
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                      {pdvsNaoVisitadosHoje.map(s=>(
                        <div key={s.id} style={{ padding:"10px 14px", background:C.white, border:`1px solid ${C.border}`, borderLeft:`3px solid ${C.red}`, borderRadius:12, display:"flex", justifyContent:"space-between" }}>
                          <span style={{ fontSize:13, fontWeight:500, color:C.text }}>{s.nome}</span>
                          <span style={{ fontSize:11, color:C.gray }}>{s.visita?`${daysSince(s.visita)}d atrás`:"nunca"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      )}

      {/* ── ABA PDVs ── */}
      {aba==="pdvs"&&(
        <div style={{ padding:"16px 16px 0" }}>
          {showAdd&&(
            <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:16, padding:"18px", marginBottom:16 }}>
              <div style={{ fontSize:11, color:C.blue, fontWeight:700, letterSpacing:"0.08em", marginBottom:14 }}>NOVO PONTO DE VENDA</div>
              <FormPDV initial={{ nome:"", end:"", cep:"", tipo:"facu", prio:0, rotaId:null }} onSave={adicionar} onCancel={()=>setShowAdd(false)} saving={saving} rotas={rotas} />
            </div>
          )}
          <input type="text" placeholder="Buscar PDV…" value={searchPdv} onChange={e=>{ setSearchPdv(e.target.value); setSelectedPdv(null); }} style={{ ...ipt, marginBottom:12 }} />
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {stores
              .filter(s=>!searchPdv||s.nome.toLowerCase().includes(searchPdv.toLowerCase())||(s.end||"").toLowerCase().includes(searchPdv.toLowerCase()))
              .sort((a,b)=>URG_ORDER[getUrgencia(a.visita)]-URG_ORDER[getUrgencia(b.visita)] || cepCmp(a,b))
              .map(s=>{
                const hist = visitasPorPdv[s.id]||[];
                const isSelected = selectedPdv===s.id;
                const cfg = URGENCIA[getUrgencia(s.visita)];
                const d = s.visita ? daysSince(s.visita) : null;
                return (
                  <div key={s.id} style={{ background:C.white, border:`1px solid ${C.border}`, borderLeft:`3px solid ${cfg.barColor}`, borderRadius:14, overflow:"hidden" }}>
                    <div style={{ padding:"13px 14px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" }} onClick={()=>setSelectedPdv(isSelected?null:s.id)}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14, fontWeight:600, color:C.text }}>{s.nome}</div>
                        <div style={{ fontSize:11, color:C.gray, marginTop:2 }}>{TIPO_LABEL[s.tipo]} · {s.end}</div>
                      </div>
                      <div style={{ textAlign:"right", flexShrink:0, marginLeft:10 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:cfg.barColor }}>{d!==null?d===0?"hoje":`${d}d atrás`:"nunca"}</div>
                        <div style={{ fontSize:10, color:C.gray }}>{hist.length} visita{hist.length!==1?"s":""}</div>
                      </div>
                    </div>
                    {isSelected&&(
                      <div style={{ padding:"0 14px 14px", borderTop:`1px solid ${C.border}` }}>
                        {editingPdv===s.id ? (
                          <div style={{ paddingTop:14 }}>
                            <div style={{ fontSize:11, color:C.blue, fontWeight:700, letterSpacing:"0.08em", marginBottom:12 }}>EDITAR PDV</div>
                            <FormPDV
                              initial={{ nome:s.nome, end:s.end, cep:s.cep?s.cep.slice(0,5)+(s.cep.length>5?"-"+s.cep.slice(5):""):"", tipo:s.tipo, prio:s.prio, rotaId:s.rotaId }}
                              onSave={(form)=>editar(s.id, form)}
                              onCancel={()=>setEditingPdv(null)}
                              saving={saving} rotas={rotas}
                            />
                          </div>
                        ) : (
                          <>
                            <div style={{ paddingTop:12 }}>
                              <Btn variant="default" style={{ width:"100%", padding:"9px 0", fontSize:12, marginBottom:10 }} onClick={()=>setEditingPdv(s.id)}>
                                ✏️ Editar dados / rota
                              </Btn>
                            </div>
                            {s.obs&&(
                              <div style={{ padding:"8px 0 8px", fontSize:12, color:C.muted, borderBottom:`1px solid ${C.border}`, marginBottom:10 }}>
                                <span style={{ color:C.gray, fontSize:10, fontWeight:600 }}>OBS: </span>{s.obs}
                              </div>
                            )}
                            {hist.length===0 ? (
                              <div style={{ padding:"8px 0", textAlign:"center", color:C.gray, fontSize:12 }}>Nenhuma visita registrada.</div>
                            ) : (
                              <>
                                <div style={{ fontSize:10, color:C.gray, fontWeight:600, letterSpacing:"0.07em", marginBottom:7 }}>HISTÓRICO</div>
                                <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                                  {hist.map(v=>(
                                    <div key={v.id} style={{ fontSize:12, padding:"8px 11px", background:C.grayDim, borderRadius:9, display:"flex", gap:8, alignItems:"flex-start" }}>
                                      <span style={{ color:C.blue, fontWeight:600, fontFamily:"monospace", flexShrink:0 }}>{fmtDate(v.data)}</span>
                                      <span style={{ color:C.gray, fontSize:11, flexShrink:0 }}>{fmtTime(v.criado_em)}</span>
                                      {v.obs ? <span style={{ color:C.muted, lineHeight:1.4 }}>{v.obs}</span> : <span style={{ color:C.gray, fontStyle:"italic" }}>sem obs.</span>}
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}
                          </>
                        )}
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
        <div style={{ padding:"16px 16px 0" }}>
          <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:16, padding:"16px", marginBottom:16 }}>
            <div style={{ fontSize:11, color:C.blue, fontWeight:700, letterSpacing:"0.08em", marginBottom:12 }}>NOVA ROTA</div>
            <div style={{ display:"flex", gap:8 }}>
              <input placeholder="Ex: Paulista, Itaim, Faria Lima…" value={novaRota} onChange={e=>setNovaRota(e.target.value)} onKeyDown={e=>e.key==="Enter"&&adicionarRota()} style={ipt} />
              <Btn variant={novaRota.trim()?"yellow":"ghost"} style={{padding:"11px 18px",opacity:novaRota.trim()?1:0.4}} onClick={adicionarRota}>+</Btn>
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {rotas.length===0 ? (
              <div style={{ textAlign:"center", padding:"3rem 0", color:C.gray, fontSize:13 }}>Nenhuma rota criada ainda.</div>
            ) : rotas.map(r=>{
              const qtd = stores.filter(s=>s.rotaId===r.id).length;
              const isHoje = agendaHoje.some(a => a.rota_id === r.id);
              const isEditingR = editRota?.id===r.id;
              const isDelR = confirmDelRota===r.id;
              return (
                <div key={r.id} style={{ background:C.white, border:`1px solid ${C.border}`, borderLeft:`3px solid ${isHoje?C.yellow:C.border}`, borderRadius:14, padding:"14px 16px" }}>
                  {isEditingR ? (
                    <div style={{ display:"flex", gap:7 }}>
                      <input value={editRota.nome} onChange={e=>setEditRota({...editRota,nome:e.target.value})} onKeyDown={e=>e.key==="Enter"&&renomearRota(r.id,editRota.nome)} style={ipt} autoFocus />
                      <Btn variant="yellow" style={{padding:"11px 14px",fontSize:12}} onClick={()=>renomearRota(r.id,editRota.nome)}>OK</Btn>
                      <Btn variant="ghost" style={{padding:"11px 12px",fontSize:12}} onClick={()=>setEditRota(null)}>✕</Btn>
                    </div>
                  ) : (
                    <>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                        <div>
                          <div style={{ fontSize:15, fontWeight:600, color:C.text }}>📍 {r.nome}</div>
                          <div style={{ fontSize:12, color:C.gray, marginTop:2 }}>{qtd} PDV{qtd!==1?"s":""}</div>
                        </div>
                        {isHoje&&<span style={{ fontSize:10, fontWeight:700, padding:"4px 10px", borderRadius:99, background:C.yellowDim, color:"#92400e" }}>HOJE</span>}
                      </div>
                      <div style={{ display:"flex", gap:7 }}>
                        <Btn variant="ghost" style={{flex:1,padding:"10px 0",fontSize:12}} onClick={()=>setEditRota({id:r.id,nome:r.nome})}>✏️ Renomear</Btn>
                        {isDelR ? (
                          <>
                            <Btn variant="danger" style={{padding:"10px 0",fontSize:11,flex:1}} onClick={()=>removerRota(r.id)}>Confirmar</Btn>
                            <Btn variant="ghost" style={{padding:"10px 10px",fontSize:11}} onClick={()=>setConfirmDelRota(null)}>✕</Btn>
                          </>
                        ) : (
                          <Btn variant="danger" style={{padding:"10px 12px",fontSize:12}} onClick={()=>setConfirmDelRota(r.id)}>🗑</Btn>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ABA AGENDA ── */}
      {aba==="agenda"&&(
        <div style={{ padding:"16px 16px 0" }}>
          {/* Navegação de mês */}
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
            <Btn variant="ghost" style={{ padding:"10px 16px", fontSize:18 }} onClick={prevMonth}>‹</Btn>
            <div style={{ flex:1, textAlign:"center" }}>
              <div style={{ fontSize:16, fontWeight:700, color:C.text }}>{MONTHS_PT[agendaMonth-1]}</div>
              <div style={{ fontSize:12, color:C.gray }}>{agendaYear}</div>
            </div>
            <Btn variant="ghost" style={{ padding:"10px 16px", fontSize:18 }} onClick={nextMonth}>›</Btn>
          </div>

          {rotas.length === 0 ? (
            <div style={{ textAlign:"center", padding:"3rem 0", color:C.gray, fontSize:13 }}>
              Crie rotas primeiro na aba Rotas.
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {Array.from({ length: daysInMonth(agendaYear, agendaMonth) }, (_, i) => i + 1).map(dia => {
                const dateStr = toDateStr(agendaYear, agendaMonth, dia);
                const items   = agendaMes.filter(a => a.data === dateStr).sort((a,b) => a.ordem-b.ordem);
                const weekday = WEEKDAY[new Date(dateStr+"T12:00:00").getDay()];
                const isToday = dateStr === TODAY;
                const isPast  = dateStr < TODAY;
                const rotasDisponiveis = rotas.filter(r => !items.find(i => i.rota_id === r.id));

                return (
                  <div key={dia} style={{
                    background: C.white,
                    border: `1px solid ${isToday ? C.blue : C.border}`,
                    borderLeft: `3px solid ${isToday ? C.blue : items.length>0 ? C.yellow : C.border}`,
                    borderRadius:14, padding:"12px 14px",
                    opacity: isPast && !isToday ? 0.6 : 1,
                  }}>
                    <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                      {/* Dia */}
                      <div style={{ minWidth:42, textAlign:"center", flexShrink:0 }}>
                        <div style={{ fontSize:18, fontWeight:700, color: isToday ? C.blue : C.text, lineHeight:1 }}>{padZ(dia)}</div>
                        <div style={{ fontSize:10, color: isToday ? C.blue : C.gray, fontWeight:600, marginTop:2 }}>{weekday}</div>
                        {isToday && <div style={{ fontSize:9, color:C.blue, fontWeight:700, letterSpacing:"0.04em", marginTop:2 }}>HOJE</div>}
                      </div>

                      {/* Rotas atribuídas + botão adicionar */}
                      <div style={{ flex:1, display:"flex", flexWrap:"wrap", gap:6, alignItems:"center" }}>
                        {items.map((item, idx) => {
                          const rota = rotas.find(r => r.id === item.rota_id);
                          return (
                            <div key={item.id} style={{
                              display:"flex", alignItems:"center", gap:5,
                              background: C.blueDim, borderRadius:99,
                              padding:"5px 10px 5px 12px", fontSize:12, fontWeight:600, color:C.blue,
                            }}>
                              <span>{idx+1}. {rota?.nome||"?"}</span>
                              <button
                                onClick={()=>removerAgendaItem(item.id, item.data)}
                                style={{ background:"none", border:"none", cursor:"pointer", color:C.blue, fontSize:14, lineHeight:1, padding:"0 2px", opacity:0.6 }}
                              >×</button>
                            </div>
                          );
                        })}

                        {items.length < 2 && rotasDisponiveis.length > 0 && (
                          <select
                            value=""
                            onChange={e => {
                              if (!e.target.value) return;
                              adicionarAgendaItem(dateStr, e.target.value, items.length + 1);
                              e.target.value = "";
                            }}
                            style={{
                              fontSize:11, fontWeight:600, color:C.blue,
                              background:C.grayDim, border:`1px dashed ${C.border}`,
                              borderRadius:99, padding:"5px 10px", cursor:"pointer",
                              fontFamily:FONT, outline:"none",
                            }}
                          >
                            <option value="">+ Rota</option>
                            {rotasDisponiveis.map(r => (
                              <option key={r.id} value={r.id}>{r.nome}</option>
                            ))}
                          </select>
                        )}

                        {items.length === 0 && (
                          <span style={{ fontSize:12, color:C.gray, fontStyle:"italic" }}>Sem rota</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* BOTTOM NAV */}
      <nav style={{
        position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)",
        width:"min(440px, 100%)", padding:"8px 16px 24px",
        background:`linear-gradient(transparent, ${C.bg} 35%)`, zIndex:50,
      }}>
        <div style={{ background:C.nav, borderRadius:99, padding:"5px", display:"flex" }}>
          {NAV_TABS.map(([v, icon, label])=>(
            <button key={v} onClick={()=>{setAba(v);setShowAdd(false);}} style={{
              flex:1, padding:"9px 4px", border:"none", cursor:"pointer",
              borderRadius:94, fontFamily:FONT,
              background: aba===v ? C.white : "transparent",
              display:"flex", flexDirection:"column", alignItems:"center", gap:2,
              transition:"background 0.15s",
            }}>
              <i className={`ti ${icon}`} style={{ fontSize:18, color: aba===v ? C.text : "#6b7280" }} />
              <span style={{ fontSize:9, fontWeight:600, color: aba===v ? C.text : "#6b7280" }}>{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
