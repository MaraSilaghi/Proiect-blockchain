// main.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ThirdwebProvider } from "@thirdweb-dev/react";
import "./index.css";

const clientId = import.meta.env.VITE_CLIENT_ID;

const sepoliaWithCustomRPC = {
  chainId: 11155111,
  rpc: [
    "https://sepolia.infura.io/v3/1e7b6cdfd53c4448abb2eb921be9f7d2",
  ],
  nativeCurrency: {
    name: "Sepolia ETH",
    symbol: "SEP",
    decimals: 18,
  },
  shortName: "sepolia",
  slug: "sepolia",
  chain: "Sepolia test network",
  name: "Sepolia",
  testnet: true,
};

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThirdwebProvider
      activeChain={sepoliaWithCustomRPC}
      clientId={clientId}
    >
      <App />
    </ThirdwebProvider>
  </React.StrictMode>
);
