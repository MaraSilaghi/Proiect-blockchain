import React, { useState, useEffect } from "react";
import { useContract, useAddress } from "@thirdweb-dev/react";
import Web3 from "web3";
import { ethers } from "ethers";
import backgroundImg from "../assets/background.png";

const COMMISSION_MANAGER_CONTRACT_ADDRESS = "0x0e936c30BCd0a974cd96d6da4a206ee7Deb4551E";
const web3 = new Web3(Web3.givenProvider || "https://eth-sepolia.g.alchemy.com/v2/9l-9vo3wJgiZaerJ3luGULCn0U8lbdPt"); 

export function WithdrawFunds() {
  const address = useAddress();
  const { contract } = useContract(COMMISSION_MANAGER_CONTRACT_ADDRESS);
  const [commissionData, setCommissionData] = useState({
    percentage: "0",
    currentBalance: "0",
    totalCollected: "0",
    totalWithdrawn: "0",
  });
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!contract) return;
    const fetchData = async () => {
      try {
        const percentage = await contract.call("getCommissionPercentage");
        const currentBalance = await contract.call("getCurrentTotalAccumulated");
        const totalCollected = await contract.call("getTotalAccumulatedEver");
        const totalWithdrawn = await contract.call("getTotalAmountWithdrawn");
        setCommissionData({
          percentage: ethers.utils.formatUnits(percentage, 0),
          currentBalance: ethers.utils.formatEther(currentBalance),
          totalCollected: ethers.utils.formatEther(totalCollected),
          totalWithdrawn: ethers.utils.formatEther(totalWithdrawn),
        });
      } catch (error) {
        console.error("Error fetching commission data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [contract]);

  const handleWithdraw = async (isFullWithdraw: boolean) => {
    if (!address || !contract) {
      setMessage("You need to connect your wallet.");
      return;
    }

    try {
      let amountInWei;
      if (isFullWithdraw) {
        amountInWei = ethers.utils.parseEther((parseFloat(commissionData.currentBalance) * 0.5).toString());
      } else {
        amountInWei = ethers.utils.parseEther(withdrawAmount);
      }
      
      const data = contract.encoder.encode("withdrawAmount", [address, amountInWei]);
      const tx = {
        from: address,
        to: COMMISSION_MANAGER_CONTRACT_ADDRESS,
        data,
      };

      const lastWithdrawal = await contract.call("getLastWithdrawalTimestamp");
      const cooldown = await contract.call("getCooldownPeriod");
  
      const currentTime = Math.floor(Date.now() / 1000); 
      const timeLeft = lastWithdrawal.toNumber() + cooldown.toNumber() - currentTime;
  
      if (timeLeft > 0) {
        const minutesLeft = Math.ceil(timeLeft / 60);
        setMessage(`You must wait ${minutesLeft} minutes before withdrawing again.`);
        return;
      }

      const estimatedGas = await web3.eth.estimateGas(tx);
      const gasPrice = await web3.eth.getGasPrice();
      const estimatedGasCostInEth = ethers.utils.formatEther(
        (BigInt(estimatedGas) * BigInt(gasPrice)).toString()
      );

      if (parseFloat(estimatedGasCostInEth) > 0.01) {
        setMessage(`Gas cost too high: ${estimatedGasCostInEth} ETH.`);
        return;
      }
      else setMessage(`Transaction allowed! Gas ~${estimatedGasCostInEth} ETH.`);

      await contract.call("withdrawAmount", [address, amountInWei]);
      setMessage(`Successfully withdrew ${ethers.utils.formatEther(amountInWei)} ETH.`);
      setWithdrawAmount("");
    } catch (error) {
      console.error("Withdrawal error:", error);
      setMessage("Transaction failed.");
    }
  };

  return (
    <div
     className="campaigns-container"
     style={{ backgroundImage: `url(${backgroundImg})` }}
     >
     <div style={{padding: "30px"}}></div>
    <div
      style={{
        marginTop: "2rem",
        padding: "1rem",
        borderRadius: "10px",
        backgroundColor: "#4a3c56",
        maxWidth: "500px",
        margin: "auto",
        textAlign: "center",
      }}
    >
      <h3 style={{ color: "#ffc0cb", fontSize:"22px", fontWeight:"bold" }}>Commission Management</h3>
      {isLoading ? (
        <p>Loading commission data...</p>
      ) : (
        <div style={{textAlign:"left", marginTop: "1rem", marginBottom:"1rem"}}>
          <p style={{ color: "#e1bbc2" }}>
            <strong>Commission Percentage per transaction:</strong> {commissionData.percentage}%
          </p>
          <p style={{ color: "#e1bbc2" }}>
            <strong>Current Balance:</strong> {commissionData.currentBalance} ETH
          </p>
          <p style={{ color: "#e1bbc2" }}>
            <strong>Total Balance Ever Collected:</strong> {commissionData.totalCollected} ETH
          </p>
          <p style={{ color: "#e1bbc2" }}>
            <strong>Total Withdrawn:</strong> {commissionData.totalWithdrawn} ETH
          </p>
        </div>
      )}

      <input
        type="number"
        step="0.01"
        placeholder="Amount to withdraw (ETH)"
        value={withdrawAmount}
        onChange={(e) => setWithdrawAmount(e.target.value)}
        style={{
          backgroundColor: "#51465a",
          border: "1px solid #e1bbc2",
          color: "#fff",
          borderRadius: "5px",
          width: "100%",
          padding: "0.5rem",
          marginTop: "1rem",
          marginBottom: "1rem",
        }}
      />
      <button
        onClick={() => handleWithdraw(false)}
        style={{
          backgroundColor: "#b3888d",
          color: "#fff",
          marginTop: "1rem",
          padding: "0.7rem 1.2rem",
          borderRadius: "0.3rem",
          marginRight: "5px",
        }}
      >
        Withdraw Custom Amount
      </button>
      <button
        onClick={() => handleWithdraw(true)}
        style={{
          backgroundColor: "#b3888d",
          color: "#fff",
          marginTop: "1rem",
          padding: "0.7rem 1.2rem",
          borderRadius: "0.3rem",
        }}
      >
        Withdraw All (50%)
      </button>

      {message && (
        <p
          style={{
            marginTop: "1rem",
            color: message.includes("Successfully") ? "green" : "red",
          }}
        >
          {message}
        </p>
      )}
      </div>
    </div>
  );
}
