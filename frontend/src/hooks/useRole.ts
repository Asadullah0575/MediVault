import { useState, useEffect } from "react";
import { useAccount } from "wagmi";

export type UserRole = "patient" | "doctor" | "admin" | null;
const ROLE_KEY = "medivault_role_";

export function useRole() {
  const { address, isConnected } = useAccount();

  // Initialize role immediately from localStorage — no delay
  const [role, setRoleState] = useState<UserRole>(() => {
    if (typeof window === "undefined") return null;
    // Try to get role from any stored address
    const keys = Object.keys(localStorage);
    const roleKey = keys.find(k => k.startsWith(ROLE_KEY));
    if (roleKey) return localStorage.getItem(roleKey) as UserRole;
    return null;
  });

  const [roleLoaded, setRoleLoaded] = useState(true); // Always true now

  useEffect(() => {
    if (!address || !isConnected) {
      setRoleState(null);
      return;
    }
    const stored = localStorage.getItem(ROLE_KEY + address.toLowerCase());
    setRoleState((stored as UserRole) || null);
    setRoleLoaded(true);
  }, [address, isConnected]);

  const setRole = (newRole: UserRole) => {
    if (!address) return;
    if (newRole) {
      localStorage.setItem(ROLE_KEY + address.toLowerCase(), newRole);
    } else {
      localStorage.removeItem(ROLE_KEY + address.toLowerCase());
    }
    setRoleState(newRole);
  };

  const clearRole = () => setRole(null);

  return { role, setRole, clearRole, roleLoaded };
}