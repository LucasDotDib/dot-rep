import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { C, ipt, Btn, FormPDV, BottomNav, StatCard, HeroBanner, TODAY, daysSince, fmtDate, fmtTime, fromDB, TIPO_LABEL, ORDER, visitStatus } from "./ui";

// ── Shared styles ──────────────────────────────────────────────
const card = {
  background:C.white, borderRadius:16,
  border:`0.5px solid ${C.border}`,
};

const sectionLabel = {
  fontSize:11, fontWeight:500, color:C.muted,
  letterSpacing:".04em", marginBottom:8,
  display:"flex", alignItems:"center", justifyContent:"space-between",
};

// row inside a list-card
function ListRow({ dot, name, sub, val, valColor, last }) {
  return (
    <div style={{
      display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"11px 14px",
      borderBottom: last ? "none" : `0.5px solid ${C.border}`,
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:8, height:8, borderRadius:"50%", background:dot, flexShrink:0 }} />
        <div>
          <div style={{ fontSize:13, fontWeight:500, color:C.text }}>{name}</div>
          {sub && <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>{sub}</div>}
        </div>
      </div>
      <div style={{ fontSize:13, fontWeight:500, color:valColor||C.muted }}>{val}</div>
    </div>
  );
}

export default function AdminView({ onLogout }) {
  const [aba, setAba]             = useState("geral");
  const [stores, setStores]       = useState(null);
  const [visitas, setVisitas]     = useState([]);
  const [rotas, setRotas]         = useState([]);
  const [rotaAtiva, setRotaAtiva] = useState(null);
  const [erro, setErro]           = useState(null);
  const [showAdd, setShowAdd]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [selectedPdv, setSelectedPdv]       = useState(null);
  const [searchPdv, setSearchPdv]           = useState("");
  const [novaRota, setNovaRota]             = useState("");
  const [editRota, setEditRota]             = useState(null);
  const [confirmDelRota, setConfirmDelRota] = useState(null);
  const [selectedDate, setSelectedDate]     = useState(TODAY);
  const [confirmDelPdv, setConfirmDelPdv]   = useState(null);

  const carregar = useCallback(async () => {
    const [pdvs, vis, rts, ativa] = await Promise.all([
      supabase.from("pdvs").select("*").order("criado_em",{ascending:true}),
      supabase.from("visitas").select("*").order("criado_em",{ascending:false}),
      supabase.from("rotas").select("*").order("nome",{ascending:true}),
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
      .on("postgres_changes",{event:"*",schema:"public",table:"pdvs"},()=>carregar())
      .on("postgres_changes",{event:"*",schema:"public",table:"visitas"},()=>carregar())
      .on("postgres_changes",{event:"*",schema:"public",table:"rotas"},()=>carregar())
      .on("postgres_changes",{event:"*",schema:"public",table:"rota_ativa"},()=>carregar())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [carregar]);

  const adicionar = useCallback(async (form) => {
    setSaving(true);
    const { error } = await supabase.from("pdvs").insert([{
      id:Date.now().toString(), nome:form.nome.trim(), endereco:form.end.trim(),
      cep:form.cep.replace(/\D/g,""), tipo:form.tipo, prioridade:form.prio,
      vendeu_dot:false, ultima_visita:null, obs:"", rota_id:form.rotaId||null,
    }]);
    if (error) setErro(error.message); else setShowAdd(false);
    setSaving(false);
  }, []);

  const adicionarRota = useCallback(async () => {
    if (!novaRota.trim()) return;
    const { error } = await supabase.from("rotas").insert([{id:Date.now().toString(),nome:novaRota.trim()}]);
    if (error) setErro(error.message); else setNovaRota("");
  }, [novaRota]);

  const renomearRota = useCallback(async (id, nome) => {
    if (!nome.trim()) return;
    const { error } = await supabase.from("rotas").update({nome:nome.trim()}).eq("id",id);
    if (error) setErro(error.message); else setEditRota(null);
  }, []);

  const removerRota = useCallback(async (id) => {
    await supabase.from("pdvs").update({rota_id:null}).eq("rota_id",id);
    if (rotaAtiva===id) await supabase.from("rota_ativa").update({rota_id:null}).eq("id",1);
    const { error } = await supabase.from("rotas").delete().eq("id",id);
    if (error) setErro(error.message); else setConfirmDelRota(null);
  }, [rotaAtiva]);

  const removerPdv = useCallback(async (id) => {
    const { error } = await supabase.from("pdvs").delete().eq("id",id);
    if (error) setErro(error.message); else { setSelectedPdv(null); setConfirmDelPdv(null); }
  }, []);

  const ativarRota = useCallback(async (id) => {
    const { error } = await supabase.from("rota_ativa").update({rota_id:id,ativada_em:new Date().toISOString()}).eq("id",1);
    if (error) setErro(error.message);
  }, []);

  // ── Loading / Error ──
  if (!stores) return (
    <div style={{ background:C.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:28, height:28, border:`3px solid ${C.border}`, borderTopColor:C.blue, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
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

  // ── Derived data (unchanged) ──
  const rotaAtivaObj  = rotas.find(r=>r.id===rotaAtiva);
  const pdvsRotaAtiva = stores.filter(s=>s.rotaId===rotaAtiva);
  const visitadosHoje = pdvsRotaAtiva.filter(s=>daysSince(s.visita)===0).length;
  const visitasPorPdv = {};
  for (const v of visitas) { if(!visitasPorPdv[v.pdv_id])visitasPorPdv[v.pdv_id]=[]; visitasPorPdv[v.pdv_id].push(v); }
  const visitasDoDia    = visitas.filter(v=>v.data===selectedDate);
  const visitasDoDiaIds = new Set(visitasDoDia.map(v=>v.pdv_id));
  const prevDay = () => { const d=new Date(selectedDate+"T12:00:00"); d.setDate(d.getDate()-1); setSelectedDate(d.toISOString().split("T")[0]); };
  const nextDay = () => { const d=new Date(selectedDate+"T12:00:00"); d.setDate(d.getDate()+1); setSelectedDate(d.toISOString().split("T")[0]); };

  const TABS = [["geral","📊","Geral"],["historico","📅","Dia"],["pdvs","🏪","PDVs"],["rotas","📍","Rotas"],["pendentes","⚠️","Pend."],["consig","📦","Consig."]];

  return (
    <div style={{
      fontFamily:"'SF Pro Display',-apple-system,BlinkMacSystemFont,sans-serif",
      background:C.bg, minHeight:"100vh", maxWidth:440, margin:"0 auto", paddingBottom:100,
    }}>

      {/* ── HEADER ── */}
      <div style={{ background:C.white, padding:"14px 16px", borderBottom:`0.5px solid ${C.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:9, background:C.blue, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17 }}>⚡</div>
            <div>
              <p style={{ margin:0, fontSize:10, color:C.muted, letterSpacing:".06em", textTransform:"uppercase" }}>Dot Energy · Admin</p>
              <h1 style={{ margin:0, fontSize:17, fontWeight:500, color:C.text }}>Dashboard</h1>
            </div>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            {aba==="pdvs" && (
              <Btn variant={showAdd?"danger":"blue"} style={{padding:"7px 13px",fontSize:12}}
                onClick={()=>setShowAdd(v=>!v)}>
                {showAdd ? "✕" : "+ PDV"}
              </Btn>
            )}
            <Btn variant="ghost" style={{padding:"7px 12px",fontSize:12}} onClick={onLogout}>Sair</Btn>
          </div>
        </div>
      </div>

      {/* ── ABA GERAL ── */}
      {aba==="geral" && (
        <div style={{ padding:14 }}>
          {rotaAtivaObj ? (
            <HeroBanner
              label="Rota ativa hoje"
              name={rotaAtivaObj.nome}
              sub={`${visitadosHoje} de ${pdvsRotaAtiva.length} visitados`}
              visitados={visitadosHoje}
              total={pdvsRotaAtiva.length}
            />
          ) : (
            <div style={{ ...card, padding:"16px 18px", marginBottom:14, textAlign:"center" }}>
              <p style={{ margin:0, fontSize:14, color:C.muted }}>Nenhuma rota ativa hoje.</p>
            </div>
          )}

          {/* stat grid */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
            <StatCard icon="🏪" value={stores.length}
              label="Total de PDVs" bg={C.blueDim} color={C.blue} />
            <StatCard icon="✅" value={visitas.filter(v=>v.data===TODAY).length}
              label="Visitas hoje" bg="#e6f9f5" color="#27500a"
              delta={`↑ visitas esta semana: ${visitas.filter(v=>{const d=daysSince(v.data);return d!==null&&d<=6;}).length}`} />
            <StatCard icon="⚠️" value={stores.filter(s=>!s.visita).length}
              label="Nunca visitados" bg={C.redDim} color={C.red} />
            <StatCard icon="📦" value={stores.filter(s=>s.consignado).length}
              label="Consignados" bg={C.purpleDim} color={C.purple} />
          </div>

          {/* pendentes da rota */}
          {rotaAtivaObj && pdvsRotaAtiva.length > 0 && (
            <>
              <div style={sectionLabel}>
                <span>Pendentes na rota</span>
              </div>
              <div style={{ ...card, overflow:"hidden" }}>
                {pdvsRotaAtiva.filter(s=>daysSince(s.visita)!==0).length === 0 ? (
                  <p style={{ margin:0, textAlign:"center", color:"#27500a", fontSize:13, fontWeight:500, padding:"14px 0" }}>🎉 Todos visitados hoje!</p>
                ) : pdvsRotaAtiva.filter(s=>daysSince(s.visita)!==0).map((s,i,arr) => {
                  const d = s.visita ? daysSince(s.visita) : null;
                  const col = !s.visita ? C.muted : d>14 ? C.red : C.amber;
                  return (
                    <ListRow key={s.id}
                      dot={col} name={s.nome} sub={TIPO_LABEL[s.tipo]}
                      val={d!==null ? `${d}d` : "nunca"} valColor={col}
                      last={i===arr.filter(s=>daysSince(s.visita)!==0).length-1} />
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── ABA HISTÓRICO (DIA) ── */}
      {aba==="historico" && (
        <div style={{ padding:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
            <Btn variant="ghost" style={{padding:"9px 15px",fontSize:18}} onClick={prevDay}>‹</Btn>
            <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}
              style={{...ipt,flex:1,textAlign:"center",padding:"9px 8px"}} />
            <Btn variant="ghost" style={{padding:"9px 15px",fontSize:18}} onClick={nextDay}>›</Btn>
          </div>
          {selectedDate!==TODAY && (
            <Btn variant="ghost" style={{width:"100%",padding:"8px 0",fontSize:12,marginBottom:14}}
              onClick={()=>setSelectedDate(TODAY)}>Ir para hoje</Btn>
          )}
          {visitasDoDia.length === 0 ? (
            <div style={{ textAlign:"center", padding:"3rem 1rem" }}>
              <div style={{ fontSize:36, marginBottom:10 }}>📋</div>
              <p style={{ color:C.muted, fontSize:14 }}>Nenhuma visita em {fmtDate(selectedDate)||selectedDate}.</p>
            </div>
          ) : (
            <>
              <div style={sectionLabel}>
                <span>Visitados — {fmtDate(selectedDate)||selectedDate} ({visitasDoDia.length})</span>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {visitasDoDia.map(v => {
                  const pdv = stores.find(s=>s.id===v.pdv_id);
                  return (
                    <div key={v.id} style={{ ...card, padding:"12px 14px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                        <div style={{ flex:1 }}>
                          <p style={{ margin:"0 0 2px", fontSize:13, fontWeight:500, color:C.text }}>{pdv?.nome||"PDV removido"}</p>
                          {pdv && <p style={{ margin:0, fontSize:11, color:C.muted }}>{pdv.end}</p>}
                          {v.obs && <p style={{ margin:"6px 0 0", fontSize:12, color:C.muted, fontStyle:"italic", borderTop:`0.5px solid ${C.border}`, paddingTop:6 }}>"{v.obs}"</p>}
                        </div>
                        <span style={{ fontSize:11, color:C.muted, fontFamily:"monospace" }}>{fmtTime(v.criado_em)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {rotaAtivaObj && selectedDate===TODAY && pdvsRotaAtiva.filter(s=>!visitasDoDiaIds.has(s.id)).length > 0 && (
                <div style={{ marginTop:16 }}>
                  <div style={{...sectionLabel, marginBottom:8}}>
                    <span>Não visitados ({pdvsRotaAtiva.filter(s=>!visitasDoDiaIds.has(s.id)).length})</span>
                  </div>
                  <div style={{ ...card, overflow:"hidden" }}>
                    {pdvsRotaAtiva.filter(s=>!visitasDoDiaIds.has(s.id)).map((s,i,arr) => (
                      <ListRow key={s.id}
                        dot={C.redDim} name={s.nome}
                        val={s.visita ? `${daysSince(s.visita)}d atrás` : "nunca"}
                        valColor={C.muted} last={i===arr.length-1} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── ABA PDVs ── */}
      {aba==="pdvs" && (
        <div style={{ padding:14 }}>
          {showAdd && (
            <div style={{ ...card, padding:16, marginBottom:14 }}>
              <p style={{margin:"0 0 12px",fontSize:11,fontWeight:600,color:C.blue,textTransform:"uppercase",letterSpacing:".08em"}}>Novo PDV</p>
              <FormPDV initial={{nome:"",end:"",cep:"",tipo:"facu",prio:0,rotaId:null}}
                onSave={adicionar} onCancel={()=>setShowAdd(false)} saving={saving} rotas={rotas} />
            </div>
          )}
          <input type="text" placeholder="Buscar PDV…" value={searchPdv}
            onChange={e=>{setSearchPdv(e.target.value);setSelectedPdv(null);}}
            style={{...ipt,marginBottom:12}} />
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {stores
              .filter(s=>!searchPdv||s.nome.toLowerCase().includes(searchPdv.toLowerCase())||(s.end||"").toLowerCase().includes(searchPdv.toLowerCase()))
              .sort((a,b)=>ORDER[visitStatus(a.visita)]-ORDER[visitStatus(b.visita)])
              .map(s => {
                const hist = visitasPorPdv[s.id]||[], isSelected = selectedPdv===s.id;
                const d    = s.visita ? daysSince(s.visita) : null;
                const col  = !s.visita ? C.muted : d===0 ? "#27500a" : d<=14 ? C.amber : C.red;
                const barCol = !s.visita ? C.grayDim : d===0 ? "#639922" : d<=14 ? C.amber : C.red;
                return (
                  <div key={s.id} style={{ ...card, overflow:"hidden" }}>
                    <div style={{ display:"flex", alignItems:"stretch", cursor:"pointer" }}
                      onClick={()=>setSelectedPdv(isSelected?null:s.id)}>
                      <div style={{ width:3, background:barCol, flexShrink:0 }} />
                      <div style={{ flex:1, padding:"12px 13px", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                        <div style={{ flex:1 }}>
                          <p style={{ margin:"0 0 2px", fontSize:14, fontWeight:500, color:C.text }}>{s.nome}</p>
                          <p style={{ margin:0, fontSize:11, color:C.muted }}>{TIPO_LABEL[s.tipo]} · {s.end}</p>
                          {s.consignado && (
                            <span style={{ fontSize:10, padding:"2px 6px", borderRadius:5, background:C.purpleDim, color:C.purple, marginTop:5, display:"inline-block" }}>📦 Consig.</span>
                          )}
                        </div>
                        <div style={{ textAlign:"right", marginLeft:8, flexShrink:0 }}>
                          <p style={{ margin:"0 0 2px", fontSize:13, fontWeight:500, color:col }}>
                            {d!==null ? d===0 ? "hoje" : `${d}d atrás` : "nunca"}
                          </p>
                          <p style={{ margin:0, fontSize:10, color:C.muted }}>{hist.length} visita{hist.length!==1?"s":""}</p>
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <div style={{ padding:"0 14px 14px", borderTop:`0.5px solid ${C.border}`, background:C.surface2 }}>
                        {s.obs && (
                          <p style={{ margin:"10px 0 8px", fontSize:12, color:C.muted, borderBottom:`0.5px solid ${C.border}`, paddingBottom:8 }}>
                            <span style={{color:C.grayDim,fontSize:10}}>OBS: </span>{s.obs}
                          </p>
                        )}
                        {hist.length === 0 ? (
                          <p style={{ margin:"12px 0 0", textAlign:"center", color:C.muted, fontSize:12 }}>Nenhuma visita registrada.</p>
                        ) : (
                          <>
                            <p style={{ margin:"10px 0 6px", fontSize:10, color:C.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:".06em" }}>Histórico</p>
                            <div style={{ ...card, overflow:"hidden" }}>
                              {hist.map((v,i)=>(
                                <div key={v.id} style={{ fontSize:12, padding:"8px 11px", borderBottom:i<hist.length-1?`0.5px solid ${C.border}`:"none", display:"flex", gap:8, alignItems:"flex-start" }}>
                                  <span style={{ color:C.blue, fontWeight:600, fontFamily:"monospace", flexShrink:0 }}>{fmtDate(v.data)}</span>
                                  <span style={{ color:C.muted, fontSize:10, flexShrink:0 }}>{fmtTime(v.criado_em)}</span>
                                  {v.obs ? <span style={{color:C.muted}}>{v.obs}</span> : <span style={{color:C.grayDim,fontStyle:"italic"}}>sem obs.</span>}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                        <div style={{ marginTop:12, paddingTop:10, borderTop:`0.5px solid ${C.border}`, display:"flex", gap:6, justifyContent:"flex-end" }}>
                          {confirmDelPdv===s.id ? (
                            <>
                              <Btn variant="danger" style={{padding:"7px 13px",fontSize:12}} onClick={()=>removerPdv(s.id)}>Confirmar exclusão</Btn>
                              <Btn variant="ghost"  style={{padding:"7px 10px",fontSize:12}} onClick={()=>setConfirmDelPdv(null)}>✕</Btn>
                            </>
                          ) : (
                            <Btn variant="danger" style={{padding:"7px 12px",fontSize:12}} onClick={()=>setConfirmDelPdv(s.id)}>🗑 Excluir PDV</Btn>
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
      {aba==="rotas" && (
        <div style={{ padding:14 }}>
          <div style={{ ...card, padding:16, marginBottom:14 }}>
            <p style={{margin:"0 0 12px",fontSize:11,fontWeight:600,color:C.blue,textTransform:"uppercase",letterSpacing:".08em"}}>Nova Rota</p>
            <div style={{ display:"flex", gap:8 }}>
              <input placeholder="Ex: Paulista, Itaim…" value={novaRota}
                onChange={e=>setNovaRota(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&adicionarRota()} style={ipt} />
              <Btn variant={novaRota.trim()?"blue":"ghost"} style={{padding:"10px 18px",opacity:novaRota.trim()?1:0.4}} onClick={adicionarRota}>+</Btn>
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {rotas.length===0 ? (
              <p style={{ textAlign:"center", color:C.muted, fontSize:14, padding:"3rem 0" }}>Nenhuma rota criada ainda.</p>
            ) : rotas.map(r => {
              const qtd = stores.filter(s=>s.rotaId===r.id).length;
              const isActive   = rotaAtiva===r.id;
              const isEditingR = editRota?.id===r.id;
              const isDelR     = confirmDelRota===r.id;
              return (
                <div key={r.id} style={{
                  ...card, padding:"14px 16px",
                  borderLeft:`3px solid ${isActive ? C.blue : C.border}`,
                }}>
                  {isEditingR ? (
                    <div style={{ display:"flex", gap:6 }}>
                      <input value={editRota.nome}
                        onChange={e=>setEditRota({...editRota,nome:e.target.value})}
                        onKeyDown={e=>e.key==="Enter"&&renomearRota(r.id,editRota.nome)}
                        style={ipt} autoFocus />
                      <Btn variant="blue"  style={{padding:"10px 13px",fontSize:12}} onClick={()=>renomearRota(r.id,editRota.nome)}>OK</Btn>
                      <Btn variant="ghost" style={{padding:"10px 11px",fontSize:12}} onClick={()=>setEditRota(null)}>✕</Btn>
                    </div>
                  ) : (
                    <>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                        <div>
                          <p style={{ margin:"0 0 3px", fontSize:15, fontWeight:500, color:C.text }}>📍 {r.nome}</p>
                          <p style={{ margin:0, fontSize:12, color:C.muted }}>{qtd} PDV{qtd!==1?"s":""}</p>
                        </div>
                        {isActive && (
                          <span style={{ fontSize:10, fontWeight:600, padding:"3px 9px", borderRadius:5, background:C.blueDim, color:C.blue }}>ATIVA HOJE</span>
                        )}
                      </div>
                      <div style={{ display:"flex", gap:6 }}>
                        {!isActive ? (
                          <Btn variant="blue" style={{flex:1,padding:"9px 0",fontSize:12}} onClick={()=>ativarRota(r.id)}>🎯 Ativar para hoje</Btn>
                        ) : (
                          <Btn variant="green" style={{flex:1,padding:"9px 0",fontSize:12,opacity:.8,cursor:"default"}}>✓ Em andamento</Btn>
                        )}
                        <Btn variant="ghost" style={{padding:"9px 11px",fontSize:12}} onClick={()=>setEditRota({id:r.id,nome:r.nome})}>✏️</Btn>
                        {isDelR ? (
                          <>
                            <Btn variant="danger" style={{flex:1,padding:"9px 0",fontSize:11}} onClick={()=>removerRota(r.id)}>Confirmar</Btn>
                            <Btn variant="ghost"  style={{padding:"9px 10px",fontSize:11}} onClick={()=>setConfirmDelRota(null)}>✕</Btn>
                          </>
                        ) : (
                          <Btn variant="danger" style={{padding:"9px 11px",fontSize:12}} onClick={()=>setConfirmDelRota(r.id)}>🗑</Btn>
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
      {aba==="pendentes" && (
        <div style={{ padding:14 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
            {[
              { icon:"🕳️", val:stores.filter(s=>!s.visita).length,             color:C.muted,  bg:"#f3f4f6",  label:"Nunca" },
              { icon:"🚨", val:stores.filter(s=>s.visita&&daysSince(s.visita)>30).length, color:C.red,  bg:C.redDim,   label:"+30 dias" },
              { icon:"⏳", val:stores.filter(s=>s.visita&&daysSince(s.visita)>14&&daysSince(s.visita)<=30).length, color:C.amber,bg:C.amberDim,label:"15-30 dias"},
              { icon:"✅", val:stores.filter(s=>s.visita&&daysSince(s.visita)<=14).length, color:"#27500a",bg:C.greenDim,label:"Em dia" },
            ].map(({ icon, val, color, bg, label }) => (
              <div key={label} style={{ ...card, padding:"14px 15px" }}>
                <div style={{ width:34, height:34, borderRadius:10, background:bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, marginBottom:10 }}>{icon}</div>
                <div style={{ fontSize:26, fontWeight:500, color, lineHeight:1 }}>{val}</div>
                <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={sectionLabel}><span>Todos os PDVs por urgência</span></div>
          <div style={{ ...card, overflow:"hidden" }}>
            {stores
              .sort((a,b)=>{ const da=a.visita?daysSince(a.visita):9999, db=b.visita?daysSince(b.visita):9999; return db-da; })
              .map((s,i,arr) => {
                const d   = s.visita ? daysSince(s.visita) : null;
                const col = !s.visita ? C.muted : d>30 ? C.red : d>14 ? C.amber : "#27500a";
                return (
                  <ListRow key={s.id}
                    dot={col} name={s.nome} sub={`${TIPO_LABEL[s.tipo]} · ${s.end}`}
                    val={d!==null ? `${d}d` : "nunca"} valColor={col}
                    last={i===arr.length-1} />
                );
              })}
          </div>
        </div>
      )}

      {/* ── ABA CONSIG ── */}
      {aba==="consig" && (
        <div style={{ padding:14 }}>
          {(() => {
            const consignados = stores.filter(s=>s.consignado);
            return (
              <>
                {/* consig hero */}
                <div style={{ background:"#3c3489", borderRadius:16, padding:"16px 18px", marginBottom:14, color:"#fff" }}>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,.5)", letterSpacing:".06em", textTransform:"uppercase", marginBottom:6 }}>Displays consignados</div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:4 }}>
                    <div style={{ fontSize:17, fontWeight:500 }}>📦 Em campo</div>
                    <div style={{ fontSize:32, fontWeight:500, color:"#c4b5fd", lineHeight:1 }}>{consignados.length}</div>
                  </div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,.5)" }}>PDV{consignados.length!==1?"s":""} com display deixado para consignação</div>
                </div>

                {consignados.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"4rem 1rem" }}>
                    <div style={{ fontSize:48, marginBottom:14 }}>📦</div>
                    <p style={{ color:C.muted, fontSize:14 }}>Nenhum PDV com display consignado ainda.</p>
                  </div>
                ) : (
                  <>
                    <div style={sectionLabel}><span>Lista de consignados</span></div>
                    <div style={{ ...card, overflow:"hidden" }}>
                      {consignados
                        .sort((a,b)=>{ const da=a.visita?daysSince(a.visita):9999, db=b.visita?daysSince(b.visita):9999; return db-da; })
                        .map((s,i,arr) => {
                          const d   = s.visita ? daysSince(s.visita) : null;
                          const col = !s.visita ? C.muted : d===0 ? "#27500a" : d<=14 ? C.amber : C.red;
                          return (
                            <ListRow key={s.id}
                              dot="#7c3aed" name={s.nome}
                              sub={`${TIPO_LABEL[s.tipo]} · ${s.end}`}
                              val={d!==null ? d===0 ? "hoje" : `${d}d` : "nunca"}
                              valColor={col} last={i===arr.length-1} />
                          );
                        })}
                    </div>
                  </>
                )}
              </>
            );
          })()}
        </div>
      )}

      <BottomNav aba={aba} setAba={(v)=>{setAba(v);setShowAdd(false);}} tabs={TABS} />
    </div>
  );
}
