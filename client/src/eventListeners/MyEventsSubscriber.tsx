import React, { useState } from "react";
import { useContract } from "@thirdweb-dev/react";
import { useCrowdfundingEvents } from "./useCrowdfundingEvents";
import { ethers } from "ethers";

const CROWDFUNDING_CONTRACT_ADDRESS = "0xDefB6Fa28D467a7F09d52695416c61624e6193B8";

export function MyEventsSubscriber() {
  const { contract } = useContract(CROWDFUNDING_CONTRACT_ADDRESS);
  const [log, setLog] = useState<string[]>([]);

  useCrowdfundingEvents(
    contract,
    ({ id, owner, title }) => {
      const msg = `[Created] id=${id.toString()} | owner=${owner} | title=${title}`;
      setLog((prev) => [...prev, msg]);
    },
    ({ id, newTitle, newDescription }) => {
      const msg = `[Edited] id=${id.toString()} | newTitle=${newTitle} | newDescription=${newDescription}`;
      setLog((prev) => [...prev, msg]);
    },
    ({ campaignId, donator, amount, donatorShare }) => {
      const formattedAmount = ethers.utils.formatEther(amount);
      const msg = `[Donation] campaignId=${campaignId.toString()} | from=${donator} | amount=${formattedAmount} ETH | share=${donatorShare.toString()}%`;
      setLog((prev) => [...prev, msg]);
    },
    ({ campaignId, owner, amount }) => {
      const formattedAmount = ethers.utils.formatEther(amount);
      const msg = `[Withdrawal] campaignId=${campaignId.toString()} | owner=${owner} | amount=${formattedAmount} ETH`;
      setLog((prev) => [...prev, msg]);
    }
  );

  return null;
}
