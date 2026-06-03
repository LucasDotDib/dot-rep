import { useState } from "react";

export const TODAY = new Date().toISOString().split("T")[0];

/* ── Tokens ── */
export const C = {
  bg:         "#f4f5f7",
  white:      "#ffffff",
  surface:    "#ffffff",
  surface2:   "#f8f9fa",
  border:     "#e5e7eb",
  borderMid:  "#d1d5db",

  blue:       "#1b3a8c",
  blueDim:    "#eef1fa",
  blueText:   "#0c447c",

  accent:     "#00b894",
  accentDim:  "#e6f9f5",
  accentText: "#065f46",

  yellow:     "#f5c800",
  yellowDim:  "#fefbe8",

  green:      "#16a34a",
  greenDim:   "#dcfce7",
  greenText:  "#27500a",
  greenBorder:"#bbf7d0",

  amber:      "#BA7517",
  amberDim:   "#fef3c7",
  amberText:  "#633806",

  red:        "#E24B4A",
  redDim:     "#fee2e2",
  redText:    "#791f1f",

  purple:     "#534AB7",
  purpleDim:  "#ede9fe",
  purpleText: "#3c3489",

  text:       "#111827",
  muted:      "#6b7280",
  grayDim:    "#e5e7eb",
  gray:       "#6b7280",
};

/* ── Radius ── */
export const R = {
  sm:  10,
  md:  12,
  lg:  16,
  xl:  20,
  pill:99,
};

/* ── Typography ── */
export const font = "'SF Pro Display',-apple-system,BlinkMacSystemFont,sans-serif";

/* ── Helpers ── */
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
export const ORDER      = { nunca:0, atrasado:1, recente:2, ok:3 };

export const STATUS_COLOR = {
  ok:      C.green,
  recente: C.amber,
  atrasado:C.red,
  nunca:   C.borderMid,
};
export const STATUS_BG = {
  ok:      C.greenDim,
  recente: C.amberDim,
  atrasado:C.redDim,
  nunca:   C.surface2,
};
export const STATUS_LABEL = {
  ok:      "Visitado hoje",
  recente: "Recente",
  atrasado:"Atrasado",
  nunca:   "Sem visita",
};

/* ── Shared input style ── */
export const ipt = {
  width:"100%", boxSizing:"border-box",
  background:C.surface2, border:`1px solid ${C.border}`, borderRadius:R.sm,
  padding:"10px 12px", fontSize:14, color:C.text,
  fontFamily:font, outline:"none",
};
export const iptErr = { ...ipt, border:`1px solid ${C.red}88` };

/* ── Button ── */
export function Btn({ variant="default", style={}, ...props }) {
  const base = {
    cursor:"pointer", borderRadius:R.sm, fontSize:13, fontWeight:500,
    border:"none", fontFamily:font, transition:"opacity .15s",
  };
  const variants = {
    yellow:  { background:C.yellow,    color:"#111827",   border:"none" },
    blue:    { background:C.blue,      color:"#ffffff",   border:"none" },
    accent:  { background:C.accent,    color:"#ffffff",   border:"none" },
    ghost:   { background:C.white,     border:`1px solid ${C.border}`,   color:C.muted },
    green:   { background:C.greenDim,  color:C.greenText, border:`1px solid ${C.greenBorder}` },
    danger:  { background:C.redDim,    color:C.redText,   border:`1px solid #fca5a5` },
    default: { background:C.surface2,  border:`1px solid ${C.border}`,   color:C.text },
  };
  return <button style={{ ...base, ...variants[variant], ...style }} {...props} />;
}

/* ── Spinner ── */
export function Spinner() {
  return (
    <div style={{ background:C.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:28, height:28, border:`3px solid ${C.border}`, borderTopColor:C.blue, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ── Badge ── */
export function Badge({ variant="default", children, style={} }) {
  const variants = {
    ok:      { background:C.greenDim,  color:C.greenText  },
    recente: { background:C.amberDim,  color:C.amberText  },
    atrasado:{ background:C.redDim,    color:C.redText    },
    nunca:   { background:C.surface2,  color:C.muted,  border:`0.5px solid ${C.border}` },
    blue:    { background:C.blueDim,   color:C.blueText   },
    purple:  { background:C.purpleDim, color:C.purpleText },
    accent:  { background:C.accentDim, color:C.accentText },
    default: { background:C.surface2,  color:C.muted      },
  };
  return (
    <span style={{
      fontSize:10, fontWeight:500, padding:"3px 7px",
      borderRadius:6, display:"inline-flex", alignItems:"center", gap:3,
      ...variants[variant], ...style,
    }}>
      {children}
    </span>
  );
}

/* ── Hero banner (rota ativa) ── */
export function HeroBanner({ label, name, sub, pct, num, total, bgColor }) {
  return (
    <div style={{
      background: bgColor || C.blue,
      borderRadius:R.lg, padding:"16px 18px", marginBottom:14,
    }}>
      <p style={{ margin:"0 0 6px", fontSize:10, color:"rgba(255,255,255,.5)", letterSpacing:".06em", textTransform:"uppercase" }}>
        {label}
      </p>
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:12 }}>
        <div>
          <p style={{ margin:0, fontSize:17, fontWeight:500, color:"#fff" }}>{name}</p>
          {sub && <p style={{ margin:"2px 0 0", fontSize:12, color:"rgba(255,255,255,.5)" }}>{sub}</p>}
        </div>
        <div style={{ textAlign:"right" }}>
          <p style={{ margin:0, fontSize:32, fontWeight:500, color:C.yellow, lineHeight:1 }}>
            {pct != null ? `${pct}%` : num}
          </p>
          <p style={{ margin:"1px 0 0", fontSize:11, color:"rgba(255,255,255,.4)" }}>
            {pct != null ? `${num} de ${total}` : "PDVs"}
          </p>
        </div>
      </div>
      {total > 0 && (
        <div style={{ height:4, background:"rgba(255,255,255,.18)", borderRadius:99 }}>
          <div style={{ height:"100%", width:`${Math.round((num/total)*100)}%`, background:C.yellow, borderRadius:99, transition:"width .4s" }} />
        </div>
      )}
    </div>
  );
}

/* ── Stat card 2x2 ── */
export function StatCard({ icon, value, label, iconBg, iconColor, valueColor, delta, deltaColor }) {
  return (
    <div style={{
      background:C.white, borderRadius:R.lg, padding:"14px 15px",
      border:`0.5px solid ${C.border}`,
    }}>
      <div style={{
        width:34, height:34, borderRadius:10,
        background:iconBg, display:"flex", alignItems:"center", justifyContent:"center",
        marginBottom:10, fontSize:17, color:iconColor,
      }}>
        {icon}
      </div>
      <p style={{ margin:0, fontSize:26, fontWeight:500, color:valueColor||C.text, lineHeight:1 }}>{value}</p>
      <p style={{ margin:"4px 0 0", fontSize:11, color:C.muted }}>{label}</p>
      {delta && <p style={{ margin:"3px 0 0", fontSize:11, fontWeight:500, color:deltaColor||C.accent }}>{delta}</p>}
    </div>
  );
}

/* ── List card row (pendentes / histórico simples) ── */
export function ListRow({ dotColor, name, sub, right, rightColor }) {
  return (
    <div style={{
      display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"11px 14px", borderBottom:`0.5px solid ${C.border}`,
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, flex:1, minWidth:0 }}>
        <div style={{ width:8, height:8, borderRadius:"50%", background:dotColor, flexShrink:0 }} />
        <div style={{ minWidth:0 }}>
          <p style={{ margin:0, fontSize:13, fontWeight:500, color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{name}</p>
          {sub && <p style={{ margin:"1px 0 0", fontSize:11, color:C.muted }}>{sub}</p>}
        </div>
      </div>
      {right && <p style={{ margin:"0 0 0 8px", fontSize:13, fontWeight:500, color:rightColor||C.muted, flexShrink:0 }}>{right}</p>}
    </div>
  );
}

/* ── PDV card (rep + admin/PDVs) ── */
export function PdvCardLight({
  s, rotas, expanded, editing, flash, confirmDel, obs,
  setExpanded, setEditing, setConfirmDel, setObs,
  marcar, atualizar, editar, remover, saveObs, saving,
  marcandoId, setMarcandoId, marcObs, setMarcObs, historico,
}) {
  const vs     = visitStatus(s.visita);
  const days   = s.visita ? daysSince(s.visita) : null;
  const isExp  = expanded === s.id;
  const isEdit = editing === s.id;
  const isFlash= flash === s.id;
  const isDel  = confirmDel === s.id;
  const isOk   = vs === "ok";
  const isMark = marcandoId === s.id;
  const obsVal = obs[s.id] !== undefined ? obs[s.id] : (s.obs||"");
  const rota   = rotas.find(r => r.id === s.rotaId);
  const hist   = historico?.[s.id] || [];

  const barColor = STATUS_COLOR[vs];

  return (
    <div style={{
      background:C.white, border:`0.5px solid ${C.border}`,
      borderRadius:R.lg, overflow:"hidden", marginBottom:10,
    }}>
      {/* main row */}
      <div style={{ display:"flex", alignItems:"stretch" }}>
        <div style={{ width:3, background:barColor, flexShrink:0, borderRadius:0 }} />
        <div style={{ flex:1, padding:"12px 13px" }}>
          <p style={{ margin:"0 0 2px", fontSize:14, fontWeight:500, color:C.text }}>{s.nome}</p>
          <p style={{ margin:0, fontSize:12, color:C.muted }}>{TIPO_LABEL[s.tipo]} · {s.end}</p>
          <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:7 }}>
            <Badge variant={vs}>{days === 0 ? "Visitado hoje" : days !== null ? `${days}d atrás` : "Sem visita"}</Badge>
            {rota   && <Badge variant="blue">📍 {rota.nome}</Badge>}
            {s.prio === 1 && <Badge variant="blue">⭐ Prior.</Badge>}
            {s.vendeu    && <Badge variant="ok">✓ Vende Dot</Badge>}
            {s.consignado && <Badge variant="purple">📦 Consig.</Badge>}
          </div>
        </div>
      </div>

      {/* mark obs input */}
      {isMark && !isOk && (
        <div style={{ padding:"8px 13px 0" }}>
          <input
            placeholder="Observação da visita (opcional)…"
            value={marcObs} onChange={e => setMarcObs(e.target.value)}
            onKeyDown={e => e.key==="Enter" && marcar(s.id, marcObs)}
            style={ipt} autoFocus
          />
        </div>
      )}

      {/* action bar */}
      <div style={{ display:"flex", borderTop:`0.5px solid ${C.border}` }}>
        {isMark && !isOk ? (
          <>
            <Btn variant="blue" style={{ flex:1, padding:"10px 0", borderRadius:0, fontSize:13 }} onClick={() => marcar(s.id, marcObs)}>
              ✓ Confirmar visita
            </Btn>
            <Btn variant="ghost" style={{ padding:"10px 14px", borderRadius:0, borderLeft:`0.5px solid ${C.border}` }} onClick={() => { setMarcandoId(null); setMarcObs(""); }}>
              Cancelar
            </Btn>
          </>
        ) : (
          <>
            <button
              onClick={() => !isOk && setMarcandoId(s.id)}
              style={{
                flex:1, padding:"10px 0", border:"none", borderRadius:0, fontFamily:font,
                fontSize:13, fontWeight:500, cursor: isOk ? "default" : "pointer",
                background: isFlash||isOk ? C.greenDim : C.yellow,
                color:      isFlash||isOk ? C.greenText : "#111827",
                opacity:    isOk ? .7 : 1,
              }}
            >
              {isFlash ? "✓ Registrado!" : isOk ? "✓ Visitado hoje" : "Marcar visita"}
            </button>
            <button
              onClick={() => { setExpanded(isExp ? null : s.id); setEditing(null); setConfirmDel(null); }}
              style={{
                width:42, border:"none", borderLeft:`0.5px solid ${C.border}`, borderRadius:0,
                background:C.surface2, color:C.muted, cursor:"pointer", fontSize:13, fontFamily:font,
              }}
              aria-label="Detalhes"
            >
              {isExp ? "▲" : "▼"}
            </button>
          </>
        )}
      </div>

      {/* expanded detail */}
      {isExp && (
        <div style={{ padding:"12px 13px", borderTop:`0.5px solid ${C.border}`, background:C.surface2 }}>
          {isEdit ? (
            <>
              <p style={{ margin:"0 0 12px", fontSize:11, fontWeight:500, color:C.blue, textTransform:"uppercase", letterSpacing:".07em" }}>Editar PDV</p>
              <FormPDV
                initial={{ nome:s.nome, end:s.end, cep:fmtCep(s.cep||""), tipo:s.tipo, prio:s.prio, rotaId:s.rotaId }}
                onSave={form => editar(s.id, form)}
                onCancel={() => setEditing(null)}
                saving={saving} rotas={rotas}
              />
            </>
          ) : (
            <>
              <p style={{ margin:"0 0 5px", fontSize:11, color:C.muted, fontWeight:500, textTransform:"uppercase", letterSpacing:".06em" }}>Observações</p>
              <textarea
                rows={2} value={obsVal} placeholder="Anotação sobre o PDV…"
                onChange={e => setObs(p => ({...p, [s.id]:e.target.value}))}
                onBlur={() => saveObs(s.id)}
                style={{ ...ipt, resize:"none", fontSize:13, marginBottom:10 }}
              />

              {/* secondary actions */}
              <div style={{ display:"flex", gap:6, marginBottom: hist.length > 0 ? 12 : 0 }}>
                <Btn
                  variant={s.vendeu ? "green" : "ghost"}
                  style={{ flex:1, padding:"8px 0", fontSize:12 }}
                  onClick={() => atualizar(s.id, { vendeu_dot:!s.vendeu })}
                >
                  {s.vendeu ? "Dot ✓" : "+ Dot"}
                </Btn>
                <Btn
                  variant="ghost"
                  style={{
                    flex:1, padding:"8px 0", fontSize:12,
                    background:s.consignado ? C.purpleDim : "",
                    color:s.consignado ? C.purpleText : "",
                    border:s.consignado ? `1px solid #c4b5fd` : "",
                  }}
                  onClick={() => atualizar(s.id, { Consignado:!s.consignado })}
                >
                  📦 {s.consignado ? "Consig. ✓" : "Consig."}
                </Btn>
                <Btn variant="ghost" style={{ padding:"8px 12px" }} onClick={() => setEditing(s.id)}>✏️</Btn>
                {isDel ? (
                  <>
                    <Btn variant="danger" style={{ padding:"8px 10px", fontSize:11 }} onClick={() => remover(s.id)}>Confirmar</Btn>
                    <Btn variant="ghost"  style={{ padding:"8px 10px", fontSize:11 }} onClick={() => setConfirmDel(null)}>✕</Btn>
                  </>
                ) : (
                  <Btn variant="danger" style={{ padding:"8px 12px" }} onClick={() => setConfirmDel(s.id)}>🗑</Btn>
                )}
              </div>

              {/* history */}
              {hist.length > 0 && (
                <>
                  <p style={{ margin:"0 0 6px", fontSize:10, color:C.muted, fontWeight:500, textTransform:"uppercase", letterSpacing:".06em" }}>Histórico</p>
                  <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
                    {hist.map((v,i) => (
                      <div key={v.id} style={{
                        fontSize:12, padding:"6px 0",
                        borderBottom: i < hist.length-1 ? `0.5px solid ${C.border}` : "none",
                        display:"flex", gap:8, alignItems:"baseline",
                      }}>
                        <span style={{ color:C.blue, fontWeight:500, flexShrink:0 }}>{fmtDate(v.data)}</span>
                        {v.obs
                          ? <span style={{ color:C.muted }}>{v.obs}</span>
                          : <span style={{ color:C.grayDim, fontStyle:"italic" }}>sem obs.</span>
                        }
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Form PDV ── */
export function FormPDV({ initial, onSave, onCancel, saving, rotas }) {
  const [form, setForm]     = useState(initial);
  const [errors, setErrors] = useState({});
  const set = (k,v) => { setForm(f=>({...f,[k]:v})); setErrors(e=>({...e,[k]:false})); };
  const validar = () => {
    const e={};
    if (!form.nome.trim()) e.nome=true;
    if (!form.end.trim())  e.end=true;
    setErrors(e);
    return !Object.keys(e).length;
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      <div>
        <input placeholder="Nome *" value={form.nome} onChange={e=>set("nome",e.target.value)} style={errors.nome?iptErr:ipt} autoFocus />
        {errors.nome && <p style={{ fontSize:11, color:C.red, margin:"3px 0 0" }}>Nome obrigatório</p>}
      </div>
      <div>
        <input placeholder="Endereço *" value={form.end} onChange={e=>set("end",e.target.value)} style={errors.end?iptErr:ipt} />
        {errors.end && <p style={{ fontSize:11, color:C.red, margin:"3px 0 0" }}>Endereço obrigatório</p>}
      </div>
      <input placeholder="CEP" value={form.cep} onChange={e=>set("cep",fmtCep(e.target.value))} style={ipt} inputMode="numeric" />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        <select value={form.tipo} onChange={e=>set("tipo",e.target.value)} style={{...ipt,padding:"10px 10px"}}>
          {TIPOS.map(t=><option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
        </select>
        <Btn variant={form.prio===1?"blue":"ghost"} style={{ padding:"10px 0" }} onClick={()=>set("prio",form.prio===1?0:1)}>
          {form.prio===1?"⭐ Prior.":"☆ Prior."}
        </Btn>
      </div>
      {rotas && (
        <select value={form.rotaId||""} onChange={e=>set("rotaId",e.target.value||null)} style={{...ipt,padding:"10px 10px"}}>
          <option value="">Sem rota</option>
          {rotas.map(r=><option key={r.id} value={r.id}>📍 {r.nome}</option>)}
        </select>
      )}
      <div style={{ display:"flex", gap:8, marginTop:2 }}>
        <Btn
          variant={form.nome.trim()&&form.end.trim()&&!saving?"blue":"ghost"}
          style={{ flex:1, padding:"11px 0", fontSize:14, opacity:form.nome.trim()&&form.end.trim()?1:.4 }}
          onClick={()=>validar()&&onSave(form)}
        >
          {saving ? "Salvando…" : "Salvar"}
        </Btn>
        {onCancel && <Btn variant="ghost" style={{ padding:"11px 14px" }} onClick={onCancel}>Cancelar</Btn>}
      </div>
    </div>
  );
}

/* ── Bottom nav ── */
export function BottomNav({ aba, setAba, tabs }) {
  return (
    <div style={{
      display:"flex",
      background:C.white,
      borderTop:`0.5px solid ${C.border}`,
    }}>
      {tabs.map(([v, , label, icon]) => {
        const active = aba === v;
        return (
          <button
            key={v}
            onClick={() => setAba(v)}
            style={{
              flex:1, padding:"9px 2px 11px", cursor:"pointer",
              display:"flex", flexDirection:"column", alignItems:"center", gap:2,
              border:"none", borderTop:`2px solid ${active ? C.blue : "transparent"}`,
              background:"transparent", fontFamily:font,
              color: active ? C.blue : C.muted,
              fontSize:9, fontWeight:500, transition:"color .15s",
              minWidth:0,
            }}
          >
            <span style={{ fontSize:18 }}>{icon}</span>
            <span style={{ whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", width:"100%", textAlign:"center" }}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
