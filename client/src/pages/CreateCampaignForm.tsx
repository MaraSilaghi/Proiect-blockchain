import React, { useState } from "react";
import backgroundImg from "../assets/background.png";
import {
  useAddress,
  useContract,
  useContractWrite,
} from "@thirdweb-dev/react";
import { ethers } from "ethers";
import Web3 from "web3";
import "../index.css";

const web3 = new Web3(window.ethereum);

const CROWDFUNDING_CONTRACT_ADDRESS = "0xee4bc32b70DB3df04974D379319F937D7376D8Ce";

export function CreateCampaignForm() {
  const address = useAddress();
  const { contract } = useContract(CROWDFUNDING_CONTRACT_ADDRESS);

  const { mutateAsync: createCampaign, isLoading: isCreating } =
    useContractWrite(contract, "createCampaign");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [image, setImage] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  

    if (!address) {
      setErrorMessage("You need to connect your wallet to create a campaign.");
      setSuccessMessage(null);
      return;
    }
  
    if (!contract) {
      setErrorMessage("Contract is not loaded. Please wait or refresh the page.");
      setSuccessMessage(null);
      return;
    }
  
    try {
      setErrorMessage(null);
      setSuccessMessage(null);
  
      const targetInWei = ethers.utils.parseEther(target);
      const deadlineTimestamp = Math.floor(new Date(deadline).getTime() / 1000);
  
      const data = contract.encoder.encode("createCampaign", [
        address,
        title,
        description,
        targetInWei.toString(),
        deadlineTimestamp,
        image,
      ]);
  
      const transaction = {
        from: address,
        to: CROWDFUNDING_CONTRACT_ADDRESS,
        data: data,
      };
  
      const estimatedGas = await web3.eth.estimateGas(transaction);

      const gasPrice = await web3.eth.getGasPrice();
  
      const estimatedGasCostInEth = web3.utils.fromWei(
        (BigInt(estimatedGas) * BigInt(gasPrice)).toString(),
        "ether"
      );

      const maxGasCost = 0.01; 
  
      if (parseFloat(estimatedGasCostInEth) > maxGasCost) {
        setErrorMessage(
          `Gas cost too high: ${estimatedGasCostInEth} ETH. Transaction not allowed.`
        );
        return;
      }
  
      setSuccessMessage(
        `Transaction allowed! Estimated gas cost: ${estimatedGasCostInEth} ETH. Proceeding...`
      );

      await createCampaign({
        args: [
          address,
          title,
          description,
          targetInWei.toString(),
          deadlineTimestamp,
          image,
        ],
      });
  
      setSuccessMessage("Campaign created successfully!");
      setTitle("");
      setDescription("");
      setTarget("");
      setDeadline("");
      setImage("");
    } catch (error: any) {
      console.error("Error creating campaign:", error);

      if (error?.code === 4001) { 
        setErrorMessage("Transaction was cancelled by the user.");
        setSuccessMessage(null); 
        return;
      }
  
      const errorMessage = error?.message?.includes("insufficient funds")
        ? "Insufficient funds. Please ensure you have enough ETH in your wallet to cover the transaction gas fees."
        : "Something went wrong. Please check your inputs and try again.";
      setErrorMessage(errorMessage);
      setSuccessMessage(null); 
    }
  };
  
  

  return (
    <div className="create-campaign-container"
      style={{
        backgroundImage: `url(${backgroundImg})`,
      }}
    >
      <div
        style={{
          textAlign: "center",
        }}
      >
        <div className="create-campaign-card">
        <h2 className="create-campaign-title">
            Create a New Campaign
          </h2>

          <form
  onSubmit={handleSubmit}
  style={{
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    alignItems: "flex-start", 
  }}
>
  <div style={{ width: "100%" }}>
  <label className="form-label">
      Title:
    </label>
    <input
      type="text"
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      required
      className="form-input"
    />
  </div>

  <div style={{ width: "100%" }}>
    <label style={{ display: "block", color: "#e1bbc2", marginBottom: "0.5rem" }}>
      Description:
    </label>
    <textarea
      value={description}
      onChange={(e) => setDescription(e.target.value)}
      required
      className="form-input"
    />
  </div>

  <div style={{ width: "100%" }}>
    <label style={{ display: "block", color: "#e1bbc2", marginBottom: "0.5rem" }}>
      Target (ETH):
    </label>
    <input
      type="number"
      step="0.01"
      value={target}
      onChange={(e) => setTarget(e.target.value)}
      required
      style={{
        backgroundColor: "#51465a",
        border: "1px solid #e1bbc2",
        color: "#fff",
        borderRadius: "5px",
        width: "100%",
        padding: "0.5rem",
      }}
    />
  </div>

  <div style={{ width: "100%" }}>
    <label style={{ display: "block", color: "#e1bbc2", marginBottom: "0.5rem" }}>
      Deadline (Date):
    </label>
    <input
      type="date"
      value={deadline}
      onChange={(e) => setDeadline(e.target.value)}
      required
      style={{
        backgroundColor: "#51465a",
        border: "1px solid #e1bbc2",
        color: "#fff",
        borderRadius: "5px",
        width: "100%",
        padding: "0.5rem",
      }}
    />
  </div>

  <div style={{ width: "100%" }}>
    <label style={{ display: "block", color: "#e1bbc2", marginBottom: "0.5rem" }}>
      Image URL:
    </label>
    <input
      type="text"
      value={image}
      onChange={(e) => setImage(e.target.value)}
      placeholder="https://example.com/image.png"
      required
      style={{
        backgroundColor: "#51465a",
        border: "1px solid #e1bbc2",
        color: "#fff",
        borderRadius: "5px",
        width: "100%",
        padding: "0.5rem",
      }}
    />
  </div>

  <button
    type="submit"
    disabled={isCreating}
    className="create-button"
  >
    {isCreating ? "Creating..." : "Create Campaign"}
  </button>
</form>

          {errorMessage && (
           <div className="error-message">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="success-message">
              {successMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
