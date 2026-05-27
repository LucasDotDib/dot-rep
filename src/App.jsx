import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { C, ipt } from "./ui";
import RepView from "./RepView";
import AdminView from "./AdminView";

export default function App() {
  const [session,   setSession]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [loginErr,  setLoginErr]  = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 5000);
    supabase.auth.getSession()
      .then(({ data }) => { setSession(data.session); setLoading(false); })
      .catch(() => setLoading(false))
      .finally(() => clearTimeout(timeout));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const login = async () => {
    setLoginErr("");
    setLoggingIn(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setLoginErr(error.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : error.message);
    setLoggingIn(false);
  };

  const logout = () => supabase.auth.signOut();

  const F = "'Plus Jakarta Sans', sans-serif";

  if (loading) return (
    <div style={{ background:"linear-gradient(160deg,#0f1d4a 0%,#1b3a8c 55%,#162e6e 100%)", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:F }}>
      <div style={{ width:36, height:36, border:"3px solid rgba(255,255,255,.15)", borderTopColor:C.yellow, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!session) return (
    <div style={{ background:"linear-gradient(160deg,#0f1d4a 0%,#1b3a8c 55%,#162e6e 100%)", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:F, padding:"1.5rem" }}>
      <div style={{ width:"100%", maxWidth:360 }}>

        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:44 }}>
          <div style={{
            width:80, height:80, borderRadius:26,
            background:"linear-gradient(135deg,rgba(255,255,255,.12),rgba(255,255,255,.04))",
            border:"1px solid rgba(255,255,255,.18)",
            display:"inline-flex", alignItems:"center", justifyContent:"center",
            marginBottom:18, boxShadow:"0 8px 40px rgba(0,0,0,.3)",
          }}>
            <i className="ti ti-bolt" style={{ fontSize:36, color:C.yellow }} />
          </div>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:".18em", textTransform:"uppercase", color:"rgba(255,255,255,.4)", marginBottom:6 }}>Dot Energy</div>
          <h1 style={{ margin:0, fontSize:"2rem", fontWeight:800, color:"#fff", letterSpacing:"-.03em", lineHeight:1 }}>Rota PDV</h1>
        </div>

        {/* Form */}
        <div style={{ background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.13)", borderRadius:24, padding:"28px 24px", backdropFilter:"blur(16px)", display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <div style={{ fontSize:".68rem", fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", color:"rgba(255,255,255,.4)", marginBottom:7 }}>E-mail</div>
            <input
              type="email" placeholder="rep@dotenergy.com.br" value={email}
              onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()}
              style={{ width:"100%", boxSizing:"border-box", background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.12)", borderRadius:12, padding:"14px 16px", fontSize:14, color:"#fff", fontFamily:F, outline:"none" }}
              autoFocus autoComplete="email"
            />
          </div>
          <div>
            <div style={{ fontSize:".68rem", fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", color:"rgba(255,255,255,.4)", marginBottom:7 }}>Senha</div>
            <input
              type="password" placeholder="••••••••" value={password}
              onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()}
              style={{ width:"100%", boxSizing:"border-box", background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.12)", borderRadius:12, padding:"14px 16px", fontSize:14, color:"#fff", fontFamily:F, outline:"none" }}
              autoComplete="current-password"
            />
          </div>
          {loginErr && <p style={{ margin:0, fontSize:12, color:"#fca5a5", fontWeight:500 }}>{loginErr}</p>}
          <button
            onClick={login} disabled={loggingIn||!email.trim()||!password}
            style={{
              background:C.yellow, color:"#111", border:"none", borderRadius:14,
              padding:"15px 0", fontSize:15, fontWeight:800, cursor:"pointer",
              marginTop:4, fontFamily:F, letterSpacing:".01em",
              opacity:(loggingIn||!email.trim()||!password)?0.45:1,
              boxShadow:(loggingIn||!email.trim()||!password)?"none":"0 6px 24px rgba(245,200,0,.35)",
              transition:"all .2s",
            }}
          >
            {loggingIn ? "Entrando…" : "Entrar"}
          </button>
        </div>
      </div>
    </div>
  );

  const role = session.user.user_metadata?.role;
  if (role === "admin") return <AdminView onLogout={logout} />;
  return <RepView onLogout={logout} />;
}
