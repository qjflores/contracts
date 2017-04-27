var Web3 = require('web3');
var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

var DSMath = artifacts.require("./DSMath.sol")
var Loan = artifacts.require("./Loan.sol");

module.exports = function(deployer, network, accounts) {
  deployer.deploy(DSMath);
  deployer.link(DSMath, Loan);
  deployer.deploy(Loan, accounts[0], web3.toWei(1, 'ether'),
    6, 3, 'monthly');
};
