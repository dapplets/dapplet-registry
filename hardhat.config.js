require("dotenv").config({ path: __dirname + "/.env" });
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-contract-sizer");
require("hardhat-gas-reporter");
require("solidity-coverage");

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
    goerli: {
      url: `https://goerli.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [process.env.DEPLOYER_PRIV_KEY],
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [process.env.DEPLOYER_PRIV_KEY],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_KEY,
  },
};
