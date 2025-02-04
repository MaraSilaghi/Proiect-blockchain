import { useEffect, useRef } from "react";
import { SmartContract } from "@thirdweb-dev/react";
import { ethers } from "ethers";

type OnCommissionReceived = (data: { from: string; amount: string }) => void;
type OnCommissionWithdrawn = (data: { to: string; amount: string }) => void;

export function useCommissionManagerEvents(
  contract: SmartContract | undefined,
  onCommissionReceived?: OnCommissionReceived,
  onCommissionWithdrawn?: OnCommissionWithdrawn
) {
  const attachedRef = useRef(false);

  useEffect(() => {
    if (!contract) return;
    if (attachedRef.current) return;
    attachedRef.current = true;

    const handleCommissionReceived = (event: any) => {
      const { from, amount } = event.data;
      const formattedAmount = ethers.utils.formatEther(amount);
      console.log(`[Event] CommissionReceived => from=${from}, amount=${formattedAmount} ETH`);
      onCommissionReceived?.({ from, amount: formattedAmount });
    };

    const handleCommissionWithdrawn = (event: any) => {
      const { to, amount } = event.data;
      const formattedAmount = ethers.utils.formatEther(amount);
      console.log(`[Event] CommissionWithdrawn => to=${to}, amount=${formattedAmount} ETH`);
      onCommissionWithdrawn?.({ to, amount: formattedAmount });
    };

    contract.events.addEventListener("CommissionReceived", handleCommissionReceived);
    contract.events.addEventListener("CommissionWithdrawn", handleCommissionWithdrawn);

    return () => {
      contract.events.removeEventListener("CommissionReceived", handleCommissionReceived);
      contract.events.removeEventListener("CommissionWithdrawn", handleCommissionWithdrawn);
    };
  }, [contract, onCommissionReceived, onCommissionWithdrawn]);
}
