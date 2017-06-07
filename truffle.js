const exec = require('child_process').exec;

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*" // Match any network id
    }
  },
  build: function(options, callback) {
     // Do something when a build is required. `options` contains these values:
     //
     // working_directory: root location of the project
     // contracts_directory: root directory of .sol files
     // destination_directory: directory where truffle expects the built assets (important for `truffle serve`)

     const solc_compile = "docker run -v " + options.working_directory + ":/DharmaLoanStandard \
       ethereum/solc:stable -o /DharmaLoanStandard/dist --overwrite --optimize --bin --abi \
       /DharmaLoanStandard/contracts/Loan.sol"

     exec(solc_compile, function(error, stdout, stderr) {
       if (error) {
         console.log(error)
       }
       callback(error);
     })
  }
};
