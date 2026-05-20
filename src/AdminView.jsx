import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { C, ipt, Btn, TODAY, daysSince, fmtDate, fmtTime, fromDB, TIPO_LABEL, ORDER, visitStatus } from "./ui";

export default function AdminView({ onLogout }) {
  const [aba, setAba]             = useState("geral");
  const [stores, setStores]       = useState(null);
  const [visitas, setVisitas]     = useState([]);
  const [rotas, setRotas]         = useState([]);
  const [rotaAtiva, setRotaAtiva] = useState(null);
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [selectedPdv, setSelectedPdv]   = useState(null);
  const [searchPdv, setSearchPdv]       = useState("");

  const carregar = useCallback(async () => {
    const [pdvs, vis, rts, ativa] = await Promise.all([
      supabase.from("pdvs").select("*").order("criado_em", { ascending:true }),
      supabase.from("visitas").select("*").order("criado_em", { ascending:false }),
      supabase.from("rotas").select("*").order("nome", { ascending:true }),
      supabase.from("rota_ativa").select("*").eq("id",1).single(),
    ]);
    if (pdvs.error) return;
    setStores((pdvs.data||[]).map(fromDB));
    setVisitas(vis.data||[]);
    setRotas(rts.data||[]);
    setRotaAtiva(ativa.data?.rota_id||null);
  }, []);

  useEffect(() => {
    carregar();
    const ch = supabase.channel("admin-changes")
      .on("postgres_changes", { event:"*", schema:"public", table:"pdvs" },    ()=>carregar())
      .on("postgres_changes", { event:"*", schema:"public", table:"visitas" }, ()=>carregar())
      .on("postgres_changes", { event:"*", schema:"public", table:"rota_ativa" }, ()=>carregar())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [carregar]);

  if (!stores) return (
    <div style={{ background:C.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"system-ui" }}>
      <div style={{ width:32, height:32, border:`3px solid ${C.border}`, borderTopColor:C.yellow, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const rotaAtivaObj    = rotas.find(r=>r.id===rotaAtiva);
  const pdvsRotaAtiva   = stores.filter(s=>s.rotaId===rotaAtiva);
  const visitadosHoje   = pdvsRotaAtiva.filter(s=>daysSince(s.visita)===0).length;

  const visitasPorPdv = {};
  for (const v of visitas) {
    if (!visitasPorPdv[v.pdv_id]) visitasPorPdv[v.pdv_id] = [];
    visitasPorPdv[v.pdv_id].push(v);
  }

  const visitasDoDia    = visitas.filter(v=>v.data===selectedDate);
  const visitasDoDiaIds = new Set(visitasDoDia.map(v=>v.pdv_id));

  const prevDay = () => {
    const d = new Date(selectedDate+"T12:00:00");
    d.setDate(d.getDate()-1);
    setSelectedDate(d.toISOString().split("T")[0]);
  };
  const nextDay = () => {
    const d = new Date(selectedDate+"T12:00:00");
    d.setDate(d.getDate()+1);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  return (
    <div style={{ fontFamily:"'SF Pro Display',-apple-system,BlinkMacSystemFont,sans-serif", background:C.bg, color:C.white, minHeight:"100vh", maxWidth:440, margin:"0 auto", paddingBottom:"2rem" }}>

      {/* Header */}
      <div style={{ padding:"1.5rem 1rem 0", borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:5 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:C.yellow }} />
              <span style={{ fontSize:11, color:C.yellow, letterSpacing:"0.12em", textTransform:"uppercase", fontWeight:700 }}>Dot Energy · Admin</span>
            </div>
            <h1 style={{ margin:0, fontSize:26, fontWeight:700, letterSpacing:"-0.02em", color:C.white }}>Dashboard</h1>
          </div>
          <Btn variant="ghost" style={{ padding:"9px 14px", fontSize:12 }} onClick={onLogout}>Sair</Btn>
        </div>
        <div style={{ display:"flex", gap:0, marginTop:8 }}>
          {[["geral","📊 Geral"],["historico","📅 Dia"],["pdvs","🏪 PDVs"],["pendentes","⚠️ Pend."]].map(([v,l])=>(
            <button key={v} onClick={()=>setAba(v)} style={{
              flex:1, padding:"11px 0", fontSize:12, fontWeight:600, cursor:"pointer",
              background:"transparent", border:"none", fontFamily:"inherit",
              color:aba===v?C.yellow:C.gray,
              borderBottom:aba===v?`2px solid ${C.yellow}`:"2px solid transparent",
              marginBottom:-1,
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* ── ABA GERAL ── */}
      {aba==="geral"&&(
        <div style={{ padding:"1rem" }}>

          {/* Rota do dia */}
          <div style={{ padding:"14px 16px", background:`linear-gradient(135deg, #f5c80018, #f5c80008)`, border:`1px solid #f5c80055`, borderRadius:12, marginBottom:12 }}>
            <div style={{ fontSize:10, color:C.yellow, letterSpacing:"0.1em", fontWeight:700, marginBottom:6 }}>ROTA ATIVA HOJE</div>
            {rotaAtivaObj ? (
              <>
                <div style={{ fontSize:18, fontWeight:700, color:C.white, marginBottom:8 }}>📍 {rotaAtivaObj.nome}</div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <span style={{ fontSize:13, color:C.gray }}>{visitadosHoje} de {pdvsRotaAtiva.length} visitados</span>
                  <span style={{ fontSize:22, fontWeight:700, color:visitadosHoje===pdvsRotaAtiva.length&&pdvsRotaAtiva.length>0?C.green:C.yellow }}>
                    {pdvsRotaAtiva.length>0?Math.round((visitadosHoje/pdvsRotaAtiva.length)*100):0}%
                  </span>
                </div>
                {pdvsRotaAtiva.length>0&&(
                  <div style={{ height:4, background:C.surface2, borderRadius:99, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${(visitadosHoje/pdvsRotaAtiva.length)*100}%`, background:C.yellow, transition:"width 0.4s" }} />
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize:14, color:C.gray }}>Nenhuma rota ativa no momento.</div>
            )}
          </div>

          {/* Stats */}
          {[
            { label:"Total de PDVs",       val:stores.length,                                                           color:C.yellow },
            { label:"Visitas hoje",         val:visitas.filter(v=>v.data===TODAY).length,                               color:C.green  },
            { label:"Visitas esta semana",  val:visitas.filter(v=>{ const d=daysSince(v.data); return d!==null&&d<=6; }).length, color:C.amber  },
            { label:"Nunca visitados",      val:stores.filter(s=>!s.visita).length,                                     color:C.red    },
          ].map(({ label, val, color })=>(
            <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 15px", background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, marginBottom:8 }}>
              <span style={{ fontSize:13, color:C.gray }}>{label}</span>
              <span style={{ fontSize:22, fontWeight:700, color, fontVariantNumeric:"tabular-nums" }}>{val}</span>
            </div>
          ))}

          {/* PDVs não visitados da rota ativa */}
          {rotaAtivaObj&&pdvsRotaAtiva.length>0&&(
            <div style={{ marginTop:4 }}>
              <div style={{ fontSize:10, color:C.gray, letterSpacing:"0.08em", marginBottom:8 }}>PENDENTES NA ROTA DE HOJE</div>
              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                {pdvsRotaAtiva
                  .filter(s=>daysSince(s.visita)!==0)
                  .map(s=>(
                    <div key={s.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 13px", background:C.surface, border:`1px solid ${C.border}`, borderRadius:9 }}>
                      <span style={{ fontSize:13, color:C.white }}>{s.nome}</span>
                      <span style={{ fontSize:11, color:C.gray }}>{s.visita?`${daysSince(s.visita)}d atrás`:"nunca"}</span>
                    </div>
                  ))
                }
                {pdvsRotaAtiva.filter(s=>daysSince(s.visita)!==0).length===0&&(
                  <div style={{ padding:"10px 0", textAlign:"center", color:C.green, fontSize:13, fontWeight:600 }}>🎉 Todos visitados hoje!</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ABA HISTÓRICO POR DIA ── */}
      {aba==="historico"&&(
        <div style={{ padding:"1rem" }}>

          {/* Date nav */}
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
            <div style={{ textAlign:"center", padding:"3rem 1rem" }}>
              <div style={{ fontSize:36, marginBottom:10 }}>📋</div>
              <div style={{ fontSize:14, color:C.gray }}>Nenhuma visita registrada em {fmtDate(selectedDate)||selectedDate}.</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize:10, color:C.yellow, letterSpacing:"0.1em", fontWeight:700, marginBottom:8 }}>
                VISITADOS — {fmtDate(selectedDate)||selectedDate} ({visitasDoDia.length})
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                {visitasDoDia.map(v=>{
                  const pdv = stores.find(s=>s.id===v.pdv_id);
                  return (
                    <div key={v.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 14px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:14, fontWeight:600, color:C.white, marginBottom:2 }}>{pdv?.nome||"PDV removido"}</div>
                          {pdv&&<div style={{ fontSize:11, color:C.gray }}>{pdv.end}</div>}
                          {v.obs&&<div style={{ fontSize:12, color:C.gray, marginTop:6, lineHeight:1.4, fontStyle:"italic" }}>"{v.obs}"</div>}
                        </div>
                        <div style={{ fontSize:11, color:C.grayDim, fontFamily:"monospace", flexShrink:0 }}>
                          {fmtTime(v.criado_em)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* PDVs do dia que não foram visitados (na rota ativa) */}
              {rotaAtivaObj&&selectedDate===TODAY&&(
                <div style={{ marginTop:16 }}>
                  {pdvsRotaAtiva.filter(s=>!visitasDoDiaIds.has(s.id)).length>0&&(
                    <>
                      <div style={{ fontSize:10, color:C.gray, letterSpacing:"0.08em", marginBottom:8 }}>NÃO VISITADOS NA ROTA ({pdvsRotaAtiva.filter(s=>!visitasDoDiaIds.has(s.id)).length})</div>
                      <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                        {pdvsRotaAtiva.filter(s=>!visitasDoDiaIds.has(s.id)).map(s=>(
                          <div key={s.id} style={{ padding:"10px 13px", background:C.surface, border:`1px solid ${C.border}`, borderLeft:`3px solid ${C.red}66`, borderRadius:9, display:"flex", justifyContent:"space-between" }}>
                            <span style={{ fontSize:13, color:C.white }}>{s.nome}</span>
                            <span style={{ fontSize:11, color:C.gray }}>{s.visita?`${daysSince(s.visita)}d atrás`:"nunca"}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── ABA PDVs ── */}
      {aba==="pdvs"&&(
        <div style={{ padding:"1rem" }}>
          <input
            type="text" placeholder="Buscar PDV…" value={searchPdv}
            onChange={e=>{ setSearchPdv(e.target.value); setSelectedPdv(null); }}
            style={{ ...ipt, marginBottom:12 }}
          />
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {stores
              .filter(s=>!searchPdv||s.nome.toLowerCase().includes(searchPdv.toLowerCase())||(s.end||"").toLowerCase().includes(searchPdv.toLowerCase()))
              .sort((a,b)=>ORDER[visitStatus(a.visita)]-ORDER[visitStatus(b.visita)])
              .map(s=>{
                const hist = visitasPorPdv[s.id]||[];
                const isSelected = selectedPdv===s.id;
                const d = s.visita?daysSince(s.visita):null;
                const color = !s.visita?C.grayDim:d===0?C.green:d<=14?C.amber:C.red;
                return (
                  <div key={s.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderLeft:`3px solid ${color}`, borderRadius:10, overflow:"hidden" }}>
                    <div style={{ padding:"12px 14px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" }} onClick={()=>setSelectedPdv(isSelected?null:s.id)}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14, fontWeight:600, color:C.white }}>{s.nome}</div>
                        <div style={{ fontSize:11, color:C.gray, marginTop:2 }}>{TIPO_LABEL[s.tipo]} · {s.end}</div>
                      </div>
                      <div style={{ textAlign:"right", flexShrink:0, marginLeft:8 }}>
                        <div style={{ fontSize:12, fontWeight:700, color }}>{d!==null?d===0?"hoje":`${d}d atrás`:"nunca"}</div>
                        <div style={{ fontSize:10, color:C.gray }}>{hist.length} visita{hist.length!==1?"s":""}</div>
                      </div>
                    </div>
                    {isSelected&&(
                      <div style={{ padding:"0 14px 14px", borderTop:`1px solid ${C.border}` }}>
                        {s.obs&&(
                          <div style={{ padding:"10px 0 6px", fontSize:12, color:C.gray, borderBottom:`1px solid ${C.border}`, marginBottom:10 }}>
                            <span style={{ color:C.grayDim, fontSize:10 }}>OBS: </span>{s.obs}
                          </div>
                        )}
                        {hist.length===0 ? (
                          <div style={{ padding:"12px 0", textAlign:"center", color:C.gray, fontSize:12 }}>Nenhuma visita registrada.</div>
                        ) : (
                          <>
                            <div style={{ fontSize:10, color:C.gray, letterSpacing:"0.08em", margin:"10px 0 6px" }}>HISTÓRICO</div>
                            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                              {hist.map(v=>(
                                <div key={v.id} style={{ fontSize:12, padding:"8px 10px", background:C.surface2, borderRadius:7, display:"flex", gap:8, alignItems:"flex-start" }}>
                                  <span style={{ color:C.yellow, fontWeight:600, fontFamily:"monospace", flexShrink:0 }}>{fmtDate(v.data)}</span>
                                  <span style={{ color:C.grayDim, fontSize:11, flexShrink:0 }}>{fmtTime(v.criado_em)}</span>
                                  {v.obs
                                    ? <span style={{ color:C.gray, lineHeight:1.4 }}>{v.obs}</span>
                                    : <span style={{ color:C.grayDim, fontStyle:"italic" }}>sem obs.</span>
                                  }
                                </div>
                              ))}
                            </div>
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

      {/* ── ABA PENDENTES ── */}
      {aba==="pendentes"&&(
        <div style={{ padding:"1rem" }}>

          {/* Summary cards */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:14 }}>
            {[
              { label:"Nunca", val:stores.filter(s=>!s.visita).length,                                                  color:C.grayDim },
              { label:"+30d",  val:stores.filter(s=>s.visita&&daysSince(s.visita)>30).length,                           color:C.red     },
              { label:"Em dia",val:stores.filter(s=>s.visita&&daysSince(s.visita)<=14).length,                          color:C.green   },
            ].map(({ label, val, color })=>(
              <div key={label} style={{ padding:"10px 0", background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, textAlign:"center" }}>
                <div style={{ fontSize:20, fontWeight:700, color, fontVariantNumeric:"tabular-nums" }}>{val}</div>
                <div style={{ fontSize:10, color:C.gray, marginTop:2 }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {stores
              .sort((a,b)=>{
                const da = a.visita?daysSince(a.visita):9999;
                const db = b.visita?daysSince(b.visita):9999;
                return db-da;
              })
              .map(s=>{
                const d = s.visita?daysSince(s.visita):null;
                const color = !s.visita?C.grayDim:d>30?C.red:d>14?C.amber:C.green;
                return (
                  <div key={s.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderLeft:`3px solid ${color}`, borderRadius:10, padding:"11px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:600, color:C.white }}>{s.nome}</div>
                      <div style={{ fontSize:11, color:C.gray, marginTop:2 }}>{TIPO_LABEL[s.tipo]} · {s.end}</div>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0, marginLeft:8 }}>
                      <div style={{ fontSize:14, fontWeight:700, color, fontVariantNumeric:"tabular-nums" }}>{d!==null?`${d}d`:"nunca"}</div>
                      {s.visita&&<div style={{ fontSize:10, color:C.grayDim }}>{fmtDate(s.visita)}</div>}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
