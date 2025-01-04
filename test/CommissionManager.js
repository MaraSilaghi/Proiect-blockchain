const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CommissionManager", function () {
  let commissionManager;
  let admin;
  let user;
  let addr1;
  let addr2;

  beforeEach(async () => {
    [admin, user, addr1, addr2] = await ethers.getSigners();
    const CommissionManager = await ethers.getContractFactory("CommissionManager");
    commissionManager = await CommissionManager.deploy();
  });

  describe("Deployment", function () {
    it("Should set the correct admin address", async function () {
      expect(await commissionManager.admin()).to.equal(admin.address);
    });

    it("Should initialize totalCollected as 0", async function () {
      expect(await commissionManager.totalCollected()).to.equal(0);
    });
  });

  describe("Receive function", function () {
    it("Should receive commissions and update totalCollected", async function () {
      const depositAmount = ethers.utils.parseEther("1.0");

      // User sends 1 ETH to the contract
      await expect(() =>
        user.sendTransaction({
          to: commissionManager.address,
          value: depositAmount,
        })
      ).to.changeEtherBalance(commissionManager, depositAmount);

      expect(await commissionManager.totalCollected()).to.equal(depositAmount);
    });

    it("Should emit CommissionReceived event when commission is received", async function () {
      const depositAmount = ethers.utils.parseEther("1.0");

      await expect(
        user.sendTransaction({
          to: commissionManager.address,
          value: depositAmount,
        })
      )
        .to.emit(commissionManager, "CommissionReceived")
        .withArgs(user.address, depositAmount);
    });
  });

  describe("WithdrawCommissions", function () {
    beforeEach(async () => {
      const depositAmount = ethers.utils.parseEther("3.0");
      // Admin sends 3 ETH to the contract to fund it
      await admin.sendTransaction({
        to: commissionManager.address,
        value: depositAmount,
      });
    });

    it("Should allow the admin to withdraw commissions", async function () {
      const withdrawAmount = ethers.utils.parseEther("1.0");
      const initialBalance = await ethers.provider.getBalance(addr1.address);

      // Admin withdraws 1 ETH
      await expect(
        commissionManager.withdrawCommissions(addr1.address, withdrawAmount)
      )
        .to.emit(commissionManager, "CommissionWithdrawn")
        .withArgs(addr1.address, withdrawAmount);

      // Check balances
      expect(await commissionManager.totalCollected()).to.equal(
        ethers.utils.parseEther("2.0")
      );
      expect(await ethers.provider.getBalance(addr1.address)).to.equal(
        initialBalance.add(withdrawAmount)
      );
    });

    it("Should fail if non-admin tries to withdraw commissions", async function () {
      const withdrawAmount = ethers.utils.parseEther("1.0");

      await expect(
        commissionManager.connect(user).withdrawCommissions(addr1.address, withdrawAmount)
      ).to.be.revertedWith("Only admin can perform this action.");
    });

    it("Should fail if withdrawal amount exceeds totalCollected", async function () {
      const withdrawAmount = ethers.utils.parseEther("5.0");

      await expect(
        commissionManager.withdrawCommissions(addr1.address, withdrawAmount)
      ).to.be.revertedWith("Not enough funds.");
    });

    it("Should emit CommissionWithdrawn event on successful withdrawal", async function () {
      const withdrawAmount = ethers.utils.parseEther("1.0");

      await expect(
        commissionManager.withdrawCommissions(addr2.address, withdrawAmount)
      )
        .to.emit(commissionManager, "CommissionWithdrawn")
        .withArgs(addr2.address, withdrawAmount);
    });
  });
});
