require("babel-register");
require("babel-polyfill");

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8546,
      network_id: "*" // Match any network id
    },
    rinkeby: {
      host: "localhost",
      port: 8545,
      from: '0xd95e492950c4972115a9225a97984174e14f73c2',
      network_id: 4,
      gas: 3000000
    }
  }
};
