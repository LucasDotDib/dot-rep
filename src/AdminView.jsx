import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import {
  C, R, font, ipt, Btn, FormPDV, BottomNav,
  HeroBanner, StatCard, ListRow, Badge,
  TODAY, daysSince, fmtDate, fmtTime, fromDB, TIPO_LABEL, ORDER, visitStatus,
} from "./ui";

const TABS = [
  ["geral",     "geral",     "Geral",   "📊"],
  ["historico", "historico", "Dia",     "📅"],
  ["pdvs",      "pdvs",      "PDVs",    "🏪"],
  ["rotas",     "rotas",     "Rotas",   "📍"],
  ["pendentes", "pendentes", "Pend.",   "⚠️"],
  ["consig",    "consig",    "Consig.", "📦"],
];

export default function AdminView({ onLogout }) {
  const [aba,             setAba]             = useState("geral");
  const [stores,          setStores]          = useState(null);
  const [visitas,         setVisitas]         = useState([]);
  const [rotas,           setRotas]           = useState([]);
  const [rotaAtiva,       setRotaAtiva]       = useState(null);
  const [erro,            setErro]            = useState(null);
  const [showAdd,         setShowAdd]         = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [selectedPdv,     setSelectedPdv]     = useState(null);
  const [searchPdv,       setSearchPdv]       = useState("");
  const [novaRota,        setNovaRota]        = useState("");
  const [editRota,        setEditRota]        = useState(null);
  const [confirmDelRota,  setConfirmDelRota]  = useState(null);
  const [selectedDate,    setSelectedDate]    = useState(TODAY);
  const [confirmDelPdv,   setConfirmDelPdv]   = useState(null);

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
      .on("postgres_changes",{event:"*",schema:"public",table:"pdvs"},      ()=>carregar())
      .on("postgres_changes",{event:"*",schema:"public",table:"visitas"},   ()=>carregar())
      .on("postgres_changes",{event:"*",schema:"public",table:"rotas"},     ()=>carregar())
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
    const { error } = await supabase.from("rotas").insert([{ id:Date.now().toString(), nome:novaRota.trim() }]);
    if (error) setErro(error.message); else setNovaRota("");
  }, [novaRota]);

  const renomearRota = useCallback(async (id, nome) => {
    if (!nome.trim()) return;
    const { error } = await supabase.from("rotas").update({ nome:nome.trim() }).eq("id",id);
    if (error) setErro(error.message); else setEditRota(null);
  }, []);

  const removerRota = useCallback(async (id) => {
    await supabase.from("pdvs").update({ rota_id:null }).eq("rota_id",id);
    if (rotaAtiva===id) await supabase.from("rota_ativa").update({ rota_id:null }).eq("id",1);
    const { error } = await supabase.from("rotas").delete().eq("id",id);
    if (error) setErro(error.message); else setConfirmDelRota(null);
  }, [rotaAtiva]);

  const removerPdv = useCallback(async (id) => {
    const { error } = await supabase.from("pdvs").delete().eq("id",id);
    if (error) setErro(error.message); else { setSelectedPdv(null); setConfirmDelPdv(null); }
  }, []);

  const ativarRota = useCallback(async (id) => {
    const { error } = await supabase.from("rota_ativa").update({ rota_id:id, ativada_em:new Date().toISOString() }).eq("id",1);
    if (error) setErro(error.message);
  }, []);

  if (!stores) return (
    <div style={{ background:C.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:28, height:28, border:`3px solid ${C.border}`, borderTopColor:C.blue, borderRadius:"50%", animation:"spin .8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (erro) return (
    <div style={{ background:C.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12, padding:"2rem", textAlign:"center" }}>
      <div style={{ fontSize:32 }}>⚠️</div>
      <div style={{ fontSize:14, color:C.red, lineHeight:1.6 }}>{erro}</div>
      <Btn variant="ghost" style={{padding:"10px 20px"}} onClick={() => { setErro(null); carregar(); }}>Tentar novamente</Btn>
    </div>
  );

  /* computed */
  const rotaAtivaObj   = rotas.find(r => r.id === rotaAtiva);
  const pdvsRotaAtiva  = stores.filter(s => s.rotaId === rotaAtiva);
  const visitadosHoje  = pdvsRotaAtiva.filter(s => daysSince(s.visita) === 0).length;
  const visitasPorPdv  = {};
  for (const v of visitas) { if (!visitasPorPdv[v.pdv_id]) visitasPorPdv[v.pdv_id]=[]; visitasPorPdv[v.pdv_id].push(v); }
  const visitasDoDia    = visitas.filter(v => v.data === selectedDate);
  const visitasDoDiaIds = new Set(visitasDoDia.map(v => v.pdv_id));
  const prevDay = () => { const d=new Date(selectedDate+"T12:00:00"); d.setDate(d.getDate()-1); setSelectedDate(d.toISOString().split("T")[0]); };
  const nextDay = () => { const d=new Date(selectedDate+"T12:00:00"); d.setDate(d.getDate()+1); setSelectedDate(d.toISOString().split("T")[0]); };

  const dotColor = (vs) => ({ ok:C.accent, recente:C.amber, atrasado:C.red, nunca:C.borderMid })[vs];

  const s = {
    wrap: { fontFamily:font, background:C.bg, minHeight:"100vh", maxWidth:440, margin:"0 auto", paddingBottom:80 },
    header: { background:C.white, padding:"13px 15px", borderBottom:`0.5px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" },
    logoBox: { width:32, height:32, borderRadius:9, background:C.blue, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 },
    pad: { padding:"14px" },
    card: { background:C.white, borderRadius:R.lg, border:`0.5px solid ${C.border}`, overflow:"hidden" },
  };

  return (
    <div style={s.wrap}>

      {/* ── Header ── */}
      <div style={s.header}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={s.logoBox}>⚡</div>
          <div>
            <p style={{ margin:0, fontSize:10, color:C.muted, letterSpacing:".06em" }}>DOT ENERGY · ADMIN</p>
            <h1 style={{ margin:0, fontSize:17, fontWeight:500, color:C.text }}>Dashboard</h1>
          </div>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {aba==="pdvs" && (
            <Btn variant={showAdd?"danger":"blue"} style={{padding:"7px 13px",fontSize:12}} onClick={() => setShowAdd(v=>!v)}>
              {showAdd ? "✕" : "+ PDV"}
            </Btn>
          )}
          <Btn variant="ghost" style={{padding:"7px 11px",fontSize:12}} onClick={onLogout}>Sair</Btn>
        </div>
      </div>

      {/* ══ ABA GERAL ══ */}
      {aba==="geral" && (
        <div style={s.pad}>
          <HeroBanner
            label="Rota ativa hoje"
            name={rotaAtivaObj ? `📍 ${rotaAtivaObj.nome}` : "Nenhuma rota ativa"}
            sub={rotaAtivaObj ? `${visitadosHoje} de ${pdvsRotaAtiva.length} visitados` : ""}
            pct={pdvsRotaAtiva.length>0 ? Math.round((visitadosHoje/pdvsRotaAtiva.length)*100) : 0}
            num={visitadosHoje}
            total={pdvsRotaAtiva.length}
          />

          {/* 2×2 stat cards */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
            <StatCard
              icon="🏪" value={stores.length} label="Total de PDVs"
              iconBg={C.blueDim} iconColor={C.blue}
            />
            <StatCard
              icon="✅" value={visitas.filter(v=>v.data===TODAY).length} label="Visitas hoje"
              iconBg={C.accentDim} iconColor={C.accent} valueColor={C.accent}
              delta={`↑ esta semana: ${visitas.filter(v=>{const d=daysSince(v.data);return d!==null&&d<=6;}).length}`}
              deltaColor={C.accent}
            />
            <StatCard
              icon="⚠️" value={stores.filter(s=>!s.visita).length} label="Nunca visitados"
              iconBg={C.redDim} iconColor={C.red} valueColor={C.red}
            />
            <StatCard
              icon="📦" value={stores.filter(s=>s.consignado).length} label="Consignados"
              iconBg={C.purpleDim} iconColor={C.purple} valueColor={C.purple}
            />
          </div>

          {/* pendentes na rota */}
          {rotaAtivaObj && pdvsRotaAtiva.length > 0 && (() => {
            const pendentes = pdvsRotaAtiva.filter(s => daysSince(s.visita) !== 0);
            return (
              <>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                  <p style={{ margin:0, fontSize:11, fontWeight:500, color:C.muted, textTransform:"uppercase", letterSpacing:".04em" }}>Pendentes na rota</p>
                  <p style={{ margin:0, fontSize:11, color:C.accent, fontWeight:500, cursor:"pointer" }} onClick={() => setAba("pendentes")}>ver todos</p>
                </div>
                <div style={s.card}>
                  {pendentes.length === 0 ? (
                    <p style={{ margin:0, textAlign:"center", color:C.green, fontSize:13, fontWeight:500, padding:"14px 0" }}>🎉 Todos visitados hoje!</p>
                  ) : pendentes.map((pdv,i) => {
                    const d   = pdv.visita ? daysSince(pdv.visita) : null;
                    const vs  = visitStatus(pdv.visita);
                    const clr = dotColor(vs);
                    return (
                      <div key={pdv.id} style={{ borderBottom: i<pendentes.length-1 ? `0.5px solid ${C.border}` : "none" }}>
                        <ListRow
                          dotColor={clr} name={pdv.nome}
                          sub={TIPO_LABEL[pdv.tipo]}
                          right={d !== null ? `${d}d` : "nunca"}
                          rightColor={clr}
                        />
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* ══ ABA HISTÓRICO ══ */}
      {aba==="historico" && (
        <div style={s.pad}>
          {/* date nav */}
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
            <Btn variant="ghost" style={{padding:"8px 15px",fontSize:17}} onClick={prevDay}>‹</Btn>
            <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}
              style={{...ipt,flex:1,textAlign:"center",padding:"9px 8px",background:C.white}} />
            <Btn variant="ghost" style={{padding:"8px 15px",fontSize:17}} onClick={nextDay}>›</Btn>
          </div>
          {selectedDate !== TODAY && (
            <Btn variant="ghost" style={{width:"100%",padding:"8px 0",fontSize:12,marginBottom:14}} onClick={() => setSelectedDate(TODAY)}>
              Ir para hoje
            </Btn>
          )}

          {visitasDoDia.length === 0 ? (
            <div style={{ textAlign:"center", padding:"3rem 1rem" }}>
              <div style={{ fontSize:36, marginBottom:10 }}>📋</div>
              <p style={{ color:C.muted, fontSize:14 }}>Nenhuma visita em {fmtDate(selectedDate)||selectedDate}.</p>
            </div>
          ) : (
            <>
              <p style={{ margin:"0 0 8px", fontSize:11, fontWeight:500, color:C.muted, textTransform:"uppercase", letterSpacing:".04em" }}>
                Visitados — {fmtDate(selectedDate)||selectedDate} ({visitasDoDia.length})
              </p>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {visitasDoDia.map(v => {
                  const pdv = stores.find(s => s.id === v.pdv_id);
                  return (
                    <div key={v.id} style={{ background:C.white, borderRadius:R.lg, padding:"12px 14px", border:`0.5px solid ${C.border}` }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                        <div style={{ flex:1 }}>
                          <p style={{ margin:"0 0 2px", fontSize:14, fontWeight:500, color:C.text }}>{pdv?.nome||"PDV removido"}</p>
                          {pdv && <p style={{ margin:"0 0 6px", fontSize:11, color:C.muted }}>{pdv.end}</p>}
                          {v.obs && <p style={{ margin:0, fontSize:12, color:C.muted, fontStyle:"italic" }}>"{v.obs}"</p>}
                        </div>
                        <span style={{ fontSize:11, color:C.muted, fontFamily:"monospace", flexShrink:0 }}>{fmtTime(v.criado_em)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* não visitados */}
              {rotaAtivaObj && selectedDate===TODAY && pdvsRotaAtiva.filter(s=>!visitasDoDiaIds.has(s.id)).length>0 && (
                <div style={{ marginTop:16 }}>
                  <p style={{ margin:"0 0 8px", fontSize:11, fontWeight:500, color:C.muted, textTransform:"uppercase", letterSpacing:".04em" }}>
                    Não visitados ({pdvsRotaAtiva.filter(s=>!visitasDoDiaIds.has(s.id)).length})
                  </p>
                  <div style={s.card}>
                    {pdvsRotaAtiva.filter(s=>!visitasDoDiaIds.has(s.id)).map((pdv,i,arr) => {
                      const d  = pdv.visita ? daysSince(pdv.visita) : null;
                      const vs = visitStatus(pdv.visita);
                      return (
                        <div key={pdv.id} style={{ borderBottom: i<arr.length-1 ? `0.5px solid ${C.border}` : "none" }}>
                          <ListRow dotColor={dotColor(vs)} name={pdv.nome} right={d!==null?`${d}d`:"nunca"} rightColor={dotColor(vs)} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══ ABA PDVs ══ */}
      {aba==="pdvs" && (
        <div style={s.pad}>
          {showAdd && (
            <div style={{ background:C.white, borderRadius:R.lg, padding:16, marginBottom:14, border:`0.5px solid ${C.border}` }}>
              <p style={{margin:"0 0 12px",fontSize:11,fontWeight:500,color:C.blue,textTransform:"uppercase",letterSpacing:".07em"}}>Novo PDV</p>
              <FormPDV initial={{nome:"",end:"",cep:"",tipo:"facu",prio:0,rotaId:null}} onSave={adicionar} onCancel={()=>setShowAdd(false)} saving={saving} rotas={rotas} />
            </div>
          )}

          <div style={{ position:"relative", marginBottom:12 }}>
            <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:C.muted, fontSize:14 }}>🔍</span>
            <input type="text" placeholder="Buscar PDV…" value={searchPdv}
              onChange={e => { setSearchPdv(e.target.value); setSelectedPdv(null); }}
              style={{ ...ipt, paddingLeft:32, background:C.white }}
            />
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {stores
              .filter(s => !searchPdv || s.nome.toLowerCase().includes(searchPdv.toLowerCase()) || (s.end||"").toLowerCase().includes(searchPdv.toLowerCase()))
              .sort((a,b) => ORDER[visitStatus(a.visita)] - ORDER[visitStatus(b.visita)])
              .map(s => {
                const hist      = visitasPorPdv[s.id] || [];
                const isSelected= selectedPdv === s.id;
                const d         = s.visita ? daysSince(s.visita) : null;
                const vs        = visitStatus(s.visita);
                const barColor  = ({ ok:C.accent, recente:C.amber, atrasado:C.red, nunca:C.borderMid })[vs];

                return (
                  <div key={s.id} style={{ background:C.white, borderRadius:R.lg, border:`0.5px solid ${C.border}`, overflow:"hidden" }}>
                    <div style={{ display:"flex", alignItems:"stretch", cursor:"pointer" }} onClick={() => setSelectedPdv(isSelected?null:s.id)}>
                      <div style={{ width:3, background:barColor, flexShrink:0 }} />
                      <div style={{ flex:1, padding:"12px 13px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ margin:"0 0 2px", fontSize:14, fontWeight:500, color:C.text }}>{s.nome}</p>
                          <p style={{ margin:0, fontSize:11, color:C.muted }}>{TIPO_LABEL[s.tipo]} · {s.end}</p>
                        </div>
                        <div style={{ textAlign:"right", flexShrink:0 }}>
                          <p style={{ margin:"0 0 2px", fontSize:13, fontWeight:500, color:barColor }}>
                            {d!==null ? d===0 ? "hoje" : `${d}d` : "nunca"}
                          </p>
                          <p style={{ margin:0, fontSize:10, color:C.muted }}>{hist.length} visita{hist.length!==1?"s":""}</p>
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div style={{ padding:"12px 14px", borderTop:`0.5px solid ${C.border}`, background:C.surface2 }}>
                        {s.obs && (
                          <p style={{ margin:"0 0 10px", fontSize:12, color:C.muted, paddingBottom:8, borderBottom:`0.5px solid ${C.border}` }}>
                            <span style={{ fontSize:10, color:C.gray, textTransform:"uppercase", letterSpacing:".05em" }}>Obs: </span>{s.obs}
                          </p>
                        )}
                        {hist.length === 0 ? (
                          <p style={{ margin:"0 0 10px", textAlign:"center", color:C.muted, fontSize:12 }}>Nenhuma visita registrada.</p>
                        ) : (
                          <>
                            <p style={{ margin:"0 0 6px", fontSize:10, color:C.muted, fontWeight:500, textTransform:"uppercase", letterSpacing:".06em" }}>Histórico</p>
                            <div style={{ marginBottom:10 }}>
                              {hist.map((v,i) => (
                                <div key={v.id} style={{
                                  fontSize:12, padding:"6px 0", display:"flex", gap:8, alignItems:"baseline",
                                  borderBottom: i<hist.length-1 ? `0.5px solid ${C.border}` : "none",
                                }}>
                                  <span style={{ color:C.blue, fontWeight:500, flexShrink:0 }}>{fmtDate(v.data)}</span>
                                  <span style={{ color:C.muted, fontSize:10, flexShrink:0 }}>{fmtTime(v.criado_em)}</span>
                                  {v.obs ? <span style={{color:C.muted}}>{v.obs}</span> : <span style={{color:C.grayDim,fontStyle:"italic"}}>sem obs.</span>}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                        <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
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

      {/* ══ ABA ROTAS ══ */}
      {aba==="rotas" && (
        <div style={s.pad}>
          {/* nova rota */}
          <div style={{ background:C.white, borderRadius:R.lg, padding:14, marginBottom:14, border:`0.5px solid ${C.border}` }}>
            <p style={{margin:"0 0 10px",fontSize:11,fontWeight:500,color:C.blue,textTransform:"uppercase",letterSpacing:".07em"}}>Nova rota</p>
            <div style={{ display:"flex", gap:8 }}>
              <input placeholder="Ex: Paulista, Itaim…" value={novaRota} onChange={e=>setNovaRota(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&adicionarRota()} style={{ ...ipt, flex:1 }} />
              <Btn variant={novaRota.trim()?"blue":"ghost"} style={{padding:"10px 18px",opacity:novaRota.trim()?1:.4}} onClick={adicionarRota}>+</Btn>
            </div>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {rotas.length === 0 ? (
              <p style={{ textAlign:"center", color:C.muted, fontSize:14, padding:"3rem 0" }}>Nenhuma rota criada ainda.</p>
            ) : rotas.map(r => {
              const qtd       = stores.filter(s => s.rotaId === r.id).length;
              const isActive  = rotaAtiva === r.id;
              const isEditing = editRota?.id === r.id;
              const isDel     = confirmDelRota === r.id;

              return (
                <div key={r.id} style={{
                  background:C.white, borderRadius:R.lg, padding:"14px 15px",
                  border:`0.5px solid ${isActive ? C.blue : C.border}`,
                }}>
                  {isEditing ? (
                    <div style={{ display:"flex", gap:6 }}>
                      <input value={editRota.nome} onChange={e=>setEditRota({...editRota,nome:e.target.value})}
                        onKeyDown={e=>e.key==="Enter"&&renomearRota(r.id,editRota.nome)} style={ipt} autoFocus />
                      <Btn variant="blue"  style={{padding:"10px 14px",fontSize:12}} onClick={()=>renomearRota(r.id,editRota.nome)}>OK</Btn>
                      <Btn variant="ghost" style={{padding:"10px 12px",fontSize:12}} onClick={()=>setEditRota(null)}>✕</Btn>
                    </div>
                  ) : (
                    <>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                        <div>
                          <p style={{ margin:"0 0 2px", fontSize:15, fontWeight:500, color:C.text }}>📍 {r.nome}</p>
                          <p style={{ margin:0, fontSize:12, color:C.muted }}>{qtd} PDV{qtd!==1?"s":""}</p>
                        </div>
                        {isActive && <Badge variant="blue">Ativa hoje</Badge>}
                      </div>
                      <div style={{ display:"flex", gap:6 }}>
                        {!isActive ? (
                          <Btn variant="blue" style={{flex:1,padding:"9px 0",fontSize:12}} onClick={()=>ativarRota(r.id)}>
                            🎯 Ativar para hoje
                          </Btn>
                        ) : (
                          <Btn variant="green" style={{flex:1,padding:"9px 0",fontSize:12,opacity:.85,cursor:"default"}}>
                            ✓ Em andamento
                          </Btn>
                        )}
                        <Btn variant="ghost" style={{padding:"9px 12px",fontSize:12}} onClick={()=>setEditRota({id:r.id,nome:r.nome})}>✏️</Btn>
                        {isDel ? (
                          <>
                            <Btn variant="danger" style={{padding:"9px 10px",fontSize:11,flex:1}} onClick={()=>removerRota(r.id)}>Confirmar</Btn>
                            <Btn variant="ghost"  style={{padding:"9px 10px",fontSize:11}} onClick={()=>setConfirmDelRota(null)}>✕</Btn>
                          </>
                        ) : (
                          <Btn variant="danger" style={{padding:"9px 12px",fontSize:12}} onClick={()=>setConfirmDelRota(r.id)}>🗑</Btn>
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

      {/* ══ ABA PENDENTES ══ */}
      {aba==="pendentes" && (
        <div style={s.pad}>
          {/* 3-up counters */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:14 }}>
            {[
              { label:"Nunca",  val:stores.filter(s=>!s.visita).length,                          color:C.muted,  bg:C.surface2 },
              { label:"+30d",   val:stores.filter(s=>s.visita&&daysSince(s.visita)>30).length,   color:C.red,    bg:C.redDim },
              { label:"Em dia", val:stores.filter(s=>s.visita&&daysSince(s.visita)<=14).length,  color:C.accent, bg:C.accentDim },
            ].map(({ label, val, color, bg }) => (
              <div key={label} style={{ background:C.white, borderRadius:R.lg, padding:"12px 10px", textAlign:"center", border:`0.5px solid ${C.border}` }}>
                <p style={{ margin:"0 0 4px", fontSize:22, fontWeight:500, color }}>{val}</p>
                <p style={{ margin:0, fontSize:11, color:C.muted }}>{label}</p>
              </div>
            ))}
          </div>

          <div style={s.card}>
            {stores
              .sort((a,b) => { const da=a.visita?daysSince(a.visita):9999, db=b.visita?daysSince(b.visita):9999; return db-da; })
              .map((pdv,i,arr) => {
                const d  = pdv.visita ? daysSince(pdv.visita) : null;
                const vs = visitStatus(pdv.visita);
                const clr= dotColor(vs);
                return (
                  <div key={pdv.id} style={{ borderBottom: i<arr.length-1 ? `0.5px solid ${C.border}` : "none" }}>
                    <ListRow
                      dotColor={clr} name={pdv.nome} sub={TIPO_LABEL[pdv.tipo]}
                      right={d!==null ? `${d}d` : "nunca"} rightColor={clr}
                    />
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ══ ABA CONSIG ══ */}
      {aba==="consig" && (() => {
        const consignados = stores.filter(s => s.consignado);
        return (
          <div style={s.pad}>
            <HeroBanner
              label="Displays consignados"
              name="📦 Em campo"
              sub={`PDV${consignados.length!==1?"s":""} com display deixado para consignação`}
              num={consignados.length}
              total={0}
              bgColor={C.purple}
            />

            {consignados.length === 0 ? (
              <div style={{ textAlign:"center", padding:"4rem 1rem" }}>
                <div style={{ fontSize:48, marginBottom:14 }}>📦</div>
                <p style={{ color:C.muted, fontSize:14 }}>Nenhum PDV com display consignado ainda.</p>
              </div>
            ) : (
              <div style={s.card}>
                {consignados
                  .sort((a,b) => { const da=a.visita?daysSince(a.visita):9999, db=b.visita?daysSince(b.visita):9999; return db-da; })
                  .map((pdv,i,arr) => {
                    const d  = pdv.visita ? daysSince(pdv.visita) : null;
                    const vs = visitStatus(pdv.visita);
                    const clr= dotColor(vs);
                    const rota = rotas.find(r=>r.id===pdv.rotaId);
                    return (
                      <div key={pdv.id} style={{ borderBottom: i<arr.length-1 ? `0.5px solid ${C.border}` : "none" }}>
                        <ListRow
                          dotColor={C.purple}
                          name={pdv.nome}
                          sub={`${TIPO_LABEL[pdv.tipo]}${rota?` · 📍 ${rota.nome}`:""}`}
                          right={d!==null ? d===0 ? "hoje" : `${d}d` : "nunca"}
                          rightColor={clr}
                        />
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        );
      })()}

      <BottomNav aba={aba} setAba={v => { setAba(v); setShowAdd(false); }} tabs={TABS} />
    </div>
  );
}
