var Web3 = require('web3');
var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

var Loan = artifacts.require("./Loan.sol");

PeriodType = {
  Weekly: 0,
  Monthly: 1,
  Yearly: 2,
  FixedDate: 3
}

const LOAN_TERMS = [web3.toWei(3, 'ether'), PeriodType.Monthly,
                      web3.toWei(.05, 'ether'), true, 2];
contract('Loan', function(_accounts) {
  accounts = _accounts;
  it("should deploy with the correct terms and RAA PK", function() {
    return Loan.new(...[accounts[1]].concat(LOAN_TERMS)).then(function(instance) {
      loan = instance;
      return loan.principal.call();
    }).then(function(principal) {
      assert.equal(principal.toNumber(), LOAN_TERMS[0]);
      return loan.periodType.call();
    }).then(function(periodType) {
      assert.equal(periodType, LOAN_TERMS[1]);
      return loan.interestRate.call();
    }).then(function(interestRate) {
      assert.equal(interestRate, LOAN_TERMS[2]);
      return loan.isInterestCompounded.call();
    }).then(function(isInterestCompounded) {
      assert.equal(isInterestCompounded, LOAN_TERMS[3]);
      return loan.termLength.call();
    }).then(function(termLength) {
      assert.equal(termLength, LOAN_TERMS[4])
      return loan.borrower.call();
    }).then(function(borrower) {
      assert.equal(borrower, accounts[0]);
      return loan.attestor.call();
    }).then(function(attestor) {
      assert.equal(attestor, accounts[1]);
    });
  });
  // it("should allow an RAA to attest to the loan");
  // it("should allow an investor to fund the loan");
  // it("should not transfer the balance to the borrower if the loan is not fully funded")
  // it("should transfer balance to the borrower when the loan is funded");
  // it("should allow a borrower to repay a loan and prorate the loan correctly");
  // it("should allow a lender to transfer their stake");
})
