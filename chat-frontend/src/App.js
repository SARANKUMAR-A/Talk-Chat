import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ChatApp from "./ChatApp";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import PrivateRoute from "./components/PrivateRoute";
import PaymentPage from "./pages/PaymentPage";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<PrivateRoute><ChatApp /></PrivateRoute>} />
        <Route path="/subscribe" element={<PaymentPage />} />
      </Routes>
    </Router>
  );
};

export default App;