import React, { useState } from "react";
import { useContract } from "@thirdweb-dev/react";
import { useCommissionManagerEvents } from "./useCommissionManagerEvents";
import { ethers } from "ethers";

const COMMISSION_MANAGER_CONTRACT_ADDRESS = "0x0e936c30BCd0a974cd96d6da4a206ee7Deb4551E";

export function CommissionEventsSubscriber() {
  const { contract } = useContract(COMMISSION_MANAGER_CONTRACT_ADDRESS);
  const [log, setLog] = useState<string[]>([]);

  useCommissionManagerEvents(
    contract,
    ({ from, amount }) => {
      const msg = `[Commission Received] from=${from}, amount=${amount} ETH`;
      setLog((prev) => [...prev, msg]);
    },
    ({ to, amount }) => {
      const msg = `[Commission Withdrawn] to=${to}, amount=${amount} ETH`;
      setLog((prev) => [...prev, msg]);
    }
  );

  return null;
}
