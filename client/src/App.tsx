import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { ConnectWallet, useAddress, useContract } from "@thirdweb-dev/react";
import backgroundImg from "./assets/background.png";
import { CampaignList } from "./pages/CampaignList";
import { CreateCampaignForm } from "./pages/CreateCampaignForm";
import { EditCampaign } from "./pages/EditCampaign";
import { MyEventsSubscriber } from "./eventListeners/MyEventsSubscriber";
import { CommissionEventsSubscriber } from "./eventListeners/CommissionEventsSubscriber";
import { WithdrawFunds } from "./pages/WithdrawFunds";
import CampaignDetails from "./components/CampaignDetails";
import { CampaignProvider } from "./contexts/CampaignsContext";

const COMMISSION_MANAGER_CONTRACT_ADDRESS = "0x0e936c30BCd0a974cd96d6da4a206ee7Deb4551E";

export function App() {
  const address = useAddress();
  const { contract } = useContract(COMMISSION_MANAGER_CONTRACT_ADDRESS);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!contract || !address) return;
    (async () => {
      const owner = await contract.call("owner");
      setIsAdmin(owner.toLowerCase() === address.toLowerCase());
    })();
  }, [contract, address]);

  return (
    <BrowserRouter>
      <div style={{ minHeight: "100vh", margin: 0, padding: 0, backgroundColor: "black" }}>
        <nav
          className="flex justify-between items-center px-4 py-3 bg-zinc-900 shadow-md"
          style={{ position: "sticky", top: 0, zIndex: 10, backgroundColor: "#51465a" }}
        >
          <div className="flex gap-4">
            <Link to="/" style={{ color: "#c4a9ae", fontSize: "18px", paddingRight: "3px" }}>
              Home
            </Link>
            <Link to="/campaigns" style={{ color: "#c4a9ae", fontSize: "18px", paddingRight: "3px" }}>
              All Campaigns
            </Link>
            <Link to="/create-campaign" style={{ color: "#c4a9ae", fontSize: "18px", paddingRight: "3px" }}>
              Create Campaign
            </Link>
            {isAdmin && (
              <Link to="/withdraw-funds" style={{ color: "#c4a9ae", fontSize: "18px", paddingRight: "3px" }}>
                Withdraw Funds
              </Link>
            )}
          </div>
          <div>
            <ConnectWallet className="bg-violet-600 hover:bg-violet-700 text-white py-1 px-4 rounded" />
          </div>
        </nav>

        <main style={{ width: "100%", height: "100%", padding: 0, margin: 0 }}>
        <CampaignProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/campaigns" element={<CampaignList />} />
            <Route path="/create-campaign" element={<CreateCampaignForm />} />
            <Route path="/edit-campaign/:id" element={<EditCampaign />} />
            <Route path="/campaign-details/:id" element={<CampaignDetails />} />
            {isAdmin && <Route path="/withdraw-funds" element={<WithdrawFunds />} />}
          </Routes>
          </CampaignProvider>
          <MyEventsSubscriber />
          <CommissionEventsSubscriber />
        </main>
      </div>
    </BrowserRouter>
  );
}

function HomePage() {
  return (
    <div
      style={{
        backgroundImage: `url(${backgroundImg})`,
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        backgroundPosition: "center",
        height: "100%",
        minHeight: "100vh",
        width: "100%",
        margin: 0,
        padding: 0,
        position: "relative",
      }}
    >
      <h2 style={{ fontSize: "70px", color: "#ffc0cb", fontWeight: "600", textAlign: "center", paddingTop: "150px" }}>
        Crowdfunding App
      </h2>
      <h3 style={{ fontSize: "25px", color: "#e1bbc2", fontWeight: "500", textAlign: "center", margin: "0px" }}>
        Create campaigns, support projects, and track progress easily. Start by connecting your wallet.
      </h3>
    </div>
  );
}
