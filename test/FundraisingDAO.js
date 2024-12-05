const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FundraisingDAO", function () {
    let dao, owner, donor, recipient;

    beforeEach(async () => {
        [owner, donor, recipient] = await ethers.getSigners();
        const FundraisingDAO = await ethers.getContractFactory("FundraisingDAO");
        dao = await FundraisingDAO.deploy();
        await dao.waitForDeployment();
    });

    it("should accept donations", async function () {
        const { parseEther } = ethers;
        await dao.connect(donor).donate({ value: parseEther("1") });
        const totalFunds = await dao.getTotalFunds();
        expect(totalFunds).to.equal(parseEther("1"));
    });

    it("should add donor to the list", async function () {
        const { parseEther } = ethers;
        await dao.connect(donor).donate({ value: parseEther("1") });
        const donors = await dao.getDonors();
        expect(donors).to.include(await donor.getAddress());
    });

    it("should allow admin to distribute funds", async function () {
        const { parseEther } = ethers;
        await dao.connect(donor).donate({ value: parseEther("1") });
        await dao.distributeFunds(await recipient.getAddress(), parseEther("0.5"));
        const totalFunds = await dao.getTotalFunds();
        expect(totalFunds).to.equal(parseEther("0.5"));
    });
});
