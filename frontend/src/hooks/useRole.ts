import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { UserRole } from "../fhirTypes";

const ROLE_STORAGE_KEY = "medivault_role_";

export function useRole() {
  const { address, isConnected } = useAccount();
  const [role, setRoleState] = useState<UserRole>(null);
  const [roleLoaded, setRoleLoaded] = useState(false);

  // Load role from localStorage when wallet connects
  useEffect(() => {
    if (!address || !isConnected) {
      setRoleState(null);
      setRoleLoaded(false);
      return;
    }
    const stored = localStorage.getItem(ROLE_STORAGE_KEY + address.toLowerCase());
    setRoleState((stored as UserRole) || null);
    setRoleLoaded(true);
  }, [address, isConnected]);

  const setRole = (newRole: UserRole) => {
    if (!address) return;
    if (newRole) {
      localStorage.setItem(ROLE_STORAGE_KEY + address.toLowerCase(), newRole);
    } else {
      localStorage.removeItem(ROLE_STORAGE_KEY + address.toLowerCase());
    }
    setRoleState(newRole);
  };

  const clearRole = () => setRole(null);

  return { role, setRole, clearRole, roleLoaded };
}