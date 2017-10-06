require("babel-register");
require("babel-polyfill");

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*" // Match any network id
    },
    private: {
      host: "localhost",
      port: 8546,
      network_id: 40734,
      gas: 3000000
    },
    kovan: {
      host: "localhost",
      port: 8545,
      network_id: 42
    },
    ropsten: {
      host: "localhost",
      port: 8545,
      network_id: 3,
    }
  }
};
