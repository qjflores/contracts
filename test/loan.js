var Web3 = require('web3');
var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

var Loan = artifacts.require("./Loan.sol");

contract('Loan', function(accounts) {
  it("should deploy with the correct terms and RAA PK", function() {
    return Loan.deployed().then(function(instance) {
      loan = instance;
      return loan.principal.call();
    }).then(function(principal) {
      assert.equal(principal, web3.toWei(1, 'ether'));
      return loan.interestRateMonthly.call();
    }).then(function(interestRateMonthly) {
      assert.equal(interestRateMonthly, 6);
      return loan.termLengthMonths.call();
    }).then(function(termLengthMonths) {
      assert.equal(termLengthMonths, 3);
      return loan.amortizationSchedule.call();
    }).then(function(amortizationSchedule) {
      assert.equal(web3.toAscii(amortizationSchedule).replace(/\0/g, ''), "monthly");
    })
  });
  // it("should allow an RAA to attest to the loan");
  // it("should allow an investor to fund the loan");
  // it("should not transfer the balance to the borrower if the loan is not fully funded")
  // it("should transfer balance to the borrower when the loan is funded");
  // it("should allow a borrower to repay a loan and prorate the loan correctly");
  // it("should allow a lender to transfer their stake");
})
