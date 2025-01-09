const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Crowdfunding", function () {
  let crowdfunding;
  let commissionManager;
  let owner;
  let donor1;
  let donor2;
  let otherAccount;
  let campaignId;

  beforeEach(async () => {
    // Deploy the CommissionManager contract
    const CommissionManager = await ethers.getContractFactory("CommissionManager");
    commissionManager = await CommissionManager.deploy();
    await commissionManager.deployed();

    // Deploy the Crowdfunding contract with the CommissionManager address
    const Crowdfunding = await ethers.getContractFactory("Crowdfunding");
    crowdfunding = await Crowdfunding.deploy(commissionManager.address);
    await crowdfunding.deployed();

    // Get the signers
    [owner, donor1, donor2, otherAccount] = await ethers.getSigners();

    // Create a campaign
    const tx = await crowdfunding.createCampaign(
      owner.address,
      "Test Campaign",
      "Description",
      ethers.utils.parseEther("10.0"), // Target: 10 ETH
      Math.floor(Date.now() / 1000) + 3 * 60 * 60, // Deadline: 3 hours from now
      "imageUrl"
    );
    const receipt = await tx.wait();
    const event = receipt.events.find((event) => event.event === "CampaignCreated");
    campaignId = event.args.id;
  });

  it("Should create a campaign", async () => {
    const campaign = await crowdfunding.campaigns(campaignId);
    expect(campaign.title).to.equal("Test Campaign");
    expect(campaign.target).to.equal(ethers.utils.parseEther("10.0"));
    expect(campaign.owner).to.equal(owner.address);
    expect(campaign.amountCollected).to.equal(0);
    const currentTimestamp = ethers.BigNumber.from(Math.floor(Date.now() / 1000));
    expect(campaign.deadline).to.be.gt(currentTimestamp); // Deadline should be in the future
  });

  it("Should not allow creation of a campaign with a deadline in the past", async () => {
    await expect(
      crowdfunding.createCampaign(
        owner.address,
        "Expired Campaign",
        "Expired",
        ethers.utils.parseEther("10"),
        Math.floor(Date.now() / 1000) - 60 * 60, // 1 hour in the past
        "expiredImage"
      )
    ).to.be.revertedWith("The deadline should be a date in the future.");
  });

  it("Should allow the owner to edit the campaign", async () => {
    const newTitle = "Updated Campaign Title";
    const newDescription = "Updated Campaign Description";
    const newTarget = ethers.utils.parseEther("20.0"); // New Target: 20 ETH
    const newDeadline = Math.floor(Date.now() / 1000) + 6 * 60 * 60; // 6 hours from now
    const newImage = "updatedImageUrl";

    await expect(
      crowdfunding.connect(owner).editCampaign(
        campaignId,
        newTitle,
        newDescription,
        newTarget,
        newDeadline,
        newImage
      )
    ).to.emit(crowdfunding, "CampaignEdited")
      .withArgs(campaignId, newTitle, newDescription);

    const updatedCampaign = await crowdfunding.campaigns(campaignId);
    expect(updatedCampaign.title).to.equal(newTitle);
    expect(updatedCampaign.description).to.equal(newDescription);
    expect(updatedCampaign.target).to.equal(newTarget);
    expect(updatedCampaign.deadline).to.equal(newDeadline);
    expect(updatedCampaign.image).to.equal(newImage);
  });

  it("Should not allow non-owners to edit the campaign", async () => {
    const newTitle = "Unauthorized Edit";
    const newDescription = "This should fail";

    await expect(
      crowdfunding.connect(otherAccount).editCampaign(
        campaignId,
        newTitle,
        newDescription,
        ethers.utils.parseEther("15.0"),
        Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour from now
        "unauthorizedImage"
      )
    ).to.be.revertedWith("Not the campaign owner.");
  });

  it("Should allow the owner to delete the campaign", async () => {
    await expect(
      crowdfunding.connect(owner).deleteCampaign(campaignId)
    ).to.emit(crowdfunding, "CampaignDeleted")
      .withArgs(campaignId, owner.address);

    // Verify that the campaign is deleted
    const deletedCampaign = await crowdfunding.campaigns(campaignId);
    expect(deletedCampaign.owner).to.equal(ethers.constants.AddressZero); // Address zero indicates deletion
    expect(deletedCampaign.title).to.equal(""); // Empty title
  });

  it("Should not allow non-owners to delete the campaign", async () => {
    await expect(
      crowdfunding.connect(otherAccount).deleteCampaign(campaignId)
    ).to.be.revertedWith("Not the campaign owner.");
  });

  it("Should not allow the owner to delete a campaign with funds collected", async () => {
    const donationAmount = ethers.utils.parseEther("1.0"); // 1 ETH
    await crowdfunding.connect(donor1).donateToCampaign(campaignId, { value: donationAmount });

    await expect(
      crowdfunding.connect(owner).deleteCampaign(campaignId)
    ).to.be.revertedWith("Cannot delete a campaign with collected funds.");
  });

  it("Should allow donations to the campaign", async () => {
    const donationAmount = ethers.utils.parseEther("1.0"); // 1 ETH donation
    const expectedAmount = donationAmount.mul(99).div(100); // 99% of the donation (after 1% commission)

    await expect(
      crowdfunding.connect(donor1).donateToCampaign(campaignId, { value: donationAmount })
    )
      .to.emit(crowdfunding, "DonationReceived")
      .withArgs(campaignId, donor1.address, expectedAmount, 100)
      .and.to.emit(crowdfunding, "RemainingAmountToRaise")
      .withArgs(campaignId, ethers.utils.parseEther("9.01"));

    const campaign = await crowdfunding.campaigns(campaignId);
    expect(campaign.amountCollected).to.equal(expectedAmount);
  });

  it("Should calculate the remaining amount to raise for the campaign", async () => {
    const donationAmount = ethers.utils.parseEther("1"); // 1 ETH donation
    await crowdfunding.connect(donor1).donateToCampaign(campaignId, { value: donationAmount });

    const campaign = await crowdfunding.campaigns(campaignId);
    const remainingAmount = await crowdfunding.calculateRemainingAmountToRaise(
      campaign.target,
      campaign.amountCollected
    );

    expect(remainingAmount).to.equal(ethers.utils.parseEther("9.01")); // 10 ETH target - 0.99 ETH collected
  });

  it("Should not allow donations if the campaign is inactive", async () => {
    const tx = await crowdfunding.createCampaign(
      owner.address,
      "Expired Campaign",
      "Expired",
      ethers.utils.parseEther("10"),
      Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour in the future
      "expiredImage"
    );
    const receipt = await tx.wait();
    const event = receipt.events.find((event) => event.event === "CampaignCreated");
    const inactiveCampaignId = event.args.id;

    const currentBlockTimestamp = (await ethers.provider.getBlock("latest")).timestamp;
    const futureTimestamp = currentBlockTimestamp + 60 * 60 * 2; // 2 hours in the future
    await ethers.provider.send("evm_setNextBlockTimestamp", [futureTimestamp]);
    await ethers.provider.send("evm_mine", []);

    await expect(
      crowdfunding.connect(donor1).donateToCampaign(inactiveCampaignId, { value: ethers.utils.parseEther("1") })
    ).to.be.revertedWith("Campaign is no longer active.");
  });

  it("Should not allow non-owners to withdraw funds", async () => {
    await expect(
      crowdfunding.connect(otherAccount).withdrawFunds(campaignId)
    ).to.be.revertedWith("Not the campaign owner.");
  });

  it("Should not allow the owner to withdraw funds before the campaign ends", async () => {
    const donationAmount = ethers.utils.parseEther("1.0");
    await crowdfunding.connect(donor1).donateToCampaign(campaignId, { value: donationAmount });

    await expect(
      crowdfunding.connect(owner).withdrawFunds(campaignId)
    ).to.be.revertedWith("Funds can only be withdrawn if the campaign deadline has passed.");
  });

  it("Should allow the owner to withdraw funds after the campaign ends", async () => {
    const donationAmount = ethers.utils.parseEther("1.0");
    await crowdfunding.connect(donor1).donateToCampaign(campaignId, { value: donationAmount });

    await ethers.provider.send("evm_increaseTime", [3 * 60 * 60]); // Increase time by 3 hours
    await ethers.provider.send("evm_mine", []);

    await expect(
      crowdfunding.connect(owner).withdrawFunds(campaignId)
    ).to.emit(crowdfunding, "Withdrawal");

    const updatedCampaign = await crowdfunding.campaigns(campaignId);
    expect(updatedCampaign.amountCollected).to.equal(0); // Funds withdrawn
  });
});
