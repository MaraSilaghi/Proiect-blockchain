import React, { useState } from "react";
import {
  useAddress,
  useContract,
  useContractWrite,
} from "@thirdweb-dev/react";

// Replace with your actual deployed Crowdfunding address on Sepolia
const CROWDFUNDING_CONTRACT_ADDRESS = "0xee4bc32b70DB3df04974D379319F937D7376D8Ce";

export function TestCrowdfunding() {
  // Local error state (our own)
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreatingLocal, setIsCreatingLocal] = useState(false);

  // 1) Load the contract
  const {
    contract,
    isLoading: isContractLoading,
    error: contractError,
  } = useContract(CROWDFUNDING_CONTRACT_ADDRESS);

  // 2) Prepare the createCampaign transaction
  const {
    mutateAsync: createCampaign,
    isLoading: isCreatingHook,
    error: txError,
  } = useContractWrite(contract, "createCampaign");

  // 3) Wallet address
  const address = useAddress();

  // 4) Our custom "Create Campaign" function
  const handleCreateCampaign = async () => {
    try {
      // Reset local error
      setErrorMessage(null);
      setIsCreatingLocal(true);

      // Example: 1 week from now
      const oneWeekFromNow = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;

      await createCampaign({
        args: [
          address || "0x0000000000000000000000000000000000000000",
          "Test Campaign",
          "Testing from the front-end",
          "1000000000000000000", // 1 ETH in wei (as an example)
          oneWeekFromNow,
          "https://example.com",
        ],
      });

      alert("Campaign created successfully!");
    } catch (err) {
      console.error("createCampaign() error:", err);
      // If err is an Error object, get its message. Otherwise, fallback.
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Unknown error occurred. Check console.");
      }
    } finally {
      setIsCreatingLocal(false);
    }
  };

  // 5) If the contract is still loading from the network, show a quick message
  if (isContractLoading) {
    return <div>Loading Crowdfunding contract...</div>;
  }

  // 6) Decide if we should show "Creating..." or "Create Campaign"
  const buttonLabel = isCreatingLocal || isCreatingHook ? "Creating..." : "Create Campaign";

  // 7) Disable button if:
  //   - No wallet connected
  //   - Contract not loaded
  //   - Transaction is in progress
  const isButtonDisabled =
    !address || !contract || isCreatingLocal || isCreatingHook;

  return (
    <div style={{ textAlign: "center" }}>
      <button
        onClick={handleCreateCampaign}
        disabled={isButtonDisabled}
        className="bg-violet-600 hover:bg-violet-700 text-white font-medium py-2 px-4 rounded"
      >
        {buttonLabel}
      </button>
    </div>
  );
}
