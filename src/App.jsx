import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { C, ipt } from "./ui";
import RepView from "./RepView";
import AdminView from "./AdminView";

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
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

  if (loading) return (
    <div style={{ background:C.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"system-ui" }}>
      <div style={{ width:32, height:32, border:`3px solid ${C.border}`, borderTopColor:C.yellow, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!session) return (
    <div style={{ background:C.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'SF Pro Display',-apple-system,BlinkMacSystemFont,sans-serif", padding:"1.5rem" }}>
      <div style={{ width:"100%", maxWidth:360 }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, marginBottom:12 }}>
            <div style={{ width:10, height:10, borderRadius:"50%", background:C.yellow }} />
            <span style={{ fontSize:12, color:C.yellow, letterSpacing:"0.14em", fontWeight:700 }}>DOT ENERGY</span>
          </div>
          <h1 style={{ margin:0, fontSize:30, fontWeight:700, letterSpacing:"-0.02em", color:C.white }}>Rota PDV</h1>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <input
            type="email" placeholder="E-mail" value={email}
            onChange={e=>setEmail(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&login()}
            style={ipt} autoFocus autoComplete="email"
          />
          <input
            type="password" placeholder="Senha" value={password}
            onChange={e=>setPassword(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&login()}
            style={ipt} autoComplete="current-password"
          />
          {loginErr && <p style={{ margin:0, fontSize:12, color:C.red }}>{loginErr}</p>}
          <button
            onClick={login} disabled={loggingIn||!email.trim()||!password}
            style={{ background:C.yellow, color:"#000", border:"none", borderRadius:8, padding:"13px 0", fontSize:15, fontWeight:700, cursor:"pointer", marginTop:4, fontFamily:"inherit", opacity:(loggingIn||!email.trim()||!password)?0.5:1 }}
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
