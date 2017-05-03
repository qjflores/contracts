var Web3 = require('web3');
var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

var Dharma = require('../lib/dharma.js');
dharma = new Dharma(web3);

function createNoiseTransactions(accounts, numTxs=2) {
  var promise = null;
  for (var i = 0; i < 50; i++) {
    var fromIndex = Math.floor(Math.random() * (accounts.length));
    var toIndex = Math.floor(Math.random() * (accounts.length));

    if (fromIndex == toIndex)
      continue;

    var newPromise = new Promise(function(accept, reject) {
      web3.eth.sendTransaction({from: accounts[fromIndex],
                                to: accounts[toIndex],
                                value: web3.toWei(0.001, 'ether')},
                               function(error, result) {
        if (error) {
          reject(error);
        }
        if (result) {
          accept(result)
        }
      });
    });
    if (promise) {
      promise = promise.then(newPromise);
    } else {
      promise = newPromise;
    }
  }
  return promise;
}

var Loan = artifacts.require("./Loan.sol");
var testLoanData = require('./data/test_loan_terms.json');

function assertLoanCorrectlyDeployed(address, loanJson) {
  var loanContract;
  return Loan.at(address).then(function(_loanContract) {
    loanContract = _loanContract;
    return loanContract.principal.call();
  }).then(function(principal) {
    assert.equal(loanJson.principal, principal);
    return loanContract.periodLength.call();
  }).then(function(periodLength) {
    assert.equal(loanJson.periodLength, periodLength);
    return loanContract.periodType.call();
  }).then(function(periodType) {
    assert.equal(loanJson.periodType, periodType);
    return loanContract.interestRate.call();
  }).then(function(interestRate) {
    assert.equal(loanJson.interestRate, interestRate);
    return loanContract.isInterestCompounded.call();
  }).then(function(isInterestCompounded) {
    assert.equal(loanJson.isInterestCompounded, isInterestCompounded);
    return loanContract.termLength.call();
  }).then(function(termLength) {
    assert.equal(loanJson.termLength, termLength);
    return loanContract.fundingPeriodTimeLock.call();
  }).then(function(fundingPeriodTimeLock) {
    assert.equal(loanJson.fundingPeriodTimeLock, fundingPeriodTimeLock);
    return loanContract.attestationUrl.call();
  }).then(function(attestationUrl) {
    assert.equal(loanJson.attestationUrl, attestationUrl);
  });
}

function deployLoanContract(accounts, loanJson) {
  loanTerms = [
    accounts[0], // attestor
    web3.toWei(loanJson.principal, 'ether'), // principal
    loanJson.periodType, // period type
    web3.toWei(loanJson.interestRate, 'ether'), // interestRate,
    loanJson.isInterestCompounded, // is interest compounded
    loanJson.termLength, // term Length
    loanJson.fundingPeriodTimeLock // time lock
  ]
  return Loan.new(...loanTerms, {from: accounts[2]}).then(function(instance) {
    return instance.attestToBorrower(loanJson.attestationUrl, {from: accounts[0]});
  });
}

contract("Loan Browser", function(_accounts) {
  var accounts = _accounts.slice(15);
  deployLoanContract(accounts, testLoanData[0]).then(function(_) {
    return createNoiseTransactions(accounts);
  }).then(function(_) {
    return deployLoanContract(accounts, testLoanData[1]);
  }).then(function(_) {
    return createNoiseTransactions(accounts);
  }).then(function(_) {
    return deployLoanContract(accounts, testLoanData[2]);
  }).then(function(_) {
    return createNoiseTransactions(accounts);
  }).then(function(_) {
    return deployLoanContract(accounts, testLoanData[3]);
  }).then(function(_) {
    return createNoiseTransactions(accounts);
  }).then(function(_) {
    return deployLoanContract(accounts, testLoanData[4]);
  }).then(function(_) {
    return createNoiseTransactions(accounts);
  });

  it ("should crawl chain and find the relevant contracts", function() {
    dharma.getLoans('../build/contracts/Loan.json').then(function(loans) {
      console.log(loans[0]);
      return assertLoanCorrectlyDeployed(loans[0], testLoanData[0]);
    }).then(function(_) {
      console.log(loans[1]);
      return assertLoanCorrectlyDeployed(loans[1], testLoanData[1]);
    }).then(function(_) {
      console.log(loans[2]);
      return assertLoanCorrectlyDeployed(loans[2], testLoanData[2]);
    }).then(function(_) {
      console.log(loans[3]);
      return assertLoanCorrectlyDeployed(loans[3], testLoanData[3]);
    }).then(function(_) {
      console.log(loans[4]);
      return assertLoanCorrectlyDeployed(loans[4], testLoanData[4]);
    })
  })
});
