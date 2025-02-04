import React, { createContext, useContext, useEffect, useState } from "react";
import { useContract } from "@thirdweb-dev/react";
import { ethers } from "ethers";

const CROWDFUNDING_CONTRACT_ADDRESS = "0xf4E034e4CeDd516CE0D8951e8598969Cc826f40e";

const CampaignContext = createContext();

export const CampaignProvider = ({ children }) => {
  const { contract: crowdfundingContract } = useContract(CROWDFUNDING_CONTRACT_ADDRESS);
  const [campaigns, setCampaigns] = useState([]);
  const [isCampaignsLoading, setIsCampaignsLoading] = useState(true);
  const [campaignsError, setCampaignsError] = useState(null);

  useEffect(() => {
    if (!crowdfundingContract) return;

    const fetchCampaigns = async () => {
      try {
        setIsCampaignsLoading(true);
        setCampaignsError(null);
        
        const result = await crowdfundingContract.call("getCampaigns");
        
        const updatedCampaigns = await Promise.all(
          result.map(async (campaign) => {
            const targetInUSD = ethers.BigNumber.from(campaign.targetInUSD);
            const targetInETH = await crowdfundingContract.call("convertUSDtoWEI", [targetInUSD]);
            const targetInETHRescaled = ethers.utils.formatEther(targetInETH);
            const collectedInEth = ethers.utils.formatEther(campaign.amountCollected.toString());
            const daysLeft = Math.floor((campaign.deadline - Date.now() / 1000) / 86400);
            const progress = (Number(collectedInEth) / targetInETH) * 100;

            return { ...campaign, targetInETH: Number(targetInETHRescaled).toFixed(2), progress, daysLeft, collectedInEth };
          })
        );

        setCampaigns(updatedCampaigns);
      } catch (err) {
        console.error("Error reading campaigns:", err);
        setCampaignsError("Failed to load campaigns");
      } finally {
        setIsCampaignsLoading(false);
      }
    };

    fetchCampaigns();
  }, [crowdfundingContract]);

  return (
    <CampaignContext.Provider value={{ campaigns, isCampaignsLoading, campaignsError }}>
      {children}
    </CampaignContext.Provider>
  );
};

export const useCampaigns = () => useContext(CampaignContext);