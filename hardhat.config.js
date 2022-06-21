require("dotenv").config({ path: __dirname + "/.env" });
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-contract-sizer");
require("hardhat-gas-reporter");

module.exports = {
  mocha: {
    timeout: 1000000000,
  },
  solidity: {
    version: "0.8.13",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  contractSizer: {
    runOnCompile: false,
    strict: true,
  },
  networks: {
    // goerli: {
    //   url: process.env.GOERLI_RPC_URL,
    //   accounts: [process.env.GOERLI_PRIVATE_KEY],
    //   allowUnlimitedContractSize: true,
    // },
    hardhat: {
      allowUnlimitedContractSize: true,
    },
  },
  // etherscan: {
  //   apiKey: process.env.ETHERSCAN_API_KEY,
  // },
};
