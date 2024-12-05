const hre = require("hardhat");

async function main() {
    const FundraisingDAO = await hre.ethers.getContractFactory("FundraisingDAO");
    console.log("Deploying FundraisingDAO...");

    // Deploy contract
    const dao = await FundraisingDAO.deploy();
    await dao.waitForDeployment();

    // Obține adresa contractului
    const address = await dao.getAddress();
    console.log("FundraisingDAO deployed to:", address);

    // Obține conturi
    const [admin, donor, recipient] = await hre.ethers.getSigners();

    // Testare donații
    console.log("Testing donations...");
    await dao.connect(donor).donate({ value: hre.ethers.parseEther("1") });
    console.log("Donor donated 1 ETH");

    const totalFunds = await dao.getTotalFunds();
    console.log("Total funds in contract:", hre.ethers.formatUnits(totalFunds, "ether"), "ETH");

    // Testare distribuire fonduri
    console.log("Distributing funds...");
    await dao.connect(admin).distributeFunds(recipient.address, hre.ethers.parseEther("0.5"));
    console.log("Distributed 0.5 ETH to:", recipient.address);

    const updatedFunds = await dao.getTotalFunds();
    console.log("Funds after distribution:", hre.ethers.formatUnits(updatedFunds, "ether"), "ETH");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
