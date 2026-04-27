import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://hmznqqjibxhjkmwizxyn.supabase.co";
const SUPABASE_KEY = "sb_publishable_aFMJ6mg_mVp88E3KzzQYdA_cPA7J5hx";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const C = {
  bg:      "#0b1854",
  surface: "#132272",
  surface2:"#1a2d8a",
  border:  "#2a3f9e",
  yellow:  "#f5c800",
  green:   "#22c55e",
  amber:   "#f59e0b",
  red:     "#ef4444",
  white:   "#f0f0dc",
  gray:    "#7a8fd4",
  grayDim: "#2a3f9e",
  cream:   "#f0f0dc",
};

const TODAY = new Date().toISOString().split("T")[0];

function daysSince(d) {
  if (!d) return null;
  return Math.floor((new Date(TODAY) - new Date(d)) / 86400000);
}
function visitStatus(d) {
  if (!d) return "nunca";
  const n = daysSince(d);
  if (n === 0) return "ok";
  if (n <= 14) return "recente";
  return "atrasado";
}
function fmtDate(d) {
  if (!d) return null;
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day:"2-digit", month:"2-digit", year:"2-digit" });
}
function fmtCep(v) {
  const digits = v.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? digits.slice(0,5) + "-" + digits.slice(5) : digits;
}

function fromDB(row) {
  return {
    id:     row.id,
    nome:   row.nome,
    end:    row.endereco      || "",
    cep:    row.cep           || "",
    tipo:   row.tipo          || "facu",
    prio:   row.prioridade    || 0,
    vendeu: row.vendeu_dot    || false,
    visita: row.ultima_visita || null,
    obs:    row.obs           || "",
  };
}

const TIPO_LABEL = { facu:"Faculdade", corp:"Corporativo", armazem:"Armazém", bar:"Bar / Rest.", outro:"Outro" };
const TIPOS = Object.keys(TIPO_LABEL);

const STATUS = {
  ok:       { label:"HOJE",       color:"#22c55e", dot:"#22c55e" },
  recente:  { label:"RECENTE",    color:"#f5c800", dot:"#f5c800" },
  atrasado: { label:"ATRASADO",   color:"#ef4444", dot:"#ef4444" },
  nunca:    { label:"SEM VISITA", color:"#2a3f9e", dot:"#2a3f9e" },
};

const ipt = {
  width:"100%", boxSizing:"border-box",
  background:"#1a2d8a", border:"1px solid #2a3f9e", borderRadius:8,
  padding:"11px 13px", fontSize:14, color:"#f0f0dc",
  fontFamily:"inherit", outline:"none",
};

const iptErr = { ...ipt, border:"1px solid #ef444488" };

function Btn({ variant="default", style={}, ...props }) {
  const base = { cursor:"pointer", borderRadius:8, fontSize:13, fontWeight:700, letterSpacing:"0.03em", border:"none", fontFamily:"inherit" };
  const variants = {
    yellow:  { background:"#f5c800", color:"#0b1854" },
    ghost:   { background:"transparent", border:"1px solid #2a3f9e", color:"#7a8fd4" },
    green:   { background:"#14532d", color:"#22c55e", border:"1px solid #22c55e33" },
    danger:  { background:"transparent", border:"1px solid #ef444455", color:"#ef4444" },
    default: { background:"#1a2d8a", border:"1px solid #2a3f9e", color:"#f0f0dc" },
  };
  return <button style={{ ...base, ...variants[variant], ...style }} {...props} />;
}

function FormPDV({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const set = (k, v) => { setForm(f => ({...f, [k]:v})); setErrors(e => ({...e, [k]:false})); };
  const validar = () => {
    const e = {};
    if (!form.nome.trim()) e.nome = true;
    if (!form.end.trim())  e.end  = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const submit = () => { if (validar()) onSave(form); };
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
      <div>
        <input placeholder="Nome do estabelecimento *" value={form.nome} onChange={e => set("nome", e.target.value)} onKeyDown={e => e.key==="Enter" && submit()} style={errors.nome ? iptErr : ipt} autoFocus />
        {errors.nome && <p style={{fontSize:11,color:C.red,margin:"3px 0 0"}}>Nome obrigatório</p>}
      </div>
      <div>
        <input placeholder="Endereço *" value={form.end} onChange={e => set("end", e.target.value)} style={errors.end ? iptErr : ipt} />
        {errors.end && <p style={{fontSize:11,color:C.red,margin:"3px 0 0"}}>Endereço obrigatório</p>}
      </div>
      <input placeholder="CEP (ex: 01310-100)" value={form.cep} onChange={e => set("cep", fmtCep(e.target.value))} style={ipt} inputMode="numeric" />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9 }}>
        <select value={form.tipo} onChange={e => set("tipo", e.target.value)} style={{...ipt,padding:"11px 10px"}}>
          {TIPOS.map(t => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
        </select>
        <Btn variant={form.prio===1?"yellow":"ghost"} style={{padding:"11px 0"}} onClick={() => set("prio", form.prio===1?0:1)}>
          {form.prio===1?"⭐ Prior.":"☆ Prior."}
        </Btn>
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <Btn variant={form.nome.trim()&&form.end.trim()&&!saving?"yellow":"ghost"} style={{flex:1,padding:"12px 0",fontSize:14,opacity:form.nome.trim()&&form.end.trim()?1:0.4}} onClick={submit}>
          {saving?"Salvando…":"Salvar"}
        </Btn>
        {onCancel && <Btn variant="ghost" style={{padding:"12px 14px"}} onClick={onCancel}>Cancelar</Btn>}
      </div>
    </div>
  );
}

export default function App() {
  const [stores, setStores]         = useState(null);
  const [erro, setErro]             = useState(null);
  const [search, setSearch]         = useState("");
  const [filter, setFilter]         = useState("todos");
  const [sort, setSort]             = useState("smart");
  const [expanded, setExpanded]     = useState(null);
  const [editing, setEditing]       = useState(null);
  const [flash, setFlash]           = useState(null);
  const [showAdd, setShowAdd]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [obs, setObs]               = useState({});
  const EMPTY_FORM = { nome:"", end:"", cep:"", tipo:"facu", prio:0 };

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from("pdvs").select("*").order("criado_em", { ascending: true });
    if (error) { setErro(error.message); return; }
    setStores((data || []).map(fromDB));
  }, []);

  useEffect(() => {
    carregar();
    const channel = supabase.channel("pdvs-changes")
      .on("postgres_changes", { event:"*", schema:"public", table:"pdvs" }, () => carregar())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [carregar]);

  const adicionar = useCallback(async (form) => {
    setSaving(true);
    const { error } = await supabase.from("pdvs").insert([{ id:Date.now().toString(), nome:form.nome.trim(), endereco:form.end.trim(), cep:form.cep.replace(/\D/g,""), tipo:form.tipo, prioridade:form.prio, vendeu_dot:false, ultima_visita:null, obs:"" }]);
    if (error) setErro(error.message); else setShowAdd(false);
    setSaving(false);
  }, []);

  const editar = useCallback(async (id, form) => {
    setSaving(true);
    const { error } = await supabase.from("pdvs").update({ nome:form.nome.trim(), endereco:form.end.trim(), cep:form.cep.replace(/\D/g,""), tipo:form.tipo, prioridade:form.prio }).eq("id", id);
    if (error) setErro(error.message); else setEditing(null);
    setSaving(false);
  }, []);

  const atualizar = useCallback(async (id, campos) => {
    const { error } = await supabase.from("pdvs").update(campos).eq("id", id);
    if (error) setErro(error.message);
  }, []);

  const marcar = useCallback(async (id) => {
    await atualizar(id, { ultima_visita: TODAY });
    setFlash(id); setTimeout(() => setFlash(null), 2000);
  }, [atualizar]);

  const saveObs = useCallback(async (id) => {
    if (obs[id] !== undefined) {
      await atualizar(id, { obs: obs[id] });
      setObs(p => { const n={...p}; delete n[id]; return n; });
    }
  }, [obs, atualizar]);

  const remover = useCallback(async (id) => {
    const { error } = await supabase.from("pdvs").delete().eq("id", id);
    if (error) setErro(error.message); else { setExpanded(null); setConfirmDel(null); }
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
      <Btn variant="ghost" style={{ padding:"10px 20px" }} onClick={() => { setErro(null); carregar(); }}>Tentar novamente</Btn>
    </div>
  );

  const total=stores.length, hoje=stores.filter(s=>daysSince(s.visita)===0).length, pend=stores.filter(s=>daysSince(s.visita)!==0).length;
  const ORDER={nunca:0,atrasado:1,recente:2,ok:3};

  const lista = stores
    .filter(s => {
      const q=search.toLowerCase(), m=!q||s.nome.toLowerCase().includes(q)||(s.end||"").toLowerCase().includes(q)||(s.cep||"").includes(q);
      if(filter==="prio") return m&&s.prio===1;
      if(filter==="pendentes") return m&&daysSince(s.visita)!==0;
      if(filter==="hoje") return m&&daysSince(s.visita)===0;
      return m;
    })
    .sort((a,b) => sort==="cep" ? (a.cep||"").replace(/\D/g,"").localeCompare((b.cep||"").replace(/\D/g,"")) : b.prio-a.prio||ORDER[visitStatus(a.visita)]-ORDER[visitStatus(b.visita)]);

  return (
    <div style={{ fontFamily:"'SF Pro Display',-apple-system,BlinkMacSystemFont,sans-serif", background:C.bg, color:C.white, minHeight:"100vh", maxWidth:440, margin:"0 auto", paddingBottom:"2rem" }}>

      {/* HEADER */}
      <div style={{ padding:"1.5rem 1rem 1rem", borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:5 }}>
              <span style={{ fontSize:16 }}>⚡</span>
              <span style={{ fontSize:11, color:C.yellow, letterSpacing:"0.12em", textTransform:"uppercase", fontWeight:700 }}>Dot Energy</span>
            </div>
            <h1 style={{ margin:0, fontSize:26, fontWeight:700, letterSpacing:"-0.02em", color:C.cream }}>Rota PDV</h1>
          </div>
          <Btn variant={showAdd?"danger":"yellow"} style={{padding:"9px 16px"}} onClick={()=>{setShowAdd(v=>!v);setEditing(null);}}>
            {showAdd?"✕ Cancelar":"+ Novo PDV"}
          </Btn>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
          {[
            { label:"TOTAL", value:total, color:C.cream },
            { label:"HOJE",  value:hoje,  color:hoje>0?C.green:C.gray },
            { label:"PEND.", value:pend,  color:pend>0?C.yellow:C.green },
          ].map(s => (
            <div key={s.label} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 12px" }}>
              <div style={{ fontSize:10, color:C.gray, letterSpacing:"0.1em", marginBottom:3 }}>{s.label}</div>
              <div style={{ fontSize:26, fontWeight:700, color:s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ADD FORM */}
      {showAdd && (
        <div style={{ margin:"1rem", padding:"1.25rem", background:C.surface, border:`1px solid ${C.border}`, borderRadius:12 }}>
          <div style={{ fontSize:10, color:C.yellow, letterSpacing:"0.12em", fontWeight:700, marginBottom:14 }}>NOVO PONTO DE VENDA</div>
          <FormPDV initial={EMPTY_FORM} onSave={adicionar} onCancel={()=>setShowAdd(false)} saving={saving} />
        </div>
      )}

      {/* SEARCH + FILTER */}
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

      {/* LIST */}
      <div style={{ padding:"0 1rem", display:"flex", flexDirection:"column", gap:8 }}>
        {lista.length===0&&total===0&&(
          <div style={{ textAlign:"center", padding:"4rem 1rem" }}>
            <div style={{ fontSize:44, marginBottom:12 }}>📍</div>
            <div style={{ fontSize:17, fontWeight:700, color:C.cream, marginBottom:8 }}>Nenhum PDV na rota</div>
            <div style={{ fontSize:13, color:C.gray, lineHeight:1.7 }}>Toque em <span style={{color:C.yellow,fontWeight:600}}>+ Novo PDV</span> para adicionar o primeiro ponto.</div>
          </div>
        )}
        {lista.length===0&&total>0&&<div style={{ textAlign:"center", padding:"2rem 0", color:C.gray, fontSize:14 }}>Nenhum PDV encontrado.</div>}

        {lista.map(s=>{
          const vs=visitStatus(s.visita),cfg=STATUS[vs],days=s.visita?daysSince(s.visita):null;
          const isExp=expanded===s.id,isEdit=editing===s.id,isFlash=flash===s.id,isDel=confirmDel===s.id,isOk=vs==="ok";
          const obsVal=obs[s.id]!==undefined?obs[s.id]:(s.obs||"");
          const cepFmt=s.cep?s.cep.slice(0,5)+(s.cep.length>5?"-"+s.cep.slice(5):""):null;

          return (
            <div key={s.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderLeft:`3px solid ${s.prio===1?C.yellow:C.border}`, borderRadius:12, overflow:"hidden" }}>

              <div style={{ padding:"13px 14px 0" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4 }}>
                      <div style={{ width:7, height:7, borderRadius:"50%", background:cfg.dot, flexShrink:0 }} />
                      <span style={{ fontSize:15, fontWeight:600, color:C.cream, lineHeight:1.3, wordBreak:"break-word" }}>{s.nome}</span>
                    </div>
                    <p style={{ margin:"0 0 5px", fontSize:12, color:C.gray, paddingLeft:14 }}>
                      {s.end}{cepFmt?<span style={{color:C.grayDim}}> · {cepFmt}</span>:""}
                    </p>
                    <div style={{ display:"flex", gap:5, flexWrap:"wrap", paddingLeft:14 }}>
                      <span style={{ fontSize:11, padding:"2px 7px", borderRadius:99, background:C.surface2, color:C.gray }}>{TIPO_LABEL[s.tipo]}</span>
                      {s.prio===1&&<span style={{ fontSize:11, padding:"2px 7px", borderRadius:99, background:"#f5c80025", color:C.yellow }}>Prioritário</span>}
                      {s.vendeu&&<span style={{ fontSize:11, padding:"2px 7px", borderRadius:99, background:"#22c55e20", color:C.green }}>Vende Dot</span>}
                    </div>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.08em", color:cfg.color, marginBottom:2 }}>{cfg.label}</div>
                    <div style={{ fontSize:11, color:C.gray, fontFamily:"monospace" }}>{isOk?fmtDate(s.visita):days!==null?`${days}d atrás`:"—"}</div>
                  </div>
                </div>
              </div>

              <div style={{ display:"flex", gap:6, padding:"10px 14px" }}>
                <Btn variant={isFlash||isOk?"green":"yellow"} style={{flex:1,padding:"11px 0",cursor:isOk?"default":"pointer",opacity:isOk?0.7:1}} onClick={()=>!isOk&&marcar(s.id)}>
                  {isFlash?"✓ Registrado!":isOk?"✓ Visitado hoje":"Marcar visita"}
                </Btn>
                <Btn variant={s.vendeu?"green":"ghost"} style={{padding:"11px 10px",fontSize:12}} onClick={()=>atualizar(s.id,{vendeu_dot:!s.vendeu})}>
                  {s.vendeu?"Dot ✓":"+ Dot"}
                </Btn>
                <Btn variant={isExp?"default":"ghost"} style={{padding:"11px 10px",fontSize:13}} onClick={()=>{setExpanded(isExp?null:s.id);setEditing(null);setConfirmDel(null);}}>
                  {isExp?"▲":"▼"}
                </Btn>
              </div>

              {isExp&&(
                <div style={{ padding:"12px 14px 14px", borderTop:`1px solid ${C.border}` }}>
                  {isEdit?(
                    <div>
                      <div style={{ fontSize:10, color:C.yellow, letterSpacing:"0.1em", fontWeight:700, marginBottom:12 }}>EDITAR PDV</div>
                      <FormPDV initial={{nome:s.nome,end:s.end,cep:cepFmt||"",tipo:s.tipo,prio:s.prio}} onSave={(form)=>editar(s.id,form)} onCancel={()=>setEditing(null)} saving={saving} />
                    </div>
                  ):(
                    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                      <div>
                        <div style={{ fontSize:10, color:C.gray, letterSpacing:"0.08em", marginBottom:5 }}>OBSERVAÇÕES</div>
                        <textarea rows={2} value={obsVal} placeholder="Anotação sobre o PDV…" onChange={e=>setObs(p=>({...p,[s.id]:e.target.value}))} onBlur={()=>saveObs(s.id)} style={{...ipt,resize:"none",fontSize:13}} />
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
        })}
      </div>

      {total>0&&(
        <div style={{ margin:"1.25rem 1rem 0", padding:"12px 14px", background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, textAlign:"center" }}>
          <span style={{ fontSize:12, color:C.gray, fontFamily:"monospace" }}>
            {hoje===total
              ?<span style={{color:C.green}}>⚡ MISSÃO COMPLETA — todos visitados hoje</span>
              :<><span style={{color:C.green}}>{hoje} visitados</span><span style={{color:C.grayDim}}> · </span><span style={{color:C.yellow}}>{pend} pendentes</span><span style={{color:C.grayDim}}> · </span><span style={{color:C.gray}}>{new Date().toLocaleDateString("pt-BR",{day:"numeric",month:"short"})}</span></>
            }
          </span>
        </div>
      )}
    </div>
  );
}
