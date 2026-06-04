import { useState } from "react";

export const TODAY = new Date().toISOString().split("T")[0];

export const C = {
  bg:       "#f0f2f5",
  white:    "#ffffff",
  surface:  "#ffffff",
  surface2: "#f8f9fa",
  border:   "#eaecf0",
  blue:     "#1b3a8c",
  blueDim:  "#eef1fa",
  yellow:   "#f5c800",
  yellowDim:"#fefbe8",
  green:    "#16a34a",
  greenDim: "#dcfce7",
  amber:    "#d97706",
  amberDim: "#fef3c7",
  red:      "#dc2626",
  redDim:   "#fee2e2",
  purple:   "#7c3aed",
  purpleDim:"#ede9fe",
  text:     "#111827",
  muted:    "#6b7280",
  grayDim:  "#e5e7eb",
  gray:     "#6b7280",
  nav:      "#111827",
};

export const daysSince = d => !d ? null : Math.floor((new Date(TODAY) - new Date(d)) / 86400000);
export const visitStatus = d => { if (!d) return "nunca"; const n = daysSince(d); if (n===0) return "ok"; if (n<=14) return "recente"; return "atrasado"; };
export const fmtDate = d => !d ? null : new Date(d+"T12:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"2-digit"});
export const fmtTime = ts => !ts ? "" : new Date(ts).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
export const fmtCep  = v => { const d=v.replace(/\D/g,"").slice(0,8); return d.length>5?d.slice(0,5)+"-"+d.slice(5):d; };

export const fromDB = r => ({
  id:r.id, nome:r.nome, end:r.endereco||"", cep:r.cep||"", tipo:r.tipo||"facu",
  prio:r.prioridade||0, vendeu:r.vendeu_dot||false, visita:r.ultima_visita||null,
  obs:r.obs||"", rotaId:r.rota_id||null, consignado:r.Consignado||false,
  comprador: r.comprador||"",
});

export const TIPO_LABEL = { facu:"Faculdade", corp:"Corporativo", armazem:"Armazém", bar:"Bar / Rest.", outro:"Outro" };
export const TIPOS = Object.keys(TIPO_LABEL);
export const STATUS = {
  ok:      { label:"HOJE",      color:"#16a34a", dot:"#16a34a" },
  recente: { label:"RECENTE",   color:"#d97706", dot:"#d97706" },
  atrasado:{ label:"ATRASADO",  color:"#dc2626", dot:"#dc2626" },
  nunca:   { label:"SEM VISITA",color:"#9ca3af", dot:"#d1d5db" },
};
export const ORDER = { nunca:0, atrasado:1, recente:2, ok:3 };

export const ipt = {
  width:"100%", boxSizing:"border-box",
  background:C.surface2, border:"1px solid #eaecf0", borderRadius:10,
  padding:"12px 14px", fontSize:14, color:C.text,
  fontFamily:"inherit", outline:"none",
};
export const iptErr = { ...ipt, border:"1px solid #dc262688" };

const card = { background:C.white, borderRadius:16, boxShadow:"0 2px 12px rgba(0,0,0,0.06)" };

export function Btn({ variant="default", style={}, ...props }) {
  const base = { cursor:"pointer", borderRadius:10, fontSize:13, fontWeight:600, border:"none", fontFamily:"inherit" };
  const variants = {
    yellow:  { background:"#f5c800", color:"#111827" },
    blue:    { background:"#1b3a8c", color:"#ffffff" },
    ghost:   { background:"#ffffff", border:"1px solid #eaecf0", color:"#6b7280" },
    green:   { background:"#dcfce7", color:"#16a34a", border:"1px solid #bbf7d0" },
    danger:  { background:"#fee2e2", color:"#dc2626", border:"1px solid #fca5a5" },
    default: { background:"#f8f9fa", border:"1px solid #eaecf0", color:"#111827" },
  };
  return <button style={{ ...base, ...variants[variant], ...style }} {...props} />;
}

// Bottom navigation bar
export function BottomNav({ aba, setAba, tabs }) {
  return (
    <div style={{
      position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)",
      width:"100%", maxWidth:440, padding:"10px 16px 28px",
      background:"linear-gradient(to top, #f0f2f5 70%, transparent)",
      zIndex:100,
    }}>
      <div style={{
        background:C.nav, borderRadius:99, padding:"6px",
        display:"flex", gap:4,
        boxShadow:"0 4px 24px rgba(0,0,0,0.18)",
      }}>
        {tabs.map(([v, icon, label]) => (
          <button key={v} onClick={()=>setAba(v)} title={label} style={{
            flex:1, padding:"9px 14px", cursor:"pointer",
            borderRadius:99, border:"none", fontFamily:"inherit",
            background:aba===v?"#ffffff":"transparent",
            color:aba===v?C.nav:"#6b7280",
            transition:"all 0.2s",
          }}>
            <i className={`ti ${icon}`} style={{ fontSize:20, display:"block" }} />
          </button>
        ))}
      </div>
    </div>
  );
}

// Colored stat card with icon square
export function StatCard({ iconClass, iconColor, iconBg, value, label }) {
  return (
    <div style={{ ...card, padding:"14px" }}>
      <div style={{
        width:38, height:38, borderRadius:11,
        background:iconBg, display:"flex", alignItems:"center", justifyContent:"center",
        marginBottom:10,
      }}>
        <i className={`ti ${iconClass}`} style={{ fontSize:20, color:iconColor }} />
      </div>
      <div style={{ fontSize:26, fontWeight:700, color:C.text, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>{label}</div>
    </div>
  );
}

// PDV card (light version)
export function PdvCardLight({ s, rotas, expanded, editing, flash, confirmDel, obs,
  setExpanded, setEditing, setConfirmDel, setObs,
  marcar, atualizar, editar, remover, saveObs, saving,
  marcandoId, setMarcandoId, marcObs, setMarcObs, historico,
  activeRotaId }) {

  const vs = visitStatus(s.visita), cfg = STATUS[vs], days = s.visita?daysSince(s.visita):null;
  const isExp=expanded===s.id, isEdit=editing===s.id, isFlash=flash===s.id;
  const isDel=confirmDel===s.id, isOk=vs==="ok", isMarcando=marcandoId===s.id;
  const obsVal = obs[s.id]!==undefined?obs[s.id]:(s.obs||"");
  const cepFmt = s.cep?s.cep.slice(0,5)+(s.cep.length>5?"-"+s.cep.slice(5):""):null;
  const hist = historico?.[s.id]||[];

  const statusColor = { ok:C.green, recente:C.amber, atrasado:C.red, nunca:C.grayDim };
  const statusBg    = { ok:C.greenDim, recente:C.amberDim, atrasado:C.redDim, nunca:"#f3f4f6" };

  return (
    <div style={{
      ...card,
      borderLeft:`4px solid ${statusColor[vs]||C.grayDim}`,
      overflow:"hidden",
    }}>
      <div style={{ padding:"14px 14px 0" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ margin:"0 0 3px", fontSize:15, fontWeight:700, color:C.text, lineHeight:1.3, textTransform:"capitalize" }}>{s.nome.toLowerCase()}</p>
            <p style={{ margin:"0 0 7px", fontSize:12, color:C.muted }}>
              {s.end}{cepFmt?<span style={{color:C.grayDim}}> · {cepFmt}</span>:""}
            </p>
            <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
              <span style={{ fontSize:11, padding:"2px 8px", borderRadius:99, background:"#f3f4f6", color:C.muted }}>{TIPO_LABEL[s.tipo]}</span>
              {s.prio===1&&<span style={{ fontSize:11, padding:"2px 8px", borderRadius:99, background:"#eff6ff", color:"#1b3a8c" }}>Prior.</span>}
              {s.vendeu&&<span style={{ fontSize:11, padding:"2px 8px", borderRadius:99, background:C.greenDim, color:C.green }}>Vende Dot</span>}
            </div>
          </div>
          <div style={{ textAlign:"right", flexShrink:0 }}>
            <span style={{ fontSize:10, fontWeight:600, padding:"2px 7px", borderRadius:6, background:statusBg[vs], color:statusColor[vs]||C.muted, display:"block", marginBottom:3 }}>
              {cfg.label}
            </span>
            <span style={{ fontSize:11, color:C.muted, fontFamily:"monospace" }}>
              {isOk?fmtDate(s.visita):days!==null?`${days}d atrás`:"—"}
            </span>
          </div>
        </div>
      </div>

      {isMarcando&&!isOk&&(
        <div style={{ padding:"8px 14px 0" }}>
          <input placeholder="Observação da visita (opcional)…" value={marcObs} onChange={e=>setMarcObs(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&marcar(s.id,marcObs)} style={ipt} autoFocus />
        </div>
      )}

      <div style={{ display:"flex", gap:8, padding:"10px 14px" }}>
        {isMarcando&&!isOk ? (
          <>
            <Btn variant="blue" style={{flex:1,padding:"11px 0",fontSize:13}} onClick={()=>marcar(s.id,marcObs)}>✓ Confirmar visita</Btn>
            <Btn variant="ghost" style={{padding:"11px 12px"}} onClick={()=>{setMarcandoId(null);setMarcObs("");}}>Cancelar</Btn>
          </>
        ) : (
          <>
            <Btn variant={isFlash||isOk?"green":"yellow"} style={{flex:1,padding:"11px 0",cursor:isOk?"default":"pointer",opacity:isOk?0.7:1}}
              onClick={()=>!isOk&&setMarcandoId(s.id)}>
              {isFlash?"✓ Registrado!":isOk?"✓ Visitado hoje":"Marcar visita"}
            </Btn>
            <Btn variant={s.vendeu?"green":"ghost"} style={{padding:"11px 10px",fontSize:12}} onClick={()=>atualizar(s.id,{vendeu_dot:!s.vendeu})}>
              {s.vendeu?"Dot ✓":"+ Dot"}
            </Btn>
            <Btn variant={isExp?"default":"ghost"} style={{padding:"11px 10px"}} onClick={()=>{setExpanded(isExp?null:s.id);setEditing(null);setConfirmDel(null);}}>
              {isExp?"▲":"▼"}
            </Btn>
          </>
        )}
      </div>

      {isExp&&(
        <div style={{ padding:"12px 14px 14px", borderTop:"1px solid #f3f4f6" }}>
          {isEdit ? (
            <div>
              <p style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:C.blue,textTransform:"uppercase",letterSpacing:"0.08em"}}>Editar PDV</p>
              <FormPDV initial={{nome:s.nome,end:s.end,cep:cepFmt||"",tipo:s.tipo,prio:s.prio,rotaId:s.rotaId,comprador:s.comprador||""}}
                onSave={(form)=>editar(s.id,form)} onCancel={()=>setEditing(null)} saving={saving} rotas={rotas} />
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid #f3f4f6" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <i className="ti ti-package" style={{ fontSize:15, color:s.consignado?C.purple:C.muted }}/>
                  <span style={{ fontSize:13, color:C.text }}>Display consignado</span>
                </div>
                <button style={{
                  padding:"5px 12px", borderRadius:8, border:"none", cursor:"pointer",
                  fontFamily:"inherit", fontSize:12, fontWeight:600,
                  background:s.consignado?C.purpleDim:"#f5f6fa",
                  color:s.consignado?C.purple:C.muted,
                }} onClick={()=>atualizar(s.id,{Consignado:!s.consignado})}>
                  {s.consignado?"Remover":"Marcar"}
                </button>
              </div>
              <div>
                <p style={{margin:"0 0 5px",fontSize:11,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em"}}>Observações</p>
                <textarea rows={2} value={obsVal} placeholder="Anotação sobre o PDV…"
                  onChange={e=>setObs(p=>({...p,[s.id]:e.target.value}))} onBlur={()=>saveObs(s.id)}
                  style={{...ipt,resize:"none",fontSize:13}} />
              </div>
              <div>
                <p style={{margin:"0 0 4px",fontSize:11,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em"}}>
                  <i className="ti ti-user" style={{marginRight:4}}/> Comprador
                </p>
                <input
                  placeholder="Nome do comprador…"
                  defaultValue={s.comprador||""}
                  onBlur={e=>{ if(e.target.value!==s.comprador) atualizar(s.id,{comprador:e.target.value}); }}
                  style={{...ipt,fontSize:13}}
                />
              </div>
              {hist.length>0&&(
                <div>
                  <p style={{margin:"0 0 6px",fontSize:11,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em"}}>Histórico de visitas</p>
                  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                    {hist.map(v=>(
                      <div key={v.id} style={{ fontSize:12, padding:"8px 10px", background:"#f8f9fa", borderRadius:8, display:"flex", gap:8, alignItems:"flex-start" }}>
                        <span style={{ color:C.blue, fontWeight:700, fontFamily:"monospace", flexShrink:0 }}>{fmtDate(v.data)}</span>
                        {v.obs?<span style={{color:C.muted,lineHeight:1.4}}>{v.obs}</span>:<span style={{color:C.grayDim,fontStyle:"italic"}}>sem obs.</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display:"flex", gap:6 }}>
                <Btn variant="default" style={{flex:1,padding:"9px 0",fontSize:12}} onClick={()=>setEditing(s.id)}>✏️ Editar</Btn>
                {isDel?(
                  <><Btn variant="danger" style={{flex:1,padding:"9px 0",fontSize:12}} onClick={()=>remover(s.id)}>Confirmar</Btn>
                  <Btn variant="ghost" style={{padding:"9px 12px",fontSize:12}} onClick={()=>setConfirmDel(null)}>Não</Btn></>
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

export function FormPDV({ initial, onSave, onCancel, saving, rotas }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const set = (k,v) => { setForm(f=>({...f,[k]:v})); setErrors(e=>({...e,[k]:false})); };
  const validar = () => { const e={}; if(!form.nome.trim())e.nome=true; if(!form.end.trim())e.end=true; setErrors(e); return !Object.keys(e).length; };
  const submit = () => { if(validar()) onSave(form); };
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
      <input placeholder="Nome do comprador (opcional)" value={form.comprador||""} onChange={e=>set("comprador",e.target.value)} style={ipt} />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9 }}>
        <select value={form.tipo} onChange={e=>set("tipo",e.target.value)} style={{...ipt,padding:"11px 10px"}}>
          {TIPOS.map(t=><option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
        </select>
        <Btn variant={form.prio===1?"blue":"ghost"} style={{padding:"11px 0"}} onClick={()=>set("prio",form.prio===1?0:1)}>
          {form.prio===1?"⭐ Prior.":"☆ Prior."}
        </Btn>
      </div>
      {rotas&&(
        <select value={form.rotaId||""} onChange={e=>set("rotaId",e.target.value||null)} style={{...ipt,padding:"11px 10px"}}>
          <option value="">Sem rota</option>
          {rotas.map(r=><option key={r.id} value={r.id}>📍 {r.nome}</option>)}
        </select>
      )}
      <div style={{ display:"flex", gap:8 }}>
        <Btn variant={form.nome.trim()&&form.end.trim()&&!saving?"blue":"ghost"}
          style={{flex:1,padding:"12px 0",fontSize:14,opacity:form.nome.trim()&&form.end.trim()?1:0.4}} onClick={submit}>
          {saving?"Salvando…":"Salvar"}
        </Btn>
        {onCancel&&<Btn variant="ghost" style={{padding:"12px 14px"}} onClick={onCancel}>Cancelar</Btn>}
      </div>
    </div>
  );
}
