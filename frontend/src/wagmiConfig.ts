import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "MediVault",
  projectId: "medivault-demo",
  chains: [sepolia],
  ssr: false,
});