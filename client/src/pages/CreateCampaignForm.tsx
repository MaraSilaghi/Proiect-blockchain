import React, { useState } from "react";
import backgroundImg from "../assets/background.png";
import {
  useAddress,
  useContract,
  useContractWrite,
} from "@thirdweb-dev/react";
import { ethers } from "ethers";

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
      alert("Please connect your wallet!");
      return;
    }

    try {
      setErrorMessage(null);
      setSuccessMessage(null);

      const targetInWei = ethers.utils.parseEther(target);
      const deadlineTimestamp = Math.floor(
        new Date(deadline).getTime() / 1000
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
            Create a New Campaign
          </h2>

          <form
  onSubmit={handleSubmit}
  style={{
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem", // Spacing between form groups
    alignItems: "flex-start", // Align items to the left
  }}
>
  <div style={{ width: "100%" }}>
    <label style={{ display: "block", color: "#e1bbc2", marginBottom: "0.5rem" }}>
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
        width: "100%", // Full width for alignment
        padding: "0.5rem",
      }}
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
    style={{
      backgroundColor: "#b3888d",
      color: "#fff",
      padding: "0.7rem",
      borderRadius: "5px",
      fontWeight: "bold",
      cursor: "pointer",
      width: "100%", // Match the width of the inputs
    }}
  >
    {isCreating ? "Creating..." : "Create Campaign"}
  </button>
</form>


          {/* Error Message */}
          {errorMessage && (
            <div
              style={{
                color: "red",
                marginTop: "1rem",
                fontWeight: "bold",
              }}
            >
              {errorMessage}
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div
              style={{
                color: "green",
                marginTop: "1rem",
                fontWeight: "bold",
              }}
            >
              {successMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
