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
    // Deploy the mock CommissionManager
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
    tx = await crowdfunding.createCampaign(
      owner.address,
      "Test Campaign",
      "Description",
      ethers.utils.parseEther("10.0"), // target 10 ETH
      Math.floor(Date.now() / 1000) + 3 * 60 * 60, // deadline 3 hour from now
      "imageUrl"
    );
    // Capture the campaignId from the emitted event
    receipt = await tx.wait();
    const event = receipt.events.find(event => event.event === "CampaignCreated");
    campaignId = event.args.id;  
  });

  it("Should create a campaign", async () => {
    const campaign = await crowdfunding.campaigns(campaignId);
    expect(campaign.title).to.equal("Test Campaign");
    expect(campaign.target).to.equal(ethers.utils.parseEther("10.0"));
    expect(campaign.owner).to.equal(owner.address);
    expect(campaign.amountCollected).to.equal(0); // No donations yet
    const currentTimestamp = ethers.BigNumber.from(Math.floor(Date.now() / 1000));
    expect(campaign.deadline).to.be.gt(currentTimestamp); // Ensure the deadline is in the future
  });

  it("Should not allow creation of a campaign with deadline in the past", async () => {
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

  it("Should allow donation to the campaign", async () => {
    const donationAmount = ethers.utils.parseEther("1.0"); // 1 ETH donation
    const expectedAmount = donationAmount.mul(99).div(100); // 99% of the donation

    await expect( await crowdfunding.connect(donor1).donateToCampaign(campaignId, { value: donationAmount }))
        .to.emit(crowdfunding, "DonationReceived").withArgs(campaignId, donor1.address, expectedAmount, 100)
        .and.to.emit(crowdfunding, "RemainingAmountToRaise").withArgs(campaignId, ethers.utils.parseEther("9.01"));

    const campaign = await crowdfunding.campaigns(campaignId);
    const contractBalance = await ethers.provider.getBalance(crowdfunding.address);
    expect(campaign.amountCollected).to.equal(expectedAmount);
    expect(contractBalance).to.equal(expectedAmount);
  });

  it("Should send commission to commission manager and interact correctly", async function () {
    const donationAmount = ethers.utils.parseEther("1.0"); // 1 ETH donation
    const expectedCommission = donationAmount.div(100); // 1% commission
    const remainingDonationAmount = donationAmount.sub(expectedCommission);

    const initialCommissionManagerBalance = await ethers.provider.getBalance(commissionManager.address);

    await crowdfunding.connect(donor1).donateToCampaign(campaignId, { value: donationAmount })
    const finalCommissionManagerBalance = await ethers.provider.getBalance(commissionManager.address);

    expect(finalCommissionManagerBalance).to.equal(
        initialCommissionManagerBalance.add(expectedCommission)
    );

    const campaign = await crowdfunding.campaigns(campaignId);
    expect(campaign.amountCollected).to.equal(remainingDonationAmount);

    const commissionManagerAddress = await crowdfunding.commissionManager();
    expect(commissionManagerAddress).to.equal(commissionManager.address);
  });

  it("Should calculate the remaining amount to raise for the campaign", async () => {
    const donationAmount = ethers.utils.parseEther("1"); // 1 ETH donation => 0.99 ETH goes to the campaign
    await crowdfunding.connect(donor1).donateToCampaign(campaignId, { value: donationAmount });
    
    const campaign = await crowdfunding.campaigns(campaignId);
    const remainingAmount = await crowdfunding.calculateRemainingAmountToRaise(
      campaign.target,
      campaign.amountCollected
    );
    
    expect(remainingAmount).to.equal(ethers.utils.parseEther("9.01")); // 10 ETH (target) - 0.99 ETH (donation)
  });

  it("Should calculate the donor's share correctly", async () => {
    const donation1 = ethers.utils.parseEther("1");
    const donation2 = ethers.utils.parseEther("2");

    await crowdfunding.connect(donor1).donateToCampaign(campaignId, { value: donation1 });
    await crowdfunding.connect(donor2).donateToCampaign(campaignId, { value: donation2 });

    const campaign = await crowdfunding.campaigns(campaignId);

    const donation1Commission = donation1.div(100); // 1% commission
    const donation2Commission = donation2.div(100); // 1% commission
    const remainingAmount1 = donation1.sub(donation1Commission); 
    const remainingAmount2 = donation2.sub(donation2Commission); 
    const totalAmountCollected = campaign.amountCollected;

    const donor1Share = await crowdfunding.calculateDonatorShare(
        remainingAmount1,
        totalAmountCollected
    );
    const donor2Share = await crowdfunding.calculateDonatorShare(
        remainingAmount2,
        totalAmountCollected
    );
    
    expect(donor1Share).to.equal(33);  
    expect(donor2Share).to.equal(66);  
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
    const event = receipt.events.find(e => e.event === "CampaignCreated");
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
    const donationAmount = ethers.utils.parseEther("1");
    await crowdfunding.connect(donor1).donateToCampaign(campaignId, { value: donationAmount });

    const donationCommission = donationAmount.div(100); 
    const remainingAmount = donationAmount.sub(donationCommission);
    await expect(
      crowdfunding.connect(owner).withdrawFunds(campaignId)
    ).to.be.revertedWith("Funds can only be withdrawn if the campaign deadline has passed.");
    const updatedCampaign = await crowdfunding.campaigns(campaignId);
    expect(updatedCampaign.amountCollected).to.equal(remainingAmount);
  });

  it("Should allow the owner to withdraw funds after the campaign ends", async () => {
    const donationAmount = ethers.utils.parseEther("1");
    await crowdfunding.connect(donor1).donateToCampaign(campaignId, { value: donationAmount });
    
    await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
    await ethers.provider.send("evm_mine", []);

    // Check the campaign ended
    // const status = await crowdfunding.isCampaignActive(campaignId);
    // console.log("Campaign active flag:", status);

    // Check the contract balance before withdrawal
    // const contractBalance = await ethers.provider.getBalance(crowdfunding.address);
    // console.log("Contract balance:", ethers.utils.formatEther(contractBalance));
    await expect(
      crowdfunding.connect(owner).withdrawFunds(campaignId)
    ).to.emit(crowdfunding, "Withdrawal");
    const updatedCampaign = await crowdfunding.campaigns(campaignId);
    expect(updatedCampaign.amountCollected).to.equal(0);
  });
});
