var VersionRegister = artifacts.require('./VersionRegister.sol')
var TimeLockLib = artifacts.require('./TimeLockLib.sol');
var SafeMath = artifacts.require('./SafeMath.sol');
var AttestationLib = artifacts.require('./AttestationLib.sol');
var RedeemableTokenLib = artifacts.require("./RedeemableTokenLib.sol");
var LoanLib = artifacts.require('./LoanLib.sol');
var Loan = artifacts.require("./Loan.sol");
var Metadata = require("../ethpm.json");

module.exports = function(deployer, network, accounts) {
  deployer.deploy(SafeMath);
  deployer.link(SafeMath, RedeemableTokenLib);
  deployer.deploy(RedeemableTokenLib);
  deployer.link(SafeMath, LoanLib);
  deployer.link(RedeemableTokenLib, LoanLib);

  deployer.deploy(LoanLib);

  deployer.link(LoanLib, Loan);
  deployer.link(RedeemableTokenLib, Loan);

  let versionRegister;
  const versionHash = web3.sha3(Metadata.version);

  deployer.deploy(Loan).then(function() {
    return deployer.deploy(VersionRegister);
  }).then(function() {
    return VersionRegister.deployed();
  }).then(function(_versionRegister) {
    versionRegister = _versionRegister;
    return versionRegister.updateCurrentVersion(versionHash)
  }).then(function(result) {
    return versionRegister.updateVersionMapping(versionHash, Loan.address)
  });
};
