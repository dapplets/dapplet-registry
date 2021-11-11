const HDWalletProvider = require("@truffle/hdwallet-provider");
const NonceTrackerSubprovider = require('web3-provider-engine/subproviders/nonce-tracker')
const config = require('./config.json');

module.exports = {
  compilers: {
    solc: {
      version: '^0.6.6'
    }
  },
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
      gas: 100000000
    },

    // ganache-cli -l 100000000 -m "mnemonic" -h "192.168.100.150" -v
    localhost: {
      host: "192.168.100.150",
      port: 8545,
      network_id: "*",
      gas: 100000000
    },
    rinkeby: {
      provider: function () {
        return new HDWalletProvider(config.rinkeby_mnemonic, `https://rinkeby.infura.io/v3/${config.rinkeby_infura_api_key}`);
      },
      network_id: '4',
      gas: 10000000
    },
    goerli: {
      provider: function () {
        return new HDWalletProvider(config.rinkeby_mnemonic, `https://goerli.infura.io/v3/${config.rinkeby_infura_api_key}`);
      },
      network_id: '5',
      gas: 10000000
    },
    aurora: {
      provider: function () {
        const provider = new HDWalletProvider(config.rinkeby_mnemonic, 'https://testnet.aurora.dev', 0, 3, true);
        provider.engine.addProvider(new NonceTrackerSubprovider());
        return provider;
      },
      network_id: 0x4e454153,
      gas: 10000000,
      from: '0x692a4d7B7BE2dc1623155E90B197a82D114a74f3'
    }
  },
  // mocha: {
  //   reporter: 'eth-gas-reporter',
  //   reporterOptions : { 
  //     showTimeSpent: true
  //    }
  // }
};
