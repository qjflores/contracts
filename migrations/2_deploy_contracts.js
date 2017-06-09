var TimeLockLib = artifacts.require('./TimeLockLib.sol');
var SafeMath = artifacts.require('./SafeMath.sol');
var AttestationLib = artifacts.require('./AttestationLib.sol');
var RedeemableTokenLib = artifacts.require("./RedeemableTokenLib.sol");
var LoanLib = artifacts.require('./LoanLib.sol');
var Loan = artifacts.require("./Loan.sol");

module.exports = function(deployer, network, accounts) {
  deployer.deploy(TimeLockLib);
  deployer.deploy(SafeMath);
  deployer.deploy(AttestationLib);
  deployer.link(SafeMath, RedeemableTokenLib);
  deployer.deploy(RedeemableTokenLib);
  deployer.link(TimeLockLib, LoanLib);
  deployer.link(SafeMath, LoanLib);
  deployer.link(AttestationLib, LoanLib);
  deployer.link(RedeemableTokenLib, LoanLib);

  deployer.deploy(LoanLib);

  deployer.link(LoanLib, Loan);
  deployer.link(RedeemableTokenLib, Loan);
  deployer.link(AttestationLib, Loan);
  deployer.link(TimeLockLib, Loan);

  deployer.deploy(Loan);
};
