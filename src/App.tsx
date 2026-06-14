import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EBDRegistrationForm } from "./components/EBDRegistrationForm";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import ChoirView from "./pages/Choir"; // <-- 1. IMPORTAR A NOVA PÁGINA
import Professor from "./pages/Professor";
import Signup from "./pages/Signup";

function RootGate() {
  const [state, setState] = useState<"loading" | "anon" | { to: string }>("loading");
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      if (!session) { setState("anon"); return; }
      const { data: roles } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", session.user.id);
      const list = ((roles as unknown) as Array<{ role: string }>) || [];
      const has = (r: string) => list.some((x) => x.role === r);
      let to = "/admin";
      if (has("master")) to = "/admin?scope=master";
      else if (has("igreja_mae")) to = "/admin?scope=ministry";
      else if (has("igreja_sede")) to = "/admin?scope=headquarters";
      else if (has("admin_regional")) to = "/admin?scope=regional";
      else if (has("secretario_ebd")) to = "/admin?scope=congregation";
      else if (has("professor_classe")) to = "/professor";
      if (active) setState({ to });
    })();
    return () => { active = false; };
  }, []);
  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }
  if (state === "anon") return <Navigate to="/login" replace />;
  return <Navigate to={state.to} replace />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RootGate />} />
        <Route path="/form" element={<EBDRegistrationForm />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/professor" element={<Professor />} />
        <Route path="/coristas" element={<ChoirView />} /> {/* <-- 2. ADICIONAR A NOVA ROTA */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
