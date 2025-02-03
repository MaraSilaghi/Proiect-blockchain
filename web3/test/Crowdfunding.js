const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("Crowdfunding", function () {
  async function deployContractsFixture() {
    const [owner, donor1, donor2, otherAccount] = await ethers.getSigners();

    const CommissionManager = await ethers.getContractFactory("CommissionManager");
    const commissionManager = await CommissionManager.deploy(owner.address);
    await commissionManager.waitForDeployment();

    const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
    const mockPriceFeed = await MockPriceFeed.deploy(2000 * 10 ** 8, 8); // Mock price: $2000 per ETH, 8 decimals
    await mockPriceFeed.waitForDeployment();

    const Crowdfunding = await ethers.getContractFactory("Crowdfunding");

    // Deploying the contract through a proxy
    const crowdfunding = await upgrades.deployProxy(Crowdfunding, [commissionManager.target, mockPriceFeed.target], { initializer: "initialize" });
    await crowdfunding.createCampaign(
      owner.address,
      "Test Campaign",
      "Description",
      2000, // Target: 2000 USD
      Math.floor(Date.now() / 1000) + 24 * 60 * 60, // Deadline: 24 hours from now
      "imageUrl"
    );
    const campaignId = 0;
    return { crowdfunding, commissionManager, owner, donor1, donor2, otherAccount, campaignId };
  }

  describe("Create campaign", function () {
    it("Should create a campaign", async function () {
      const { crowdfunding, campaignId, owner } = await loadFixture(deployContractsFixture);

      const campaign = await crowdfunding.campaigns(campaignId);
      expect(campaign.title).to.equal("Test Campaign");
      expect(campaign.targetInUSD).to.equal(2000);
      expect(campaign.owner).to.equal(owner.address);
      expect(campaign.amountCollected).to.equal(0);

      const currentTimestamp = Math.floor(Date.now() / 1000);
      expect(campaign.deadline).to.be.gt(currentTimestamp); // Deadline should be in the future
    });

    it("Should not allow creation of a campaign with a deadline in the past", async function () {
      const { crowdfunding, owner } = await loadFixture(deployContractsFixture);

      await expect(
        crowdfunding.createCampaign(
          owner.address,
          "Expired Campaign",
          "Expired",
          ethers.parseEther("10"),
          Math.floor(Date.now() / 1000) - 60 * 60, // 1 hour in the past
          "expiredImage"
        )
      ).to.be.revertedWith("Deadline must be in the future.");
    });
  });

  describe("Edit campaign", function () {
    it("Should allow the owner to edit the campaign", async function () {
      const { crowdfunding, owner, campaignId } = await loadFixture(deployContractsFixture);

      const newTitle = "Updated Campaign Title";
      const newDescription = "Updated Campaign Description";

      await expect(
        crowdfunding.connect(owner).editCampaign(campaignId, newTitle, newDescription)
      )
        .to.emit(crowdfunding, "CampaignEdited")
        .withArgs(campaignId, newTitle, newDescription);

      const updatedCampaign = await crowdfunding.campaigns(campaignId);
      expect(updatedCampaign.title).to.equal(newTitle);
      expect(updatedCampaign.description).to.equal(newDescription);
    });

    it("Should not allow non-owners to edit the campaign", async function () {
      const { crowdfunding, otherAccount, campaignId } = await loadFixture(deployContractsFixture);

      const newTitle = "Unauthorized Edit";
      const newDescription = "This should fail";

      await expect(
        crowdfunding.connect(otherAccount).editCampaign(campaignId, newTitle, newDescription)
      ).to.be.revertedWith("Not the campaign owner.");
    });
  });

  describe("Donate to campaign", function () {
    it("Should allow donations to the campaign", async function () {
      const { crowdfunding, donor1, campaignId } = await loadFixture(deployContractsFixture);

      const donationAmount = ethers.parseEther("1.0"); // 1 ETH donation
      const expectedAmount = donationAmount * 99n / 100n; // 99% of the donation (after 1% commission)
    
      const campaign = await crowdfunding.campaigns(campaignId);
      const targetInWei = await crowdfunding.convertUSDtoWEI(campaign.targetInUSD);
   
      await expect(
        crowdfunding.connect(donor1).donateToCampaign(campaignId, { value: donationAmount })
      )
        .to.emit(crowdfunding, "DonationReceived")
        .withArgs(campaignId, donor1.address, expectedAmount, 100)
        .and.to.emit(crowdfunding, "RemainingAmountToRaise")
        .withArgs(campaignId, (targetInWei - expectedAmount).toString());

      const updatedCampaign = await crowdfunding.campaigns(campaignId);
      expect(updatedCampaign.amountCollected).to.equal(expectedAmount);
    });

    it("Should send commission to commission manager and interact correctly", async function () {
      const { crowdfunding, commissionManager, donor1, campaignId } = await loadFixture(deployContractsFixture);

      const donationAmount = ethers.parseEther("1.0"); // 1 ETH donation
      const expectedCommission = donationAmount / 100n; // 1% commission
      const remainingDonationAmount = donationAmount - expectedCommission;

      const initialCommissionManagerBalance = await ethers.provider.getBalance(commissionManager.target);
      await crowdfunding.connect(donor1).donateToCampaign(campaignId, { value: donationAmount });

      const finalCommissionManagerBalance = await ethers.provider.getBalance(commissionManager.target);
      expect(finalCommissionManagerBalance).to.equal(
        initialCommissionManagerBalance + expectedCommission
      );

      const campaign = await crowdfunding.campaigns(campaignId);
      expect(campaign.amountCollected).to.equal(remainingDonationAmount);
    });

    it("Should not allow donations if the campaign is inactive", async function () {
        const { crowdfunding, donor1, owner } = await loadFixture(deployContractsFixture);
        const tx = await crowdfunding.createCampaign(
            owner.address,
            "Expired Campaign",
            "Expired",
            ethers.parseEther("10"),
            Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour in the future
            "expiredImage"
        );
        const receipt = await tx.wait();
        const campaignCreatedEvent = receipt.logs.map((log) => {
            try {
                return crowdfunding.interface.parseLog(log);
            } catch (e) {
                return null;
            }
            })
            .find((event) => event && event.name === "CampaignCreated");

        const inactiveCampaignId = campaignCreatedEvent.args.id;
        // Increase time to make the campaign inactive
        const currentBlockTimestamp = (await ethers.provider.getBlock("latest")).timestamp;
        const futureTimestamp = currentBlockTimestamp + 60 * 60 * 2; // 2 hours in the future
        await ethers.provider.send("evm_setNextBlockTimestamp", [futureTimestamp]);
        await ethers.provider.send("evm_mine", []);

        await expect(
            crowdfunding.connect(donor1).donateToCampaign(inactiveCampaignId, { value: ethers.parseEther("1") })
        ).to.be.revertedWith("Campaign is no longer active.");
        });

    it("Should not allow donations if the target is reached", async function () {
        const { crowdfunding, donor1, campaignId } = await loadFixture(deployContractsFixture);

        const donationAmount = ethers.parseEther("20.0"); // 20 ETH donation
        await crowdfunding.connect(donor1).donateToCampaign(campaignId, { value: donationAmount });

        await expect(
            crowdfunding.connect(donor1).donateToCampaign(campaignId, { value: donationAmount })
        ).to.be.revertedWith("Campaign target already reached.");
    });
  });

  describe("Withdraw funds", function () {
    it("Should not allow non-owners of the campaign to withdraw funds", async function () {
      const { crowdfunding, otherAccount, campaignId } = await loadFixture(deployContractsFixture);

      await expect(
        crowdfunding.connect(otherAccount).withdrawFunds(campaignId)
      ).to.be.revertedWith("Not the campaign owner.");
    });

    it("Should not allow the owner to withdraw funds before the campaign ends", async function () {
      const { crowdfunding, donor1, owner, campaignId } = await loadFixture(deployContractsFixture);

      const donationAmount = ethers.parseEther("1.0");
      await crowdfunding.connect(donor1).donateToCampaign(campaignId, { value: donationAmount });

      await expect(
        crowdfunding.connect(owner).withdrawFunds(campaignId)
      ).to.be.revertedWith("Campaign is still active.");
    });

    it("Should allow the owner to withdraw funds after the campaign ends", async function () {
      const { crowdfunding, donor1, owner, campaignId } = await loadFixture(deployContractsFixture);

      const donationAmount = ethers.parseEther("1.0");
      await crowdfunding.connect(donor1).donateToCampaign(campaignId, { value: donationAmount });

      await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]); // Increase time by 24 hours
      await ethers.provider.send("evm_mine", []);

      await expect(
        crowdfunding.connect(owner).withdrawFunds(campaignId)
      ).to.emit(crowdfunding, "Withdrawal");

      const updatedCampaign = await crowdfunding.campaigns(campaignId);
      expect(updatedCampaign.amountCollected).to.equal(0); // Funds withdrawn
    });
  });

  describe("View functions", function () {
    it("Should return the donators and donations of a campaign", async function () {
        const { crowdfunding, donor1, donor2, campaignId } = await loadFixture(deployContractsFixture);
    
        const donationAmount = ethers.parseEther("1.0");
        await crowdfunding.connect(donor1).donateToCampaign(campaignId, { value: donationAmount });
        await crowdfunding.connect(donor2).donateToCampaign(campaignId, { value: donationAmount });
        const remainingDonationAmount = donationAmount * 99n / 100n; 
    
        const [donators, donations] = await crowdfunding.getDonatorsOfCampaign(campaignId);
        expect(donators).to.deep.equal([donor1.address, donor2.address]);
        expect(donations).to.deep.equal([remainingDonationAmount, remainingDonationAmount]);
    });

    it("Should return the campaigns", async function () {
        const { crowdfunding, campaignId, owner } = await loadFixture(deployContractsFixture);
        const campaigns = await crowdfunding.getCampaigns();
        expect(campaigns).to.have.lengthOf(1);
        const campaign = campaigns[0];
        expect(campaign.owner).to.equal(owner.address); 
        expect(campaign.title).to.equal("Test Campaign");
    });
  });
});