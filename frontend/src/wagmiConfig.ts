import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "MediVault",
  projectId: "2f05ae7f1116030fde2d36508f472bfb",
  chains: [sepolia],
  ssr: false,
});