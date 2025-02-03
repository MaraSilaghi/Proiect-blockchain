import React, { useState, useEffect } from "react";
import backgroundImg from "../assets/background.png";
import { useContract, useContractWrite, useAddress  } from "@thirdweb-dev/react";
import { ethers } from "ethers";
import { Link } from "react-router-dom";
import Web3 from "web3";
import "../index.css";

const CROWDFUNDING_CONTRACT_ADDRESS = "0xf4E034e4CeDd516CE0D8951e8598969Cc826f40e";
const COMMISSION_MANAGER_CONTRACT_ADDRESS = "0x0e936c30BCd0a974cd96d6da4a206ee7Deb4551E";

const web3 = new Web3(window.ethereum);

export function CampaignList() {
  
  const { contract: crowdfundingContract } = useContract(CROWDFUNDING_CONTRACT_ADDRESS);
  const { contract: commissionContract } = useContract(COMMISSION_MANAGER_CONTRACT_ADDRESS);

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isCampaignsLoading, setIsCampaignsLoading] = useState(true);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);

  const [currentCommission, setCurrentCommission] = useState<any>(null);
  const [isCommissionLoading, setIsCommissionLoading] = useState(true);
  const [commissionError, setCommissionError] = useState<string | null>(null);
  const [ownerAddress, setOwnerAddress] = useState<string | null>(null);

  const { mutateAsync: donateToCampaign } = useContractWrite(crowdfundingContract, "donateToCampaign");
  const { mutateAsync: withdrawAmountFn } = useContractWrite(commissionContract, "withdrawAmount");

  const address = useAddress();

  const [donationAmounts, setDonationAmounts] = useState<{ [key: number]: string }>({});
  const [messages, setMessages] = useState<{ [key: number]: string }>({});


  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMessage, setWithdrawMessage] = useState("");

  //fetch manual, fara useread
  useEffect(() => {
    if (!crowdfundingContract) return;

    const fetchCampaigns = async () => {
      try {
        setIsCampaignsLoading(true);
        setCampaignsError(null);

        if (!crowdfundingContract) return;
        const result = await crowdfundingContract.call("getCampaigns");
         // Fetch target in ETH for each campaign
        const updatedCampaigns = await Promise.all(
        result.map(async (campaign: any) => {
          const targetInUSD = ethers.BigNumber.from(campaign.targetInUSD);
          const targetInETH = await crowdfundingContract.call("convertUSDtoWEI", [targetInUSD]);
          const targetInETHRescaled = ethers.utils.formatEther(targetInETH);
          const collectedInEth = ethers.utils.formatEther(campaign.amountCollected.toString());
          const progress = (Number(collectedInEth) / targetInETH) * 100;
          console.log("Progress:", progress, "Target in ETH:", targetInETHRescaled, "Collected in ETH:", collectedInEth);

          return {
            ...campaign,
            targetInETH: targetInETHRescaled, // Target in ETH
            progress
          };
        })
      );

        setCampaigns(updatedCampaigns);
      } catch (err) {
        console.error("Error reading campaigns:", err);
        setCampaignsError("Failed to load campaigns");
      } finally {
        setIsCampaignsLoading(false);
      }
    }

    fetchCampaigns();
  }, [crowdfundingContract]);

  useEffect(() => {
    if (!commissionContract) return;

    async function fetchCommissionData() {
      try {
        setIsCommissionLoading(true);
        setCommissionError(null);
        if (!commissionContract) return;
        const comm = await commissionContract.call("getCurrentTotalAccumulated");
        const own = await commissionContract.call("owner");

        setCurrentCommission(comm);
        setOwnerAddress(own);
      } catch (err) {
        console.error("Error reading commission data:", err);
        setCommissionError("Failed to load commission data");
      } finally {
        setIsCommissionLoading(false);
      }
    }

    fetchCommissionData();
  }, [commissionContract]);

  if (!crowdfundingContract) {
    return <div>Loading Crowdfunding contract...</div>;
  }
  if (!commissionContract) {
    return <div>Loading Commission contract...</div>;
  }

  if (isCampaignsLoading) {
    return <div>Loading campaigns...</div>;
  }
  if (campaignsError) {
    return <div>{campaignsError}</div>;
  }

  const validCampaigns = campaigns.filter(
    (campaign: any) => campaign.owner !== "0x0000000000000000000000000000000000000000"
  );

  const handleDonate = async (filteredIndex: number, amount: string) => {
    try {
      if (!address) {
        setMessages((prev) => ({
          ...prev,
          [filteredIndex]: "You need to connect your wallet to make a donation.",
        }));
        return;
      }

      if (!crowdfundingContract) {
        setMessages((prev) => ({
          ...prev,
          [filteredIndex]: "Crowdfunding contract not loaded.",
        }));
        return;
      }

      const campaignToDonate = validCampaigns[filteredIndex];
      const originalIndex = filteredIndex;

      if (Date.now() / 1000 > campaignToDonate.deadline) {
        setMessages((prev) => ({
          ...prev,
          [filteredIndex]: "This campaign is no longer active.",
        }));
        return;
      }

      const targetInEth = campaignToDonate.targetInETH;
      const collectedInEth = ethers.utils.formatEther(campaignToDonate.amountCollected.toString());
      const progress = (Number(collectedInEth) / Number(targetInEth)) * 100;
      if (progress >= 100) {
        setMessages((prev) => ({
          ...prev,
          [filteredIndex]: "This campaign reached its funding goal. Donations closed.",
        }));
        return;
      }

      const amountInWei = ethers.utils.parseEther(amount);
      if (amountInWei.lte(0)) {
        setMessages((prev) => ({
          ...prev,
          [filteredIndex]: "Donation amount must be greater than 0.",
        }));
        return;
      }

      const data = crowdfundingContract.encoder.encode("donateToCampaign", [originalIndex]);
      const tx = {
        from: address,
        to: CROWDFUNDING_CONTRACT_ADDRESS,
        value: amountInWei.toString(),
        data,
      };
      const estimatedGas = await web3.eth.estimateGas(tx);
      const gasPrice = await web3.eth.getGasPrice();
      const estimatedGasCostInEth = ethers.utils.formatEther(
        (BigInt(estimatedGas) * BigInt(gasPrice)).toString()
      );

      const maxGasCost = 0.01;
      if (parseFloat(estimatedGasCostInEth) > maxGasCost) {
        setMessages((prev) => ({
          ...prev,
          [filteredIndex]: `Gas too high: ${estimatedGasCostInEth} ETH.`,
        }));
        return;
      }

      setMessages((prev) => ({
        ...prev,
        [filteredIndex]: `Transaction allowed! Gas ~${estimatedGasCostInEth} ETH.`,
      }));


      await donateToCampaign({ args: [originalIndex], overrides: { value: amountInWei } });

      setMessages((prev) => ({
        ...prev,
        [filteredIndex]: `Successfully donated ${amount} ETH!`,
      }));
      setDonationAmounts((prev) => ({ ...prev, [filteredIndex]: "" }));

    } catch (error: any) {
      console.error("Failed to donate:", error);
      const errorMessage = error?.message?.includes("insufficient funds")
        ? "Insufficient funds for donation + gas."
        : "Something went wrong. Please try again.";
      setMessages((prev) => ({ ...prev, [filteredIndex]: errorMessage }));
    }
  };

  const handleWithdraw = async () => {
    try {
      if (!address) {
        setWithdrawMessage("You need to connect your wallet.");
        return;
      }
      if (!commissionContract) {
        setWithdrawMessage("CommissionManager contract not loaded.");
        return;
      }

      const amountInWei = ethers.utils.parseEther(withdrawAmount);
      if (amountInWei.lte(0)) {
        setWithdrawMessage("Amount must be > 0.");
        return;
      }

      const currentCommBN = currentCommission || ethers.BigNumber.from("0");
      if (amountInWei.gt(currentCommBN)) {
        setWithdrawMessage("Not enough commission funds available.");
        return;
      }

      const data = commissionContract.encoder.encode("withdrawAmount", [address, amountInWei]);
      const tx = {
        from: address,
        to: COMMISSION_MANAGER_CONTRACT_ADDRESS,
        data,
      };

      const estimatedGas = await web3.eth.estimateGas(tx);
      const gasPrice = await web3.eth.getGasPrice();
      const estimatedGasCostInEth = ethers.utils.formatEther(
        (BigInt(estimatedGas) * BigInt(gasPrice)).toString()
      );

      const maxGasCost = 0.01;
      if (parseFloat(estimatedGasCostInEth) > maxGasCost) {
        setWithdrawMessage(`Gas cost too high: ${estimatedGasCostInEth} ETH. Not allowed.`);
        return;
      }

      setWithdrawMessage(`Transaction allowed! Gas ~${estimatedGasCostInEth} ETH.`);

      await withdrawAmountFn({ args: [address, amountInWei] });
      setWithdrawMessage(`Successfully withdrew ${withdrawAmount} ETH.`);
      setWithdrawAmount("");
    } catch (error) {
      console.error("Failed to withdraw commissions:", error);
      setWithdrawMessage("Something went wrong. Please try again.");
    }
  };

  return (
    <div
      className="campaigns-container"
      style={{ backgroundImage: `url(${backgroundImg})` }}
    >
      <div style={{ padding: "6rem 2rem 2rem 2rem", textAlign: "center" }}>
        <h2 className="campaigns-title">Our Campaigns</h2>

        {validCampaigns.length === 0 && <p>No campaigns found.</p>}

        {validCampaigns.map((campaign: any, filteredIndex: number) => {
          const imageHash = campaign.imageIPFSHash || "";
          const targetInUSD = Number(campaign.targetInUSD);
          const collectedInEth = ethers.utils.formatEther(campaign.amountCollected.toString());
          const progress = (Number(collectedInEth) / Number(campaign.targetInETH)) * 100;

          return (
            <div className="campaign-card" key={filteredIndex}>
              <h3 style={{ fontSize: "25px", color: "#ffc0cb", fontWeight: "500" }}>
                {campaign.title}
              </h3>
              <p style={{ color: "#e1bbc2" }}>{campaign.description}</p>
              <img
                className="campaign-image"
                src={imageHash ? `https://ipfs.io/ipfs/${imageHash}` : "https://via.placeholder.com/200"}
                alt={campaign.title}
              />
              <p style={{ color: "#e1bbc2" }}>
                <strong>Owner:</strong> {campaign.owner}
              </p>
              <p style={{ color: "#e1bbc2" }}>
                <strong>Target:</strong> {targetInUSD} USD
              </p>
              <p style={{ color: "#e1bbc2" }}>
                <strong>Target in ETH:</strong> {campaign.targetInETH} ETH
              </p>
              <p style={{ color: "#e1bbc2" }}>
                <strong>Deadline:</strong> {new Date(campaign.deadline * 1000).toLocaleDateString()}
              </p>
              <p style={{ color: "#e1bbc2" }}>
                <strong>Amount Collected:</strong> {collectedInEth} ETH
              </p>

              <div className="progress-bar">
                <div
                  style={{
                    width: `${Math.min(progress, 100)}%`,
                    background: progress >= 100 ? "green" : "blue",
                    height: "10px",
                  }}
                />
              </div>
              <p style={{ color: "#e1bbc2" }}>{Math.min(progress, 100).toFixed(2)}% funded</p>

              {progress < 100 ? (
                <div style={{ marginTop: "1rem" }}>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Amount (ETH)"
                    value={donationAmounts[filteredIndex] || ""}
                    onChange={(e) =>
                      setDonationAmounts((prev) => ({
                        ...prev,
                        [filteredIndex]: e.target.value,
                      }))
                    }
                    className="border border-zinc-600 bg-zinc-800 text-white px-1 py-1 w-32"
                  />
                  <button
                    onClick={() => handleDonate(filteredIndex, donationAmounts[filteredIndex] || "0")}
                    className="bg-[#b3888d] text-white py-1 px-4 ml-1 rounded"
                  >
                    Donate
                  </button>
                </div>
              ) : (
                <p style={{ color: "green", marginTop: "1rem" }}>
                  This campaign has reached its funding goal. Thank you!
                </p>
              )}

              {messages[filteredIndex] && (
                <p
                  style={{
                    color:
                      messages[filteredIndex].includes("Successfully") ||
                      messages[filteredIndex].includes("Transaction allowed")
                        ? "green"
                        : "red",
                    marginTop: "1rem",
                  }}
                >
                  {messages[filteredIndex]}
                </p>
              )}

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
                </div>
              )}
            </div>
          );
        })}

        {commissionError && <p style={{ color: "red" }}>{commissionError}</p>}

        {address?.toLowerCase() === ownerAddress?.toLowerCase() && (
          <div
            style={{
              marginTop: "2rem",
              padding: "1rem",
              borderRadius: "10px",
              backgroundColor: "#4a3c56",
              maxWidth: "500px",
              margin: "auto",
              textAlign: "center",
            }}
          >
            <h3 style={{ color: "#ffc0cb" }}>Commission Management</h3>
            {isCommissionLoading ? (
              <p>Loading commission data...</p>
            ) : (
              <p style={{ color: "#e1bbc2" }}>
                <strong>Current Commissions:</strong>{" "}
                {currentCommission
                  ? ethers.utils.formatEther(currentCommission)
                  : "0"}{" "}
                ETH
              </p>
            )}

            <input
              type="number"
              step="0.01"
              placeholder="Amount to withdraw (ETH)"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              style={{
                backgroundColor: "#51465a",
                border: "1px solid #e1bbc2",
                color: "#fff",
                borderRadius: "5px",
                width: "100%",
                padding: "0.5rem",
                marginTop: "1rem",
              }}
            />
            <button
              onClick={handleWithdraw}
              style={{
                backgroundColor: "#b3888d",
                color: "#fff",
                marginTop: "1rem",
                padding: "0.7rem 1.2rem",
                borderRadius: "0.3rem",
              }}
            >
              Withdraw Commissions
            </button>

            {withdrawMessage && (
              <p
                style={{
                  marginTop: "1rem",
                  color:
                    withdrawMessage.includes("Successfully") ||
                    withdrawMessage.includes("Transaction allowed")
                      ? "green"
                      : "red",
                }}
              >
                {withdrawMessage}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
