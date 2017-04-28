var DSMath = artifacts.require("./DSMath.sol")
var Loan = artifacts.require("./Loan.sol");

var AMORTIZATION_SCHEDULE_MONTHLY = 1;

module.exports = function(deployer, network, accounts) {
  deployer.deploy(DSMath);
  deployer.link(DSMath, Loan);
  deployer.deploy(Loan, accounts[0], 8,
    6, 3, AMORTIZATION_SCHEDULE_MONTHLY);
};
