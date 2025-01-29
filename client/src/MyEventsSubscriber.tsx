// MyEventsSubscriber.tsx
import React, { useState } from "react";
import { useContract } from "@thirdweb-dev/react";
import { useCrowdfundingEvents } from "./useCrowdfundingEvents";

const CROWDFUNDING_CONTRACT_ADDRESS = "0xee4bc32b70DB3df04974D379319F937D7376D8Ce"; 

export function MyEventsSubscriber() {
  const { contract } = useContract(CROWDFUNDING_CONTRACT_ADDRESS);
  const [log, setLog] = useState<string[]>([]);

  useCrowdfundingEvents(
    contract,
    ({ id, owner, title }) => {
      const msg = `Created => id=${id.toString()} owner=${owner} title=${title}`;
      setLog((prev) => [...prev, msg]);
    },
    ({ id, newTitle, newDescription }) => {
      const msg = `Edited => id=${id.toString()} newTitle=${newTitle} newDescription=${newDescription}`;
      setLog((prev) => [...prev, msg]);
    },
    ({ id, owner }) => {
      const msg = `Deleted => id=${id.toString()} by owner=${owner}`;
      setLog((prev) => [...prev, msg]);
    },
    ({ campaignId, donator, amount, donatorShare }) => {
      const msg = `Donation => campaignId=${campaignId.toString()} from=${donator} amount=${amount.toString()} share=${donatorShare.toString()}% (?)`;
      setLog((prev) => [...prev, msg]);
    }
  );

  return null;
}
