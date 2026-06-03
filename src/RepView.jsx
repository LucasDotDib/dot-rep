import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { C, ipt, Btn, FormPDV, PdvCardLight, BottomNav, TODAY, daysSince, visitStatus, fromDB, ORDER } from "./ui";

export default function RepView({ onLogout }) {
  const [stores, setStores]       = useState(null);
  const [rotas, setRotas]         = useState([]);
  const [rotaAtiva, setRotaAtiva] = useState(null);
  const [historico, setHistorico] = useState({});
  const [erro, setErro]           = useState(null);
  const [aba, setAba]             = useState("hoje");
  const [search, setSearch]       = useState("");
  const [filter, setFilter]       = useState("todos");
  const [sort, setSort]           = useState("smart");
  const [expanded, setExpanded]   = useState(null);
  const [editing, setEditing]     = useState(null);
  const [flash, setFlash]         = useState(null);
  const [showAdd, setShowAdd]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [obs, setObs]             = useState({});
  const [marcandoId, setMarcandoId] = useState(null);
  const [marcObs, setMarcObs]     = useState("");

  const carregar = useCallback(async () => {
    const [pdvs, rts, ativa, vis] = await Promise.all([
      supabase.from("pdvs").select("*").order("criado_em",{ascending:true}),
      supabase.from("rotas").select("*").order("nome",{ascending:true}),
      supabase.from("rota_ativa").select("*").eq("id",1).single(),
      supabase.from("visitas").select("*").order("criado_em",{ascending:false}),
    ]);
    if (pdvs.error) { setErro(pdvs.error.message); return; }
    setStores((pdvs.data||[]).map(fromDB));
    setRotas(rts.data||[]);
    setRotaAtiva(ativa.data?.rota_id||null);
    const hist={};
    for (const v of (vis.data||[])) { if(!hist[v.pdv_id])hist[v.pdv_id]=[]; hist[v.pdv_id].push({id:v.id,data:v.data,obs:v.obs||""}); }
    setHistorico(hist);
  }, []);

  useEffect(() => {
    carregar();
    const ch = supabase.channel("rep-changes")
      .on("postgres_changes",{event:"*",schema:"public",table:"pdvs"},()=>carregar())
      .on("postgres_changes",{event:"*",schema:"public",table:"rotas"},()=>carregar())
      .on("postgres_changes",{event:"*",schema:"public",table:"rota_ativa"},()=>carregar())
      .on("postgres_changes",{event:"*",schema:"public",table:"visitas"},()=>carregar())
      .subscribe();
    return ()=>supabase.removeChannel(ch);
  }, [carregar]);

  const adicionar = useCallback(async (form) => {
    setSaving(true);
    const rotaFinal = form.rotaId||(aba==="hoje"&&rotaAtiva?rotaAtiva:null);
    const { error } = await supabase.from("pdvs").insert([{
      id:Date.now().toString(), nome:form.nome.trim(), endereco:form.end.trim(),
      cep:form.cep.replace(/\D/g,""), tipo:form.tipo, prioridade:form.prio,
      vendeu_dot:false, ultima_visita:null, obs:"", rota_id:rotaFinal,
    }]);
    if(error) setErro(error.message); else setShowAdd(false);
    setSaving(false);
  }, [aba, rotaAtiva]);

  const editar = useCallback(async (id, form) => {
    setSaving(true);
    const { error } = await supabase.from("pdvs").update({
      nome:form.nome.trim(), endereco:form.end.trim(),
      cep:form.cep.replace(/\D/g,""), tipo:form.tipo, prioridade:form.prio, rota_id:form.rotaId,
    }).eq("id",id);
    if(error) setErro(error.message); else setEditing(null);
    setSaving(false);
  }, []);

  const atualizar = useCallback(async (id, campos) => {
    const { error } = await supabase.from("pdvs").update(campos).eq("id",id);
    if(error) setErro(error.message);
  }, []);

  const marcar = useCallback(async (id, obsText) => {
    setMarcandoId(null); setMarcObs("");
    await Promise.all([
      atualizar(id,{ultima_visita:TODAY}),
      supabase.from("visitas").insert([{id:Date.now().toString(),pdv_id:id,data:TODAY,obs:obsText||""}]),
    ]);
    setFlash(id); setTimeout(()=>setFlash(null),2000);
  }, [atualizar]);

  const saveObs = useCallback(async (id) => {
    if(obs[id]!==undefined){ await atualizar(id,{obs:obs[id]}); setObs(p=>{const n={...p};delete n[id];return n;}); }
  }, [obs, atualizar]);

  const remover = useCallback(async (id) => {
    const { error } = await supabase.from("pdvs").delete().eq("id",id);
    if(error) setErro(error.message); else { setExpanded(null); setConfirmDel(null); }
  }, []);

  if (!stores) return (
    <div style={{ background:C.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12 }}>
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
  const totalRota     = pdvsRotaAtiva.length;
  const visitadosRota = pdvsRotaAtiva.filter(s=>daysSince(s.visita)===0).length;

  const listaTodos = stores
    .filter(s=>{
      const q=search.toLowerCase(), m=!q||s.nome.toLowerCase().includes(q)||(s.end||"").toLowerCase().includes(q)||(s.cep||"").includes(q);
      if(filter==="prio")      return m&&s.prio===1;
      if(filter==="pendentes") return m&&daysSince(s.visita)!==0;
      if(filter==="hoje")      return m&&daysSince(s.visita)===0;
      return m;
    })
    .sort((a,b)=>sort==="cep"
      ?(a.cep||"").replace(/\D/g,"").localeCompare((b.cep||"").replace(/\D/g,""))
      :b.prio-a.prio||ORDER[visitStatus(a.visita)]-ORDER[visitStatus(b.visita)]);

  const listaHoje = pdvsRotaAtiva.slice()
    .sort((a,b)=>ORDER[visitStatus(a.visita)]-ORDER[visitStatus(b.visita)]||(a.cep||"").localeCompare(b.cep||""));

  const cardProps = {
    rotas, expanded, editing, flash, confirmDel, obs,
    setExpanded, setEditing, setConfirmDel, setObs,
    marcar, atualizar, editar, remover, saveObs, saving,
    marcandoId, setMarcandoId, marcObs, setMarcObs, historico,
  };

  const pendRota = totalRota - visitadosRota;
  const TABS = [["hoje","ti-target","Hoje"],["todos","ti-layout-list","Todos"],["rotas","ti-map-pin","Rotas"],["consig","ti-package","Consig."]];

  return (
    <div style={{ fontFamily:"'SF Pro Display',-apple-system,BlinkMacSystemFont,sans-serif", background:C.bg, minHeight:"100vh", maxWidth:440, margin:"0 auto", paddingBottom:"100px" }}>

      {/* HEADER */}
      <div style={{ background:C.white, padding:"1rem 1rem 0", boxShadow:"0 1px 0 #eaecf0" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4, paddingBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#1b3a8c,#2d52b8)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>⚡</div>
            <div>
              <p style={{ margin:0, fontSize:11, color:C.muted, letterSpacing:"0.06em" }}>DOT ENERGY</p>
              <h1 style={{ margin:0, fontSize:18, fontWeight:700, color:C.text, letterSpacing:"-0.01em" }}>Rota PDV</h1>
            </div>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            {aba!=="rotas"&&(
              <Btn variant={showAdd?"danger":"blue"} style={{padding:"8px 14px",fontSize:12}} onClick={()=>{setShowAdd(v=>!v);setEditing(null);}}>
                {showAdd?"✕":"+ PDV"}
              </Btn>
            )}
            <Btn variant="ghost" style={{padding:"8px 12px",fontSize:12}} onClick={onLogout}>Sair</Btn>
          </div>
        </div>
      </div>

      {/* ABA HOJE */}
      {aba==="hoje"&&(
        <div style={{ padding:"1rem" }}>
          {!rotaAtiva ? (
            <div style={{ textAlign:"center", padding:"4rem 1rem" }}>
              <div style={{ fontSize:48, marginBottom:16 }}>🎯</div>
              <h2 style={{ margin:"0 0 8px", fontSize:20, fontWeight:700, color:C.text }}>Nenhuma rota ativa</h2>
              <p style={{ margin:"0 0 24px", fontSize:14, color:C.muted, lineHeight:1.6 }}>Aguarde o administrador ativar a rota do dia.</p>
              <Btn variant="ghost" style={{padding:"10px 24px"}} onClick={()=>setAba("rotas")}>Ver rotas</Btn>
            </div>
          ) : (
            <>
              {/* Banner de progresso */}
              <div style={{ background:"linear-gradient(135deg,#1b3a8c,#2d52b8)", borderRadius:20, padding:"18px 20px", marginBottom:14, color:"#fff" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <p style={{ margin:"0 0 4px", fontSize:11, opacity:0.7, letterSpacing:"0.08em" }}>ROTA ATIVA</p>
                    <p style={{ margin:0, fontSize:20, fontWeight:700 }}>📍 {rotaAtivaObj?.nome||"—"}</p>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <p style={{ margin:0, fontSize:32, fontWeight:700, color:visitadosRota===totalRota&&totalRota>0?"#a7f3d0":"#f5c800" }}>
                      {visitadosRota}<span style={{fontSize:18,opacity:0.6}}>/{totalRota}</span>
                    </p>
                    <p style={{ margin:0, fontSize:10, opacity:0.6, letterSpacing:"0.06em" }}>VISITADOS</p>
                  </div>
                </div>
                {totalRota>0&&(
                  <div style={{ marginTop:14, height:5, background:"rgba(255,255,255,0.2)", borderRadius:99 }}>
                    <div style={{ height:"100%", width:`${(visitadosRota/totalRota)*100}%`, background:"#f5c800", borderRadius:99, transition:"width 0.4s" }} />
                  </div>
                )}
                {totalRota>0&&<p style={{ margin:"8px 0 0", fontSize:11, opacity:0.6 }}>{pendRota} pendente{pendRota!==1?"s":""}</p>}
              </div>

              {showAdd&&(
                <div style={{ background:C.white, borderRadius:16, padding:"16px", marginBottom:14, boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
                  <p style={{margin:"0 0 14px",fontSize:12,fontWeight:700,color:C.blue,textTransform:"uppercase",letterSpacing:"0.08em"}}>
                    Novo PDV {rotaAtivaObj?`· ${rotaAtivaObj.nome}`:""}
                  </p>
                  <FormPDV initial={{nome:"",end:"",cep:"",tipo:"facu",prio:0,rotaId:rotaAtiva}} onSave={adicionar} onCancel={()=>setShowAdd(false)} saving={saving} rotas={rotas} />
                </div>
              )}

              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {listaHoje.length===0 ? (
                  <div style={{ textAlign:"center", padding:"3rem 1rem" }}>
                    <div style={{ fontSize:36, marginBottom:10 }}>📍</div>
                    <p style={{ color:C.muted, fontSize:14 }}>Nenhum PDV nesta rota ainda.</p>
                  </div>
                ) : listaHoje.map(s=><PdvCardLight key={s.id} s={s} {...cardProps} />)}
              </div>

              {totalRota>0&&visitadosRota===totalRota&&(
                <div style={{ marginTop:12, padding:"14px", background:C.greenDim, border:"1px solid #bbf7d0", borderRadius:14, textAlign:"center" }}>
                  <p style={{ margin:0, fontSize:14, color:C.green, fontWeight:700 }}>🎉 Rota completa — todos visitados!</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ABA TODOS */}
      {aba==="todos"&&(
        <div style={{ padding:"1rem" }}>
          {showAdd&&(
            <div style={{ background:C.white, borderRadius:16, padding:"16px", marginBottom:14, boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
              <p style={{margin:"0 0 14px",fontSize:12,fontWeight:700,color:C.blue,textTransform:"uppercase",letterSpacing:"0.08em"}}>Novo PDV</p>
              <FormPDV initial={{nome:"",end:"",cep:"",tipo:"facu",prio:0,rotaId:null}} onSave={adicionar} onCancel={()=>setShowAdd(false)} saving={saving} rotas={rotas} />
            </div>
          )}
          <input type="text" placeholder="Buscar por nome, endereço ou CEP…" value={search} onChange={e=>setSearch(e.target.value)}
            style={{...ipt, marginBottom:10, background:C.white, boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}} />
          <div style={{ display:"flex", gap:6, marginBottom:10 }}>
            {[["todos","Todos"],["prio","⭐ Prior."],["pendentes","Pendentes"],["hoje","Hoje"]].map(([v,l])=>(
              <button key={v} onClick={()=>setFilter(v)} style={{
                flex:1, padding:"8px 0", fontSize:12, cursor:"pointer", borderRadius:10, border:"none", fontFamily:"inherit",
                fontWeight:filter===v?700:400,
                background:filter===v?C.blue:"#ffffff",
                color:filter===v?"#fff":C.muted,
                boxShadow:filter===v?"0 2px 8px rgba(27,58,140,0.2)":"none",
              }}>{l}</button>
            ))}
          </div>
          <div style={{ display:"flex", gap:6, marginBottom:14 }}>
            {[["smart","↕ Inteligente"],["cep","↕ Por CEP"]].map(([v,l])=>(
              <button key={v} onClick={()=>setSort(v)} style={{
                flex:1, padding:"7px 0", fontSize:11, cursor:"pointer", borderRadius:8, fontFamily:"inherit",
                border:"1px solid #eaecf0",
                background:sort===v?C.blueDim:"#fff",
                color:sort===v?C.blue:C.muted,
                fontWeight:sort===v?600:400,
              }}>{l}</button>
            ))}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {listaTodos.length===0&&stores.length===0&&(
              <div style={{ textAlign:"center", padding:"4rem 1rem" }}>
                <div style={{ fontSize:48, marginBottom:14 }}>📍</div>
                <h2 style={{ margin:"0 0 8px", fontSize:18, fontWeight:700, color:C.text }}>Nenhum PDV ainda</h2>
                <p style={{ margin:0, color:C.muted, fontSize:14 }}>Toque em <strong>+ PDV</strong> para adicionar.</p>
              </div>
            )}
            {listaTodos.length===0&&stores.length>0&&<p style={{textAlign:"center",color:C.muted,fontSize:14,padding:"2rem 0"}}>Nenhum PDV encontrado.</p>}
            {listaTodos.map(s=><PdvCardLight key={s.id} s={s} {...cardProps} />)}
          </div>
        </div>
      )}

      {/* ABA ROTAS */}
      {aba==="rotas"&&(
        <div style={{ padding:"1rem" }}>
          {rotaAtivaObj&&(
            <div style={{ background:"linear-gradient(135deg,#1b3a8c,#2d52b8)", borderRadius:20, padding:"16px 18px", marginBottom:14, color:"#fff" }}>
              <p style={{ margin:"0 0 2px", fontSize:10, opacity:0.7, letterSpacing:"0.08em" }}>ROTA ATIVA HOJE</p>
              <p style={{ margin:"0 0 6px", fontSize:18, fontWeight:700 }}>📍 {rotaAtivaObj.nome}</p>
              <p style={{ margin:0, fontSize:12, opacity:0.7 }}>{pdvsRotaAtiva.length} PDVs · {visitadosRota} visitados</p>
              {pdvsRotaAtiva.length>0&&(
                <div style={{ marginTop:10, height:4, background:"rgba(255,255,255,0.2)", borderRadius:99 }}>
                  <div style={{ height:"100%", width:`${(visitadosRota/pdvsRotaAtiva.length)*100}%`, background:"#f5c800", borderRadius:99 }} />
                </div>
              )}
            </div>
          )}
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {rotas.length===0 ? (
              <p style={{ textAlign:"center", color:C.muted, fontSize:14, padding:"3rem 0" }}>Nenhuma rota cadastrada.</p>
            ) : rotas.map(r=>{
              const qtd=stores.filter(s=>s.rotaId===r.id).length, isActive=rotaAtiva===r.id;
              return (
                <div key={r.id} style={{ background:C.white, borderRadius:14, padding:"14px 16px", boxShadow:"0 2px 8px rgba(0,0,0,0.06)", borderLeft:`4px solid ${isActive?C.blue:C.grayDim}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <p style={{ margin:"0 0 3px", fontSize:16, fontWeight:700, color:C.text }}>📍 {r.nome}</p>
                    <p style={{ margin:0, fontSize:12, color:C.muted }}>{qtd} PDV{qtd!==1?"s":""}</p>
                  </div>
                  {isActive&&<span style={{ fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:99, background:C.blueDim, color:C.blue }}>ATIVA HOJE</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ABA CONSIG */}
      {aba==="consig"&&(
        <div style={{ padding:"1rem" }}>
          {(() => {
            const consignados = stores.filter(s=>s.consignado);
            return (
              <>
                <div style={{ background:"linear-gradient(135deg,#7c3aed,#9f67fa)", borderRadius:20, padding:"18px 20px", marginBottom:14, color:"#fff" }}>
                  <p style={{ margin:"0 0 4px", fontSize:11, opacity:0.7, letterSpacing:"0.08em" }}>DISPLAYS CONSIGNADOS</p>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <p style={{ margin:0, fontSize:20, fontWeight:700 }}>📦 Em campo</p>
                    <p style={{ margin:0, fontSize:36, fontWeight:700 }}>{consignados.length}</p>
                  </div>
                  <p style={{ margin:"6px 0 0", fontSize:12, opacity:0.7 }}>PDV{consignados.length!==1?"s":""} com display deixado</p>
                </div>
                {consignados.length===0 ? (
                  <div style={{ textAlign:"center", padding:"4rem 1rem" }}>
                    <div style={{ fontSize:48, marginBottom:14 }}>📦</div>
                    <h2 style={{ margin:"0 0 8px", fontSize:18, fontWeight:700, color:"#111827" }}>Nenhum consignado</h2>
                    <p style={{ margin:0, color:"#6b7280", fontSize:14 }}>Toque em 📦 em qualquer PDV para marcar que deixou um display.</p>
                  </div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {consignados.map(s=><PdvCardLight key={s.id} s={s} {...cardProps} />)}
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
