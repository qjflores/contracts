var DSMath = artifacts.require("./DSMath.sol")
var Loan = artifacts.require("./ZeppelinLoan.sol");

var AMORTIZATION_SCHEDULE_MONTHLY = 1;

module.exports = function(deployer, network, accounts) {
  deployer.deploy(Loan, accounts[0], 8,
    6, 3, AMORTIZATION_SCHEDULE_MONTHLY);
};
