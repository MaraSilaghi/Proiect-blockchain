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
    "https://eth-sepolia.g.alchemy.com/v2/9l-9vo3wJgiZaerJ3luGULCn0U8lbdPt",
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
  //<React.StrictMode>
    <ThirdwebProvider
      activeChain={sepoliaWithCustomRPC}
      clientId={clientId}
    >
      <App />
    </ThirdwebProvider>
  //</React.StrictMode>
);
