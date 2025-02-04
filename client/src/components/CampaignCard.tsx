import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ethers } from "ethers";

const CampaignCard = ({ campaign, index, donationAmounts, setDonationAmounts, handleDonate, messages, address }) => {
  const imageHash = campaign.imageIPFSHash || "";
  const targetInUSD = Number(campaign.targetInUSD);
  const collectedInEth = ethers.utils.formatEther(campaign.amountCollected.toString());
  const progress = (Number(collectedInEth) / Number(campaign.targetInETH)) * 100;

  return (
    <div className="campaign-card" key={index}>
      <h3 style={{ fontSize: "25px", color: "#ffc0cb", fontWeight: "500" }}>{campaign.title}</h3>
      <p style={{ color: "#e1bbc2" }}>{campaign.description}</p>
      <img
        className="campaign-image"
        src={imageHash ? `https://ipfs.io/ipfs/${imageHash}` : "https://via.placeholder.com/200"}
        alt={campaign.title}
      />
      <div style={{textAlign: "left"}}>
      <p style={{ color: "#e1bbc2" }}>
        <strong>Owner:</strong> {campaign.owner}
      </p>
      <p style={{ color: "#e1bbc2" }}>
        <strong>Target:</strong> {targetInUSD} USD
      </p>
      <p style={{ color: "#e1bbc2" }}>
        <strong>Target in ETH:</strong> {campaign.targetInETH} ETH
      </p>
      <p style={{ color: "#e1bbc2" }}>
        <strong>Deadline:</strong> {new Date(campaign.deadline * 1000).toLocaleDateString()}
      </p>
      <p style={{ color: "#e1bbc2" }}>
        <strong>Raised:</strong> {collectedInEth} ETH
      </p>
      </div>

      <div className="progress-bar">
        <div
          style={{
            width: `${Math.min(progress, 100)}%`,
            background: progress >= 100 ? "green" : "blue",
            height: "10px",
          }}
        />
      </div>
      <p style={{ color: "#e1bbc2" }}>{Math.min(progress, 100).toFixed(2)}% funded</p>

      {progress < 100 ? (
        <div style={{ marginTop: "1rem" }}>
          <input
            type="number"
            step="0.01"
            placeholder="Amount (ETH)"
            value={donationAmounts[index] || ""}
            onChange={(e) =>
              setDonationAmounts((prev) => ({
                ...prev,
                [index]: e.target.value,
              }))
            }
            className="border border-zinc-600 bg-zinc-800 text-white px-1 py-1 w-32"
          />
          <button
            onClick={() => handleDonate(index, donationAmounts[index] || "0")}
            className="bg-[#b3888d] text-white py-1 px-4 ml-1 rounded"
          >
            Donate
          </button>
        </div>
      ) : (
        <p style={{ color: "green", marginTop: "1rem" }}>
          This campaign has reached its funding goal. Thank you!
        </p>
      )}

      {messages[index] && (
        <p
          style={{
            color:
              messages[index].includes("Successfully") || messages[index].includes("Transaction allowed")
                ? "green"
                : "red",
            marginTop: "1rem",
          }}
        >
          {messages[index]}
        </p>
      )}

      {address === campaign.owner && (
        <div style={{ marginTop: "1rem" }}>
          <Link
            to={`/edit-campaign/${index}`}
            style={{
              marginLeft: "1rem",
              color: "white",
              backgroundColor: "#8e6470",
              padding: "0.7rem 1.2rem",
              border: "none",
              cursor: "pointer",
              borderRadius: "0.3rem",
            }}
          >
            Edit Campaign
          </Link>
        </div>
      )}
    </div>
  );
};

export default CampaignCard;