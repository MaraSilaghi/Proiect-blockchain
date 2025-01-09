import React, { useState, useEffect } from "react";
import backgroundImg from "../assets/background.png";
import {
  useContract,
  useContractRead,
  useContractWrite,
  useAddress,
} from "@thirdweb-dev/react";
import { useParams, useNavigate } from "react-router-dom";
import { ethers } from "ethers";

const CROWDFUNDING_CONTRACT_ADDRESS = "0xee4bc32b70DB3df04974D379319F937D7376D8Ce";

export function EditCampaign() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { contract } = useContract(CROWDFUNDING_CONTRACT_ADDRESS);
  const { data: campaigns } = useContractRead(contract, "getCampaigns");
  const { mutateAsync: editCampaign, isLoading: isEditing } =
    useContractWrite(contract, "editCampaign");
  const address = useAddress();

  // State variables for form inputs
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [image, setImage] = useState("");

  // State variables for error and success messages
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // State to check if campaign data has been loaded
  const [isCampaignLoaded, setIsCampaignLoaded] = useState(false);

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

    if (campaigns && !isCampaignLoaded) {
      const validCampaigns = campaigns.filter(
        (campaign: any) =>
          campaign.owner !== "0x0000000000000000000000000000000000000000"
      );
      const campaign = validCampaigns[campaignIndex];

      if (!campaign) {
        alert("Campaign not found.");
        navigate("/campaigns");
        return;
      }

      if (campaign.owner !== address) {
        alert("You are not authorized to edit this campaign.");
        navigate("/campaigns");
        return;
      }

      // Populate the form fields only once
      setTitle(campaign.title);
      setDescription(campaign.description);
      setTarget(ethers.utils.formatEther(campaign.target.toString()));
      setDeadline(
        new Date(campaign.deadline * 1000).toISOString().split("T")[0]
      );
      setImage(campaign.image);

      // Mark campaign as loaded
      setIsCampaignLoaded(true);
    }
  }, [campaigns, id, address, navigate, isCampaignLoaded]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id) {
      alert("Invalid campaign ID.");
      return;
    }

    const campaignIndex = parseInt(id, 10);

    if (isNaN(campaignIndex)) {
      alert("Invalid campaign ID.");
      return;
    }

    const validCampaigns = campaigns.filter(
      (campaign: any) =>
        campaign.owner !== "0x0000000000000000000000000000000000000000"
    );
    const campaignToUpdate = validCampaigns[campaignIndex];
    const originalIndex = campaigns?.findIndex(
      (campaign: any) => campaign === campaignToUpdate
    );

    if (originalIndex === -1 || originalIndex === undefined) {
      alert("Error: Campaign not found.");
      return;
    }

    try {
      setErrorMessage(null);
      setSuccessMessage(null);

      const targetInWei = ethers.utils.parseEther(target);
      const deadlineTimestamp = Math.floor(
        new Date(deadline).getTime() / 1000
      );

      await editCampaign({
        args: [
          originalIndex,
          title,
          description,
          targetInWei.toString(),
          deadlineTimestamp,
          image,
        ],
      });

      setSuccessMessage("Campaign updated successfully!");
    } catch (error: any) {
      console.error("Failed to edit campaign:", error);
      const errorMessage = error?.message?.includes("insufficient funds")
        ? "Insufficient funds. Please ensure you have enough ETH in your wallet to cover the transaction gas fees."
        : "Something went wrong. Please check your inputs and try again.";
      setErrorMessage(errorMessage);
    }
  };

  return (
    <div
      style={{
        backgroundImage: `url(${backgroundImg})`,
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        backgroundPosition: "center",
        height: "100%",
        minHeight: "100vh",
        width: "100%",
        margin: 0,
        padding: 0,
        position: "relative",
      }}
    >
      <div
        style={{
          padding: "6rem 2rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            margin: "0 auto",
            border: "1px solid #444",
            padding: "2rem",
            backgroundColor: "#3e3644",
            borderRadius: "10px",
            maxWidth: "600px",
          }}
        >
          <h2
            style={{
              color: "#ffc0cb",
              fontSize: "30px",
              marginBottom: "30px",
              fontWeight: "600",
            }}
          >
            Edit Campaign
          </h2>

          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
          >
            {/* Title Input */}
            <div style={{ width: "100%" }}>
              <label
                style={{
                  display: "block",
                  color: "#e1bbc2",
                  marginBottom: "0.5rem",
                }}
              >
                Title:
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
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

            {/* Description Input */}
            <div style={{ width: "100%" }}>
              <label
                style={{
                  display: "block",
                  color: "#e1bbc2",
                  marginBottom: "0.5rem",
                }}
              >
                Description:
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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

            {/* Target Input */}
            <div style={{ width: "100%" }}>
              <label
                style={{
                  display: "block",
                  color: "#e1bbc2",
                  marginBottom: "0.5rem",
                }}
              >
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

            {/* Deadline Input */}
            <div style={{ width: "100%" }}>
              <label
                style={{
                  display: "block",
                  color: "#e1bbc2",
                  marginBottom: "0.5rem",
                }}
              >
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

            {/* Image URL Input */}
            <div style={{ width: "100%" }}>
              <label
                style={{
                  display: "block",
                  color: "#e1bbc2",
                  marginBottom: "0.5rem",
                }}
              >
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isEditing}
              style={{
                backgroundColor: "#b3888d",
                color: "#fff",
                padding: "0.7rem",
                borderRadius: "5px",
                fontWeight: "bold",
                cursor: "pointer",
                width: "100%",
              }}
            >
              {isEditing ? "Updating..." : "Update Campaign"}
            </button>
          </form>

          {/* Error Message */}
          {errorMessage && (
            <div
              style={{ color: "red", marginTop: "1rem", fontWeight: "bold" }}
            >
              {errorMessage}
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div
              style={{ color: "green", marginTop: "1rem", fontWeight: "bold" }}
            >
              {successMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
