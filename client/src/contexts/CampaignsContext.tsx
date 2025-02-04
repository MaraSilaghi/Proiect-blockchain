import React, { createContext, useContext, useEffect, useState } from "react";
import { useContract } from "@thirdweb-dev/react";
import { ethers } from "ethers";

const CROWDFUNDING_CONTRACT_ADDRESS = "0xDefB6Fa28D467a7F09d52695416c61624e6193B8";

const CampaignContext = createContext();

export const CampaignProvider = ({ children }) => {
  const { contract: crowdfundingContract } = useContract(CROWDFUNDING_CONTRACT_ADDRESS);
  const [campaigns, setCampaigns] = useState([]);
  const [isCampaignsLoading, setIsCampaignsLoading] = useState(true);
  const [campaignsError, setCampaignsError] = useState(null);

  const fetchCampaigns = async () => {
    if (!crowdfundingContract) return;
    
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

          return { 
            ...campaign, 
            targetInETH: Number(targetInETHRescaled).toFixed(2), 
            progress, 
            daysLeft, 
            collectedInEth 
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
  };

  useEffect(() => {
    fetchCampaigns();
  }, [crowdfundingContract]);

  return (
    <CampaignContext.Provider value={{ campaigns, isCampaignsLoading, campaignsError, fetchCampaigns }}>
      {children}
    </CampaignContext.Provider>
  );
};

export const useCampaigns = () => {
  const context = useContext(CampaignContext);
  if (!context) {
    throw new Error("useCampaigns must be used within a CampaignProvider");
  }
  return context;
};
