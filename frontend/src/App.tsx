import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "./wagmiConfig";
import { useAccount } from "wagmi";
import { useRole } from "./hooks/useRole";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import RoleSelect from "./pages/RoleSelect";
import Settings from "./pages/Settings";
import "@rainbow-me/rainbowkit/styles.css";
import "./index.css";

const queryClient = new QueryClient();

function AppRoutes() {
  const { isConnected } = useAccount();
  const { role, roleLoaded } = useRole();

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/select-role" element={
        !isConnected ? <Navigate to="/" /> : <RoleSelect />
      } />
      <Route path="/dashboard" element={
        !isConnected ? <Navigate to="/" /> :
        roleLoaded && !role ? <Navigate to="/select-role" /> :
        <Dashboard />
      } />
      <Route path="/doctor" element={
  !isConnected ? <Navigate to="/" /> :
  roleLoaded && !role ? <Navigate to="/select-role" /> :
  role === "patient" ? <Navigate to="/dashboard" /> :
  <DoctorDashboard />
} />
<Route path="/doctor/register" element={
  !isConnected ? <Navigate to="/" /> :
  role !== "doctor" ? <Navigate to="/select-role" /> :
  <DoctorDashboard />
} />
      <Route path="/settings" element={
        !isConnected ? <Navigate to="/" /> : <Settings />
      } />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}