const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("CommissionManager", function () {
  async function deployCommissionManagerFixture() {
    const [owner, addr1] = await ethers.getSigners();

    const CommissionManager = await ethers.getContractFactory("CommissionManager");
    const commissionManager = await CommissionManager.deploy();
    await commissionManager.waitForDeployment(); 

    return { commissionManager, owner, addr1 };
  }

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      const { commissionManager, owner } = await loadFixture(deployCommissionManagerFixture);
      expect(await commissionManager.owner()).to.equal(owner.address);
    });

    it("Should set the correct fields", async function () {
      const { commissionManager } = await loadFixture(deployCommissionManagerFixture);
      expect(await commissionManager.getCommissionPercentage()).to.equal(1);
      expect(await commissionManager.getCooldownPeriod()).to.equal(604800); // 1 week in seconds
      expect(await commissionManager.getCurrentTotalAccumulated()).to.equal(0);
      expect(await commissionManager.getTotalAccumulatedEver()).to.equal(0);
      expect(await commissionManager.getWithdrawalLimitPercentage()).to.equal(50);
    });
  });

  describe("Accumulate Function", function () {
    it("Should accumulate the commission correctly", async function () {
      const { commissionManager } = await loadFixture(deployCommissionManagerFixture);
      const amount = ethers.parseEther("1.0");
      await commissionManager.accumulate(amount, { value: amount });
      expect(await commissionManager.getCurrentTotalAccumulated()).to.equal(amount);
    });

    it("Should emit CommissionReceived event when accumulating", async function () {
      const { commissionManager, owner } = await loadFixture(deployCommissionManagerFixture);
      const amount = ethers.parseEther("1.0");
      await expect(commissionManager.accumulate(amount, {value: amount}))
        .to.emit(commissionManager, "CommissionReceived")
        .withArgs(owner.address, amount);
    });
  });

  describe("Withdraw Functionality", function () {
    it("Should emit CommissionWithdrawn event on successful withdrawal", async function () {
      const { commissionManager, owner } = await loadFixture(deployCommissionManagerFixture);
      const depositAmount = ethers.parseEther("5");
      await commissionManager.accumulate(depositAmount, {value: depositAmount});

      const withdrawAmount = ethers.parseEther("1");

      await expect(commissionManager.withdrawAmount(owner.address, withdrawAmount))
        .to.emit(commissionManager, "CommissionWithdrawn")
        .withArgs(owner.address, withdrawAmount);
    });

    it("Should prevent withdrawals exceeding the withdrawal limit", async function () {
      const { commissionManager, addr1 } = await loadFixture(deployCommissionManagerFixture);
      const depositAmount = ethers.parseEther("5.0");
      await commissionManager.accumulate(depositAmount, {value: depositAmount});

      const excessiveAmount = ethers.parseEther("4.0"); // More than 50% of 5.0 ET
      
      await expect(
        commissionManager.withdrawAmount(addr1.address, excessiveAmount)
      ).to.be.revertedWith("Amount exceeds the maximum allowed withdrawal.");
    });

    it("Should prevent withdrawals before cooldown period passes", async function () {
      const { commissionManager, addr1 } = await loadFixture(deployCommissionManagerFixture);
      const depositAmount = ethers.parseEther("5.0");
      await commissionManager.accumulate(depositAmount, {value: depositAmount});

      const withdrawAmount = ethers.parseEther("1.0");
      await commissionManager.withdrawAmount(addr1.address, withdrawAmount);
      await expect(
        commissionManager.withdrawAmount(addr1.address, withdrawAmount)
      ).to.be.revertedWith("Cooldown period not passed.");
    });
  });

  describe("Withdraw All Function", function () {
    it("Should allow withdrawAll within limit", async function () {
      const { commissionManager, addr1 } = await loadFixture(deployCommissionManagerFixture);
      const depositAmount = ethers.parseEther("5.0");
       await commissionManager.accumulate(depositAmount, {value: depositAmount});

      const maxAllowed = await commissionManager.getMaximumWithdrawalAmountAllowed();
      await commissionManager.withdrawAll(addr1.address);
      const contractBalance = await ethers.provider.getBalance(commissionManager.target);
      expect(contractBalance).to.equal(depositAmount - maxAllowed);
    });

    it("Should revert if withdrawAll is attempted before cooldown", async function () {
      const { commissionManager, addr1 } = await loadFixture(deployCommissionManagerFixture);
      const depositAmount = ethers.parseEther("5.0");
       await commissionManager.accumulate(depositAmount, {value: depositAmount});

      await commissionManager.withdrawAll(addr1.address);
      await expect(
        commissionManager.withdrawAll(addr1.address)
      ).to.be.revertedWith("Cooldown period not passed.");
    });
  });


  describe("View Functions", function () {
    it("Should return the correct total accumulated amount", async function () {
      const { commissionManager } = await loadFixture(deployCommissionManagerFixture);
      const depositAmount = ethers.parseEther("5.0");
      await commissionManager.accumulate(depositAmount, {value: depositAmount});

      expect(await commissionManager.getTotalAccumulatedEver()).to.equal(depositAmount);
    });

    it("Should return the correct amount available for withdrawal", async function () {
      const { commissionManager } = await loadFixture(deployCommissionManagerFixture);
      const depositAmount = ethers.parseEther("5.0");
      await commissionManager.accumulate(depositAmount, {value: depositAmount});

      const maxAllowed = await commissionManager.getMaximumWithdrawalAmountAllowed();
      expect(await commissionManager.getMaximumWithdrawalAmountAllowed()).to.equal(maxAllowed);
    });

    it("Should return the correct cooldown period", async function () {
      const { commissionManager } = await loadFixture(deployCommissionManagerFixture);
      expect(await commissionManager.getCooldownPeriod()).to.equal(604800); // 1 week in seconds
    });

    it("Should return the correct commission percentage", async function () {
      const { commissionManager } = await loadFixture(deployCommissionManagerFixture);
      expect(await commissionManager.getCommissionPercentage()).to.equal(1);
    });
  });
});