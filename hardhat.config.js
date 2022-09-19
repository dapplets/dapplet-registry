require("dotenv").config({ path: __dirname + "/.env" });
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-contract-sizer");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("./scripts/export");
require("./scripts/import");

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
      url: process.env.GOERLI_RPC,
      accounts: [process.env.DEPLOYER_PRIV_KEY],
    },
    rinkeby: {
      url: process.env.RINKEBY_RPC,
      accounts: [process.env.DEPLOYER_PRIV_KEY],
    },
    ganache: {
      url: process.env.GANACHE_RPC,
      accounts: [process.env.GANACHE_PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_KEY,
  },
};
