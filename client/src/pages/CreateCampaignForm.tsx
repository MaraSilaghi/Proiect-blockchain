import React, { useState } from "react";
import backgroundImg from "../assets/background.png";
import {
  useAddress,
  useContract,
  useContractWrite,
  useStorageUpload,
} from "@thirdweb-dev/react";
import { ethers } from "ethers";
import Web3 from "web3";
import "../index.css";

const web3 = new Web3(window.ethereum);
const CROWDFUNDING_CONTRACT_ADDRESS = "0xf4E034e4CeDd516CE0D8951e8598969Cc826f40e";

export function CreateCampaignForm() {
  const address = useAddress();
  const { contract } = useContract(CROWDFUNDING_CONTRACT_ADDRESS);
  console.log("Contract instance:", contract);
  console.log("Contract address:", CROWDFUNDING_CONTRACT_ADDRESS);
  const { mutateAsync: createCampaign, isLoading: isCreating } =
    useContractWrite(contract, "createCampaign");

  const { mutateAsync: uploadToIPFS } = useStorageUpload();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetUSD, setTargetUSD] = useState("");
  const [deadline, setDeadline] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address) {
      setErrorMessage("You need to connect your wallet.");
      return;
    }
    if (!contract) {
      setErrorMessage("Crowdfunding contract is not loaded yet. Please try again.");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const targetUsdValue = Number(targetUSD);
      console.log("Target in USD:", targetUsdValue);
      

      console.log("Target USD as BigNumber:", targetUsdValue.toString());
      const deadlineTimestamp = Math.floor(new Date(deadline).getTime() / 1000);

      let ipfsHash = "";
      if (selectedFile) {
        const uploadResult = await uploadToIPFS({ data: [selectedFile] });
        ipfsHash = uploadResult[0].replace("ipfs://", "");
      }

      //corect
      console.log("Primesc: ", {
        address,
        title,
        description,
        targetUsdValue: targetUsdValue.toString(),
        deadlineTimestamp,
        ipfsHash,
      });

      const data = contract.encoder.encode("createCampaign", [
        address,
        title,
        description,
        targetUsdValue,
        deadlineTimestamp,
        ipfsHash,
      ]);
      const transaction = {
        from: address,
        to: CROWDFUNDING_CONTRACT_ADDRESS,
        data,
      };

      const estimatedGas = await web3.eth.estimateGas(transaction);
      const gasPrice = await web3.eth.getGasPrice();
      
      const estimatedGasCostInEth = ethers.utils.formatEther(
        (BigInt(estimatedGas) * BigInt(gasPrice)).toString()
      );
      const maxGasCost = 0.01;
      if (parseFloat(estimatedGasCostInEth) > maxGasCost) {
        setErrorMessage(
          `Gas cost too high (~${estimatedGasCostInEth} ETH). Transaction not allowed.`
        );
        return;
      }

      setSuccessMessage(
        `Transaction allowed! Estimated gas cost: ~${estimatedGasCostInEth} ETH. Proceeding...`
      );

      try {
        await createCampaign({
          args: [
            address,
            title,
            description,
            targetUsdValue,
            deadlineTimestamp,
            ipfsHash,
          ],
        });
      } catch (error: any) {
        console.error("Eroare detaliată:", error?.reason || error);
      }

      setSuccessMessage("Campaign created successfully!");
      setTitle("");
      setDescription("");
      setTargetUSD("");
      setDeadline("");
      setSelectedFile(null);
    } catch (error: any) {
      console.error("Failed to create campaign:", error);
      if (error?.code === 4001) {
        setErrorMessage("User cancelled transaction.");
      } else {
        setErrorMessage("Something went wrong. Please try again.");
      }
    }
  };

  if (!contract) {
    return <div>Loading Crowdfunding contract...</div>;
  }

  return (
    <div
      className="create-campaign-container"
      style={{ backgroundImage: `url(${backgroundImg})` }}
    >
      <div style={{ textAlign: "center" }}>
        <div className="create-campaign-card">
          <h2 className="create-campaign-title">Create a New Campaign</h2>

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
              <label className="form-label">Title:</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="form-input"
              />
            </div>
            <div style={{ width: "100%" }}>
              <label className="form-label">Description:</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="form-input"
              />
            </div>

            <div style={{ width: "100%" }}>
              <label className="form-label">Target (USD):</label>
              <input
                type="number"
                placeholder="Example: 100 means $100"
                value={targetUSD}
                onChange={(e) => setTargetUSD(e.target.value)}
                required
                className="form-input"
              />
            </div>

            <div style={{ width: "100%" }}>
              <label className="form-label">Deadline (Date):</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
                className="form-input"
              />
            </div>

            <div style={{ width: "100%" }}>
              <label className="form-label">Image IPFS Hash:</label>
              <input
                type="file"
                onChange={handleFileChange}
                accept="image/*"
                className="form-input"
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

          {errorMessage && <div className="error-message">{errorMessage}</div>}
          {successMessage && <div className="success-message">{successMessage}</div>}
        </div>
      </div>
    </div>
  );
}
