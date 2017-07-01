const exec = require('child_process').exec;

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
      from: '0xac7f7b63d1d6e311695693235eb3262f60fea079',
      network_id: 3
    }
  }
};
