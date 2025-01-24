import React, { useState } from "react";
import backgroundImg from "../assets/background.png";
import {
  useContract,
  useContractRead,
  useContractWrite,
  useAddress,
} from "@thirdweb-dev/react";
import { ethers } from "ethers";
import { Link } from "react-router-dom";
import Web3 from "web3";

const web3 = new Web3(window.ethereum);


const CROWDFUNDING_CONTRACT_ADDRESS = "0xee4bc32b70DB3df04974D379319F937D7376D8Ce";

export function CampaignList() {
  const { contract } = useContract(CROWDFUNDING_CONTRACT_ADDRESS);
  const { data: campaigns, isLoading, error } = useContractRead(contract, "getCampaigns");
  const { mutateAsync: donateToCampaign } = useContractWrite(contract, "donateToCampaign");
  const { mutateAsync: deleteCampaign } = useContractWrite(contract, "deleteCampaign");
  const address = useAddress();

  const [donationAmounts, setDonationAmounts] = useState<{ [key: number]: string }>({});
  const [messages, setMessages] = useState<{ [key: number]: string }>({}); // Tracks messages per campaign

  if (isLoading) {
    return <div>Loading campaigns...</div>;
  }
  if (error) {
    return <div>Error reading campaigns</div>;
  }

  // Filter out invalid campaigns
  const validCampaigns = campaigns?.filter(
    (campaign: any) => campaign.owner !== "0x0000000000000000000000000000000000000000"
  );

  
  const handleDonate = async (filteredIndex: number, amount: string) => {
    try {
      // Verificăm dacă utilizatorul este conectat
      if (!address) {
        setMessages({
          ...messages,
          [filteredIndex]: "You need to connect your wallet to make a donation.",
        });
        return;
      }
  
      if (!contract) {
        setMessages({ ...messages, [filteredIndex]: "Contract not loaded. Please try again later." });
        return;
      }
  
      const campaignToDonate = validCampaigns[filteredIndex];
      const originalIndex = campaigns?.findIndex(
        (campaign: any) => campaign === campaignToDonate
      );
  
      if (originalIndex === -1 || originalIndex === undefined) {
        setMessages({ ...messages, [filteredIndex]: "Campaign not found." });
        return;
      }
  
      if (Date.now() / 1000 > campaignToDonate.deadline) {
        setMessages({ ...messages, [filteredIndex]: "This campaign is no longer active." });
        return;
      }
  
      const targetInEth = ethers.utils.formatEther(campaignToDonate.target.toString());
      const collectedInEth = ethers.utils.formatEther(campaignToDonate.amountCollected.toString());
      const progress = (Number(collectedInEth) / Number(targetInEth)) * 100;
  
      // Verificăm dacă campania a atins 100% din scopul de finanțare
      if (progress >= 100) {
        setMessages({
          ...messages,
          [filteredIndex]: "This campaign has already reached its funding goal. Donations are no longer accepted.",
        });
        return;
      }
  
      const amountInWei = ethers.utils.parseEther(amount);
  
      if (amountInWei.lte(0)) {
        setMessages({ ...messages, [filteredIndex]: "Donation amount must be greater than 0." });
        return;
      }
  
      const data = contract.encoder.encode("donateToCampaign", [originalIndex]);
  
      const transaction = {
        from: address,
        to: CROWDFUNDING_CONTRACT_ADDRESS,
        value: amountInWei.toString(),
        data: data,
      };
  
      const estimatedGas = await web3.eth.estimateGas(transaction);
      const gasPrice = await web3.eth.getGasPrice();
  
      const estimatedGasCostInEth = web3.utils.fromWei(
        (BigInt(estimatedGas) * BigInt(gasPrice)).toString(),
        "ether"
      );
  
      const maxGasCost = 0.01;
  
      if (parseFloat(estimatedGasCostInEth) > maxGasCost) {
        setMessages({
          ...messages,
          [filteredIndex]: `Gas cost too high: ${estimatedGasCostInEth} ETH. Transaction not allowed.`,
        });
        return;
      }
  
      setMessages({
        ...messages,
        [filteredIndex]: `Transaction allowed! Estimated gas cost: ${estimatedGasCostInEth} ETH.`,
      });
  
      await donateToCampaign({ args: [originalIndex], overrides: { value: amountInWei } });
  
      setMessages({
        ...messages,
        [filteredIndex]: `Successfully donated ${amount} ETH! 1% of donations go to platform maintenance and development.`,
      });
      setDonationAmounts({ ...donationAmounts, [filteredIndex]: "" });
    } catch (error: any) {
      console.error("Failed to donate:", error);
  
      const errorMessage =
        error?.message?.includes("insufficient funds")
          ? "Insufficient funds in your wallet. Please ensure you have enough ETH to cover the donation and gas fees."
          : "Something went wrong. Please try again.";
  
      setMessages({ ...messages, [filteredIndex]: errorMessage });
    }
  };
  
  
  
  
  
  const handleDelete = async (filteredIndex: number) => {
    const campaignToDelete = validCampaigns[filteredIndex];
    const originalIndex = campaigns?.findIndex(
      (campaign: any) => campaign === campaignToDelete
    );

    if (originalIndex === -1) {
      alert("Error: Campaign not found.");
      return;
    }

    if (window.confirm("Are you sure you want to delete this campaign?")) {
      try {
        await deleteCampaign({ args: [originalIndex] });
        alert("Campaign deleted successfully!");
        window.location.reload(); 
      } catch (error) {
        console.error("Failed to delete campaign:", error);
      }
    }
  };

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
      <div
        style={{
          padding: "6rem 2rem",
          textAlign: "center",
        }}
      >
        <h2
          className="text-4xl font-bold"
          style={{ color: "#ffc0cb", fontSize:"50px", marginTop:"-50px", marginBottom:"50px"}}
        >
          Our Campaigns
        </h2>
        {validCampaigns?.length === 0 && <p>No campaigns found.</p>}
        {validCampaigns?.map((campaign: any, filteredIndex: number) => {
          const targetInEth = ethers.utils.formatEther(campaign.target.toString());
          const collectedInEth = ethers.utils.formatEther(campaign.amountCollected.toString());
          const progress = (Number(collectedInEth) / Number(targetInEth)) * 100; // Calculate progress percentage
  
          return (
            <div
              key={filteredIndex}
              style={{
                margin: "1rem auto",
                border: "1px solid #444",
                padding: "1rem",
                backgroundColor:"#3e3644",
                borderRadius: "10px",
                maxWidth: "600px", 
              }}
            >
              <h3 style={{fontSize:"25px", color:"#ffc0cb", fontWeight:"500"}}>{campaign.title}</h3>
              <p style={{color:"#e1bbc2"}}>{campaign.description}</p>
              <img
                src={campaign.image || "https://via.placeholder.com/200"}
                alt={campaign.title}
                style={{
                  maxWidth: "100%",
                  marginBottom: "1rem",
                  marginTop: "1rem",
                  display: "block",
                  borderRadius: "8px",
                }}
              />
              <p style={{color:"#e1bbc2"}}>
                <strong>Owner:</strong> {campaign.owner}
              </p>
              <p style={{color:"#e1bbc2"}}>
                <strong>Target:</strong> {targetInEth} ETH
              </p>
              <p style={{color:"#e1bbc2"}}>
                <strong>Deadline:</strong> {new Date(campaign.deadline * 1000).toLocaleDateString()}
              </p>
              <p style={{color:"#e1bbc2"}}>
                <strong>Amount Collected:</strong> {collectedInEth} ETH
              </p>
  
              {/* Progress Bar */}
              <div
                style={{
                  background: "#e0e0e0",
                  borderRadius: "5px",
                  overflow: "hidden",
                  margin: "1rem 0",
                }}
              >
                <div
                  style={{
                    width: `${Math.min(progress, 100)}%`,
                    background: progress >= 100 ? "green" : "blue", // verde daca avem 100%
                    height: "10px",
                  }}
                ></div>
              </div>
              <p style={{color:"#e1bbc2"}}>{Math.min(progress, 100).toFixed(2)}% funded</p>
  
              {/* Donation Form */}
              {progress < 100 ? (
                <div style={{ marginTop: "1rem" }}>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Amount (ETH)"
                    value={donationAmounts[filteredIndex] || ""}
                    onChange={(e) =>
                      setDonationAmounts({ ...donationAmounts, [filteredIndex]: e.target.value })
                    }
                    className="border border-zinc-600 bg-zinc-800 text-white px-1 py-1 w-32"
                  />
                  <button
                    onClick={() =>
                      handleDonate(filteredIndex, donationAmounts[filteredIndex] || "0")
                    }
                    className="bg-[#b3888d] text-white py-1 px-4 ml-1 rounded"
                  >
                    Donate
                  </button>
                </div>
              ) : (
                <p style={{ color: "green", marginTop: "1rem" }}>
                  This campaign has reached its funding goal. Thank you for your support!
                </p>
              )}

  
              {/* Success/Error Message */}
              {messages[filteredIndex] && (
                <p
                  style={{
                    color: messages[filteredIndex].includes("Successfully") || 
                          messages[filteredIndex].includes("Transaction allowed")
                      ? "green"
                      : "red",
                    marginTop: "1rem",
                  }}
                >
                  {messages[filteredIndex]}
                </p>
              )}
  
              {/* Edit/Delete Buttons (Only for Owner) */}
              {address === campaign.owner && (
                <div style={{ marginTop: "1rem" }}>
                  <Link
                    to={`/edit-campaign/${filteredIndex}`}
                    style={{
                      marginLeft: "1rem",
                      color: "white",
                      backgroundColor: "#8e6470",
                      padding: "0.7rem 1.2rem",
                      border: "none",
                      cursor: "pointer",
                      borderRadius: "0.3rem",
                    }}
                  >
                    Edit Campaign
                  </Link>
                  <button
                    onClick={() => handleDelete(filteredIndex)}
                    style={{
                      marginLeft: "1rem",
                      color: "white",
                      backgroundColor: "#8e6470",
                      padding: "0.5rem 1rem",
                      border: "none",
                      cursor: "pointer",
                      borderRadius: "0.3rem",
                    }}
                  >
                    Delete Campaign
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
  
}
