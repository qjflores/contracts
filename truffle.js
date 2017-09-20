require("babel-register");
require("babel-polyfill");

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*" // Match any network id
    },
    dharma: {
      host: "localhost",
      port: 8546,
      from: '0x8886e57e0484b7b5e119f8cd2dbb50e5be38d9b9',
      network_id: 40734,
      gas: 3000000
    },
    kovan: {
      host: "localhost",
      port: 8545,
      from: '0x0d42fe90615b452b58e04cb096c335abdd4211c8',
      network_id: 42
    },
    ropsten: {
      host: "localhost",
      port: 8545,
      from: '0x9392208ae53263ff2769abf4c030490c5aa4c845',
      network_id: 3,
      gas: 3000000
    }
  }
};
