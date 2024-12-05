require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
    solidity: {
        version: "0.8.27",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
    networks: {
      hardhat: {
        accounts: {
          mnemonic: process.env.SEED_PHRASE, 
      },
        chainId: 1337,
      },
        sepolia: {
            //primele 2 trebuie inlocuite
            url: "https://mainnet.infura.io/v3/e4f5e6619d1040d3886307b5dde0454b", 
            accounts: ["474514376162acabffb1d219f5416b19e0ea5c26aa8490bef06579cf54c1b16a"], 
            gas: "auto", 
            gasPrice: "auto", 
        },
    },
    defaultNetwork: "sepolia", 
};