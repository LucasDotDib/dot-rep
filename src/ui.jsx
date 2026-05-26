import { useState } from "react";

export const C = {
  bg:        "#f8f9fc",
  white:     "#ffffff",
  surface:   "#ffffff",
  surface2:  "#f8f9fc",
  border:    "#f0f1f6",
  blue:      "#1b3a8c",
  blueDim:   "#eff6ff",
  yellow:    "#f5c800",
  yellowDim: "#fffbeb",
  green:     "#16a34a",
  greenDim:  "#f0fdf4",
  amber:     "#d97706",
  amberDim:  "#fffbeb",
  red:       "#ef4444",
  redDim:    "#fef2f2",
  text:      "#111827",
  muted:     "#6b7280",
  gray:      "#b0b7c3",
  grayDim:   "#f5f6fa",
  nav:       "#1a1f36",
};

export const ipt = {
  width:"100%", boxSizing:"border-box",
  background:"#f8f9fc", border:"1px solid #f0f1f6", borderRadius:10,
  padding:"12px 14px", fontSize:14, color:"#111827",
  fontFamily:"'Poppins', sans-serif", outline:"none",
};
export const iptErr = { ...ipt, border:"1px solid #fca5a5" };

export function Btn({ variant="default", style={}, ...props }) {
  const base = {
    cursor:"pointer", borderRadius:10, fontSize:13, fontWeight:600,
    letterSpacing:"0.01em", fontFamily:"'Poppins', sans-serif",
  };
  const variants = {
    yellow:  { background:"#f5c800", color:"#111827", border:"none" },
    ghost:   { background:"#f5f6fa", color:"#6b7280", border:"none" },
    green:   { background:"#f0fdf4", color:"#16a34a", border:"1px solid #bbf7d0" },
    danger:  { background:"#fef2f2", color:"#ef4444", border:"1px solid #fecaca" },
    default: { background:"#f5f6fa", color:"#374151", border:"1px solid #f0f1f6" },
    blue:    { background:"#1b3a8c", color:"#ffffff", border:"none" },
  };
  return <button style={{ ...base, ...variants[variant], ...style }} {...props} />;
}

export const TODAY = new Date().toISOString().split("T")[0];
export const daysSince    = d  => !d ? null : Math.floor((new Date(TODAY) - new Date(d)) / 86400000);
export const visitStatus  = d  => { if (!d) return "nunca"; const n=daysSince(d); if(n===0) return "ok"; if(n<=14) return "recente"; return "atrasado"; };
export const getUrgencia  = visita => { if (!visita) return "critica"; const d=daysSince(visita); return d>=30?"critica":d>=15?"media":"ok"; };
export const URGENCIA = {
  critica: { label:"URGENTE",  barColor:"#ef4444", badgeBg:"#fef2f2", badgeText:"#991b1b" },
  media:   { label:"PENDENTE", barColor:"#f5c800", badgeBg:"#fffbeb", badgeText:"#92400e" },
  ok:      { label:"EM DIA",   barColor:"#16a34a", badgeBg:"#f0fdf4", badgeText:"#166534" },
};
export const fmtDate      = d  => !d ? null : new Date(d+"T12:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"2-digit"});
export const fmtTime      = ts => !ts ? "" : new Date(ts).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
export const fmtCep       = v  => { const d=v.replace(/\D/g,"").slice(0,8); return d.length>5?d.slice(0,5)+"-"+d.slice(5):d; };

export const fromDB = r => ({
  id:r.id, nome:r.nome, end:r.endereco||"", cep:r.cep||"", tipo:r.tipo||"facu",
  prio:r.prioridade||0, vendeu:r.vendeu_dot||false, visita:r.ultima_visita||null,
  obs:r.obs||"", rotaId:r.rota_id||null, comprador:r.comprador||"",
});

export const TIPO_LABEL = { facu:"Faculdade", corp:"Corporativo", armazem:"Armazém", bar:"Bar / Rest.", outro:"Outro" };
export const TIPOS = Object.keys(TIPO_LABEL);

export const STATUS = {
  ok:       { label:"HOJE",       color:"#16a34a", dot:"#16a34a", badgeBg:"#f0fdf4", badgeText:"#166534" },
  recente:  { label:"RECENTE",    color:"#f5c800", dot:"#f5c800", badgeBg:"#fffbeb", badgeText:"#92400e" },
  atrasado: { label:"ATRASADO",   color:"#ef4444", dot:"#ef4444", badgeBg:"#fef2f2", badgeText:"#991b1b" },
  nunca:    { label:"SEM VISITA", color:"#d1d5db", dot:"#d1d5db", badgeBg:"#f3f4f6", badgeText:"#9ca3af" },
};
export const ORDER = { nunca:0, atrasado:1, recente:2, ok:3 };

export function FormPDV({ initial, onSave, onCancel, saving, rotas }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const set = (k, v) => { setForm(f=>({...f,[k]:v})); setErrors(e=>({...e,[k]:false})); };
  const validar = () => {
    const e = {};
    if (!form.nome.trim()) e.nome = true;
    if (!form.end.trim())  e.end  = true;
    setErrors(e); return Object.keys(e).length === 0;
  };
  const submit = () => { if (validar()) onSave(form); };

  const sel = { ...ipt, padding:"11px 12px", appearance:"none", WebkitAppearance:"none" };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      <div>
        <input placeholder="Nome do estabelecimento *" value={form.nome} onChange={e=>set("nome",e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} style={errors.nome?iptErr:ipt} autoFocus />
        {errors.nome&&<p style={{fontSize:11,color:C.red,margin:"4px 0 0"}}>Nome obrigatório</p>}
      </div>
      <input placeholder="Nome do comprador / responsável" value={form.comprador||""} onChange={e=>set("comprador",e.target.value)} style={ipt} />
      <div>
        <input placeholder="Endereço *" value={form.end} onChange={e=>set("end",e.target.value)} style={errors.end?iptErr:ipt} />
        {errors.end&&<p style={{fontSize:11,color:C.red,margin:"4px 0 0"}}>Endereço obrigatório</p>}
      </div>
      <input placeholder="CEP (ex: 01310-100)" value={form.cep} onChange={e=>set("cep",fmtCep(e.target.value))} style={ipt} inputMode="numeric" />
      <select value={form.tipo} onChange={e=>set("tipo",e.target.value)} style={sel}>
        {TIPOS.map(t=><option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
      </select>
      <select value={form.rotaId||""} onChange={e=>set("rotaId",e.target.value||null)} style={sel}>
        <option value="">Sem rota</option>
        {rotas.map(r=><option key={r.id} value={r.id}>📍 {r.nome}</option>)}
      </select>
      <div style={{ display:"flex", gap:8, marginTop:2 }}>
        <Btn
          variant={form.nome.trim()&&form.end.trim()&&!saving?"yellow":"ghost"}
          style={{flex:1,padding:"13px 0",fontSize:14,opacity:form.nome.trim()&&form.end.trim()?1:0.45}}
          onClick={submit}
        >
          {saving?"Salvando…":"Salvar"}
        </Btn>
        {onCancel&&<Btn variant="ghost" style={{padding:"13px 16px"}} onClick={onCancel}>Cancelar</Btn>}
      </div>
    </div>
  );
}
