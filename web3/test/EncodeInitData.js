const { ethers } = require("hardhat");

async function main() {
  const Crowdfunding = await ethers.getContractFactory("Crowdfunding");

  const commissionManager = "0x0e936c30BCd0a974cd96d6da4a206ee7Deb4551E";
  const priceFeedAddress  = "0x694AA1769357215DE4FAC081bf1f309aDC325306";

  const initData = Crowdfunding.interface.encodeFunctionData(
    "initialize",
    [commissionManager, priceFeedAddress]
  );

  console.log("Init Data pentru Crowdfunding.initialize: ", initData);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
