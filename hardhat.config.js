require("dotenv").config({ path: __dirname + "/.env" });
require("@nomiclabs/hardhat-waffle");

module.exports = {
    solidity: {
        version: "0.8.13",
        settings: {
            optimizer: {
                enabled: true,
                runs: 1500,
            },
        },
    },
    networks: {
        goerli: {
            url: process.env.GOERLI_RPC_URL,
            accounts: [process.env.GOERLI_PRIVATE_KEY],
        },
    },
};
