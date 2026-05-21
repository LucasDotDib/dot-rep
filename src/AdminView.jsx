import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { C, ipt, Btn, FormPDV, TODAY, daysSince, fmtDate, fmtTime, fromDB, TIPO_LABEL, getUrgencia, URGENCIA } from "./ui";

const FONT = "'Poppins', sans-serif";
const URG_ORDER = { critica:0, media:1, ok:2 };
const cepCmp = (a,b) => (a.cep||"").replace(/\D/g,"").localeCompare((b.cep||"").replace(/\D/g,""));

export default function AdminView({ onLogout }) {
  const [aba,       setAba]       = useState("geral");
  const [stores,    setStores]    = useState(null);
  const [visitas,   setVisitas]   = useState([]);
  const [rotas,     setRotas]     = useState([]);
  const [rotaAtiva, setRotaAtiva] = useState(null);
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

  const carregar = useCallback(async () => {
    const [pdvs, vis, rts, ativa] = await Promise.all([
      supabase.from("pdvs").select("*").order("criado_em", { ascending:true }),
      supabase.from("visitas").select("*").order("criado_em", { ascending:false }),
      supabase.from("rotas").select("*").order("nome", { ascending:true }),
      supabase.from("rota_ativa").select("*").eq("id",1).single(),
    ]);
    if (pdvs.error) { setErro(pdvs.error.message); return; }
    setStores((pdvs.data||[]).map(fromDB));
    setVisitas(vis.data||[]);
    setRotas(rts.data||[]);
    setRotaAtiva(ativa.data?.rota_id||null);
  }, []);

  useEffect(() => {
    carregar();
    const ch = supabase.channel("admin-changes")
      .on("postgres_changes", { event:"*", schema:"public", table:"pdvs" },       ()=>carregar())
      .on("postgres_changes", { event:"*", schema:"public", table:"visitas" },    ()=>carregar())
      .on("postgres_changes", { event:"*", schema:"public", table:"rotas" },      ()=>carregar())
      .on("postgres_changes", { event:"*", schema:"public", table:"rota_ativa" }, ()=>carregar())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [carregar]);

  const adicionar = useCallback(async (form) => {
    setSaving(true);
    const { error } = await supabase.from("pdvs").insert([{
      id:Date.now().toString(), nome:form.nome.trim(), endereco:form.end.trim(),
      cep:form.cep.replace(/\D/g,""), tipo:form.tipo, prioridade:0,
      vendeu_dot:false, ultima_visita:null, obs:"", rota_id:form.rotaId||null,
    }]);
    if (error) setErro(error.message); else setShowAdd(false);
    setSaving(false);
  }, []);

  const editar = useCallback(async (id, form) => {
    setSaving(true);
    const { error } = await supabase.from("pdvs").update({
      nome:form.nome.trim(), endereco:form.end.trim(),
      cep:form.cep.replace(/\D/g,""), tipo:form.tipo, rota_id:form.rotaId,
    }).eq("id", id);
    if (error) setErro(error.message); else setEditingPdv(null);
    setSaving(false);
  }, []);

  const adicionarRota = useCallback(async () => {
    if (!novaRota.trim()) return;
    const { error } = await supabase.from("rotas").insert([{ id:Date.now().toString(), nome:novaRota.trim() }]);
    if (error) setErro(error.message); else setNovaRota("");
  }, [novaRota]);

  const renomearRota = useCallback(async (id, nome) => {
    if (!nome.trim()) return;
    const { error } = await supabase.from("rotas").update({ nome:nome.trim() }).eq("id", id);
    if (error) setErro(error.message); else setEditRota(null);
  }, []);

  const removerRota = useCallback(async (id) => {
    await supabase.from("pdvs").update({ rota_id:null }).eq("rota_id", id);
    if (rotaAtiva===id) await supabase.from("rota_ativa").update({ rota_id:null }).eq("id", 1);
    const { error } = await supabase.from("rotas").delete().eq("id", id);
    if (error) setErro(error.message); else setConfirmDelRota(null);
  }, [rotaAtiva]);

  const ativarRota = useCallback(async (id) => {
    const { error } = await supabase.from("rota_ativa").update({ rota_id:id, ativada_em:new Date().toISOString() }).eq("id", 1);
    if (error) setErro(error.message);
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

  const rotaAtivaObj  = rotas.find(r=>r.id===rotaAtiva);
  const pdvsRotaAtiva = stores.filter(s=>s.rotaId===rotaAtiva);
  const visitadosHoje = pdvsRotaAtiva.filter(s=>daysSince(s.visita)===0).length;

  const visitasPorPdv = {};
  for (const v of visitas) {
    if (!visitasPorPdv[v.pdv_id]) visitasPorPdv[v.pdv_id] = [];
    visitasPorPdv[v.pdv_id].push(v);
  }

  const visitasDoDia    = visitas.filter(v=>v.data===selectedDate);
  const visitasDoDiaIds = new Set(visitasDoDia.map(v=>v.pdv_id));

  const prevDay = () => { const d=new Date(selectedDate+"T12:00:00"); d.setDate(d.getDate()-1); setSelectedDate(d.toISOString().split("T")[0]); };
  const nextDay = () => { const d=new Date(selectedDate+"T12:00:00"); d.setDate(d.getDate()+1); setSelectedDate(d.toISOString().split("T")[0]); };

  const NAV_TABS = [
    ["geral",     "ti-chart-bar",      "Geral" ],
    ["historico", "ti-calendar",       "Dia"   ],
    ["pdvs",      "ti-building-store", "PDVs"  ],
    ["rotas",     "ti-map-pin",        "Rotas" ],
    ["pendentes", "ti-alert-circle",   "Pend." ],
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
          <div style={{ background:C.blue, borderRadius:20, padding:"18px 20px", marginBottom:16 }}>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.6)", fontWeight:600, letterSpacing:"0.1em", marginBottom:4 }}>ROTA ATIVA HOJE</div>
            {rotaAtivaObj ? (
              <>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <div style={{ fontSize:18, fontWeight:700, color:"#fff" }}>📍 {rotaAtivaObj.nome}</div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:24, fontWeight:700, color:C.yellow }}>{pdvsRotaAtiva.length>0?Math.round((visitadosHoje/pdvsRotaAtiva.length)*100):0}%</div>
                  </div>
                </div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", marginBottom:10 }}>{visitadosHoje} de {pdvsRotaAtiva.length} visitados</div>
                {pdvsRotaAtiva.length>0&&(
                  <div style={{ height:5, background:"rgba(255,255,255,0.15)", borderRadius:99, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${(visitadosHoje/pdvsRotaAtiva.length)*100}%`, background:C.yellow, borderRadius:99, transition:"width 0.4s" }} />
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize:14, color:"rgba(255,255,255,0.6)" }}>Nenhuma rota ativa no momento.</div>
            )}
          </div>

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

          {rotaAtivaObj&&pdvsRotaAtiva.length>0&&(
            <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:16, padding:"14px 16px" }}>
              <div style={{ fontSize:11, color:C.muted, fontWeight:600, letterSpacing:"0.06em", marginBottom:10 }}>PENDENTES NA ROTA DE HOJE</div>
              {pdvsRotaAtiva.filter(s=>daysSince(s.visita)!==0).length===0 ? (
                <div style={{ textAlign:"center", padding:"8px 0", color:C.green, fontSize:13, fontWeight:600 }}>🎉 Todos visitados hoje!</div>
              ) : pdvsRotaAtiva.filter(s=>daysSince(s.visita)!==0).map(s=>(
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
              {rotaAtivaObj&&selectedDate===TODAY&&pdvsRotaAtiva.filter(s=>!visitasDoDiaIds.has(s.id)).length>0&&(
                <div style={{ marginTop:16 }}>
                  <div style={{ fontSize:11, color:C.muted, fontWeight:600, letterSpacing:"0.06em", marginBottom:8 }}>NÃO VISITADOS NA ROTA ({pdvsRotaAtiva.filter(s=>!visitasDoDiaIds.has(s.id)).length})</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                    {pdvsRotaAtiva.filter(s=>!visitasDoDiaIds.has(s.id)).map(s=>(
                      <div key={s.id} style={{ padding:"10px 14px", background:C.white, border:`1px solid ${C.border}`, borderLeft:`3px solid ${C.red}`, borderRadius:12, display:"flex", justifyContent:"space-between" }}>
                        <span style={{ fontSize:13, fontWeight:500, color:C.text }}>{s.nome}</span>
                        <span style={{ fontSize:11, color:C.gray }}>{s.visita?`${daysSince(s.visita)}d atrás`:"nunca"}</span>
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
              const isActive = rotaAtiva===r.id;
              const isEditingR = editRota?.id===r.id;
              const isDelR = confirmDelRota===r.id;
              return (
                <div key={r.id} style={{ background:C.white, border:`1px solid ${C.border}`, borderLeft:`3px solid ${isActive?C.yellow:C.border}`, borderRadius:14, padding:"14px 16px" }}>
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
                        {isActive&&<span style={{ fontSize:10, fontWeight:700, padding:"4px 10px", borderRadius:99, background:C.yellowDim, color:"#92400e" }}>ATIVA HOJE</span>}
                      </div>
                      <div style={{ display:"flex", gap:7 }}>
                        {!isActive ? (
                          <Btn variant="blue" style={{flex:1,padding:"10px 0",fontSize:12}}>
                            <span onClick={()=>ativarRota(r.id)}>🎯 Ativar para hoje</span>
                          </Btn>
                        ) : (
                          <Btn variant="green" style={{flex:1,padding:"10px 0",fontSize:12,opacity:0.8,cursor:"default"}}>✓ Em andamento</Btn>
                        )}
                        <Btn variant="ghost" style={{padding:"10px 12px",fontSize:12}} onClick={()=>setEditRota({id:r.id,nome:r.nome})}>✏️</Btn>
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

      {/* ── ABA PENDENTES ── */}
      {aba==="pendentes"&&(
        <div style={{ padding:"16px 16px 0" }}>
          {/* Contadores */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:16 }}>
            {[
              { label:"URGENTE",  val:stores.filter(s=>getUrgencia(s.visita)==="critica").length, color:"#ef4444", bg:"#fef2f2" },
              { label:"PENDENTE", val:stores.filter(s=>getUrgencia(s.visita)==="media").length,   color:"#d97706", bg:"#fffbeb" },
              { label:"EM DIA",   val:stores.filter(s=>getUrgencia(s.visita)==="ok").length,      color:"#16a34a", bg:"#f0fdf4" },
            ].map(({ label, val, color, bg })=>(
              <div key={label} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:"12px 0", textAlign:"center" }}>
                <div style={{ fontSize:20, fontWeight:700, color, fontVariantNumeric:"tabular-nums" }}>{val}</div>
                <div style={{ fontSize:10, color:C.gray, marginTop:3, fontWeight:500 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Seções por urgência */}
          {[
            { urg:"critica", icon:"🔴", label:"Urgente",   hColor:"#991b1b", hBg:"#fef2f2" },
            { urg:"media",   icon:"🟡", label:"Pendentes", hColor:"#92400e", hBg:"#fffbeb" },
            { urg:"ok",      icon:"✅", label:"Em dia",    hColor:"#166534", hBg:"#f0fdf4" },
          ].map(({ urg, icon, label, hColor, hBg })=>{
            const pdvs = stores.filter(s=>getUrgencia(s.visita)===urg).sort(cepCmp);
            if (pdvs.length===0) return null;
            const cfg = URGENCIA[urg];
            return (
              <div key={urg} style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, fontWeight:700, color:hColor, letterSpacing:"0.06em", padding:"8px 12px", background:hBg, borderRadius:10, marginBottom:8 }}>
                  {icon} {label} ({pdvs.length})
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                  {pdvs.map(s=>{
                    const d = s.visita ? daysSince(s.visita) : null;
                    return (
                      <div key={s.id} style={{ background:C.white, border:`1px solid ${C.border}`, borderLeft:`3px solid ${cfg.barColor}`, borderRadius:12, padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:14, fontWeight:600, color:C.text }}>{s.nome}</div>
                          <div style={{ fontSize:11, color:C.gray, marginTop:2 }}>{TIPO_LABEL[s.tipo]} · {s.end}</div>
                        </div>
                        <div style={{ textAlign:"right", flexShrink:0, marginLeft:10 }}>
                          <div style={{ fontSize:14, fontWeight:700, color:cfg.barColor, fontVariantNumeric:"tabular-nums" }}>{d!==null?`${d}d`:"nunca"}</div>
                          {s.visita&&<div style={{ fontSize:10, color:C.gray }}>{fmtDate(s.visita)}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
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
