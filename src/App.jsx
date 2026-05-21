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
    <div style={{ background:C.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Poppins', sans-serif" }}>
      <div style={{ width:36, height:36, border:`3px solid ${C.border}`, borderTopColor:C.blue, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!session) return (
    <div style={{ background:C.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Poppins', sans-serif", padding:"1.5rem" }}>
      <div style={{ width:"100%", maxWidth:360 }}>

        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:64, height:64, borderRadius:20, background:C.blue, marginBottom:16 }}>
            <span style={{ fontSize:28, lineHeight:1 }}>⚡</span>
          </div>
          <div style={{ fontSize:12, color:C.blue, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>Dot Energy</div>
          <h1 style={{ margin:0, fontSize:26, fontWeight:700, color:C.text, letterSpacing:"-0.02em" }}>Rota PDV</h1>
        </div>

        {/* Form */}
        <div style={{ background:C.white, borderRadius:20, padding:"28px 24px", border:`1px solid ${C.border}`, display:"flex", flexDirection:"column", gap:12 }}>
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
          {loginErr && <p style={{ margin:0, fontSize:12, color:C.red, fontWeight:500 }}>{loginErr}</p>}
          <button
            onClick={login}
            disabled={loggingIn||!email.trim()||!password}
            style={{
              background:C.blue, color:"#fff", border:"none", borderRadius:12,
              padding:"14px 0", fontSize:15, fontWeight:700, cursor:"pointer",
              marginTop:4, fontFamily:"'Poppins', sans-serif",
              opacity:(loggingIn||!email.trim()||!password)?0.5:1,
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
