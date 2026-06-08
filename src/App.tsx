import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import { EBDRegistrationForm } from "./components/EBDRegistrationForm";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import ChoirView from "./pages/Choir"; // <-- 1. IMPORTAR A NOVA PÁGINA
import Professor from "./pages/Professor";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/form" element={<EBDRegistrationForm />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/professor" element={<Professor />} />
        <Route path="/coristas" element={<ChoirView />} /> {/* <-- 2. ADICIONAR A NOVA ROTA */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
