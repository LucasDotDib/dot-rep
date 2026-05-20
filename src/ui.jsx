export const C = {
  bg:"#0e0e0e", surface:"#1a1a1a", surface2:"#222", border:"#2e2e2e",
  yellow:"#f5c800", green:"#22c55e", amber:"#f59e0b", red:"#ef4444",
  white:"#f0f0f0", gray:"#777", grayDim:"#3a3a3a",
};

export const ipt = {
  width:"100%", boxSizing:"border-box",
  background:"#222", border:"1px solid #2e2e2e", borderRadius:8,
  padding:"11px 13px", fontSize:14, color:"#f0f0f0",
  fontFamily:"inherit", outline:"none",
};
export const iptErr = { ...ipt, border:"1px solid #ef444488" };

export function Btn({ variant="default", style={}, ...props }) {
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

export const TODAY = new Date().toISOString().split("T")[0];
export const daysSince = d => !d ? null : Math.floor((new Date(TODAY) - new Date(d)) / 86400000);
export const visitStatus = d => { if (!d) return "nunca"; const n = daysSince(d); if (n===0) return "ok"; if (n<=14) return "recente"; return "atrasado"; };
export const fmtDate = d => !d ? null : new Date(d+"T12:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"2-digit"});
export const fmtTime = ts => !ts ? "" : new Date(ts).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
export const fmtCep = v => { const d=v.replace(/\D/g,"").slice(0,8); return d.length>5?d.slice(0,5)+"-"+d.slice(5):d; };

export const fromDB = r => ({
  id:r.id, nome:r.nome, end:r.endereco||"", cep:r.cep||"", tipo:r.tipo||"facu",
  prio:r.prioridade||0, vendeu:r.vendeu_dot||false, visita:r.ultima_visita||null,
  obs:r.obs||"", rotaId:r.rota_id||null,
});

export const TIPO_LABEL = { facu:"Faculdade", corp:"Corporativo", armazem:"Armazém", bar:"Bar / Rest.", outro:"Outro" };
export const TIPOS = Object.keys(TIPO_LABEL);

export const STATUS = {
  ok:{ label:"HOJE", color:"#22c55e", dot:"#22c55e" },
  recente:{ label:"RECENTE", color:"#f59e0b", dot:"#f59e0b" },
  atrasado:{ label:"ATRASADO", color:"#ef4444", dot:"#ef4444" },
  nunca:{ label:"SEM VISITA", color:"#3a3a3a", dot:"#3a3a3a" },
};

export const ORDER = { nunca:0, atrasado:1, recente:2, ok:3 };
