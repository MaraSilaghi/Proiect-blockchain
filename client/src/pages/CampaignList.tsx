import React, { useState, useEffect } from "react";
import backgroundImg from "../assets/background.png";
import { useContract, useContractWrite, useAddress  } from "@thirdweb-dev/react";
import { useCampaigns } from "../contexts/CampaignsContext";
import { ethers } from "ethers";
import { Link } from "react-router-dom";
import Web3 from "web3";
import CampaignCard from "../components/CampaignCard";
import "../index.css";

const CROWDFUNDING_CONTRACT_ADDRESS = "0xf4E034e4CeDd516CE0D8951e8598969Cc826f40e";
const COMMISSION_MANAGER_CONTRACT_ADDRESS = "0x0e936c30BCd0a974cd96d6da4a206ee7Deb4551E";

const web3 = new Web3(window.ethereum);

export function CampaignList() {
  
  const { contract: crowdfundingContract } = useContract(CROWDFUNDING_CONTRACT_ADDRESS);
  const { contract: commissionContract } = useContract(COMMISSION_MANAGER_CONTRACT_ADDRESS);

  const { campaigns, isCampaignsLoading, campaignsError } = useCampaigns();

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

  return (
    <div
      className="campaigns-container"
      style={{ backgroundImage: `url(${backgroundImg})` }}
    >
      <div style={{ padding: "6rem 2rem 2rem 2rem", textAlign: "center" }}>
        <h2 className="campaigns-title">Our Campaigns</h2>

        {validCampaigns.length === 0 && <p>No campaigns found.</p>}

        <div className="campaigns-grid">
          {validCampaigns.map((campaign, filteredIndex) => (
            <Link to={`/campaign-details/${filteredIndex}`} key={filteredIndex} style={{ textDecoration: "none" }}>
              <CampaignCard
                campaign={campaign}
                index={filteredIndex}
                donationAmounts={donationAmounts}
                setDonationAmounts={setDonationAmounts}
                handleDonate={handleDonate}
                messages={messages}
                address={address}
              />
            </Link>
          ))}
        </div>

        {commissionError && <p style={{ color: "red" }}>{commissionError}</p>}
      </div>
    </div>
  );
}
