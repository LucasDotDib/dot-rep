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

  const carregar = useCallback(async () => {
    const [pdvs, vis, rts, ativa] = await Promise.all([
      supabase.from("pdvs").select("*").order("criado_em",{ascending:true}),
      supabase.from("visitas").select("*").order("criado_em",{ascending:false}),
      supabase.from("rotas").select("*").order("nome",{ascending:true}),
      supabase.from("rota_ativa").select("*").eq("id",1).single(),
    ]);
    if(pdvs.error){ setErro(pdvs.error.message); return; }
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
    return ()=>supabase.removeChannel(ch);
  }, [carregar]);

  const adicionar = useCallback(async (form) => {
    setSaving(true);
    const { error } = await supabase.from("pdvs").insert([{
      id:Date.now().toString(), nome:form.nome.trim(), endereco:form.end.trim(),
      cep:form.cep.replace(/\D/g,""), tipo:form.tipo, prioridade:form.prio,
      vendeu_dot:false, ultima_visita:null, obs:"", rota_id:form.rotaId||null,
    }]);
    if(error) setErro(error.message); else setShowAdd(false);
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

  const rotaAtivaObj  = rotas.find(r=>r.id===rotaAtiva);
  const pdvsRotaAtiva = stores.filter(s=>s.rotaId===rotaAtiva);
  const visitadosHoje = pdvsRotaAtiva.filter(s=>daysSince(s.visita)===0).length;
  const visitasPorPdv = {};
  for (const v of visitas) { if(!visitasPorPdv[v.pdv_id])visitasPorPdv[v.pdv_id]=[]; visitasPorPdv[v.pdv_id].push(v); }
  const visitasDoDia    = visitas.filter(v=>v.data===selectedDate);
  const visitasDoDiaIds = new Set(visitasDoDia.map(v=>v.pdv_id));
  const prevDay = () => { const d=new Date(selectedDate+"T12:00:00"); d.setDate(d.getDate()-1); setSelectedDate(d.toISOString().split("T")[0]); };
  const nextDay = () => { const d=new Date(selectedDate+"T12:00:00"); d.setDate(d.getDate()+1); setSelectedDate(d.toISOString().split("T")[0]); };

  const TABS = [["geral","ti-chart-bar","Geral"],["historico","ti-calendar","Dia"],["pdvs","ti-building-store","PDVs"],["rotas","ti-map-pin","Rotas"],["pendentes","ti-alert-circle","Pend."],["consig","ti-package","Consig."]];

  return (
    <div style={{ fontFamily:"'SF Pro Display',-apple-system,BlinkMacSystemFont,sans-serif", background:C.bg, minHeight:"100vh", maxWidth:440, margin:"0 auto", paddingBottom:"100px" }}>

      {/* HEADER */}
      <div style={{ background:C.white, padding:"1rem", boxShadow:"0 1px 0 #eaecf0" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#1b3a8c,#2d52b8)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>⚡</div>
            <div>
              <p style={{ margin:0, fontSize:10, color:C.muted, letterSpacing:"0.08em", textTransform:"uppercase" }}>Dot Energy · Admin</p>
              <h1 style={{ margin:0, fontSize:18, fontWeight:700, color:C.text }}>Dashboard</h1>
            </div>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            {aba==="pdvs"&&(
              <Btn variant={showAdd?"danger":"blue"} style={{padding:"8px 14px",fontSize:12}} onClick={()=>setShowAdd(v=>!v)}>
                {showAdd?"✕":"+ PDV"}
              </Btn>
            )}
            <Btn variant="ghost" style={{padding:"8px 12px",fontSize:12}} onClick={onLogout}>Sair</Btn>
          </div>
        </div>
      </div>

      {/* ── ABA GERAL ── */}
      {aba==="geral"&&(
        <div style={{ padding:"1rem" }}>
          {/* Rota ativa banner */}
          <div style={{ background:"linear-gradient(135deg,#1b3a8c,#2d52b8)", borderRadius:20, padding:"18px 20px", marginBottom:16, color:"#fff" }}>
            <p style={{ margin:"0 0 4px", fontSize:10, opacity:0.7, letterSpacing:"0.08em" }}>ROTA ATIVA HOJE</p>
            {rotaAtivaObj ? (
              <>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <p style={{ margin:0, fontSize:20, fontWeight:700 }}>📍 {rotaAtivaObj.nome}</p>
                  <p style={{ margin:0, fontSize:28, fontWeight:700, color:visitadosHoje===pdvsRotaAtiva.length&&pdvsRotaAtiva.length>0?"#a7f3d0":"#f5c800" }}>
                    {pdvsRotaAtiva.length>0?Math.round((visitadosHoje/pdvsRotaAtiva.length)*100):0}%
                  </p>
                </div>
                <p style={{ margin:"0 0 8px", fontSize:12, opacity:0.7 }}>{visitadosHoje} de {pdvsRotaAtiva.length} visitados</p>
                {pdvsRotaAtiva.length>0&&(
                  <div style={{ height:4, background:"rgba(255,255,255,0.2)", borderRadius:99 }}>
                    <div style={{ height:"100%", width:`${(visitadosHoje/pdvsRotaAtiva.length)*100}%`, background:"#f5c800", borderRadius:99, transition:"width 0.4s" }} />
                  </div>
                )}
              </>
            ) : <p style={{ margin:0, fontSize:14, opacity:0.7 }}>Nenhuma rota ativa.</p>}
          </div>

          {/* Stats grid */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
            <StatCard iconClass="ti-building-store" iconColor="#2563eb" iconBg="#eff6ff" value={stores.length} label="Total de PDVs" />
            <StatCard iconClass="ti-circle-check" iconColor="#16a34a" iconBg="#f0fdf4" value={visitas.filter(v=>v.data===TODAY).length} label="Visitas hoje" />
            <StatCard iconClass="ti-calendar-week" iconColor="#d97706" iconBg="#fffbeb" value={visitas.filter(v=>{const d=daysSince(v.data);return d!==null&&d<=6;}).length} label="Esta semana" />
            <StatCard iconClass="ti-alert-triangle" iconColor="#dc2626" iconBg="#fef2f2" value={stores.filter(s=>!s.visita).length} label="Nunca visitados" />
          </div>

          {/* Pendentes da rota */}
          {rotaAtivaObj&&pdvsRotaAtiva.length>0&&(
            <div style={{ background:C.white, borderRadius:16, padding:"14px", boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
              <p style={{ margin:"0 0 10px", fontSize:12, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.06em" }}>Pendentes na rota</p>
              {pdvsRotaAtiva.filter(s=>daysSince(s.visita)!==0).length===0 ? (
                <p style={{ margin:0, textAlign:"center", color:C.green, fontSize:13, fontWeight:600, padding:"8px 0" }}>🎉 Todos visitados hoje!</p>
              ) : pdvsRotaAtiva.filter(s=>daysSince(s.visita)!==0).map(s=>(
                <div key={s.id} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:"1px solid #f3f4f6" }}>
                  <span style={{ fontSize:13, color:C.text }}>{s.nome}</span>
                  <span style={{ fontSize:12, color:C.muted }}>{s.visita?`${daysSince(s.visita)}d atrás`:"nunca"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ABA HISTÓRICO ── */}
      {aba==="historico"&&(
        <div style={{ padding:"1rem" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
            <Btn variant="ghost" style={{padding:"10px 16px",fontSize:18}} onClick={prevDay}>‹</Btn>
            <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}
              style={{...ipt,flex:1,textAlign:"center",padding:"10px 8px",background:C.white}} />
            <Btn variant="ghost" style={{padding:"10px 16px",fontSize:18}} onClick={nextDay}>›</Btn>
          </div>
          {selectedDate!==TODAY&&(
            <Btn variant="ghost" style={{width:"100%",padding:"8px 0",fontSize:12,marginBottom:14}} onClick={()=>setSelectedDate(TODAY)}>Ir para hoje</Btn>
          )}
          {visitasDoDia.length===0 ? (
            <div style={{ textAlign:"center", padding:"3rem 1rem" }}>
              <div style={{ fontSize:36, marginBottom:10 }}>📋</div>
              <p style={{ color:C.muted, fontSize:14 }}>Nenhuma visita em {fmtDate(selectedDate)||selectedDate}.</p>
            </div>
          ) : (
            <>
              <p style={{ margin:"0 0 10px", fontSize:12, fontWeight:700, color:C.blue, textTransform:"uppercase", letterSpacing:"0.06em" }}>
                Visitados — {fmtDate(selectedDate)||selectedDate} ({visitasDoDia.length})
              </p>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {visitasDoDia.map(v=>{
                  const pdv=stores.find(s=>s.id===v.pdv_id);
                  return (
                    <div key={v.id} style={{ background:C.white, borderRadius:14, padding:"13px 15px", boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                        <div style={{ flex:1 }}>
                          <p style={{ margin:"0 0 2px", fontSize:14, fontWeight:700, color:C.text }}>{pdv?.nome||"PDV removido"}</p>
                          {pdv&&<p style={{ margin:"0 0 6px", fontSize:11, color:C.muted }}>{pdv.end}</p>}
                          {v.obs&&<p style={{ margin:0, fontSize:12, color:C.muted, fontStyle:"italic" }}>"{v.obs}"</p>}
                        </div>
                        <span style={{ fontSize:11, color:C.muted, fontFamily:"monospace" }}>{fmtTime(v.criado_em)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {rotaAtivaObj&&selectedDate===TODAY&&pdvsRotaAtiva.filter(s=>!visitasDoDiaIds.has(s.id)).length>0&&(
                <div style={{ marginTop:16 }}>
                  <p style={{ margin:"0 0 8px", fontSize:12, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.06em" }}>
                    Não visitados ({pdvsRotaAtiva.filter(s=>!visitasDoDiaIds.has(s.id)).length})
                  </p>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {pdvsRotaAtiva.filter(s=>!visitasDoDiaIds.has(s.id)).map(s=>(
                      <div key={s.id} style={{ background:C.white, borderRadius:12, padding:"11px 14px", boxShadow:"0 1px 4px rgba(0,0,0,0.05)", borderLeft:`3px solid ${C.redDim}`, display:"flex", justifyContent:"space-between" }}>
                        <span style={{ fontSize:13, color:C.text }}>{s.nome}</span>
                        <span style={{ fontSize:11, color:C.muted }}>{s.visita?`${daysSince(s.visita)}d atrás`:"nunca"}</span>
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
        <div style={{ padding:"1rem" }}>
          {showAdd&&(
            <div style={{ background:C.white, borderRadius:16, padding:"16px", marginBottom:14, boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
              <p style={{margin:"0 0 14px",fontSize:12,fontWeight:700,color:C.blue,textTransform:"uppercase",letterSpacing:"0.08em"}}>Novo PDV</p>
              <FormPDV initial={{nome:"",end:"",cep:"",tipo:"facu",prio:0,rotaId:null}} onSave={adicionar} onCancel={()=>setShowAdd(false)} saving={saving} rotas={rotas} />
            </div>
          )}
          <input type="text" placeholder="Buscar PDV…" value={searchPdv}
            onChange={e=>{setSearchPdv(e.target.value);setSelectedPdv(null);}}
            style={{...ipt,marginBottom:12,background:C.white,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}} />
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {stores
              .filter(s=>!searchPdv||s.nome.toLowerCase().includes(searchPdv.toLowerCase())||(s.end||"").toLowerCase().includes(searchPdv.toLowerCase()))
              .sort((a,b)=>ORDER[visitStatus(a.visita)]-ORDER[visitStatus(b.visita)])
              .map(s=>{
                const hist=visitasPorPdv[s.id]||[], isSelected=selectedPdv===s.id;
                const d=s.visita?daysSince(s.visita):null;
                const color=!s.visita?C.muted:d===0?C.green:d<=14?C.amber:C.red;
                return (
                  <div key={s.id} style={{ background:C.white, borderRadius:14, borderLeft:`4px solid ${color}`, boxShadow:"0 2px 8px rgba(0,0,0,0.06)", overflow:"hidden" }}>
                    <div style={{ padding:"13px 14px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" }} onClick={()=>setSelectedPdv(isSelected?null:s.id)}>
                      <div style={{ flex:1 }}>
                        <p style={{ margin:"0 0 2px", fontSize:14, fontWeight:700, color:C.text }}>{s.nome}</p>
                        <p style={{ margin:0, fontSize:11, color:C.muted }}>{TIPO_LABEL[s.tipo]} · {s.end}</p>
                      </div>
                      <div style={{ textAlign:"right", marginLeft:8 }}>
                        <p style={{ margin:"0 0 2px", fontSize:13, fontWeight:700, color }}>{d!==null?d===0?"hoje":`${d}d atrás`:"nunca"}</p>
                        <p style={{ margin:0, fontSize:10, color:C.muted }}>{hist.length} visita{hist.length!==1?"s":""}</p>
                      </div>
                    </div>
                    {isSelected&&(
                      <div style={{ padding:"0 14px 14px", borderTop:"1px solid #f3f4f6" }}>
                        {s.obs&&<p style={{ margin:"10px 0 8px", fontSize:12, color:C.muted, borderBottom:"1px solid #f3f4f6", paddingBottom:8 }}><span style={{color:C.grayDim,fontSize:10}}>OBS: </span>{s.obs}</p>}
                        {hist.length===0 ? (
                          <p style={{ margin:"12px 0 0", textAlign:"center", color:C.muted, fontSize:12 }}>Nenhuma visita registrada.</p>
                        ) : (
                          <>
                            <p style={{ margin:"10px 0 6px", fontSize:10, color:C.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>Histórico</p>
                            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                              {hist.map(v=>(
                                <div key={v.id} style={{ fontSize:12, padding:"8px 10px", background:"#f8f9fa", borderRadius:8, display:"flex", gap:8, alignItems:"flex-start" }}>
                                  <span style={{ color:C.blue, fontWeight:700, fontFamily:"monospace", flexShrink:0 }}>{fmtDate(v.data)}</span>
                                  <span style={{ color:C.muted, fontSize:10, flexShrink:0 }}>{fmtTime(v.criado_em)}</span>
                                  {v.obs?<span style={{color:C.muted}}>{v.obs}</span>:<span style={{color:C.grayDim,fontStyle:"italic"}}>sem obs.</span>}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                        <div style={{ marginTop:12, borderTop:"1px solid #f3f4f6", paddingTop:10, display:"flex", gap:6, justifyContent:"flex-end" }}>
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
        <div style={{ padding:"1rem" }}>
          <div style={{ background:C.white, borderRadius:16, padding:"16px", marginBottom:14, boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
            <p style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:C.blue,textTransform:"uppercase",letterSpacing:"0.08em"}}>Nova Rota</p>
            <div style={{ display:"flex", gap:8 }}>
              <input placeholder="Ex: Paulista, Itaim…" value={novaRota} onChange={e=>setNovaRota(e.target.value)} onKeyDown={e=>e.key==="Enter"&&adicionarRota()} style={ipt} />
              <Btn variant={novaRota.trim()?"blue":"ghost"} style={{padding:"11px 18px",opacity:novaRota.trim()?1:0.4}} onClick={adicionarRota}>+</Btn>
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {rotas.length===0 ? (
              <p style={{ textAlign:"center", color:C.muted, fontSize:14, padding:"3rem 0" }}>Nenhuma rota criada ainda.</p>
            ) : rotas.map(r=>{
              const qtd=stores.filter(s=>s.rotaId===r.id).length, isActive=rotaAtiva===r.id;
              const isEditingR=editRota?.id===r.id, isDelR=confirmDelRota===r.id;
              return (
                <div key={r.id} style={{ background:C.white, borderRadius:16, padding:"14px 16px", boxShadow:"0 2px 8px rgba(0,0,0,0.06)", borderLeft:`4px solid ${isActive?C.blue:C.grayDim}` }}>
                  {isEditingR ? (
                    <div style={{ display:"flex", gap:6 }}>
                      <input value={editRota.nome} onChange={e=>setEditRota({...editRota,nome:e.target.value})} onKeyDown={e=>e.key==="Enter"&&renomearRota(r.id,editRota.nome)} style={ipt} autoFocus />
                      <Btn variant="blue" style={{padding:"11px 14px",fontSize:12}} onClick={()=>renomearRota(r.id,editRota.nome)}>OK</Btn>
                      <Btn variant="ghost" style={{padding:"11px 12px",fontSize:12}} onClick={()=>setEditRota(null)}>✕</Btn>
                    </div>
                  ) : (
                    <>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                        <div>
                          <p style={{ margin:"0 0 3px", fontSize:16, fontWeight:700, color:C.text }}>📍 {r.nome}</p>
                          <p style={{ margin:0, fontSize:12, color:C.muted }}>{qtd} PDV{qtd!==1?"s":""}</p>
                        </div>
                        {isActive&&<span style={{ fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:99, background:C.blueDim, color:C.blue }}>ATIVA HOJE</span>}
                      </div>
                      <div style={{ display:"flex", gap:6 }}>
                        {!isActive ? (
                          <Btn variant="blue" style={{flex:1,padding:"10px 0",fontSize:12}} onClick={()=>ativarRota(r.id)}>🎯 Ativar para hoje</Btn>
                        ) : (
                          <Btn variant="green" style={{flex:1,padding:"10px 0",fontSize:12,opacity:0.8,cursor:"default"}}>✓ Em andamento</Btn>
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
              );
            })}
          </div>
        </div>
      )}

      {/* ── ABA PENDENTES ── */}
      {aba==="pendentes"&&(
        <div style={{ padding:"1rem" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:16 }}>
            {[
              { label:"Nunca",  val:stores.filter(s=>!s.visita).length, color:C.muted, bg:"#f3f4f6" },
              { label:"+30d",   val:stores.filter(s=>s.visita&&daysSince(s.visita)>30).length, color:C.red, bg:C.redDim },
              { label:"Em dia", val:stores.filter(s=>s.visita&&daysSince(s.visita)<=14).length, color:C.green, bg:C.greenDim },
            ].map(({ label, val, color, bg })=>(
              <div key={label} style={{ background:C.white, borderRadius:14, padding:"12px 10px", textAlign:"center", boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
                <div style={{ width:36, height:36, borderRadius:10, background:bg, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 8px", fontSize:18 }}>
                  {label==="Nunca"?"🕳️":label==="+30d"?"🚨":"✅"}
                </div>
                <p style={{ margin:"0 0 2px", fontSize:22, fontWeight:700, color }}>{val}</p>
                <p style={{ margin:0, fontSize:11, color:C.muted }}>{label}</p>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {stores
              .sort((a,b)=>{ const da=a.visita?daysSince(a.visita):9999, db=b.visita?daysSince(b.visita):9999; return db-da; })
              .map(s=>{
                const d=s.visita?daysSince(s.visita):null;
                const color=!s.visita?C.muted:d>30?C.red:d>14?C.amber:C.green;
                const bg=!s.visita?"#f3f4f6":d>30?C.redDim:d>14?C.amberDim:C.greenDim;
                return (
                  <div key={s.id} style={{ background:C.white, borderRadius:12, padding:"12px 14px", boxShadow:"0 2px 6px rgba(0,0,0,0.05)", borderLeft:`4px solid ${color}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div style={{ flex:1 }}>
                      <p style={{ margin:"0 0 2px", fontSize:14, fontWeight:600, color:C.text }}>{s.nome}</p>
                      <p style={{ margin:0, fontSize:11, color:C.muted }}>{TIPO_LABEL[s.tipo]} · {s.end}</p>
                    </div>
                    <div style={{ textAlign:"right", marginLeft:8 }}>
                      <p style={{ margin:"0 0 2px", fontSize:14, fontWeight:700, color }}>{d!==null?`${d}d`:"nunca"}</p>
                      {s.visita&&<p style={{ margin:0, fontSize:10, color:C.muted }}>{fmtDate(s.visita)}</p>}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ── ABA CONSIG ── */}
      {aba==="consig"&&(
        <div style={{ padding:"1rem" }}>
          {(() => {
            const consignados = stores.filter(s=>s.consignado);
            return (
              <>
                <div style={{ background:"linear-gradient(135deg,#7c3aed,#9f67fa)", borderRadius:20, padding:"18px 20px", marginBottom:16, color:"#fff" }}>
                  <p style={{ margin:"0 0 4px", fontSize:10, opacity:0.7, letterSpacing:"0.08em" }}>DISPLAYS CONSIGNADOS</p>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                    <p style={{ margin:0, fontSize:20, fontWeight:700 }}>📦 Em campo</p>
                    <p style={{ margin:0, fontSize:36, fontWeight:700 }}>{consignados.length}</p>
                  </div>
                  <p style={{ margin:0, fontSize:12, opacity:0.7 }}>PDV{consignados.length!==1?"s":""} com display deixado para consignação</p>
                </div>
                {consignados.length===0 ? (
                  <div style={{ textAlign:"center", padding:"4rem 1rem" }}>
                    <div style={{ fontSize:48, marginBottom:14 }}>📦</div>
                    <p style={{ color:"#6b7280", fontSize:14 }}>Nenhum PDV com display consignado ainda.</p>
                  </div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {consignados
                      .sort((a,b)=>{ const da=a.visita?daysSince(a.visita):9999, db=b.visita?daysSince(b.visita):9999; return db-da; })
                      .map(s=>{
                        const d=s.visita?daysSince(s.visita):null;
                        const color=!s.visita?"#9ca3af":d===0?"#16a34a":d<=14?"#d97706":"#dc2626";
                        return (
                          <div key={s.id} style={{ background:"#ffffff", borderRadius:14, padding:"14px 16px", boxShadow:"0 2px 8px rgba(0,0,0,0.06)", borderLeft:"4px solid #7c3aed" }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                              <div style={{ flex:1 }}>
                                <p style={{ margin:"0 0 2px", fontSize:14, fontWeight:700, color:"#111827" }}>{s.nome}</p>
                                <p style={{ margin:"0 0 6px", fontSize:11, color:"#6b7280" }}>{TIPO_LABEL[s.tipo]} · {s.end}</p>
                                {s.rotaId&&(()=>{ const r=rotas.find(r=>r.id===s.rotaId); return r?<span style={{ fontSize:11, padding:"2px 8px", borderRadius:99, background:"#fefbe8", color:"#92730a" }}>📍 {r.nome}</span>:null; })()}
                              </div>
                              <div style={{ textAlign:"right", flexShrink:0 }}>
                                <p style={{ margin:"0 0 2px", fontSize:13, fontWeight:700, color }}>{d!==null?d===0?"hoje":`${d}d atrás`:"nunca visitado"}</p>
                                {s.visita&&<p style={{ margin:0, fontSize:10, color:"#6b7280" }}>{fmtDate(s.visita)}</p>}
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

      <BottomNav aba={aba} setAba={(v)=>{setAba(v);setShowAdd(false);}} tabs={TABS} />
    </div>
  );
}
