const HDWalletProvider = require("@truffle/hdwallet-provider");

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*"
    },
    test: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*"
    },
    rinkeby: {
      provider: function () {
        return new HDWalletProvider('', "https://rinkeby.infura.io/v3/API_KEY");
      },
      network_id: '4',
      gas: 10000000
    }
  }
};
