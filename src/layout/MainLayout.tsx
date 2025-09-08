import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import HeaderHome from "../components/HeaderHome";
import HeaderDashboard from "../components/HeaderDashboard";
import AuthDrawer from "../components/AuthDrawer";
import UpgradeModal from "../components/UpgradeModal";
import { UpgradeProvider } from "../context/UpgradeContext";

export default function MainLayout() {
  const { pathname } = useLocation();
  // dùng header Dashboard cho cả /dashboard và /my-dashboard
  const isDashHeader =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/my-dashboard") ||
    pathname.startsWith("/design") ||
    pathname.startsWith("/assets");

  return (
    <UpgradeProvider>
      <div className="app-shell">
        {isDashHeader ? <HeaderDashboard /> : <HeaderHome />}
        <main className="page-content">
          <Outlet />
        </main>
        <AuthDrawer />
        <UpgradeModal />
      </div>
    </UpgradeProvider>
  );
}
