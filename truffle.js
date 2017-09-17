require("babel-register");
require("babel-polyfill");

// module.exports = {
//   networks: {
//     development: {
//       host: "localhost",
//       port: 8546,
//       network_id: "*" // Match any network id
//     },
//     dharma: {
//       host: "localhost",
//       port: 8547,
//       //from: '0xdbe43ce89c6317c7e64357aef6fc57318c3af0e2',
//       network_id: 40734,
//       gas: 3100000,
//         before_timeout: 200000,          //  <=== NEW
//         test_timeout: 300000
//     }
//   }
// };

module.exports = {
    networks: {
        development: {
            host: "localhost",
            port: 8546,
            network_id: "*" // Match any network id
        },
        dharma: {
            host: "localhost",
            port: 8546,
            //from: '0xdbe43ce89c6317c7e64357aef6fc57318c3af0e2',
            network_id: "*",
            gas: 3000000,

        }
    }
};
