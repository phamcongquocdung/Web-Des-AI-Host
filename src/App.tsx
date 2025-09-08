import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layout/MainLayout";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard"; // <-- thêm
import MyDashboard from "./pages/MyDashboard"; // <-- nhớ import
import ResetPassword from "./pages/ResetPassword";
import AssetsPage from "./pages/Assets";
import AuthPage from "./pages/Home";
import Design from "./pages/Design";
export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="design" element={<Design />} />
        <Route path="my-dashboard" element={<MyDashboard />} />{" "}
        {/* <— SỬA Ở ĐÂY */}
        <Route path="assets" element={<AssetsPage />} />
        <Route path="features" element={<div className="page">Features</div>} />
        <Route path="pricing" element={<div className="page">Pricing</div>} />
        <Route path="*" element={<Navigate to="/" replace />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth" element={<AuthPage />} />
      </Route>
    </Routes>
  );
}
