import React from "react";
import { useContract } from "@thirdweb-dev/react";
import { useCommissionManagerEvents } from "./useCommissionManagerEvents";
import { ethers } from "ethers";

const COMMISSION_MANAGER_CONTRACT_ADDRESS = "0xcc18199880857880365C71831c8e8e9048238000";

export function CommissionEventsSubscriber() {

  const { contract } = useContract(COMMISSION_MANAGER_CONTRACT_ADDRESS);
  useCommissionManagerEvents(
    contract,
    
    ({ from, amount }) => {
      const formattedAmount = ethers.utils.formatEther(amount); 
      console.log(`CommissionReceived => from=${from} | amount=${formattedAmount} ETH`);
    },

    ({ to, amount }) => {
      const formattedAmount = ethers.utils.formatEther(amount); 
      console.log(`CommissionWithdrawn => to=${to} | amount=${formattedAmount} ETH`);
    }
  );
  return null;
}
