import { useState } from "react";

export const TODAY = new Date().toISOString().split("T")[0];

// ── Design tokens ──────────────────────────────────────────────
export const C = {
  // backgrounds
  bg:          "#f4f5f7",
  white:       "#ffffff",
  surface:     "#ffffff",
  surface2:    "#f4f5f7",
  border:      "#e5e7eb",

  // brand
  blue:        "#1b3a8c",
  blueDim:     "#eef1fa",
  blueText:    "#0c447c",

  // semantic
  yellow:      "#f5c800",
  yellowDim:   "#fefbe8",
  green:       "#27500a",
  greenDim:    "#dcfce7",
  greenBorder: "#bbf7d0",
  amber:       "#ba7517",
  amberDim:    "#fef3c7",
  red:         "#e24b4a",
  redDim:      "#fee2e2",
  redText:     "#791f1f",
  purple:      "#3c3489",
  purpleDim:   "#ede9fe",
  purpleBorder:"#c4b5fd",

  // text
  text:        "#111827",
  muted:       "#6b7280",
  grayDim:     "#e5e7eb",
  gray:        "#6b7280",
  nav:         "#1b3a8c",
};

// ── Helpers (unchanged) ────────────────────────────────────────
export const daysSince   = d => !d ? null : Math.floor((new Date(TODAY) - new Date(d)) / 86400000);
export const visitStatus = d => { if (!d) return "nunca"; const n = daysSince(d); if (n===0) return "ok"; if (n<=14) return "recente"; return "atrasado"; };
export const fmtDate     = d => !d ? null : new Date(d+"T12:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"2-digit"});
export const fmtTime     = ts => !ts ? "" : new Date(ts).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
export const fmtCep      = v => { const d=v.replace(/\D/g,"").slice(0,8); return d.length>5?d.slice(0,5)+"-"+d.slice(5):d; };

export const fromDB = r => ({
  id:r.id, nome:r.nome, end:r.endereco||"", cep:r.cep||"", tipo:r.tipo||"facu",
  prio:r.prioridade||0, vendeu:r.vendeu_dot||false, visita:r.ultima_visita||null,
  obs:r.obs||"", rotaId:r.rota_id||null, consignado:r.Consignado||false,
});

export const TIPO_LABEL = { facu:"Faculdade", corp:"Corporativo", armazem:"Armazém", bar:"Bar / Rest.", outro:"Outro" };
export const TIPOS      = Object.keys(TIPO_LABEL);
export const STATUS = {
  ok:      { label:"HOJE",       color:C.green,  dot:"#639922" },
  recente: { label:"RECENTE",    color:C.amber,  dot:C.amber   },
  atrasado:{ label:"ATRASADO",   color:C.red,    dot:C.red     },
  nunca:   { label:"SEM VISITA", color:C.muted,  dot:C.grayDim },
};
export const ORDER = { nunca:0, atrasado:1, recente:2, ok:3 };

// ── Shared input style ─────────────────────────────────────────
export const ipt = {
  width:"100%", boxSizing:"border-box",
  background:C.surface2, border:`1px solid ${C.border}`, borderRadius:10,
  padding:"11px 13px", fontSize:14, color:C.text,
  fontFamily:"inherit", outline:"none",
};
export const iptErr = { ...ipt, border:"1px solid #dc262688" };

// ── Btn component ──────────────────────────────────────────────
export function Btn({ variant="default", style={}, ...props }) {
  const base = {
    cursor:"pointer", borderRadius:10, fontSize:13, fontWeight:600,
    border:"none", fontFamily:"inherit", padding:"10px 16px",
  };
  const variants = {
    yellow:  { background:C.yellow,   color:"#111827" },
    blue:    { background:C.blue,     color:"#ffffff" },
    ghost:   { background:C.white,    border:`1px solid ${C.border}`, color:C.muted },
    green:   { background:C.greenDim, color:C.green,  border:`1px solid ${C.greenBorder}` },
    danger:  { background:C.redDim,   color:C.redText, border:"1px solid #fca5a5" },
    default: { background:C.surface2, border:`1px solid ${C.border}`, color:C.text },
  };
  return <button style={{ ...base, ...variants[variant], ...style }} {...props} />;
}

// ── BottomNav ──────────────────────────────────────────────────
export function BottomNav({ aba, setAba, tabs }) {
  return (
    <div style={{
      position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)",
      width:"100%", maxWidth:440,
      background:C.white,
      borderTop:`1px solid ${C.border}`,
      display:"flex",
      zIndex:100,
    }}>
      {tabs.map(([v, icon, label]) => {
        const active = aba === v;
        return (
          <button key={v} onClick={()=>setAba(v)} style={{
            flex:1, padding:"9px 4px 12px", cursor:"pointer",
            border:"none", borderTop: active ? `2px solid ${C.blue}` : "2px solid transparent",
            fontFamily:"inherit",
            background:C.white,
            color: active ? C.blue : C.muted,
            fontSize:9, fontWeight:500,
            display:"flex", flexDirection:"column", alignItems:"center", gap:3,
            transition:"color .15s",
          }}>
            <span style={{ fontSize:20 }}>{icon}</span>
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── StatCard ───────────────────────────────────────────────────
export function StatCard({ icon, value, label, bg, color, delta }) {
  return (
    <div style={{
      background:C.white, borderRadius:16,
      border:`0.5px solid ${C.border}`,
      padding:"14px 15px",
    }}>
      <div style={{
        width:34, height:34, borderRadius:10,
        background:bg,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:18, marginBottom:10,
      }}>{icon}</div>
      <div style={{ fontSize:26, fontWeight:500, color: color||C.text, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>{label}</div>
      {delta && <div style={{ fontSize:11, marginTop:3, fontWeight:500, color:C.green }}>{delta}</div>}
    </div>
  );
}

// ── Hero banner (rota ativa) ───────────────────────────────────
export function HeroBanner({ label, name, sub, pct, total, visitados, color="#1b3a8c" }) {
  const w = total > 0 ? Math.round((visitados/total)*100) : 0;
  return (
    <div style={{
      background:color, borderRadius:16,
      padding:"16px 18px", marginBottom:14, color:"#fff",
    }}>
      <div style={{ fontSize:10, color:"rgba(255,255,255,.5)", letterSpacing:".06em", textTransform:"uppercase", marginBottom:6 }}>{label}</div>
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:12 }}>
        <div>
          <div style={{ fontSize:17, fontWeight:500, color:"#fff" }}>📍 {name}</div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,.5)", marginTop:2 }}>{sub}</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:32, fontWeight:500, color:pct===100?"#a7f3d0":C.yellow, lineHeight:1 }}>{w}%</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,.4)", marginTop:1 }}>concluído</div>
        </div>
      </div>
      <div style={{ height:4, background:"rgba(255,255,255,.18)", borderRadius:99 }}>
        <div style={{ height:"100%", width:`${w}%`, background:C.yellow, borderRadius:99, transition:"width .4s" }} />
      </div>
    </div>
  );
}

// ── Accent bar color por status ────────────────────────────────
const barColor = { ok:"#639922", recente:C.amber, atrasado:C.red, nunca:C.grayDim };

// ── PdvCardLight ───────────────────────────────────────────────
export function PdvCardLight({ s, rotas, expanded, editing, flash, confirmDel, obs,
  setExpanded, setEditing, setConfirmDel, setObs,
  marcar, atualizar, editar, remover, saveObs, saving,
  marcandoId, setMarcandoId, marcObs, setMarcObs, historico }) {

  const vs = visitStatus(s.visita), cfg = STATUS[vs], days = s.visita ? daysSince(s.visita) : null;
  const isExp=expanded===s.id, isEdit=editing===s.id, isFlash=flash===s.id;
  const isDel=confirmDel===s.id, isOk=vs==="ok", isMarcando=marcandoId===s.id;
  const obsVal = obs[s.id]!==undefined ? obs[s.id] : (s.obs||"");
  const cepFmt = s.cep ? s.cep.slice(0,5)+(s.cep.length>5?"-"+s.cep.slice(5):"") : null;
  const rota   = rotas.find(r=>r.id===s.rotaId);
  const hist   = historico?.[s.id]||[];

  const chipStyle = (bg, color, border) => ({
    fontSize:10, fontWeight:500, padding:"3px 7px",
    borderRadius:5, background:bg, color, border:`0.5px solid ${border||bg}`,
    display:"inline-flex", alignItems:"center", gap:3,
  });

  return (
    <div style={{
      background:C.white,
      border:`0.5px solid ${C.border}`,
      borderRadius:16,
      overflow:"hidden",
      opacity: isOk ? .65 : 1,
    }}>
      {/* top row */}
      <div style={{ display:"flex", alignItems:"stretch" }}>
        {/* accent bar */}
        <div style={{ width:3, background:barColor[vs], flexShrink:0 }} />
        {/* body */}
        <div style={{ flex:1, padding:"12px 13px" }}>
          <div style={{ fontSize:14, fontWeight:500, color:C.text, marginBottom:2 }}>{s.nome}</div>
          <div style={{ fontSize:12, color:C.muted }}>
            {TIPO_LABEL[s.tipo]}{s.end ? ` · ${s.end}` : ""}
            {cepFmt ? <span style={{color:C.grayDim}}> · {cepFmt}</span> : ""}
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:7 }}>
            {/* status chip */}
            <span style={chipStyle(
              vs==="ok"?C.greenDim:vs==="recente"?C.amberDim:vs==="atrasado"?C.redDim:"#f3f4f6",
              vs==="ok"?C.green:vs==="recente"?C.amber:vs==="atrasado"?C.redText:C.muted,
            )}>
              {isOk ? fmtDate(s.visita) : days!==null ? `${days}d atrás` : "sem visita"}
            </span>
            {rota  && <span style={chipStyle(C.yellowDim,"#92730a")}>📍 {rota.nome}</span>}
            {s.prio===1 && <span style={chipStyle(C.blueDim,C.blueText)}>⭐ Prior.</span>}
            {s.vendeu  && <span style={chipStyle(C.greenDim,C.green,C.greenBorder)}>✓ Dot</span>}
            {s.consignado && <span style={chipStyle(C.purpleDim,C.purple,C.purpleBorder)}>📦 Consig.</span>}
          </div>
        </div>
      </div>

      {/* marcando obs input */}
      {isMarcando && !isOk && (
        <div style={{ padding:"8px 13px 0" }}>
          <input placeholder="Observação da visita (opcional)…" value={marcObs}
            onChange={e=>setMarcObs(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&marcar(s.id,marcObs)}
            style={ipt} autoFocus />
        </div>
      )}

      {/* action bar */}
      <div style={{ display:"flex", borderTop:`0.5px solid ${C.border}` }}>
        {isMarcando && !isOk ? (
          <>
            <button onClick={()=>marcar(s.id,marcObs)} style={{
              flex:1, padding:"10px 0", fontSize:13, fontWeight:500, cursor:"pointer",
              border:"none", background:C.blue, color:"#fff", fontFamily:"inherit",
            }}>✓ Confirmar visita</button>
            <button onClick={()=>{setMarcandoId(null);setMarcObs("");}} style={{
              width:44, padding:"10px 0", cursor:"pointer", border:"none",
              borderLeft:`0.5px solid ${C.border}`, background:C.surface2,
              color:C.muted, fontFamily:"inherit", fontSize:13,
            }}>✕</button>
          </>
        ) : (
          <>
            <button onClick={()=>!isOk&&setMarcandoId(s.id)} style={{
              flex:1, padding:"10px 0", fontSize:13, fontWeight:500, cursor: isOk?"default":"pointer",
              border:"none", fontFamily:"inherit",
              background: isFlash||isOk ? C.greenDim : C.yellow,
              color: isFlash||isOk ? C.green : "#111827",
            }}>
              {isFlash ? "✓ Registrado!" : isOk ? "✓ Visitado hoje" : "Marcar visita"}
            </button>
            <button onClick={()=>{setExpanded(isExp?null:s.id);setEditing(null);setConfirmDel(null);}} style={{
              width:44, padding:"10px 0", cursor:"pointer", fontSize:13,
              border:"none", borderLeft:`0.5px solid ${C.border}`,
              background:C.surface2, color:C.muted, fontFamily:"inherit",
            }}>
              {isExp ? "▲" : "▼"}
            </button>
          </>
        )}
      </div>

      {/* expanded detail */}
      {isExp && (
        <div style={{ borderTop:`0.5px solid ${C.border}`, padding:"12px 13px 14px", background:C.surface2 }}>
          {isEdit ? (
            <>
              <p style={{margin:"0 0 12px",fontSize:11,fontWeight:600,color:C.blue,textTransform:"uppercase",letterSpacing:".08em"}}>Editar PDV</p>
              <FormPDV initial={{nome:s.nome,end:s.end,cep:cepFmt||"",tipo:s.tipo,prio:s.prio,rotaId:s.rotaId}}
                onSave={(form)=>editar(s.id,form)} onCancel={()=>setEditing(null)} saving={saving} rotas={rotas} />
            </>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {/* secondary actions */}
              <div style={{ display:"flex", gap:7 }}>
                <Btn variant={s.vendeu?"green":"ghost"} style={{flex:1,padding:"8px 0",fontSize:12}}
                  onClick={()=>atualizar(s.id,{vendeu_dot:!s.vendeu})}>
                  {s.vendeu ? "Dot ✓" : "+ Dot"}
                </Btn>
                <Btn variant="ghost" style={{
                  padding:"8px 10px", fontSize:12,
                  background:s.consignado?C.purpleDim:"", color:s.consignado?C.purple:"",
                  border:s.consignado?`1px solid ${C.purpleBorder}`:"",
                }} onClick={()=>atualizar(s.id,{Consignado:!s.consignado})} title="Toggle consignado">
                  📦
                </Btn>
              </div>
              {/* obs */}
              <textarea rows={2} value={obsVal} placeholder="Anotação sobre o PDV…"
                onChange={e=>setObs(p=>({...p,[s.id]:e.target.value}))}
                onBlur={()=>saveObs(s.id)}
                style={{...ipt,resize:"none",fontSize:13}} />
              {/* history */}
              {hist.length > 0 && (
                <div>
                  <p style={{margin:"0 0 6px",fontSize:10,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:".06em"}}>Histórico</p>
                  <div style={{ background:C.white, borderRadius:10, border:`0.5px solid ${C.border}`, overflow:"hidden" }}>
                    {hist.map((v,i) => (
                      <div key={v.id} style={{
                        fontSize:12, padding:"8px 11px",
                        borderBottom: i<hist.length-1 ? `0.5px solid ${C.border}` : "none",
                        display:"flex", gap:8, alignItems:"flex-start",
                      }}>
                        <span style={{ color:C.blue, fontWeight:600, fontFamily:"monospace", flexShrink:0 }}>{fmtDate(v.data)}</span>
                        {v.obs
                          ? <span style={{color:C.muted,lineHeight:1.4}}>{v.obs}</span>
                          : <span style={{color:C.grayDim,fontStyle:"italic"}}>sem obs.</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* edit / delete */}
              <div style={{ display:"flex", gap:6 }}>
                <Btn variant="default" style={{flex:1,padding:"8px 0",fontSize:12}} onClick={()=>setEditing(s.id)}>✏️ Editar</Btn>
                {isDel ? (
                  <>
                    <Btn variant="danger" style={{flex:1,padding:"8px 0",fontSize:12}} onClick={()=>remover(s.id)}>Confirmar</Btn>
                    <Btn variant="ghost"  style={{padding:"8px 12px",fontSize:12}} onClick={()=>setConfirmDel(null)}>Não</Btn>
                  </>
                ) : (
                  <Btn variant="danger" style={{padding:"8px 12px",fontSize:12}} onClick={()=>setConfirmDel(s.id)}>🗑</Btn>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── FormPDV (unchanged logic, updated style) ───────────────────
export function FormPDV({ initial, onSave, onCancel, saving, rotas }) {
  const [form, setForm]     = useState(initial);
  const [errors, setErrors] = useState({});
  const set    = (k,v) => { setForm(f=>({...f,[k]:v})); setErrors(e=>({...e,[k]:false})); };
  const validar = () => { const e={}; if(!form.nome.trim())e.nome=true; if(!form.end.trim())e.end=true; setErrors(e); return !Object.keys(e).length; };
  const submit  = () => { if(validar()) onSave(form); };

  const inputStyle = (err) => ({
    ...ipt, ...(err ? { border:"1px solid #dc262688" } : {}),
  });

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
      <div>
        <input placeholder="Nome do estabelecimento *" value={form.nome}
          onChange={e=>set("nome",e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}
          style={inputStyle(errors.nome)} autoFocus />
        {errors.nome && <p style={{fontSize:11,color:C.red,margin:"3px 0 0"}}>Nome obrigatório</p>}
      </div>
      <div>
        <input placeholder="Endereço *" value={form.end} onChange={e=>set("end",e.target.value)} style={inputStyle(errors.end)} />
        {errors.end && <p style={{fontSize:11,color:C.red,margin:"3px 0 0"}}>Endereço obrigatório</p>}
      </div>
      <input placeholder="CEP (ex: 01310-100)" value={form.cep}
        onChange={e=>set("cep",fmtCep(e.target.value))} style={ipt} inputMode="numeric" />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9 }}>
        <select value={form.tipo} onChange={e=>set("tipo",e.target.value)} style={{...ipt,padding:"10px 10px"}}>
          {TIPOS.map(t=><option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
        </select>
        <Btn variant={form.prio===1?"blue":"ghost"} style={{padding:"10px 0"}} onClick={()=>set("prio",form.prio===1?0:1)}>
          {form.prio===1 ? "⭐ Prior." : "☆ Prior."}
        </Btn>
      </div>
      {rotas && (
        <select value={form.rotaId||""} onChange={e=>set("rotaId",e.target.value||null)} style={{...ipt,padding:"10px 10px"}}>
          <option value="">Sem rota</option>
          {rotas.map(r=><option key={r.id} value={r.id}>📍 {r.nome}</option>)}
        </select>
      )}
      <div style={{ display:"flex", gap:8 }}>
        <Btn variant={form.nome.trim()&&form.end.trim()&&!saving?"blue":"ghost"}
          style={{flex:1,padding:"11px 0",fontSize:14,opacity:form.nome.trim()&&form.end.trim()?1:0.4}}
          onClick={submit}>
          {saving ? "Salvando…" : "Salvar"}
        </Btn>
        {onCancel && <Btn variant="ghost" style={{padding:"11px 14px"}} onClick={onCancel}>Cancelar</Btn>}
      </div>
    </div>
  );
}
