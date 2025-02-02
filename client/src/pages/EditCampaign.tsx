import React, { useState, useEffect } from "react";
import backgroundImg from "../assets/background.png";
import { useContract, useContractWrite, useAddress } from "@thirdweb-dev/react";
import { useParams, useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import Web3 from "web3";
import "../index.css";

const CROWDFUNDING_CONTRACT_ADDRESS = "0xc231B0fB976cfB1c99BDff28C2d78085464731D9";
const web3 = new Web3(window.ethereum);

export function EditCampaign() {
  const { id } = useParams();
  const navigate = useNavigate();
  const address = useAddress();

  //fara usecontractread
  const { contract: crowdfundingContract } = useContract(CROWDFUNDING_CONTRACT_ADDRESS);

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);
  const [campaignError, setCampaignError] = useState<string | null>(null);

  const { mutateAsync: editCampaign, isLoading: isEditing } =
    useContractWrite(crowdfundingContract, "editCampaign");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isCampaignLoaded, setIsCampaignLoaded] = useState(false);

  useEffect(() => {
    if (!crowdfundingContract) return; 

    async function fetchCampaigns() {
      try {
        setIsLoadingCampaigns(true);
        setCampaignError(null);
        if (!crowdfundingContract) return; 
        const result = await crowdfundingContract.call("getCampaigns");
        setCampaigns(result);
      } catch (err) {
        console.error("Failed to load campaigns:", err);
        setCampaignError("Error loading campaigns");
      } finally {
        setIsLoadingCampaigns(false);
      }
    }

    fetchCampaigns();
  }, [crowdfundingContract]);


  useEffect(() => {
    if (!id) {
      alert("Invalid campaign ID.");
      navigate("/campaigns");
      return;
    }

    const campaignIndex = parseInt(id, 10);
    if (isNaN(campaignIndex)) {
      alert("Invalid campaign ID.");
      navigate("/campaigns");
      return;
    }

    if (!isCampaignLoaded && campaigns.length > 0) {
      const validCampaigns = campaigns.filter(
        (c: any) => c.owner !== "0x0000000000000000000000000000000000000000"
      );
      const selectedCampaign = validCampaigns[campaignIndex];

      if (!selectedCampaign) {
        alert("Campaign not found.");
        navigate("/campaigns");
        return;
      }

      if (selectedCampaign.owner.toLowerCase() !== address?.toLowerCase()) {
        alert("You are not authorized to edit this campaign.");
        navigate("/campaigns");
        return;
      }

      setTitle(selectedCampaign.title);
      setDescription(selectedCampaign.description);

      setIsCampaignLoaded(true);
    }
  }, [id, campaigns, address, navigate, isCampaignLoaded]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id) {
      setErrorMessage("Invalid campaign ID.");
      return;
    }
    const campaignIndex = parseInt(id, 10);
    if (isNaN(campaignIndex)) {
      setErrorMessage("Invalid campaign ID.");
      return;
    }
    if (!address) {
      setErrorMessage("You need to connect your wallet to edit a campaign.");
      return;
    }
    if (!crowdfundingContract) {
      setErrorMessage("Contract not loaded. Please wait or refresh the page.");
      return;
    }

    const validCampaigns = campaigns.filter(
      (c: any) => c.owner !== "0x0000000000000000000000000000000000000000"
    );
    const campaignToUpdate = validCampaigns[campaignIndex];
    const originalIndex = campaigns.findIndex((c: any) => c === campaignToUpdate);

    if (originalIndex === -1 || originalIndex === undefined) {
      setErrorMessage("Error: Campaign not found.");
      return;
    }

    try {
      setErrorMessage(null);
      setSuccessMessage(null);

      const data = crowdfundingContract.encoder.encode("editCampaign", [
        originalIndex,
        title,
        description,
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
          `Gas cost too high: ${estimatedGasCostInEth} ETH. Transaction not allowed.`
        );
        return;
      }

      setSuccessMessage(
        `Transaction allowed! Estimated gas cost: ${estimatedGasCostInEth} ETH. Proceeding...`
      );

      await editCampaign({ args: [originalIndex, title, description] });

      setSuccessMessage("Campaign updated successfully!");
    } catch (error: any) {
      console.error("Failed to edit campaign:", error);

      if (error?.code === 4001) {
        setErrorMessage("Transaction was cancelled by the user.");
        return;
      }

      const isFundsError = error?.message?.includes("insufficient funds");
      setErrorMessage(
        isFundsError
          ? "Insufficient funds. Please ensure you have enough ETH to cover gas fees."
          : "Something went wrong. Please check your inputs and try again."
      );
    }
  };

  if (!crowdfundingContract) {
    return <div>Loading Crowdfunding contract...</div>;
  }

  if (isLoadingCampaigns) {
    return <div>Loading campaigns...</div>;
  }
  if (campaignError) {
    return <div>{campaignError}</div>;
  }

  return (
    <div
      className="edit-campaign-container"
      style={{
        backgroundImage: `url(${backgroundImg})`,
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        backgroundPosition: "center",
        minHeight: "100vh",
      }}
    >
      <div style={{ textAlign: "center", paddingTop: "100px" }}>
        <div className="edit-campaign-card">
          <h2 className="edit-campaign-title">Edit Campaign</h2>

          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
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

            <button
              type="submit"
              disabled={isEditing}
              className="update-button"
            >
              {isEditing ? "Updating..." : "Update Campaign"}
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
