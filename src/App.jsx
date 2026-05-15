import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { createClient } from "@supabase/supabase-js";

const MapTab = lazy(() => import("./MapTab"));

const SUPABASE_URL = "https://hmznqqjibxhjkmwizxyn.supabase.co";
const SUPABASE_KEY = "sb_publishable_aFMJ6mg_mVp88E3KzzQYdA_cPA7J5hx";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const C = {
  bg:"#0e0e0e", surface:"#1a1a1a", surface2:"#222", border:"#2e2e2e",
  yellow:"#f5c800", green:"#22c55e", amber:"#f59e0b", red:"#ef4444",
  white:"#f0f0f0", gray:"#777", grayDim:"#3a3a3a",
};

const TODAY = new Date().toISOString().split("T")[0];

const daysSince = d => !d ? null : Math.floor((new Date(TODAY) - new Date(d)) / 86400000);
const visitStatus = d => { if (!d) return "nunca"; const n = daysSince(d); if (n===0) return "ok"; if (n<=14) return "recente"; return "atrasado"; };
const fmtDate = d => !d ? null : new Date(d+"T12:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"2-digit"});
const fmtCep = v => { const d=v.replace(/\D/g,"").slice(0,8); return d.length>5?d.slice(0,5)+"-"+d.slice(5):d; };

const geocode = async (address) => {
  try {
    const q = encodeURIComponent(address + ", Brasil");
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
      { headers: { "User-Agent": "dot-rep-crm/3.0" } }
    );
    const data = await res.json();
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {}
  return null;
};

const fromDB = r => ({
  id:r.id, nome:r.nome, end:r.endereco||"", cep:r.cep||"", tipo:r.tipo||"facu",
  prio:r.prioridade||0, vendeu:r.vendeu_dot||false, visita:r.ultima_visita||null,
  obs:r.obs||"", rotaId:r.rota_id||null,
  contato_nome:r.contato_nome||"", contato_tel:r.contato_tel||"",
  lat:r.lat||null, lng:r.lng||null,
});

const TIPO_LABEL = { facu:"Faculdade", corp:"Corporativo", armazem:"Armazém", bar:"Bar / Rest.", outro:"Outro" };
const TIPOS = Object.keys(TIPO_LABEL);

const STATUS = {
  ok:{ label:"HOJE", color:"#22c55e", dot:"#22c55e" },
  recente:{ label:"RECENTE", color:"#f59e0b", dot:"#f59e0b" },
  atrasado:{ label:"ATRASADO", color:"#ef4444", dot:"#ef4444" },
  nunca:{ label:"SEM VISITA", color:"#3a3a3a", dot:"#3a3a3a" },
};

const ipt = {
  width:"100%", boxSizing:"border-box",
  background:"#222", border:"1px solid #2e2e2e", borderRadius:8,
  padding:"11px 13px", fontSize:14, color:"#f0f0f0",
  fontFamily:"inherit", outline:"none",
};
const iptErr = { ...ipt, border:"1px solid #ef444488" };

function Btn({ variant="default", style={}, ...props }) {
  const base = { cursor:"pointer", borderRadius:8, fontSize:13, fontWeight:600, letterSpacing:"0.03em", border:"none", fontFamily:"inherit" };
  const variants = {
    yellow:{ background:"#f5c800", color:"#000" },
    ghost:{ background:"transparent", border:"1px solid #2e2e2e", color:"#777" },
    green:{ background:"#14532d", color:"#22c55e", border:"1px solid #22c55e33" },
    danger:{ background:"transparent", border:"1px solid #ef444455", color:"#ef4444" },
    default:{ background:"#222", border:"1px solid #2e2e2e", color:"#f0f0f0" },
  };
  return <button style={{ ...base, ...variants[variant], ...style }} {...props} />;
}

function FormPDV({ initial, onSave, onCancel, saving, rotas }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const set = (k,v) => { setForm(f=>({...f,[k]:v})); setErrors(e=>({...e,[k]:false})); };
  const validar = () => {
    const e = {};
    if (!form.nome.trim()) e.nome = true;
    if (!form.end.trim())  e.end  = true;
    setErrors(e); return Object.keys(e).length === 0;
  };
  const submit = () => { if (validar()) onSave(form); };
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
      <div>
        <input placeholder="Nome do estabelecimento *" value={form.nome} onChange={e=>set("nome",e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} style={errors.nome?iptErr:ipt} autoFocus />
        {errors.nome&&<p style={{fontSize:11,color:C.red,margin:"3px 0 0"}}>Nome obrigatório</p>}
      </div>
      <div>
        <input placeholder="Endereço *" value={form.end} onChange={e=>set("end",e.target.value)} style={errors.end?iptErr:ipt} />
        {errors.end&&<p style={{fontSize:11,color:C.red,margin:"3px 0 0"}}>Endereço obrigatório</p>}
      </div>
      <input placeholder="CEP (ex: 01310-100)" value={form.cep} onChange={e=>set("cep",fmtCep(e.target.value))} style={ipt} inputMode="numeric" />
      <input placeholder="Nome do contato" value={form.contato_nome} onChange={e=>set("contato_nome",e.target.value)} style={ipt} />
      <input placeholder="Telefone (ex: 11 99999-9999)" value={form.contato_tel} onChange={e=>set("contato_tel",e.target.value)} style={ipt} inputMode="tel" />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9 }}>
        <select value={form.tipo} onChange={e=>set("tipo",e.target.value)} style={{...ipt,padding:"11px 10px"}}>
          {TIPOS.map(t=><option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
        </select>
        <Btn variant={form.prio===1?"yellow":"ghost"} style={{padding:"11px 0"}} onClick={()=>set("prio",form.prio===1?0:1)}>
          {form.prio===1?"⭐ Prior.":"☆ Prior."}
        </Btn>
      </div>
      <select value={form.rotaId||""} onChange={e=>set("rotaId",e.target.value||null)} style={{...ipt,padding:"11px 10px"}}>
        <option value="">Sem rota</option>
        {rotas.map(r=><option key={r.id} value={r.id}>📍 {r.nome}</option>)}
      </select>
      <div style={{ display:"flex", gap:8 }}>
        <Btn variant={form.nome.trim()&&form.end.trim()&&!saving?"yellow":"ghost"} style={{flex:1,padding:"12px 0",fontSize:14,opacity:form.nome.trim()&&form.end.trim()?1:0.4}} onClick={submit}>
          {saving?"Salvando…":"Salvar"}
        </Btn>
        {onCancel&&<Btn variant="ghost" style={{padding:"12px 14px"}} onClick={onCancel}>Cancelar</Btn>}
      </div>
    </div>
  );
}

function PdvCard({ s, rotas, expanded, editing, flash, confirmDel, obs, historico, onExpand, setEditing, setConfirmDel, setObs, marcar, atualizar, editar, remover, saveObs, saving }) {
  const vs = visitStatus(s.visita), cfg = STATUS[vs], days = s.visita?daysSince(s.visita):null;
  const isExp=expanded===s.id, isEdit=editing===s.id, isFlash=flash===s.id, isDel=confirmDel===s.id, isOk=vs==="ok";
  const obsVal = obs[s.id]!==undefined?obs[s.id]:(s.obs||"");
  const cepFmt = s.cep?s.cep.slice(0,5)+(s.cep.length>5?"-"+s.cep.slice(5):""):null;
  const rota = rotas.find(r=>r.id===s.rotaId);
  const hdHist = historico?.[s.id]; // undefined | null (loading) | Visit[]

  return (
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderLeft:`3px solid ${s.prio===1?C.yellow:C.border}`, borderRadius:12, overflow:"hidden" }}>
      <div style={{ padding:"13px 14px 0" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4 }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:cfg.dot, flexShrink:0 }} />
              <span style={{ fontSize:15, fontWeight:600, color:C.white, lineHeight:1.3, wordBreak:"break-word" }}>{s.nome}</span>
            </div>
            <p style={{ margin:"0 0 5px", fontSize:12, color:C.gray, paddingLeft:14 }}>
              {s.end}{cepFmt?<span style={{color:C.grayDim}}> · {cepFmt}</span>:""}
            </p>
            <div style={{ display:"flex", gap:5, flexWrap:"wrap", paddingLeft:14 }}>
              <span style={{ fontSize:11, padding:"2px 7px", borderRadius:99, background:C.surface2, color:C.gray }}>{TIPO_LABEL[s.tipo]}</span>
              {rota&&<span style={{ fontSize:11, padding:"2px 7px", borderRadius:99, background:"#f5c80022", color:C.yellow }}>📍 {rota.nome}</span>}
              {s.prio===1&&<span style={{ fontSize:11, padding:"2px 7px", borderRadius:99, background:"#f5c80022", color:C.yellow }}>Prioritário</span>}
              {s.vendeu&&<span style={{ fontSize:11, padding:"2px 7px", borderRadius:99, background:"#22c55e22", color:C.green }}>Vende Dot</span>}
            </div>
            {(s.contato_nome||s.contato_tel)&&(
              <div style={{ paddingLeft:14, marginTop:5, display:"flex", gap:10, flexWrap:"wrap" }}>
                {s.contato_nome&&<span style={{ fontSize:11, color:C.gray }}>👤 {s.contato_nome}</span>}
                {s.contato_tel&&(
                  <a href={`tel:${s.contato_tel}`} style={{ fontSize:11, color:C.yellow, textDecoration:"none" }}>📞 {s.contato_tel}</a>
                )}
              </div>
            )}
          </div>
          <div style={{ textAlign:"right", flexShrink:0 }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.08em", color:cfg.color, marginBottom:2 }}>{cfg.label}</div>
            <div style={{ fontSize:11, color:C.gray, fontFamily:"monospace" }}>{isOk?fmtDate(s.visita):days!==null?`${days}d atrás`:"—"}</div>
          </div>
        </div>
      </div>
      <div style={{ display:"flex", gap:6, padding:"10px 14px" }}>
        <Btn variant={isFlash||isOk?"green":"yellow"} style={{flex:1,padding:"11px 0",cursor:isOk?"default":"pointer",opacity:isOk?0.65:1}} onClick={()=>!isOk&&marcar(s.id)}>
          {isFlash?"✓ Registrado!":isOk?"✓ Visitado hoje":"Marcar visita"}
        </Btn>
        <Btn variant={s.vendeu?"green":"ghost"} style={{padding:"11px 10px",fontSize:12}} onClick={()=>atualizar(s.id,{vendeu_dot:!s.vendeu})}>
          {s.vendeu?"Dot ✓":"+ Dot"}
        </Btn>
        <Btn variant={isExp?"default":"ghost"} style={{padding:"11px 10px",fontSize:13}} onClick={()=>{onExpand(isExp?null:s.id);setEditing(null);setConfirmDel(null);}}>
          {isExp?"▲":"▼"}
        </Btn>
      </div>
      {isExp&&(
        <div style={{ padding:"12px 14px 14px", borderTop:`1px solid ${C.border}` }}>
          {isEdit?(
            <div>
              <div style={{ fontSize:10, color:C.yellow, letterSpacing:"0.1em", fontWeight:700, marginBottom:12 }}>EDITAR PDV</div>
              <FormPDV
                initial={{ nome:s.nome, end:s.end, cep:cepFmt||"", tipo:s.tipo, prio:s.prio, rotaId:s.rotaId, contato_nome:s.contato_nome||"", contato_tel:s.contato_tel||"" }}
                onSave={(form)=>editar(s.id,form)} onCancel={()=>setEditing(null)} saving={saving} rotas={rotas}
              />
            </div>
          ):(
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div>
                <div style={{ fontSize:10, color:C.gray, letterSpacing:"0.08em", marginBottom:5 }}>OBSERVAÇÕES</div>
                <textarea rows={2} value={obsVal} placeholder="Anotação sobre o PDV…" onChange={e=>setObs(p=>({...p,[s.id]:e.target.value}))} onBlur={()=>saveObs(s.id)} style={{...ipt,resize:"none",fontSize:13}} />
              </div>

              {/* Histórico */}
              <div>
                <div style={{ fontSize:10, color:C.gray, letterSpacing:"0.08em", marginBottom:6 }}>HISTÓRICO DE VISITAS</div>
                {hdHist===null&&<div style={{ fontSize:12, color:C.grayDim }}>Carregando…</div>}
                {hdHist===undefined&&<div style={{ fontSize:12, color:C.grayDim }}>—</div>}
                {Array.isArray(hdHist)&&hdHist.length===0&&<div style={{ fontSize:12, color:C.grayDim }}>Nenhuma visita registrada ainda.</div>}
                {Array.isArray(hdHist)&&hdHist.length>0&&(
                  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                    {hdHist.slice(0,8).map(v=>(
                      <div key={v.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
                        <span style={{ fontSize:12, color:C.green, fontFamily:"monospace" }}>✓ {fmtDate(v.data)}</span>
                        {v.obs&&<span style={{ fontSize:11, color:C.gray, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1, textAlign:"right" }}>{v.obs}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display:"flex", gap:6 }}>
                <Btn variant="default" style={{flex:1,padding:"9px 0",fontSize:12}} onClick={()=>setEditing(s.id)}>✏️ Editar dados</Btn>
                {isDel?(
                  <><Btn variant="danger" style={{flex:1,padding:"9px 0",fontSize:12}} onClick={()=>remover(s.id)}>Confirmar</Btn><Btn variant="ghost" style={{padding:"9px 12px",fontSize:12}} onClick={()=>setConfirmDel(null)}>Não</Btn></>
                ):(
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

export default function App() {
  const [stores, setStores]   = useState(null);
  const [rotas, setRotas]     = useState([]);
  const [rotaAtiva, setRotaAtiva] = useState(null);
  const [erro, setErro]       = useState(null);
  const [aba, setAba]         = useState("hoje");
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState("todos");
  const [sort, setSort]       = useState("smart");
  const [expanded, setExpanded] = useState(null);
  const [editing, setEditing] = useState(null);
  const [flash, setFlash]     = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [obs, setObs]         = useState({});
  const [historico, setHistorico] = useState({});
  const [novaRota, setNovaRota] = useState("");
  const [editRota, setEditRota] = useState(null);
  const [confirmDelRota, setConfirmDelRota] = useState(null);

  const carregar = useCallback(async () => {
    const [pdvs, rts, ativa] = await Promise.all([
      supabase.from("pdvs").select("*").order("criado_em", { ascending:true }),
      supabase.from("rotas").select("*").order("nome", { ascending:true }),
      supabase.from("rota_ativa").select("*").eq("id",1).single(),
    ]);
    if (pdvs.error) { setErro(pdvs.error.message); return; }
    setStores((pdvs.data||[]).map(fromDB));
    setRotas(rts.data||[]);
    setRotaAtiva(ativa.data?.rota_id||null);
  }, []);

  useEffect(() => {
    carregar();
    const ch = supabase.channel("all-changes")
      .on("postgres_changes", { event:"*", schema:"public", table:"pdvs" }, ()=>carregar())
      .on("postgres_changes", { event:"*", schema:"public", table:"rotas" }, ()=>carregar())
      .on("postgres_changes", { event:"*", schema:"public", table:"rota_ativa" }, ()=>carregar())
      .subscribe();
    return ()=>supabase.removeChannel(ch);
  }, [carregar]);

  const loadHistorico = useCallback(async (id) => {
    if (!id) return;
    setHistorico(p => ({ ...p, [id]: null }));
    const { data } = await supabase.from("visitas").select("*").eq("pdv_id", id).order("data", { ascending:false }).limit(10);
    setHistorico(p => ({ ...p, [id]: data || [] }));
  }, []);

  const handleExpand = useCallback((id) => {
    setExpanded(id);
    if (id) loadHistorico(id);
  }, [loadHistorico]);

  const adicionar = useCallback(async (form) => {
    setSaving(true);
    const rotaFinal = form.rotaId || (aba==="hoje"&&rotaAtiva?rotaAtiva:null);
    const coords = await geocode(form.end.trim());
    const { error } = await supabase.from("pdvs").insert([{
      id: Date.now().toString(),
      nome: form.nome.trim(), endereco: form.end.trim(),
      cep: form.cep.replace(/\D/g,""), tipo: form.tipo,
      prioridade: form.prio, vendeu_dot: false,
      ultima_visita: null, obs: "", rota_id: rotaFinal,
      contato_nome: form.contato_nome?.trim()||"",
      contato_tel: form.contato_tel?.trim()||"",
      lat: coords?.lat||null, lng: coords?.lng||null,
    }]);
    if (error) setErro(error.message); else setShowAdd(false);
    setSaving(false);
  }, [aba, rotaAtiva]);

  const editar = useCallback(async (id, form) => {
    setSaving(true);
    const coords = await geocode(form.end.trim());
    const update = {
      nome: form.nome.trim(), endereco: form.end.trim(),
      cep: form.cep.replace(/\D/g,""), tipo: form.tipo,
      prioridade: form.prio, rota_id: form.rotaId,
      contato_nome: form.contato_nome?.trim()||"",
      contato_tel: form.contato_tel?.trim()||"",
    };
    if (coords) { update.lat = coords.lat; update.lng = coords.lng; }
    const { error } = await supabase.from("pdvs").update(update).eq("id", id);
    if (error) setErro(error.message); else setEditing(null);
    setSaving(false);
  }, []);

  const atualizar = useCallback(async (id, campos) => {
    const { error } = await supabase.from("pdvs").update(campos).eq("id", id);
    if (error) setErro(error.message);
  }, []);

  const marcar = useCallback(async (id) => {
    await Promise.all([
      atualizar(id, { ultima_visita: TODAY }),
      supabase.from("visitas").insert([{ id: Date.now().toString(), pdv_id: id, data: TODAY, obs: "" }]),
    ]);
    setHistorico(p => ({ ...p, [id]: undefined }));
    loadHistorico(id);
    setFlash(id);
    setTimeout(() => setFlash(null), 2000);
  }, [atualizar, loadHistorico]);

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
    if (rotaAtiva === id) await supabase.from("rota_ativa").update({ rota_id:null }).eq("id", 1);
    const { error } = await supabase.from("rotas").delete().eq("id", id);
    if (error) setErro(error.message); else setConfirmDelRota(null);
  }, [rotaAtiva]);

  const ativarRota = useCallback(async (id) => {
    const { error } = await supabase.from("rota_ativa").update({ rota_id:id, ativada_em:new Date().toISOString() }).eq("id", 1);
    if (error) setErro(error.message);
  }, []);

  if (!stores) return (
    <div style={{ background:C.bg, color:C.gray, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12, fontFamily:"system-ui" }}>
      <div style={{ width:32, height:32, border:`3px solid ${C.border}`, borderTopColor:C.yellow, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <span style={{ fontSize:13 }}>Conectando…</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (erro) return (
    <div style={{ background:C.bg, color:C.red, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12, padding:"2rem", textAlign:"center", fontFamily:"system-ui" }}>
      <div style={{ fontSize:32 }}>⚠️</div>
      <div style={{ fontSize:14, lineHeight:1.6 }}>{erro}</div>
      <Btn variant="ghost" style={{ padding:"10px 20px" }} onClick={()=>{ setErro(null); carregar(); }}>Tentar novamente</Btn>
    </div>
  );

  const ORDER = { nunca:0, atrasado:1, recente:2, ok:3 };
  const rotaAtivaObj = rotas.find(r=>r.id===rotaAtiva);
  const pdvsRotaAtiva = stores.filter(s=>s.rotaId===rotaAtiva);
  const totalRota = pdvsRotaAtiva.length;
  const visitadosRota = pdvsRotaAtiva.filter(s=>daysSince(s.visita)===0).length;

  const listaTodos = stores
    .filter(s => {
      const q=search.toLowerCase(), m=!q||s.nome.toLowerCase().includes(q)||(s.end||"").toLowerCase().includes(q)||(s.cep||"").includes(q);
      if(filter==="prio") return m&&s.prio===1;
      if(filter==="pendentes") return m&&daysSince(s.visita)!==0;
      if(filter==="hoje") return m&&daysSince(s.visita)===0;
      return m;
    })
    .sort((a,b)=>sort==="cep"?(a.cep||"").replace(/\D/g,"").localeCompare((b.cep||"").replace(/\D/g,""))
      :b.prio-a.prio||ORDER[visitStatus(a.visita)]-ORDER[visitStatus(b.visita)]);

  const listaHoje = pdvsRotaAtiva
    .slice()
    .sort((a,b)=>ORDER[visitStatus(a.visita)]-ORDER[visitStatus(b.visita)] || (a.cep||"").localeCompare(b.cep||""));

  const cardProps = { rotas, expanded, editing, flash, confirmDel, obs, historico, onExpand:handleExpand, setEditing, setConfirmDel, setObs, marcar, atualizar, editar, remover, saveObs, saving };

  return (
    <div style={{ fontFamily:"'SF Pro Display',-apple-system,BlinkMacSystemFont,sans-serif", background:C.bg, color:C.white, minHeight:"100vh", maxWidth:440, margin:"0 auto", paddingBottom:"2rem" }}>

      {/* HEADER */}
      <div style={{ padding:"1.5rem 1rem 0", borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:5 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:C.yellow }} />
              <span style={{ fontSize:11, color:C.yellow, letterSpacing:"0.12em", textTransform:"uppercase", fontWeight:700 }}>Dot Energy</span>
            </div>
            <h1 style={{ margin:0, fontSize:26, fontWeight:700, letterSpacing:"-0.02em", color:C.white }}>Rota PDV</h1>
          </div>
          {aba!=="rotas"&&aba!=="mapa"&&(
            <Btn variant={showAdd?"danger":"yellow"} style={{padding:"9px 16px"}} onClick={()=>{setShowAdd(v=>!v);setEditing(null);}}>
              {showAdd?"✕ Cancelar":"+ Novo PDV"}
            </Btn>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:0, marginTop:8 }}>
          {[["hoje","🎯 Hoje"],["todos","📋 Todos"],["rotas","📍 Rotas"],["mapa","🗺 Mapa"]].map(([v,l])=>(
            <button key={v} onClick={()=>{setAba(v);setShowAdd(false);}} style={{
              flex:1, padding:"11px 0", fontSize:12, fontWeight:600, cursor:"pointer",
              background:"transparent", border:"none", fontFamily:"inherit",
              color:aba===v?C.yellow:C.gray,
              borderBottom:aba===v?`2px solid ${C.yellow}`:"2px solid transparent",
              marginBottom:-1,
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* ── ABA HOJE ── */}
      {aba==="hoje"&&(
        <>
          {!rotaAtiva ? (
            <div style={{ padding:"2.5rem 1.25rem", textAlign:"center" }}>
              <div style={{ fontSize:44, marginBottom:14 }}>🎯</div>
              <div style={{ fontSize:17, fontWeight:700, color:C.white, marginBottom:8 }}>Nenhuma rota ativa</div>
              <div style={{ fontSize:13, color:C.gray, lineHeight:1.6, marginBottom:20 }}>
                Vai pra aba <span style={{color:C.yellow,fontWeight:600}}>📍 Rotas</span> e ativa qual rota o representante vai cobrir hoje.
              </div>
              <Btn variant="yellow" style={{ padding:"11px 24px" }} onClick={()=>setAba("rotas")}>Ir para Rotas</Btn>
            </div>
          ) : (
            <>
              <div style={{ margin:"1rem", padding:"14px 16px", background:`linear-gradient(135deg, #f5c80018, #f5c80008)`, border:`1px solid #f5c80055`, borderRadius:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:10, color:C.yellow, letterSpacing:"0.1em", fontWeight:700, marginBottom:3 }}>ROTA ATIVA</div>
                    <div style={{ fontSize:18, fontWeight:700, color:C.white }}>📍 {rotaAtivaObj?.nome||"—"}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:22, fontWeight:700, color:visitadosRota===totalRota&&totalRota>0?C.green:C.yellow, fontVariantNumeric:"tabular-nums" }}>
                      {visitadosRota}/{totalRota}
                    </div>
                    <div style={{ fontSize:10, color:C.gray, letterSpacing:"0.05em" }}>VISITADOS</div>
                  </div>
                </div>
                {totalRota>0&&(
                  <div style={{ marginTop:10, height:4, background:C.surface2, borderRadius:99, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${(visitadosRota/totalRota)*100}%`, background:C.yellow, transition:"width 0.4s" }} />
                  </div>
                )}
              </div>

              {showAdd&&(
                <div style={{ margin:"0 1rem 1rem", padding:"1.25rem", background:C.surface, border:`1px solid ${C.border}`, borderRadius:12 }}>
                  <div style={{ fontSize:10, color:C.yellow, letterSpacing:"0.12em", fontWeight:700, marginBottom:14 }}>NOVO PDV {rotaAtivaObj?`· ROTA ${rotaAtivaObj.nome.toUpperCase()}`:""}</div>
                  <FormPDV initial={{ nome:"", end:"", cep:"", tipo:"facu", prio:0, rotaId:rotaAtiva, contato_nome:"", contato_tel:"" }} onSave={adicionar} onCancel={()=>setShowAdd(false)} saving={saving} rotas={rotas} />
                </div>
              )}

              <div style={{ padding:"0 1rem", display:"flex", flexDirection:"column", gap:8 }}>
                {listaHoje.length===0?(
                  <div style={{ textAlign:"center", padding:"3rem 1rem" }}>
                    <div style={{ fontSize:36, marginBottom:10 }}>📍</div>
                    <div style={{ fontSize:14, color:C.gray, lineHeight:1.6 }}>Nenhum PDV nesta rota ainda.<br/>Toque em <span style={{color:C.yellow,fontWeight:600}}>+ Novo PDV</span> para adicionar.</div>
                  </div>
                ):(
                  listaHoje.map(s=><PdvCard key={s.id} s={s} {...cardProps} />)
                )}
              </div>

              {totalRota>0&&visitadosRota===totalRota&&(
                <div style={{ margin:"1.25rem 1rem 0", padding:"14px", background:`${C.green}15`, border:`1px solid ${C.green}55`, borderRadius:10, textAlign:"center" }}>
                  <span style={{ fontSize:13, color:C.green, fontWeight:600 }}>🎉 ROTA COMPLETA — todos os PDVs visitados!</span>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── ABA TODOS ── */}
      {aba==="todos"&&(
        <>
          {showAdd&&(
            <div style={{ margin:"1rem", padding:"1.25rem", background:C.surface, border:`1px solid ${C.border}`, borderRadius:12 }}>
              <div style={{ fontSize:10, color:C.yellow, letterSpacing:"0.12em", fontWeight:700, marginBottom:14 }}>NOVO PONTO DE VENDA</div>
              <FormPDV initial={{ nome:"", end:"", cep:"", tipo:"facu", prio:0, rotaId:null, contato_nome:"", contato_tel:"" }} onSave={adicionar} onCancel={()=>setShowAdd(false)} saving={saving} rotas={rotas} />
            </div>
          )}

          <div style={{ padding:"1rem 1rem 0.75rem" }}>
            <input type="text" placeholder="Buscar por nome, endereço ou CEP…" value={search} onChange={e=>setSearch(e.target.value)} style={{...ipt,marginBottom:10}} />
            <div style={{ display:"flex", gap:6, marginBottom:8 }}>
              {[["todos","Todos"],["prio","⭐ Prior."],["pendentes","Pendentes"],["hoje","Hoje"]].map(([v,l])=>(
                <Btn key={v} variant={filter===v?"yellow":"ghost"} style={{flex:1,padding:"7px 0",fontSize:12}} onClick={()=>setFilter(v)}>{l}</Btn>
              ))}
            </div>
            <div style={{ display:"flex", gap:6 }}>
              <Btn variant={sort==="smart"?"default":"ghost"} style={{flex:1,padding:"6px 0",fontSize:11}} onClick={()=>setSort("smart")}>↕ Inteligente</Btn>
              <Btn variant={sort==="cep"?"yellow":"ghost"} style={{flex:1,padding:"6px 0",fontSize:11}} onClick={()=>setSort("cep")}>↕ Por CEP</Btn>
            </div>
          </div>

          <div style={{ padding:"0 1rem", display:"flex", flexDirection:"column", gap:8 }}>
            {listaTodos.length===0&&stores.length===0&&(
              <div style={{ textAlign:"center", padding:"4rem 1rem" }}>
                <div style={{ fontSize:44, marginBottom:12 }}>📍</div>
                <div style={{ fontSize:17, fontWeight:700, color:C.white, marginBottom:8 }}>Nenhum PDV cadastrado</div>
                <div style={{ fontSize:13, color:C.gray, lineHeight:1.7 }}>Toque em <span style={{color:C.yellow,fontWeight:600}}>+ Novo PDV</span> para começar.</div>
              </div>
            )}
            {listaTodos.length===0&&stores.length>0&&<div style={{ textAlign:"center", padding:"2rem 0", color:C.gray, fontSize:14 }}>Nenhum PDV encontrado.</div>}
            {listaTodos.map(s=><PdvCard key={s.id} s={s} {...cardProps} />)}
          </div>
        </>
      )}

      {/* ── ABA ROTAS ── */}
      {aba==="rotas"&&(
        <div style={{ padding:"1rem" }}>
          <div style={{ padding:"1.25rem", background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, marginBottom:14 }}>
            <div style={{ fontSize:10, color:C.yellow, letterSpacing:"0.12em", fontWeight:700, marginBottom:12 }}>NOVA ROTA</div>
            <div style={{ display:"flex", gap:8 }}>
              <input placeholder="Ex: Paulista, Itaim, Faria Lima…" value={novaRota} onChange={e=>setNovaRota(e.target.value)} onKeyDown={e=>e.key==="Enter"&&adicionarRota()} style={ipt} />
              <Btn variant={novaRota.trim()?"yellow":"ghost"} style={{padding:"11px 18px",opacity:novaRota.trim()?1:0.4}} onClick={adicionarRota}>+</Btn>
            </div>
            <p style={{ margin:"10px 0 0", fontSize:11, color:C.gray, lineHeight:1.5 }}>Crie regiões pra agrupar os PDVs. Depois ative uma rota e o representante verá apenas os pontos dela na aba <span style={{color:C.yellow}}>Hoje</span>.</p>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {rotas.length===0?(
              <div style={{ textAlign:"center", padding:"3rem 1rem", color:C.gray, fontSize:13 }}>Nenhuma rota criada ainda.</div>
            ):(
              rotas.map(r=>{
                const qtd = stores.filter(s=>s.rotaId===r.id).length;
                const isActive = rotaAtiva===r.id;
                const isEditingR = editRota?.id===r.id;
                const isDelR = confirmDelRota===r.id;
                return (
                  <div key={r.id} style={{
                    background:C.surface, border:`1px solid ${C.border}`,
                    borderLeft:`3px solid ${isActive?C.yellow:C.border}`,
                    borderRadius:12, padding:"14px"
                  }}>
                    {isEditingR?(
                      <div style={{ display:"flex", gap:6 }}>
                        <input value={editRota.nome} onChange={e=>setEditRota({...editRota,nome:e.target.value})} onKeyDown={e=>e.key==="Enter"&&renomearRota(r.id,editRota.nome)} style={ipt} autoFocus />
                        <Btn variant="yellow" style={{padding:"11px 14px",fontSize:12}} onClick={()=>renomearRota(r.id,editRota.nome)}>OK</Btn>
                        <Btn variant="ghost" style={{padding:"11px 12px",fontSize:12}} onClick={()=>setEditRota(null)}>✕</Btn>
                      </div>
                    ):(
                      <>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                          <div>
                            <div style={{ fontSize:16, fontWeight:600, color:C.white, marginBottom:2 }}>📍 {r.nome}</div>
                            <div style={{ fontSize:12, color:C.gray }}>{qtd} PDV{qtd!==1?"s":""}</div>
                          </div>
                          {isActive&&<span style={{ fontSize:10, fontWeight:700, padding:"4px 8px", borderRadius:99, background:`${C.yellow}22`, color:C.yellow, letterSpacing:"0.08em" }}>ATIVA HOJE</span>}
                        </div>
                        <div style={{ display:"flex", gap:6 }}>
                          {!isActive?(
                            <Btn variant="yellow" style={{flex:1,padding:"10px 0",fontSize:12}} onClick={()=>ativarRota(r.id)}>🎯 Ativar para hoje</Btn>
                          ):(
                            <Btn variant="green" style={{flex:1,padding:"10px 0",fontSize:12,opacity:0.8,cursor:"default"}}>✓ Em andamento</Btn>
                          )}
                          <Btn variant="ghost" style={{padding:"10px 12px",fontSize:12}} onClick={()=>setEditRota({id:r.id,nome:r.nome})}>✏️</Btn>
                          {isDelR?(
                            <>
                              <Btn variant="danger" style={{padding:"10px 0",fontSize:11,flex:1}} onClick={()=>removerRota(r.id)}>Confirmar</Btn>
                              <Btn variant="ghost" style={{padding:"10px 10px",fontSize:11}} onClick={()=>setConfirmDelRota(null)}>✕</Btn>
                            </>
                          ):(
                            <Btn variant="danger" style={{padding:"10px 12px",fontSize:12}} onClick={()=>setConfirmDelRota(r.id)}>🗑</Btn>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── ABA MAPA ── */}
      {aba==="mapa"&&(
        <Suspense fallback={
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"calc(100dvh - 130px)", color:C.gray, fontSize:13, gap:10 }}>
            <div style={{ width:20, height:20, border:`2px solid ${C.border}`, borderTopColor:C.yellow, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
            Carregando mapa…
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        }>
          <MapTab stores={stores} visitStatus={visitStatus} />
        </Suspense>
      )}
    </div>
  );
}
