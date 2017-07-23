require("babel-register");
require("babel-polyfill");

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8546,
      network_id: "*" // Match any network id
    },
    ropsten: {
      host: "localhost",
      port: 8545,
      from: '0x6cab1aa1c0d73a6cd00e25f9ada85d625d372806',
      network_id: 3,
      gas: 3000000
    }
  }
};
