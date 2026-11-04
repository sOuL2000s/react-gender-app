import { Routes, Route, Navigate } from "react-router-dom";
import RegisterPage from "./pages/Register.jsx";
import LoginPage from "./pages/Login.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/register" replace />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
    </Routes>
  );
}

export default App;
