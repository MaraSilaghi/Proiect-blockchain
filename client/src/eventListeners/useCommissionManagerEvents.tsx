
import { useEffect, useRef } from "react";
import { SmartContract } from "@thirdweb-dev/react";
import { ethers } from "ethers";

type OnCommissionReceived = (data: { from: string; amount: any }) => void;
type OnCommissionWithdrawn = (data: { to: string; amount: any }) => void;

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
      onCommissionReceived?.({ from, amount });
    };

    const handleCommissionWithdrawn = (event: any) => {
      const { to, amount } = event.data;
       const formattedAmount = ethers.utils.formatEther(amount); 
      window.alert(
        `EventListener: CommissionWithdrawn => to=${to} | amount=${formattedAmount} ETH}`
      );
      onCommissionWithdrawn?.({ to, amount });
    };

    contract.events.addEventListener("CommissionReceived", handleCommissionReceived);
    contract.events.addEventListener("CommissionWithdrawn", handleCommissionWithdrawn);

    return () => {
      contract.events.removeEventListener("CommissionReceived", handleCommissionReceived);
      contract.events.removeEventListener("CommissionWithdrawn", handleCommissionWithdrawn);
    };
  }, [contract, onCommissionReceived, onCommissionWithdrawn]);
}
