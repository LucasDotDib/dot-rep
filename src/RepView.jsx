import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { C, ipt, Btn, FormPDV, TODAY, daysSince, fmtDate, fmtCep, fromDB, TIPO_LABEL, getUrgencia, URGENCIA } from "./ui";

const FONT = "'Poppins', sans-serif";
const URG_ORDER = { critica:0, media:1, ok:2 };
const cepCmp = (a,b) => (a.cep||"").replace(/\D/g,"").localeCompare((b.cep||"").replace(/\D/g,""));

function Tag({ children, bg="#f5f6fa", color="#6b7280" }) {
  return <span style={{ fontSize:11, fontWeight:500, padding:"3px 8px", borderRadius:99, background:bg, color, whiteSpace:"nowrap" }}>{children}</span>;
}

function SectionHead({ icon, label, count, color, bg, collapsible, collapsed, onToggle }) {
  return (
    <div
      onClick={collapsible ? onToggle : undefined}
      style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"7px 12px", background:bg, borderRadius:10, marginBottom:8, cursor:collapsible?"pointer":undefined }}
    >
      <span style={{ fontSize:12, fontWeight:700, color, letterSpacing:"0.04em" }}>{icon} {label} ({count})</span>
      {collapsible && <span style={{ fontSize:12, color }}>{collapsed ? "›" : "↓"}</span>}
    </div>
  );
}

function PdvCard({ s, rotas, expanded, editing, flash, confirmDel, obs, setExpanded, setEditing, setConfirmDel, setObs, marcar, atualizar, editar, remover, saveObs, saving, marcandoId, setMarcandoId, marcObs, setMarcObs, historico }) {
  const urg = getUrgencia(s.visita), cfg = URGENCIA[urg];
  const isVisitedToday = daysSince(s.visita) === 0;
  const isExp=expanded===s.id, isEdit=editing===s.id, isFlash=flash===s.id, isDel=confirmDel===s.id;
  const isMarcando = marcandoId===s.id;
  const obsVal = obs[s.id]!==undefined ? obs[s.id] : (s.obs||"");
  const cepFmt = s.cep ? s.cep.slice(0,5)+(s.cep.length>5?"-"+s.cep.slice(5):"") : null;
  const rota = rotas.find(r=>r.id===s.rotaId);
  const hist = historico[s.id]||[];

  return (
    <div style={{ background:C.white, borderRadius:16, border:`1px solid ${C.border}`, borderLeft:`3px solid ${cfg.barColor}`, overflow:"hidden" }}>
      <div style={{ padding:"14px 14px 0" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:15, fontWeight:600, color:C.text, lineHeight:1.3, wordBreak:"break-word" }}>{s.nome}</div>
            <div style={{ fontSize:12, color:C.gray, marginTop:2 }}>{s.end}{cepFmt ? ` · ${cepFmt}` : ""}</div>
          </div>
          <span style={{ fontSize:10, fontWeight:700, padding:"3px 9px", borderRadius:99, flexShrink:0, background:cfg.badgeBg, color:cfg.badgeText, letterSpacing:"0.04em" }}>{cfg.label}</span>
        </div>
        <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:9, marginBottom:2 }}>
          <Tag>{TIPO_LABEL[s.tipo]}</Tag>
          {rota   && <Tag bg="#eff6ff" color={C.blue}>📍 {rota.nome}</Tag>}
          {s.vendeu && <Tag bg={C.greenDim} color={C.green}>Vende Dot</Tag>}
        </div>
      </div>

      {isMarcando&&!isVisitedToday&&(
        <div style={{ padding:"8px 14px 0" }}>
          <input
            placeholder="Observação da visita (opcional)…"
            value={marcObs}
            onChange={e=>setMarcObs(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&marcar(s.id, marcObs)}
            style={{...ipt, fontSize:13}}
            autoFocus
          />
        </div>
      )}

      <div style={{ display:"flex", gap:7, padding:"10px 14px" }}>
        {isMarcando&&!isVisitedToday ? (
          <>
            <Btn variant="blue" style={{flex:1,padding:"11px 0",borderRadius:10,fontSize:13}} onClick={()=>marcar(s.id, marcObs)}>
              ✓ Confirmar visita
            </Btn>
            <Btn variant="ghost" style={{padding:"11px 12px",fontSize:13}} onClick={()=>{setMarcandoId(null);setMarcObs("");}}>
              Cancelar
            </Btn>
          </>
        ) : (
          <>
            <Btn
              variant={isFlash||isVisitedToday ? "green" : "yellow"}
              style={{flex:1, padding:"11px 0", borderRadius:10, fontWeight:700, cursor:isVisitedToday?"default":"pointer", opacity:isVisitedToday?0.7:1}}
              onClick={()=>!isVisitedToday&&setMarcandoId(s.id)}
            >
              {isFlash ? "✓ Registrado!" : isVisitedToday ? "✓ Visitado hoje" : "Marcar visita"}
            </Btn>
            <Btn variant={s.vendeu?"green":"ghost"} style={{padding:"11px 10px",fontSize:12}} onClick={()=>atualizar(s.id,{vendeu_dot:!s.vendeu})}>
              {s.vendeu?"Dot ✓":"+ Dot"}
            </Btn>
            <Btn variant={isExp?"default":"ghost"} style={{padding:"11px 10px",fontSize:13}} onClick={()=>{setExpanded(isExp?null:s.id);setEditing(null);setConfirmDel(null);}}>
              {isExp?"▲":"▼"}
            </Btn>
          </>
        )}
      </div>

      {isExp&&(
        <div style={{ padding:"12px 14px 14px", borderTop:`1px solid ${C.border}` }}>
          {isEdit ? (
            <div>
              <div style={{ fontSize:11, color:C.blue, fontWeight:700, letterSpacing:"0.08em", marginBottom:12 }}>EDITAR PDV</div>
              <FormPDV
                initial={{nome:s.nome,end:s.end,cep:cepFmt||"",tipo:s.tipo,prio:s.prio,rotaId:s.rotaId}}
                onSave={(form)=>editar(s.id,form)}
                onCancel={()=>setEditing(null)}
                saving={saving} rotas={rotas}
              />
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div>
                <div style={{ fontSize:10, color:C.gray, fontWeight:600, letterSpacing:"0.07em", marginBottom:6 }}>OBSERVAÇÕES DO PDV</div>
                <textarea
                  rows={2} value={obsVal}
                  placeholder="Anotação sobre o PDV…"
                  onChange={e=>setObs(p=>({...p,[s.id]:e.target.value}))}
                  onBlur={()=>saveObs(s.id)}
                  style={{...ipt, resize:"none", fontSize:13}}
                />
              </div>
              {hist.length>0&&(
                <div>
                  <div style={{ fontSize:10, color:C.gray, fontWeight:600, letterSpacing:"0.07em", marginBottom:7 }}>HISTÓRICO DE VISITAS</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                    {hist.map(v=>(
                      <div key={v.id} style={{ fontSize:12, padding:"8px 11px", background:C.grayDim, borderRadius:9, display:"flex", gap:8, alignItems:"flex-start" }}>
                        <span style={{ color:C.blue, fontWeight:600, fontFamily:"monospace", flexShrink:0 }}>{fmtDate(v.data)}</span>
                        {v.obs ? <span style={{ color:C.muted, lineHeight:1.4 }}>{v.obs}</span> : <span style={{ color:C.gray, fontStyle:"italic" }}>sem obs.</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display:"flex", gap:7 }}>
                <Btn variant="default" style={{flex:1,padding:"9px 0",fontSize:12}} onClick={()=>setEditing(s.id)}>✏️ Editar dados</Btn>
                {isDel ? (
                  <>
                    <Btn variant="danger" style={{flex:1,padding:"9px 0",fontSize:12}} onClick={()=>remover(s.id)}>Confirmar</Btn>
                    <Btn variant="ghost" style={{padding:"9px 12px",fontSize:12}} onClick={()=>setConfirmDel(null)}>Não</Btn>
                  </>
                ) : (
                  <Btn variant="danger" style={{padding:"9px 12px",fontSize:12}} onClick={()=>setConfirmDel(s.id)}>🗑</Btn>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RepView({ onLogout }) {
  const [stores,     setStores]     = useState(null);
  const [rotas,      setRotas]      = useState([]);
  const [rotaAtiva,  setRotaAtiva]  = useState(null);
  const [historico,  setHistorico]  = useState({});
  const [erro,       setErro]       = useState(null);
  const [aba,        setAba]        = useState("hoje");
  const [search,     setSearch]     = useState("");
  const [filter,     setFilter]     = useState("todos");
  const [sort,       setSort]       = useState("smart");
  const [expanded,   setExpanded]   = useState(null);
  const [editing,    setEditing]    = useState(null);
  const [flash,      setFlash]      = useState(null);
  const [showAdd,    setShowAdd]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [obs,        setObs]        = useState({});
  const [marcandoId, setMarcandoId] = useState(null);
  const [marcObs,    setMarcObs]    = useState("");
  const [okCollapsed, setOkCollapsed] = useState(true);

  const carregar = useCallback(async () => {
    const [pdvs, rts, ativa, vis] = await Promise.all([
      supabase.from("pdvs").select("*").order("criado_em", { ascending:true }),
      supabase.from("rotas").select("*").order("nome", { ascending:true }),
      supabase.from("rota_ativa").select("*").eq("id",1).single(),
      supabase.from("visitas").select("*").order("criado_em", { ascending:false }),
    ]);
    if (pdvs.error) { setErro(pdvs.error.message); return; }
    setStores((pdvs.data||[]).map(fromDB));
    setRotas(rts.data||[]);
    setRotaAtiva(ativa.data?.rota_id||null);
    const hist = {};
    for (const v of (vis.data||[])) {
      if (!hist[v.pdv_id]) hist[v.pdv_id] = [];
      hist[v.pdv_id].push({ id:v.id, data:v.data, obs:v.obs||"" });
    }
    setHistorico(hist);
  }, []);

  useEffect(() => {
    carregar();
    const ch = supabase.channel("rep-changes")
      .on("postgres_changes", { event:"*", schema:"public", table:"pdvs" },       ()=>carregar())
      .on("postgres_changes", { event:"*", schema:"public", table:"rotas" },      ()=>carregar())
      .on("postgres_changes", { event:"*", schema:"public", table:"rota_ativa" }, ()=>carregar())
      .on("postgres_changes", { event:"*", schema:"public", table:"visitas" },    ()=>carregar())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [carregar]);

  const adicionar = useCallback(async (form) => {
    setSaving(true);
    const rotaFinal = form.rotaId || (aba==="hoje"&&rotaAtiva?rotaAtiva:null);
    const { error } = await supabase.from("pdvs").insert([{
      id:Date.now().toString(), nome:form.nome.trim(), endereco:form.end.trim(),
      cep:form.cep.replace(/\D/g,""), tipo:form.tipo, prioridade:0,
      vendeu_dot:false, ultima_visita:null, obs:"", rota_id:rotaFinal,
    }]);
    if (error) setErro(error.message); else setShowAdd(false);
    setSaving(false);
  }, [aba, rotaAtiva]);

  const editar = useCallback(async (id, form) => {
    setSaving(true);
    const { error } = await supabase.from("pdvs").update({
      nome:form.nome.trim(), endereco:form.end.trim(),
      cep:form.cep.replace(/\D/g,""), tipo:form.tipo, rota_id:form.rotaId,
    }).eq("id", id);
    if (error) setErro(error.message); else setEditing(null);
    setSaving(false);
  }, []);

  const atualizar = useCallback(async (id, campos) => {
    const { error } = await supabase.from("pdvs").update(campos).eq("id", id);
    if (error) setErro(error.message);
  }, []);

  const marcar = useCallback(async (id, obsText) => {
    setMarcandoId(null); setMarcObs("");
    await Promise.all([
      atualizar(id, { ultima_visita:TODAY }),
      supabase.from("visitas").insert([{ id:Date.now().toString(), pdv_id:id, data:TODAY, obs:obsText||"" }]),
    ]);
    setFlash(id); setTimeout(()=>setFlash(null), 2000);
  }, [atualizar]);

  const saveObs = useCallback(async (id) => {
    if (obs[id]!==undefined) {
      await atualizar(id, { obs:obs[id] });
      setObs(p=>{ const n={...p}; delete n[id]; return n; });
    }
  }, [obs, atualizar]);

  const remover = useCallback(async (id) => {
    const { error } = await supabase.from("pdvs").delete().eq("id", id);
    if (error) setErro(error.message); else { setExpanded(null); setConfirmDel(null); }
  }, []);

  if (!stores) return (
    <div style={{ background:C.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12, fontFamily:FONT }}>
      <div style={{ width:34, height:34, border:`3px solid ${C.border}`, borderTopColor:C.blue, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (erro) return (
    <div style={{ background:C.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12, padding:"2rem", textAlign:"center", fontFamily:FONT }}>
      <div style={{ fontSize:32 }}>⚠️</div>
      <div style={{ fontSize:14, lineHeight:1.6, color:C.red }}>{erro}</div>
      <Btn variant="default" style={{ padding:"10px 20px" }} onClick={()=>{ setErro(null); carregar(); }}>Tentar novamente</Btn>
    </div>
  );

  const rotaAtivaObj  = rotas.find(r=>r.id===rotaAtiva);
  const pdvsRotaAtiva = stores.filter(s=>s.rotaId===rotaAtiva);
  const totalRota     = pdvsRotaAtiva.length;
  const visitadosRota = pdvsRotaAtiva.filter(s=>daysSince(s.visita)===0).length;

  const pdvsCriticos = pdvsRotaAtiva.filter(s=>getUrgencia(s.visita)==="critica").sort(cepCmp);
  const pdvsMedios   = pdvsRotaAtiva.filter(s=>getUrgencia(s.visita)==="media").sort(cepCmp);
  const pdvsOk       = pdvsRotaAtiva.filter(s=>getUrgencia(s.visita)==="ok").sort(cepCmp);

  const listaTodos = stores
    .filter(s => {
      const q=search.toLowerCase(), m=!q||s.nome.toLowerCase().includes(q)||(s.end||"").toLowerCase().includes(q)||(s.cep||"").includes(q);
      if(filter==="pendentes") return m&&daysSince(s.visita)!==0;
      if(filter==="hoje")      return m&&daysSince(s.visita)===0;
      return m;
    })
    .sort((a,b) => sort==="cep"
      ? cepCmp(a,b)
      : URG_ORDER[getUrgencia(a.visita)]-URG_ORDER[getUrgencia(b.visita)] || cepCmp(a,b));

  const cardProps = {
    rotas, expanded, editing, flash, confirmDel, obs, setExpanded, setEditing, setConfirmDel,
    setObs, marcar, atualizar, editar, remover, saveObs, saving,
    marcandoId, setMarcandoId, marcObs, setMarcObs, historico,
  };

  const NAV_TABS = [
    ["hoje",  "ti-target",      "Hoje" ],
    ["todos", "ti-layout-list", "Todos"],
    ["rotas", "ti-map-pin",     "Rotas"],
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
              <div style={{ fontSize:10, color:C.blue, fontWeight:700, letterSpacing:"0.1em" }}>DOT ENERGY</div>
              <div style={{ fontSize:17, fontWeight:700, color:C.text, lineHeight:1.1 }}>Rota PDV</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:7, alignItems:"center" }}>
            {aba!=="rotas"&&(
              <Btn variant={showAdd?"danger":"yellow"} style={{padding:"8px 14px",fontSize:12}} onClick={()=>{setShowAdd(v=>!v);setEditing(null);}}>
                {showAdd?"✕":"+ PDV"}
              </Btn>
            )}
            <button onClick={onLogout} style={{ background:"none", border:"none", cursor:"pointer", padding:6 }}>
              <i className="ti ti-logout" style={{ fontSize:20, color:C.muted }} />
            </button>
          </div>
        </div>
      </div>

      {/* ── ABA HOJE ── */}
      {aba==="hoje"&&(
        <div style={{ padding:"16px 16px 0" }}>
          {!rotaAtiva ? (
            <div style={{ textAlign:"center", padding:"4rem 1rem" }}>
              <div style={{ width:64, height:64, borderRadius:20, background:C.blueDim, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
                <i className="ti ti-target" style={{ fontSize:30, color:C.blue }} />
              </div>
              <div style={{ fontSize:17, fontWeight:700, color:C.text, marginBottom:8 }}>Nenhuma rota ativa</div>
              <div style={{ fontSize:13, color:C.gray, lineHeight:1.6 }}>Aguarde o admin ativar a rota do dia.</div>
            </div>
          ) : (
            <>
              {/* Banner rota ativa */}
              <div style={{ background:C.blue, borderRadius:20, padding:"18px 20px", marginBottom:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,0.6)", fontWeight:600, letterSpacing:"0.1em", marginBottom:4 }}>ROTA ATIVA</div>
                    <div style={{ fontSize:19, fontWeight:700, color:"#ffffff" }}>📍 {rotaAtivaObj?.nome||"—"}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:26, fontWeight:700, color:C.yellow, fontVariantNumeric:"tabular-nums" }}>{visitadosRota}/{totalRota}</div>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)", letterSpacing:"0.06em" }}>VISITADOS</div>
                  </div>
                </div>
                {totalRota>0&&(
                  <div style={{ marginTop:14, height:5, background:"rgba(255,255,255,0.15)", borderRadius:99, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${(visitadosRota/totalRota)*100}%`, background:C.yellow, borderRadius:99, transition:"width 0.4s" }} />
                  </div>
                )}
                {totalRota>0&&(
                  <div style={{ display:"flex", gap:12, marginTop:10, fontSize:11, fontWeight:700 }}>
                    {pdvsCriticos.length>0 && <span style={{ color:"#fca5a5" }}>{pdvsCriticos.length} urgentes</span>}
                    {pdvsMedios.length>0   && <span style={{ color:"#fde68a" }}>{pdvsMedios.length} pendentes</span>}
                    {pdvsOk.length>0       && <span style={{ color:"#86efac" }}>{pdvsOk.length} em dia</span>}
                  </div>
                )}
              </div>

              {showAdd&&(
                <div style={{ background:C.white, borderRadius:16, border:`1px solid ${C.border}`, padding:"18px", marginBottom:16 }}>
                  <div style={{ fontSize:11, color:C.blue, fontWeight:700, letterSpacing:"0.08em", marginBottom:14 }}>
                    NOVO PDV{rotaAtivaObj?` · ${rotaAtivaObj.nome.toUpperCase()}`:""}
                  </div>
                  <FormPDV initial={{ nome:"", end:"", cep:"", tipo:"facu", prio:0, rotaId:rotaAtiva }} onSave={adicionar} onCancel={()=>setShowAdd(false)} saving={saving} rotas={rotas} />
                </div>
              )}

              {totalRota===0 ? (
                <div style={{ textAlign:"center", padding:"3rem 0" }}>
                  <div style={{ fontSize:13, color:C.gray }}>Nenhum PDV nesta rota ainda.<br/>Toque em <span style={{color:C.blue,fontWeight:600}}>+ PDV</span> para adicionar.</div>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {/* Seção Urgente */}
                  {pdvsCriticos.length>0&&(
                    <div>
                      <SectionHead icon="🔴" label="Urgente" count={pdvsCriticos.length} color="#991b1b" bg="#fef2f2" />
                      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                        {pdvsCriticos.map(s=><PdvCard key={s.id} s={s} {...cardProps} />)}
                      </div>
                    </div>
                  )}

                  {/* Seção Pendentes */}
                  {pdvsMedios.length>0&&(
                    <div>
                      <SectionHead icon="🟡" label="Pendentes" count={pdvsMedios.length} color="#92400e" bg="#fffbeb" />
                      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                        {pdvsMedios.map(s=><PdvCard key={s.id} s={s} {...cardProps} />)}
                      </div>
                    </div>
                  )}

                  {/* Seção Em dia — colapsada por padrão */}
                  {pdvsOk.length>0&&(
                    <div>
                      <SectionHead
                        icon="✅" label="Em dia" count={pdvsOk.length}
                        color="#166534" bg="#f0fdf4"
                        collapsible collapsed={okCollapsed} onToggle={()=>setOkCollapsed(v=>!v)}
                      />
                      {!okCollapsed&&(
                        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                          {pdvsOk.map(s=><PdvCard key={s.id} s={s} {...cardProps} />)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {totalRota>0&&visitadosRota===totalRota&&(
                <div style={{ marginTop:14, padding:"14px", background:C.greenDim, border:`1px solid #bbf7d0`, borderRadius:12, textAlign:"center" }}>
                  <span style={{ fontSize:13, color:C.green, fontWeight:600 }}>🎉 ROTA COMPLETA — todos visitados!</span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── ABA TODOS ── */}
      {aba==="todos"&&(
        <div style={{ padding:"16px 16px 0" }}>
          {showAdd&&(
            <div style={{ background:C.white, borderRadius:16, border:`1px solid ${C.border}`, padding:"18px", marginBottom:16 }}>
              <div style={{ fontSize:11, color:C.blue, fontWeight:700, letterSpacing:"0.08em", marginBottom:14 }}>NOVO PONTO DE VENDA</div>
              <FormPDV initial={{ nome:"", end:"", cep:"", tipo:"facu", prio:0, rotaId:null }} onSave={adicionar} onCancel={()=>setShowAdd(false)} saving={saving} rotas={rotas} />
            </div>
          )}
          <input type="text" placeholder="Buscar por nome, endereço ou CEP…" value={search} onChange={e=>setSearch(e.target.value)} style={{...ipt, marginBottom:10}} />
          <div style={{ display:"flex", gap:6, marginBottom:10 }}>
            {[["todos","Todos"],["pendentes","Pendentes"],["hoje","Hoje"]].map(([v,l])=>(
              <Btn key={v} variant={filter===v?"yellow":"ghost"} style={{flex:1,padding:"7px 0",fontSize:11}} onClick={()=>setFilter(v)}>{l}</Btn>
            ))}
          </div>
          <div style={{ display:"flex", gap:6, marginBottom:14 }}>
            <Btn variant={sort==="smart"?"blue":"ghost"} style={{flex:1,padding:"6px 0",fontSize:11}} onClick={()=>setSort("smart")}>↕ Urgência</Btn>
            <Btn variant={sort==="cep"?"yellow":"ghost"} style={{flex:1,padding:"6px 0",fontSize:11}} onClick={()=>setSort("cep")}>↕ Por CEP</Btn>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {listaTodos.length===0&&stores.length===0&&(
              <div style={{ textAlign:"center", padding:"4rem 0" }}>
                <div style={{ fontSize:17, fontWeight:700, color:C.text, marginBottom:8 }}>Nenhum PDV cadastrado</div>
                <div style={{ fontSize:13, color:C.gray }}>Toque em <span style={{color:C.blue,fontWeight:600}}>+ PDV</span> para começar.</div>
              </div>
            )}
            {listaTodos.length===0&&stores.length>0&&<div style={{ textAlign:"center", padding:"2rem 0", color:C.gray, fontSize:14 }}>Nenhum PDV encontrado.</div>}
            {listaTodos.map(s=><PdvCard key={s.id} s={s} {...cardProps} />)}
          </div>
        </div>
      )}

      {/* ── ABA ROTAS (read-only) ── */}
      {aba==="rotas"&&(
        <div style={{ padding:"16px 16px 0" }}>
          {rotaAtivaObj&&(
            <div style={{ background:C.blue, borderRadius:20, padding:"18px 20px", marginBottom:16 }}>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.6)", fontWeight:600, letterSpacing:"0.1em", marginBottom:4 }}>ROTA ATIVA HOJE</div>
              <div style={{ fontSize:19, fontWeight:700, color:"#fff", marginBottom:6 }}>📍 {rotaAtivaObj.nome}</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.65)" }}>{pdvsRotaAtiva.length} PDVs · {visitadosRota} visitados</div>
              {pdvsRotaAtiva.length>0&&(
                <div style={{ marginTop:12, height:5, background:"rgba(255,255,255,0.15)", borderRadius:99, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${(visitadosRota/pdvsRotaAtiva.length)*100}%`, background:C.yellow, borderRadius:99, transition:"width 0.4s" }} />
                </div>
              )}
            </div>
          )}
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {rotas.length===0 ? (
              <div style={{ textAlign:"center", padding:"3rem 0", color:C.gray, fontSize:13 }}>Nenhuma rota cadastrada.</div>
            ) : rotas.map(r=>{
              const qtd = stores.filter(s=>s.rotaId===r.id).length;
              const isActive = rotaAtiva===r.id;
              return (
                <div key={r.id} style={{ background:C.white, border:`1px solid ${C.border}`, borderLeft:`3px solid ${isActive?C.yellow:C.border}`, borderRadius:14, padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:15, fontWeight:600, color:C.text }}>📍 {r.nome}</div>
                    <div style={{ fontSize:12, color:C.gray, marginTop:2 }}>{qtd} PDV{qtd!==1?"s":""}</div>
                  </div>
                  {isActive&&<span style={{ fontSize:10, fontWeight:700, padding:"4px 10px", borderRadius:99, background:C.yellowDim, color:"#92400e" }}>ATIVA HOJE</span>}
                </div>
              );
            })}
          </div>
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
              flex:1, padding:"10px 6px", border:"none", cursor:"pointer",
              borderRadius:94, fontFamily:FONT,
              background: aba===v ? C.white : "transparent",
              display:"flex", flexDirection:"column", alignItems:"center", gap:3,
              transition:"background 0.15s",
            }}>
              <i className={`ti ${icon}`} style={{ fontSize:19, color: aba===v ? C.text : "#6b7280" }} />
              <span style={{ fontSize:10, fontWeight:600, color: aba===v ? C.text : "#6b7280" }}>{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
