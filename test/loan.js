var Web3 = require('web3');
var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

var DSMath
var Loan = artifacts.require("./Loan.sol");

function assertThrows(promise, message, returnFn=null) {
  return promise.then(function(success) {
    // Call was successful, should have thrown
    assert.fail(true, false, message);
  }, function(error) {
    // hack for verifying throw occurred.
    assert.include(error.toString(), "invalid JUMP");
    return returnFn;
  });
}

PeriodType = {
  Weekly: 0,
  Monthly: 1,
  Yearly: 2,
  FixedDate: 3
}

/*
  ACCOUNT 0: BORROWER
  ACCOUNT 1: ATTESTOR
  ACCOUNT 2: INVESTOR 1
  ACCOUNT 3: INVESTOR 2
  ACCOUNT 4: INVESTOR 3
*/
const TEST_RPC_GAS_PRICE = web3.toBigNumber('100000000000');
const LOAN_TERMS = [web3.toWei(3, 'ether'), PeriodType.Monthly,
                      web3.toWei(.05, 'ether'), true, 2];
contract('Loan', function(_accounts) {
  accounts = _accounts;
  loan = null;
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

  it("should not allow an investor to fund the loan before it's been attested to", function() {
    var invalidFundTransaction =
        loan.fundLoan({from: accounts[2], value: web3.toWei(1, 'ether')});
    return assertThrows(invalidFundTransaction,
          "Should have thrown when investor funded unattested loan");
  });

  it("should allow an RAA to attest to the loan", function() {
    var ipfs_url = "/ipfs/QmdP6Hw8MnbRi2dqrdhVd1YgvgWXoteiSjBwkd5jYHhyPJ";
    var invalidAttestorTransaction =
      loan.attestToBorrower(ipfs_url, {from: accounts[4]});
    return assertThrows(invalidAttestorTransaction,
                        "should only allow the pre-set attestor to attest",
                        loan.attestationUrl.call()).then(function(attestationUrl) {
      assert.equal(attestationUrl, '0x');
      return loan.attestToBorrower(ipfs_url, {from: accounts[1]});
    }).then(function(result) {
      return loan.attestationUrl.call();
    }).then(function(attestationUrl) {
      assert.equal(web3.toAscii(attestationUrl), ipfs_url);
    });
  });

  it("should allow investor 1 to fund loan once it's been attested", function() {
    return loan.fundLoan({from: accounts[2], value: web3.toWei(1, 'ether')}).then(function(result) {
      return loan.amountInvested.call(accounts[2]);
    }).then(function(amount) {
      assert.equal(amount, web3.toWei(1, 'ether'));
    });
  });

  it("should allow investor 2 to fund loan and up their investment in a later tx", function() {
    return loan.fundLoan({from: accounts[3], value: web3.toWei(0.35, 'ether')}).then(function(result) {
      return loan.amountInvested.call(accounts[3]);
    }).then(function(amount) {
      assert.equal(amount, web3.toWei(0.35, 'ether'));
      return loan.fundLoan({from: accounts[3], value: web3.toWei(0.2, 'ether')});
    }).then(function(result) {
      return loan.amountInvested.call(accounts[3]);
    }).then(function(amount) {
      assert.equal(amount, web3.toWei(0.55, 'ether'));
    });
  });

  it("should allow investor 3 to fund the remainder of the loan, refund him the \
      extra amount he sent, and forward the principal to the borrower", function() {

    var lastInvestorBalanceBefore = web3.eth.getBalance(accounts[4]);
    var borrowerBalanceBefore = web3.eth.getBalance(accounts[0]);
    var etherUsedForGas = null;
    return loan.fundLoan({from: accounts[4],
                          value: web3.toWei(3, 'ether')}).then(function(result) {
      etherUsedForGas = TEST_RPC_GAS_PRICE.times(result.receipt.gasUsed);
      return loan.amountInvested.call(accounts[4]);
    }).then(function(amount) {
      assert.equal(amount, web3.toWei(1.45, 'ether'));
      var lastInvestorBalanceAfter = web3.eth.getBalance(accounts[4]);
      var borrowerBalanceAfter = web3.eth.getBalance(accounts[0]);
      var lastInvestorDelta = lastInvestorBalanceBefore.minus(lastInvestorBalanceAfter).minus(etherUsedForGas);
      var borrowerDelta = borrowerBalanceAfter.minus(borrowerBalanceBefore);

      assert.equal(lastInvestorDelta, web3.toWei(1.45, 'ether'), "investor was not refunded proper amount");
      assert.equal(borrowerDelta, LOAN_TERMS[0], "balance was not transferred to borrower");
      assert.equal(web3.eth.getBalance(loan.address), 0);
    });
  });

  it("should allow a loan to be funded by an investor contributing the exact necessary amount", function() {
    var borrowerBalanceBefore = 0;
    var lastInvestorBalanceBefore = web3.eth.getBalance(accounts[7]);
    var etherUsedForGas = 0;
    return Loan.new(...[accounts[6]].concat(LOAN_TERMS), {from: accounts[5]}).then(function(instance) {
      borrowerBalanceBefore = web3.eth.getBalance(accounts[5]);
      second_loan = instance;
      var ipfs_url = "/ipfs/QmdP6Hw8MnbRi2dqrdhVd1YgvgWXoteiSjBwkd5jYHhyPJ";
      return second_loan.attestToBorrower(ipfs_url, {from: accounts[6]});
    }).then(function(tx) {
      return second_loan.principal.call();
    }).then(function(principal) {
      return second_loan.fundLoan({from: accounts[7],
                            value: web3.toWei(3, 'ether')});
    }).then(function(tx) {
      etherUsedForGas += TEST_RPC_GAS_PRICE.times(tx.receipt.gasUsed);
      return second_loan.amountInvested.call(accounts[7]);
    }).then(function(amount) {
      assert.equal(amount, web3.toWei(3, 'ether'));
      var lastInvestorBalanceAfter = web3.eth.getBalance(accounts[7]);
      var borrowerBalanceAfter = web3.eth.getBalance(accounts[5]);
      var lastInvestorDelta = lastInvestorBalanceBefore.minus(lastInvestorBalanceAfter).minus(etherUsedForGas);
      var borrowerDelta = borrowerBalanceAfter.minus(borrowerBalanceBefore);
      assert.equal(lastInvestorDelta, web3.toWei(3, 'ether'), "investor was not refunded proper amount");
      assert.equal(borrowerDelta, web3.toWei(3, 'ether'), "balance was not transferred to borrower");
      assert.equal(web3.eth.getBalance(second_loan.address), 0);
    })
  });

  it("should allow a borrower to repay a loan and prorate the loan correctly", function() {
    var proration = [web3.toBigNumber(1 / 3),
                     web3.toBigNumber(0.55 / 3),
                     web3.toBigNumber(1.45 / 3)];

    var investor_1_balance_before = web3.eth.getBalance(accounts[2]);
    var investor_2_balance_before = web3.eth.getBalance(accounts[3]);
    var investor_3_balance_before = web3.eth.getBalance(accounts[4]);

    var paybackQuantity = web3.toWei(web3.toBigNumber(1.5*1.05), 'ether');
    return loan.payBackLoan({value: paybackQuantity}).then(function(result) {
      var investor_1_payout = web3.eth.getBalance(accounts[2]).minus(investor_1_balance_before);
      var investor_2_payout = web3.eth.getBalance(accounts[3]).minus(investor_2_balance_before);
      var investor_3_payout = web3.eth.getBalance(accounts[4]).minus(investor_3_balance_before);

      assert.equal(investor_1_payout, paybackQuantity.times(proration[0]));
      assert.equal(investor_2_payout, paybackQuantity.times(proration[1]));
      assert.equal(investor_3_payout, paybackQuantity.times(proration[2]));
    });
  });
  // it("should allow a lender to transfer their stake");
})
