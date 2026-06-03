import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import {
  C, R, font, ipt, Btn, FormPDV, PdvCardLight, BottomNav,
  HeroBanner, Badge,
  TODAY, daysSince, visitStatus, fromDB, ORDER,
} from "./ui";

const TABS = [
  ["hoje",  "hoje",  "Hoje",   "🎯"],
  ["todos", "todos", "Todos",  "⊞"],
  ["rotas", "rotas", "Rotas",  "◎"],
  ["consig","consig","Consig.","📦"],
];

export default function RepView({ onLogout }) {
  const [stores,      setStores]      = useState(null);
  const [rotas,       setRotas]       = useState([]);
  const [rotaAtiva,   setRotaAtiva]   = useState(null);
  const [historico,   setHistorico]   = useState({});
  const [erro,        setErro]        = useState(null);
  const [aba,         setAba]         = useState("hoje");
  const [search,      setSearch]      = useState("");
  const [filter,      setFilter]      = useState("todos");
  const [sort,        setSort]        = useState("smart");
  const [expanded,    setExpanded]    = useState(null);
  const [editing,     setEditing]     = useState(null);
  const [flash,       setFlash]       = useState(null);
  const [showAdd,     setShowAdd]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [confirmDel,  setConfirmDel]  = useState(null);
  const [obs,         setObs]         = useState({});
  const [marcandoId,  setMarcandoId]  = useState(null);
  const [marcObs,     setMarcObs]     = useState("");

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
    for (const v of (vis.data||[])) {
      if (!hist[v.pdv_id]) hist[v.pdv_id]=[];
      hist[v.pdv_id].push({ id:v.id, data:v.data, obs:v.obs||"" });
    }
    setHistorico(hist);
  }, []);

  useEffect(() => {
    carregar();
    const ch = supabase.channel("rep-changes")
      .on("postgres_changes",{event:"*",schema:"public",table:"pdvs"},    ()=>carregar())
      .on("postgres_changes",{event:"*",schema:"public",table:"rotas"},   ()=>carregar())
      .on("postgres_changes",{event:"*",schema:"public",table:"rota_ativa"},()=>carregar())
      .on("postgres_changes",{event:"*",schema:"public",table:"visitas"}, ()=>carregar())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [carregar]);

  const adicionar = useCallback(async (form) => {
    setSaving(true);
    const rotaFinal = form.rotaId||(aba==="hoje"&&rotaAtiva?rotaAtiva:null);
    const { error } = await supabase.from("pdvs").insert([{
      id:Date.now().toString(), nome:form.nome.trim(), endereco:form.end.trim(),
      cep:form.cep.replace(/\D/g,""), tipo:form.tipo, prioridade:form.prio,
      vendeu_dot:false, ultima_visita:null, obs:"", rota_id:rotaFinal,
    }]);
    if (error) setErro(error.message); else setShowAdd(false);
    setSaving(false);
  }, [aba, rotaAtiva]);

  const editar = useCallback(async (id, form) => {
    setSaving(true);
    const { error } = await supabase.from("pdvs").update({
      nome:form.nome.trim(), endereco:form.end.trim(),
      cep:form.cep.replace(/\D/g,""), tipo:form.tipo, prioridade:form.prio, rota_id:form.rotaId,
    }).eq("id",id);
    if (error) setErro(error.message); else setEditing(null);
    setSaving(false);
  }, []);

  const atualizar = useCallback(async (id, campos) => {
    const { error } = await supabase.from("pdvs").update(campos).eq("id",id);
    if (error) setErro(error.message);
  }, []);

  const marcar = useCallback(async (id, obsText) => {
    setMarcandoId(null); setMarcObs("");
    await Promise.all([
      atualizar(id, { ultima_visita:TODAY }),
      supabase.from("visitas").insert([{ id:Date.now().toString(), pdv_id:id, data:TODAY, obs:obsText||"" }]),
    ]);
    setFlash(id); setTimeout(() => setFlash(null), 2000);
  }, [atualizar]);

  const saveObs = useCallback(async (id) => {
    if (obs[id] !== undefined) {
      await atualizar(id, { obs:obs[id] });
      setObs(p => { const n={...p}; delete n[id]; return n; });
    }
  }, [obs, atualizar]);

  const remover = useCallback(async (id) => {
    const { error } = await supabase.from("pdvs").delete().eq("id",id);
    if (error) setErro(error.message); else { setExpanded(null); setConfirmDel(null); }
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

  const rotaAtivaObj   = rotas.find(r => r.id === rotaAtiva);
  const pdvsRotaAtiva  = stores.filter(s => s.rotaId === rotaAtiva);
  const totalRota      = pdvsRotaAtiva.length;
  const visitadosRota  = pdvsRotaAtiva.filter(s => daysSince(s.visita) === 0).length;
  const pendRota       = totalRota - visitadosRota;

  const listaTodos = stores
    .filter(s => {
      const q=search.toLowerCase();
      const m=!q||s.nome.toLowerCase().includes(q)||(s.end||"").toLowerCase().includes(q)||(s.cep||"").includes(q);
      if (filter==="prio")      return m && s.prio===1;
      if (filter==="pendentes") return m && daysSince(s.visita)!==0;
      if (filter==="hoje")      return m && daysSince(s.visita)===0;
      return m;
    })
    .sort((a,b) => sort==="cep"
      ? (a.cep||"").replace(/\D/g,"").localeCompare((b.cep||"").replace(/\D/g,""))
      : b.prio-a.prio || ORDER[visitStatus(a.visita)]-ORDER[visitStatus(b.visita)]
    );

  const listaHoje = pdvsRotaAtiva.slice()
    .sort((a,b) => ORDER[visitStatus(a.visita)]-ORDER[visitStatus(b.visita)] || (a.cep||"").localeCompare(b.cep||""));

  const cardProps = {
    rotas, expanded, editing, flash, confirmDel, obs,
    setExpanded, setEditing, setConfirmDel, setObs,
    marcar, atualizar, editar, remover, saveObs, saving,
    marcandoId, setMarcandoId, marcObs, setMarcObs, historico,
  };

  const s = {
    wrap: {
      fontFamily:font, background:C.bg, minHeight:"100vh",
      maxWidth:440, margin:"0 auto", paddingBottom:80,
    },
    header: {
      background:C.white, padding:"13px 15px",
      borderBottom:`0.5px solid ${C.border}`,
      display:"flex", alignItems:"center", justifyContent:"space-between",
    },
    logoBox: {
      width:32, height:32, borderRadius:9, background:C.blue,
      display:"flex", alignItems:"center", justifyContent:"center", fontSize:18,
    },
    pad: { padding:"14px" },
  };

  return (
    <div style={s.wrap}>

      {/* ── Header ── */}
      <div style={s.header}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={s.logoBox}>⚡</div>
          <div>
            <p style={{ margin:0, fontSize:10, color:C.muted, letterSpacing:".06em" }}>DOT ENERGY</p>
            <h1 style={{ margin:0, fontSize:17, fontWeight:500, color:C.text }}>Rota PDV</h1>
          </div>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {aba !== "rotas" && (
            <Btn variant={showAdd?"danger":"blue"} style={{padding:"7px 13px",fontSize:12}}
              onClick={() => { setShowAdd(v=>!v); setEditing(null); }}>
              {showAdd ? "✕" : "+ PDV"}
            </Btn>
          )}
          <Btn variant="ghost" style={{padding:"7px 11px",fontSize:12}} onClick={onLogout}>Sair</Btn>
        </div>
      </div>

      {/* ── Aba: Hoje ── */}
      {aba === "hoje" && (
        <div style={s.pad}>
          {!rotaAtiva ? (
            <div style={{ textAlign:"center", padding:"4rem 1rem" }}>
              <div style={{ fontSize:48, marginBottom:16 }}>🎯</div>
              <h2 style={{ margin:"0 0 8px", fontSize:20, fontWeight:500, color:C.text }}>Nenhuma rota ativa</h2>
              <p style={{ margin:"0 0 24px", fontSize:14, color:C.muted, lineHeight:1.6 }}>Aguarde o administrador ativar a rota do dia.</p>
              <Btn variant="ghost" style={{padding:"10px 24px"}} onClick={() => setAba("rotas")}>Ver rotas</Btn>
            </div>
          ) : (
            <>
              <HeroBanner
                label="Rota ativa"
                name={`📍 ${rotaAtivaObj?.nome||"—"}`}
                sub={`${pendRota} pendente${pendRota!==1?"s":""} hoje`}
                pct={totalRota>0 ? Math.round((visitadosRota/totalRota)*100) : 0}
                num={visitadosRota}
                total={totalRota}
              />

              {showAdd && (
                <div style={{ background:C.white, borderRadius:R.lg, padding:16, marginBottom:14, border:`0.5px solid ${C.border}` }}>
                  <p style={{ margin:"0 0 12px", fontSize:11, fontWeight:500, color:C.blue, textTransform:"uppercase", letterSpacing:".07em" }}>
                    Novo PDV · {rotaAtivaObj?.nome}
                  </p>
                  <FormPDV
                    initial={{ nome:"", end:"", cep:"", tipo:"facu", prio:0, rotaId:rotaAtiva }}
                    onSave={adicionar} onCancel={() => setShowAdd(false)} saving={saving} rotas={rotas}
                  />
                </div>
              )}

              <div>
                {listaHoje.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"3rem 1rem" }}>
                    <div style={{ fontSize:36, marginBottom:10 }}>📍</div>
                    <p style={{ color:C.muted, fontSize:14 }}>Nenhum PDV nesta rota ainda.</p>
                  </div>
                ) : listaHoje.map(s => <PdvCardLight key={s.id} s={s} {...cardProps} />)}
              </div>

              {totalRota>0 && visitadosRota===totalRota && (
                <div style={{ marginTop:12, padding:14, background:C.greenDim, border:`1px solid ${C.greenBorder}`, borderRadius:R.lg, textAlign:"center" }}>
                  <p style={{ margin:0, fontSize:14, color:C.green, fontWeight:500 }}>🎉 Rota completa — todos visitados!</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Aba: Todos ── */}
      {aba === "todos" && (
        <div style={s.pad}>
          {showAdd && (
            <div style={{ background:C.white, borderRadius:R.lg, padding:16, marginBottom:14, border:`0.5px solid ${C.border}` }}>
              <p style={{ margin:"0 0 12px", fontSize:11, fontWeight:500, color:C.blue, textTransform:"uppercase", letterSpacing:".07em" }}>Novo PDV</p>
              <FormPDV initial={{ nome:"", end:"", cep:"", tipo:"facu", prio:0, rotaId:null }} onSave={adicionar} onCancel={() => setShowAdd(false)} saving={saving} rotas={rotas} />
            </div>
          )}

          {/* search */}
          <div style={{ position:"relative", marginBottom:10 }}>
            <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:C.muted, fontSize:14 }}>🔍</span>
            <input
              type="text" placeholder="Buscar por nome, endereço ou CEP…" value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...ipt, paddingLeft:32, background:C.white }}
            />
          </div>

          {/* filter pills */}
          <div style={{ display:"flex", gap:5, marginBottom:10, overflowX:"auto" }}>
            {[["todos","Todos"],["prio","⭐ Prior."],["pendentes","Pendentes"],["hoje","Hoje"]].map(([v,l]) => (
              <button key={v} onClick={() => setFilter(v)} style={{
                padding:"5px 11px", fontSize:11, fontWeight:500, cursor:"pointer",
                borderRadius:7, border:"none", fontFamily:font, whiteSpace:"nowrap",
                background: filter===v ? C.blue : C.white,
                color:      filter===v ? "#fff" : C.muted,
                border:     filter===v ? "none" : `0.5px solid ${C.border}`,
              }}>{l}</button>
            ))}
          </div>

          {/* sort */}
          <div style={{ display:"flex", gap:5, marginBottom:14 }}>
            {[["smart","↕ Inteligente"],["cep","↕ Por CEP"]].map(([v,l]) => (
              <button key={v} onClick={() => setSort(v)} style={{
                flex:1, padding:"6px 0", fontSize:11, cursor:"pointer", fontFamily:font,
                borderRadius:7, border:`0.5px solid ${C.border}`,
                background: sort===v ? C.blueDim : C.white,
                color:      sort===v ? C.blue    : C.muted,
                fontWeight: sort===v ? 500 : 400,
              }}>{l}</button>
            ))}
          </div>

          {listaTodos.length===0 && stores.length===0 && (
            <div style={{ textAlign:"center", padding:"4rem 1rem" }}>
              <div style={{ fontSize:48, marginBottom:14 }}>📍</div>
              <h2 style={{ margin:"0 0 8px", fontSize:18, fontWeight:500, color:C.text }}>Nenhum PDV ainda</h2>
              <p style={{ margin:0, color:C.muted, fontSize:14 }}>Toque em <strong>+ PDV</strong> para adicionar.</p>
            </div>
          )}
          {listaTodos.length===0 && stores.length>0 && (
            <p style={{ textAlign:"center", color:C.muted, fontSize:14, padding:"2rem 0" }}>Nenhum PDV encontrado.</p>
          )}
          {listaTodos.map(s => <PdvCardLight key={s.id} s={s} {...cardProps} />)}
        </div>
      )}

      {/* ── Aba: Rotas ── */}
      {aba === "rotas" && (
        <div style={s.pad}>
          {rotaAtivaObj && (
            <HeroBanner
              label="Rota ativa hoje"
              name={`📍 ${rotaAtivaObj.nome}`}
              sub={`${pdvsRotaAtiva.length} PDVs · ${visitadosRota} visitados`}
              pct={totalRota>0 ? Math.round((visitadosRota/totalRota)*100) : 0}
              num={visitadosRota}
              total={totalRota}
            />
          )}
          <div>
            {rotas.length === 0 ? (
              <p style={{ textAlign:"center", color:C.muted, fontSize:14, padding:"3rem 0" }}>Nenhuma rota cadastrada.</p>
            ) : rotas.map(r => {
              const qtd      = stores.filter(s => s.rotaId === r.id).length;
              const isActive = rotaAtiva === r.id;
              return (
                <div key={r.id} style={{
                  background:C.white, borderRadius:R.lg, padding:"13px 14px",
                  border:`0.5px solid ${isActive ? C.blue : C.border}`, marginBottom:10,
                  display:"flex", justifyContent:"space-between", alignItems:"center",
                }}>
                  <div>
                    <p style={{ margin:"0 0 2px", fontSize:15, fontWeight:500, color:C.text }}>📍 {r.nome}</p>
                    <p style={{ margin:0, fontSize:12, color:C.muted }}>{qtd} PDV{qtd!==1?"s":""}</p>
                  </div>
                  {isActive && <Badge variant="blue">Ativa hoje</Badge>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Aba: Consig ── */}
      {aba === "consig" && (() => {
        const consignados = stores.filter(s => s.consignado);
        return (
          <div style={s.pad}>
            <HeroBanner
              label="Displays consignados"
              name="📦 Em campo"
              sub={`PDV${consignados.length!==1?"s":""} com display deixado`}
              num={consignados.length}
              total={0}
              bgColor={C.purple}
            />
            {consignados.length === 0 ? (
              <div style={{ textAlign:"center", padding:"4rem 1rem" }}>
                <div style={{ fontSize:48, marginBottom:14 }}>📦</div>
                <h2 style={{ margin:"0 0 8px", fontSize:18, fontWeight:500, color:C.text }}>Nenhum consignado</h2>
                <p style={{ margin:0, color:C.muted, fontSize:14 }}>Toque em 📦 em qualquer PDV para marcar.</p>
              </div>
            ) : consignados.map(s => <PdvCardLight key={s.id} s={s} {...cardProps} />)}
          </div>
        );
      })()}

      <BottomNav aba={aba} setAba={v => { setAba(v); setShowAdd(false); }} tabs={TABS} />
    </div>
  );
}
